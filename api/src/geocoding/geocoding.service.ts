import { Injectable, Logger } from "@nestjs/common";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "QuartierConnect/1.0 (contact: admin@quartierconnect.local)";
const MIN_INTERVAL_MS = 1100; // respecter la politique ~1 req/s

@Injectable()
export class GeocodingService {
    private readonly logger = new Logger(GeocodingService.name);
    private lastCall = 0;

    async geocode(
        address: string,
    ): Promise<{ lat: number; lng: number; displayName: string } | null> {
        await this.throttle();
        const url = `${ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
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

    private async throttle(): Promise<void> {
        const wait = this.lastCall + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        this.lastCall = Date.now();
    }
}
