import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { ContractDocumentsService } from "../documents/contract-documents.service";
import { PdfService } from "../documents/pdf.service";
import { PointsService } from "../points/points.service";
import { ContractsService } from "./contracts.service";
import { Contract, ContractStatus } from "./schemas/contract.schema";

const mockContractDoc = {
    _id: "ct-1",
    title: "Test Contract",
    content: "Content here",
    createdBy: "user-1",
    signatories: ["user-1", "user-2"],
    signatures: [] as Array<{ userId: string; signedAt: Date; hash: string }>,
    status: ContractStatus.DRAFT,
    bookingId: null as string | null,
    save: jest.fn(),
};

const mockContractModel = {
    find: jest.fn(),
    findById: jest.fn(),
};

const mockDb = {
    select: jest.fn(),
};

const mockTotpService = {
    verify: jest.fn(),
};

const mockPointsService = {
    completeServicePayment: jest.fn(),
    isServicePaymentCompleted: jest.fn().mockResolvedValue(false),
};

const mockEventEmitter = {
    emit: jest.fn(),
};

const mockPdf = {
    generateBaseContractPdf: jest.fn(),
    stampSignature: jest.fn(),
    sha256: jest.fn(),
};

const mockDocs = {
    storePdf: jest.fn().mockResolvedValue({ fileId: "f", sha256: "h" }),
    getCurrentPdf: jest.fn().mockResolvedValue(null),
    getPdfStream: jest.fn(),
    getAudit: jest.fn(),
};

const NAME_RESOLUTION_ROWS = [
    { id: "payer", firstName: "P", lastName: "One", email: "p@x" },
    { id: "payee", firstName: "Q", lastName: "Two", email: "q@x" },
];

