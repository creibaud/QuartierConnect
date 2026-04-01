import { Injectable } from "@nestjs/common";
import {
    PaginatedResponse,
    PaginationHelper,
    PaginationQueryDto,
} from "src/common/helpers/pagination.helper";

/**
 * Service de base générique pour opérations CRUD standardisées
 * Élimine la duplication de logique CRUD across tous les services
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class EventsService extends BaseCrudService<Event> {
 *   constructor(private eventRepository: IEventsRepository) {
 *     super();
 *   }
 *
 *   async findAll(query: PaginationQueryDto): Promise<PaginatedResponse<Event>> {
 *     const { page, limit, offset } = PaginationHelper.resolvePagination(query);
 *     const [data, total] = await this.eventRepository.findAll(page, limit);
 *     return this.buildPaginatedResponse(data, total, page, limit);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseCrudService<T> {
    /**
     * Construit une réponse paginée standardisée
     * Utilisé par tous les services implémentant  findAll()
     */
    protected buildPaginatedResponse(
        data: T[],
        total: number,
        page: number,
        limit: number,
    ): PaginatedResponse<T> {
        return PaginationHelper.buildPaginatedResponse(
            data,
            total,
            page,
            limit,
        );
    }

    /**
     * Parse les paramètres de pagination depuis la requête
     * Utilisé avant d'appeler findAll()
     */
    protected resolvePagination(query?: PaginationQueryDto) {
        return PaginationHelper.resolvePagination(query);
    }

    /**
     * Calcule l'offset pour une requête base de données
     */
    protected calculateOffset(page: number, limit: number): number {
        return PaginationHelper.calculateOffset(page, limit);
    }
}
