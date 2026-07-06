/**
 * Resolves a localized message for an auth API error.
 *
 * Known error codes are mapped to their translated message; anything else
 * falls back to a generic localized message. The raw backend message (which
 * is in English) is intentionally never surfaced to the user.
 */
export function resolveAuthErrorMessage(
    code: string | undefined,
    knownMessages: Record<string, string>,
    fallback: string,
): string {
    if (code && code in knownMessages) {
        return knownMessages[code];
    }
    return fallback;
}