describe("ContractsService", () => {
    let service: ContractsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockContractDoc.signatures = [];
        mockContractDoc.status = ContractStatus.DRAFT;

        // Default Drizzle chain: `.limit(...)` serves the TOTP lookup, while
        // awaiting the chain directly (no `.limit`) serves name resolution.
        mockDb.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    limit: jest
                        .fn()
                        .mockResolvedValue([{ totpSecret: "SECRET" }]),
                    then: (resolve: (value: unknown) => void) =>
                        resolve(NAME_RESOLUTION_ROWS),
                }),
            }),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractsService,
                {
                    provide: getModelToken(Contract.name),
                    useValue: mockContractModel,
                },
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                { provide: TotpService, useValue: mockTotpService },
                { provide: PointsService, useValue: mockPointsService },
                { provide: EventEmitter2, useValue: mockEventEmitter },
                { provide: PdfService, useValue: mockPdf },
                { provide: ContractDocumentsService, useValue: mockDocs },
            ],
        }).compile();

        service = module.get<ContractsService>(ContractsService);
    });

    describe("findAll", () => {
        it("returns contracts for user", async () => {
            mockContractModel.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockContractDoc]),
                }),
            });

            const result = await service.findAll("user-1");
            expect(result).toHaveLength(1);
        });
    });

    describe("findOne", () => {
        it("returns contract when user is creator", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });

            const result = await service.findOne("ct-1", "user-1");
            expect(result._id).toBe("ct-1");
        });

        it("returns contract when user is a signatory", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });

            const result = await service.findOne("ct-1", "user-2");
            expect(result._id).toBe("ct-1");
        });

        it("throws NotFoundException when contract not found", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            await expect(service.findOne("ct-x", "user-1")).rejects.toThrow(
                NotFoundException,
            );
        });

        it("throws ForbiddenException when user has no access", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });

            await expect(service.findOne("ct-1", "user-99")).rejects.toThrow(
                ForbiddenException,
            );
        });

        it("heals a service contract to fully_signed when the payment already completed but status lags (crash-window recovery)", async () => {
            const contract = {
                ...mockContractDoc,
                status: ContractStatus.PARTIAL,
                bookingId: "booking-1",
                signedAt: null as Date | null,
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockPointsService.isServicePaymentCompleted.mockResolvedValueOnce(
                true,
            );

            const result = await service.findOne("ct-1", "user-1");

            expect(result.status).toBe(ContractStatus.FULLY_SIGNED);
            expect(result.signedAt).toBeInstanceOf(Date);
            expect(contract.save).toHaveBeenCalled();
        });

        it("does not query PointsService for a manual contract without a bookingId", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });

            await service.findOne("ct-1", "user-1");

            expect(
                mockPointsService.isServicePaymentCompleted,
            ).not.toHaveBeenCalled();
        });

        it("does not heal a service contract while the payment is still pending", async () => {
            const contract = {
                ...mockContractDoc,
                status: ContractStatus.PARTIAL,
                bookingId: "booking-1",
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockPointsService.isServicePaymentCompleted.mockResolvedValueOnce(
                false,
            );

            const result = await service.findOne("ct-1", "user-1");

            expect(result.status).toBe(ContractStatus.PARTIAL);
            expect(contract.save).not.toHaveBeenCalled();
        });

        it("enforces access control before any heal — a non-party never triggers the payment query", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...mockContractDoc,
                    status: ContractStatus.PARTIAL,
                    bookingId: "booking-1",
                }),
            });

            await expect(service.findOne("ct-1", "user-99")).rejects.toThrow(
                ForbiddenException,
            );
            expect(
                mockPointsService.isServicePaymentCompleted,
            ).not.toHaveBeenCalled();
        });

        it("returns the healed status even when persisting the reconciliation fails (best-effort)", async () => {
            const contract = {
                ...mockContractDoc,
                status: ContractStatus.PARTIAL,
                bookingId: "booking-1",
                save: jest.fn().mockRejectedValue(new Error("Mongo down")),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockPointsService.isServicePaymentCompleted.mockResolvedValueOnce(
                true,
            );

            const result = await service.findOne("ct-1", "user-1");

            expect(result.status).toBe(ContractStatus.FULLY_SIGNED);
            expect(contract.save).toHaveBeenCalled();
        });
    });

    describe("create", () => {
        it("creates contract with SHA-256 hash", async () => {
            const saved = { ...mockContractDoc, status: ContractStatus.DRAFT };
            const contractInstance = {
                save: jest.fn().mockResolvedValue(saved),
            };
            const CtorModel = jest
                .fn()
                .mockImplementation(() => contractInstance);
            Object.assign(CtorModel, mockContractModel);

            const module2: TestingModule = await Test.createTestingModule({
                providers: [
                    ContractsService,
                    {
                        provide: getModelToken(Contract.name),
                        useValue: CtorModel,
                    },
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
                    { provide: TotpService, useValue: mockTotpService },
                    { provide: PointsService, useValue: mockPointsService },
                    { provide: EventEmitter2, useValue: mockEventEmitter },
                    { provide: PdfService, useValue: mockPdf },
                    { provide: ContractDocumentsService, useValue: mockDocs },
                ],
            }).compile();
            const svc2 = module2.get<ContractsService>(ContractsService);

            const dto = { title: "T", content: "C", signatories: ["user-2"] };
            const result = await svc2.create(dto, "user-1");
            expect(result.status).toBe(ContractStatus.DRAFT);
            expect(contractInstance.save).toHaveBeenCalled();
        });

        it("creates contract with empty signatories when none provided", async () => {
            const contractInstance = {
                save: jest.fn().mockResolvedValue({ signatories: [] }),
            };
            const CtorModel = jest
                .fn()
                .mockImplementation(() => contractInstance);
            Object.assign(CtorModel, mockContractModel);

            const module3: TestingModule = await Test.createTestingModule({
                providers: [
                    ContractsService,
                    {
                        provide: getModelToken(Contract.name),
                        useValue: CtorModel,
                    },
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
                    { provide: TotpService, useValue: mockTotpService },
                    { provide: PointsService, useValue: mockPointsService },
                    { provide: EventEmitter2, useValue: mockEventEmitter },
                    { provide: PdfService, useValue: mockPdf },
                    { provide: ContractDocumentsService, useValue: mockDocs },
                ],
            }).compile();
            const svc3 = module3.get<ContractsService>(ContractsService);

            await svc3.create({ title: "T", content: "C" }, "user-1");
            expect(CtorModel).toHaveBeenCalledWith(
                expect.objectContaining({ signatories: [] }),
            );
        });
    });

    describe("sign", () => {
        it("throws NotFoundException when contract not found", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            await expect(
                service.sign("ct-x", "user-1", "123456"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws ForbiddenException when user is not a signatory", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...mockContractDoc,
                    signatories: ["user-2"],
                }),
            });

            await expect(
                service.sign("ct-1", "user-99", "123456"),
            ).rejects.toThrow(ForbiddenException);
        });

        it("throws BadRequestException when user already signed", async () => {
            const alreadySigned = {
                ...mockContractDoc,
                signatures: [
                    { userId: "user-1", signedAt: new Date(), hash: "abc" },
                ],
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(alreadySigned),
            });

            await expect(
                service.sign("ct-1", "user-1", "123456"),
            ).rejects.toThrow(BadRequestException);
        });

        it("throws NotFoundException when user not found in DB", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([]),
            });

            await expect(
                service.sign("ct-1", "user-1", "123456"),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws BadRequestException when TOTP invalid", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockContractDoc),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(false);

            await expect(
                service.sign("ct-1", "user-1", "000000"),
            ).rejects.toThrow(BadRequestException);
        });

        it("marks contract as PARTIAL when not all have signed", async () => {
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1", "user-2"],
                signatures: [],
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(true);

            await service.sign("ct-1", "user-1", "123456");
            expect(contract.status).toBe(ContractStatus.PARTIAL);
        });

        it("marks a manual contract as FULLY_SIGNED without settlement when all signatories have signed", async () => {
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1"],
                signatures: [],
                bookingId: null,
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(true);

            await service.sign("ct-1", "user-1", "123456");

            expect(contract.status).toBe(ContractStatus.FULLY_SIGNED);
            expect(
                mockPointsService.completeServicePayment,
            ).not.toHaveBeenCalled();
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it("throws BadRequestException when the contract is cancelled", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...mockContractDoc,
                    status: ContractStatus.CANCELLED,
                }),
            });

            await expect(
                service.sign("ct-1", "user-1", "123456"),
            ).rejects.toThrow(BadRequestException);
            expect(
                mockPointsService.completeServicePayment,
            ).not.toHaveBeenCalled();
        });

        it("settles the service payment before saving the final signature, then emits contract.fully_signed", async () => {
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1"],
                signatures: [],
                bookingId: "booking-1",
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(true);

            await service.sign("ct-1", "user-1", "123456");

            expect(
                mockPointsService.completeServicePayment,
            ).toHaveBeenCalledWith("ct-1");
            expect(
                mockPointsService.completeServicePayment.mock
                    .invocationCallOrder[0],
            ).toBeLessThan(contract.save.mock.invocationCallOrder[0]);
            expect(contract.status).toBe(ContractStatus.FULLY_SIGNED);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                "contract.fully_signed",
                { contractId: "ct-1", bookingId: "booking-1" },
            );
        });

        it("does not settle or emit yet when a service contract still needs more signatures", async () => {
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1", "user-2"],
                signatures: [],
                bookingId: "booking-1",
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(true);

            await service.sign("ct-1", "user-1", "123456");

            expect(contract.status).toBe(ContractStatus.PARTIAL);
            expect(
                mockPointsService.completeServicePayment,
            ).not.toHaveBeenCalled();
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it("does not persist the signature when settlement fails on the final signer", async () => {
            const priorSignature = {
                userId: "user-1",
                signedAt: new Date(),
                hash: "prior-hash",
            };
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1", "user-2"],
                signatures: [priorSignature],
                status: ContractStatus.PARTIAL,
                bookingId: "booking-1",
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockDb.select.mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([{ totpSecret: "SECRET" }]),
            });
            mockTotpService.verify.mockReturnValue(true);
            mockPointsService.completeServicePayment.mockRejectedValue(
                new BadRequestException("Insufficient balance"),
            );

            await expect(
                service.sign("ct-1", "user-2", "123456"),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(contract.signatures).toHaveLength(1);
            expect(contract.status).toBe(ContractStatus.PARTIAL);
            expect(contract.save).not.toHaveBeenCalled();
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
        });

        it("does not throw when PDF stamping fails (invariant: signature/settlement still commit)", async () => {
            const contract: Record<string, unknown> = {
                ...mockContractDoc,
                signatories: ["user-1"],
                signatures: [],
                bookingId: "booking-1",
            };
            contract.save = jest
                .fn()
                .mockImplementation(() => Promise.resolve(contract));
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockTotpService.verify.mockReturnValue(true);
            mockPointsService.completeServicePayment.mockResolvedValue(
                undefined,
            );
            mockDocs.getCurrentPdf.mockResolvedValue(Buffer.from("%PDF-"));
            mockPdf.stampSignature.mockRejectedValue(new Error("stamp boom"));

            const res = await service.sign("ct-1", "user-1", "123456");

            expect(res.status).toBe(ContractStatus.FULLY_SIGNED);
            expect(res.signatures).toHaveLength(1);
        });

        it("passes the drawn signatureImage into stampSignature", async () => {
            const contract = {
                ...mockContractDoc,
                bookingId: "bk-1",
                signatories: ["user-1", "user-2"],
                signatures: [],
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });
            mockTotpService.verify.mockReturnValue(true);
            mockDocs.getCurrentPdf.mockResolvedValue(Buffer.from("%PDF-"));
            mockPdf.stampSignature.mockResolvedValue(Buffer.from("%PDF-x"));
            mockDocs.storePdf.mockResolvedValue({ fileId: "f1", sha256: "h" });

            await service.sign(
                "ct-1",
                "user-1",
                "123456",
                "data:image/png;base64,AAAA",
            );

            expect(mockPdf.stampSignature).toHaveBeenCalledWith(
                expect.any(Buffer),
                0,
                expect.objectContaining({
                    image: "data:image/png;base64,AAAA",
                }),
            );
        });
    });

    describe("createServiceContract", () => {
        it("creates a DRAFT contract with the service/booking fields and a content hash", async () => {
            const contractInstance = {
                status: ContractStatus.DRAFT,
                save: jest
                    .fn()
                    .mockResolvedValue({ status: ContractStatus.DRAFT }),
            };
            const CtorModel = jest
                .fn()
                .mockImplementation(() => contractInstance);
            Object.assign(CtorModel, mockContractModel);

            const module4: TestingModule = await Test.createTestingModule({
                providers: [
                    ContractsService,
                    {
                        provide: getModelToken(Contract.name),
                        useValue: CtorModel,
                    },
                    { provide: DRIZZLE_TOKEN, useValue: mockDb },
                    { provide: TotpService, useValue: mockTotpService },
                    { provide: PointsService, useValue: mockPointsService },
                    { provide: EventEmitter2, useValue: mockEventEmitter },
                    { provide: PdfService, useValue: mockPdf },
                    { provide: ContractDocumentsService, useValue: mockDocs },
                ],
            }).compile();
            const svc4 = module4.get<ContractsService>(ContractsService);

            const result = await svc4.createServiceContract({
                title: "Tonte de pelouse",
                content: "Accord de prestation de service.",
                serviceId: "service-1",
                bookingId: "booking-1",
                signatories: ["user-1", "user-2"],
                pointsAmount: 20,
                createdBy: "user-1",
            });

            expect(CtorModel).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: ContractStatus.DRAFT,
                    serviceId: "service-1",
                    bookingId: "booking-1",
                    pointsAmount: 20,
                }),
            );
            expect(contractInstance.save).toHaveBeenCalled();
            expect(result.status).toBe(ContractStatus.DRAFT);
        });

        describe("PDF generation (best-effort)", () => {
            let pdfContract: Record<string, unknown> & { save: jest.Mock };
            let pdfService: ContractsService;

            beforeEach(async () => {
                const CtorModel = jest
                    .fn()
                    .mockImplementation((data: Record<string, unknown>) => {
                        pdfContract = {
                            ...data,
                            _id: "ct-pdf-1",
                            save: jest
                                .fn()
                                .mockImplementation(() =>
                                    Promise.resolve(pdfContract),
                                ),
                        };
                        return pdfContract;
                    });
                Object.assign(CtorModel, mockContractModel);

                const module5: TestingModule = await Test.createTestingModule({
                    providers: [
                        ContractsService,
                        {
                            provide: getModelToken(Contract.name),
                            useValue: CtorModel,
                        },
                        { provide: DRIZZLE_TOKEN, useValue: mockDb },
                        { provide: TotpService, useValue: mockTotpService },
                        {
                            provide: PointsService,
                            useValue: mockPointsService,
                        },
                        {
                            provide: EventEmitter2,
                            useValue: mockEventEmitter,
                        },
                        { provide: PdfService, useValue: mockPdf },
                        {
                            provide: ContractDocumentsService,
                            useValue: mockDocs,
                        },
                    ],
                }).compile();
                pdfService = module5.get<ContractsService>(ContractsService);
            });

            it("generates + stores a PDF and sets pdfFileId", async () => {
                mockPdf.generateBaseContractPdf.mockResolvedValue(
                    Buffer.from("%PDF-"),
                );
                mockDocs.storePdf.mockResolvedValue({
                    fileId: "f1",
                    sha256: "abc",
                });

                const contract = await pdfService.createServiceContract({
                    title: "t",
                    content: "body",
                    serviceId: "s1",
                    bookingId: "b1",
                    signatories: ["payer", "payee"],
                    pointsAmount: 2,
                    createdBy: "payer",
                });

                expect(mockPdf.generateBaseContractPdf).toHaveBeenCalled();
                expect(mockDocs.storePdf).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.any(Buffer),
                    "generated",
                    "payer",
                );
                expect(contract.pdfFileId).toBe("f1");
            });

            it("still returns the contract when PDF generation fails (best-effort)", async () => {
                mockPdf.generateBaseContractPdf.mockRejectedValue(
                    new Error("pdf boom"),
                );

                const contract = await pdfService.createServiceContract({
                    title: "t",
                    content: "body",
                    serviceId: "s1",
                    bookingId: "b1",
                    signatories: ["payer", "payee"],
                    pointsAmount: 2,
                    createdBy: "payer",
                });

                expect(contract).toBeDefined();
                expect(contract.status).toBe(ContractStatus.DRAFT);
            });
        });
    });

    describe("cancelContract", () => {
        it("does nothing when the contract is not found", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            await expect(
                service.cancelContract("ct-x"),
            ).resolves.toBeUndefined();
        });

        it("throws BadRequestException when the contract is already fully signed", async () => {
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...mockContractDoc,
                    status: ContractStatus.FULLY_SIGNED,
                    save: jest.fn(),
                }),
            });

            await expect(service.cancelContract("ct-1")).rejects.toThrow(
                BadRequestException,
            );
        });

        it("marks the contract as CANCELLED otherwise", async () => {
            const contract = {
                ...mockContractDoc,
                status: ContractStatus.PARTIAL,
                save: jest.fn().mockResolvedValue({}),
            };
            mockContractModel.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(contract),
            });

            await service.cancelContract("ct-1");

            expect(contract.status).toBe(ContractStatus.CANCELLED);
            expect(contract.save).toHaveBeenCalled();
        });
    });
});
