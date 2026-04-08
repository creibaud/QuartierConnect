import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../schemas/user.schema";
import { RolesGuard } from "./roles.guard";

function mockContext(role: string | undefined): ExecutionContext {
    return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
            getRequest: () => ({ user: role ? { role } : undefined }),
        }),
    } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    it("allows access when no roles are required", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);
        expect(guard.canActivate(mockContext("resident"))).toBe(true);
    });

    it("allows access when roles array is empty", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([]);
        expect(guard.canActivate(mockContext("resident"))).toBe(true);
    });

    it("allows access when user has the required role", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([
            UserRole.ADMIN,
        ]);
        expect(guard.canActivate(mockContext("admin"))).toBe(true);
    });

    it("denies access when user does not have the required role", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([
            UserRole.ADMIN,
        ]);
        expect(guard.canActivate(mockContext("resident"))).toBe(false);
    });

    it("denies access when user is undefined", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([
            UserRole.ADMIN,
        ]);
        expect(guard.canActivate(mockContext(undefined))).toBe(false);
    });

    it("allows moderator when both moderator and admin are required", () => {
        jest.spyOn(reflector, "getAllAndOverride").mockReturnValue([
            UserRole.ADMIN,
            UserRole.MODERATOR,
        ]);
        expect(guard.canActivate(mockContext("moderator"))).toBe(true);
    });
});
