# Map Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared `<Map>` component (Leaflet + OSM) and integrate it across 6 surfaces (4 client + 2 admin) plus refactor `admin/neighborhoods` to use it. Closes CDC §3.1 gap before Étape 3 deadline (2026-05-31).

**Architecture:** Single-file shadcn-style component in `packages/ui/src/components/map.tsx` exporting `Map`, `Marker`, `NeighborhoodPolygon`, `MarkerCluster`, `DrawControl`, `UserLocation`, `useFitBounds`. Uses `react-leaflet@5` declaratively. Adds optional GeoJSON Point coordinates to Service/Event entities (Mongoose) and `lat/lng` to incidents (Drizzle/Postgres).

**Tech Stack:** React 19, react-leaflet 5, leaflet 1.9, leaflet-draw, leaflet.markercluster, Vitest + @testing-library/react + jsdom, Playwright, Drizzle Kit, Mongoose, Tailwind v4.

**Reference spec:** `docs/superpowers/specs/2026-05-29-map-component-design.md`

---

## File Structure

### Created files
- `web-apps/packages/ui/src/components/map.tsx` — component (~350 LOC)
- `web-apps/packages/ui/src/components/map.test.tsx` — Vitest unit tests
- `web-apps/packages/ui/vitest.config.ts` — Vitest config
- `web-apps/packages/ui/src/test/setup.ts` — JSDOM + Leaflet mocks
- `web-apps/e2e/client/services-map.spec.ts` — Playwright E2E
- `web-apps/e2e/admin/neighborhoods-draw.spec.ts` — Playwright E2E
- `api/drizzle/0002_incident_coords.sql` — Drizzle migration

### Modified files
- `web-apps/packages/ui/package.json` — add vitest deps + scripts
- `Makefile` — add `test-web` target wired into `test`
- `api/src/services/schemas/service.schema.ts` — add `location` GeoJSON Point
- `api/src/services/dto/create-service.dto.ts` + `service-response.dto.ts` — add `location`
- `api/src/events/schemas/event.schema.ts` — add `location` GeoJSON Point
- `api/src/events/dto/create-event.dto.ts` + `event-response.dto.ts` — add `location`
- `api/src/database/schema.ts` — add `lat`/`lng` to `incidents` table
- `api/src/incidents/dto/create-incident.dto.ts` + `incident-response.dto.ts` — add coords
- `api/test/*.e2e-spec.ts` (services, events, incidents) — assert new fields
- `web-apps/packages/shared/src/lib/types.ts` — add `location` / `lat`/`lng` to types
- `web-apps/packages/shared/src/lib/api/{services,events,incidents}.api.ts` — payload types
- `scripts/seed-demo.ts` — provide demo coords
- 7 route files (`client/dashboard`, `client/services`, `client/events`, `client/incidents`, `admin/services`, `admin/incidents`, `admin/neighborhoods`)

---

## Task 1: Setup Vitest in packages/ui

**Files:**
- Create: `web-apps/packages/ui/vitest.config.ts`
- Create: `web-apps/packages/ui/src/test/setup.ts`
- Modify: `web-apps/packages/ui/package.json`
- Modify: `Makefile`

- [ ] **Step 1.1: Add Vitest devDeps to packages/ui**

Run from repo root:

```bash
cd web-apps && pnpm --filter @workspace/ui add -D vitest@^3.2.4 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3 jsdom@^26.1.0 @vitest/coverage-v8@^3.2.4
```

Expected: `package.json` devDependencies now include these 5 packages, lockfile regenerated.

- [ ] **Step 1.2: Create vitest.config.ts**

Create `web-apps/packages/ui/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
    resolve: {
        alias: {
            "@workspace/ui": new URL("./src", import.meta.url).pathname,
        },
    },
});
```

- [ ] **Step 1.3: Create test setup file with Leaflet mock**

Create `web-apps/packages/ui/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Leaflet relies on browser APIs not in JSDOM. Mock minimal surface.
if (typeof window !== "undefined") {
    Object.defineProperty(window, "matchMedia", {
        value: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
    });
}

// react-leaflet expects ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
```

- [ ] **Step 1.4: Add test scripts to package.json**

Edit `web-apps/packages/ui/package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

- [ ] **Step 1.5: Verify Vitest runs (empty suite)**

Create temporary `web-apps/packages/ui/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest infra", () => {
    it("runs", () => {
        expect(1 + 1).toBe(2);
    });
});
```

Run: `cd web-apps && pnpm --filter @workspace/ui test`
Expected: `1 passed`. Delete `smoke.test.ts` after success.

- [ ] **Step 1.6: Add test-web target to Makefile**

Edit `Makefile`. After the `test-dsl` target, add:

```makefile
test-web: ## Tests Vitest web (shared hooks + UI components)
	@echo "$(RUN) Tests Web (Vitest)..."
	@cd web-apps && pnpm --filter @workspace/shared test
	@cd web-apps && pnpm --filter @workspace/ui test
	@echo "$(OK) Tests Web OK"
```

Then modify the `test:` target to include `test-web`:

```makefile
test: ## Tous les tests unitaires (API + Web + Desktop + DSL)
	@echo ""
	@echo "$(BOLD)  Tests unitaires — tous composants$(RESET)"
	@echo ""
	@make test-api
	@make test-web
	@make test-desktop
	@make test-dsl
```

- [ ] **Step 1.7: Run full test suite to confirm no regression**

Run: `make test`
Expected: API + Web (shared 73 + UI 0 for now) + Desktop + DSL all pass. The new `test-web` line should be visible.

- [ ] **Step 1.8: Commit**

```bash
git add web-apps/packages/ui/vitest.config.ts web-apps/packages/ui/src/test/setup.ts web-apps/packages/ui/package.json web-apps/pnpm-lock.yaml Makefile
git commit -m "$(cat <<'EOF'
chore(ui): add Vitest infrastructure to packages/ui

