import type { DrizzleDB } from "src/database/drizzle/drizzle.type";

// TODO: Importer le/les schema(s) de ce module
// import { entity, table } from "src/database/drizzle/schema";

export interface ISyncRepository {
    // TODO: Ajouter les méthodes spécifiques à ce module
    // Exemples (adapter à votre logique):
    // findAll(query: QueryParams): Promise<{ data: T[], total: number }>;
    // findOne(id: UUID): Promise<T | null>;
    // create(data: CreateDto): Promise<T>;
    // update(id: UUID, data: UpdateDto): Promise<T | null>;
}

export class SyncRepository implements ISyncRepository {
    constructor(private readonly db: DrizzleDB) {}

    // TODO: Implémenter les méthodes de l'interface
    // Copier la logique de this.db.* du service ici
}
