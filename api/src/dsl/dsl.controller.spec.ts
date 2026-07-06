import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DslController } from "./dsl.controller";
import { DslService } from "./dsl.service";

const mockService = {
    execute: jest.fn(),
};

describe("DslController", () => {
    let controller: DslController;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DslController],
            providers: [{ provide: DslService, useValue: mockService }],
        }).compile();

        controller = module.get<DslController>(DslController);
    });

    const moderatorReq = {
        user: { sub: "mod-1", role: "moderator", neighborhoodId: "nbh-1" },
    };

    it("executes FIND query with the requester and returns AST", async () => {
        const ast = {
            type: "find",
            collection: "incidents",
            filter: { status: "open" },
            limit: null,
        };
        mockService.execute.mockResolvedValue(ast);
        const result = await controller.execute(
            { query: 'FIND incidents WHERE status = "open"' },
            moderatorReq,
        );
        expect(result).toEqual(ast);
        expect(mockService.execute).toHaveBeenCalledWith(
            'FIND incidents WHERE status = "open"',
            moderatorReq.user,
        );
    });

    it("executes COUNT query", async () => {
        const ast = {
            type: "count",
            collection: "incidents",
            filter: {},
            limit: null,
        };
        mockService.execute.mockResolvedValue(ast);
        const result = (await controller.execute(
            { query: "COUNT incidents" },
            moderatorReq,
        )) as typeof ast;
        expect(result.type).toBe("count");
    });

    it("throws 400 on DSL syntax error", async () => {
        mockService.execute.mockRejectedValue(
            new BadRequestException("Syntax error"),
        );
        await expect(
            controller.execute({ query: "FIND" }, moderatorReq),
        ).rejects.toThrow(BadRequestException);
    });

    it("throws 400 on unknown collection", async () => {
        mockService.execute.mockRejectedValue(
            new BadRequestException("Unknown collection 'secret_table'"),
        );
        await expect(
            controller.execute({ query: "FIND secret_table" }, moderatorReq),
        ).rejects.toThrow(BadRequestException);
    });
});
