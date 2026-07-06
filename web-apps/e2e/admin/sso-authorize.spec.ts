import { execSync } from "child_process";
import { randomUUID } from "crypto";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/",
});

const CALLBACK_URL = "http://localhost:59999/callback";
// The API contract requires a UUID v4 state (SsoGenerateDto — PKCE CSRF protection)
const SSO_STATE = randomUUID();

function authorizePath(): string {
    return `sso/authorize?state=${SSO_STATE}&redirect=${encodeURIComponent(CALLBACK_URL)}`;
}

async function exchangeSsoToken(ssoToken: string): Promise<Response> {
    return fetch("http://localhost:5000/auth/sso/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssoToken, state: SSO_STATE }),
    });
}

test.describe("Admin — SSO desktop (consentement)", () => {
    let adminAccessToken: string;
    let adminRefreshToken: string;
    let residentAccessToken: string;
    let residentRefreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const adminEmail = uniqueEmail();
            const adminSecret = await apiRegister(adminEmail);
            const pgUser = process.env.POSTGRES_USER ?? "qc";
            const pgDb = process.env.POSTGRES_DB ?? "quartierconnect";
            execSync(
                `docker exec docker-postgres-1 psql -U "${pgUser}" -d "${pgDb}" -c "UPDATE users SET role='admin' WHERE email='${adminEmail}'"`,
                { stdio: "pipe" },
            );
            const adminTokens = await apiLogin(adminEmail, adminSecret, -30);
            adminAccessToken = adminTokens.accessToken;
            adminRefreshToken = adminTokens.refreshToken;

            const residentEmail = uniqueEmail();
            const residentSecret = await apiRegister(residentEmail);
            const residentTokens = await apiLogin(residentEmail, residentSecret);
            residentAccessToken = residentTokens.accessToken;
            residentRefreshToken = residentTokens.refreshToken;

            apiAvailable = true;
        } catch (err) {
            // API or Docker not available — API-dependent tests will be skipped
        }
    });

    test("shows invalid params alert without state and redirect", async ({
        page,
    }) => {
        await page.goto("sso/authorize");
        await expect(
            page.getByText(/paramètres de connexion invalides/i),
        ).toBeVisible();
    });

    test("shows invalid params alert for a non-localhost redirect", async ({
        page,
    }) => {
        await page.goto(
            `sso/authorize?state=${SSO_STATE}&redirect=${encodeURIComponent("http://evil.example.com/callback")}`,
        );
        await expect(
            page.getByText(/paramètres de connexion invalides/i),
        ).toBeVisible();
    });

    test("auto-approves for an admin and issues a single-use SSO token", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.route("http://localhost:59999/**", (route) =>
            route.fulfill({
                status: 200,
                contentType: "text/html",
                body: "<h1>Callback desktop</h1>",
            }),
        );
        await injectTokens(
            page,
            "http://localhost:3001",
            adminAccessToken,
            adminRefreshToken,
        );

        await page.goto(authorizePath());
        await page.waitForURL(new RegExp(`token=.+&state=${SSO_STATE}`), {
            timeout: 10_000,
        });

        const ssoToken = new URL(page.url()).searchParams.get("token");
        expect(ssoToken).toBeTruthy();

        const firstExchange = await exchangeSsoToken(ssoToken as string);
        expect(firstExchange.status).toBe(200);
        const tokens = (await firstExchange.json()) as {
            accessToken?: string;
        };
        expect(tokens.accessToken).toBeTruthy();

        const replayedExchange = await exchangeSsoToken(ssoToken as string);
        expect(replayedExchange.status).toBe(401);
    });

    test("shows admin-only alert for a resident", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await injectTokens(
            page,
            "http://localhost:3001",
            residentAccessToken,
            residentRefreshToken,
        );
        await page.goto(authorizePath());
        await expect(
            page.getByText(/réservée aux administrateurs/i),
        ).toBeVisible();
    });
});
