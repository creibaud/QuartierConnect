import type { ArgumentsHost } from "@nestjs/common";
import { HttpException, HttpStatus } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

const makeHost = (url = "/test") => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    const host = {
        switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue({ status }),
            getRequest: jest.fn().mockReturnValue({ url }),
        }),
    } as unknown as ArgumentsHost;

    return { host, json };
};

describe("HttpExceptionFilter", () => {
    let filter: HttpExceptionFilter;

    beforeEach(() => {
        filter = new HttpExceptionFilter();
    });

    it("formats response with string message", () => {
        const exception = new HttpException("Not found", HttpStatus.NOT_FOUND);
        const { host, json } = makeHost();

        filter.catch(exception, host);

        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 404,
                message: "Not found",
                path: "/test",
            }),
        );
    });

    it("formats response with object message containing string", () => {
        const exception = new HttpException(
            { message: "Validation failed" },
            HttpStatus.BAD_REQUEST,
        );
        const { host, json } = makeHost();

        filter.catch(exception, host);

        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 400,
                message: "Validation failed",
            }),
        );
    });

    it("formats response with object message containing array of strings", () => {
        const exception = new HttpException(
            { message: ["field is required", "field must be string"] },
            HttpStatus.BAD_REQUEST,
        );
        const { host, json } = makeHost();

        filter.catch(exception, host);

        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: ["field is required", "field must be string"],
            }),
        );
    });

    it("falls back to 'Unexpected error' for unknown response shape", () => {
        const exception = new HttpException(
            { message: [1, 2, 3] },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
        const { host, json } = makeHost();

        filter.catch(exception, host);

        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Unexpected error" }),
        );
    });
});
