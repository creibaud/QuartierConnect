import type { Collection } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IVotesRepository {
    [index: string]: unknown;
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
