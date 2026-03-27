import type { ObjectId } from "mongodb";

export const DOCUMENT_AUDIT_COLLECTION = "document_audit";

export type DocumentAuditAction =
    | "import"
    | "view"
    | "sign"
    | "share"
    | "archive"
    | "restore"
    | "delete";

export type DocumentAuditDocument = {
    _id?: ObjectId;
    documentId: string;
    actionType: DocumentAuditAction;
    performedByUserId: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
};
