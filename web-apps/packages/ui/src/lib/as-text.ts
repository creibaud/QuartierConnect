/**
 * Extracts a plain string from an intlayer translation node.
 *
 * intlayer v8 returns function components (IntlayerNode) for each translated
 * value. React 19 does not accept bare functions as JSX children, so this
 * helper reads the `.value` property to get the underlying string.
 *
 * Use it for both HTML attribute props (placeholder, label) and JSX children.
 */
export function asText(value: unknown): string {
    if (typeof value === "string") return value;
    if (value !== null && value !== undefined) {
        const v = (value as Record<string, unknown>).value;
        if (typeof v === "string") return v;
    }
    return String(value ?? "");
}
