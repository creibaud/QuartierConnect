import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import type { IIncidentsRepository } from "src/modules/incidents/incident.repository";
import { AddCommentDto } from "src/modules/incidents/dto/add-comment.dto";
import { CreateIncidentDto } from "src/modules/incidents/dto/create-incident.dto";
import { IncidentQueryDto } from "src/modules/incidents/dto/incident-query.dto";
import { UpdateIncidentDto } from "src/modules/incidents/dto/update-incident.dto";

@Injectable()
export class IncidentsService {
    private readonly logger = new Logger(IncidentsService.name);

    constructor(
        @Inject("IIncidentsRepository")
        private readonly incidentsRepository: IIncidentsRepository,
    ) {}

    async create(creatorId: string, dto: CreateIncidentDto) {
        const incident = await this.incidentsRepository.create({
            creatorId,
            title: dto.title,
            description: dto.description,
            type: dto.type ?? "other",
            priority: dto.priority ?? "medium",
            locationGeojson: dto.locationGeojson ?? null,
            attachmentUrls: dto.attachmentUrls ?? [],
        });

        this.logger.log(`Incident created: ${incident.id} by ${creatorId}`);

        return incident;
    }

    async findAll(query: IncidentQueryDto) {
        return this.incidentsRepository.findAll(
            {
                search: query.search,
                status: query.status,
                priority: query.priority,
                type: query.type,
            },
            query.page ?? 1,
            query.limit ?? 10,
        );
    }

    async findOne(id: string) {
        const incident = await this.incidentsRepository.findOne(id);

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

        const updateData: Record<string, unknown> = { ...dto };

        if (dto.status === "resolved") {
            updateData.resolvedAt = new Date();
            updateData.resolvedBy = userId;
        }

        const updated = await this.incidentsRepository.update(
            id,
            updateData as never,
        );

        this.logger.log(`Incident updated: ${id} by ${userId}`);

        return updated;
    }

    async delete(id: string, userRole: string) {
        if (userRole !== "admin") {
            throw new ForbiddenException("Only admins can delete incidents");
        }

        await this.findOne(id);
        await this.incidentsRepository.delete(id);

        this.logger.log(`Incident deleted: ${id}`);
    }

    async addComment(incidentId: string, authorId: string, dto: AddCommentDto) {
        await this.findOne(incidentId);

        const comment = await this.incidentsRepository.createComment({
            incidentId,
            authorId,
            content: dto.content,
        });

        this.logger.log(
            `Comment added to incident ${incidentId} by ${authorId}`,
        );

        return comment;
    }

    async getComments(incidentId: string, query: PaginationQueryDto) {
        return this.incidentsRepository.findComments(
            incidentId,
            query.page ?? 1,
            query.limit ?? 10,
        );
    }
}
