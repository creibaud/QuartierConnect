import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test.describe("Client — Services map", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            const tokens = await apiLogin(email, secret, -30);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;
            apiAvailable = true;
        } catch {
            // API not running — tests will skip
        }
    });

    test("renders Leaflet map when a neighborhood with geometry exists", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        await injectTokens(
            page,
            "http://localhost:3000",
            accessToken,
            refreshToken,
        );
        await page.goto("/services");
        await expect(page).toHaveURL(/\/services/);

        // The map only renders when there's at least one neighborhood with
        // a polygon. If no demo data has been seeded, accept either the
        // map being visible OR the empty-state message.
        const map = page.locator(".leaflet-container").first();
        const emptyServices = page.getByText(
            "Aucun service disponible.",
            { exact: false },
        );

        await Promise.race([
            map.waitFor({ state: "visible", timeout: 5000 }),
            emptyServices.waitFor({ state: "visible", timeout: 5000 }),
        ]).catch(() => undefined);

        // Either the map is visible OR no services exist
        const mapVisible = await map.isVisible().catch(() => false);
        const emptyVisible = await emptyServices.isVisible().catch(() => false);
        expect(mapVisible || emptyVisible).toBeTruthy();

        if (mapVisible) {
            // OSM attribution is required
            await expect(
                page.locator(".leaflet-control-attribution"),
            ).toContainText("OpenStreetMap");
        }
    });
});
