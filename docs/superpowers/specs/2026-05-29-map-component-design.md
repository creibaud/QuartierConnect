# Système de carte partagé — Design

> **Date** : 2026-05-29 · **Auteur** : creibaud · **Cible** : Étape 3 (60%) — rendu 31/05/2026
> **Status** : Approved — pending implementation plan

---

## 1. Contexte et motivation

Le CDC §3.1 et §6.1 imposent **Leaflet + OpenStreetMap** comme stack carto, avec
"tracé dynamique polygones" et géolocalisation comme features structurantes du
projet. À J-2 du rendu Étape 3, l'audit code révèle :

- Les dépendances `leaflet`, `react-leaflet`, `leaflet-draw`,
  `leaflet.markercluster`, `leaflet.fullscreen` sont **installées** dans
  `packages/ui` mais **aucun composant Map partagé n'existe**.
- Une seule page utilise la cartographie : `admin/neighborhoods/index.tsx`
  (451 LOC) avec du code `L.map` brut écrit à la main, sans `leaflet-draw`
  (qui est pourtant en deps).
- Les 6 autres surfaces qui devraient être géolocalisées (`client/services`,
  `client/events`, `client/incidents`, `client/dashboard`, `admin/services`,
  `admin/incidents`) sont en mode liste sans aucune carte.

Cette spec décrit le composant `<Map>` partagé à créer et son intégration dans
les 6 pages cibles, plus le refactor de `admin/neighborhoods` pour utiliser
`leaflet-draw` au lieu du code custom.

## 2. Objectifs

- Couvrir l'exigence CDC §3.1 "Cartographie = Leaflet + OSM" sur toutes les
  surfaces géolocalisées.
- Fournir une API React déclarative (`<Map>`, `<Marker>`, `<NeighborhoodPolygon>`,
  `<MarkerCluster>`, `<DrawControl>`, `<UserLocation>`) alignée sur la
  convention shadcn du repo (single-file multi-export).
- Zéro régression sur la page `admin/neighborhoods` qui fonctionne déjà.
- Respect strict du design system Civic Editorial
  (`docs/DESIGN.md` § Palette).

## 3. Non-objectifs (YAGNI explicite)

- Heatmap, routing, géocodage inverse — chacun introduirait une dep externe.
- Tiles alternatives (Mapbox, MapLibre) — OSM standard suffit pour le CDC.
- Self-hosting des tiles — hors scope J-2, on dépend du réseau OSM.
- Vue carte temps-réel (WebSocket sur les positions) — pas demandé par le CDC.

## 4. Architecture

### 4.1 Stack

| Élément | Choix | Raison |
|---|---|---|
| Lib carto | `react-leaflet@5` (JSX déclaratif) | API idiomatique React, mocke proprement dans Vitest, déjà en deps |
| Lib bas-niveau | `leaflet@1.9` | Sous-jacent à react-leaflet, déjà en deps |
| Drawing | `leaflet-draw@1.0` | Déjà en deps, remplace le code custom de neighborhoods |
| Clustering | `leaflet.markercluster@1.5` | Déjà en deps, requis pour pages services/events denses |
| Geolocation | `react-leaflet-markercluster@5.0.0-rc` + `navigator.geolocation` | Déjà en deps |
| Tiles | OpenStreetMap standard `tile.openstreetmap.org` | Aucune clé API requise, conforme CDC §3.1 |
| Attribution | "© OpenStreetMap contributors" | Obligatoire (licence ODbL) |

### 4.2 Localisation du fichier

Un seul fichier : `web-apps/packages/ui/src/components/map.tsx` (~350 LOC).
Convention alignée sur les 56 autres composants du `packages/ui` (single-file
multi-export façon shadcn `card.tsx` qui exporte `Card`, `CardHeader`,
`CardContent`, etc.).

### 4.3 SSR

Le projet est une SPA Vite (pas de SSR Next.js). Pas de gestion serveur
nécessaire. Pour Vitest (JSDOM), on mocke `leaflet` au niveau du test
(`vi.mock("leaflet")`) — pattern déjà utilisé pour les libs natives dans
`packages/shared/src/lib/`.

## 5. API du composant

### 5.1 Surface publique (named exports)

