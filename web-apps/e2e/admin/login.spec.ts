import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    currentTotp,
    DEMO_PASSWORD,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Login parcours", () => {
    let residentEmail: string;
    let residentSecret: string;
    let adminEmail: string;
    let adminSecret: string;
    let savedAdminAccessToken: string;
    let savedAdminRefreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            residentEmail = uniqueEmail();
            residentSecret = await apiRegister(residentEmail);

            adminEmail = uniqueEmail();
            adminSecret = await apiRegister(adminEmail);
            const pgUser = process.env.POSTGRES_USER ?? "qc";
            const pgDb = process.env.POSTGRES_DB ?? "quartierconnect";
            execSync(
                `docker exec docker-postgres-1 psql -U "${pgUser}" -d "${pgDb}" -c "UPDATE users SET role='admin' WHERE email='${adminEmail}'"`,
                { stdio: "pipe" },
            );

            const tokens = await apiLogin(adminEmail, adminSecret, -30);
            savedAdminAccessToken = tokens.accessToken;
            savedAdminRefreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch (err) {
            // API or Docker not available — API-dependent tests will be skipped
        }
    });

    test("resident login is refused with forbidden message", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("login");
        await page.getByLabel("Email").fill(residentEmail);
        await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /continuer/i }).click();
        await page.getByLabel(/code totp/i).fill(currentTotp(residentSecret));
        await page.getByRole("button", { name: /se connecter/i }).click();
        await expect(page.getByRole("alert")).toContainText(
            /refusé|administrateur/i,
        );
    });

    test("admin login succeeds and redirects to /dashboard", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("login");
        await page.getByLabel("Email").fill(adminEmail);
        await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
        await page.getByRole("button", { name: /continuer/i }).click();
        await page.getByLabel(/code totp/i).fill(currentTotp(adminSecret));
        await page.getByRole("button", { name: /se connecter/i }).click();
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test("dashboard shows admin stats section", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await injectTokens(
            page,
            "http://localhost:3001",
            savedAdminAccessToken,
            savedAdminRefreshToken,
        );
        await page.goto("dashboard");
        await expect(
            page.getByRole("heading", { name: /tableau de bord/i }),
        ).toBeVisible();
    });
});
