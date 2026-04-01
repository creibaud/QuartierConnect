import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { and, eq, ilike, sql } from "drizzle-orm";
import { ObjectId } from "mongodb";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import { PaginationHelper } from "src/common/helpers/pagination.helper";
import { PermissionHelper } from "src/common/helpers/permission.helper";
import { type DrizzleDB } from "src/database/drizzle/drizzle.type";
import { quartiers, userQuartiers, users } from "src/database/drizzle/schema";
import {
    QUARTIERS_GEO_COLLECTION,
    type QuartierGeoDocument,
} from "src/database/mongodb/models/quartier-geo.model";
import { type MongoDatabase } from "src/database/mongodb/mongodb.type";
import { OUTBOX_EVENT_TYPES } from "src/modules/outbox/outbox-event-types";
import { OutboxService } from "src/modules/outbox/outbox.service";
import { AddMemberDto } from "src/modules/quartiers/dto/add-member.dto";
import { CreateQuartierDto } from "src/modules/quartiers/dto/create-quartier.dto";
import { QuartierQueryDto } from "src/modules/quartiers/dto/quartier-query.dto";
import { UpdateQuartierDto } from "src/modules/quartiers/dto/update-quartier.dto";
import type { IQuartiersRepository } from "src/modules/quartiers/quartier.repository";

@Injectable()
export class QuartiersService {
    private readonly logger = new Logger(QuartiersService.name);

    constructor(
        @Inject("IQuartiersRepository")
        private readonly quartierRepository: IQuartiersRepository,
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        private readonly outbox: OutboxService,
    ) {}

    async create(adminUserId: string, dto: CreateQuartierDto) {
        await this.assertNoGeoIntersection(dto.geojson);

        const [quartier] = await this.db
            .insert(quartiers)
            .values({
                name: dto.name,
                description: dto.description,
                adminUserId,
                mongoGeoId: null,
            })
            .returning();

        const geoDoc: QuartierGeoDocument = {
            quartierId: quartier.id,
            name: dto.name,
            description: dto.description,
            geojson: dto.geojson as QuartierGeoDocument["geojson"],
            adminUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const { insertedId } = await this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .insertOne(geoDoc);

        const [updated] = await this.db
            .update(quartiers)
            .set({ mongoGeoId: insertedId.toHexString() })
            .where(eq(quartiers.id, quartier.id))
            .returning();

        await this.outbox.publish({
            aggregateType: "quartier",
            aggregateId: quartier.id,
            eventType: OUTBOX_EVENT_TYPES.quartierCreated,
            payload: {
                id: quartier.id,
                name: dto.name,
                createdAt: updated.createdAt,
            },
        });

        this.logger.log(`Quartier created: ${quartier.id}`);

        return { ...updated, geojson: dto.geojson };
    }

    async findAll(query: QuartierQueryDto) {
        const { page, limit, offset } =
            PaginationHelper.resolvePagination(query);

        const where = query.search
            ? ilike(quartiers.name, `%${query.search}%`)
            : undefined;

        const [allQuartiers, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(quartiers)
                .where(where)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(quartiers)
                .where(where),
        ]);

        const withGeo = await Promise.all(
            allQuartiers.map(async (q) => {
                const geo = await this.fetchGeoDocument(q.mongoGeoId);
                return { ...q, geojson: geo?.geojson ?? null };
            }),
        );

        return PaginationHelper.buildPaginatedResponse(
            withGeo,
            Number(count),
            page,
            limit,
        );
    }

    async findOne(id: string) {
        const [quartier] = await this.db
            .select()
            .from(quartiers)
            .where(eq(quartiers.id, id))
            .limit(1);

        if (!quartier) {
            throw new NotFoundException("Quartier not found");
        }

        const geo = await this.fetchGeoDocument(quartier.mongoGeoId);

        return { ...quartier, geojson: geo?.geojson ?? null };
    }

    async update(id: string, dto: UpdateQuartierDto) {
        const quartier = await this.findOne(id);

        const hasMetaChanges =
            dto.name !== undefined || dto.description !== undefined;

        if (hasMetaChanges) {
            await this.db
                .update(quartiers)
                .set({
                    ...(dto.name && { name: dto.name }),
                    ...(dto.description !== undefined && {
                        description: dto.description,
                    }),
                    updatedAt: new Date(),
                })
                .where(eq(quartiers.id, id));
        }

        if (dto.geojson !== undefined) {
            await this.assertNoGeoIntersection(dto.geojson, id);

            if (quartier.mongoGeoId) {
                await this.mongo
                    .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
                    .updateOne(
                        { _id: new ObjectId(quartier.mongoGeoId) },
                        {
                            $set: {
                                geojson:
                                    dto.geojson as QuartierGeoDocument["geojson"],
                                updatedAt: new Date(),
                            },
                        },
                    );
            }
        }

        if (dto.name) {
            await this.outbox.publish({
                aggregateType: "quartier",
                aggregateId: id,
                eventType: OUTBOX_EVENT_TYPES.quartierNameUpdated,
                payload: {
                    id,
                    name: dto.name,
                    updatedAt: new Date(),
                },
            });
        }

        this.logger.log(`Quartier updated: ${id}`);

        return this.findOne(id);
    }

