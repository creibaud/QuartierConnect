import { getConnectionToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { ObjectId } from "mongodb";
import { DRIZZLE_TOKEN } from "../database/drizzle.module";
import { UsersAvatarController } from "./users-avatar.controller";

const PROFILE = {
    id: "user-1",
    email: "alice@demo.fr",
    role: "resident",
    firstName: "Alice",
    lastName: "Martin",
    avatarUrl: null,
};

const mockConnection = { db: { collection: jest.fn() } };

function makeDb(avatarUrl: string | null = null) {
    const whereResult: any = [{ avatarUrl }];
    whereResult.returning = jest.fn().mockResolvedValue([PROFILE]);
    return {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue(whereResult),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
    };
}

function makeBucket() {
    return {
        openUploadStreamWithId: jest.fn().mockReturnValue({
            end: jest.fn((_buf: unknown, cb: () => void) => cb()),
        }),
        delete: jest.fn().mockResolvedValue(undefined),
        find: jest.fn().mockReturnValue({ toArray: () => Promise.resolve([]) }),
        openDownloadStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
    };
}

async function build(db: any, bucket: any) {
    const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersAvatarController],
        providers: [
            { provide: DRIZZLE_TOKEN, useValue: db },
            { provide: getConnectionToken(), useValue: mockConnection },
        ],
    }).compile();
    const controller = module.get<UsersAvatarController>(UsersAvatarController);
    (controller as unknown as Record<string, unknown>)["bucket"] = bucket;
    return controller;
}

const req = { user: { sub: "user-1" } } as any;
const imageFile = {
    mimetype: "image/png",
    buffer: Buffer.from("img"),
    originalname: "a.png",
} as any;

describe("UsersAvatarController", () => {
    it("upload rejects when no file is provided", async () => {
        const controller = await build(makeDb(), makeBucket());
        await expect(
            controller.upload(req, undefined as any),
        ).rejects.toThrow();
    });

    it("upload rejects a non-image file", async () => {
        const controller = await build(makeDb(), makeBucket());
        await expect(
            controller.upload(req, {
                mimetype: "application/pdf",
                buffer: Buffer.from("x"),
                originalname: "x.pdf",
            } as any),
        ).rejects.toThrow();
    });

    it("upload stores the image and returns the profile", async () => {
        const bucket = makeBucket();
        const controller = await build(makeDb(), bucket);
        const result = await controller.upload(req, imageFile);
        expect(bucket.openUploadStreamWithId).toHaveBeenCalled();
        expect(result).toEqual(PROFILE);
    });

    it("upload deletes the previous avatar when one exists", async () => {
        const bucket = makeBucket();
        const existing = "/users/avatar/" + new ObjectId().toHexString();
        const controller = await build(makeDb(existing), bucket);
        await controller.upload(req, imageFile);
        expect(bucket.delete).toHaveBeenCalled();
    });

    it("remove clears the avatar and returns the profile", async () => {
        const bucket = makeBucket();
        const controller = await build(makeDb(), bucket);
        const result = await controller.remove(req);
        expect(result).toEqual(PROFILE);
    });

    it("serve rejects an invalid file id", async () => {
        const controller = await build(makeDb(), makeBucket());
        await expect(
            controller.serve("not-an-id", { set: jest.fn() } as any),
        ).rejects.toThrow();
    });

    it("serve returns 404 when the file is missing", async () => {
        const controller = await build(makeDb(), makeBucket());
        await expect(
            controller.serve(new ObjectId().toHexString(), {
                set: jest.fn(),
            } as any),
        ).rejects.toThrow();
    });

    it("serve streams the avatar when found", async () => {
        const bucket = makeBucket();
        bucket.find = jest.fn().mockReturnValue({
            toArray: () =>
                Promise.resolve([{ metadata: { contentType: "image/png" } }]),
        });
        const controller = await build(makeDb(), bucket);
        const res = { set: jest.fn() } as any;
        await controller.serve(new ObjectId().toHexString(), res);
        expect(res.set).toHaveBeenCalled();
        expect(bucket.openDownloadStream).toHaveBeenCalled();
    });
});
