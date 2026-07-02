import { execSync } from "child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

const API = "http://localhost:5000";
const ADMIN_URL = "http://localhost:3001";
const E2E_PREFIX = "E2E Draw";

test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? `${ADMIN_URL}/`,
});

interface NeighborhoodSummary {
    _id: string;
    name: string;
}

async function fetchAllNeighborhoods(): Promise<NeighborhoodSummary[]> {
    const res = await fetch(`${API}/neighborhoods?limit=100`);
    if (!res.ok) return [];
    return (await res.json()) as NeighborhoodSummary[];
}

async function deleteE2eNeighborhoods(accessToken: string): Promise<void> {
    const leftovers = (await fetchAllNeighborhoods()).filter((n) =>
        n.name.startsWith(E2E_PREFIX),
    );
    for (const neighborhood of leftovers) {
        await fetch(`${API}/neighborhoods/${neighborhood._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
}

function squareAround(lng: number, lat: number, half: number) {
    return {
        type: "Polygon",
        coordinates: [
            [
                [lng - half, lat - half],
                [lng + half, lat - half],
                [lng + half, lat + half],
                [lng - half, lat + half],
                [lng - half, lat - half],
            ],
        ],
    };
}

async function apiCreateNeighborhood(
    accessToken: string,
    name: string,
    geometry: ReturnType<typeof squareAround>,
): Promise<Response> {
    return fetch(`${API}/neighborhoods`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, city: "E2E Ville", geometry }),
    });
}

async function openCreateDialog(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "Créer", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(
        dialog.getByRole("heading", { name: /Ajouter un quartier/i }),
    ).toBeVisible();
    return dialog;
}

async function waitForDrawReady(dialog: Locator): Promise<Locator> {
    const canvas = dialog.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByTestId("map-draw-polygon")).toBeEnabled({
        timeout: 15_000,
    });
    return canvas;
}

async function zoomOut(dialog: Locator, times: number): Promise<void> {
    const zoomOutButton = dialog.getByRole("button", { name: "Zoom out" });
    for (let i = 0; i < times; i++) {
        await zoomOutButton.click();
        await dialog.page().waitForTimeout(450);
    }
}

/** Drags the map content eastward so the viewport center moves west. */
async function panWest(
    page: Page,
    canvas: Locator,
    times: number,
): Promise<void> {
    for (let i = 0; i < times; i++) {
        const box = await canvas.boundingBox();
        if (!box) throw new Error("Map canvas is not visible");
        const y = box.y + box.height / 2;
        const fromX = box.x + 24;
        const toX = box.x + box.width - 24;
        await page.mouse.move(fromX, y);
        await page.mouse.down();
        await page.mouse.move(toX, y, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(700);
    }
}

/** Clicks four corners around the canvas center, then closes with Enter. */
async function drawSquare(
    page: Page,
    canvas: Locator,
    half: number,
): Promise<void> {
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Map canvas is not visible");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const corners: [number, number][] = [
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx + half, cy + half],
        [cx - half, cy + half],
    ];
    for (const [x, y] of corners) {
        await page.mouse.click(x, y);
        await page.waitForTimeout(200);
    }
    await page.keyboard.press("Enter");
}

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
            await deleteE2eNeighborhoods(adminAccessToken);
            apiAvailable = true;
        } catch {
            // API or Docker not available
        }
    });

    test.afterAll(async () => {
        if (apiAvailable) await deleteE2eNeighborhoods(adminAccessToken);
    });

    test("draws a polygon on the map and creates the neighborhood", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        test.setTimeout(90_000);
        const name = `${E2E_PREFIX} ${Date.now()}`;

        await injectTokens(
            page,
            ADMIN_URL,
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("neighborhoods");
        await expect(page).toHaveURL(/\/neighborhoods/);

        const dialog = await openCreateDialog(page);
        const canvas = await waitForDrawReady(dialog);

        await expect(dialog.getByTestId("map-edit-polygon")).toBeDisabled();
        await expect(dialog.getByTestId("map-delete-polygon")).toBeDisabled();

        // Move away from the seeded Paris neighborhoods before drawing so the
        // server-side overlap check ($geoIntersects) passes.
        await zoomOut(dialog, 3);
        await panWest(page, canvas, 2);
        await dialog.getByTestId("map-draw-polygon").click();

        await drawSquare(page, canvas, 50);
        await expect(dialog.getByText(/Polygone défini/)).toBeVisible();

        await dialog.locator("#nbh-name").fill(name);
        await dialog.locator("#nbh-city").fill("E2E Ville");
        await dialog
            .getByRole("button", { name: "Créer", exact: true })
            .click();

        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await expect(
            page.getByRole("row").filter({ hasText: name }),
        ).toBeVisible();
    });

    test("loads the polygon of an existing neighborhood and saves a redrawn one", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        test.setTimeout(90_000);
        const name = `${E2E_PREFIX} Edit ${Date.now()}`;

        const created = await apiCreateNeighborhood(
            adminAccessToken,
            name,
            squareAround(1.6, 48.85, 0.02),
        );
        expect(created.ok).toBeTruthy();

        await injectTokens(
            page,
            ADMIN_URL,
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("neighborhoods");

        const row = page.getByRole("row").filter({ hasText: name });
        await row.getByRole("button", { name: "Modifier" }).click();

        const dialog = page.getByRole("dialog");
        await expect(
            dialog.getByRole("heading", { name: /Modifier le quartier/i }),
        ).toBeVisible();
        await expect(dialog.getByText(/Polygone défini/)).toBeVisible();

        const canvas = await waitForDrawReady(dialog);
        await expect(dialog.getByTestId("map-edit-polygon")).toBeEnabled();

        await dialog.getByTestId("map-delete-polygon").click();
        await expect(dialog.getByText(/Polygone défini/)).toBeHidden();

        await drawSquare(page, canvas, 60);
        await expect(dialog.getByText(/Polygone défini/)).toBeVisible();

        await dialog.getByRole("button", { name: "Enregistrer" }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        await expect(
            page.getByRole("row").filter({ hasText: name }),
        ).toBeVisible();
    });

    test("shows a boundary-overlap alert when the polygon crosses an existing neighborhood", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available");
        test.setTimeout(90_000);

        // Ensure the default map view (central Paris) is occupied. When the
        // database is already seeded with the Paris arrondissements this call
        // returns 409, which is fine — an overlap target exists either way.
        await apiCreateNeighborhood(
            adminAccessToken,
            `${E2E_PREFIX} Base ${Date.now()}`,
            squareAround(2.3522, 48.8566, 0.05),
        );

        await injectTokens(
            page,
            ADMIN_URL,
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("neighborhoods");

        const dialog = await openCreateDialog(page);
        const canvas = await waitForDrawReady(dialog);

        await drawSquare(page, canvas, 50);
        await expect(dialog.getByText(/Polygone défini/)).toBeVisible();

        await dialog
            .locator("#nbh-name")
            .fill(`${E2E_PREFIX} Overlap ${Date.now()}`);
        await dialog.locator("#nbh-city").fill("E2E Ville");
        await dialog
            .getByRole("button", { name: "Créer", exact: true })
            .click();

        const alert = dialog.getByRole("alert");
        await expect(alert).toBeVisible({ timeout: 15_000 });
        await expect(alert).toContainText(/overlap|chevauch/i);
        await expect(dialog).toBeVisible();

        await dialog.getByRole("button", { name: "Annuler" }).click();
        await expect(dialog).toBeHidden();
    });
});
