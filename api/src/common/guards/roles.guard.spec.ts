import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

const makeContext = (
    role: string | undefined,
    requiredRoles: string[] | undefined,
) => {
    const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const context = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({
                user: role ? { role } : undefined,
            }),
        }),
    } as unknown as ExecutionContext;

    return { guard, context };
};

describe("RolesGuard", () => {
    it("allows access when no roles are required", () => {
        const { guard, context } = makeContext(undefined, undefined);
        expect(guard.canActivate(context)).toBe(true);
    });

    it("allows access when user has required role", () => {
        const { guard, context } = makeContext("admin", [
            "admin",
            "super_admin",
        ]);
        expect(guard.canActivate(context)).toBe(true);
    });

    it("throws ForbiddenException when user has wrong role", () => {
        const { guard, context } = makeContext("client", ["admin"]);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("throws ForbiddenException when user is not authenticated", () => {
        const { guard, context } = makeContext(undefined, ["admin"]);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
