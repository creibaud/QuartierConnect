import type { UUID } from "node:crypto";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import type { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { buildPaginatedResult } from "src/common/query/query.helper";
import type { ServiceCategory } from "src/database/drizzle/schema";
import type { ServiceDocument } from "src/database/mongodb/models/service.model";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";
import type { IServicesRepository } from "src/modules/services/service.repository";
import type { CreateServiceDto } from "src/modules/services/dto/create-service.dto";
import type { RateServiceDto } from "src/modules/services/dto/rate-service.dto";
import type { ServiceQueryDto } from "src/modules/services/dto/service-query.dto";
import type { UpdateServiceDto } from "src/modules/services/dto/update-service.dto";

const MINIMUM_BALANCE = -10;

@Injectable()
export class ServicesService {
    private readonly logger = new Logger(ServicesService.name);

    constructor(
        @Inject("IServicesRepository")
        private readonly servicesRepository: IServicesRepository,
        private readonly outbox: OutboxService,
    ) {}

    async create(creatorId: string, dto: CreateServiceDto) {
        const pointsValue = await this.calculatePoints(
            dto.estimatedDurationMinutes,
            dto.category,
        );
        const now = new Date();

        const document: ServiceDocument = {
            quartierId: dto.quartierId,
            creatorId,
            title: dto.title,
            description: dto.description,
            category: dto.category,
            type: dto.type,
            estimatedDurationMinutes: dto.estimatedDurationMinutes,
            pointsValue,
            status: "open",
            createdAt: now,
            updatedAt: now,
        };

        const insertedId = await this.servicesRepository.insertService(document);
        const serviceId = insertedId.toHexString();

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: serviceId,
            eventType: OUTBOX_EVENT_TYPES.serviceCreated,
            payload: {
                id: serviceId,
                creatorId,
                quartierId: dto.quartierId,
                title: dto.title,
                category: dto.category,
                type: dto.type,
                createdAt: now,
            },
        });

        this.logger.log(`Service created: ${serviceId} by user ${creatorId}`);

        return { ...document, id: serviceId };
    }

    async findAll(query: ServiceQueryDto) {
        const { page = 1, limit = 10 } = query;
        const filter = this.buildServiceFilter(query);
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            this.servicesRepository.findServices(filter, skip, limit),
            this.servicesRepository.countServices(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findMine(userId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;
        const filter = {
            $or: [{ creatorId: userId }, { acceptorId: userId }],
        };
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            this.servicesRepository.findServices(filter, skip, limit),
            this.servicesRepository.countServices(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findOne(id: string) {
        const document = await this.servicesRepository.findServiceById(id);

        if (!document) {
            throw new NotFoundException("Service not found");
        }

        return this.mapToResponse(document);
    }

    async update(id: string, userId: string, dto: UpdateServiceDto) {
        const service = await this.findOne(id);

        if (service.creatorId !== userId) {
            throw new ForbiddenException(
                "Only the creator can update this service",
            );
        }

        if (service.status !== "open") {
            throw new BadRequestException("Only open services can be updated");
        }

        const now = new Date();
        await this.servicesRepository.updateService(id, {
            ...dto,
            updatedAt: now,
        });

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.serviceUpdated,
            payload: {
                id,
                updatedBy: userId,
                title: dto.title,
                category: dto.category,
                updatedAt: now,
            },
        });

        this.logger.log(`Service updated: ${id}`);

        return { ...service, ...dto, updatedAt: now };
    }

    async delete(id: string, userId: string) {
        const service = await this.findOne(id);

        if (service.creatorId !== userId) {
            throw new ForbiddenException(
                "Only the creator can delete this service",
            );
        }

        if (service.status !== "open") {
            throw new BadRequestException("Only open services can be deleted");
        }

        await this.servicesRepository.deleteService(id);

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.serviceDeleted,
            payload: {
                id,
                deletedBy: userId,
                deletedAt: new Date(),
            },
        });

        this.logger.log(`Service deleted: ${id}`);
    }

    async accept(serviceId: string, acceptorId: string) {
        const service = await this.findOne(serviceId);

        if (service.status !== "open") {
            throw new BadRequestException("Service is not open for acceptance");
        }

        if (service.creatorId === acceptorId) {
            throw new BadRequestException("Cannot accept your own service");
        }

        const now = new Date();
        await this.servicesRepository.updateService(serviceId, {
            status: "accepted",
            acceptorId,
            updatedAt: now,
        });

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: serviceId,
            eventType: OUTBOX_EVENT_TYPES.serviceAccepted,
            payload: {
                serviceId,
                acceptorId,
                acceptedAt: now,
            },
        });

        this.logger.log(
            `Service accepted: ${serviceId} by user ${acceptorId}`,
        );

        return {
            ...service,
            status: "accepted" as const,
            acceptorId,
            updatedAt: now,
        };
    }

    async complete(serviceId: string, requesterId: string) {
        const service = await this.findOne(serviceId);

        if (service.status !== "accepted") {
            throw new BadRequestException(
                "Only accepted services can be completed",
            );
        }

        if (
            service.creatorId !== requesterId &&
            service.acceptorId !== requesterId
        ) {
            throw new ForbiddenException(
                "Only the creator or acceptor can complete this service",
            );
        }

        const now = new Date();

        if (service.type === "paid") {
            await this.processPayment(service, now);
        }

        await this.servicesRepository.updateService(serviceId, {
            status: "completed",
            completedAt: now,
            updatedAt: now,
        });

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: serviceId,
            eventType: OUTBOX_EVENT_TYPES.serviceCompleted,
            payload: {
                serviceId,
                requesterId,
                creatorId: service.creatorId,
                acceptorId: service.acceptorId,
                points: service.pointsValue,
                completedAt: now,
            },
        });

        this.logger.log(`Service completed: ${serviceId}`);

        return {
            ...service,
            status: "completed" as const,
            completedAt: now,
            updatedAt: now,
        };
    }

    async cancel(serviceId: string, requesterId: string) {
        const service = await this.findOne(serviceId);

        if (service.status !== "open" && service.status !== "accepted") {
            throw new BadRequestException(
                "Only open or accepted services can be cancelled",
            );
        }

        if (
            service.creatorId !== requesterId &&
            service.acceptorId !== requesterId
        ) {
            throw new ForbiddenException(
                "Only the creator or acceptor can cancel this service",
            );
        }

        const now = new Date();
        await this.servicesRepository.updateService(serviceId, {
            status: "cancelled",
            updatedAt: now,
        });

        await this.outbox.publish({
            aggregateType: "service",
            aggregateId: serviceId,
            eventType: OUTBOX_EVENT_TYPES.serviceCancelled,
            payload: {
                serviceId,
                requesterId,
                cancelledAt: now,
            },
        });

        this.logger.log(`Service cancelled: ${serviceId}`);

        return { ...service, status: "cancelled" as const, updatedAt: now };
    }

    async rate(serviceId: string, raterUserId: string, dto: RateServiceDto) {
        const service = await this.findOne(serviceId);

        if (service.status !== "completed") {
            throw new BadRequestException(
                "Only completed services can be rated",
            );
        }

        if (
            service.creatorId !== raterUserId &&
            service.acceptorId !== raterUserId
        ) {
            throw new ForbiddenException(
                "Only the creator or acceptor can rate this service",
            );
        }

        const existingRating = await this.servicesRepository.findRating(
            serviceId,
            raterUserId,
        );

        if (existingRating) {
            throw new ConflictException("You have already rated this service");
        }

        const now = new Date();
        const rating = {
            serviceId,
            raterUserId,
            rating: dto.rating,
            comment: dto.comment,
            createdAt: now,
        };

        await this.servicesRepository.insertRating(rating);

        await this.outbox.publish({
            aggregateType: "service_rating",
            aggregateId: `${serviceId}:${raterUserId}`,
            eventType: "service.rated",
            payload: {
                serviceId,
                raterUserId,
                rating: dto.rating,
                ratedAt: now,
            },
        });

        this.logger.log(`Service rated: ${serviceId} by user ${raterUserId}`);

        return rating;
    }

    async getContract(serviceId: string, userId: string) {
        const service = await this.findOne(serviceId);

        if (service.creatorId !== userId && service.acceptorId !== userId) {
            throw new ForbiddenException(
                "Only the creator or acceptor can access the contract",
            );
        }

        return {
            serviceId,
            type: service.type,
            contractDocumentId: service.contractDocumentId ?? null,
            title: service.title,
            creatorId: service.creatorId,
            acceptorId: service.acceptorId ?? null,
            pointsValue: service.pointsValue,
            status: service.status,
        };
    }

    private async processPayment(
        service: ReturnType<typeof this.mapToResponse>,
        at: Date,
    ): Promise<void> {
        const balance = await this.servicesRepository.getUserBalance(
            service.creatorId,
        );

        if (balance === null) {
            throw new NotFoundException("Service creator not found");
        }

        if (balance - service.pointsValue < MINIMUM_BALANCE) {
            throw new BadRequestException(
                "Insufficient balance to complete this paid service",
            );
        }

        await this.servicesRepository.insertTransaction({
            fromUserId: service.creatorId,
            toUserId: service.acceptorId!,
            serviceId: service.id,
            type: "service_exchange",
            pointsAmount: service.pointsValue,
            description: `Payment for service: ${service.title}`,
            createdAt: at,
        });

        await Promise.all([
            this.servicesRepository.deductUserBalance(
                service.creatorId,
                service.pointsValue,
                at,
            ),
            this.servicesRepository.addUserBalance(
                service.acceptorId!,
                service.pointsValue,
                at,
            ),
        ]);
    }

    private buildServiceFilter(
        query: ServiceQueryDto,
    ): Record<string, unknown> {
        const filter: Record<string, unknown> = {};

        if (query.category) filter.category = query.category;
        if (query.type) filter.type = query.type;
        if (query.status) filter.status = query.status;
        if (query.quartierId) filter.quartierId = query.quartierId;
        if (query.search) {
            filter.$or = [
                { title: { $regex: query.search, $options: "i" } },
                { description: { $regex: query.search, $options: "i" } },
            ];
        }

        return filter;
    }

    private async calculatePoints(
        durationMinutes: number,
        category: ServiceCategory,
    ): Promise<number> {
        const config =
            await this.servicesRepository.getPointConfigForCategory(category);

        if (durationMinutes < 30) {
            return Math.max(1, Math.round(config.multiplier));
        }

        const hours = Math.ceil(durationMinutes / 60);
        return Math.max(
            1,
            Math.round(hours * config.basePointsPerHour * config.multiplier),
        );
    }

    private readonly mapToResponse = (
        document: ServiceDocument & { _id?: { toHexString(): string } },
    ) => {
        const { _id, ...rest } = document;
        return { ...rest, id: _id?.toHexString() ?? "" };
    };
}
