import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ContractsController } from "./contracts.controller";
import { ContractsService } from "./contracts.service";

const mockContract = {
    _id: "contract-1",
    title: "Test Contract",
    content: "Content here",
    createdBy: "user-1",
    signatories: ["user-1", "user-2"],
    status: "draft",
    contentHash: "abc123hash",
    signedAt: null,
    signatures: [],
};

const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    sign: jest.fn(),
};

describe("ContractsController", () => {
    let controller: ContractsController;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ContractsController],
            providers: [{ provide: ContractsService, useValue: mockService }],
        }).compile();

        controller = module.get<ContractsController>(ContractsController);
    });

    const authReq = { user: { sub: "user-1" } };

    it("findAll returns user contracts", async () => {
        mockService.findAll.mockResolvedValue([mockContract]);
        const result = await controller.findAll(authReq as any);
        expect(result).toHaveLength(1);
        expect(mockService.findAll).toHaveBeenCalledWith("user-1");
    });

    it("findOne returns contract for valid access", async () => {
        mockService.findOne.mockResolvedValue(mockContract);
        const result = await controller.findOne("contract-1", authReq as any);
        expect(result).toEqual(mockContract);
    });

    it("findOne throws 404 for missing contract", async () => {
        mockService.findOne.mockRejectedValue(new NotFoundException());
        await expect(
            controller.findOne("missing-id", authReq as any),
        ).rejects.toThrow(NotFoundException);
    });

    it("create returns new contract with hash", async () => {
        mockService.create.mockResolvedValue(mockContract);
        const dto = { title: "Test", content: "Body", signatories: ["user-2"] };
        const result = await controller.create(dto, authReq as any);
        expect(result.contentHash).toBe("abc123hash");
    });

    it("sign returns updated contract", async () => {
        const signed = { ...mockContract, status: "fully_signed" };
        mockService.sign.mockResolvedValue(signed);
        const result = await controller.sign(
            "contract-1",
            { totpCode: "123456" },
            authReq as any,
        );
        expect(result.status).toBe("fully_signed");
    });

    it("sign throws on invalid TOTP", async () => {
        mockService.sign.mockRejectedValue(
            new BadRequestException("Invalid TOTP code"),
        );
        await expect(
            controller.sign(
                "contract-1",
                { totpCode: "000000" },
                authReq as any,
            ),
        ).rejects.toThrow(BadRequestException);
    });

    it("sign throws when not a signatory", async () => {
        mockService.sign.mockRejectedValue(new ForbiddenException());
        await expect(
            controller.sign("contract-1", { totpCode: "123456" }, {
                user: { sub: "other-user" },
            } as any),
        ).rejects.toThrow(ForbiddenException);
    });
});
