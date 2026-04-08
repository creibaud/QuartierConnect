import {
    clearTokens,
    decodeToken,
    getAccessToken,
    getRefreshToken,
    setTokens,
    type TokenPayload,
} from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

interface ApiError {
    statusCode: number;
    message: string;
    code?: string;
}

export async function refreshTokens(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
        clearTokens();
        return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
}

async function apiFetch(
    path: string,
    init: RequestInit = {},
    retry = true,
): Promise<Response> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

    // Public auth endpoints return 401 for wrong credentials — skip retry to avoid
    // navigating away from the login/register form on bad credentials.
    const isPublicAuthEndpoint = [
        "/auth/login",
        "/auth/register",
        "/auth/refresh",
    ].includes(path);
    if (res.status === 401 && retry && !isPublicAuthEndpoint) {
        const refreshed = await refreshTokens();
        if (refreshed) return apiFetch(path, init, false);
        clearTokens();
        window.location.href = "/login";
    }

    return res;
}

async function parseJsonSafely(res: Response): Promise<unknown> {
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) return null;
    return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
    const res = await apiFetch(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await parseJsonSafely(res);

    if (!res.ok) {
        const err = data as ApiError | null;
        throw Object.assign(new Error(err?.message ?? "Request failed"), {
            code: err?.code,
            status: res.status,
        });
    }

    return data as T;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
    const res = await apiFetch(path, {
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await parseJsonSafely(res);

    if (!res.ok) {
        const err = data as ApiError | null;
        throw Object.assign(new Error(err?.message ?? "Request failed"), {
            code: err?.code,
            status: res.status,
        });
    }

    return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: "GET" });
    const data = await parseJsonSafely(res);
    if (!res.ok) {
        const err = data as ApiError | null;
        throw Object.assign(new Error(err?.message ?? "Request failed"), {
            code: err?.code,
            status: res.status,
        });
    }
    return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: "DELETE" });
    if (res.status === 204) return undefined as T;
    const data = await res.json();
    if (!res.ok) {
        const err = data as ApiError;
        throw Object.assign(new Error(err.message ?? "Request failed"), {
            code: err.code,
            status: res.status,
        });
    }
    return data as T;
}

export async function apiUpload<T>(
    path: string,
    formData: FormData,
): Promise<T> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
        const err = data as ApiError;
        throw Object.assign(new Error(err.message ?? "Request failed"), {
            code: err.code,
            status: res.status,
        });
    }
    return data as T;
}

/**
 * Returns the current user, refreshing the access token if it has expired.
 * Use in async route `beforeLoad` guards instead of the synchronous `getCurrentUser()`.
 */
export async function ensureAuthenticated(): Promise<TokenPayload | null> {
    const accessToken = getAccessToken();
    if (accessToken) {
        try {
            const payload = decodeToken(accessToken);
            if (payload && payload.exp * 1000 > Date.now()) return payload;
        } catch {
            // malformed token — fall through to refresh
        }
    }

    const refreshed = await refreshTokens();
    if (!refreshed) return null;

    const newToken = getAccessToken();
    return newToken ? decodeToken(newToken) : null;
}