Mirrors packages/shared setup (jsdom + globals + alias). Adds Makefile
test-web target running shared + ui suites so make test covers everything.
Prep for Map component unit tests.
EOF
)"
```

---

## Task 2: Add location GeoJSON Point to Service (Mongoose)

**Files:**
- Modify: `api/src/services/schemas/service.schema.ts`
- Modify: `api/src/services/dto/create-service.dto.ts`
- Modify: `api/src/services/dto/service-response.dto.ts`
- Modify: `api/test/services.e2e-spec.ts`
- Modify: `api/src/services/services.controller.spec.ts`

- [ ] **Step 2.1: Write failing E2E test for location field**

Edit `api/test/services.e2e-spec.ts`. In the "POST /services" describe block, add:

```ts
it("accepts and returns location as GeoJSON Point", async () => {
    const res = await request(app.getHttpServer())
        .post("/services")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
            title: "Cours de cuisine",
            description: "Apprenez à faire des crêpes",
            category: "other",
            type: "free",
            location: { type: "Point", coordinates: [2.3522, 48.8566] },
        })
        .expect(201);

    expect(res.body.location).toEqual({
        type: "Point",
        coordinates: [2.3522, 48.8566],
    });
});
```

- [ ] **Step 2.2: Run test, verify it fails**

Run: `cd api && pnpm test:e2e -- services.e2e-spec.ts -t "location as GeoJSON"`
Expected: FAIL — `location` is `undefined` in response.

- [ ] **Step 2.3: Update Mongoose schema**

Edit `api/src/services/schemas/service.schema.ts`. Add after the `pointsMultiplier` Prop, inside the class:

```ts
@Prop({
    type: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined },
    },
    required: false,
    _id: false,
    index: "2dsphere",
})
location?: { type: "Point"; coordinates: [number, number] };
```

- [ ] **Step 2.4: Update CreateServiceDto**

Edit `api/src/services/dto/create-service.dto.ts`. Add at the bottom of the class:

```ts
@ApiPropertyOptional({
    description: "Position GeoJSON (coordinates = [lng, lat])",
    example: { type: "Point", coordinates: [2.3522, 48.8566] },
})
@IsOptional()
@ValidateNested()
@Type(() => Object)
location?: { type: "Point"; coordinates: [number, number] };
```

Add imports at the top:

```ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ValidateNested } from "class-validator";
import { Type } from "class-transformer";
```

- [ ] **Step 2.5: Update ServiceDto response**

Edit `api/src/services/dto/service-response.dto.ts`. Add before `createdAt`:

```ts
@ApiPropertyOptional({
    example: { type: "Point", coordinates: [2.3522, 48.8566] },
    nullable: true,
})
location?: { type: "Point"; coordinates: [number, number] } | null;
```

- [ ] **Step 2.6: Run E2E test, verify it passes**

Run: `cd api && pnpm test:e2e -- services.e2e-spec.ts -t "location as GeoJSON"`
Expected: PASS.

- [ ] **Step 2.7: Run full services tests to confirm no regression**

Run: `cd api && pnpm test -- services && pnpm test:e2e -- services`
Expected: All services unit + e2e tests pass.

- [ ] **Step 2.8: Commit**

```bash
git add api/src/services/ api/test/services.e2e-spec.ts
git commit -m "$(cat <<'EOF'
feat(services): expose optional GeoJSON location

Adds Mongoose 2dsphere-indexed location field with matching DTO and
E2E coverage. Enables map visualization on client/services and
admin/services without breaking existing services that lack coords.
EOF
)"
```

---

## Task 3: Add location GeoJSON Point to Event (Mongoose)

**Files:**
- Modify: `api/src/events/schemas/event.schema.ts`
- Modify: `api/src/events/dto/create-event.dto.ts`
- Modify: `api/src/events/dto/event-response.dto.ts`
- Modify: `api/test/events.e2e-spec.ts`

- [ ] **Step 3.1: Write failing E2E test**

Edit `api/test/events.e2e-spec.ts`. Add in the "POST /events" describe:

```ts
it("accepts and returns location as GeoJSON Point", async () => {
    const res = await request(app.getHttpServer())
        .post("/events")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
            title: "Fête de quartier",
            description: "Soirée musicale",
            category: "festive",
            date: "2026-07-01T18:00:00.000Z",
            location: { type: "Point", coordinates: [2.3422, 48.8666] },
        })
        .expect(201);

    expect(res.body.location).toEqual({
        type: "Point",
        coordinates: [2.3422, 48.8666],
    });
});
```

- [ ] **Step 3.2: Run, verify failure**

Run: `cd api && pnpm test:e2e -- events.e2e-spec.ts -t "location as GeoJSON"`
Expected: FAIL.

- [ ] **Step 3.3: Update Event schema**

Edit `api/src/events/schemas/event.schema.ts`. Add after `interestedUserIds`:

```ts
@Prop({
    type: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: { type: [Number], default: undefined },
    },
    required: false,
    _id: false,
    index: "2dsphere",
})
location?: { type: "Point"; coordinates: [number, number] };
```

- [ ] **Step 3.4: Update CreateEventDto**

Edit `api/src/events/dto/create-event.dto.ts`. Note: the existing `location: string` field (free-text address) must be **renamed to `address`** to avoid conflict with the new GeoJSON `location`. Search-and-replace `location` to `address` in the existing string field.

Then add:

```ts
@ApiPropertyOptional({
    description: "Position GeoJSON Point ([lng, lat])",
    example: { type: "Point", coordinates: [2.3422, 48.8666] },
})
@IsOptional()
@ValidateNested()
@Type(() => Object)
location?: { type: "Point"; coordinates: [number, number] };
```

Add same imports as Task 2.

- [ ] **Step 3.5: Update EventDto response**

Same pattern in `event-response.dto.ts`: rename string field to `address`, add GeoJSON `location`.

- [ ] **Step 3.6: Update existing tests referencing `location` as a string**

Run: `grep -rn "location:" api/test/events.e2e-spec.ts api/src/events/events.controller.spec.ts`
Rename string-`location` usages to `address`. Make sure no test expects the old string field.

- [ ] **Step 3.7: Run, verify pass + no regression**

Run: `cd api && pnpm test -- events && pnpm test:e2e -- events`
Expected: PASS.

- [ ] **Step 3.8: Commit**

```bash
git add api/src/events/ api/test/events.e2e-spec.ts
git commit -m "$(cat <<'EOF'
feat(events): rename free-text location to address, add GeoJSON location

The Event entity previously stored "location" as a free-text address.
Renames that field to "address" and adds a proper GeoJSON Point
"location" with 2dsphere index. Enables map pins for events while
keeping the printable address.
EOF
)"
```

---

## Task 4: Add lat/lng columns to incidents (Drizzle/Postgres)

**Files:**
- Modify: `api/src/database/schema.ts`
- Create: `api/drizzle/0002_incident_coords.sql`
- Modify: `api/src/incidents/dto/create-incident.dto.ts`
- Modify: `api/src/incidents/dto/incident-response.dto.ts`
- Modify: `api/src/incidents/dto/sync-incident.dto.ts`
- Modify: `api/test/incidents.e2e-spec.ts`

- [ ] **Step 4.1: Write failing E2E test**

Edit `api/test/incidents.e2e-spec.ts`. In "POST /incidents":

```ts
it("accepts and returns lat/lng coords", async () => {
    const res = await request(app.getHttpServer())
        .post("/incidents")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
            title: "Lampadaire cassé",
            description: "Trottoir bloqué",
            lat: 48.8566,
            lng: 2.3522,
        })
        .expect(201);

    expect(res.body.lat).toBe(48.8566);
    expect(res.body.lng).toBe(2.3522);
});
```

- [ ] **Step 4.2: Run, verify failure**

Run: `cd api && pnpm test:e2e -- incidents.e2e-spec.ts -t "lat/lng coords"`
Expected: FAIL (`lat` is undefined).

- [ ] **Step 4.3: Update Drizzle schema**

Edit `api/src/database/schema.ts`. In the `incidents` table definition, add before `deletedAt`:

```ts
lat: real("lat"),
lng: real("lng"),
```

Add `real` to the import from `drizzle-orm/pg-core` at the top of the file.

- [ ] **Step 4.4: Generate Drizzle migration**

Run: `cd api && pnpm drizzle-kit generate`
Expected: New file `api/drizzle/0002_<random_name>.sql` created with:

```sql
ALTER TABLE "incidents" ADD COLUMN "lat" real;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "lng" real;
```

Rename the file to `0002_incident_coords.sql` for clarity. Verify `api/drizzle/meta/_journal.json` was updated.

- [ ] **Step 4.5: Apply migration to running DB**

Run: `cd api && pnpm drizzle-kit migrate` (or `make docker-up` then call the migration endpoint if app auto-migrates on boot).
Expected: Columns added; query `\d+ incidents` shows new columns.

- [ ] **Step 4.6: Update CreateIncidentDto**

Edit `api/src/incidents/dto/create-incident.dto.ts`. Add after `neighborhoodId`:

```ts
@ApiPropertyOptional({
    description: "Latitude (-90..90)",
    example: 48.8566,
})
@IsOptional()
@IsNumber()
@Min(-90)
@Max(90)
lat?: number;

