const PHONE_SEPARATORS = /[\s.()-]/g;

export function normalizePhone(
    phone: string | null | undefined,
): string | null {
    if (!phone) return null;
    const normalized = phone.replace(PHONE_SEPARATORS, "");
    return normalized.length > 0 ? normalized : null;
}
