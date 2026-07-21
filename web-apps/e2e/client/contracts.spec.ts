import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/contracts");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Contrats", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            assignAddress(email);
            const tokens = await apiLogin(email, secret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running, dependent tests are skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3000",
            accessToken,
            refreshToken,
        );
        await page.goto("/contracts");
        await expect(page).toHaveURL(/\/contracts/);
    });

    test("displays contracts page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /contrats/i }),
        ).toBeVisible();
    });

    test("shows create contract button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /créer|nouveau|proposer/i }).first(),
        ).toBeVisible();
    });

    test("opens create contract dialog with required fields", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page
            .getByRole("button", { name: /créer|nouveau|proposer/i }).first()
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByLabel(/titre/i)).toBeVisible();
    });

    test("shows empty state or contract list without error", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByText(/erreur|error/i)).not.toBeVisible();
        await expect(page.locator("body")).not.toContainText("Cannot");
    });
});

test.describe("Client — Contrats (supervision admin)", () => {
    let adminAccessToken: string;
    let adminRefreshToken: string;
    let contractTitle: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const creatorEmail = uniqueEmail();
            const creatorSecret = await apiRegister(creatorEmail);
            assignAddress(creatorEmail);
            const creator = await apiLogin(creatorEmail, creatorSecret);

            contractTitle = `Contrat e2e ${Date.now()}`;
            const res = await fetch("http://localhost:5000/contracts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${creator.accessToken}`,
                },
                body: JSON.stringify({
                    title: contractTitle,
                    content: "Contrat de test pour la supervision.",
                }),
            });
            if (!res.ok) {
                throw new Error(`Contract creation failed: ${res.status}`);
            }

            const adminEmail = uniqueEmail();
            const adminSecret = await apiRegister(adminEmail);
            assignAddress(adminEmail);
            const pgUser = process.env.POSTGRES_USER ?? "qc";
            const pgDb = process.env.POSTGRES_DB ?? "quartierconnect";
            execSync(
                `docker exec docker-postgres-1 psql -U "${pgUser}" -d "${pgDb}" -c "UPDATE users SET role='admin' WHERE email='${adminEmail}'"`,
                { stdio: "pipe" },
            );
            const admin = await apiLogin(adminEmail, adminSecret, -30);
            adminAccessToken = admin.accessToken;
            adminRefreshToken = admin.refreshToken;
            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running, dependent tests are skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3000",
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("/contracts");
        await expect(page).toHaveURL(/\/contracts/);
    });

    test("liste tous les contrats du quartier pour un admin", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("link", { name: contractTitle }),
        ).toBeVisible();
    });

    test("ouvre le contrat d'un tiers en supervision, sans erreur", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("link", { name: contractTitle }).click();
        await expect(
            page.getByRole("heading", { name: contractTitle }),
        ).toBeVisible();
        await expect(page.getByText(/document privé/i)).toBeVisible();
        await expect(
            page.getByText(/impossible de charger/i),
        ).not.toBeVisible();
    });
});