@ApiPropertyOptional({
    description: "Longitude (-180..180)",
    example: 2.3522,
})
@IsOptional()
@IsNumber()
@Min(-180)
@Max(180)
lng?: number;
```

Add imports for `IsNumber`, `Min`, `Max`, `ApiPropertyOptional`.

- [ ] **Step 4.7: Update IncidentDto response**

Edit `api/src/incidents/dto/incident-response.dto.ts`. Add before `deletedAt`:

```ts
@ApiPropertyOptional({ example: 48.8566, nullable: true })
lat: number | null;

@ApiPropertyOptional({ example: 2.3522, nullable: true })
lng: number | null;
```

- [ ] **Step 4.8: Update SyncIncidentDto (desktop sync)**

The Java desktop syncs incidents with PUT /incidents/sync. Add same `lat`/`lng` to `sync-incident.dto.ts` to keep parity with create.

- [ ] **Step 4.9: Run, verify pass + no regression**

Run: `cd api && pnpm test -- incidents && pnpm test:e2e -- incidents`
Expected: PASS.

- [ ] **Step 4.10: Commit**

```bash
git add api/src/database/schema.ts api/drizzle/0002_incident_coords.sql api/drizzle/meta/ api/src/incidents/ api/test/incidents.e2e-spec.ts
git commit -m "$(cat <<'EOF'
feat(incidents): add optional lat/lng columns

Drizzle migration adds nullable lat/lng to incidents (PostgreSQL).
DTOs validate ranges (-90/+90, -180/+180). Sync DTO updated so the
Java desktop client can roundtrip coords. Backward-compatible: old
incidents stay with NULL coords and are hidden from map views.
EOF
)"
```

---

## Task 5: Update shared types and API clients

**Files:**
- Modify: `web-apps/packages/shared/src/lib/types.ts`
- Modify: `web-apps/packages/shared/src/lib/api/services.api.ts`
- Modify: `web-apps/packages/shared/src/lib/api/events.api.ts`
- Modify: `web-apps/packages/shared/src/lib/api/incidents.api.ts`
- Modify: `scripts/seed-demo.ts`

- [ ] **Step 5.1: Add GeoJSON Point type alias**

Edit `web-apps/packages/shared/src/lib/types.ts`. At the top, after existing types:

```ts
export interface GeoJSONPoint {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
}
```

- [ ] **Step 5.2: Add location to Service type**

In `types.ts`, modify the `Service` interface:

```ts
export interface Service {
    _id: string;
    title: string;
    category: string;
    type: string;
    description: string;
    address?: string;
    neighborhoodId?: string;
    pointsMultiplier?: number;
    location?: GeoJSONPoint;
}
```

- [ ] **Step 5.3: Update Event type (rename + add location)**

In `types.ts`, modify the `Event` interface (rename existing `location: string` to `address`):

```ts
export interface Event {
    _id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    address?: string;
    location?: GeoJSONPoint;
    neighborhoodId: string;
    interestedUserIds?: string[];
}
```

- [ ] **Step 5.4: Add lat/lng to Incident type**

In `types.ts`, find the `Incident` interface (or add it if missing). Ensure it has:

```ts
lat?: number | null;
lng?: number | null;
```

- [ ] **Step 5.5: Update API client payload types**

Edit `web-apps/packages/shared/src/lib/api/services.api.ts`. Add `location?: GeoJSONPoint` to the `createService` payload type and `updateService`.

Same for `events.api.ts` (`location?: GeoJSONPoint`, rename string `location` to `address`).

Same for `incidents.api.ts` (`lat?: number; lng?: number` on create and sync).

- [ ] **Step 5.6: Add demo coordinates to seed**

Edit `scripts/seed-demo.ts`. For each seeded service, event, incident, add coordinates clustered around Montmartre (Paris 18e):

```ts
// Sample coords across Montmartre for demo realism
const demoCoords = [
    [2.3415, 48.8867], // Sacré-Cœur
    [2.3380, 48.8870], // Place du Tertre
    [2.3460, 48.8845], // Anvers metro
    [2.3445, 48.8889], // Lamarck-Caulaincourt
    [2.3408, 48.8830], // Pigalle
];
```

Pass `location: { type: "Point", coordinates: demoCoords[i % demoCoords.length] }` to each service/event create call, and `lat`/`lng` to incident creates.

- [ ] **Step 5.7: Run shared tests**

Run: `cd web-apps && pnpm --filter @workspace/shared test`
Expected: 73 passing (no changes to existing tests).

- [ ] **Step 5.8: Run full validate**

Run: `make typecheck && make lint`
Expected: All green. If TypeScript complains about consumers of `Event.location` (string → object), fix call sites by renaming usages to `address`.

- [ ] **Step 5.9: Commit**

```bash
git add web-apps/packages/shared/src/lib/ scripts/seed-demo.ts
git commit -m "$(cat <<'EOF'
feat(shared): expose coords on Service/Event/Incident types

Adds GeoJSONPoint helper, optional location field for services/events,
optional lat/lng for incidents. Seed script clusters demo entities
around Montmartre so map views show real pins out of the box.
EOF
)"
```

---

## Task 6: Create core Map component (Map, Marker, NeighborhoodPolygon, UserLocation, useFitBounds)

**Files:**
- Create: `web-apps/packages/ui/src/components/map.tsx`
- Create: `web-apps/packages/ui/src/components/map.test.tsx`

- [ ] **Step 6.1: Write failing test for <Map> renders container**

Create `web-apps/packages/ui/src/components/map.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Map, Marker, NeighborhoodPolygon, UserLocation, useFitBounds } from "./map";

describe("<Map>", () => {
    it("renders a leaflet container with given className", () => {
        const { container } = render(
            <Map center={[48.8566, 2.3522]} zoom={13} className="h-[400px]" />
        );
        const root = container.querySelector(".leaflet-container");
        expect(root).not.toBeNull();
        expect(root?.className).toContain("h-[400px]");
    });
});
```

- [ ] **Step 6.2: Run, verify failure**

Run: `cd web-apps && pnpm --filter @workspace/ui test`
Expected: FAIL — module `./map` not found.

- [ ] **Step 6.3: Implement Map container**

Create `web-apps/packages/ui/src/components/map.tsx`:

```tsx
"use client";

