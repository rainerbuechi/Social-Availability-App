import { Place, PlaceCategory } from "./types";

const OVERPASS_ENDPOINT = "https://overpass.kumi.systems/api/interpreter";

const CATEGORY_TO_OSM: Record<PlaceCategory, { key: string; value: string }[]> = {
  cafe:         [{ key: "amenity", value: "cafe" }],
  bar:          [{ key: "amenity", value: "bar" }, { key: "amenity", value: "pub" }],
  sports: [
    { key: "leisure", value: "sports_centre" },
    { key: "leisure", value: "pitch" },
    { key: "leisure", value: "track" },
    { key: "leisure", value: "swimming_pool" },
  ],
  restaurant:   [{ key: "amenity", value: "restaurant" }],
  library:      [{ key: "amenity", value: "library" }],
  park:         [{ key: "leisure", value: "park" }],
  museum:       [{ key: "tourism", value: "museum" }],
  viewpoint:    [{ key: "tourism", value: "viewpoint" }],
  study_spot:   [{ key: "amenity", value: "library" }, { key: "amenity", value: "coworking_space" }],
  event_venue:  [{ key: "amenity", value: "events_venue" }, { key: "amenity", value: "community_centre" }],
  public_space: [{ key: "leisure", value: "park" }, { key: "place", value: "square" }],
  other:        [],
};

export const ZURICH_BBOX: [number, number, number, number] = [47.18, 8.44, 47.44, 8.88];

export function buildOverpassQuery(
  bbox: [number, number, number, number],
  categories: PlaceCategory[],
): string {
  const bboxStr = bbox.join(",");
  const nodeQueries = categories.flatMap((cat) =>
    CATEGORY_TO_OSM[cat].map(
      ({ key, value }) => `node["${key}"="${value}"]["name"](${bboxStr});`,
    ),
  );
  return `[out:json][timeout:25];\n(\n  ${nodeQueries.join("\n  ")}\n);\nout body 300;`;
}

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

function inferCategory(tags: Record<string, string>): PlaceCategory {
  if (tags.amenity === "cafe")             return "cafe";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "bar";
  if (tags.leisure === "sports_centre" || tags.leisure === "pitch" || tags.leisure === "track") return "sports";
  if (tags.amenity === "restaurant")       return "restaurant";
  if (tags.amenity === "library")          return "library";
  if (tags.leisure === "park")             return "park";
  if (tags.tourism === "museum")           return "museum";
  if (tags.tourism === "viewpoint")        return "viewpoint";
  if (tags.amenity === "coworking_space")  return "study_spot";
  if (tags.amenity === "community_centre") return "event_venue";
  if (tags.place === "square")             return "public_space";
  return "other";
}

function osmNodeToPlace(node: OverpassNode): Place {
  const tags = node.tags;
  const street  = tags["addr:street"] ?? "";
  const number  = tags["addr:housenumber"] ?? "";
  const address = street ? `${street} ${number}`.trim() : undefined;
  return {
    id:           `osm_${node.id}`,
    source:       "osm",
    externalId:   String(node.id),
    name:         tags.name ?? tags["name:en"] ?? "Unnamed",
    category:     inferCategory(tags),
    city:         tags["addr:city"] ?? tags["is_in:city"] ?? "Zurich",
    area:         tags.suburb ?? tags.neighbourhood ?? tags.quarter ?? undefined,
    address,
    lat:          node.lat,
    lng:          node.lon,
    openingHours: tags.opening_hours ?? undefined,
    website:      tags.website ?? tags["contact:website"] ?? tags.url ?? undefined,
    cuisine:      tags.cuisine?.replace(/;/g, ", ") ?? undefined,
  };
}

// FIX #2: retry up to 3 times with a short delay between attempts so a
// single flaky response from kumi.systems doesn't leave the map empty.
export async function fetchPlacesFromOverpass(
  bbox: [number, number, number, number],
  categories: PlaceCategory[],
): Promise<Place[]> {
  const query = buildOverpassQuery(bbox, categories);
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000); // 20 s hard limit

      const response = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`Overpass ${response.status}`);

      const data: OverpassResponse = await response.json();
      return data.elements.filter((el) => el.tags?.name?.trim()).map(osmNodeToPlace);
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      // Wait 1 s before retrying
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return []; // unreachable, but satisfies TS
}