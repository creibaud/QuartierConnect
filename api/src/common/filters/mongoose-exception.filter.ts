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

/**
 * Translates raw Mongoose data errors into a clean HTTP 400 response.
 *
 * A malformed route parameter (e.g. an id that is not a valid ObjectId) makes
 * Mongoose throw a `CastError`, which would otherwise bubble up as a generic
 * 500. Schema `ValidationError`s are mapped the same way. Every other exception
 * — including `HttpException` (401/403/404/409, ...) — is left untouched so the
 * default Nest handler keeps its existing behaviour.
 */
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
        return `Invalid value provided for parameter '${exception.path}'`;
    }
}