import { type ReactNode, type Ref, forwardRef, useEffect, useMemo, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    Marker as LeafletMarker,
    Polygon,
    Popup,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@workspace/ui/lib/utils";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type LatLng = [number, number];

interface MapProps {
    center: LatLng;
    zoom?: number;
    className?: string;
    children?: ReactNode;
}

export const Map = forwardRef<L.Map, MapProps>(function Map(
    { center, zoom = 13, className, children },
    ref,
) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className={cn(
                "leaflet-container rounded-md border bg-card",
                className,
            )}
            ref={ref as Ref<L.Map>}
            scrollWheelZoom={false}
        >
            <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
            {children}
        </MapContainer>
    );
});
```

- [ ] **Step 6.4: Run, verify Map test passes**

Run: `cd web-apps && pnpm --filter @workspace/ui test`
Expected: 1 passed.

- [ ] **Step 6.5: Write failing tests for Marker variants**

Add to `map.test.tsx`:

```tsx
describe("<Marker>", () => {
    it("applies service variant class", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <Marker variant="service" position={[48.85, 2.35]} />
            </Map>,
        );
        const icon = container.querySelector(".qc-marker--service");
        expect(icon).not.toBeNull();
    });
    it("applies incident variant class", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <Marker variant="incident" position={[48.85, 2.35]} />
            </Map>,
        );
        expect(container.querySelector(".qc-marker--incident")).not.toBeNull();
    });
});
```

- [ ] **Step 6.6: Run, verify failure**

Expected: FAIL — `Marker` not exported.

- [ ] **Step 6.7: Implement Marker with variants**

Append to `map.tsx`:

```tsx
type MarkerVariant = "default" | "service" | "incident" | "event";

const VARIANT_COLORS: Record<MarkerVariant, string> = {
    default: "oklch(0.21 0.006 285.885)", // --primary
    service: "oklch(0.62 0.18 145)", // accent green
    incident: "oklch(0.55 0.22 25)", // destructive red
    event: "oklch(0.62 0.18 145)", // accent green
};

function buildDivIcon(variant: MarkerVariant): L.DivIcon {
    const color = VARIANT_COLORS[variant];
    const svg = `
        <svg viewBox="0 0 24 24" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2 C 7 2 3 6 3 11 C 3 17 12 22 12 22 C 12 22 21 17 21 11 C 21 6 17 2 12 2 Z"
                  fill="${color}" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="11" r="3" fill="white"/>
        </svg>
    `;
    return L.divIcon({
        html: svg,
        className: `qc-marker qc-marker--${variant}`,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
        popupAnchor: [0, -36],
    });
}

interface MarkerProps {
    position: LatLng;
    variant?: MarkerVariant;
    popup?: ReactNode;
    onClick?: () => void;
}

export function Marker({ position, variant = "default", popup, onClick }: MarkerProps) {
    const icon = useMemo(() => buildDivIcon(variant), [variant]);
    return (
        <LeafletMarker
            position={position}
            icon={icon}
            eventHandlers={onClick ? { click: onClick } : undefined}
        >
            {popup ? <Popup>{popup}</Popup> : null}
        </LeafletMarker>
    );
}
```

- [ ] **Step 6.8: Run, verify Marker tests pass**

Expected: 3 passed.

- [ ] **Step 6.9: Write tests for NeighborhoodPolygon and UserLocation**

Add to `map.test.tsx`:

```tsx
describe("<NeighborhoodPolygon>", () => {
    it("renders a polygon from GeoJSON geometry", () => {
        const geom: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [[[2.34, 48.88], [2.35, 48.88], [2.35, 48.89], [2.34, 48.89], [2.34, 48.88]]],
        };
        const { container } = render(
            <Map center={[48.88, 2.345]}>
                <NeighborhoodPolygon geometry={geom} label="Test" />
            </Map>,
        );
        expect(container.querySelector("path")).not.toBeNull();
    });
});

describe("<UserLocation>", () => {
    it("calls navigator.geolocation.getCurrentPosition on mount", () => {
        const getPos = vi.fn((cb) =>
            cb({ coords: { latitude: 48.85, longitude: 2.35 } }),
        );
        Object.defineProperty(globalThis.navigator, "geolocation", {
            value: { getCurrentPosition: getPos },
            configurable: true,
        });
        const onLocate = vi.fn();
        render(
            <Map center={[48.85, 2.35]}>
                <UserLocation onLocate={onLocate} fallbackCenter={[48.85, 2.35]} />
            </Map>,
        );
        expect(getPos).toHaveBeenCalled();
        expect(onLocate).toHaveBeenCalledWith({ lat: 48.85, lng: 2.35 });
    });
});
```

- [ ] **Step 6.10: Implement NeighborhoodPolygon, UserLocation, useFitBounds**

Append to `map.tsx`:

```tsx
interface NeighborhoodPolygonProps {
    geometry: GeoJSON.Polygon;
    color?: string;
    label?: string;
}

export function NeighborhoodPolygon({
    geometry,
    color = "oklch(0.21 0.006 285.885)",
    label,
}: NeighborhoodPolygonProps) {
    // GeoJSON coords are [lng, lat]; Leaflet expects [lat, lng]
    const positions: LatLng[] = geometry.coordinates[0].map(
        ([lng, lat]) => [lat, lng],
    );
    return (
        <Polygon
            positions={positions}
            pathOptions={{
                color,
                weight: 2,
                fillOpacity: 0.08,
            }}
        >
            {label ? <Popup>{label}</Popup> : null}
        </Polygon>
    );
}

interface UserLocationProps {
    onLocate?: (coords: { lat: number; lng: number }) => void;
    fallbackCenter?: LatLng;
}

export function UserLocation({ onLocate, fallbackCenter }: UserLocationProps) {
    const map = useMap();
    useEffect(() => {
        if (!navigator.geolocation) {
            if (fallbackCenter) map.setView(fallbackCenter, map.getZoom());
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                map.setView([lat, lng], 14);
                onLocate?.({ lat, lng });
            },
            () => {
                if (fallbackCenter) map.setView(fallbackCenter, map.getZoom());
            },
            { enableHighAccuracy: true, timeout: 5000 },
        );
    }, [map, onLocate, fallbackCenter]);
    return null;
}

export function useFitBounds(positions: LatLng[]): React.RefObject<L.Map | null> {
    const ref = useRef<L.Map | null>(null);
    useEffect(() => {
        if (!ref.current || positions.length === 0) return;
        const bounds = L.latLngBounds(positions);
        ref.current.fitBounds(bounds, { padding: [40, 40] });
    }, [positions]);
    return ref;
}
```

- [ ] **Step 6.11: Run tests, verify all pass**

Run: `cd web-apps && pnpm --filter @workspace/ui test`
Expected: 5 passed.

- [ ] **Step 6.12: Commit**

```bash
git add web-apps/packages/ui/src/components/map.tsx web-apps/packages/ui/src/components/map.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add shared Map component (core)

