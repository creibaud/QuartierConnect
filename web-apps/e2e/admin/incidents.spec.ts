import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3001" });

test.describe("Admin — Modération incidents", () => {
    let adminAccessToken: string;
    let adminRefreshToken: string;
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
            const tokens = await apiLogin(adminEmail, adminSecret, -30);
            adminAccessToken = tokens.accessToken;
            adminRefreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            // API or Docker not available — API-dependent tests will be skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3001",
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("/incidents");
        await expect(page).toHaveURL(/\/incidents/);
    });

    test("shows incidents moderation heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /incidents/i }),
        ).toBeVisible();
    });

    test("shows status filter selector", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByRole("combobox")).toBeVisible();
    });

    test("shows table headers for incident list", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("columnheader", { name: /titre/i }),
        ).toBeVisible();
        await expect(
            page.getByRole("columnheader", { name: /statut/i }),
        ).toBeVisible();
    });

    test("filters incidents by open status", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /ouverts/i }).click();
        await expect(
            page.getByRole("heading", { name: /incidents/i }),
        ).toBeVisible();
    });

    test("redirects non-admin to login", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const email = uniqueEmail();
        const secret = await apiRegister(email);
        const tokens = await apiLogin(email, secret);
        await injectTokens(
            page,
            "http://localhost:3001",
            tokens.accessToken,
            tokens.refreshToken,
        );
        await page.goto("/incidents");
        await expect(page).toHaveURL(/\/login/);
    });
});
