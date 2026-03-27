import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { and, eq, ilike, sql, SQL } from "drizzle-orm";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import {
    buildPaginatedResult,
    resolvePagination,
} from "src/common/query/query.helper";
import { type DrizzleDB } from "src/database/drizzle/drizzle.type";
import { incidentComments, incidents } from "src/database/drizzle/schema";
import { AddCommentDto } from "src/modules/incidents/dto/add-comment.dto";
import { CreateIncidentDto } from "src/modules/incidents/dto/create-incident.dto";
import { IncidentQueryDto } from "src/modules/incidents/dto/incident-query.dto";
import { UpdateIncidentDto } from "src/modules/incidents/dto/update-incident.dto";

@Injectable()
export class IncidentsService {
    private readonly logger = new Logger(IncidentsService.name);

    constructor(@Inject("DRIZZLE") private readonly db: DrizzleDB) {}

    async create(creatorId: string, dto: CreateIncidentDto) {
        const [incident] = await this.db
            .insert(incidents)
            .values({
                creatorId,
                title: dto.title,
                description: dto.description,
                priority: dto.priority ?? "medium",
                locationGeojson: dto.locationGeojson ?? null,
                attachmentUrls: dto.attachmentUrls ?? [],
            })
            .returning();

        this.logger.log(`Incident created: ${incident.id} by ${creatorId}`);

        return incident;
    }

    async findAll(query: IncidentQueryDto) {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);

        const filters: (SQL | undefined)[] = [];

        if (query.search) {
            filters.push(ilike(incidents.title, `%${query.search}%`));
        }

        if (query.status) {
            filters.push(eq(incidents.status, query.status as never));
        }

        if (query.priority) {
            filters.push(eq(incidents.priority, query.priority as never));
        }

        const where = filters.length > 0 ? and(...filters) : undefined;

        const [allIncidents, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(incidents)
                .where(where)
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(incidents)
                .where(where),
        ]);

        return buildPaginatedResult(allIncidents, Number(count), page, limit);
    }

    async findOne(id: string) {
        const [incident] = await this.db
            .select()
            .from(incidents)
            .where(eq(incidents.id, id))
            .limit(1);

        if (!incident) {
            throw new NotFoundException("Incident not found");
        }

        return incident;
    }

    async update(
        id: string,
        userId: string,
        userRole: string,
        dto: UpdateIncidentDto,
    ) {
        const incident = await this.findOne(id);

        const isAdmin = userRole === "admin";
        const isCreator = incident.creatorId === userId;
        const isResolved =
            incident.status === "resolved" || incident.status === "closed";

        if (!isAdmin && (!isCreator || isResolved)) {
            throw new ForbiddenException(
                "You do not have permission to update this incident",
            );
        }

        const updatePayload: Record<string, unknown> = {
            ...dto,
            updatedAt: new Date(),
        };

        if (dto.status === "resolved") {
            updatePayload.resolvedAt = new Date();
            updatePayload.resolvedBy = userId;
        }

        const [updated] = await this.db
            .update(incidents)
            .set(updatePayload as never)
            .where(eq(incidents.id, id))
            .returning();

        this.logger.log(`Incident updated: ${id} by ${userId}`);

        return updated;
    }

    async delete(id: string, userRole: string) {
        if (userRole !== "admin") {
            throw new ForbiddenException("Only admins can delete incidents");
        }

        await this.findOne(id);

        await this.db.delete(incidents).where(eq(incidents.id, id));

        this.logger.log(`Incident deleted: ${id}`);
    }

    async addComment(incidentId: string, authorId: string, dto: AddCommentDto) {
        await this.findOne(incidentId);

        const [comment] = await this.db
            .insert(incidentComments)
            .values({
                incidentId,
                authorId,
                content: dto.content,
            })
            .returning();

        this.logger.log(
            `Comment added to incident ${incidentId} by ${authorId}`,
        );

        return comment;
    }

    async getComments(incidentId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;
        const { offset } = resolvePagination(page, limit);

        const [comments, [{ count }]] = await Promise.all([
            this.db
                .select()
                .from(incidentComments)
                .where(eq(incidentComments.incidentId, incidentId))
                .limit(limit)
                .offset(offset),
            this.db
                .select({ count: sql<number>`count(*)` })
                .from(incidentComments)
                .where(eq(incidentComments.incidentId, incidentId)),
        ]);

        return buildPaginatedResult(comments, Number(count), page, limit);
    }
}
