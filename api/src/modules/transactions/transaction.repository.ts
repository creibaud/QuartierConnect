import type { UUID } from "node:crypto";
import { eq, sql, type SQL, and, or } from "drizzle-orm";
import type { DrizzleDB } from "src/database/drizzle/drizzle.type";
import type { ColumnMap } from "src/common/query/query.helper";
import { resolveOrderBy, resolvePagination } from "src/common/query/query.helper";
// TODO: Importer le/les schema(s) de ce module
// import { entity, table } from "src/database/drizzle/schema";

export interface ITransactionsRepository {
    // TODO: Ajouter les méthodes spécifiques à ce module
    // Exemples (adapter à votre logique):
    // findAll(query: QueryParams): Promise<{ data: T[], total: number }>;
    // findOne(id: UUID): Promise<T | null>;
    // create(data: CreateDto): Promise<T>;
    // update(id: UUID, data: UpdateDto): Promise<T | null>;
}

export class TransactionsRepository implements ITransactionsRepository {
    constructor(private readonly db: DrizzleDB) {}

    // TODO: Implémenter les méthodes de l'interface
    // Copier la logique de this.db.* du service ici
}