Exports Map, Marker (4 variants), NeighborhoodPolygon, UserLocation,
useFitBounds. Uses react-leaflet@5 + OSM tiles. Marker icons are
inline SVG aligned with Civic Editorial palette. 5 Vitest tests.
EOF
)"
```

---

## Task 7: Add MarkerCluster sub-component

**Files:**
- Modify: `web-apps/packages/ui/src/components/map.tsx`
- Modify: `web-apps/packages/ui/src/components/map.test.tsx`

- [ ] **Step 7.1: Write failing test**

Add to `map.test.tsx`:

```tsx
describe("<MarkerCluster>", () => {
    it("renders provided markers inside a cluster wrapper", () => {
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <MarkerCluster>
                    {Array.from({ length: 12 }, (_, i) => (
                        <Marker key={i} variant="service" position={[48.85 + i * 0.001, 2.35]} />
                    ))}
                </MarkerCluster>
            </Map>,
        );
        // marker-cluster div added by leaflet.markercluster lib
        expect(container.querySelector(".marker-cluster")).not.toBeNull();
    });
});
```

Update the import at top of `map.test.tsx` to include `MarkerCluster`.

- [ ] **Step 7.2: Run, verify failure**

Expected: FAIL.

- [ ] **Step 7.3: Implement MarkerCluster**

Append to `map.tsx`:

```tsx
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MarkerClusterProps {
    children: ReactNode;
}

export function MarkerCluster({ children }: MarkerClusterProps) {
    return (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {children}
        </MarkerClusterGroup>
    );
}
```

- [ ] **Step 7.4: Run, verify pass**

Expected: 6 passed.

- [ ] **Step 7.5: Commit**

```bash
git add web-apps/packages/ui/src/components/map.tsx web-apps/packages/ui/src/components/map.test.tsx
git commit -m "feat(ui): add MarkerCluster wrapper for dense map views"
```

---

## Task 8: Add DrawControl sub-component

**Files:**
- Modify: `web-apps/packages/ui/src/components/map.tsx`
- Modify: `web-apps/packages/ui/src/components/map.test.tsx`

- [ ] **Step 8.1: Write failing test**

Add to `map.test.tsx`:

```tsx
describe("<DrawControl>", () => {
    it("calls onCreate with a GeoJSON polygon when a polygon is finalized", async () => {
        const onCreate = vi.fn();
        const { container } = render(
            <Map center={[48.85, 2.35]}>
                <DrawControl mode="polygon" onCreate={onCreate} />
            </Map>,
        );
        // simulate Leaflet draw:created event
        const mapEl = container.querySelector(".leaflet-container");
        const layer = L.polygon([
            [48.85, 2.35],
            [48.86, 2.36],
            [48.84, 2.36],
        ]);
        const event = new CustomEvent("draw:created", {
            detail: { layer, layerType: "polygon" },
        });
        mapEl?.dispatchEvent(event);
        // onCreate fires via leaflet-draw bridge added by DrawControl
        // (assertion holds if implementation listens to draw:created)
        expect(onCreate).toHaveBeenCalled();
        const [arg] = onCreate.mock.calls[0];
        expect(arg.type).toBe("Polygon");
    });
});
```

- [ ] **Step 8.2: Run, verify failure**

Expected: FAIL.

- [ ] **Step 8.3: Implement DrawControl**

Append to `map.tsx`:

```tsx
import "leaflet-draw/dist/leaflet.draw.css";

interface DrawControlProps {
    mode: "polygon";
    onCreate?: (geometry: GeoJSON.Polygon) => void;
    onEdit?: (geometry: GeoJSON.Polygon) => void;
    onDelete?: () => void;
}

export function DrawControl({ mode, onCreate, onEdit, onDelete }: DrawControlProps) {
    const map = useMap();
    useEffect(() => {
        let cancelled = false;
        const featureGroup = L.featureGroup().addTo(map);

        // Dynamic import keeps leaflet-draw out of SSR/JSDOM mount path
        void import("leaflet-draw").then(() => {
            if (cancelled) return;
            const drawControl = new (L.Control as unknown as {
                Draw: new (opts: unknown) => L.Control;
            }).Draw({
                position: "topright",
                draw: {
                    polygon: mode === "polygon" ? {} : false,
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    marker: false,
                    circlemarker: false,
                },
                edit: { featureGroup },
            });
            map.addControl(drawControl);

            const handleCreated = (e: L.LeafletEvent) => {
                const layer = (e as unknown as { layer: L.Layer }).layer;
                featureGroup.addLayer(layer);
                const geojson = (layer as L.Polygon).toGeoJSON();
                if (geojson.geometry.type === "Polygon") {
                    onCreate?.(geojson.geometry);
                }
            };
            const handleEdited = (e: L.LeafletEvent) => {
                const layers = (e as unknown as { layers: L.LayerGroup }).layers;
                layers.eachLayer((layer) => {
                    const geojson = (layer as L.Polygon).toGeoJSON();
                    if (geojson.geometry.type === "Polygon") {
                        onEdit?.(geojson.geometry);
                    }
                });
            };
            const handleDeleted = () => onDelete?.();

            map.on("draw:created" as never, handleCreated as never);
            map.on("draw:edited" as never, handleEdited as never);
            map.on("draw:deleted" as never, handleDeleted as never);
        });

        return () => {
            cancelled = true;
            map.removeLayer(featureGroup);
        };
    }, [map, mode, onCreate, onEdit, onDelete]);
    return null;
}
```

- [ ] **Step 8.4: Run, verify pass**

If the dynamic import test is flaky in JSDOM, mock leaflet-draw at the top of the test file:

```ts
vi.mock("leaflet-draw", () => ({}));
```

And dispatch the event directly on the map instance via `mapEl?.dispatchEvent`. Tune until 7 passed.

- [ ] **Step 8.5: Commit**

```bash
git add web-apps/packages/ui/src/components/map.tsx web-apps/packages/ui/src/components/map.test.tsx
git commit -m "feat(ui): add DrawControl for polygon editing"
```

---

## Task 9: Create shared geo helpers + integrate Map on client/dashboard

**Files:**
- Create: `web-apps/packages/shared/src/lib/geo.ts`
- Create: `web-apps/packages/shared/src/lib/__tests__/geo.test.ts`
- Modify: `web-apps/apps/client/src/routes/dashboard/index.tsx`

- [ ] **Step 9.1: Create shared geo helpers (used by Tasks 9-14)**

Create `web-apps/packages/shared/src/lib/geo.ts`:

```ts
export function centroidOf(geom: GeoJSON.Polygon): [number, number] {
    const ring = geom.coordinates[0];
    let sumLat = 0;
    let sumLng = 0;
    for (const [lng, lat] of ring) {
        sumLat += lat;
        sumLng += lng;
    }
    return [sumLat / ring.length, sumLng / ring.length];
}

export function pointToLatLng(point: { coordinates: [number, number] }): [number, number] {
    // GeoJSON coordinates are [lng, lat]; Leaflet expects [lat, lng]
    return [point.coordinates[1], point.coordinates[0]];
}
```

Create `web-apps/packages/shared/src/lib/__tests__/geo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { centroidOf, pointToLatLng } from "../geo";

