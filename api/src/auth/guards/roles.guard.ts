import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../schemas/user.schema";

export const ROLES_KEY = "roles";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles?.length) return true;

        const { user } = context
            .switchToHttp()
            .getRequest<{ user?: { role: UserRole } }>();
        return requiredRoles.includes(user?.role as UserRole);
    }
}