```tsx
// Conteneur principal
<Map
  center={[lat, lng]}      // ou centroid d'une geometry
  zoom={13}                 // défaut OSM standard
  className="h-[400px] rounded-md border"
  ref={mapRef}              // pour useFitBounds
>
  {children}
</Map>

// Pin standard avec variants design-system
<Marker
  position={[lat, lng]}
  variant="default" | "service" | "incident" | "event"
  popup={<ReactNode />}
  onClick={() => void}
/>

// Polygone GeoJSON (quartier)
<NeighborhoodPolygon
  geometry={GeoJSON.Polygon}
  color={string}         // défaut : var(--primary)
  label={string}         // affiché au hover
/>

// Cluster auto pour ≥10 markers
<MarkerCluster>
  {markers.map(m => <Marker key={m.id} {...m} />)}
</MarkerCluster>

// Outil de dessin de polygone (refactor neighborhoods)
<DrawControl
  mode="polygon"
  onCreate={(geoJSON: GeoJSON.Polygon) => void}
  onEdit={(geoJSON: GeoJSON.Polygon) => void}
  onDelete={() => void}
/>

// Géolocalisation navigateur
<UserLocation
  onLocate={(coords: { lat: number; lng: number }) => void}
  fallbackCenter={[48.8566, 2.3522]}  // Paris par défaut
/>

// Hook utilitaire
const ref = useFitBounds(markersArray);  // autozoom sur N pins
```

### 5.2 Mapping variants → palette DESIGN.md

| variant | Couleur pin | Token | Usage |
|---|---|---|---|
| `default` | Noir éditorial | `var(--primary)` | Cas générique |
| `service` | Vert communauté | `var(--accent)` | client/services, admin/services |
| `incident` | Rouge destructive | `var(--destructive)` | client/incidents, admin/incidents |
| `event` | Vert + badge date | `var(--accent)` | client/events |

Les icônes pins sont des SVG inline (pas de PNG) pour respecter le stroke
moderne HugeIcons (DESIGN.md § Icons). Le bouton fullscreen utilise
`leaflet.fullscreen` (déjà en deps).

## 6. Intégrations par page

### 6.1 Pages cibles (6 + 1 refactor)

| Page | Composants utilisés | Comportement | LoC ajoutées |
|---|---|---|---|
| `client/dashboard` | `<Map>` + `<NeighborhoodPolygon>` + `<UserLocation>` | Mini-carte (h-48) du quartier de l'habitant connecté | ~30 |
| `client/services` | `<Map>` + `<MarkerCluster>` (variant=`service`) + `<UserLocation>` | Pins des services du quartier, popup nom+catégorie+CTA | ~40 |
| `client/events` | `<Map>` + `<MarkerCluster>` (variant=`event`) | Pins events à venir, popup titre+date+CTA "Intéressé" | ~40 |
| `client/incidents` | `<Map>` + `<Marker>` (variant=`incident`) + click-to-place | Tap-sur-carte pour déclarer, vue list+map des incidents | ~60 |
| `admin/services` | `<Map>` + `<MarkerCluster>` | Tab "Vue carte" (Tabs shadcn) à côté de la liste, filtre quartier | ~40 |
| `admin/incidents` | `<Map>` + `<Marker>` (variant=`incident`) | Tab vue carte, pins colorés par statut, click → détail | ~40 |
| `admin/neighborhoods` **(refactor)** | `<Map>` + `<DrawControl>` + `<NeighborhoodPolygon>` | Remplace ~80 LOC de code custom par `<DrawControl mode="polygon">` | **−50 net** |

### 6.2 Exemple d'intégration (`client/services`)

```tsx
const { data: services } = useServices(neighborhoodId);
const { data: neighborhood } = useNeighborhood(neighborhoodId);

<Map center={centroid(neighborhood.geometry)} zoom={14} className="h-[480px]">
  <NeighborhoodPolygon geometry={neighborhood.geometry} />
  <UserLocation />
  <MarkerCluster>
    {services.map(s => (
      <Marker
        key={s.id}
        variant="service"
        position={[s.lat, s.lng]}
        popup={<ServicePopupCard service={s} />}
      />
    ))}
  </MarkerCluster>
</Map>
```

### 6.3 Pré-requis API à vérifier

Avant d'implémenter les pages client, vérifier que les DTOs des endpoints
suivants exposent bien `lat`/`lng` (ou `location: { coordinates: [lng, lat] }`
en format GeoJSON Point) :

- `GET /services` — `services.controller.ts`
- `GET /events` — `events.controller.ts`
- `GET /incidents` — `incidents.controller.ts`

Si manquant : ajouter un commit 0 = patch des DTOs + tests API + tests E2E.
Si présent : commencer directement par le composant.

## 7. Stratégie de test

### 7.1 Cibles quantitatives

| Niveau | Avant | Après | Delta |
|---|---|---|---|
| Vitest web shared | 73 | 85 | +12 |
| Playwright E2E web | 79 | 81 | +2 |
| API/Desktop/DSL | 260+139+21 | inchangé | 0 |
| **Total** | **720** | **734** | **+14** |

### 7.2 Tests unitaires (Vitest, `packages/ui/src/components/map.test.tsx`)

