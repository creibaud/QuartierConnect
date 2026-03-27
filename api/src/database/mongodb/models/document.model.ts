import type { ObjectId } from "mongodb";

export const DOCUMENTS_COLLECTION = "documents";

export type DocumentStatus =
    | "draft"
    | "pending_signature"
    | "partial_signed"
    | "fully_signed"
    | "archived";

export type DocumentType = "contract" | "agreement" | "report" | "custom";

export type SignatureMetadata = {
    x: number; // Position horizontale
    y: number; // Position verticale
    width?: number; // Largeur signature
    height?: number; // Hauteur signature
    page: number; // Numéro page (défaut: 1)
};

/**
 * Signature d'un document
 */
export type DocumentSignature = {
    signerId: string; // UUID utilisateur PostgreSQL
    signerName: string;
    signatureData: string; // Base64 de la signature
    signedAt: Date;
    metadata: SignatureMetadata;
    ipAddress?: string;
    userAgent?: string;
};

/**
 * Pièce jointe du document
 */
export type DocumentAttachment = {
    fileId: ObjectId; // GridFS ID
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
};

/**
 * Référence vers le backend Go
 */
export type GoBackendReference = {
    goDocumentId: string; // ID du document dans Go
    storagePath: string; // Chemin du fichier dans Go
    goApiUrl: string; // URL API Go
    checksumSha256?: string; // SHA-256 du fichier
    lastSyncedAt: Date;
};

/**
 * Document complet stocké dans MongoDB
 */
export type DocumentDocument = {
    _id?: ObjectId;

    // Identifiants
    documentId: string; // Référence PostgreSQL (UUID)
    creatorId: string; // Créateur du document (UUID PostgreSQL)

    // Informations basiques
    title: string;
    description?: string;
    documentType: DocumentType;

    // État et statut
    status: DocumentStatus;
    originalFilename: string;

    // Références vers Go backend
    goBackendRef: GoBackendReference;

    // Signatures
    signatures: DocumentSignature[];
    requiredSigners?: string[]; // UUIDs des signataires requis

    // Pièces jointes associées
    attachments?: DocumentAttachment[];

    // Métadonnées du document
    pageCount?: number;
    fileSize?: number; // en bytes

    // Audit et traçabilité
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;

    // Partage
    sharedWith?: string[];
    isPublic?: boolean;
};
