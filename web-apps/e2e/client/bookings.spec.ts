import { execSync } from "child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
    apiLogin,
    apiRegister,
    assignAddress,
    injectTokens,
    isConnectionError,
    uniqueEmail,
} from "../helpers/auth";

const API = "http://localhost:5000";
const BASE_URL = "http://localhost:3000";

const PG_CONTAINER = process.env.PG_CONTAINER ?? "docker-postgres-1";
const PG_USER = process.env.POSTGRES_USER ?? "qc";
const PG_DB = process.env.POSTGRES_DB ?? "quartierconnect";

// A 60 min offer costs 2 points; 20 covers the escrow reserved on accept.
const BOOKER_POINTS_CREDIT = 20;

test.use({ baseURL: BASE_URL });

interface BookingResponse {
    _id: string;
    serviceId: string;
    status: string;
    contractId?: string | null;
}

async function apiPostJson<T>(
    path: string,
    accessToken: string,
    body?: unknown,
): Promise<T> {
    const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
        throw new Error(
            `POST ${path} failed (${res.status}): ${await res.text()}`,
        );
    }
    return res.json() as Promise<T>;
}

async function apiGetJson<T>(path: string, accessToken: string): Promise<T> {
    const res = await fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(
            `GET ${path} failed (${res.status}): ${await res.text()}`,
        );
    }
    return res.json() as Promise<T>;
}

/** Create a paid offer whose derived price is 2 points (duration 60 min). */
async function createPaidService(
    providerAccessToken: string,
    title: string,
): Promise<string> {
    const service = await apiPostJson<{ _id: string }>(
        "/services",
        providerAccessToken,
        {
            title,
            description: "Aide au jardinage proposée pour le test e2e.",
            category: "gardening",
            type: "paid",
            direction: "offer",
            duration: 60,
        },
    );
    return service._id;
}

/** Credit points directly in Postgres; no-op when docker is unavailable. */
function creditPoints(email: string, amount: number): void {
    const sql =
        "WITH credited AS (" +
        "INSERT INTO points_transactions " +
        "(sender_id, recipient_id, amount, note, type, status, created_at, completed_at) " +
        `SELECT admin.id, u.id, ${amount}, 'Crédit e2e bookings', ` +
        "'bonus', 'completed', now(), now() " +
        "FROM users u, users admin " +
        `WHERE u.email='${email}' AND admin.email='admin@demo.fr' ` +
        "RETURNING recipient_id, amount) " +
        "INSERT INTO points_balances (user_id, balance) " +
        "SELECT recipient_id, amount FROM credited " +
        "ON CONFLICT (user_id) DO UPDATE " +
        "SET balance = points_balances.balance + excluded.balance, updated_at = now()";
    try {
        execSync(
            `docker exec ${PG_CONTAINER} psql -U "${PG_USER}" -d "${PG_DB}" -c "${sql}"`,
            { stdio: "pipe" },
        );
    } catch {
        // docker/psql unavailable; escrow stays pending
    }
}

async function ensurePendingBooking(
    bookerAccessToken: string,
    serviceId: string,
): Promise<BookingResponse> {
    const bookings = await apiGetJson<BookingResponse[]>(
        "/bookings",
        bookerAccessToken,
    );
    const pending = bookings.find(
        (b) => b.serviceId === serviceId && b.status === "pending",
    );
    if (pending) return pending;
    return apiPostJson<BookingResponse>("/bookings", bookerAccessToken, {
        serviceId,
    });
}

function cardWithTitle(page: Page, title: string): Locator {
    return page.locator('[data-slot="card"]').filter({ hasText: title });
}

function sentBookingCard(page: Page, serviceTitle: string): Locator {
    return page
        .getByRole("tabpanel")
        .locator('[data-slot="card"]')
        .filter({ hasText: serviceTitle });
}

