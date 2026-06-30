export type CommunityMarkerVariant =
    | "serviceOffer"
    | "serviceRequest"
    | "event"
    | "incident"
    | "home";

export interface CommunityMarker {
    key: string;
    variant: CommunityMarkerVariant;
    position: [number, number];
    title: string;
}

interface GeoLoc {
    coordinates: [number, number];
}

export function entitiesToMarkers(input: {
    services: Array<{ _id: string; title: string; direction: string; location?: GeoLoc | null }>;
    events: Array<{ _id: string; title: string; location?: GeoLoc | null }>;
    incidents: Array<{ id: string; title: string; category: string; lat: number | null; lng: number | null }>;
    home: { lat: number; lng: number } | null;
}): CommunityMarker[] {
    const markers: CommunityMarker[] = [];

    for (const service of input.services) {
        if (!service.location) continue;
        const [lng, lat] = service.location.coordinates;
        markers.push({
            key: `service:${service._id}`,
            variant: service.direction === "request" ? "serviceRequest" : "serviceOffer",
            position: [lat, lng],
            title: service.title,
        });
    }

    for (const event of input.events) {
        if (!event.location) continue;
        const [lng, lat] = event.location.coordinates;
        markers.push({
            key: `event:${event._id}`,
            variant: "event",
            position: [lat, lng],
            title: event.title,
        });
    }

    for (const incident of input.incidents) {
        if (incident.category !== "neighborhood") continue;
        if (incident.lat == null || incident.lng == null) continue;
        markers.push({
            key: `incident:${incident.id}`,
            variant: "incident",
            position: [incident.lat, incident.lng],
            title: incident.title,
        });
    }

    if (input.home) {
        markers.push({
            key: "home",
            variant: "home",
            position: [input.home.lat, input.home.lng],
            title: "home",
        });
    }

    return markers;
}
