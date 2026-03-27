import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { OpenAPIObject } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import type { NextFunction, Request, Response } from "express";
import { HttpExceptionFilter } from "src/common/filters/http-exception.filter";
import { JsonLogger } from "src/common/logger/json.logger";
import * as packageJson from "../package.json";
import { AppModule } from "./app.module";

type OpenApiSchema = Record<string, unknown>;

function inferSchemaFromExample(value: unknown): OpenApiSchema {
    if (value === null) {
        return { nullable: true };
    }

    if (Array.isArray(value)) {
        const firstDefined = (value as unknown[]).find(
            (item: unknown) => item !== undefined,
        );
        return {
            type: "array",
            items:
                firstDefined === undefined
                    ? { type: "string" }
                    : inferSchemaFromExample(firstDefined),
        };
    }

    switch (typeof value) {
        case "string":
            return { type: "string" };
        case "number":
            return Number.isInteger(value)
                ? { type: "integer" }
                : { type: "number" };
        case "boolean":
            return { type: "boolean" };
        case "object": {
            const entries = Object.entries(value as Record<string, unknown>);
            const properties: Record<string, OpenApiSchema> = {};
            const required: string[] = [];

            for (const [key, entryValue] of entries) {
                properties[key] = inferSchemaFromExample(entryValue);
                if (entryValue !== undefined) {
                    required.push(key);
                }
            }

            return {
                type: "object",
                properties,
                ...(required.length > 0 ? { required } : {}),
            };
        }
        default:
            return { type: "string" };
    }
}

function hasStructuralSchema(schema: OpenApiSchema): boolean {
    return Boolean(
        schema.type ||
        schema.$ref ||
        schema.properties ||
        schema.items ||
        schema.oneOf ||
        schema.anyOf ||
        schema.allOf,
    );
}

function enrichResponseSchemasFromExamples(document: OpenAPIObject): void {
    for (const pathItem of Object.values(document.paths)) {
        if (!pathItem) {
            continue;
        }

        for (const operation of Object.values(pathItem)) {
            if (!operation || typeof operation !== "object") {
                continue;
            }

            const op = operation as Record<string, unknown>;
            const responses = op.responses as
                | Record<string, Record<string, unknown>>
                | undefined;

            if (!responses) {
                continue;
            }

            for (const response of Object.values(responses)) {
                if (!response || typeof response !== "object") {
                    continue;
                }

                const content = response.content as
                    | Record<string, Record<string, unknown>>
                    | undefined;
                const jsonContent = content?.["application/json"];

                if (!jsonContent) {
                    continue;
                }

                const existingSchema = jsonContent.schema as
                    | OpenApiSchema
                    | undefined;

                if (existingSchema && hasStructuralSchema(existingSchema)) {
                    continue;
                }

                const schemaExample = existingSchema?.example;

                if (schemaExample !== undefined) {
                    jsonContent.schema = {
                        ...inferSchemaFromExample(schemaExample),
                        example: schemaExample,
                    };
                    continue;
                }

                if (jsonContent.example !== undefined) {
                    jsonContent.schema = inferSchemaFromExample(
                        jsonContent.example,
                    );
                    continue;
                }

                const examples = jsonContent.examples as
                    | Record<string, { value?: unknown }>
                    | undefined;
                const firstExample = examples
                    ? Object.values(examples).find(
                          (item) => item && item.value !== undefined,
                      )
                    : undefined;

                if (firstExample?.value !== undefined) {
                    jsonContent.schema = inferSchemaFromExample(
                        firstExample.value,
                    );
                    continue;
                }

                jsonContent.schema = {
                    type: "object",
                    additionalProperties: true,
                };
            }
        }
    }
}

async function bootstrap() {
    const isProduction = process.env.NODE_ENV === "production";
    const app = await NestFactory.create(AppModule, {
        logger: isProduction ? new JsonLogger() : undefined,
    });
    const config = app.get(ConfigService);
    const majorVersion = packageJson.version.split(".")[0];

    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: majorVersion,
    });

    app.use(
        (
            req: Request & { cookies?: Record<string, string> },
            _res: Response,
            next: NextFunction,
        ) => {
            const rawCookieHeader = req.headers.cookie;
            const parsed: Record<string, string> = {};

            const rawCookie = Array.isArray(rawCookieHeader)
                ? rawCookieHeader.join(";")
                : rawCookieHeader;

            if (typeof rawCookie === "string") {
                for (const pair of rawCookie.split(";")) {
                    const [name, ...rest] = pair.trim().split("=");
                    if (!name || rest.length === 0) {
                        continue;
                    }
                    parsed[name] = decodeURIComponent(rest.join("="));
                }
            }

            req.cookies = parsed;
            next();
        },
    );

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.useGlobalFilters(new HttpExceptionFilter());

    const swaggerConfig = new DocumentBuilder()
        .setTitle("QuartierConnect API")
        .setDescription("QuartierConnect API documentation")
        .setVersion(packageJson.version)
        .addBearerAuth(
            {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
            "access-token",
        )
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    enrichResponseSchemasFromExamples(document);

    app.use(
        "/docs",
        apiReference({
            content: document,
            theme: "kepler",
            title: "QuartierConnect API Reference",
        }),
    );

    app.enableCors({
        origin: [
            "https://localhost",
            "https://client.localhost",
            "https://admin.localhost",
        ],
        credentials: true,
    });

    const port = config.get<number>("PORT") ?? 3000;
    await app.listen(port);
    console.log(`QuartierConnect API → http://localhost:${port}/v1`);
    console.log(`Scalar API Docs     → http://localhost:${port}/docs`);
}

void bootstrap();
