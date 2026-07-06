/**
 * Sanitizes a post-login destination taken from the URL.
 *
 * Only internal application paths are accepted: absolute URLs
 * (https://evil.tld) and scheme-relative ones (//evil.tld) would be open
 * redirects, and /login itself would loop. Anything rejected falls back to
 * the caller's default destination.
 */
export function sanitizeRedirectPath(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    if (!value.startsWith("/") || value.startsWith("//")) return undefined;
    if (value === "/login" || value.startsWith("/login?")) return undefined;
    return value;
}
