import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Éditeur DSL", () => {
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
        await page.goto("dsl");
        await expect(page).toHaveURL(/\/dsl/);
    });

    test("shows DSL editor textarea", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByRole("textbox")).toBeVisible();
    });

    test("shows example queries", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /FIND incidents/i }).first(),
        ).toBeVisible();
    });

    test("shows run button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /exécuter|run|lancer/i }),
        ).toBeVisible();
    });

    test("executes a DSL query via button click and shows results", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("textbox").clear();
        await page.getByRole("textbox").fill("FIND incidents LIMIT 5");
        await page
            .getByRole("button", { name: /exécuter|run|lancer/i })
            .click();
        await expect(
            page.getByText(/\[|\{|résultat|result/i).first(),
        ).toBeVisible({ timeout: 8000 });
    });

    test("executes a DSL query via Ctrl+Enter", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("textbox").clear();
        await page.getByRole("textbox").fill("COUNT incidents");
        await page.getByRole("textbox").press("Control+Enter");
        await expect(page.getByText(/count|total|\[|\{/i).first()).toBeVisible({
            timeout: 8000,
        });
    });

    test("shows error on invalid DSL syntax", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("textbox").clear();
        await page.getByRole("textbox").fill("INVALID QUERY @@@@");
        await page
            .getByRole("button", { name: /exécuter|run|lancer/i })
            .click();
        await expect(page.getByText("Erreur").first()).toBeVisible({
            timeout: 5000,
        });
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
        await page.goto("dsl");
        await expect(page).toHaveURL(/\/login/);
    });
});
