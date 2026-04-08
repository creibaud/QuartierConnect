export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

const ACCESS_TOKEN_KEY = "qc_access_token";

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
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

export function decodeToken(token: string): TokenPayload | null {
    try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload)) as TokenPayload;
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
