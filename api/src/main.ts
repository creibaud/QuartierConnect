import "./env-loader";
import { join } from "path";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { HealthResponseDto, StatsResponseDto } from "./app.dto";
import { AppModule } from "./app.module";
import {
    AuthTokensResponseDto,
    LogoutResponseDto,
    RefreshTokensResponseDto,
    UserProfileDto,
} from "./auth/dto/auth-responses.dto";
import {
    ErrorResponseDto,
    SuccessResponseDto,
} from "./common/dto/common-responses.dto";
import {
    CastRecordDto,
    CommunityVoteDto,
    CommunityVoteOptionResultDto,
    CommunityVoteResultsDto,
    VoteOptionResponseDto,
} from "./community-votes/dto/community-vote-response.dto";
import {
    ContractDto,
    SignatureDto,
} from "./contracts/dto/contract-response.dto";
import {
    DocumentAuditEntryDto,
    DocumentMetaDto,
} from "./documents/dto/document-responses.dto";
import { DslQueryResultDto } from "./dsl/dto/dsl-response.dto";
import {
    EventDto,
    EventInterestResponseDto,
} from "./events/dto/event-response.dto";
import {
    IncidentDto,
    SyncResultDto,
} from "./incidents/dto/incident-response.dto";
import {
    ConversationDto,
    MessageDto,
} from "./messaging/dto/messaging-responses.dto";
import {
    GeoJsonPolygonResponseDto,
    NeighborhoodDto,
} from "./neighborhoods/dto/neighborhood-response.dto";
import {
    PointsBalanceResponseDto,
    PointsTransactionResponseDto,
    TransferResponseDto,
} from "./points/dto/points-responses.dto";
import { ServiceDto } from "./services/dto/service-response.dto";
import {
    RecommendationItemDto,
    RecordInterestBodyDto,
    RecordInterestResponseDto,
} from "./social/dto/social-responses.dto";
import {
    DeleteAccountBodyDto,
    GdprExportDto,
    PointsBalanceDto,
    PointsTransactionDto,
    SocialRelationDto,
    UserPublicDto,
} from "./users/dto/user-responses.dto";
import {
    VoteActionResponseDto,
    VoteBreakdownDto,
    VoteScoreResponseDto,
} from "./votes/dto/vote-response.dto";

const DEV_ORIGINS = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5000",
];

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Serve Scalar standalone bundle at /scalar/standalone.js (self-hosted, no CDN)
    app.useStaticAssets(
        join(require.resolve("@scalar/api-reference"), "../browser"),
        { prefix: "/scalar" },
    );

    const { apiReference } = await import("@scalar/nestjs-api-reference");

    const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder()
            .setExternalDoc(
                "Source code",
                "https://github.com/creibaud/QuartierConnect",
            )
            .setTitle("QuartierConnect API")
            .setDescription(
                `REST API for the QuartierConnect platform — neighborhood management (ESGI Step 3).

## Authentication

All protected routes use a **JWT Bearer** (HS256, 15 min lifetime).

1. Register via \`POST /auth/register\` → retrieve your **TOTP secret** from \`otpauthUrl\`
2. Log in via \`POST /auth/login\` with email + password + 6-digit TOTP code
3. Copy the returned \`accessToken\` and click **Authorize** (🔒) at the top of the page

The token expires after 15 min. Use \`POST /auth/refresh\` to obtain a new one silently.

## Demo users (seed)

| Email | Password | Role | TOTP secret |
|-------|-------------|------|-------------|
| alice@demo.fr | Demo1234! | resident | JBSWY3DPEHPK3PXP |
| bob@demo.fr | Demo1234! | moderator | JBSWY3DPEHPK3PXP |
| admin@demo.fr | Demo1234! | admin | JBSWY3DPEHPK3PXP |

Generate a TOTP code: \`oathtool --totp --base32 JBSWY3DPEHPK3PXP\`

## Data model

| Entity | Database | Description |
|--------|------|-------------|
| users | PostgreSQL | User accounts — email, passwordHash (argon2), totpSecret, role |
| incidents | PostgreSQL | Reported incidents — state machine open→in_progress→resolved, soft delete |
| point_balances | PostgreSQL | Point balance per user |
| point_transactions | PostgreSQL | ACID transfer history |
| neighborhoods | MongoDB | Neighborhoods with geographic coordinates |
| services | MongoDB | Service listings between neighbors |
| events | MongoDB | Community events |
| ssoTokens | MongoDB | SSO UUID v4 tokens (TTL 5 min, single use) |

## Pagination

Endpoints that return lists accept \`?page=1&limit=20\` (max 100).

## Roles

\`resident\` → \`moderator\` → \`admin\` → \`banned\`
- **resident**: create incidents, services, events, transfer points
- **moderator**: + change incident status, delete
- **admin**: full access, user management, stats`,
            )
            .setVersion("3.0")
            .addServer("http://localhost:5000", "Local API (direct)")
            .addServer("http://localhost/api", "Local API (via Caddy)")
            .addBearerAuth()
            .build(),
        {
            extraModels: [
                HealthResponseDto,
                StatsResponseDto,
                AuthTokensResponseDto,
                RefreshTokensResponseDto,
                LogoutResponseDto,
                UserProfileDto,
                ErrorResponseDto,
                SuccessResponseDto,
                CommunityVoteDto,
                CommunityVoteOptionResultDto,
                CommunityVoteResultsDto,
                CastRecordDto,
                VoteOptionResponseDto,
                ContractDto,
                SignatureDto,
                DocumentAuditEntryDto,
                DocumentMetaDto,
                DslQueryResultDto,
                EventDto,
                EventInterestResponseDto,
                IncidentDto,
                SyncResultDto,
                ConversationDto,
                MessageDto,
                GeoJsonPolygonResponseDto,
                NeighborhoodDto,
                PointsBalanceResponseDto,
                PointsTransactionResponseDto,
                TransferResponseDto,
                ServiceDto,
                RecommendationItemDto,
                RecordInterestBodyDto,
                RecordInterestResponseDto,
                DeleteAccountBodyDto,
                GdprExportDto,
                PointsBalanceDto,
                PointsTransactionDto,
                SocialRelationDto,
                UserPublicDto,
                VoteActionResponseDto,
                VoteBreakdownDto,
                VoteScoreResponseDto,
            ],
        },
    );

    app.use(
        "/docs",
        apiReference({
            content: document,
            cdn: "/scalar/standalone.js",
        }),
    );

    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                    "script-src": ["'self'", "'unsafe-inline'"],
                    "style-src": ["'self'", "'unsafe-inline'"],
                    "img-src": ["'self'", "data:"],
                },
            },
        }),
    );

    const rawOrigins = process.env.CORS_ORIGINS;
    const origins = rawOrigins
        ? rawOrigins.split(",").map((o) => o.trim())
        : DEV_ORIGINS;

    app.use(cookieParser());

    app.enableCors({
        origin: origins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
