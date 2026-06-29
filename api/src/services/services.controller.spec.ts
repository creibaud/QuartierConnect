import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { SocialService } from "../social/social.service";
import { ServiceResponse } from "./schemas/service-response.schema";
import { Service } from "./schemas/service.schema";
import { ServicesController } from "./services.controller";

const mockService = {
    _id: "svc-id-1",
    title: "Plomberie",
    description: "Repairs",
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
    let responseModel: any;
    let db: any;

    beforeEach(async () => {
        model = {
            find: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockService]),
                }),
                lean: jest.fn().mockResolvedValue([mockService]),
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

        responseModel = {
            find: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
            }),
            updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
        };

        db = {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where: jest.fn().mockResolvedValue([]),
                }),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ServicesController],
            providers: [
                { provide: getModelToken(Service.name), useValue: model },
                {
                    provide: getModelToken(ServiceResponse.name),
                    useValue: responseModel,
                },
                {
                    provide: SocialService,
                    useValue: {
                        syncService: jest.fn().mockResolvedValue(undefined),
                        deleteNode: jest.fn().mockResolvedValue(undefined),
                    },
                },
                { provide: DRIZZLE_TOKEN, useValue: db },
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
                direction: "offer",
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

    it("respond is idempotent and forbids own service", async () => {
        const id1 = "aaaaaaaaaaaaaaaaaaaaaaaa";
        const id2 = "bbbbbbbbbbbbbbbbbbbbbbbb";
        // service owned by someone else → upsert called
        model.findById.mockResolvedValue({ _id: id1, createdBy: "owner" });
        await controller.respond(id1, { user: { sub: "me" } } as any);
        expect(responseModel.updateOne).toHaveBeenCalledWith(
            { serviceId: expect.anything(), responderId: "me" },
            { $setOnInsert: { responderId: "me", serviceId: expect.anything() } },
            { upsert: true },
        );
        // own service → 403
        model.findById.mockResolvedValue({ _id: id2, createdBy: "me" });
        await expect(controller.respond(id2, { user: { sub: "me" } } as any)).rejects.toThrow();
    });

    it("respond throws 404 when service not found", async () => {
        model.findById.mockResolvedValue(null);
        await expect(
            controller.respond("aaaaaaaaaaaaaaaaaaaaaaaa", {
                user: { sub: "me" },
            } as any),
        ).rejects.toThrow(NotFoundException);
    });

    it("unrespond is a no-op when response absent", async () => {
        responseModel.deleteOne.mockResolvedValue({ deletedCount: 0 });
        const result = await controller.unrespond("aaaaaaaaaaaaaaaaaaaaaaaa", {
            user: { sub: "me" },
        } as any);
        expect(result).toEqual({ status: "ok" });
        expect(responseModel.deleteOne).toHaveBeenCalledWith(
            expect.objectContaining({ responderId: "me" }),
        );
    });

    it("GET /services/responded returns services the user has responded to", async () => {
        responseModel.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ serviceId: "s1" }]),
        });
        model.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ _id: "s1", title: "T" }]),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        });

        const result = await controller.findResponded({ user: { sub: "me", role: "resident" } } as any);

        expect(responseModel.find).toHaveBeenCalledWith({ responderId: "me" });
        expect(model.find).toHaveBeenCalledWith({ _id: { $in: ["s1"] } });
        expect(result).toEqual([{ _id: "s1", title: "T" }]);
    });

    it("GET /services/responded returns [] when no responses", async () => {
        responseModel.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
        });

        const result = await controller.findResponded({ user: { sub: "me", role: "resident" } } as any);

        expect(result).toEqual([]);
        expect(model.find).not.toHaveBeenCalled();
    });

    it("GET /services/mine returns own services with responders enriched from Drizzle", async () => {
        const D = new Date("2025-01-01");
        model.find.mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ _id: "s1", title: "Plomberie", createdBy: "me" }]),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
        });
        responseModel.find = jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ serviceId: "s1", responderId: "u2", createdAt: D }]),
        });
        db.select.mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([{ id: "u2", firstName: "Bob", avatarUrl: null }]),
            }),
        });

        const result = await controller.findMine({ user: { sub: "me", role: "resident" } } as any);

        expect(result).toHaveLength(1);
        expect(result[0].responders).toEqual([
            { userId: "u2", firstName: "Bob", avatarUrl: null, createdAt: D },
        ]);
    });
});
