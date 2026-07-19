import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    assignNeighborhoodWithGeometry,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: "http://localhost:3000" });

test.describe("Client — Services map", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;
    let neighborhood: string | null = null;
    let email = "";

    test.beforeAll(async () => {
        try {
            email = uniqueEmail();
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

    test("draws the neighborhood on a MapLibre canvas", async ({ page }) => {
        test.skip(!apiAvailable, "API not available");
        neighborhood = await assignNeighborhoodWithGeometry(email);
        expect(
            neighborhood,
            "no neighborhood with a polygon — seed the stack first",
        ).not.toBeNull();

        await injectTokens(
            page,
            "http://localhost:3000",
            accessToken,
            refreshToken,
        );
        await page.goto("/services");
        await expect(page).toHaveURL(/\/services/);
        await expect(
            page.getByRole("heading", { name: /services/i }),
        ).toBeVisible();

        const map = page.locator(".maplibregl-map").first();
        await expect(map).toBeVisible({ timeout: 15000 });
        await expect(map.locator("canvas.maplibregl-canvas")).toBeVisible();
        await expect(page.locator(".maplibregl-ctrl-attrib")).toContainText(
            /OpenStreetMap/i,
        );
    });

    test("hides the map when the neighborhood has no geometry", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        const plain = uniqueEmail();
        const secret = await apiRegister(plain);
        assignAddress(plain);
        const tokens = await apiLogin(plain, secret, -30);

        await injectTokens(
            page,
            "http://localhost:3000",
            tokens.accessToken,
            tokens.refreshToken,
        );
        await page.goto("/services");
        await expect(
            page.getByRole("heading", { name: /services/i }),
        ).toBeVisible();
        await expect(page.locator(".maplibregl-map")).toHaveCount(0);
    });
});
