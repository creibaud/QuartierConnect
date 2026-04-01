import type { Collection } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";

export interface IDocumentsRepository {
    // TODO: Ajouter les méthodes spécifiques à ce module
    // Exemples:
    // find(filter: Filter): Promise<T[]>;
    // findById(id: string): Promise<T | null>;
    // create(data: T): Promise<T>;
    // update(id: string, data: Partial<T>): Promise<T | null>;
}

export class DocumentsRepository implements IDocumentsRepository {
    private collection: Collection;

    constructor(private readonly mongo: MongoDatabase) {
        // TODO: Initialiser la collection appropriée
        // this.collection = mongo.collection("documents");
    }

    // TODO: Implémenter les méthodes de l'interface
    // Copier la logique de this.mongo.collection() du service ici
}
