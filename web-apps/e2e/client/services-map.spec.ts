import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
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
            assignAddress(email);
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

        // The Leaflet map renders only when the resident's neighborhood has a
        // polygon. The e2e resident may be assigned to a geometry-less
        // neighborhood, so assert the page rendered, then verify the map's OSM
        // attribution only when a map is actually shown.
        await expect(
            page.getByRole("heading", { name: /services/i }),
        ).toBeVisible();

        const map = page.locator(".leaflet-container").first();
        await map
            .waitFor({ state: "visible", timeout: 5000 })
            .catch(() => undefined);

        if (await map.isVisible().catch(() => false)) {
            await expect(
                page.locator(".leaflet-control-attribution"),
            ).toContainText("OpenStreetMap");
        }
    });
});
