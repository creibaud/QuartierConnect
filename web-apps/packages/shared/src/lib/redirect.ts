/** Sanitizes a post-login redirect path, rejecting open redirects and /login loops. */
export function sanitizeRedirectPath(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    if (!value.startsWith("/") || value.startsWith("//")) return undefined;
    if (value === "/login" || value.startsWith("/login?")) return undefined;
    return value;
}
