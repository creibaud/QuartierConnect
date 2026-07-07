import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshTokens } from "../api";

describe("refreshTokens — concurrence", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("ne déclenche qu'un seul appel /auth/refresh pour des refresh concurrents", async () => {
        let refreshCalls = 0;
        const fetchMock = vi.fn(async (url: string) => {
            if (String(url).endsWith("/auth/refresh")) {
                refreshCalls += 1;
                await new Promise((resolve) => setTimeout(resolve, 20));
                return {
                    ok: true,
                    json: async () => ({ accessToken: "new.access.token" }),
                } as Response;
            }
            return { ok: false, status: 404 } as Response;
        });
        vi.stubGlobal("fetch", fetchMock);

        const results = await Promise.all([
            refreshTokens(),
            refreshTokens(),
            refreshTokens(),
            refreshTokens(),
            refreshTokens(),
        ]);

        expect(refreshCalls).toBe(1);
        expect(results).toEqual([true, true, true, true, true]);
        expect(localStorage.getItem("qc_access_token")).toBe("new.access.token");
    });

    it("relance un nouvel appel réseau pour un refresh ultérieur (pas de cache figé)", async () => {
        let refreshCalls = 0;
        const fetchMock = vi.fn(async (url: string) => {
            if (String(url).endsWith("/auth/refresh")) {
                refreshCalls += 1;
                return {
                    ok: true,
                    json: async () => ({ accessToken: `token-${refreshCalls}` }),
                } as Response;
            }
            return { ok: false, status: 404 } as Response;
        });
        vi.stubGlobal("fetch", fetchMock);

        await refreshTokens();
        await refreshTokens();

        expect(refreshCalls).toBe(2);
    });
});
