/* Geocoder labels (Nominatim display_name) list every administrative layer:
   "12, Rue de la Paix, Quartier X, Paris 10e Arrondissement, Paris,
   Île-de-France, France métropolitaine, 75010, France".
   Cards only need "12 Rue de la Paix, Paris 10e". */

const HOUSE_NUMBER_PATTERN = /^\d+\s*(?:bis|ter|quater)?$/i;
const ARRONDISSEMENT_PATTERN = /arrondissement/i;
const ARRONDISSEMENT_SUFFIX_PATTERN = /\s+arrondissement$/i;

export function formatAddress(rawAddress: string | null | undefined): string {
    if (!rawAddress) return "";
    const segments = rawAddress
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);
    if (segments.length === 0) return "";

    const streetSegmentCount = isHouseNumberFollowedByStreet(segments) ? 2 : 1;
    const street = segments.slice(0, streetSegmentCount).join(" ");
    const localitySegments = segments.slice(streetSegmentCount);
    if (localitySegments.length === 0) return street;

    return `${street}, ${pickLocality(localitySegments)}`;
}

function isHouseNumberFollowedByStreet(segments: string[]): boolean {
    return segments.length > 1 && HOUSE_NUMBER_PATTERN.test(segments[0]);
}

function pickLocality(segments: string[]): string {
    const arrondissement = segments.find((segment) =>
        ARRONDISSEMENT_PATTERN.test(segment),
    );
    const locality = arrondissement ?? segments[0];
    return locality.replace(ARRONDISSEMENT_SUFFIX_PATTERN, "");
}
