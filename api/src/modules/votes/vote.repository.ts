import type { Collection } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IVotesRepository {
    // findAll(): Promise<void>;
    // find(filter: Filter): Promise<void>;
    // findById(id: string): Promise<void>;
    // create(data: unknown): Promise<void>;
    // update(id: string, data: unknown): Promise<void>;
}

export class VotesRepository implements IVotesRepository {
    private collection: Collection;

    constructor(private readonly mongo: MongoDatabase) {
        // TODO: Initialiser la collection appropriée
        // this.collection = mongo.collection("votes");
    }

    // TODO: Implémenter les méthodes de l'interface
    // Copier la logique de this.mongo.collection() du service ici
}
