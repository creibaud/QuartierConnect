import { createHash } from "node:crypto";
import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import { PaginationQueryDto } from "src/common/dto/pagination-query.dto";
import {
    DOCUMENT_AUDIT_COLLECTION,
    type DocumentAuditDocument,
} from "src/database/mongodb/models/document-audit.model";
import { DOCUMENTS_COLLECTION } from "src/database/mongodb/models/document.model";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { TotpService } from "src/modules/auth/totp.service";
import { AddSignatureZoneDto } from "src/modules/documents/dto/add-signature-zone.dto";
import { CreateDocumentDto } from "src/modules/documents/dto/create-document.dto";
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

@Injectable()
export class DocumentsService {
    private readonly logger = new Logger(DocumentsService.name);

    constructor(
        @Inject("MONGODB") private readonly mongo: MongoDatabase,
        private readonly totpService: TotpService,
    ) {}

    async create(creatorId: string, dto: CreateDocumentDto) {
        const now = new Date();
        const doc: SimpleDocumentRecord = {
            creatorId,
            title: dto.title,
            description: dto.description,
            documentType: dto.documentType,
            status: "draft",
            signatures: [],
            sharedWith: [],
            createdAt: now,
            updatedAt: now,
        };

        const result = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .insertOne(doc);

        const documentId = result.insertedId.toHexString();

        await this.insertAudit(documentId, creatorId, "import");

        this.logger.log(`Document created: ${documentId} by user ${creatorId}`);

        return this.toResponse({ ...doc, _id: result.insertedId });
    }

    async findMyDocuments(userId: string, query: PaginationQueryDto) {
        const { page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const filter = {
            $or: [{ creatorId: userId }, { sharedWith: userId }],
        };

        const collection =
            this.mongo.collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION);

        const [documents, total] = await Promise.all([
            collection
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            collection.countDocuments(filter),
        ]);

        return {
            data: documents.map((document) => this.toResponse(document)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(id: string, userId: string) {
        const doc = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(id) });

        if (!doc) {
            throw new NotFoundException("Document not found");
        }

        const isAuthorized =
            doc.creatorId === userId || doc.sharedWith.includes(userId);
        if (!isAuthorized) {
            throw new ForbiddenException(
                "You are not authorized to view this document",
            );
        }

        await this.insertAudit(id, userId, "view");

        return this.toResponse(doc);
    }

    async addSignatureZone(
        documentId: string,
        userId: string,
        dto: AddSignatureZoneDto,
    ) {
        const doc = await this.findRawDocument(documentId);

        if (doc.creatorId !== userId) {
            throw new ForbiddenException(
                "Only the creator can add signature zones",
            );
        }

        const allowedStatuses = ["draft", "pending_signature"];
        if (!allowedStatuses.includes(doc.status)) {
            throw new BadRequestException(
                "Cannot add signature zones to this document in its current status",
            );
        }

        const newSignature: SignatureEntry = {
            signerId: dto.signerId,
            status: "pending",
            x: dto.x,
            y: dto.y,
            page: dto.page,
            width: dto.width,
            height: dto.height,
        };

        const updatedSharedWith = doc.sharedWith.includes(dto.signerId)
            ? doc.sharedWith
            : [...doc.sharedWith, dto.signerId];

        await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(documentId) },
                {
                    $push: { signatures: newSignature },
                    $set: {
                        status: "pending_signature",
                        sharedWith: updatedSharedWith,
                        updatedAt: new Date(),
                    },
                },
            );

        this.logger.log(
            `Signature zone added to document ${documentId} for signer ${dto.signerId}`,
        );

        return this.findOne(documentId, userId);
    }

    async inviteSigner(
        documentId: string,
        userId: string,
        dto: InviteSignerDto,
    ) {
        const doc = await this.findRawDocument(documentId);

        if (doc.creatorId !== userId) {
            throw new ForbiddenException("Only the creator can invite signers");
        }

        const updatedSharedWith = doc.sharedWith.includes(dto.signerUserId)
            ? doc.sharedWith
            : [...doc.sharedWith, dto.signerUserId];

        await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(documentId) },
                {
                    $set: {
                        sharedWith: updatedSharedWith,
                        updatedAt: new Date(),
                    },
                },
            );

        await this.insertAudit(documentId, userId, "share");

        this.logger.log(
            `Signer ${dto.signerUserId} invited to document ${documentId}`,
        );

        return this.findOne(documentId, userId);
    }

    async sign(documentId: string, userId: string, dto: SignDocumentDto) {
        const doc = await this.findRawDocument(documentId);

        const signatureIndex = doc.signatures.findIndex(
            (s) => s.signerId === userId && s.status === "pending",
        );

        if (signatureIndex === -1) {
            throw new NotFoundException(
                "No pending signature found for this user",
            );
        }

        const isTotpEnabled = await this.totpService.isTotpEnabled(userId);

        if (!isTotpEnabled) {
            throw new BadRequestException(
                "MFA required for signing. Please enable TOTP first.",
            );
        }

        const isValid = await this.totpService.validateCode(
            userId,
            dto.totpCode,
        );
        if (!isValid) {
            throw new BadRequestException("Invalid TOTP code");
        }

        const sha256Hash = createHash("sha256")
            .update(documentId + userId + Date.now())
            .digest("hex");

        const now = new Date();
        const updatedSignatures = [...doc.signatures];
        updatedSignatures[signatureIndex] = {
            ...updatedSignatures[signatureIndex],
            status: "signed",
            signedAt: now,
            signatureData: dto.signatureImageBase64,
            metadata: { sha256Hash },
        };

        const allSigned = updatedSignatures.every((s) => s.status === "signed");
        const newStatus = allSigned ? "fully_signed" : "partial_signed";

        await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .updateOne(
                { _id: new ObjectId(documentId) },
                {
                    $set: {
                        signatures: updatedSignatures,
                        status: newStatus,
                        updatedAt: now,
                    },
                },
            );

        await this.insertAudit(documentId, userId, "sign");

        this.logger.log(`Document ${documentId} signed by user ${userId}`);

        return this.findOne(documentId, userId);
    }

    async getAudit(documentId: string, userId: string) {
        await this.findOne(documentId, userId);

        const entries = await this.mongo
            .collection<DocumentAuditDocument>(DOCUMENT_AUDIT_COLLECTION)
            .find({ documentId })
            .sort({ createdAt: 1 })
            .toArray();

        return entries.map((entry) => {
            const { _id, ...rest } = entry;
            return { id: _id?.toString(), ...rest };
        });
    }

    private async findRawDocument(
        documentId: string,
    ): Promise<SimpleDocumentRecord & { _id: ObjectId }> {
        const doc = await this.mongo
            .collection<SimpleDocumentRecord>(DOCUMENTS_COLLECTION)
            .findOne({ _id: new ObjectId(documentId) });

        if (!doc) {
            throw new NotFoundException("Document not found");
        }

        return doc as SimpleDocumentRecord & { _id: ObjectId };
    }

    private async insertAudit(
        documentId: string,
        performedByUserId: string,
        actionType: DocumentAuditDocument["actionType"],
    ) {
        const audit: DocumentAuditDocument = {
            documentId,
            actionType,
            performedByUserId,
            createdAt: new Date(),
        };

        await this.mongo
            .collection<DocumentAuditDocument>(DOCUMENT_AUDIT_COLLECTION)
            .insertOne(audit);
    }

    private toResponse(doc: SimpleDocumentRecord & { _id?: ObjectId }) {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }
}
