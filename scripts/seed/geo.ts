import * as fs from "fs";
import * as path from "path";

export interface NeighborhoodShape {
  name: string;
  /** Closed [lng, lat] ring, disjoint from every other shape in the list. */
  coordinates: number[][];
}

export interface DemoAddress {
  label: string;
  lng: number;
  lat: number;
}

interface AddressBook {
  neighborhoods: Record<string, DemoAddress[]>;
  content: DemoAddress[];
  suburbs: DemoAddress[];
}

/** Read at runtime rather than imported: the API tsconfig has no
 *  resolveJsonModule, and these scripts only ever run through tsx. */
function readData<T>(file: string): T {
  const raw = fs.readFileSync(path.join(__dirname, "data", file), "utf8");
  return JSON.parse(raw) as T;
}

/** Real administrative outlines, simplified and pulled apart so no two overlap.
 *  Montmartre leads: it is the demo neighborhood. */
export const NEIGHBORHOOD_SHAPES = readData<NeighborhoodShape[]>(
  "paris-neighborhoods.json",
);

export const NEIGHBORHOOD_NAMES = NEIGHBORHOOD_SHAPES.map(
  (shape) => shape.name,
);

/** One row of the source repeats the commune ("… 93200 Saint-Denis,Saint-Denis"). */
function withoutRepeatedCommune(label: string): string {
  return label.replace(/ ([^,]+),\1$/, " $1");
}

const ADDRESS_BOOK = readData<AddressBook>("paris-addresses.json");

/** Homes inside each polygon, keyed by neighborhood name. */
export const NEIGHBORHOOD_ADDRESSES = ADDRESS_BOOK.neighborhoods;

/** Places inside the demo neighborhood used to pin services, incidents and events. */
export const CONTENT_ADDRESSES = ADDRESS_BOOK.content;

/** Communes outside every polygon: these addresses must stay unattached so they
 *  keep feeding GET /neighborhoods/uncovered-addresses. */
export const SUBURB_ADDRESSES: DemoAddress[] = ADDRESS_BOOK.suburbs.map(
  (address) => ({ ...address, label: withoutRepeatedCommune(address.label) }),
);

/** Ray casting on the closed ring. Flat geometry is enough at city scale. */
export function containsPoint(
  ring: number[][],
  point: { lng: number; lat: number },
): boolean {
  let inside = false;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    if (y1 > point.lat === y2 > point.lat) continue;
    const crossing = ((x2 - x1) * (point.lat - y1)) / (y2 - y1) + x1;
    if (point.lng < crossing) inside = !inside;
  }
  return inside;
}
