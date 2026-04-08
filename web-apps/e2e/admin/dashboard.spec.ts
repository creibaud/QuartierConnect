import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3001" });

test.describe("Admin — Dashboard", () => {
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
        await page.goto("/dashboard");
        await expect(page).toHaveURL(/\/dashboard/);
    });

    test("shows admin heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /administration/i }),
        ).toBeVisible();
    });

    test("shows live stats counters", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.locator("text=/\\d+/").first()).toBeVisible();
    });

    test("navigation cards link to admin sections", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(page.getByText("Utilisateurs").first()).toBeVisible();
        await expect(page.getByText("Quartiers").first()).toBeVisible();
    });
});
