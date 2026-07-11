export function isTabular(result: unknown): result is Record<string, unknown>[] {
    return (
        Array.isArray(result) &&
        result.length > 0 &&
        result.every(
            (r) => r !== null && typeof r === "object" && !Array.isArray(r),
        )
    );
}

export function cellValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v);
}
