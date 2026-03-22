import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "src/database/drizzle/schema";

type RequestWithUser = {
    user?: User;
};

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        return request.user;
    },
);
