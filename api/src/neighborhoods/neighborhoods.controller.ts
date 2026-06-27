import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
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
import { Model } from "mongoose";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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
    ) {}

    @Get()
    @ApiOperation({ summary: "List neighborhoods" })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [NeighborhoodDto] })
    findAll(@Query("page") page = "1", @Query("limit") limit = "20") {
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return this.neighborhoodModel.find().skip(skip).limit(limitNum).exec();
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
        return created;
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
        return { success: true };
    }
}
