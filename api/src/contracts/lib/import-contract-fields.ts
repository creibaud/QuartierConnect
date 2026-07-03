import { BadRequestException } from "@nestjs/common";
import { SignatureZone, SignatureZoneKind } from "../schemas/contract.schema";

export const MAX_IMPORT_SIGNATORIES = 4;
export const MAX_IMPORT_PDF_BYTES = 10 * 1024 * 1024;

const COORDINATE_EPSILON = 1e-9;
const ZONE_KINDS = Object.values(SignatureZoneKind) as string[];

function parseJsonArray(raw: string, field: string): unknown[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new BadRequestException(`${field} must be valid JSON`);
    }
    if (!Array.isArray(parsed)) {
        throw new BadRequestException(`${field} must be a JSON array`);
    }
    return parsed;
}

export function parseSignatories(raw: string, callerId: string): string[] {
    const parsed = parseJsonArray(raw, "signatories");
    if (parsed.some((id) => typeof id !== "string" || id.length === 0)) {
        throw new BadRequestException(
            "signatories must contain non-empty user id strings",
        );
    }
    const ids = parsed as string[];
    if (ids.length < 1 || ids.length > MAX_IMPORT_SIGNATORIES) {
        throw new BadRequestException(
            `signatories must list 1 to ${MAX_IMPORT_SIGNATORIES} users`,
        );
    }
    if (new Set(ids).size !== ids.length) {
        throw new BadRequestException(
            "signatories must not contain duplicates",
        );
    }
    if (!ids.includes(callerId)) {
        throw new BadRequestException(
            "signatories must include the importing user",
        );
    }
    return ids;
}

function isNormalizedCoordinate(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function assertZoneShape(
    zone: Record<string, unknown>,
    index: number,
    signatories: string[],
): void {
    const label = `zones[${index}]`;
    if (!Number.isInteger(zone.page) || (zone.page as number) < 1) {
        throw new BadRequestException(`${label}.page must be an integer >= 1`);
    }
    for (const key of ["x", "y", "w", "h"] as const) {
        if (!isNormalizedCoordinate(zone[key])) {
            throw new BadRequestException(`${label}.${key} must be a number`);
        }
    }
    const { x, y, w, h } = zone as {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    if (x < 0 || x > 1 || y < 0 || y > 1) {
        throw new BadRequestException(
            `${label}: x and y must be within [0, 1]`,
        );
    }
    if (w <= 0 || w > 1 || h <= 0 || h > 1) {
        throw new BadRequestException(
            `${label}: w and h must be within (0, 1]`,
        );
    }
    if (x + w > 1 + COORDINATE_EPSILON || y + h > 1 + COORDINATE_EPSILON) {
        throw new BadRequestException(
            `${label}: the zone must fit inside the page (x+w <= 1, y+h <= 1)`,
        );
    }
    if (typeof zone.kind !== "string" || !ZONE_KINDS.includes(zone.kind)) {
        throw new BadRequestException(
            `${label}.kind must be one of: ${ZONE_KINDS.join(", ")}`,
        );
    }
    if (
        typeof zone.signerId !== "string" ||
        !signatories.includes(zone.signerId)
    ) {
        throw new BadRequestException(
            `${label}.signerId must be one of the signatories`,
        );
    }
}

export function parseSignatureZones(
    raw: string,
    signatories: string[],
): SignatureZone[] {
    const parsed = parseJsonArray(raw, "zones");
    if (parsed.length === 0) {
        throw new BadRequestException("zones must contain at least one zone");
    }
    const zones = parsed.map((entry, index) => {
        if (typeof entry !== "object" || entry === null) {
            throw new BadRequestException(`zones[${index}] must be an object`);
        }
        const zone = entry as Record<string, unknown>;
        assertZoneShape(zone, index, signatories);
        return {
            page: zone.page as number,
            x: zone.x as number,
            y: zone.y as number,
            w: zone.w as number,
            h: zone.h as number,
            signerId: zone.signerId as string,
            kind: zone.kind as SignatureZoneKind,
        };
    });
    const covered = new Set(zones.map((zone) => zone.signerId));
    const uncovered = signatories.filter((id) => !covered.has(id));
    if (uncovered.length > 0) {
        throw new BadRequestException(
            `Every signatory needs at least one zone (missing: ${uncovered.join(", ")})`,
        );
    }
    return zones;
}
