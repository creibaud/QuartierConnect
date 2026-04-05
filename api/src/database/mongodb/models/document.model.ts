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
    x: number;
    y: number;
    width?: number;
    height?: number;
    page: number;
};

export type DocumentSignature = {
    signerId: string;
    signerName: string;
    signatureData: string;
    signedAt: Date;
    metadata: SignatureMetadata;
    ipAddress?: string;
    userAgent?: string;
};

export type DocumentAttachment = {
    fileId: ObjectId;
    filename: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
};

export type GoBackendReference = {
    goDocumentId: string;
    storagePath: string;
    goApiUrl: string;
    checksumSha256?: string;
    lastSyncedAt: Date;
};

export type DocumentDocument = {
    _id?: ObjectId;
    documentId: string;
    creatorId: string;
    title: string;
    description?: string;
    documentType: DocumentType;
    status: DocumentStatus;
    originalFilename: string;
    goBackendRef: GoBackendReference;
    signatures: DocumentSignature[];
    requiredSigners?: string[];
    attachments?: DocumentAttachment[];
    pageCount?: number;
    fileSize?: number;
    createdAt: Date;
    updatedAt: Date;
    archivedAt?: Date;
    sharedWith?: string[];
    isPublic?: boolean;
};
