import { ArgumentsHost } from "@nestjs/common";
import { Error as MongooseError } from "mongoose";
import { MongooseExceptionFilter } from "./mongoose-exception.filter";

describe("MongooseExceptionFilter", () => {
    let filter: MongooseExceptionFilter;
    let status: jest.Mock;
    let json: jest.Mock;
    let host: ArgumentsHost;

    beforeEach(() => {
        filter = new MongooseExceptionFilter();
        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        host = {
            switchToHttp: () => ({ getResponse: () => ({ status }) }),
        } as unknown as ArgumentsHost;
    });

    it("maps a Mongoose CastError to a 400 Bad Request", () => {
        const castError = new MongooseError.CastError(
            "ObjectId",
            "invalid-id-123",
            "_id",
        );

        filter.catch(castError, host);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            statusCode: 400,
            error: "Bad Request",
            message: "Invalid value provided for the identifier",
        });
    });

    it("maps a Mongoose ValidationError to a 400 with per-field messages", () => {
        const validationError = new MongooseError.ValidationError();
        validationError.addError(
            "name",
            new MongooseError.ValidatorError({
                message: "name is required",
                path: "name",
            }),
        );

        filter.catch(validationError, host);

        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({
            statusCode: 400,
            error: "Bad Request",
            message: ["name is required"],
        });
    });
});
