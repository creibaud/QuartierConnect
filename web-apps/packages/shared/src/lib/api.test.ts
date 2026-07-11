import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGetPage } from "./api";

describe("apiGetPage", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns data plus header-derived totals", async () => {
        const headers = new Headers({
            "content-type": "application/json",
            "X-Total-Count": "42",
            "X-Total-Pages": "3",
        });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify([{ id: 1 }]), {
                    status: 200,
                    headers,
                }),
            ),
        );

        const page = await apiGetPage<{ id: number }>("/users?limit=20");

        expect(page).toEqual({ data: [{ id: 1 }], total: 42, totalPages: 3 });
    });

    it("defaults totals when headers are absent", async () => {
        const headers = new Headers({ "content-type": "application/json" });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify([]), { status: 200, headers }),
            ),
        );

        const page = await apiGetPage("/users");

        expect(page).toEqual({ data: [], total: 0, totalPages: 1 });
    });
});
