import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        const message = this.getExceptionMessage(exceptionResponse);

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
        });
    }

    private getExceptionMessage(exceptionResponse: string | object) {
        if (typeof exceptionResponse === "string") {
            return exceptionResponse;
        }

        if (
            typeof exceptionResponse === "object" &&
            exceptionResponse !== null &&
            "message" in exceptionResponse
        ) {
            const message = exceptionResponse.message;

            if (typeof message === "string") {
                return message;
            }

            if (
                Array.isArray(message) &&
                message.every((item) => typeof item === "string")
            ) {
                return message;
            }
        }

        return "Unexpected error";
    }
}
