import { Injectable, Logger } from "@nestjs/common";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "QuartierConnect/1.0 (contact: admin@quartierconnect.local)";
const MIN_INTERVAL_MS = 1100; // respecter la politique ~1 req/s

export interface SearchOptions {
    /** Preferred label language (i18n locale, e.g. "fr" | "en"). */
    lang?: string;
    /** Soft geographic bias `minLon,minLat,maxLon,maxLat` (NOT bounded — results
        outside still appear, just ranked lower). */
    viewbox?: string;
}

@Injectable()
export class GeocodingService {
    private readonly logger = new Logger(GeocodingService.name);
    private lastCall = 0;

    async geocode(
        address: string,
    ): Promise<{ lat: number; lng: number; displayName: string } | null> {
        await this.throttle();
        const url = `${ENDPOINT}?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(address)}`;
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": USER_AGENT },
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return null;
            const data = (await res.json()) as Array<{
                lat: string;
                lon: string;
                display_name: string;
            }>;
            if (!data.length) return null;
            return {
                lat: Number(data[0].lat),
                lng: Number(data[0].lon),
                displayName: data[0].display_name,
            };
        } catch (err) {
            this.logger.warn(`Geocoding failed: ${String(err)}`);
            return null;
        }
    }

    async search(
        query: string,
        opts: SearchOptions = {},
    ): Promise<Array<{ label: string; lat: number; lng: number }>> {
        await this.throttle();
        const params = new URLSearchParams({
            format: "jsonv2",
            limit: "8",
            "accept-language": opts.lang || "fr",
            q: query,
        });
        // Soft bias only — no `bounded`/`countrycodes`, so the user can still
        // find addresses outside their area.
        if (opts.viewbox) params.set("viewbox", opts.viewbox);
        const url = `${ENDPOINT}?${params.toString()}`;
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": USER_AGENT },
                signal: AbortSignal.timeout(5000),
            });
            if (!res.ok) return [];
            const data = (await res.json()) as Array<{
                lat: string;
                lon: string;
                display_name: string;
            }>;
            return data.map((d) => ({
                label: d.display_name,
                lat: Number(d.lat),
                lng: Number(d.lon),
            }));
        } catch (err) {
            this.logger.warn(`Geocoding search failed: ${String(err)}`);
            return [];
        }
    }

    private async throttle(): Promise<void> {
        const wait = this.lastCall + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        this.lastCall = Date.now();
    }
}
