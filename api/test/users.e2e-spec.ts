import {
    ForbiddenException,
    INestApplication,
    NotFoundException,
    VersioningType,
} from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import * as packageJson from "../package.json";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/common/guards/jwt-auth.guard";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { UserService } from "../src/modules/users/user.service";

describe("UsersController (e2e)", () => {
    let app: INestApplication<App>;
    let jwtGuardSpy: jest.SpyInstance;

    const majorVersion = packageJson.version.split(".")[0];
    const BASE = `/v${majorVersion}/users`;

    const userServiceMock = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        getMyProfile: jest.fn(),
        updateMyProfile: jest.fn(),
        updateRole: jest.fn(),
        updateStatus: jest.fn(),
    };

    const fakeUser = {
        id: "6fce8b71-2d1a-4d4a-9c12-44d4624e8f81",
        email: "admin@quartierconnect.fr",
        role: "admin",
        isActive: true,
    };

    beforeAll(async () => {
        jwtGuardSpy = jest
            .spyOn(JwtAuthGuard.prototype, "canActivate")
            .mockImplementation((ctx: ExecutionContext) => {
                const req = ctx
                    .switchToHttp()
                    .getRequest<{ user: typeof fakeUser }>();
                req.user = fakeUser;
                return true;
            });

        jest.spyOn(RolesGuard.prototype, "canActivate").mockReturnValue(true);

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider("DRIZZLE")
            .useValue({ execute: jest.fn().mockResolvedValue([{ result: 1 }]) })
            .overrideProvider("MONGODB")
            .useValue({ command: jest.fn().mockResolvedValue({}) })
            .overrideProvider("NEO4J")
            .useValue({ verifyConnectivity: jest.fn().mockResolvedValue(undefined) })
            .overrideProvider(UserService)
            .useValue(userServiceMock)
            .compile();

        app = moduleFixture.createNestApplication();
        app.enableVersioning({
            type: VersioningType.URI,
            defaultVersion: majorVersion,
        });
        await app.init();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jwtGuardSpy.mockImplementation((ctx: ExecutionContext) => {
            const req = ctx
                .switchToHttp()
                .getRequest<{ user: typeof fakeUser }>();
            req.user = fakeUser;
            return true;
        });
    });

    afterAll(async () => {
        await app.close();
    });

    it(`GET ${BASE} returns 200 with paginated list`, async () => {
        const expected = {
            data: [fakeUser],
            meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        };
        userServiceMock.findAll.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .get(BASE)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });
    });

    it(`GET ${BASE}/me/profile returns 200`, async () => {
        userServiceMock.getMyProfile.mockResolvedValue(fakeUser);

        await request(app.getHttpServer())
            .get(`${BASE}/me/profile`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(fakeUser);
            });
    });

    it(`PATCH ${BASE}/me/profile returns 200`, async () => {
        const dto = { firstName: "Jane" };
        const expected = { ...fakeUser, ...dto };
        userServiceMock.updateMyProfile.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .patch(`${BASE}/me/profile`)
            .send(dto)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });
    });

    it(`GET ${BASE}/:id returns 200`, async () => {
        userServiceMock.findOne.mockResolvedValue(fakeUser);

        await request(app.getHttpServer())
            .get(`${BASE}/${fakeUser.id}`)
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(fakeUser);
            });
    });

    it(`GET ${BASE}/:id returns 404 when not found`, async () => {
        userServiceMock.findOne.mockRejectedValue(
            new NotFoundException("User not found"),
        );

        await request(app.getHttpServer())
            .get(`${BASE}/${fakeUser.id}`)
            .expect(404);
    });

    it(`PATCH ${BASE}/:id/role returns 403 on admin`, async () => {
        userServiceMock.updateRole.mockRejectedValue(
            new ForbiddenException("Cannot change an admin's role"),
        );

        await request(app.getHttpServer())
            .patch(`${BASE}/${fakeUser.id}/role`)
            .send({ role: "moderator" })
            .expect(403);
    });

    it(`PATCH ${BASE}/:id/status returns 200`, async () => {
        const expected = { ...fakeUser, isActive: false };
        userServiceMock.updateStatus.mockResolvedValue(expected);

        await request(app.getHttpServer())
            .patch(`${BASE}/${fakeUser.id}/status`)
            .send({ isActive: false })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toEqual(expected);
            });
    });
});
