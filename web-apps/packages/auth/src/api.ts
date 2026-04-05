/// <reference types="vite/client" />
import type { AuthSession, LoginResult } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function extractErrorMessage(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { message?: string | string[] };
        const raw = body.message;
        if (Array.isArray(raw)) return raw[0] ?? "Une erreur est survenue";
        return raw ?? "Une erreur est survenue";
    } catch {
        return "Une erreur est survenue";
    }
}

export async function login(
    email: string,
    password: string,
): Promise<LoginResult> {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json() as Promise<LoginResult>;
}

export async function completeTotpLogin(
    totpToken: string,
    code: string,
): Promise<AuthSession> {
    const response = await fetch(`${API_URL}/auth/totp/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ totpToken, code }),
    });

    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json() as Promise<AuthSession>;
}

export async function register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
): Promise<AuthSession> {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
    });

    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json() as Promise<AuthSession>;
}

export async function refreshTokens(): Promise<AuthSession> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

    if (!response.ok) throw new Error(await extractErrorMessage(response));
    return response.json() as Promise<AuthSession>;
}

export async function logout(accessToken: string): Promise<void> {
    await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
    }).catch(() => undefined);
}

export async function apiFetch(
    path: string,
    accessToken: string | null,
    init?: RequestInit,
): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return fetch(`${API_URL}${path}`, {
        ...init,
        headers,
        credentials: "include",
    });
}

/**
 * Broadcasts login session to local desktop app via SessionServer (http://localhost:9090)
 * This enables seamless SSO: user logs in to web, desktop app automatically gets the session
 */
export async function syncSessionToDesktop(session: AuthSession): Promise<void> {
    try {
        const response = await fetch("http://localhost:9090/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(session),
        });

        if (response.ok) {
            console.log("✅ Session synced to desktop app.");
        } else {
            // Desktop app not running - that's fine, web login still works
            console.log("ℹ️  Desktop app not accessible (not running?). Web session saved locally.");
        }
    } catch (error) {
        // Desktop session server not available - not an error, web works fine standalone
        console.log("ℹ️  Desktop session server unavailable. Continuing with web-only session.");
    }
}

/**
 * Legacy: Handles SSO callback with URI scheme (deprecated)
 * Kept for backward compatibility but no longer used in new SSO architecture
 */
export function redirectToSSOCallback(session: AuthSession): void {
    const params = new URLSearchParams(window.location.search);
    const callbackUri = params.get("callbackUri");

    if (!callbackUri) return;

    const userJson = encodeURIComponent(JSON.stringify(session.user));
    const redirectUrl = `${callbackUri}?token=${encodeURIComponent(session.accessToken)}&refreshToken=${encodeURIComponent(session.refreshToken || "")}&user=${userJson}`;

    window.location.href = redirectUrl;
}
