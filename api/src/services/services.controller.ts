import {
    BadRequestException,
    Body,
    ConflictException,
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
import { inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { Model, Types } from "mongoose";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
    BookingStatus,
    ServiceBooking,
    ServiceBookingDocument,
} from "../bookings/schemas/service-booking.schema";
import {
    escapeRegex,
    parsePagination,
    resolveSort,
    setPageHeaders,
} from "../common/pagination";
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
        @InjectModel(ServiceBooking.name)
        private readonly bookingModel: Model<ServiceBookingDocument>,
        private readonly socialService: SocialService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly geocoding: GeocodingService,
    ) {}

    // Residents and moderators are scoped to their own neighborhood; admins moderate all.
    private assertNeighborhoodScope(
        service: { neighborhoodId?: string | null },
        req: AuthRequest,
    ): void {
        if (req.user.role === "admin") return;
        const serviceNeighborhood = service.neighborhoodId?.toString() ?? null;
        if (serviceNeighborhood !== (req.user.neighborhoodId ?? null)) {
            throw new ForbiddenException("Service outside your neighborhood");
        }
    }

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
    @ApiQuery({
        name: "search",
        required: false,
        example: "tonte",
        description: "Case-insensitive substring on title or description",
    })
    @ApiQuery({
        name: "sort",
        required: false,
        enum: ["createdAt", "title"],
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
    @ApiResponse({ status: 200, type: [ServiceDto] })
    async findAll(
        // @Res goes first: a required param can't follow optional @Query params (TS1016).
        @Res({ passthrough: true }) res: Response,
        @Query("category") category?: string,
        @Query("type") type?: string,
        @Query("direction") direction?: string,
        @Query("search") search?: string,
        @Query("sort") sort?: string,
        @Query("order") order?: string,
        @Query("page") page = "1",
        @Query("limit") limit = "20",
        @Request() req: AuthRequest = { user: { sub: "", role: "" } },
    ) {
        // Scoped callers without a neighborhood get nothing: an undefined filter
        // would leak every neighborhood's services.
        const isAdmin = req.user.role === "admin";
        if (!isAdmin && !req.user.neighborhoodId) return [];
        const filter: Record<string, unknown> = {};
        if (!isAdmin) filter.neighborhoodId = req.user.neighborhoodId;
        // Only accept strings so a crafted query (?category[$ne]=) can't inject Mongo operators.
        if (typeof category === "string") filter.category = category;
        if (typeof type === "string") filter.type = type;
        if (typeof direction === "string") filter.direction = direction;
        if (typeof search === "string" && search.trim()) {
            const rx = new RegExp(escapeRegex(search.trim()), "i");
            filter.$or = [{ title: rx }, { description: rx }];
        }

        const { limitNum, skip } = parsePagination(page, limit);
        const { field, direction: sortDirection } = resolveSort(
            sort,
            order,
            ["createdAt", "title"] as const,
            "createdAt",
        );
        const sortSpec: Record<string, 1 | -1> = {
            [field]: sortDirection === "asc" ? 1 : -1,
        };
        const [services, total] = await Promise.all([
            this.serviceModel
                .find(filter)
                .sort(sortSpec)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            this.serviceModel.countDocuments(filter),
        ]);
        setPageHeaders(res, total, limitNum);
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
        // Scope to the caller's neighborhood.
        const isAdmin = req.user.role === "admin";
        if (!isAdmin && !req.user.neighborhoodId) return [];
        const responses = await this.responseModel
            .find({ responderId: req.user.sub })
            .lean();
        const ids = responses.map((r) => r.serviceId);
        if (!ids.length) return [];
        const filter: Record<string, unknown> = { _id: { $in: ids } };
        if (!isAdmin) filter.neighborhoodId = req.user.neighborhoodId;
        return this.serviceModel.find(filter).lean();
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Service details" })
    @ApiParam({
        name: "id",
        description: "MongoDB ID of the service",
        example: "664f1a2b3c4d5e6f7a8b9c0d",
    })
    @ApiResponse({ status: 200, type: ServiceDto })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    @ApiResponse({
        status: 403,
        description: "Service outside the caller's neighborhood",
    })
    @ApiResponse({ status: 404, description: "Service not found" })
    async findOne(@Param("id") id: string, @Request() req: AuthRequest) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        this.assertNeighborhoodScope(service, req);
        return service;
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a service listing",
        description:
            "Creates a service listing. The `createdBy` field is automatically populated from the JWT. For non-admin callers the provided `neighborhoodId` is ignored and replaced by the caller's own neighborhood.",
    })
    @ApiResponse({
        status: 201,
        type: ServiceDto,
        description: "Service created",
    })
    @ApiResponse({ status: 401, description: "Not authenticated" })
    async create(@Body() dto: CreateServiceDto, @Request() req: AuthRequest) {
        const location = await this.resolveLocation(dto.address, dto.location);
        // Only admins may target another neighborhood; others publish into their own.
        const neighborhoodId =
            req.user.role === "admin"
                ? (dto.neighborhoodId ?? req.user.neighborhoodId ?? undefined)
                : (req.user.neighborhoodId ?? undefined);
        const created = await this.serviceModel.create({
            ...dto,
            location,
            neighborhoodId,
            createdBy: req.user.sub,
        });
        void this.socialService.syncService(
            created._id.toString(),
            created.title,
            created.neighborhoodId?.toString(),
            created.createdBy,
        );
        return created;
    }

    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Update a service",
        description:
            "The owner or an admin can update it. `neighborhoodId` changes are admin-only and silently ignored otherwise.",
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
        // Only admins may move a service to another neighborhood; ignored otherwise.
        if (dto.neighborhoodId !== undefined && req.user.role === "admin")
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
            // Failed geocoding clears the pin rather than keeping the stale position.
            changes.location =
                (await this.resolveLocation(dto.address, dto.location)) ?? null;
        }
        if (dto.duration !== undefined) changes.duration = dto.duration;
        if (dto.status !== undefined) changes.status = dto.status;
        if (dto.pointsAmount !== undefined)
            changes.pointsAmount = dto.pointsAmount;

        // A paid service needs a duration, otherwise it prices to the 1-point floor.
        const effectiveType = dto.type ?? service.type;
        const effectiveDuration = dto.duration ?? service.duration;
        if (effectiveType === "paid" && !effectiveDuration) {
            throw new BadRequestException({
                code: "PAID_SERVICE_REQUIRES_DURATION",
                message: "A paid service requires a duration",
            });
        }

        const updated = await this.serviceModel
            .findByIdAndUpdate(
                serviceId,
                { $set: changes },
                { new: true, runValidators: true },
            )
            .exec();
        if (updated) {
            void this.socialService.syncService(
                updated._id.toString(),
                updated.title,
                updated.neighborhoodId?.toString(),
                updated.createdBy,
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
        this.assertNeighborhoodScope(service, req);
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
        description:
            "The owner or an admin can delete it. Deletion is refused (409) while a pending or accepted booking references the service — bookings must be declined, cancelled, or completed first.",
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
    @ApiResponse({
        status: 409,
        description:
            "The service still has active (pending or accepted) bookings",
    })
    async remove(@Param("id") id: string, @Request() req: AuthRequest) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== req.user.sub && req.user.role !== "admin") {
            throw new ForbiddenException(
                "You can only delete your own services",
            );
        }
        // Active bookings must be settled first to avoid orphaning contracts and payments.
        const activeBookings = await this.bookingModel.countDocuments({
            serviceId: service._id.toString(),
            status: { $in: [BookingStatus.PENDING, BookingStatus.ACCEPTED] },
        });
        if (activeBookings > 0) {
            throw new ConflictException({
                code: "SERVICE_HAS_ACTIVE_BOOKINGS",
                message: "Cannot delete a service with active bookings",
            });
        }
        await this.serviceModel.findByIdAndDelete(id).exec();
        void this.socialService.deleteNode("Service", service._id.toString());
        return { success: true };
    }
}
