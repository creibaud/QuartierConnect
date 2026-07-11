import {
    Body,
    Controller,
    Delete,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UseGuards,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { Model } from "mongoose";
import { Driver } from "neo4j-driver";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import {
    escapeRegex,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { syncLivesIn } from "../social/lives-in.util";
import { NEO4J_DRIVER } from "../social/neo4j/neo4j.provider";
import { SocialService } from "../social/social.service";
import { CreateNeighborhoodDto } from "./dto/create-neighborhood.dto";
import { NeighborhoodDto } from "./dto/neighborhood-response.dto";
import { UpdateNeighborhoodDto } from "./dto/update-neighborhood.dto";
import { NeighborhoodsService } from "./neighborhoods.service";
import {
    Neighborhood,
    NeighborhoodDocument,
} from "./schemas/neighborhood.schema";

@ApiTags("Neighborhoods")
@Controller("neighborhoods")
export class NeighborhoodsController {
    constructor(
        @InjectModel(Neighborhood.name)
        private readonly neighborhoodModel: Model<NeighborhoodDocument>,
        private readonly neighborhoodsService: NeighborhoodsService,
        private readonly socialService: SocialService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        @Inject(NEO4J_DRIVER)
        private readonly neo4jDriver: Driver,
    ) {}

    @Get()
    @ApiOperation({ summary: "List neighborhoods" })
    @ApiQuery({
        name: "search",
        required: false,
        example: "lyon",
        description: "Case-insensitive substring on name or city",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "name"],
        description: "Sort field (default: createdAt)",
    })
    @ApiQuery({
        name: "order",
        required: false,
        enum: ["asc", "desc"],
        description: "Sort direction (default: desc)",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [NeighborhoodDto] })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("search") search?: string,
        @Query("sort") sort?: string,
        @Query("order") order?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
    ) {
        const filter: Record<string, unknown> = {};
        if (typeof search === "string" && search.trim()) {
            const rx = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [{ name: rx }, { city: rx }];
        }
        const { limitNum, skip } = parsePagination(page, limit);
        const { field, direction } = resolveSort(
            sort,
            order,
            ["createdAt", "name"] as const,
            "createdAt",
        );
        const sortSpec: Record<string, 1 | -1> = {
            [field]: direction === "asc" ? 1 : -1,
        };
        const [rows, total] = await Promise.all([
            this.neighborhoodModel
                .find(filter)
                .sort(sortSpec)
                .skip(skip)
                .limit(limitNum)
                .exec(),
            this.neighborhoodModel.countDocuments(filter),
        ]);
        setPageHeaders(res, total, limitNum);
        return rows;
    }

    // WARNING: static routes must stay declared before @Get(":id") —
    // NestJS matches routes in declaration order.
    @Get("uncovered-addresses")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Pending residents not covered by any neighborhood",
    })
    async uncoveredAddresses() {
        const rows = await this.db
            .select({
                id: schema.users.id,
                firstName: schema.users.firstName,
                lat: schema.users.addressLat,
                lng: schema.users.addressLng,
                address: schema.users.address,
            })
            .from(schema.users)
            .where(
                and(
                    isNull(schema.users.neighborhoodId),
                    isNotNull(schema.users.addressLat),
                ),
            );
        return rows.map((r) => ({
            userId: r.id,
            firstName: r.firstName,
            lat: r.lat,
            lng: r.lng,
            address: r.address,
        }));
    }

    @Get(":id")
    @ApiOperation({ summary: "Neighborhood details" })
    @ApiParam({ name: "id", description: "MongoDB ID of the neighborhood" })
    @ApiResponse({ status: 200, type: NeighborhoodDto })
    @ApiResponse({ status: 404, description: "Neighborhood not found" })
    async findOne(@Param("id") id: string) {
        const neighborhood = await this.neighborhoodModel.findById(id).exec();
        if (!neighborhood)
            throw new NotFoundException("Neighborhood not found");
        return neighborhood;
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a neighborhood (admin)",
        description:
            "Creates a neighborhood with a GeoJSON polygon. Checks for overlaps using $geoIntersects.",
    })
    @ApiResponse({
        status: 201,
        type: NeighborhoodDto,
        description: "Neighborhood created",
    })
    @ApiResponse({
        status: 409,
        description:
            "Geographic overlap with an existing neighborhood ($geoIntersects)",
    })
    @ApiResponse({
        status: 403,
        description: "Insufficient role (admin required)",
    })
    async create(@Body() dto: CreateNeighborhoodDto) {
        if (dto.geometry) {
            await this.neighborhoodsService.assertNoOverlap(dto.geometry);
        }
        const created = await this.neighborhoodModel.create(dto);
        void this.socialService.syncNeighborhood(
            created._id.toString(),
            created.name,
        );
        await this.reassignPending();
        return created;
    }

    private async reassignPending(): Promise<void> {
        const pending = await this.db
            .select({
                id: schema.users.id,
                lat: schema.users.addressLat,
                lng: schema.users.addressLng,
            })
            .from(schema.users)
            .where(
                and(
                    isNull(schema.users.neighborhoodId),
                    isNotNull(schema.users.addressLat),
                ),
            );

        for (const u of pending) {
            try {
                if (u.lat == null || u.lng == null) continue;
                const match =
                    await this.neighborhoodsService.findContainingPoint(
                        u.lng,
                        u.lat,
                    );
                if (!match) continue;
                const neighborhoodId = match._id.toString();
                await this.db
                    .update(schema.users)
                    .set({ neighborhoodId, updatedAt: new Date() })
                    .where(eq(schema.users.id, u.id));
                await syncLivesIn(this.neo4jDriver, u.id, neighborhoodId);
            } catch {
                // best-effort: skip this resident, continue reassigning the rest
            }
        }
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update a neighborhood (admin)" })
    @ApiParam({ name: "id", description: "MongoDB ID of the neighborhood" })
    @ApiResponse({
        status: 200,
        type: NeighborhoodDto,
        description: "Neighborhood updated",
    })
    @ApiResponse({
        status: 409,
        description: "Geographic overlap with an existing neighborhood",
    })
    @ApiResponse({ status: 404, description: "Neighborhood not found" })
    async update(@Param("id") id: string, @Body() dto: UpdateNeighborhoodDto) {
        const neighborhoodId = String(id);
        if (dto.geometry) {
            await this.neighborhoodsService.assertNoOverlap(
                dto.geometry,
                neighborhoodId,
            );
        }
        const changes: Record<string, unknown> = {};
        if (dto.name !== undefined) changes.name = dto.name;
        if (dto.city !== undefined) changes.city = dto.city;
        if (dto.description !== undefined)
            changes.description = dto.description;
        if (dto.geometry !== undefined)
            changes.geometry = {
                type: dto.geometry.type,
                coordinates: dto.geometry.coordinates,
            };
        const updated = await this.neighborhoodModel
            .findByIdAndUpdate(neighborhoodId, { $set: changes }, { new: true })
            .exec();
        if (!updated) throw new NotFoundException("Neighborhood not found");
        void this.socialService.syncNeighborhood(
            updated._id.toString(),
            updated.name,
        );
        // A grown polygon may now cover pending residents; shrinking never unassigns.
        if (dto.geometry !== undefined) await this.reassignPending();
        return updated;
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles("admin")
    @ApiBearerAuth()
    @ApiOperation({ summary: "Delete a neighborhood (admin)" })
    @ApiParam({ name: "id", description: "MongoDB ID of the neighborhood" })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Neighborhood permanently deleted",
    })
    @ApiResponse({ status: 404, description: "Neighborhood not found" })
    async remove(@Param("id") id: string) {
        const deleted = await this.neighborhoodModel
            .findByIdAndDelete(id)
            .exec();
        if (!deleted) throw new NotFoundException("Neighborhood not found");
        void this.socialService.deleteNode(
            "Neighborhood",
            deleted._id.toString(),
        );
        // Null the assignment so the onboarding gate re-runs the address flow.
        await this.db
            .update(schema.users)
            .set({ neighborhoodId: null, updatedAt: new Date() })
            .where(eq(schema.users.neighborhoodId, deleted._id.toString()));
        return { success: true };
    }
}
