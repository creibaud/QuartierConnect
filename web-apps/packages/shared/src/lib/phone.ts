const PHONE_SEPARATORS = /[\s.\-()]/g;
const LENIENT_E164 = /^\+?\d{6,15}$/;

/** Strips common separators (spaces, dots, dashes, parentheses). */
export function normalizePhone(raw: string): string {
    return raw.replace(PHONE_SEPARATORS, "");
}

/** Lenient E.164 check: optional "+", 6 to 15 digits, separators tolerated. */
export function isValidPhone(raw: string): boolean {
    return LENIENT_E164.test(normalizePhone(raw));
}
