import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { SocialService } from "../social/social.service";
import { EventsController } from "./events.controller";
import { Event } from "./schemas/event.schema";

const mockEvent = {
    _id: "evt-id-1",
    title: "Vide-grenier",
    description: "Vente de quartier",
    category: "community",
    date: new Date("2026-06-15"),
    createdBy: "user-uuid-1",
    interestedUserIds: [],
};

const authReq = (sub = "user-uuid-1") => ({ user: { sub, role: "resident" } });

describe("EventsController", () => {
    let controller: EventsController;
    let model: any;

    beforeEach(async () => {
        model = {
            find: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue([mockEvent]),
                }),
            }),
            findById: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockEvent),
            }),
            create: jest.fn().mockResolvedValue(mockEvent),
            findByIdAndUpdate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...mockEvent,
                    interestedUserIds: ["user-uuid-1"],
                }),
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                { provide: getModelToken(Event.name), useValue: model },
                {
                    provide: SocialService,
                    useValue: {
                        syncEvent: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        controller = module.get<EventsController>(EventsController);
    });

    it("GET /events returns list", async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
    });

    it("GET /events?category=community filters by category", async () => {
        await controller.findAll("community");
        expect(model.find).toHaveBeenCalledWith(
            expect.objectContaining({ category: "community" }),
        );
    });

    it("GET /events?date=2026-06-15 filters by date range", async () => {
        await controller.findAll(undefined, "2026-06-15");
        expect(model.find).toHaveBeenCalledWith(
            expect.objectContaining({
                date: expect.objectContaining({ $gte: expect.any(Date) }),
            }),
        );
    });

    it("GET /events/:id returns one event", async () => {
        const result = await controller.findOne("evt-id-1");
        expect(result).toEqual(mockEvent);
    });

    it("GET /events/:id throws 404 when not found", async () => {
        model.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(controller.findOne("bad-id")).rejects.toThrow(
            NotFoundException,
        );
    });

    it("POST /events creates event with createdBy from JWT", async () => {
        await controller.create(
            {
                title: "Fête",
                description: "Desc",
                category: "community",
                date: "2026-06-15",
            },
            authReq() as any,
        );
        expect(model.create).toHaveBeenCalledWith(
            expect.objectContaining({ createdBy: "user-uuid-1" }),
        );
    });

    it("POST /events/:id/interest marks interest (idempotent via $addToSet)", async () => {
        const result = await controller.markInterest(
            "evt-id-1",
            authReq() as any,
        );
        expect(result).toEqual({ interested: 1 });
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $addToSet: { interestedUserIds: "user-uuid-1" } },
            { new: true },
        );
    });

    it("POST /events/:id/interest throws 404 when event not found", async () => {
        model.findByIdAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(
            controller.markInterest("bad-id", authReq() as any),
        ).rejects.toThrow(NotFoundException);
    });
});
