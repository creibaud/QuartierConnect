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
                `API REST de la plateforme QuartierConnect — gestion de quartier (ESGI Étape 3).

## Authentification

Toutes les routes protégées utilisent un **JWT Bearer** (HS256, durée 15 min).

1. Inscrivez-vous via \`POST /auth/register\` → récupérez votre **secret TOTP** dans \`otpauthUrl\`
2. Connectez-vous via \`POST /auth/login\` avec email + mot de passe + code TOTP 6 chiffres
3. Copiez l'\`accessToken\` retourné et cliquez sur **Authorize** (🔒) en haut de la page

Le token expire après 15 min. Utilisez \`POST /auth/refresh\` pour en obtenir un nouveau silencieusement.

## Utilisateurs démo (seed)

| Email | Mot de passe | Rôle | TOTP secret |
|-------|-------------|------|-------------|
| alice@demo.fr | Demo1234! | resident | JBSWY3DPEHPK3PXP |
| bob@demo.fr | Demo1234! | moderator | JBSWY3DPEHPK3PXP |
| admin@demo.fr | Demo1234! | admin | JBSWY3DPEHPK3PXP |

Générer un code TOTP : \`oathtool --totp --base32 JBSWY3DPEHPK3PXP\`

## Modèle de données

| Entité | Base | Description |
|--------|------|-------------|
| users | PostgreSQL | Comptes utilisateurs — email, passwordHash (argon2), totpSecret, role |
| incidents | PostgreSQL | Incidents signalés — machine d'états open→in_progress→resolved, soft delete |
| point_balances | PostgreSQL | Solde de points par utilisateur |
| point_transactions | PostgreSQL | Historique des transferts ACID |
| neighborhoods | MongoDB | Quartiers avec coordonnées géographiques |
| services | MongoDB | Annonces de services entre voisins |
| events | MongoDB | Événements communautaires |
| ssoTokens | MongoDB | Tokens SSO UUID v4 (TTL 5 min, usage unique) |

## Pagination

Les endpoints qui retournent des listes acceptent \`?page=1&limit=20\` (max 100).

## Rôles

\`resident\` → \`moderator\` → \`admin\` → \`banned\`
- **resident** : créer incidents, services, events, transférer des points
- **moderator** : + changer le statut des incidents, supprimer
- **admin** : accès total, gestion utilisateurs, stats`,
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
