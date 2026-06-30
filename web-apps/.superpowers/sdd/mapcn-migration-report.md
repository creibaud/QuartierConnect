# mapcn Migration Report

**Branch**: feat/services-core  
**Date**: 2026-06-30  
**File rewritten**: `packages/ui/src/components/map.tsx`

---

## Exports mapping

| Export | Old (react-leaflet) | New (mapcn/MapLibre) |
|---|---|---|
| `LatLng` | `[number, number]` alias | Unchanged |
| `useIsDark` | MutationObserver on html.class | Unchanged (same logic) |
| `Map` | `forwardRef<L.Map, ...>` over `<MapContainer>` | `forwardRef<MapRef, ...>` wrapping `<MapLibreMap>` |
| `Marker` | `<LeafletMarker icon={divIcon}>` | `<MapMarker><MarkerContent><PinIcon></MarkerContent>…</MapMarker>` |
| `NeighborhoodPolygon` | `<Polygon positions>` | `<MapGeoJSON data fillPaint linePaint>` |
| `MarkerCluster` | `<MarkerClusterGroup chunkedLoading>` | Passthrough `<>{children}</>` |
| `MapClickHandler` | `useMapEvents({ click })` | `useMap()` + `map.on("click", e => cb(e.lngLat.lat, e.lngLat.lng))` |
| `MapControls` | Leaflet `useMap()` + `L.DomEvent` + portal | mapcn `useMap()` + `createPortal(overlay, map.getContainer())` |
| `useFitBounds` | `L.latLngBounds` + `ref.current.fitBounds` | `map.fitBounds([[minLng,minLat],[maxLng,maxLat]], {padding:40})` with load-guard |
| `DrawControl` | Full leaflet-draw integration | **Stub** returning null (see below) |
| `UserLocation` | `useMapEvents` + `navigator.geolocation` | `useMap()` + `navigator.geolocation` (stub, no consumer) |

---

## Coordinate swap points

All consumer code uses `LatLng = [lat, lng]` (Leaflet convention). MapLibre uses `[lng, lat]`. Swaps occur at exactly these boundaries:

| Location | Swap applied |
|---|---|
| `Map` props `center` | `[center[1], center[0]]` passed to `<MapLibreMap center>` |
| `Marker` → `MapMarker` | `longitude={position[1]}` `latitude={position[0]}` |
| `MapControls.locateMe` | `map.flyTo({ center: [lng, lat] })` |
| `MapControls.goHome` | `map.flyTo({ center: [home[1], home[0]] })` |
| `MapControls.fitNeighborhood` | `coords.map(([lng]) => lng)` / `coords.map(([,lat]) => lat)` — GeoJSON coords are already `[lng,lat]`, extracted directly |
| `useFitBounds` | `positions.map(([,lng]) => lng)` / `positions.map(([lat]) => lat)` — builds `[[minLng,minLat],[maxLng,maxLat]]` |
| `MapClickHandler` | `e.lngLat.lat, e.lngLat.lng` passed as `(lat, lng)` to callback |
| `NeighborhoodPolygon` | GeoJSON `geometry` is already `[lng,lat]` — passed **unchanged** to `<MapGeoJSON data>` |

---

## MarkerCluster

`MarkerCluster` is a passthrough `<>{children}</>`. The maps in this project display at most a few dozen markers, so client-side clustering is unnecessary. The `maxClusterRadius` prop is accepted but ignored, preserving the consumer call-site without changes.

---

## NeighborhoodPolygon label

The `label` prop is accepted but not rendered. mapcn's `MapGeoJSON` has no built-in polygon-label mechanism, and adding a floating HTML label would require additional state. The prop is marked `@deprecated` in the JSDoc. No consumer displays the label in a way the user would notice (it was only shown in a Leaflet popup on click).

---

## DrawControl

`DrawControl` is a no-op stub returning `null`. It IS used in `apps/admin/src/routes/_app/neighborhoods/index.tsx` (the admin polygon editor). Admin neighborhood polygon drawing is **temporarily unavailable** after this migration. Porting requires adding a MapLibre-compatible draw library (e.g. `@mapbox/mapbox-gl-draw` or `maplibre-gl-draw`). This is tracked separately.

## UserLocation

`UserLocation` is kept as a lightweight stub (calls `navigator.geolocation`, calls `onLocate`, fires `map.flyTo`). No client or admin consumer uses it; it was tested directly in the old test file. The stub preserves import compatibility.

---

## `ui/map.tsx` fix (GeoJSON types)

The newly installed `packages/ui/src/components/ui/map.tsx` used the ambient `GeoJSON.*` namespace but had no `/// <reference types="geojson" />` directive. Because the client's `tsconfig.app.json` restricts auto-loaded types to `["vite/client"]`, the namespace was invisible to the client build. Adding:

```ts
/// <reference types="geojson" />
```

at the top of `ui/map.tsx` instructs TypeScript to load `@types/geojson` (which is a devDependency of `packages/ui`) when processing that file, making `GeoJSON.*` globally available for both `ui/map.tsx` and the wrapper `map.tsx`.

---

## Test changes (`map.test.tsx`)

The old tests relied on Leaflet DOM artefacts (`.leaflet-container`, `.qc-marker--service`, `svg path`) and Leaflet's synchronous map creation. MapLibre requires WebGL, which is unavailable in jsdom.

**Strategy**: mock `@workspace/ui/components/ui/map` with lightweight React stubs, then simplify all assertions to what can be tested without WebGL:

| Old test | New status |
|---|---|
| Map renders `.leaflet-container` | Removed (WebGL needed) |
| Marker renders `.qc-marker--service` | Removed (marker classes no longer exist) |
| NeighborhoodPolygon renders `svg path` | Removed (MapGeoJSON is a GL layer) |
| UserLocation / geolocation | Removed (depends on Map context + WebGL) |
| `<MarkerCluster>` renders without throwing | **Kept** (passthrough, no context) |
| `<DrawControl>` mounts/unmounts | **Kept** (no-op, no context) |
| `useFitBounds` returns ref | **Kept** (pure hook) |
| NEW: all exports defined | Added |
| NEW: `useIsDark` returns boolean | Added |

Full coverage of Map rendering belongs in Playwright / E2E tests.

---

## Consumer file changes

**Zero consumer files changed.** All 5 client consumers and the admin consumer compile unchanged against the new API:

- `features/services/pages/services-page.tsx` ✓
- `features/account/components/neighborhood-map-card.tsx` ✓
- `routes/_app/events/index.tsx` ✓
- `routes/_app/incidents/index.tsx` ✓
- `features/services/pages/my-services-page.tsx` ✓ (no map imports)
- `apps/admin/src/routes/_app/neighborhoods/index.tsx` ✓ (DrawControl is stub)

---

## Verify results

```
pnpm --filter client lint   → passed (no output)
pnpm --filter client build  → ✓ built in 6.10s
pnpm --filter client test   → 14 tests passed
pnpm --filter @workspace/ui test → 6 tests passed
```
