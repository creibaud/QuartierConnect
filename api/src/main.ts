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
        .setDescription(
            `## Plateforme collaborative de quartier — *Le lien qui rapproche votre quartier*

QuartierConnect est une API REST sécurisée qui alimente le site web React et l'application desktop Java administrateur.
Elle expose l'intégralité des fonctionnalités collaboratives du quartier :
échange de services entre voisins, signature numérique sécurisée (SHA-256 + MFA TOTP),
événements communautaires avec moteur de recommandations Neo4j, messagerie temps réel WebSocket,
votes paramétrables, gestion des incidents et synchronisation offline-first pour le client Java.

---

### Authentification

Toutes les routes (sauf \`/auth/register\`, \`/auth/login\`, \`/auth/refresh\` et \`/health\`) requièrent un **Bearer token JWT**.

1. Appelez \`POST /auth/login\` → recevez un \`accessToken\` (15 min) et un cookie \`refreshToken\` HttpOnly (7 jours).
2. Si le compte a TOTP activé, un \`totpToken\` temporaire est renvoyé → complétez via \`POST /auth/totp/login\`.
3. Ajoutez \`Authorization: Bearer <accessToken>\` à chaque requête protégée.
4. Renouvelez silencieusement via \`POST /auth/refresh\` (cookie automatique).

---

### Rôles

| Rôle | Accès |
|------|-------|
| \`resident\` | Toutes les fonctionnalités utilisateur (services, événements, messagerie, votes, documents) |
| \`moderator\` | Idem + suppression de tout contenu inapproprié |
| \`admin\` | Accès complet + back-office (quartiers, utilisateurs, statistiques, outbox, sync) |

---

### Codes de réponse globaux

| Code | Signification |
|------|---------------|
| \`200\` | Succès |
| \`201\` | Ressource créée |
| \`204\` | Suppression réussie (pas de corps) |
| \`400\` | Validation échouée |
| \`401\` | Non authentifié / token invalide |
| \`403\` | Accès interdit (rôle insuffisant) |
| \`404\` | Ressource introuvable |
| \`409\` | Conflit (doublon, chevauchement géographique…) |

---

### Pagination

Les endpoints de liste acceptent les paramètres suivants :

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| \`page\` | integer | \`1\` | Numéro de page |
| \`limit\` | integer | \`10\` | Éléments par page |
| \`sortBy\` | string | \`createdAt\` | Champ de tri |
| \`sortOrder\` | \`asc\`/\`desc\` | \`desc\` | Ordre de tri |

La réponse inclut un objet \`meta\` : \`{ total, page, limit, totalPages }\`.

---

### Bases de données

| Base | Usage |
|------|-------|
| **PostgreSQL** | Utilisateurs, quartiers, incidents, sessions, transactions |
| **MongoDB** | Documents, événements, messages, services, votes, GeoJSON |
| **Neo4j** | Graphe social (interactions, affinités), moteur de recommandations |`,
        )
        .setVersion(packageJson.version)
        .setContact(
            "Équipe QuartierConnect",
            "https://github.com/ESGI-QuartierConnect",
            "contact@quartierconnect.local",
        )
        .setLicense("MIT", "https://opensource.org/licenses/MIT")
        .addServer(`http://localhost:3000`, "Développement local")
        .addServer(`https://api.localhost`, "Production (Docker Caddy)")
        .addBearerAuth(
            {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description:
                    "Access token JWT obtenu via POST /auth/login ou POST /auth/totp/login. Durée de vie : 15 minutes.",
            },
            "access-token",
        )
        .addTag("Auth", "Inscription, connexion, gestion MFA TOTP et tokens JWT")
        .addTag("Users", "Profil utilisateur, solde de points, export RGPD et administration")
        .addTag("Quartiers", "Gestion des quartiers géographiques (GeoJSON) et de leurs membres")
        .addTag("Events", "Événements communautaires avec interface swipe et inscriptions")
        .addTag("Services", "Annonces de services entre voisins et système de points")
        .addTag("Transactions", "Historique des transferts de points et ajustements administrateurs")
        .addTag("Messages", "Chats 1-à-1 et de groupe avec messagerie temps réel")
        .addTag("Documents", "Signature numérique sécurisée de documents PDF avec TOTP et audit")
        .addTag("Votes", "Système de vote paramétrable (binaire, choix unique/multiple, pondéré)")
        .addTag("Incidents", "Signalement et suivi d'incidents dans le quartier")
        .addTag("Recommendations", "Suggestions personnalisées via le graphe social Neo4j")
        .addTag("Admin", "Statistiques et administration de la plateforme")
        .addTag("Sync", "Synchronisation delta offline-first pour l'application Java desktop")
        .addTag("Health", "Vérification de l'état des services et bases de données")
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    enrichResponseSchemasFromExamples(document);

    app.use(
        "/docs",
        apiReference({
            content: document,
            theme: "kepler",
            title: "QuartierConnect API Reference",
            layout: "modern",
            defaultHttpClient: {
                targetKey: "js",
                clientKey: "fetch",
            },
            customCss: `
                .scalar-app { --scalar-color-1: #1a1a2e; }
                .darklight-reference-promo { display: none; }
            `,
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
