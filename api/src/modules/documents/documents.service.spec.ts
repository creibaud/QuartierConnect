import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { ObjectId } from "mongodb";
import type { MongoDatabase } from "src/database/mongodb/mongodb.type";
import { TotpService } from "src/modules/auth/totp.service";
import { DocumentsService } from "src/modules/documents/documents.service";

const CREATOR_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SIGNER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DOC_ID = new ObjectId().toHexString();

const baseDraftDocument = {
    _id: new ObjectId(DOC_ID),
    creatorId: CREATOR_ID,
    title: "Test Document",
    documentType: "contract",
    status: "draft",
    signatures: [],
    sharedWith: [],
    createdAt: new Date(),
    updatedAt: new Date(),
};

const documentWithPendingSignature = {
    ...baseDraftDocument,
    status: "pending_signature",
    sharedWith: [SIGNER_ID],
    signatures: [
        {
            signerId: SIGNER_ID,
            status: "pending",
            x: 0.5,
            y: 0.5,
            page: 1,
        },
    ],
};

describe("DocumentsService", () => {
    let service: DocumentsService;
    let mongo: jest.Mocked<MongoDatabase>;
    let totpService: jest.Mocked<TotpService>;

    beforeEach(() => {
        mongo = {
            collection: jest.fn(),
        } as unknown as jest.Mocked<MongoDatabase>;

        totpService = {
            isTotpEnabled: jest.fn(),
            validateCode: jest.fn(),
        } as unknown as jest.Mocked<TotpService>;

        service = new DocumentsService(mongo, totpService);
    });

    describe("create", () => {
        it("creates document with status draft", async () => {
            const insertOne = jest
                .fn()
                .mockResolvedValue({ insertedId: new ObjectId(DOC_ID) });

            (mongo.collection as jest.Mock).mockReturnValue({ insertOne });

            const result = await service.create(CREATOR_ID, {
                title: "Test Document",
                documentType: "contract",
            });

            expect(result.status).toBe("draft");
            expect(result.creatorId).toBe(CREATOR_ID);
        });
    });

    describe("findOne", () => {
        it("throws ForbiddenException when user is not creator or in sharedWith", async () => {
            const findOne = jest.fn().mockResolvedValue(baseDraftDocument);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });

            await expect(
                service.findOne(DOC_ID, "stranger-id"),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it("returns document for creator", async () => {
            const findOne = jest.fn().mockResolvedValue(baseDraftDocument);
            const insertOne = jest.fn().mockResolvedValue({});

            (mongo.collection as jest.Mock).mockImplementation(
                (collection: string) => {
                    if (collection === "document_audit") return { insertOne };
                    return { findOne };
                },
            );

            const result = await service.findOne(DOC_ID, CREATOR_ID);

            expect(result.id).toBe(DOC_ID);
        });
    });

    describe("sign", () => {
        it("throws BadRequestException when TOTP is not enabled", async () => {
            const findOne = jest
                .fn()
                .mockResolvedValue(documentWithPendingSignature);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });
            totpService.isTotpEnabled.mockResolvedValue(false);

            await expect(
                service.sign(DOC_ID, SIGNER_ID, { totpCode: "123456" }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it("marks document as fully_signed when all signers have signed", async () => {
            const findOne = jest
                .fn()
                .mockResolvedValue(documentWithPendingSignature);
            const updateOne = jest.fn().mockResolvedValue({});
            const insertOne = jest.fn().mockResolvedValue({});

            (mongo.collection as jest.Mock).mockImplementation(
                (collection: string) => {
                    if (collection === "document_audit") return { insertOne };
                    if (collection === "documents")
                        return { findOne, updateOne };
                    return { findOne, updateOne, insertOne };
                },
            );

            totpService.isTotpEnabled.mockResolvedValue(true);
            totpService.validateCode.mockResolvedValue(true);

            const updatedDoc = {
                ...documentWithPendingSignature,
                status: "fully_signed",
                signatures: [
                    {
                        ...documentWithPendingSignature.signatures[0],
                        status: "signed",
                    },
                ],
            };

            findOne
                .mockResolvedValueOnce(documentWithPendingSignature)
                .mockResolvedValueOnce(updatedDoc);

            await service.sign(DOC_ID, SIGNER_ID, {
                totpCode: "123456",
            });

            expect(updateOne).toHaveBeenCalled();
        });

        it("throws NotFoundException when user has no pending signature", async () => {
            const findOne = jest.fn().mockResolvedValue(baseDraftDocument);

            (mongo.collection as jest.Mock).mockReturnValue({ findOne });
            totpService.isTotpEnabled.mockResolvedValue(true);

            await expect(
                service.sign(DOC_ID, SIGNER_ID, { totpCode: "123456" }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
