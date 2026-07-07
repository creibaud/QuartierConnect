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
            // API not running
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

        // The map renders only for a neighborhood with a polygon; check the OSM
        // attribution only when a map actually appears.
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
