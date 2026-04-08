import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { SocialService } from "../social/social.service";
import { Service } from "./schemas/service.schema";
import { ServicesController } from "./services.controller";

const mockService = {
    _id: "svc-id-1",
    title: "Plomberie",
    description: "Réparations",
    category: "home",
    type: "paid",
    createdBy: "user-uuid-1",
};

const authReq = (role = "resident", sub = "user-uuid-1") => ({
    user: { sub, role },
});

describe("ServicesController", () => {
    let controller: ServicesController;
    let model: any;

    beforeEach(async () => {
        model = {
            find: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockService]),
                }),
            }),
            findById: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockService),
            }),
            create: jest.fn().mockResolvedValue(mockService),
            findByIdAndUpdate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockService),
            }),
            findByIdAndDelete: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockService),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServicesController],
            providers: [
                { provide: getModelToken(Service.name), useValue: model },
                {
                    provide: SocialService,
                    useValue: {
                        syncService: jest.fn().mockResolvedValue(undefined),
                        deleteNode: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        controller = module.get<ServicesController>(ServicesController);
    });

    it("GET /services returns all (no filter)", async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
    });

    it("GET /services?category=home filters by category", async () => {
        await controller.findAll("home");
        expect(model.find).toHaveBeenCalledWith({ category: "home" });
    });

    it("GET /services?type=free filters by type", async () => {
        await controller.findAll(undefined, "free");
        expect(model.find).toHaveBeenCalledWith({ type: "free" });
    });

    it("GET /services with unknown category returns empty array (no 400)", async () => {
        model.find.mockReturnValue({
            skip: jest.fn().mockReturnThis(),
            limit: jest
                .fn()
                .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        });
        const result = await controller.findAll("invalid-category");
        expect(result).toHaveLength(0);
    });

    it("GET /services?category=home&type=free filters by both", async () => {
        await controller.findAll("home", "free");
        expect(model.find).toHaveBeenCalledWith({
            category: "home",
            type: "free",
        });
    });

    it("GET /services/:id throws 404 when not found", async () => {
        model.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(controller.findOne("bad-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("POST /services sets createdBy from JWT", async () => {
        await controller.create(
            {
                title: "Test",
                description: "Desc",
                category: "home",
                type: "free",
            },
            authReq() as any,
        );
        expect(model.create).toHaveBeenCalledWith(
            expect.objectContaining({ createdBy: "user-uuid-1" }),
        );
    });

    it("PATCH /services/:id allows owner to update", async () => {
        const result = await controller.update(
            "svc-id-1",
            { title: "Updated" },
            authReq() as any,
        );
        expect(result).toEqual(mockService);
    });

    it("PATCH /services/:id throws 403 if not owner and not admin", async () => {
        await expect(
            controller.update(
                "svc-id-1",
                { title: "X" },
                authReq("resident", "other-user") as any,
            ),
        ).rejects.toThrow(ForbiddenException);
    });

    it("PATCH /services/:id allows admin to update any service", async () => {
        const result = await controller.update(
            "svc-id-1",
            { title: "X" },
            authReq("admin", "other-user") as any,
        );
        expect(result).toEqual(mockService);
    });

    it("DELETE /services/:id removes the service", async () => {
        const result = await controller.remove("svc-id-1");
        expect(result).toEqual({ success: true });
    });
});