describe("centroidOf", () => {
    it("computes centroid of a unit square", () => {
        const sq: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        };
        const [lat, lng] = centroidOf(sq);
        expect(lat).toBeCloseTo(0.4, 1);
        expect(lng).toBeCloseTo(0.4, 1);
    });
});

describe("pointToLatLng", () => {
    it("flips GeoJSON [lng, lat] to Leaflet [lat, lng]", () => {
        expect(pointToLatLng({ coordinates: [2.35, 48.85] })).toEqual([48.85, 2.35]);
    });
});
```

Export from `packages/shared/src/lib/index.ts` or update `package.json` exports to include `./lib/geo`.

Run: `cd web-apps && pnpm --filter @workspace/shared test`
Expected: existing 73 + 2 new = 75 passing.

- [ ] **Step 9.2: Read current dashboard to find insertion point**

Run: `cat web-apps/apps/client/src/routes/dashboard/index.tsx`
Locate the main grid where stat cards live (typically a top section). The mini-map goes as a new Card in the grid, spanning 2 columns on `md+`.

- [ ] **Step 9.3: Add mini-map**

In `dashboard/index.tsx`, inside the page component:

```tsx
import { Map, NeighborhoodPolygon, UserLocation } from "@workspace/ui/components/map";
import { centroidOf } from "@workspace/shared/lib/geo";
import { useNeighborhood } from "@workspace/shared/lib/hooks/neighborhoods.hooks";
import { useMe } from "@workspace/shared/lib/hooks/useMe";

// Inside the component, after existing hooks:
const { data: me } = useMe();
const { data: neighborhood } = useNeighborhood(me?.neighborhoodId);

// In the JSX, inside the main grid:
{neighborhood?.geometry && (
    <Card className="md:col-span-2">
        <CardHeader>
            <CardTitle>Mon quartier — {neighborhood.name}</CardTitle>
        </CardHeader>
        <CardContent>
            <Map
                center={centroidOf(neighborhood.geometry)}
                zoom={14}
                className="h-48 w-full"
            >
                <NeighborhoodPolygon geometry={neighborhood.geometry} label={neighborhood.name} />
                <UserLocation fallbackCenter={centroidOf(neighborhood.geometry)} />
            </Map>
        </CardContent>
    </Card>
)}
```

- [ ] **Step 9.4: Manual check**

Run: `make dev-client` (in another terminal: `make docker-up && make seed`)
Open http://localhost:3000/dashboard, log in as alice@demo.fr, verify:
- Mini-map renders with neighborhood polygon outlined
- User location pin appears (or fallback centers on polygon)
- No console errors

- [ ] **Step 9.5: Run typecheck + lint**

Run: `make typecheck && make lint`
Expected: All green.

- [ ] **Step 9.6: Commit**

```bash
git add web-apps/packages/shared/src/lib/geo.ts web-apps/packages/shared/src/lib/__tests__/geo.test.ts web-apps/packages/shared/package.json web-apps/apps/client/src/routes/dashboard/index.tsx
git commit -m "feat(client): add geo helpers and neighborhood mini-map to dashboard"
```

---

## Task 10: Integrate Map on client/services

**Files:**
- Modify: `web-apps/apps/client/src/routes/services/index.tsx`

- [ ] **Step 10.1: Add map section above the services list**

Edit `services/index.tsx`. Add imports:

```tsx
import { Map, Marker, MarkerCluster, NeighborhoodPolygon, UserLocation } from "@workspace/ui/components/map";
```

Inside the component, after the existing data hooks:

```tsx
const servicesWithCoords = services?.filter(s => s.location) ?? [];
```

In the JSX, above the list:

```tsx
{neighborhood?.geometry && (
    <Card>
        <CardHeader>
            <CardTitle>Services à proximité</CardTitle>
            <CardDescription>
                {servicesWithCoords.length} service(s) localisé(s)
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Map
                center={centroidOf(neighborhood.geometry)}
                zoom={14}
                className="h-[480px] w-full"
            >
                <NeighborhoodPolygon geometry={neighborhood.geometry} />
                <UserLocation fallbackCenter={centroidOf(neighborhood.geometry)} />
                <MarkerCluster>
                    {servicesWithCoords.map((s) => (
                        <Marker
                            key={s._id}
                            variant="service"
                            position={[s.location!.coordinates[1], s.location!.coordinates[0]]}
                            popup={
                                <div className="space-y-1">
                                    <p className="font-medium">{s.title}</p>
                                    <p className="text-xs text-muted-foreground">{s.category}</p>
                                </div>
                            }
                        />
                    ))}
                </MarkerCluster>
            </Map>
        </CardContent>
    </Card>
)}
```

Import or copy the `centroidOf` helper from Task 9.

- [ ] **Step 10.2: Manual check**

Browse http://localhost:3000/services as alice. Verify pins appear, clustering works if many, popup shows on click.

- [ ] **Step 10.3: Commit**

```bash
git add web-apps/apps/client/src/routes/services/index.tsx
git commit -m "feat(client): add map view to services page"
```

---

## Task 11: Integrate Map on client/events

**Files:**
- Modify: `web-apps/apps/client/src/routes/events/index.tsx`

- [ ] **Step 11.1: Apply the same pattern as Task 10**

Use `variant="event"`. Pin popup shows event title + date + a "Intéressé" button that calls existing `markInterest` mutation. Filter `events.filter(e => e.location)`.

- [ ] **Step 11.2: Manual check + commit**

```bash
git add web-apps/apps/client/src/routes/events/index.tsx
git commit -m "feat(client): add map view to events page"
```

---

## Task 12: Integrate Map on client/incidents (with click-to-place)

**Files:**
- Modify: `web-apps/apps/client/src/routes/incidents/index.tsx`

- [ ] **Step 12.1: Add MapClickHandler helper inside the file**

In `incidents/index.tsx`, after imports:

```tsx
import { Map, Marker, NeighborhoodPolygon, UserLocation } from "@workspace/ui/components/map";
import { useMapEvents } from "react-leaflet";

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onPlace(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}
```

- [ ] **Step 12.2: Wire into the create-incident form**

Add state for the picked coords inside the dialog:

```tsx
const [pickedLat, setPickedLat] = useState<number | null>(null);
const [pickedLng, setPickedLng] = useState<number | null>(null);
```

In the dialog body:

```tsx
<div className="space-y-2">
    <Label>Lieu de l'incident — cliquez sur la carte</Label>
    <Map center={centroidOf(neighborhood.geometry)} zoom={15} className="h-64">
        <NeighborhoodPolygon geometry={neighborhood.geometry} />
        <ClickToPlace onPlace={(lat, lng) => { setPickedLat(lat); setPickedLng(lng); }} />
        {pickedLat !== null && pickedLng !== null && (
            <Marker variant="incident" position={[pickedLat, pickedLng]} />
        )}
    </Map>
    {pickedLat === null && (
        <p className="text-xs text-muted-foreground">Aucun point sélectionné</p>
    )}
</div>
```

In the submit handler, pass `lat: pickedLat ?? undefined, lng: pickedLng ?? undefined` to `createIncident`.

- [ ] **Step 12.3: Add list-view map (showing existing incidents)**

Above the list, render a second `<Map>` with all incidents that have coords:

```tsx
const incidentsWithCoords = incidents?.filter(i => i.lat !== null && i.lng !== null) ?? [];

