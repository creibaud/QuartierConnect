import { BadRequestException } from "@nestjs/common";

/**
 * DTO pour les requêtes paginées standardisées
 */
export interface PaginationQueryDto {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

/**
 * Métadonnées de pagination pour les réponses
 */
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

/**
 * Réponse paginée générique
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

/**
 * Paramètres résolus pour une requête paginée
 */
export interface ResolvedPagination {
    page: number;
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

/**
 * Helper centralisé pour la pagination
 * Élimine la duplication de logique de pagination across 8+ services
 */
export class PaginationHelper {
    private static readonly MIN_LIMIT = 1;
    private static readonly MAX_LIMIT = 100;
    private static readonly DEFAULT_PAGE = 1;
    private static readonly DEFAULT_LIMIT = 20;

    /**
     * Parse et valide les paramètres de pagination
     * @param query Requête pagination du client
     * @returns Paramètres résolus et validés
     * @throws BadRequestException si paramètres invalides
     */
    static resolvePagination(query?: PaginationQueryDto): ResolvedPagination {
        const page = Math.max(1, Number(query?.page) || this.DEFAULT_PAGE);

        const limit = Math.min(
            this.MAX_LIMIT,
            Math.max(
                this.MIN_LIMIT,
                Number(query?.limit) || this.DEFAULT_LIMIT,
            ),
        );

        if (!Number.isInteger(page) || page < 1) {
            throw new BadRequestException("Page must be a positive integer");
        }

        if (!Number.isInteger(limit) || limit < 1) {
            throw new BadRequestException("Limit must be a positive integer");
        }

        const offset = (page - 1) * limit;

        return {
            page,
            limit,
            offset,
            sortBy: query?.sortBy || "createdAt",
            sortOrder: query?.sortOrder || "desc",
        };
    }

    /**
     * Construit une réponse paginée
     * @param data Données de la page actuelle
     * @param total Nombre total d'éléments
     * @param page Numéro de la page actuelle
     * @param limit Nombre d'éléments par page
     * @returns Réponse paginée avec métadonnées
     */
    static buildPaginatedResponse<T>(
        data: T[],
        total: number,
        page: number,
        limit: number,
    ): PaginatedResponse<T> {
        const pages = Math.ceil(total / limit);
        const hasNextPage = page * limit < total;
        const hasPrevPage = page > 1;

        return {
            data,
            meta: {
                total,
                page,
                limit,
                pages,
                hasNextPage,
                hasPrevPage,
            },
        };
    }

    /**
     * Calcule l'offset pour une requête base de données
     * @param page Numéro de la page
     * @param limit Éléments par page
     * @returns Offset pour la requête
     */
    static calculateOffset(page: number, limit: number): number {
        if (page < 1) {
            throw new BadRequestException("Page must be >= 1");
        }
        return (page - 1) * limit;
    }

    /**
     * Valide si une page est vide
     * Utilisé pour le contrôle de version de pagination côté client
     */
    static isValidPageNumber(
        page: number,
        total: number,
        limit: number,
    ): boolean {
        if (page < 1) return false;
        const maxPages = Math.max(1, Math.ceil(total / limit));
        return page <= maxPages;
    }
}
