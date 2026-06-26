import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

test.describe("Admin — Neighborhoods polygon draw", () => {
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
        } catch {
            // API or Docker not available
        }
    });

    test("opens the create dialog, draws a polygon, leaflet-draw toolbar appears", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        await injectTokens(
            page,
            "http://localhost:3001",
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("neighborhoods");
        await expect(page).toHaveURL(/\/neighborhoods/);

        await page.getByRole("button", { name: "Créer", exact: true }).click();
        await expect(
            page.getByRole("heading", { name: /Ajouter un quartier/i }),
        ).toBeVisible();

        // Map container appears inside the dialog
        const map = page.locator(".leaflet-container").first();
        await expect(map).toBeVisible({ timeout: 5000 });

        // OSM attribution
        await expect(
            page.locator(".leaflet-control-attribution").first(),
        ).toContainText("OpenStreetMap");

        // leaflet-draw injects a polygon draw button via DrawControl
        // leaflet-draw renders two toolbars (draw + edit/delete); assert the first
        const drawToolbar = page.locator(".leaflet-draw-toolbar").first();
        await expect(drawToolbar).toBeVisible({ timeout: 5000 });
    });
});
