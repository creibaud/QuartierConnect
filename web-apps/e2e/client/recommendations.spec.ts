import { expect, test, type Page } from "@playwright/test";
import type { Recommendation } from "../../packages/shared/src/lib/types";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const BASE_URL = "http://localhost:3000";

test.use({ baseURL: BASE_URL });

const NEIGHBOR_ID = "u1";

const MOCKED_RECOMMENDATIONS: Recommendation[] = [
    {
        type: "neighbor",
        id: NEIGHBOR_ID,
        name: "Claire Martin",
        score: 6,
        reason: "reliableNeighbor",
    },
    {
        type: "service",
        id: "s1",
        name: "Atelier vélo solidaire",
        score: 3,
        reason: "serviceInNeighborhood",
    },
    {
        type: "event",
        id: "e1",
        name: "Fête des voisins",
        score: 2,
        reason: "upcomingEventNearby",
    },
];

async function mockRecommendations(page: Page) {
    await page.route("**/api/recommendations", (route) =>
        route.fulfill({ json: MOCKED_RECOMMENDATIONS }),
    );
}

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/recommendations");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Recommandations", () => {
    let accessToken: string;
    let refreshToken: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            // Pass the address gate so the user can reach /recommendations
            assignAddress(email);
            const tokens = await apiLogin(email, secret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;

            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
    });

    test("shows the empty state for a fresh user", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await page.goto("/recommendations");
        await expect(page).toHaveURL(/\/recommendations/);

        await expect(
            page.getByRole("heading", { name: "Recommandations", level: 1 }),
        ).toBeVisible();
        await expect(
            page.getByText("Aucune recommandation pour le moment"),
        ).toBeVisible();
        await expect(
            page.getByText(/participez à la vie du quartier/i),
        ).toBeVisible();
    });

    test("renders a card per type with French badge and reason", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await mockRecommendations(page);
        await page.goto("/recommendations");

        const serviceLink = page.getByRole("link", {
            name: /Atelier vélo solidaire/,
        });
        await expect(serviceLink).toHaveAttribute("href", "/services");
        await expect(
            serviceLink.getByText("Service", { exact: true }),
        ).toBeVisible();
        await expect(
            serviceLink.getByText("Service proposé dans votre quartier"),
        ).toBeVisible();

        const eventLink = page.getByRole("link", {
            name: /Fête des voisins/,
        });
        await expect(eventLink).toHaveAttribute("href", "/events");
        await expect(
            eventLink.getByText("Événement", { exact: true }),
        ).toBeVisible();
        await expect(
            eventLink.getByText("Événement à venir près de chez vous"),
        ).toBeVisible();

        await expect(
            page.getByRole("heading", { name: "Claire Martin", level: 3 }),
        ).toBeVisible();
        await expect(page.getByText("Voisin", { exact: true })).toBeVisible();
        await expect(
            page.getByText("Voisin fiable, reconnu pour son entraide"),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: "Contacter" }),
        ).toBeVisible();
    });

    test("Contacter opens a conversation and lands on messages", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");

        await mockRecommendations(page);
        // useContact expects { id } from POST /messaging/conversations/with/:userId
        await page.route(
            `**/api/messaging/conversations/with/${NEIGHBOR_ID}`,
            (route) => route.fulfill({ json: { id: "conv1" } }),
        );
        await page.goto("/recommendations");

        await page.getByRole("button", { name: "Contacter" }).click();

        await expect(page).toHaveURL(/\/messages\?conversation=conv1/);
    });
});
