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

    it("executes FIND query and returns AST", async () => {
        const ast = {
            type: "find",
            collection: "incidents",
            filter: { status: "open" },
            limit: null,
        };
        mockService.execute.mockResolvedValue(ast);
        const result = await controller.execute({
            query: 'FIND incidents WHERE status = "open"',
        });
        expect(result).toEqual(ast);
        expect(mockService.execute).toHaveBeenCalledWith(
            'FIND incidents WHERE status = "open"',
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
        const result = (await controller.execute({
            query: "COUNT incidents",
        })) as typeof ast;
        expect(result.type).toBe("count");
    });

    it("throws 400 on DSL syntax error", async () => {
        mockService.execute.mockRejectedValue(
            new BadRequestException("Syntax error"),
        );
        await expect(controller.execute({ query: "FIND" })).rejects.toThrow(
            BadRequestException,
        );
    });

    it("throws 400 on unknown collection", async () => {
        mockService.execute.mockRejectedValue(
            new BadRequestException("Unknown collection 'secret_table'"),
        );
        await expect(
            controller.execute({ query: "FIND secret_table" }),
        ).rejects.toThrow(BadRequestException);
    });
});