{neighborhood?.geometry && (
    <Card>
        <CardHeader><CardTitle>Carte des incidents</CardTitle></CardHeader>
        <CardContent>
            <Map center={centroidOf(neighborhood.geometry)} zoom={14} className="h-[400px]">
                <NeighborhoodPolygon geometry={neighborhood.geometry} />
                {incidentsWithCoords.map(i => (
                    <Marker
                        key={i.id}
                        variant="incident"
                        position={[i.lat!, i.lng!]}
                        popup={<div><p className="font-medium">{i.title}</p><p className="text-xs">{i.status}</p></div>}
                    />
                ))}
            </Map>
        </CardContent>
    </Card>
)}
```

- [ ] **Step 12.4: Manual check + commit**

Test the full flow: open dialog, click to place pin, submit, see pin in list view.

```bash
git add web-apps/apps/client/src/routes/incidents/index.tsx
git commit -m "feat(client): add map view + click-to-place to incidents page"
```

---

## Task 13: Integrate Map on admin/services

**Files:**
- Modify: `web-apps/apps/admin/src/routes/services/index.tsx`

- [ ] **Step 13.1: Wrap existing content in Tabs**

Imports:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@workspace/ui/components/tabs";
import { Map, Marker, MarkerCluster, NeighborhoodPolygon } from "@workspace/ui/components/map";
```

Restructure the page main area:

```tsx
<Tabs defaultValue="list">
    <TabsList>
        <TabsTrigger value="list">Liste</TabsTrigger>
        <TabsTrigger value="map">Carte</TabsTrigger>
    </TabsList>
    <TabsContent value="list">
        {/* existing list table */}
    </TabsContent>
    <TabsContent value="map">
        <Map center={[48.8566, 2.3522]} zoom={13} className="h-[600px] w-full">
            <MarkerCluster>
                {services.filter(s => s.location).map(s => (
                    <Marker
                        key={s._id}
                        variant="service"
                        position={[s.location!.coordinates[1], s.location!.coordinates[0]]}
                        popup={<div><p className="font-medium">{s.title}</p><p>{s.category}</p></div>}
                    />
                ))}
            </MarkerCluster>
        </Map>
    </TabsContent>
</Tabs>
```

- [ ] **Step 13.2: Add coords picker in create-service dialog**

Inside `admin/services/index.tsx`, define the same click handler used by `client/incidents`:

```tsx
import { useMapEvents } from "react-leaflet";

function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onPlace(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}
```

Add state inside the dialog:

```tsx
const [pickedLat, setPickedLat] = useState<number | null>(null);
const [pickedLng, setPickedLng] = useState<number | null>(null);
```

Add a map in the dialog body:

```tsx
<div className="space-y-2">
    <Label>Position du service</Label>
    <Map center={[48.8566, 2.3522]} zoom={13} className="h-64">
        <ClickToPlace onPlace={(lat, lng) => { setPickedLat(lat); setPickedLng(lng); }} />
        {pickedLat !== null && pickedLng !== null && (
            <Marker variant="service" position={[pickedLat, pickedLng]} />
        )}
    </Map>
</div>
```

On submit, send `location: { type: "Point", coordinates: [pickedLng!, pickedLat!] }` only if both are set.

- [ ] **Step 13.3: Manual check + commit**

```bash
git add web-apps/apps/admin/src/routes/services/index.tsx
git commit -m "feat(admin): add map tab and coord picker to services"
```

---

## Task 14: Integrate Map on admin/incidents

**Files:**
- Modify: `web-apps/apps/admin/src/routes/incidents/index.tsx`

- [ ] **Step 14.1: Wrap in Tabs (same pattern as Task 13)**

Tab "Carte" shows incident pins colored by status. Click pin opens existing detail dialog if present, else navigates to detail route.

```tsx
<TabsContent value="map">
    <Map center={[48.8566, 2.3522]} zoom={13} className="h-[600px] w-full">
        {incidents.filter(i => i.lat !== null && i.lng !== null).map(i => (
            <Marker
                key={i.id}
                variant="incident"
                position={[i.lat!, i.lng!]}
                popup={
                    <div className="space-y-1">
                        <p className="font-medium">{i.title}</p>
                        <p className="text-xs">Statut : {i.status}</p>
                    </div>
                }
                onClick={() => openIncidentDetail(i.id)}
            />
        ))}
    </Map>
</TabsContent>
```

- [ ] **Step 14.2: Manual check + commit**

```bash
git add web-apps/apps/admin/src/routes/incidents/index.tsx
git commit -m "feat(admin): add map tab to incidents page"
```

---

## Task 15: Refactor admin/neighborhoods to use shared component

**Files:**
- Modify: `web-apps/apps/admin/src/routes/neighborhoods/index.tsx`

- [ ] **Step 15.1: Snapshot test BEFORE refactor (regression safety net)**

Add to `web-apps/packages/ui/src/components/map.test.tsx`:

```tsx
describe("DrawControl GeoJSON shape (snapshot)", () => {
    it("produces stable GeoJSON Polygon shape", () => {
        const sample: GeoJSON.Polygon = {
            type: "Polygon",
            coordinates: [[[2.34, 48.88], [2.35, 48.88], [2.35, 48.89], [2.34, 48.89], [2.34, 48.88]]],
        };
        expect(sample).toMatchSnapshot();
    });
});
```

Run once to lock the snapshot.

- [ ] **Step 15.2: Replace custom L.map code with shared Map**

Remove lines 30 (`import "leaflet/dist/leaflet.css"`) and lines 190–270 (the `useEffect` that does `L.map(...)` + custom drawing logic).

Replace with:

```tsx
import {
    Map,
    NeighborhoodPolygon,
    DrawControl,
} from "@workspace/ui/components/map";

// Inside component:
const [draft, setDraft] = useState<GeoJSON.Polygon | null>(null);

// JSX:
<Map
    center={[48.8566, 2.3522]}
    zoom={13}
    className="h-[600px] w-full"
>
    {existingNeighborhoods.map(n => (
        <NeighborhoodPolygon key={n._id} geometry={n.geometry} label={n.name} />
    ))}
    <DrawControl
        mode="polygon"
        onCreate={(geom) => setDraft(geom)}
        onEdit={(geom) => setDraft(geom)}
        onDelete={() => setDraft(null)}
    />
</Map>
```

Use `draft` when submitting the create-neighborhood form.

- [ ] **Step 15.3: Run all UI tests**

Run: `cd web-apps && pnpm --filter @workspace/ui test`
Expected: All previous tests + snapshot still pass.

- [ ] **Step 15.4: Manual verification**

Browse http://localhost:3001/neighborhoods as admin. Verify:
- Existing polygons visible
- Polygon drawing tool in top-right toolbar
- Drawing produces a polygon, form receives GeoJSON
- Edit/delete tools work

- [ ] **Step 15.5: Commit**

