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
import {
    buildPaginatedResult,
    resolvePagination,
} from "src/common/query/query.helper";
import { type DrizzleDB } from "src/database/drizzle/drizzle.type";
import { quartiers, userQuartiers, users } from "src/database/drizzle/schema";
import {
    QUARTIERS_GEO_COLLECTION,
    type QuartierGeoDocument,
} from "src/database/mongodb/models/quartier-geo.model";
import { type MongoDatabase } from "src/database/mongodb/mongodb.type";
import { type Neo4jDriver } from "src/database/neo4j/neo4j.type";
import { AddMemberDto } from "src/modules/quartiers/dto/add-member.dto";
import { CreateQuartierDto } from "src/modules/quartiers/dto/create-quartier.dto";
import { QuartierQueryDto } from "src/modules/quartiers/dto/quartier-query.dto";
import { UpdateQuartierDto } from "src/modules/quartiers/dto/update-quartier.dto";

@Injectable()
export class QuartiersService {
    private readonly logger = new Logger(QuartiersService.name);

    constructor(
        @Inject("DRIZZLE") private readonly db: DrizzleDB,
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        @Inject("NEO4J") private readonly neo4j: Neo4jDriver,
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

        const session = this.neo4j.session();
        try {
            await session.run("CREATE (:Quartier {id: $id, name: $name})", {
                id: quartier.id,
                name: dto.name,
            });
        } finally {
            await session.close();
        }

        this.logger.log(`Quartier created: ${quartier.id}`);

        return { ...updated, geojson: dto.geojson };
    }

    async findAll(query: QuartierQueryDto) {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);

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

        return buildPaginatedResult(withGeo, Number(count), page, limit);
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
            const session = this.neo4j.session();
            try {
                await session.run(
                    "MATCH (q:Quartier {id: $id}) SET q.name = $name",
                    { id, name: dto.name },
                );
            } finally {
                await session.close();
            }
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

        const session = this.neo4j.session();
        try {
            await session.run("MATCH (q:Quartier {id: $id}) DETACH DELETE q", {
                id,
            });
        } finally {
            await session.close();
        }

        this.logger.log(`Quartier deleted: ${id}`);
    }

    async addMember(quartierId: string, dto: AddMemberDto) {
        await this.findOne(quartierId);

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

        const session = this.neo4j.session();
        try {
            await session.run(
                "MERGE (u:User {id: $userId})-[:LIVES_IN]->(q:Quartier {id: $quartierId})",
                { userId: dto.userId, quartierId },
            );
        } finally {
            await session.close();
        }

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

        const session = this.neo4j.session();
        try {
            await session.run(
                "MATCH (u:User {id: $userId})-[r:LIVES_IN]->(q:Quartier {id: $quartierId}) DELETE r",
                { userId, quartierId },
            );
        } finally {
            await session.close();
        }

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
