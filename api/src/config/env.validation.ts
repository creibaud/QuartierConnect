import { plainToInstance } from "class-transformer";
import {
    IsEmail,
    IsEnum,
    IsNumber,
    IsString,
    Min,
    validateSync,
} from "class-validator";

enum Environment {
    Development = "development",
    Production = "production",
    Test = "test",
}

class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @Min(1)
    PORT: number;

    @IsString()
    POSTGRES_HOST: string;

    @IsNumber()
    @Min(1)
    POSTGRES_PORT: number;

    @IsString()
    POSTGRES_USER: string;

    @IsString()
    POSTGRES_PASSWORD: string;

    @IsString()
    POSTGRES_DB: string;

    @IsString()
    MONGO_HOST: string;

    @IsNumber()
    @Min(1)
    MONGO_PORT: number;

    @IsString()
    MONGO_USER: string;

    @IsString()
    MONGO_PASSWORD: string;

    @IsString()
    MONGO_DB: string;

    @IsString()
    NEO4J_HOST: string;

    @IsNumber()
    @Min(1)
    NEO4J_PORT: number;

    @IsString()
    NEO4J_USER: string;

    @IsString()
    NEO4J_PASSWORD: string;

    @IsString()
    JWT_ACCESS_SECRET: string;

    @IsString()
    JWT_REFRESH_SECRET: string;

    @IsString()
    JWT_ACCESS_EXPIRATION: string;

    @IsString()
    JWT_REFRESH_EXPIRATION: string;

    @IsString()
    REFRESH_COOKIE_NAME: string;

    @IsString()
    REFRESH_COOKIE_PATH: string;

    @IsNumber()
    @Min(1)
    SALT_ROUNDS: number;

    @IsString()
    MAIL_HOST: string;

    @IsNumber()
    @Min(1)
    MAIL_PORT: number;

    @IsString()
    MAIL_USER: string;

    @IsEmail()
    MAIL_FROM: string;

    @IsString()
    MAIL_PASS: string;
}

export function validateEnv(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        throw new Error(
            `Error validating environment variables: ${errors.toString()}`,
        );
    }

    return validatedConfig;
}
