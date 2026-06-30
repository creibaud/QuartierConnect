import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Inject,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Request,
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
import { inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Model, Types } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import * as schema from "../database/schema";
import { GeocodingService } from "../geocoding/geocoding.service";
import { SocialService } from "../social/social.service";
import { CreateServiceDto } from "./dto/create-service.dto";
import { ServiceDto } from "./dto/service-response.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import {
    ServiceResponse,
    ServiceResponseDocument,
} from "./schemas/service-response.schema";
import { Service, ServiceDocument } from "./schemas/service.schema";

interface AuthRequest {
    user: { sub: string; role: string; neighborhoodId?: string | null };
}

@ApiTags("Services")
@Controller("services")
export class ServicesController {
    constructor(
        @InjectModel(Service.name)
        private readonly serviceModel: Model<ServiceDocument>,
        @InjectModel(ServiceResponse.name)
        private readonly responseModel: Model<ServiceResponseDocument>,
        private readonly socialService: SocialService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly geocoding: GeocodingService,
    ) {}

    private async resolveLocation(
        address?: string,
        location?: { type: "Point"; coordinates: [number, number] },
    ): Promise<{ type: "Point"; coordinates: [number, number] } | undefined> {
        if (location) return location;
        if (!address) return undefined;
        const geo = await this.geocoding.geocode(address);
        return geo
            ? { type: "Point", coordinates: [geo.lng, geo.lat] }
            : undefined;
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "List services",
        description:
            "Returns service listings scoped to the caller's neighborhood, filterable by category, type, and direction.",
    })
    @ApiQuery({
        name: "category",
        required: false,
        example: "gardening",
        description: "Service category",
    })
    @ApiQuery({
        name: "type",
        required: false,
        enum: ["free", "paid", "exchange"],
        description: "Service type",
    })
    @ApiQuery({
        name: "direction",
        required: false,
        enum: ["offer", "request"],
        description: "Service direction",
    })
    @ApiQuery({ name: "page", required: false, example: "1" })
    @ApiQuery({ name: "limit", required: false, example: "20" })
    @ApiResponse({ status: 200, type: [ServiceDto] })
    async findAll(
        @Query("category") category?: string,
        @Query("type") type?: string,
        @Query("direction") direction?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        // Default required by TS1016 (a required param can't follow the optional
        // @Query params); harmless because the neighborhood guard below rejects it.
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        // Admin/moderator moderate across all neighborhoods (the admin app lists
        // through this same endpoint); residents are scoped to their own. A non-staff
        // caller without a neighborhood gets nothing — otherwise Mongoose would strip
        // `neighborhoodId: undefined` and leak every neighborhood's services.
        const isStaff =
            req.user.role === "admin" || req.user.role === "moderator";
        if (!isStaff && !req.user.neighborhoodId) return [];
        const filter: Record<string, unknown> = {};
        if (!isStaff) filter.neighborhoodId = req.user.neighborhoodId;
        if (category) filter.category = category;
        if (type) filter.type = type;
        if (direction) filter.direction = direction;

        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        const services = await this.serviceModel
            .find(filter)
            .skip(skip)
            .limit(limitNum)
            .lean();
        const ids = services.map((s) => s._id);
        const responses = await this.responseModel
            .find({ serviceId: { $in: ids } })
            .lean();
        return services.map((s) => {
            const forService = responses.filter(
                (r) => String(r.serviceId) === String(s._id),
            );
            return {
                ...s,
                responderCount: forService.length,
                hasResponded: forService.some(
                    (r) => r.responderId === req.user.sub,
                ),
            };
        });
    }

    @Get("mine")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "My service listings with responders" })
    @ApiResponse({
        status: 200,
        description: "Own services enriched with responders",
    })
    async findMine(@Request() req: AuthRequest) {
        const services = await this.serviceModel
            .find({ createdBy: req.user.sub })
            .lean();
        const ids = services.map((s) => s._id);
        type LeanResponse = {
            serviceId: unknown;
            responderId: string;
            createdAt: Date;
        };
        const responses = (await this.responseModel
            .find({ serviceId: { $in: ids } })
            .lean()) as LeanResponse[];
        const responderIds = [...new Set(responses.map((r) => r.responderId))];
        const users = responderIds.length
            ? await this.db
                  .select({
                      id: schema.users.id,
                      firstName: schema.users.firstName,
                      avatarUrl: schema.users.avatarUrl,
                  })
                  .from(schema.users)
                  .where(inArray(schema.users.id, responderIds))
            : [];
        const byId = new Map(users.map((u) => [u.id, u]));
        return services.map((s) => ({
            ...s,
            responders: responses
                .filter((r) => String(r.serviceId) === String(s._id))
                .map((r) => ({
                    userId: r.responderId,
                    firstName: byId.get(r.responderId)?.firstName ?? null,
                    avatarUrl: byId.get(r.responderId)?.avatarUrl ?? null,
                    createdAt: r.createdAt,
                })),
        }));
    }

    @Get("responded")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Services the current user has responded to" })
    @ApiResponse({ status: 200, type: [ServiceDto] })
    async findResponded(@Request() req: AuthRequest) {
        const responses = await this.responseModel
            .find({ responderId: req.user.sub })
            .lean();
        const ids = responses.map((r) => r.serviceId);
        if (!ids.length) return [];
        return this.serviceModel.find({ _id: { $in: ids } }).lean();
    }

    @Get(":id")
    @ApiOperation({ summary: "Service details" })
    @ApiParam({
        name: "id",
        description: "MongoDB ID of the service",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
    })
    @ApiResponse({ status: 200, type: ServiceDto })
    @ApiResponse({ status: 404, description: "Service not found" })
    async findOne(@Param("id") id: string) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        return service;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a service listing",
        description:
            "Creates a service listing. The `createdBy` field is automatically populated from the JWT.",
    })
    @ApiResponse({
        status: 201,
        type: ServiceDto,
        description: "Service created",
    })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async create(@Body() dto: CreateServiceDto, @Request() req: AuthRequest) {
        const location = await this.resolveLocation(dto.address, dto.location);
        const created = await this.serviceModel.create({
            ...dto,
            location,
            neighborhoodId:
                dto.neighborhoodId ?? req.user.neighborhoodId ?? undefined,
            createdBy: req.user.sub,
        });
        void this.socialService.syncService(
            created._id.toString(),
            created.title,
            created.neighborhoodId?.toString(),
        );
        return created;
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Update a service",
        description: "The owner or an admin can update it.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({
        status: 200,
        type: ServiceDto,
        description: "Service updated",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    async update(
        @Param("id") id: string,
        @Body() dto: UpdateServiceDto,
        @Request() req: AuthRequest,
    ) {
        const serviceId = String(id);
        const service = await this.serviceModel.findById(serviceId).exec();
        if (!service) throw new NotFoundException("Service not found");

        if (service.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException(
                "You can only update your own services",
            );
        }

        const changes: Record<string, unknown> = {};
        if (dto.title !== undefined) changes.title = dto.title;
        if (dto.description !== undefined)
            changes.description = dto.description;
        if (dto.category !== undefined) changes.category = dto.category;
        if (dto.type !== undefined) changes.type = dto.type;
        if (dto.direction !== undefined) changes.direction = dto.direction;
        if (dto.neighborhoodId !== undefined)
            changes.neighborhoodId = dto.neighborhoodId;
        if (dto.pointsMultiplier !== undefined)
            changes.pointsMultiplier = dto.pointsMultiplier;
        if (dto.location !== undefined)
            changes.location = {
                type: dto.location.type,
                coordinates: dto.location.coordinates,
            };
        if (dto.address !== undefined) {
            changes.address = dto.address;
            const location = await this.resolveLocation(
                dto.address,
                dto.location,
            );
            if (location) changes.location = location;
        }

        const updated = await this.serviceModel
            .findByIdAndUpdate(serviceId, { $set: changes }, { new: true })
            .exec();
        if (updated) {
            void this.socialService.syncService(
                updated._id.toString(),
                updated.title,
                updated.neighborhoodId?.toString(),
            );
        }
        return updated;
    }

    @Post(":id/respond")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Respond to a service listing (idempotent)" })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({ status: 201, schema: { example: { status: "ok" } } })
    @ApiResponse({ status: 403, description: "Cannot respond to own service" })
    @ApiResponse({ status: 404, description: "Service not found" })
    async respond(@Param("id") id: string, @Request() req: AuthRequest) {
        const service = await this.serviceModel.findById(id);
        if (!service)
            throw new NotFoundException({ code: "SERVICE_NOT_FOUND" });
        if (service.createdBy === req.user.sub)
            throw new ForbiddenException({ code: "OWN_SERVICE" });
        const serviceId = new Types.ObjectId(id);
        await this.responseModel.updateOne(
            { serviceId, responderId: req.user.sub },
            { $setOnInsert: { serviceId, responderId: req.user.sub } },
            { upsert: true },
        );
        return { status: "ok" as const };
    }

    @Delete(":id/respond")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Withdraw response from a service listing" })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({ status: 200, schema: { example: { status: "ok" } } })
    async unrespond(@Param("id") id: string, @Request() req: AuthRequest) {
        await this.responseModel.deleteOne({
            serviceId: new Types.ObjectId(id),
            responderId: req.user.sub,
        });
        return { status: "ok" as const };
    }

    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Delete a service",
        description: "The owner or an admin can delete it.",
    })
    @ApiParam({ name: "id", description: "MongoDB ID of the service" })
    @ApiResponse({
        status: 200,
        schema: { example: { success: true } },
        description: "Service deleted",
    })
    @ApiResponse({
        status: 403,
        description: "Access denied (owner or admin only)",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    async remove(@Param("id") id: string, @Request() req: AuthRequest) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException(
                "You can only delete your own services",
            );
        }
        await this.serviceModel.findByIdAndDelete(id).exec();
        void this.socialService.deleteNode("Service", service._id.toString());
        return { success: true };
    }
}
