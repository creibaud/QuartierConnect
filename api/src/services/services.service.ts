import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { inArray } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Response } from "express";
import { Model, Types } from "mongoose";
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
import {
    Vote,
    VoteDocument,
    VoteTargetType,
} from "../votes/schemas/vote.schema";
import { CreateServiceDto } from "./dto/create-service.dto";
import { UpdateServiceDto } from "./dto/update-service.dto";
import {
    ServiceResponse,
    ServiceResponseDocument,
} from "./schemas/service-response.schema";
import { Service, ServiceDocument } from "./schemas/service.schema";

interface AuthUser {
    sub: string;
    role: string;
    neighborhoodId?: string | null;
}

@Injectable()
export class ServicesService {
    constructor(
        @InjectModel(Service.name)
        private readonly serviceModel: Model<ServiceDocument>,
        @InjectModel(ServiceResponse.name)
        private readonly responseModel: Model<ServiceResponseDocument>,
        @InjectModel(ServiceBooking.name)
        private readonly bookingModel: Model<ServiceBookingDocument>,
        @InjectModel(Vote.name)
        private readonly voteModel: Model<VoteDocument>,
        private readonly socialService: SocialService,
        @Inject(DRIZZLE_TOKEN)
        private readonly db: PostgresJsDatabase<typeof schema>,
        private readonly geocoding: GeocodingService,
    ) {}

    private readonly logger = new Logger(ServicesService.name);

    // Votes and responses reference a service by id, so drop them when it goes.
    // Best-effort: the service is already deleted, so a cleanup failure is logged.
    private async cascadeDeleteServiceDependents(
        serviceId: string,
    ): Promise<void> {
        try {
            await Promise.all([
                this.responseModel.deleteMany({
                    serviceId: new Types.ObjectId(serviceId),
                }),
                this.voteModel.deleteMany({
                    targetId: serviceId,
                    targetType: VoteTargetType.SERVICE,
                }),
            ]);
        } catch (err) {
            this.logger.warn(
                `Failed to clean up dependents of service ${serviceId}: ${err}`,
            );
        }
    }

    // Residents and moderators are scoped to their own neighborhood; admins moderate all.
    private assertNeighborhoodScope(
        service: { neighborhoodId?: string | null },
        user: AuthUser,
    ): void {
        if (user.role === "admin") return;
        const serviceNeighborhood = service.neighborhoodId?.toString() ?? null;
        if (serviceNeighborhood !== (user.neighborhoodId ?? null)) {
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

    async findAll(
        res: Response,
        category: string | undefined,
        type: string | undefined,
        direction: string | undefined,
        search: string | undefined,
        sort: string | undefined,
        order: string | undefined,
        page: string,
        limit: string,
        user: AuthUser,
    ) {
        // Scoped callers without a neighborhood get nothing: an undefined filter
        // would leak every neighborhood's services.
        const isAdmin = user.role === "admin";
        if (!isAdmin && !user.neighborhoodId) return [];
        const filter: Record<string, unknown> = {};
        if (!isAdmin) filter.neighborhoodId = user.neighborhoodId;
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
                    (r) => r.responderId === user.sub,
                ),
            };
        });
    }

    async findMine(user: AuthUser) {
        const services = await this.serviceModel
            .find({ createdBy: user.sub })
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

    async findResponded(user: AuthUser) {
        // Scope to the caller's neighborhood.
        const isAdmin = user.role === "admin";
        if (!isAdmin && !user.neighborhoodId) return [];
        const responses = await this.responseModel
            .find({ responderId: user.sub })
            .lean();
        const ids = responses.map((r) => r.serviceId);
        if (!ids.length) return [];
        const filter: Record<string, unknown> = { _id: { $in: ids } };
        if (!isAdmin) filter.neighborhoodId = user.neighborhoodId;
        return this.serviceModel.find(filter).lean();
    }

    async findOne(id: string, user: AuthUser) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        this.assertNeighborhoodScope(service, user);
        return service;
    }

    async create(dto: CreateServiceDto, user: AuthUser) {
        const location = await this.resolveLocation(dto.address, dto.location);
        // Only admins may target another neighborhood; others publish into their own.
        const neighborhoodId =
            user.role === "admin"
                ? (dto.neighborhoodId ?? user.neighborhoodId ?? undefined)
                : (user.neighborhoodId ?? undefined);
        const created = await this.serviceModel.create({
            ...dto,
            location,
            neighborhoodId,
            createdBy: user.sub,
        });
        void this.socialService.syncService(
            created._id.toString(),
            created.title,
            created.neighborhoodId?.toString(),
            created.createdBy,
        );
        return created;
    }

    async update(id: string, dto: UpdateServiceDto, user: AuthUser) {
        const serviceId = String(id);
        const service = await this.serviceModel.findById(serviceId).exec();
        if (!service) throw new NotFoundException("Service not found");

        if (service.createdBy !== user.sub && user.role !== "admin") {
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
        if (dto.neighborhoodId !== undefined && user.role === "admin")
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

    async respond(id: string, user: AuthUser) {
        const service = await this.serviceModel.findById(id);
        if (!service)
            throw new NotFoundException({ code: "SERVICE_NOT_FOUND" });
        this.assertNeighborhoodScope(service, user);
        if (service.createdBy === user.sub)
            throw new ForbiddenException({ code: "OWN_SERVICE" });
        const serviceId = new Types.ObjectId(id);
        await this.responseModel.updateOne(
            { serviceId, responderId: user.sub },
            { $setOnInsert: { serviceId, responderId: user.sub } },
            { upsert: true },
        );
        return { status: "ok" as const };
    }

    async unrespond(id: string, user: AuthUser) {
        await this.responseModel.deleteOne({
            serviceId: new Types.ObjectId(id),
            responderId: user.sub,
        });
        return { status: "ok" as const };
    }

    async remove(id: string, user: AuthUser) {
        const service = await this.serviceModel.findById(id).exec();
        if (!service) throw new NotFoundException("Service not found");
        if (service.createdBy !== user.sub && user.role !== "admin") {
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
        await this.cascadeDeleteServiceDependents(service._id.toString());
        void this.socialService.deleteNode("Service", service._id.toString());
        return { success: true };
    }
}
