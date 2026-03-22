import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "src/common/decorators/roles.decorator";
import { User } from "src/database/drizzle/schema";

type RequestWithUser = {
    user?: User;
};

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredRoles) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const userRole = request.user?.role;

        if (!userRole || !requiredRoles.includes(userRole)) {
            throw new ForbiddenException(
                "You do not have permission to access this resource",
            );
        }
        return true;
    }
}
