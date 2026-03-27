import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { ObjectId } from "mongodb";
import type { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { buildPaginatedResult } from "src/common/query/query.helper";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import { users } from "src/database/drizzle/schema";
import {
    SERVICE_RATINGS_COLLECTION,
    SERVICES_COLLECTION,
} from "src/database/mongodb/models/service.model";
import type {
    ServiceDocument,
    ServiceRatingDocument,
} from "src/database/mongodb/models/service.model";
import { TRANSACTIONS_COLLECTION } from "src/database/mongodb/models/transaction.model";
import type { TransactionDocument } from "src/database/mongodb/models/transaction.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";
import type { CreateServiceDto } from "src/modules/services/dto/create-service.dto";
import type { RateServiceDto } from "src/modules/services/dto/rate-service.dto";
import type { ServiceQueryDto } from "src/modules/services/dto/service-query.dto";
import type { UpdateServiceDto } from "src/modules/services/dto/update-service.dto";

const MINIMUM_BALANCE = -10;

@Injectable()
export class ServicesService {
    private readonly logger = new Logger(ServicesService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        private readonly outbox: OutboxService,
    ) {}

    async create(creatorId: string, dto: CreateServiceDto) {
        const pointsValue = this.calculatePoints(dto.estimatedDurationMinutes);
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

        const result = await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .insertOne(document);

        const serviceId = result.insertedId.toHexString();

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

        const collection =
            this.mongo.collection<ServiceDocument>(SERVICES_COLLECTION);
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
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

        const collection =
            this.mongo.collection<ServiceDocument>(SERVICES_COLLECTION);
        const skip = (page - 1) * limit;

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return buildPaginatedResult(
            documents.map(this.mapToResponse),
            total,
            page,
            limit,
        );
    }

    async findOne(id: string) {
        const document = await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

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
        await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(id) },
                { $set: { ...dto, updatedAt: now } },
            );

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

        await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .deleteOne({ _id: new ObjectId(id) });

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
        await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(serviceId) },
                { $set: { status: "accepted", acceptorId, updatedAt: now } },
            );

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

        this.logger.log(`Service accepted: ${serviceId} by user ${acceptorId}`);

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
            const [creator] = await this.db
                .select({ balance: users.balance })
                .from(users)
                .where(
                    eq(
                        users.id,
                        service.creatorId as `${string}-${string}-${string}-${string}-${string}`,
                    ),
                )
                .limit(1);

            if (!creator) {
                throw new NotFoundException("Service creator not found");
            }

            const currentBalance = Number(creator.balance);
            if (currentBalance - service.pointsValue < MINIMUM_BALANCE) {
                throw new BadRequestException(
                    "Insufficient balance to complete this paid service",
                );
            }

            const transactionBase: Omit<TransactionDocument, "_id"> = {
                fromUserId: service.creatorId,
                toUserId: service.acceptorId!,
                serviceId,
                type: "service_exchange",
                pointsAmount: service.pointsValue,
                description: `Payment for service: ${service.title}`,
                createdAt: now,
            };

            await this.mongo
                .collection<TransactionDocument>(TRANSACTIONS_COLLECTION)
                .insertOne({ ...transactionBase });

            await Promise.all([
                this.db
                    .update(users)
                    .set({
                        balance: sql`${users.balance} - ${service.pointsValue}`,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            users.id,
                            service.creatorId as `${string}-${string}-${string}-${string}-${string}`,
                        ),
                    ),
                this.db
                    .update(users)
                    .set({
                        balance: sql`${users.balance} + ${service.pointsValue}`,
                        updatedAt: now,
                    })
                    .where(
                        eq(
                            users.id,
                            service.acceptorId! as `${string}-${string}-${string}-${string}-${string}`,
                        ),
                    ),
            ]);
        }

        await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(serviceId) },
                {
                    $set: {
                        status: "completed",
                        completedAt: now,
                        updatedAt: now,
                    },
                },
            );

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
        await this.mongo
            .collection<ServiceDocument>(SERVICES_COLLECTION)
            .updateOne(
                { _id: new ObjectId(serviceId) },
                { $set: { status: "cancelled", updatedAt: now } },
            );

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

        const existingRating = await this.mongo
            .collection<ServiceRatingDocument>(SERVICE_RATINGS_COLLECTION)
            .findOne({ serviceId, raterUserId });

        if (existingRating) {
            throw new ConflictException("You have already rated this service");
        }

        const now = new Date();
        const rating: Omit<ServiceRatingDocument, "_id"> = {
            serviceId,
            raterUserId,
            rating: dto.rating,
            comment: dto.comment,
            createdAt: now,
        };

        await this.mongo
            .collection<ServiceRatingDocument>(SERVICE_RATINGS_COLLECTION)
            .insertOne({ ...rating });

        this.logger.log(`Service rated: ${serviceId} by user ${raterUserId}`);

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

    private calculatePoints(durationMinutes: number): number {
        if (durationMinutes >= 60) {
            return 2;
        }
        return 1;
    }

    private readonly mapToResponse = (
        document: ServiceDocument & { _id?: ObjectId },
    ) => {
        const { _id, ...rest } = document;
        return { ...rest, id: _id?.toHexString() ?? "" };
    };
}
