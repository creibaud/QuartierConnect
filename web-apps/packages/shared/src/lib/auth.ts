export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

const ACCESS_TOKEN_KEY = "qc_access_token";

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    exp: number;
}

export function setTokens(accessToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function base64UrlToBytes(encoded: string): Uint8Array {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
    );
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        const json = new TextDecoder().decode(base64UrlToBytes(payload));
        return JSON.parse(json) as TokenPayload;
    } catch {
        return null;
    }
}

export function isTokenExpired(token: string): boolean {
    const payload = decodeToken(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
}

export function getCurrentUser(): TokenPayload | null {
    const token = getAccessToken();
    if (!token || isTokenExpired(token)) return null;
    return decodeToken(token);
}
