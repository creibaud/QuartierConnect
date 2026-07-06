import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const BASE_URL = "http://localhost:3000";
const API_URL = "http://localhost:5000";

test.use({ baseURL: BASE_URL });

async function createBinaryVote(
    accessToken: string,
    title: string,
): Promise<string> {
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await fetch(`${API_URL}/community-votes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            title,
            description: "Consultation créée par le test e2e",
            voteType: "binary",
            options: [
                { id: "yes", label: "Oui" },
                { id: "no", label: "Non" },
            ],
            endsAt,
            quorum: 0,
            isAnonymous: false,
        }),
    });
    if (!res.ok) {
        const err = (await res.json()) as object;
        throw new Error(`Vote creation failed: ${JSON.stringify(err)}`);
    }
    const vote = (await res.json()) as { _id: string };
    return vote._id;
}

test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/votes");
    await expect(page).toHaveURL(/\/login/);
});

test.describe("Client — Votes de communauté", () => {
    let accessToken: string;
    let refreshToken: string;
    let voteId: string;
    let voteTitle: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const email = uniqueEmail();
            const secret = await apiRegister(email);
            // Pass the address gate so the resident can reach /votes
            assignAddress(email);
            const tokens = await apiLogin(email, secret);
            accessToken = tokens.accessToken;
            refreshToken = tokens.refreshToken;

            voteTitle = `Vote E2E ${Date.now()}`;
            voteId = await createBinaryVote(accessToken, voteTitle);

            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running — API-dependent tests will be skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(page, BASE_URL, accessToken, refreshToken);
        await page.goto("/votes");
        await expect(page).toHaveURL(/\/votes/);
    });

    // Several votes can coexist on the page; scope assertions to our card.
    const voteCard = (page: import("@playwright/test").Page) =>
        page.locator('[data-slot="card"]').filter({ hasText: voteTitle });

    test("the vote card appears in the open tab", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("tab", { name: /en cours/i }),
        ).toHaveAttribute("aria-selected", "true");
        await expect(voteCard(page).getByText(voteTitle)).toBeVisible();
    });

    test("selecting an option and voting shows a toast and the results", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const card = voteCard(page);
        await card.getByRole("button", { name: "Oui", exact: true }).click();
        await card.getByRole("button", { name: "Voter", exact: true }).click();

        await expect(page.getByText("Vote enregistré")).toBeVisible();
        await expect(card.getByText(/résultats provisoires/i)).toBeVisible();
        await expect(card.getByText(/votre choix/i)).toBeVisible();
    });

    test("the answered tab lists the vote", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.getByRole("tab", { name: /répondu/i }).click();
        await expect(voteCard(page).getByText(voteTitle)).toBeVisible();
    });

    test("closing the vote moves it to the closed tab", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const res = await fetch(`${API_URL}/community-votes/${voteId}/close`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        expect(res.status).toBe(201);

        await page.reload();
        await page.getByRole("tab", { name: /terminé/i }).click();

        const card = voteCard(page);
        await expect(card.getByText(voteTitle)).toBeVisible();
        await expect(card.getByText(/résultats finaux/i)).toBeVisible();
    });
});
