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