test.describe("Client — Réservations", () => {
    let providerAccessToken: string;
    let bookerAccessToken: string;
    let bookerRefreshToken: string;
    let paidServiceId: string;
    let paidServiceTitle: string;
    let apiAvailable = false;

    test.beforeAll(async () => {
        try {
            const providerEmail = uniqueEmail();
            const providerSecret = await apiRegister(providerEmail);
            // Assign the address before login so the JWT carries the neighborhood.
            assignAddress(providerEmail);
            const providerTokens = await apiLogin(
                providerEmail,
                providerSecret,
                -30,
            );
            providerAccessToken = providerTokens.accessToken;

            paidServiceTitle = `Jardinage E2E ${Date.now()}`;
            paidServiceId = await createPaidService(
                providerAccessToken,
                paidServiceTitle,
            );

            const bookerEmail = uniqueEmail();
            const bookerSecret = await apiRegister(bookerEmail);
            assignAddress(bookerEmail);
            creditPoints(bookerEmail, BOOKER_POINTS_CREDIT);
            const bookerTokens = await apiLogin(bookerEmail, bookerSecret, -30);
            bookerAccessToken = bookerTokens.accessToken;
            bookerRefreshToken = bookerTokens.refreshToken;

            apiAvailable = true;
        } catch (err) {
            if (!isConnectionError(err)) throw err;
            // API not running, dependent tests are skipped
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!apiAvailable) return;
        await injectTokens(
            page,
            BASE_URL,
            bookerAccessToken,
            bookerRefreshToken,
        );
    });

    test("shows the paid service card with its reserve button", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/services");
        const card = cardWithTitle(page, paidServiceTitle);
        await expect(card).toBeVisible();
        await expect(
            card.getByRole("button", { name: "Réserver", exact: true }),
        ).toBeVisible();
    });

    test("reserving redirects to the sent tab with a pending booking", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        await page.goto("/services");
        await cardWithTitle(page, paidServiceTitle)
            .getByRole("button", { name: "Réserver", exact: true })
            .click();

        await page
            .getByRole("alertdialog")
            .getByRole("button", { name: "Réserver", exact: true })
            .click();

        await expect(
            page.getByText("Demande de réservation envoyée"),
        ).toBeVisible();
        await expect(page).toHaveURL(/\/bookings/);
        await expect(
            page.getByRole("tab", { name: /envoyées/i }),
        ).toHaveAttribute("aria-selected", "true");

        const bookingCard = sentBookingCard(page, paidServiceTitle);
        await expect(bookingCard).toBeVisible();
        await expect(bookingCard.getByText("En attente")).toBeVisible();
    });

    test("owner acceptance shows the accepted status and the contract link", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const booking = await ensurePendingBooking(
            bookerAccessToken,
            paidServiceId,
        );
        await apiPostJson(
            `/bookings/${booking._id}/accept`,
            providerAccessToken,
        );

        await page.goto("/bookings?tab=sent");
        const bookingCard = sentBookingCard(page, paidServiceTitle);
        await expect(bookingCard.getByText("Acceptée")).toBeVisible();
        await expect(
            bookingCard.getByRole("link", { name: "Voir le contrat" }),
        ).toBeVisible();
    });

    test("cancelling a sent booking from the UI marks it cancelled", async ({
        page,
    }) => {
        test.skip(!apiAvailable, "API not available — start the backend first");
        const secondServiceTitle = `Bricolage E2E ${Date.now()}`;
        const secondServiceId = await createPaidService(
            providerAccessToken,
            secondServiceTitle,
        );
        await apiPostJson<BookingResponse>("/bookings", bookerAccessToken, {
            serviceId: secondServiceId,
        });

        await page.goto("/bookings?tab=sent");
        const bookingCard = sentBookingCard(page, secondServiceTitle);
        await expect(bookingCard.getByText("En attente")).toBeVisible();
        await bookingCard
            .getByRole("button", { name: "Annuler", exact: true })
            .click();

        await expect(bookingCard.getByText("Annulée")).toBeVisible();
        await expect(
            bookingCard.getByRole("button", { name: "Annuler" }),
        ).not.toBeVisible();
    });
});
