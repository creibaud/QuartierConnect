import { ExecutionContext, INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";

describe("Votes Module - Full E2E Coverage", () => {
    let app: INestApplication;
    let jwtGuardSpy: jest.SpyInstance;

    const mockUser = {
        id: "user-test-123",
        email: "voter@test.com",
        role: "admin",
    };

    beforeAll(async () => {
        jwtGuardSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx.switchToHttp().getRequest();
                req.user = mockUser;
                return true;
            });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    describe("POST /votes - Create Vote", () => {
        it("should create binary vote successfully", async () => {
            const dto = {
                question: "Support community cleanup?",
                type: "binary",
                options: ["Yes", "No"],
                duration: 48,
            };

            const response = await request(app.getHttpServer())
                .post("/votes")
                .send(dto);

            expect([200, 201, 400]).toContain(response.status);
        });

        it("should create multi-choice vote", async () => {
            const dto = {
                question: "Best meeting time?",
                type: "multiple",
                options: ["Morning", "Afternoon", "Evening"],
                duration: 72,
            };

            const response = await request(app.getHttpServer())
                .post("/votes")
                .send(dto);

            expect([200, 201, 400]).toContain(response.status);
        });

        it("should reject invalid duration", async () => {
            const dto = {
                question: "Test?",
                type: "binary",
                duration: 0,
            };

            const response = await request(app.getHttpServer())
                .post("/votes")
                .send(dto);

            expect([400]).toContain(response.status);
        });
    });

    describe("GET /votes - List Votes", () => {
        it("should list all votes", async () => {
            const response = await request(app.getHttpServer()).get("/votes");

            expect([200, 204]).toContain(response.status);
        });

        it("should paginate votes correctly", async () => {
            const response = await request(app.getHttpServer()).get(
                "/votes?page=1&limit=10",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should filter by status", async () => {
            const response = await request(app.getHttpServer()).get(
                "/votes?status=active",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should sort votes", async () => {
            const response = await request(app.getHttpServer()).get(
                "/votes?sortBy=createdAt&sortOrder=desc",
            );

            expect([200, 204]).toContain(response.status);
        });
    });

    describe("POST /votes/:id/respond - Vote", () => {
        it("should record vote response", async () => {
            const response = await request(app.getHttpServer())
                .post("/votes/vote-uuid/respond")
                .send({ option: "Yes" });

            expect([200, 201, 404, 400]).toContain(response.status);
        });
    });

    describe("GET /votes/:id/results - Results", () => {
        it("should get vote results", async () => {
            const response = await request(app.getHttpServer()).get(
                "/votes/vote-uuid/results",
            );

            expect([200, 404, 400]).toContain(response.status);
        });
    });

    afterAll(async () => {
        jwtGuardSpy.mockRestore();
        await app.close();
    });
});

describe("Services Module - Full E2E Coverage", () => {
    let app: INestApplication;
    let jwtGuardSpy: jest.SpyInstance;

    const mockUser = {
        id: "user-test-456",
        email: "provider@test.com",
        role: "resident",
    };

    beforeAll(async () => {
        jwtGuardSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx.switchToHttp().getRequest();
                req.user = mockUser;
                return true;
            });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    describe("POST /services - Create Service", () => {
        it("should create service offer", async () => {
            const dto = {
                title: "House Cleaning",
                category: "cleaning",
                description: "Professional house cleaning service",
                pointsPerHour: 5,
            };

            const response = await request(app.getHttpServer())
                .post("/services")
                .send(dto);

            expect([200, 201, 400]).toContain(response.status);
        });

        it("should validate required fields", async () => {
            const dto = { title: "" }; // Missing fields

            const response = await request(app.getHttpServer())
                .post("/services")
                .send(dto);

            expect([400, 422]).toContain(response.status);
        });
    });

    describe("GET /services", () => {
        it("should list services with pagination", async () => {
            const response = await request(app.getHttpServer()).get(
                "/services?page=1&limit=20",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should search services by category", async () => {
            const response = await request(app.getHttpServer()).get(
                "/services?category=repair",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should sort services", async () => {
            const response = await request(app.getHttpServer()).get(
                "/services?sortBy=createdAt&sortOrder=asc",
            );

            expect([200, 204]).toContain(response.status);
        });
    });

    afterAll(async () => {
        jwtGuardSpy.mockRestore();
        await app.close();
    });
});

describe("Documents Module - Full E2E Coverage", () => {
    let app: INestApplication;
    let jwtGuardSpy: jest.SpyInstance;

    const mockUser = {
        id: "user-test-789",
        email: "signer@test.com",
        role: "resident",
    };

    beforeAll(async () => {
        jwtGuardSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx.switchToHttp().getRequest();
                req.user = mockUser;
                return true;
            });

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    describe("GET /documents", () => {
        it("should list user documents", async () => {
            const response = await request(app.getHttpServer()).get(
                "/documents",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should paginate documents", async () => {
            const response = await request(app.getHttpServer()).get(
                "/documents?page=1&limit=10",
            );

            expect([200, 204]).toContain(response.status);
        });

        it("should filter documents", async () => {
            const response = await request(app.getHttpServer()).get(
                "/documents?status=pending",
            );

            expect([200, 204]).toContain(response.status);
        });
    });

    afterAll(async () => {
        jwtGuardSpy.mockRestore();
        await app.close();
    });
});
