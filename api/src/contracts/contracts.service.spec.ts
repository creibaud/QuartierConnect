import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { TotpService } from "../auth/totp.service";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
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

describe("ContractsService", () => {
    let service: ContractsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockContractDoc.signatures = [];
        mockContractDoc.status = ContractStatus.DRAFT;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ContractsService,
                {
                    provide: getModelToken(Contract.name),
                    useValue: mockContractModel,
                },
                { provide: DRIZZLE_TOKEN, useValue: mockDb },
                { provide: TotpService, useValue: mockTotpService },
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

        it("marks contract as PENDING_SIGNATURE when not all have signed", async () => {
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
            expect(contract.status).toBe(ContractStatus.PENDING_SIGNATURE);
        });

        it("marks contract as SIGNED when all signatories have signed", async () => {
            const contract = {
                ...mockContractDoc,
                signatories: ["user-1"],
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
            expect(contract.status).toBe(ContractStatus.SIGNED);
        });
    });
});
