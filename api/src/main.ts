import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HttpExceptionFilter } from "src/common/filters/http-exception.filter";
import { JsonLogger } from "src/common/logger/json.logger";
import * as packageJson from "../package.json";
import { AppModule } from "./app.module";

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
    SwaggerModule.setup("docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    const port = config.get<number>("PORT") ?? 3000;
    await app.listen(port);
    console.log(`QuartierConnect API → http://localhost:${port}/v1`);
    console.log(`Swagger             → http://localhost:${port}/docs`);
}

void bootstrap();