- `<Map>` rend un `.leaflet-container` avec les bonnes dimensions
- `<Marker variant="incident">` applique la classe CSS attendue (rouge)
- `<Marker variant="service">` applique la classe verte
- `<MarkerCluster>` regroupe correctement 10+ markers (mock count)
- `<DrawControl onCreate>` est appelé avec un GeoJSON valide
- `<DrawControl onEdit>` propage les changements de coordonnées
- `<DrawControl onDelete>` reset bien l'état
- `<NeighborhoodPolygon>` rend un `<Polygon>` avec la geometry passée
- `<UserLocation>` appelle `navigator.geolocation.getCurrentPosition`
- `<UserLocation>` fallback sur `fallbackCenter` si refus de geoloc
- `useFitBounds([])` retourne un ref valide avec center par défaut
- `useFitBounds([m1, m2, m3])` calcule les bons bounds

### 7.3 Tests E2E (Playwright, `e2e/tests/map.spec.ts`)

**Scénario 1** — `client/services` :
- Login alice@demo.fr
- Navigate `/services`
- Assert `.leaflet-container` visible
- Assert ≥1 pin présent après seed
- Click pin → popup contient nom du service

**Scénario 2** — `admin/neighborhoods` (anti-régression refactor) :
- Login admin@demo.fr
- Navigate `/neighborhoods`
- Click "Nouveau quartier"
- Dessine un polygone (3 clics + double-click)
- Assert que le POST `/neighborhoods` reçoit un GeoJSON Polygon valide
- Reload → polygone réapparaît

### 7.4 Anti-régression neighborhoods (snapshot)

Avant refactor : ajouter 1 test Vitest qui snapshote la structure GeoJSON
produite par le code custom existant. Après refactor avec `<DrawControl>` :
même snapshot doit passer. Garantit zéro régression fonctionnelle.

## 8. Plan d'exécution (4 commits atomiques)

| # | Commit | Risque | Gate |
|---|---|---|---|
| 1 | `feat(ui): add shared Map component with Leaflet wrappers` | Aucun (isolé) | 720 tests verts + 12 nouveaux |
| 2 | `feat(client): integrate map on dashboard, services, events, incidents` | Layout shift mobile possible | Tests verts + dev server check |
| 3 | `feat(admin): add map view to services and incidents` | Faible (réutilise composant testé) | Tests verts |
| 4 | `refactor(admin): use shared Map and DrawControl for neighborhoods` | **Moyen** — page qui marche | Snapshot GeoJSON identique, scénario E2E pass |

Chaque commit est revertable indépendamment. Si le commit 4 régresse, les 3
précédents restent en place et couvrent déjà l'exigence CDC.

### 8.1 Charge estimée

- Commit 1 (composant + 12 tests Vitest) : ~3h
- Commit 2 (4 pages client) : ~3h
- Commit 3 (2 pages admin) : ~2h
- Commit 4 (refactor neighborhoods) : ~2h
- Validation finale (`make validate` + manuel `make dev-*`) : ~1h
- **Total : ~11h focus**, faisable en 1,5 jour ouvré. Compatible J-2.

## 9. Risques et mitigation

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| DTOs API n'exposent pas lat/lng pour services/events | Haute | Bloque commit 2 | Vérifier en début d'exécution, patch DTOs en commit 0 si manquant |
| Régression `admin/neighborhoods` (seule page carto qui marche) | Moyenne | Soutenance dégradée | Snapshot avant/après, commit 4 isolé donc revertable |
| Tile loading lent en démo jury (réseau) | Moyenne | Démo lente | Tester sur VM de démo, fallback non géré (hors scope J-2) |
| Mobile responsive (hauteur carte écrase contenu) | Moyenne | UX dégradée mobile | Classes Tailwind responsive `h-48 md:h-[480px]`, test manuel dev server |
| Leaflet CSS / Tailwind v4 conflict | Faible | Build cassée | Pattern déjà validé en commit `7608b55` sur neighborhoods |
| `leaflet-draw` types incompatibles avec react-leaflet@5 | Faible | DrawControl ne compile pas | Tester en début de commit 1, fallback : wrapper imperative au lieu de declarative |

## 10. Critères d'acceptation

- [ ] Composant `<Map>` créé dans `packages/ui/src/components/map.tsx`
- [ ] 12 tests Vitest verts pour le composant
- [ ] 2 tests Playwright E2E verts (services + neighborhoods)
- [ ] 6 pages cibles intègrent une carte fonctionnelle
- [ ] `admin/neighborhoods` refactoré pour utiliser le composant partagé
- [ ] Aucune régression sur les 720 tests existants
- [ ] `make validate` passe en clean (lint + typecheck + tests + build)
- [ ] Validation visuelle en dev server sur desktop ET mobile
- [ ] Conformité visuelle DESIGN.md (pins respectent palette Civic Editorial)
- [ ] Attribution OpenStreetMap visible sur chaque carte
