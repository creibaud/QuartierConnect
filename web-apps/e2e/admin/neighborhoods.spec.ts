import { execSync } from "child_process";
import { expect, test } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    injectTokens,
    uniqueEmail,
} from "../helpers/auth";

test.use({ baseURL: process.env.PLAYWRIGHT_BASE_URL_ADMIN ?? "http://localhost:3001/" });

const API = "http://localhost:5000";
const TEST_PREFIXES = ["Quartier E2E", "Quartier Edit", "Quartier Delete"];

/** Remove neighborhoods left over by prior CRUD runs so the paginated list
 *  never fills up with test data. */
async function deleteTestNeighborhoods(accessToken: string): Promise<void> {
    const res = await fetch(`${API}/neighborhoods?limit=200`);
    if (!res.ok) return;
    const all = (await res.json()) as { _id: string; name: string }[];
    const leftovers = all.filter((n) =>
        TEST_PREFIXES.some((prefix) => n.name.startsWith(prefix)),
    );
    for (const neighborhood of leftovers) {
        await fetch(`${API}/neighborhoods/${neighborhood._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
        });
    }
}

test.describe("Admin — Quartiers (CRUD)", () => {
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
            await deleteTestNeighborhoods(adminAccessToken);
            apiAvailable = true;
        } catch (err) {
            // API or Docker not available — API-dependent tests will be skipped
        }
    });

    test.afterAll(async () => {
        if (apiAvailable) await deleteTestNeighborhoods(adminAccessToken);
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            "http://localhost:3001",
            adminAccessToken,
            adminRefreshToken,
        );
        await page.goto("neighborhoods");
        await expect(page).toHaveURL(/\/neighborhoods/);
    });

    test("shows neighborhoods page heading", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("heading", { name: /quartiers/i }),
        ).toBeVisible();
    });

    test("shows create neighborhood button", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await expect(
            page.getByRole("button", { name: /créer|ajouter|nouveau/i }).first(),
        ).toBeVisible();
    });

    test("creates a new neighborhood", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const name = `Quartier E2E ${Date.now()}`;
        await page
            .getByRole("button", { name: /créer|ajouter|nouveau/i }).first()
            .click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByLabel(/nom/i).first().fill(name);
        await page.getByLabel(/ville/i).fill("Paris");
        await page
            .getByRole("button", { name: /créer|enregistrer|confirmer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await page.getByTestId("neighborhood-search").fill(name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });
    });

    test("edits an existing neighborhood", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const original = `Quartier Edit ${Date.now()}`;
        const updated = `${original} MAJ`;

        await page
            .getByRole("button", { name: /créer|ajouter|nouveau/i }).first()
            .click();
        await page.getByLabel(/nom/i).first().fill(original);
        await page.getByLabel(/ville/i).fill("Paris");
        await page
            .getByRole("button", { name: /créer|enregistrer|confirmer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await page.getByTestId("neighborhood-search").fill(original);
        await expect(page.getByText(original)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: original });
        await row
            .getByRole("button", { name: /modifier|éditer|edit/i })
            .click();
        await page.getByLabel(/nom/i).first().clear();
        await page.getByLabel(/nom/i).first().fill(updated);
        await page
            .getByRole("button", {
                name: /enregistrer|sauvegarder|mettre à jour/i,
            })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await page.getByTestId("neighborhood-search").fill(updated);
        await expect(page.getByText(updated)).toBeVisible({ timeout: 5000 });
    });

    test("deletes a neighborhood", async ({ page }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const name = `Quartier Delete ${Date.now()}`;
        await page
            .getByRole("button", { name: /créer|ajouter|nouveau/i }).first()
            .click();
        await page.getByLabel(/nom/i).first().fill(name);
        await page.getByLabel(/ville/i).fill("Paris");
        await page
            .getByRole("button", { name: /créer|enregistrer|confirmer/i })
            .last()
            .click();
        await expect(page.getByRole("dialog")).not.toBeVisible({
            timeout: 5000,
        });
        await page.getByTestId("neighborhood-search").fill(name);
        await expect(page.getByText(name)).toBeVisible({ timeout: 5000 });

        const row = page.getByRole("row").filter({ hasText: name });
        await row.getByRole("button", { name: /supprimer|delete/i }).click();
        const confirmDialog = page.getByRole("alertdialog");
        await confirmDialog
            .getByRole("button", { name: /supprimer|delete/i })
            .click();

        await expect(
            page.getByRole("row").filter({ hasText: name }),
        ).not.toBeVisible({ timeout: 5000 });
    });
});
