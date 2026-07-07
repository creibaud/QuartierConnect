import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { Error as MongooseError } from "mongoose";

type CaughtMongooseError =
    | MongooseError.CastError
    | MongooseError.ValidationError;

// Maps Mongoose CastError/ValidationError to HTTP 400. Other exceptions
// (including HttpException) pass through to the default Nest handler.
@Catch(MongooseError.CastError, MongooseError.ValidationError)
export class MongooseExceptionFilter implements ExceptionFilter {
    catch(exception: CaughtMongooseError, host: ArgumentsHost): void {
        const response = host.switchToHttp().getResponse<Response>();
        const statusCode = HttpStatus.BAD_REQUEST;

        response.status(statusCode).json({
            statusCode,
            error: "Bad Request",
            message: this.buildMessage(exception),
        });
    }

    private buildMessage(exception: CaughtMongooseError): string | string[] {
        if (exception instanceof MongooseError.ValidationError) {
            return Object.values(exception.errors).map(
                (error) => error.message,
            );
        }
        // Never surface the raw `_id` field name to callers.
        const field = exception.path === "_id" ? "identifier" : exception.path;
        return `Invalid value provided for the ${field}`;
    }
}
