import { createHash } from "node:crypto";
// Helper for ConflictException import
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import {
    DOCUMENT_AUDIT_COLLECTION,
    type DocumentAuditDocument,
} from "src/database/mongodb/models/document-audit.model";
import { DOCUMENTS_COLLECTION } from "src/database/mongodb/models/document.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { TotpService } from "src/modules/auth/totp.service";
import { AddSignatureZoneDto } from "src/modules/documents/dto/add-signature-zone.dto";
import { InviteSignerDto } from "src/modules/documents/dto/invite-signer.dto";
import { SignDocumentDto } from "src/modules/documents/dto/sign-document.dto";

type SignatureEntry = {
    signerId: string;
    status: "pending" | "signed";
    x: number;
    y: number;
    page: number;
    width?: number;
    height?: number;
    signedAt?: Date;
    signatureData?: string;
    metadata?: { sha256Hash: string };
};

type SimpleDocumentRecord = {
    _id?: ObjectId;
    creatorId: string;
    title: string;
    description?: string;
    documentType: "contract" | "other";
    status: "draft" | "pending_signature" | "partial_signed" | "fully_signed";
    signatures: SignatureEntry[];
    sharedWith: string[];
    createdAt: Date;
    updatedAt: Date;
};

/**
 * DocumentSignatureService handles all signature workflow operations.
 * Separates signature logic from CRUD and document management concerns.
 */
@Injectable()
export class DocumentSignatureService {
    private readonly logger = new Logger(DocumentSignatureService.name);

    constructor(
        private readonly mongo: MongoDatabase,
        private readonly totpService: TotpService,
    ) {}

    /**
     * Add a signature zone to a document
     */
    async addSignatureZone(
        documentId: string,
        userId: string,
        dto: AddSignatureZoneDto,
    ) {
        const doc = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(documentId), creatorId: userId });

        if (!doc) {
            throw new NotFoundException("Document not found");
        }

        if (doc.status !== "draft") {
            throw new BadRequestException(
                "Cannot add signature zone to non-draft document",
            );
        }

        const zone: SignatureEntry = {
            signerId: dto.signerId,
            status: "pending",
            x: dto.x,
            y: dto.y,
            page: dto.page,
            width: dto.width,
            height: dto.height,
        };

        // Ensure unique signer per document
        const alreadyExists = doc.signatures.some(
            (s) => s.signerId === dto.signerId,
        );
        if (alreadyExists) {
            throw new ConflictException("Signer already has a signature zone");
        }

        await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(documentId) },
                {
                    $push: { signatures: zone },
                    $set: {
                        updatedAt: new Date(),
                        status: "pending_signature",
                    },
                },
            );

        this.logger.log(
            `Signature zone added - Document: ${documentId}, Signer: ${dto.signerId}`,
        );

        return { success: true, zone };
    }

    /**
     * Invite a signer to sign a document
     */
    async inviteSigner(
        documentId: string,
        userId: string,
        dto: InviteSignerDto,
    ) {
        const doc = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(documentId), creatorId: userId });

        if (!doc) {
            throw new NotFoundException("Document not found");
        }

        const signatureIndex = doc.signatures.findIndex(
            (s) => s.signerId === dto.signerId,
        );
        if (signatureIndex === -1) {
            throw new BadRequestException(
                "Signer does not have a signature zone",
            );
        }

        // In production, would send email invitation here
        this.logger.log(
            `Signer invited - Document: ${documentId}, Signer: ${dto.signerId}`,
        );

        return { success: true, invited: dto.signerId };
    }

    /**
     * Sign a document (authenticated signer)
     */
    async signDocument(
        documentId: string,
        signerId: string,
        dto: SignDocumentDto,
    ) {
        // Verify TOTP if provided
        if (dto.totpCode) {
            const isValidTotp = await this.totpService.verifyToken(
                signerId,
                dto.totpCode,
            );
            if (!isValidTotp) {
                throw new ForbiddenException("Invalid TOTP code");
            }
        }

        const doc = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(documentId) });

        if (!doc) {
            throw new NotFoundException("Document not found");
        }

        // Find signer's signature zone
        const signatureIndex = doc.signatures.findIndex(
            (s) => s.signerId === signerId && s.status === "pending",
        );
        if (signatureIndex === -1) {
            throw new BadRequestException(
                "No pending signature zone found for user",
            );
        }

        // Update signature entry
        const signature = doc.signatures[signatureIndex];
        const signatureData = this.generateSignatureData(
            documentId,
            signerId,
            dto.signatureImage,
        );

        const update = {
            status: "signed" as const,
            signedAt: new Date(),
            signatureData,
            metadata: {
                sha256Hash: this.hashSignature(signatureData),
            },
        };

        await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(documentId) },
                {
                    $set: {
                        [`signatures.${signatureIndex}`]: {
                            ...signature,
                            ...update,
                        },
                        updatedAt: new Date(),
                        status: this.computeDocumentStatus(doc.signatures),
                    },
                },
            );

        await this.insertAudit(documentId, signerId, "sign");

        this.logger.log(`Document signed - Document: ${documentId}`);

        return { success: true, signed: true };
    }

    /**
     * Insert audit trail
     */
    private async insertAudit(
        documentId: string,
        userId: string,
        action: string,
    ): Promise<void> {
        const audit: DocumentAuditDocument = {
            documentId,
            userId,
            action,
            timestamp: new Date(),
            metadata: {},
        };

        await this.mongo
            .collection<DocumentAuditDocument>(DOCUMENT_AUDIT_COLLECTION)
            .insertOne(audit);
    }

    /**
     * Helper: Generate signature data
     */
    private generateSignatureData(
        documentId: string,
        signerId: string,
        _image: string,
    ): string {
        return `${documentId}:${signerId}:${Date.now()}`;
    }

    /**
     * Helper: Hash signature
     */
    private hashSignature(data: string): string {
        return createHash("sha256").update(data).digest("hex");
    }

    /**
     * Helper: Compute document status based on signatures
     */
    private computeDocumentStatus(
        signatures: SignatureEntry[],
    ): SimpleDocumentRecord["status"] {
        if (signatures.length === 0) return "draft";

        const allSigned = signatures.every((s) => s.status === "signed");
        if (allSigned) return "fully_signed";

        const someSigned = signatures.some((s) => s.status === "signed");
        if (someSigned) return "partial_signed";

        return "pending_signature";
    }
}