    async delete(id: string) {
        const [memberCount] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(userQuartiers)
            .where(eq(userQuartiers.quartierId, id));

        if (Number(memberCount.count) > 0) {
            throw new BadRequestException(
                "Cannot delete a quartier that still has members",
            );
        }

        const [quartier] = await this.db
            .select()
            .from(quartiers)
            .where(eq(quartiers.id, id))
            .limit(1);

        if (!quartier) {
            throw new NotFoundException("Quartier not found");
        }

        await this.db.delete(quartiers).where(eq(quartiers.id, id));

        if (quartier.mongoGeoId) {
            await this.mongo
                .collection(QUARTIERS_GEO_COLLECTION)
                .deleteOne({ _id: new ObjectId(quartier.mongoGeoId) });
        }

        await this.outbox.publish({
            aggregateType: "quartier",
            aggregateId: id,
            eventType: OUTBOX_EVENT_TYPES.quartierDeleted,
            payload: {
                id,
                deletedAt: new Date(),
            },
        });

        this.logger.log(`Quartier deleted: ${id}`);
    }

    async addMember(quartierId: string, dto: AddMemberDto) {
        await this.findOne(quartierId);

        const [member] = await this.db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                role: users.role,
                isActive: users.isActive,
            })
            .from(users)
            .where(eq(users.id, dto.userId))
            .limit(1);

        if (!member) {
            throw new NotFoundException("User not found");
        }

        try {
            await this.db.insert(userQuartiers).values({
                userId: dto.userId,
                quartierId,
            });
        } catch {
            throw new ConflictException(
                "User is already assigned to a quartier",
            );
        }

        await this.outbox.publish({
            aggregateType: "quartier",
            aggregateId: quartierId,
            eventType: OUTBOX_EVENT_TYPES.quartierMemberAdded,
            payload: {
                quartierId,
                userId: member.id,
                email: member.email,
                firstName: member.firstName,
                lastName: member.lastName,
                role: member.role,
                isActive: member.isActive,
                updatedAt: new Date(),
            },
        });

        this.logger.log(`User ${dto.userId} added to quartier ${quartierId}`);
    }

    async removeMember(quartierId: string, userId: string) {
        await this.db
            .delete(userQuartiers)
            .where(
                and(
                    eq(userQuartiers.quartierId, quartierId),
                    eq(userQuartiers.userId, userId),
                ),
            );

        await this.outbox.publish({
            aggregateType: "quartier",
            aggregateId: quartierId,
            eventType: OUTBOX_EVENT_TYPES.quartierMemberRemoved,
            payload: {
                quartierId,
                userId,
                removedAt: new Date(),
            },
        });

        this.logger.log(`User ${userId} removed from quartier ${quartierId}`);
    }

    async getMembers(quartierId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);

        const [members, [{ count }]] = await Promise.all([
            this.db
                .select({
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    role: users.role,
                    isActive: users.isActive,
                    addedAt: userQuartiers.addedAt,
                })
                .from(userQuartiers)
                .innerJoin(users, eq(userQuartiers.userId, users.id))
                .where(eq(userQuartiers.quartierId, quartierId))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(userQuartiers)
                .where(eq(userQuartiers.quartierId, quartierId)),
        ]);

        return buildPaginatedResult(members, Number(count), page, limit);
    }

    async getMyQuartier(userId: string) {
        const [assignment] = await this.db
            .select()
            .from(userQuartiers)
            .where(eq(userQuartiers.userId, userId))
            .limit(1);

        if (!assignment) {
            throw new NotFoundException("You are not assigned to any quartier");
        }

        return this.findOne(assignment.quartierId);
    }

    private async assertNoGeoIntersection(geojson: object, excludeId?: string) {
        const existing = await this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .findOne({
                geojson: {
                    $geoIntersects: {
                        $geometry: geojson,
                    },
                },
            });

        if (!existing) return;

        if (excludeId && existing.quartierId === excludeId) return;

        throw new ConflictException(
            "This GeoJSON polygon overlaps with an existing quartier",
        );
    }

    private async fetchGeoDocument(mongoGeoId: string | null | undefined) {
        if (!mongoGeoId) return null;

        return this.mongo
            .collection<QuartierGeoDocument>(QUARTIERS_GEO_COLLECTION)
            .findOne({ _id: new ObjectId(mongoGeoId) });
    }
}