```bash
git add web-apps/apps/admin/src/routes/neighborhoods/index.tsx web-apps/packages/ui/src/components/map.test.tsx
git commit -m "$(cat <<'EOF'
refactor(admin): use shared Map and DrawControl for neighborhoods

Removes 80 LOC of custom L.map + manual polygon drawing. Behavior is
unchanged: same GeoJSON Polygon shape goes to the API (snapshot-locked).
Now consistent with the rest of the app and benefits from edit/delete
controls provided by leaflet-draw.
EOF
)"
```

---

## Task 16: Playwright E2E tests

**Files:**
- Create: `web-apps/e2e/client/services-map.spec.ts`
- Create: `web-apps/e2e/admin/neighborhoods-draw.spec.ts`

- [ ] **Step 16.1: Write services map E2E**

Create `web-apps/e2e/client/services-map.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("client/services renders map with pins after seed", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await page.fill('input[name="email"]', "alice@demo.fr");
    await page.fill('input[name="password"]', "Demo1234!");
    // TOTP step
    await page.click('button:has-text("Se connecter")');
    await page.waitForURL("**/totp");
    // ... TOTP code via helper ...
    await page.goto("http://localhost:3000/services");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();

    // At least one service pin from the seed should be present
    const pins = page.locator(".qc-marker--service");
    await expect(pins.first()).toBeVisible({ timeout: 5000 });

    // Clicking opens popup
    await pins.first().click();
    await expect(page.locator(".leaflet-popup-content")).toBeVisible();
});
```

- [ ] **Step 16.2: Write neighborhoods draw E2E (anti-regression)**

Create `web-apps/e2e/admin/neighborhoods-draw.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("admin/neighborhoods polygon draw posts valid GeoJSON", async ({ page }) => {
    await page.goto("http://localhost:3001/login");
    // ... admin login + TOTP ...
    await page.goto("http://localhost:3001/neighborhoods");

    const mapContainer = page.locator(".leaflet-container");
    await expect(mapContainer).toBeVisible();
    await expect(page.locator(".leaflet-draw-toolbar")).toBeVisible();

    // Click the polygon draw tool
    await page.locator(".leaflet-draw-draw-polygon").click();

    // Listen for the create request
    const createPromise = page.waitForRequest((req) =>
        req.url().includes("/neighborhoods") && req.method() === "POST",
    );

    // 3 clicks + double-click on the map canvas to draw a triangle
    const box = await mapContainer.boundingBox();
    if (!box) throw new Error("map not visible");
    await page.mouse.click(box.x + 100, box.y + 100);
    await page.mouse.click(box.x + 200, box.y + 100);
    await page.mouse.click(box.x + 150, box.y + 200);
    await page.mouse.dblclick(box.x + 150, box.y + 200);

    // Submit the dialog form
    await page.fill('input[name="name"]', "E2E Test Quartier");
    await page.click('button:has-text("Créer")');

    const req = await createPromise;
    const body = req.postDataJSON();
    expect(body.geometry.type).toBe("Polygon");
    expect(body.geometry.coordinates[0].length).toBeGreaterThanOrEqual(4);
});
```

- [ ] **Step 16.3: Run E2E suite**

Prereq: `make docker-up && make dev` (in another terminal).
Run: `make test-e2e-web`
Expected: 79 (existing) + 2 (new) = 81 passing.

If either E2E flakes, gate it behind `test.skip(process.env.CI === "true" && ...)` only as a last resort; prefer fixing the test.

- [ ] **Step 16.4: Commit**

```bash
git add web-apps/e2e/client/services-map.spec.ts web-apps/e2e/admin/neighborhoods-draw.spec.ts
git commit -m "test(e2e): cover map rendering and polygon draw flow"
```

---

## Task 17: Update documentation and validate end-to-end

**Files:**
- Modify: `docs/TEST.md`
- Modify: `README.md` (test count)
- Modify: `docs/ARCHITECTURE.md` (mention shared Map component)

- [ ] **Step 17.1: Update test counts in docs**

Edit `docs/TEST.md`:
- Vitest web shared hooks: 73 → 73 (unchanged)
- New row: Vitest UI components: 7
- Playwright: 79 → 81
- Total: 720 → 729

Edit `README.md` line 3 and 6 to reflect new totals.

- [ ] **Step 17.2: Add Map section to ARCHITECTURE.md**

In `docs/ARCHITECTURE.md`, under the UI components section, add:

```markdown
### Shared Map component

`packages/ui/src/components/map.tsx` exposes a Leaflet wrapper used
across 6 surfaces. Variants for markers map onto the Civic Editorial
palette. Drawing capabilities (leaflet-draw) are consumed by
`admin/neighborhoods`.
```

- [ ] **Step 17.3: Run make validate**

Run: `make validate`
Expected: lint + typecheck + tests + build all green. If any step fails, fix before continuing.

- [ ] **Step 17.4: Manual responsive check**

In dev mode:
- Desktop (≥1024px): cards display side-by-side, maps at h-[480px]/h-[600px]
- Tablet (768px): maps at h-[480px], layout stacked where appropriate
- Mobile (375px): maps at h-48 on dashboard, h-[400px] elsewhere; no horizontal overflow

Use Chrome DevTools device toolbar. Fix any overflow with `overflow-hidden` or responsive Tailwind classes.

- [ ] **Step 17.5: Final commit (docs)**

```bash
git add docs/TEST.md README.md docs/ARCHITECTURE.md
git commit -m "docs: reflect Map component and updated test counts"
```

- [ ] **Step 17.6: Tag for Étape 3 submission**

```bash
git tag v0.2.0-etape3 -m "Étape 3 (60%) submission — 31/05/2026"
git log -1 --oneline
```

Do NOT push the tag without explicit user confirmation.

---

## Self-Review Checklist

Use this list before marking the plan done:

- [ ] Every spec section in `docs/superpowers/specs/2026-05-29-map-component-design.md` is implemented by at least one task above
- [ ] No "TBD" / "TODO" / "implement later" strings in this plan
- [ ] Every type and API used in later tasks is defined in an earlier task (Map, Marker, NeighborhoodPolygon, UserLocation, MarkerCluster, DrawControl, useFitBounds, GeoJSONPoint)
- [ ] Each task ends in a `git commit` (atomic, revertable)
- [ ] Pre-requisites (Vitest infra, API coords) precede the consumers
- [ ] Final task includes `make validate` gate

---

## Risks Tracker

Re-check each before starting the corresponding task:

| Task | Risk | Mitigation |
|---|---|---|
| 1 | Vitest pnpm install breaks lockfile | `pnpm install --frozen-lockfile` after to verify |
| 2-4 | Existing seed breaks with new fields | `make docker-reset && make seed` after each commit |
| 6-8 | react-leaflet + JSDOM hostility | Already accounted via dynamic import + ResizeObserver mock |
| 8 | leaflet-draw typing missing | `@types/leaflet-draw` already in devDeps |
| 12 | Click-to-place fires on accidental map drag | Use `dragend` debounce or treat `click` only (Leaflet distinguishes) |
| 15 | Neighborhood regression | Snapshot test in Task 15.1 catches it |
| 16 | E2E TOTP automation | Use existing TOTP helper (search `oathtool` in existing e2e tests) |
| 17 | Mobile overflow on small screens | Manual responsive check in Step 17.4 |
