import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { GeocodingService } from "../geocoding/geocoding.service";
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
    neighborhoodId: "n1",
    interestedUserIds: [],
};

const authReq = (
    sub = "user-uuid-1",
    role = "resident",
    neighborhoodId: string | null = "n1",
) => ({ user: { sub, role, neighborhoodId } });

// Minimal Response stub: findAll only touches setHeader for the count headers.
const mockRes = () => ({ setHeader: jest.fn() }) as any;

// Thin wrapper so the tests keep their focus on category/date/req without
// repeating the search/sort/order/pagination positional arguments.
function listEvents(
    controller: EventsController,
    opts: { category?: string; date?: string; req: unknown },
) {
    return controller.findAll(
        mockRes(),
        opts.category,
        opts.date,
        undefined,
        undefined,
        undefined,
        "1",
        "20",
        opts.req as any,
    );
}

describe("EventsController", () => {
    let controller: EventsController;
    let model: any;
    let geocoding: any;
    let socialService: any;

    beforeEach(async () => {
        model = {
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnThis(),
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
            countDocuments: jest.fn().mockResolvedValue(1),
        };

        socialService = {
            syncEvent: jest.fn().mockResolvedValue(undefined),
            recordEventInterest: jest.fn().mockResolvedValue({ success: true }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                { provide: getModelToken(Event.name), useValue: model },
                { provide: SocialService, useValue: socialService },
                {
                    provide: GeocodingService,
                    useValue: { geocode: jest.fn() },
                },
            ],
        }).compile();

        controller = module.get<EventsController>(EventsController);
        geocoding = module.get(GeocodingService);
    });

    it("GET /events returns list scoped to the caller's neighborhood", async () => {
        const result = await listEvents(controller, { req: authReq() });
        expect(result).toHaveLength(1);
        expect(model.find).toHaveBeenCalledWith({ neighborhoodId: "n1" });
    });

    it("GET /events?category=community filters by category", async () => {
        await listEvents(controller, {
            category: "community",
            req: authReq(),
        });
        expect(model.find).toHaveBeenCalledWith(
            expect.objectContaining({
                neighborhoodId: "n1",
                category: "community",
            }),
        );
    });

    it("GET /events?date=2026-06-15 filters by date range", async () => {
        await listEvents(controller, { date: "2026-06-15", req: authReq() });
        expect(model.find).toHaveBeenCalledWith(
            expect.objectContaining({
                date: expect.objectContaining({ $gte: expect.any(Date) }),
            }),
        );
    });

    it("GET /events returns [] when the caller has no neighborhood", async () => {
        const result = await listEvents(controller, {
            req: authReq("user-uuid-1", "resident", null),
        });
        expect(result).toEqual([]);
        expect(model.find).not.toHaveBeenCalled();
    });

    it("GET /events lets an admin list across all neighborhoods", async () => {
        await listEvents(controller, {
            req: authReq("admin1", "admin", null),
        });
        const calledFilter = model.find.mock.calls[0][0];
        expect(calledFilter).not.toHaveProperty("neighborhoodId");
    });

    it("GET /events/:id returns one event", async () => {
        const result = await controller.findOne("evt-id-1", authReq() as any);
        expect(result).toEqual(mockEvent);
    });

    it("GET /events/:id throws 403 for an event outside the caller's neighborhood", async () => {
        model.findById.mockReturnValue({
            exec: jest
                .fn()
                .mockResolvedValue({ ...mockEvent, neighborhoodId: "n2" }),
        });
        await expect(
            controller.findOne("evt-id-1", authReq() as any),
        ).rejects.toThrow(ForbiddenException);
    });

    it("GET /events/:id lets an admin read any neighborhood's event", async () => {
        model.findById.mockReturnValue({
            exec: jest
                .fn()
                .mockResolvedValue({ ...mockEvent, neighborhoodId: "n2" }),
        });
        const result = await controller.findOne(
            "evt-id-1",
            authReq("admin1", "admin", null) as any,
        );
        expect(result).toMatchObject({ neighborhoodId: "n2" });
    });

    it("GET /events/:id throws 404 when not found", async () => {
        model.findById.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(
            controller.findOne("bad-id", authReq() as any),
        ).rejects.toThrow(NotFoundException);
    });

    it("POST /events creates event with createdBy from JWT", async () => {
        await controller.create(
            {
                title: "Party",
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

    it("POST /events forces the caller's neighborhood for non-admins", async () => {
        await controller.create(
            {
                title: "Party",
                description: "Desc",
                category: "community",
                date: "2026-06-15",
                neighborhoodId: "n2",
            },
            authReq() as any,
        );
        expect(model.create).toHaveBeenCalledWith(
            expect.objectContaining({ neighborhoodId: "n1" }),
        );
    });

    it("POST /events lets an admin target another neighborhood", async () => {
        await controller.create(
            {
                title: "Party",
                description: "Desc",
                category: "community",
                date: "2026-06-15",
                neighborhoodId: "n2",
            },
            authReq("admin1", "admin", "n1") as any,
        );
        expect(model.create).toHaveBeenCalledWith(
            expect.objectContaining({ neighborhoodId: "n2" }),
        );
    });

    it("PATCH /events/:id ignores a neighborhood change from a non-admin owner", async () => {
        await controller.update(
            "evt-id-1",
            { neighborhoodId: "n2" } as any,
            authReq() as any,
        );
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $set: {} },
            { new: true, runValidators: true },
        );
    });

    it("PATCH /events/:id lets an admin change the neighborhood", async () => {
        await controller.update(
            "evt-id-1",
            { neighborhoodId: "n2" } as any,
            authReq("admin1", "admin", "n1") as any,
        );
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $set: { neighborhoodId: "n2" } },
            { new: true, runValidators: true },
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

    it("POST /events/:id/interest records INTERESTED_IN in Neo4j by default", async () => {
        await controller.markInterest("evt-id-1", authReq() as any);
        expect(socialService.recordEventInterest).toHaveBeenCalledWith(
            "user-uuid-1",
            "evt-id-1",
            { interested: true, source: "swipe" },
        );
    });

    it("POST /events/:id/interest with source participate records ATTENDING", async () => {
        await controller.markInterest("evt-id-1", authReq() as any, {
            source: "participate",
        });
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $addToSet: { interestedUserIds: "user-uuid-1" } },
            { new: true },
        );
        expect(socialService.recordEventInterest).toHaveBeenCalledWith(
            "user-uuid-1",
            "evt-id-1",
            { interested: true, source: "participate" },
        );
    });

    it("POST /events/:id/interest with interested=false removes the user from the list", async () => {
        model.findByIdAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue({
                ...mockEvent,
                interestedUserIds: [],
            }),
        });
        const result = await controller.markInterest(
            "evt-id-1",
            authReq() as any,
            { interested: false },
        );
        expect(result).toEqual({ interested: 0 });
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $pull: { interestedUserIds: "user-uuid-1" } },
            { new: true },
        );
        expect(socialService.recordEventInterest).toHaveBeenCalledWith(
            "user-uuid-1",
            "evt-id-1",
            { interested: false, source: "swipe" },
        );
    });

    it("POST /events/:id/interest throws 404 when event not found", async () => {
        model.findByIdAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
        });
        await expect(
            controller.markInterest("bad-id", authReq() as any),
        ).rejects.toThrow(NotFoundException);
        expect(socialService.recordEventInterest).not.toHaveBeenCalled();
    });

    it("POST /events geocodes the address into location", async () => {
        geocoding.geocode.mockResolvedValue({
            lat: 48.85,
            lng: 2.35,
            displayName: "1 rue X, Paris",
        });
        model.create.mockImplementation((doc: any) =>
            Promise.resolve({ ...mockEvent, ...doc, _id: "evt-id-1" }),
        );
        await controller.create(
            {
                title: "Party",
                description: "Desc",
                category: "community",
                date: "2026-06-15",
                address: "1 rue X",
            } as any,
            authReq() as any,
        );
        expect(geocoding.geocode).toHaveBeenCalledWith("1 rue X");
        const created = model.create.mock.calls[0][0];
        expect(created.location).toEqual({
            type: "Point",
            coordinates: [2.35, 48.85],
        });
    });

    it("POST /events leaves location undefined when geocode returns null", async () => {
        geocoding.geocode.mockResolvedValue(null);
        model.create.mockImplementation((doc: any) =>
            Promise.resolve({ ...mockEvent, ...doc }),
        );
        await controller.create(
            {
                title: "Party",
                description: "Desc",
                category: "community",
                date: "2026-06-15",
                address: "bad address",
            } as any,
            authReq() as any,
        );
        expect(model.create.mock.calls[0][0].location).toBeUndefined();
    });

    it("PATCH /events/:id geocodes a changed address into changes.location", async () => {
        geocoding.geocode.mockResolvedValue({
            lat: 48.85,
            lng: 2.35,
            displayName: "1 rue X, Paris",
        });
        await controller.update(
            "evt-id-1",
            { address: "1 rue X" } as any,
            authReq() as any,
        );
        expect(geocoding.geocode).toHaveBeenCalledWith("1 rue X");
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            {
                $set: {
                    address: "1 rue X",
                    location: { type: "Point", coordinates: [2.35, 48.85] },
                },
            },
            { new: true, runValidators: true },
        );
    });

    it("PATCH /events/:id sets location to null when geocoding the new address fails", async () => {
        geocoding.geocode.mockResolvedValue(null);
        await controller.update(
            "evt-id-1",
            { address: "adresse introuvable" } as any,
            authReq() as any,
        );
        expect(geocoding.geocode).toHaveBeenCalledWith("adresse introuvable");
        expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
            "evt-id-1",
            { $set: { address: "adresse introuvable", location: null } },
            { new: true, runValidators: true },
        );
    });

    it("PATCH /events/:id re-syncs the updated event to Neo4j", async () => {
        const updatedDate = new Date("2026-07-01");
        model.findByIdAndUpdate.mockReturnValue({
            exec: jest.fn().mockResolvedValue({
                ...mockEvent,
                title: "Brocante estivale",
                date: updatedDate,
            }),
        });
        await controller.update(
            "evt-id-1",
            { title: "Brocante estivale" } as any,
            authReq() as any,
        );
        expect(socialService.syncEvent).toHaveBeenCalledWith(
            "evt-id-1",
            "Brocante estivale",
            updatedDate,
            "n1",
            "user-uuid-1",
        );
    });
});
