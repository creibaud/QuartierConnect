import type { DrizzleDB } from "src/database/drizzle/drizzle.type";

// TODO: Importer le/les schema(s) de ce module
// import { entity, table } from "src/database/drizzle/schema";

export interface ITransactionsRepository {
    [index: string]: unknown;
}

export class TransactionsRepository implements ITransactionsRepository {
    constructor(private readonly db: DrizzleDB) {}

    // TODO: Implémenter les méthodes de l'interface
    // Copier la logique de this.db.* du service ici
}
