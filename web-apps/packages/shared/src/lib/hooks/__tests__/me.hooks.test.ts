import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as api from "../../api";
import * as auth from "../../auth";
import {
    useChangeEmail,
    useChangePassword,
    useChangePhone,
    useDeleteMyAccount,
    useMyDataExport,
} from "../useMe";

vi.mock("../../api", () => ({
    apiGet: vi.fn(),
    apiDelete: vi.fn(),
    apiPatch: vi.fn(),
}));
vi.mock("../../auth", () => ({
    clearTokens: vi.fn(),
}));

// jsdom's window.location.href is read-only; make it writable for the redirect.
Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "" },
});

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useMyDataExport", () => {
    beforeEach(() => vi.clearAllMocks());

    it("fetches RGPD export data", async () => {
        const exportData = {
            email: "alice@test.fr",
            incidents: [],
            points: [],
        };
        vi.mocked(api.apiGet).mockResolvedValue(exportData);
        const { result } = renderHook(() => useMyDataExport(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(exportData);
        expect(api.apiGet).toHaveBeenCalledWith("/users/me/export");
    });

    it("enters error state on API failure", async () => {
        vi.mocked(api.apiGet).mockRejectedValue(new Error("Unauthorized"));
        const { result } = renderHook(() => useMyDataExport(), {
            wrapper: createWrapper(),
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe("useDeleteMyAccount", () => {
    beforeEach(() => vi.clearAllMocks());

    it("calls DELETE /users/me and clears tokens on success", async () => {
        vi.mocked(api.apiDelete).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useDeleteMyAccount(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync("123456");
        });
        expect(api.apiDelete).toHaveBeenCalledWith("/users/me", {
            totpCode: "123456",
        });
        expect(auth.clearTokens).toHaveBeenCalled();
    });

    it("redirects to /login after deletion", async () => {
        vi.mocked(api.apiDelete).mockResolvedValue({ success: true });
        window.location.href = "";
        const { result } = renderHook(() => useDeleteMyAccount(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync("123456");
        });
        expect(window.location.href).toBe("/login");
    });
});

describe("useChangePassword", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends the current password, new password and TOTP code", async () => {
        vi.mocked(api.apiPatch).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useChangePassword(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync({
                currentPassword: "OldPass1!",
                newPassword: "NewPass1!",
                totpCode: "123456",
            });
        });
        expect(api.apiPatch).toHaveBeenCalledWith("/users/me/password", {
            currentPassword: "OldPass1!",
            newPassword: "NewPass1!",
            totpCode: "123456",
        });
    });
});

describe("useChangeEmail", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends the new email, password and TOTP code", async () => {
        vi.mocked(api.apiPatch).mockResolvedValue({ requiresReauth: true });
        const { result } = renderHook(() => useChangeEmail(), {
            wrapper: createWrapper(),
        });
        let response: { requiresReauth: boolean } | undefined;
        await act(async () => {
            response = await result.current.mutateAsync({
                newEmail: "new@test.fr",
                password: "Demo1234!",
                totpCode: "123456",
            });
        });
        expect(api.apiPatch).toHaveBeenCalledWith("/users/me/email", {
            newEmail: "new@test.fr",
            password: "Demo1234!",
            totpCode: "123456",
        });
        expect(response).toEqual({ requiresReauth: true });
    });
});

describe("useChangePhone", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends the phone number with the TOTP code", async () => {
        vi.mocked(api.apiPatch).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useChangePhone(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync({
                phone: "+33612345678",
                totpCode: "123456",
            });
        });
        expect(api.apiPatch).toHaveBeenCalledWith("/users/me/phone", {
            phone: "+33612345678",
            totpCode: "123456",
        });
    });

    it("sends null to clear the phone number", async () => {
        vi.mocked(api.apiPatch).mockResolvedValue({ success: true });
        const { result } = renderHook(() => useChangePhone(), {
            wrapper: createWrapper(),
        });
        await act(async () => {
            await result.current.mutateAsync({
                phone: null,
                totpCode: "123456",
            });
        });
        expect(api.apiPatch).toHaveBeenCalledWith("/users/me/phone", {
            phone: null,
            totpCode: "123456",
        });
    });
});
