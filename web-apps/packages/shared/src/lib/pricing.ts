export interface ServicePricingFields {
    duration?: number;
    pointsMultiplier?: number;
    pointsAmount?: number | null;
}

export function computeBasePoints(durationMinutes: number): number {
    if (!durationMinutes || durationMinutes < 30) return 1;
    return Math.max(1, Math.round(durationMinutes / 30));
}

/* Mirrors api/src/bookings/lib/pricing.ts so the price of a paid service can
   be shown before any booking exists. */
export function computeServicePoints(service: ServicePricingFields): number {
    if (service.pointsAmount != null) return service.pointsAmount;
    const base = computeBasePoints(service.duration ?? 0);
    return Math.ceil(base * (service.pointsMultiplier ?? 1));
}
