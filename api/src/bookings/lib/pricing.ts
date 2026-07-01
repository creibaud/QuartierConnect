export function computeBasePoints(durationMinutes: number): number {
    if (!durationMinutes || durationMinutes < 30) return 1;
    return Math.max(1, Math.round(durationMinutes / 30));
}

export function computeServicePrice(p: {
    durationMinutes?: number;
    pointsMultiplier?: number;
    override?: number | null;
}): number {
    if (p.override !== undefined && p.override !== null) return p.override;
    const base = computeBasePoints(p.durationMinutes ?? 0);
    return Math.ceil(base * (p.pointsMultiplier ?? 1));
}
