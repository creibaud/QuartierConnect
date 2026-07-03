import type {
    SignatureZone,
    SignatureZoneKind,
} from "@workspace/shared/lib/types";

export const SIGNER_ZONE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-4)",
    "var(--chart-5)",
] as const;

export const DEFAULT_ZONE_SIZES: Record<
    SignatureZoneKind,
    { w: number; h: number }
> = {
    signature: { w: 0.24, h: 0.08 },
    initials: { w: 0.1, h: 0.06 },
};

export const MIN_ZONE_SIZE = { w: 0.04, h: 0.02 };

export function signerZoneColor(signerIndex: number): string {
    return SIGNER_ZONE_COLORS[signerIndex % SIGNER_ZONE_COLORS.length];
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/** Creates a zone of the default size centered on a normalized point. */
export function placeZone(params: {
    page: number;
    signerId: string;
    kind: SignatureZoneKind;
    centerX: number;
    centerY: number;
}): SignatureZone {
    const { w, h } = DEFAULT_ZONE_SIZES[params.kind];
    return {
        page: params.page,
        x: clamp(params.centerX - w / 2, 0, 1 - w),
        y: clamp(params.centerY - h / 2, 0, 1 - h),
        w,
        h,
        signerId: params.signerId,
        kind: params.kind,
    };
}

/** Translates a zone by normalized deltas, kept fully inside the page. */
export function moveZone(
    zone: SignatureZone,
    dx: number,
    dy: number,
): SignatureZone {
    return {
        ...zone,
        x: clamp(zone.x + dx, 0, 1 - zone.w),
        y: clamp(zone.y + dy, 0, 1 - zone.h),
    };
}

/** Resizes a zone from its top-left corner, within min size and page bounds. */
export function resizeZone(
    zone: SignatureZone,
    w: number,
    h: number,
): SignatureZone {
    return {
        ...zone,
        w: clamp(w, MIN_ZONE_SIZE.w, 1 - zone.x),
        h: clamp(h, MIN_ZONE_SIZE.h, 1 - zone.y),
    };
}

/** Returns the signer ids that do not have a single zone yet. */
export function signersMissingZones(
    signerIds: string[],
    zones: SignatureZone[],
): string[] {
    const covered = new Set(zones.map((zone) => zone.signerId));
    return signerIds.filter((id) => !covered.has(id));
}
