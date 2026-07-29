import { writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sources = {
  worldTopo: "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json",
  countryCodes: "https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json",
  admin1: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
  uk: "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/GBR/ADM1/geoBoundaries-GBR-ADM1_simplified.geojson",
  worldMeta: "https://guessthecountry.app/geojson/country.geojson",
  usMeta: "https://guessthecountry.app/geojson/state.geojson",
  canadaMeta: "https://guessthecountry.app/geojson/ca.geojson",
  australiaMeta: "https://guessthecountry.app/geojson/au.geojson",
  ukMeta: "https://guessthecountry.app/geojson/UK.geojson"
};

const [
  worldTopo,
  countryCodes,
  admin1,
  ukBoundaries,
  worldMeta,
  usMeta,
  canadaMeta,
  australiaMeta,
  ukMeta
] = await Promise.all(Object.values(sources).map(fetchJson));

const numericToAlpha3 = new Map(
  countryCodes
    .filter((country) => country.ccn3 && country.cca3)
    .map((country) => [country.ccn3, country.cca3])
);
const metadata = {
  world: metadataMap(worldMeta, "world"),
  us: metadataMap(usMeta, "us"),
  canada: metadataMap(canadaMeta, "canada"),
  australia: metadataMap(australiaMeta, "australia"),
  uk: metadataMap(ukMeta, "uk")
};

const regions = {
  world: featureCollection(worldFeatures()),
  us: featureCollection(adminFeatures("United States of America", "us", (name) => name !== "District of Columbia")),
  canada: featureCollection(adminFeatures("Canada", "canada")),
  australia: featureCollection(adminFeatures("Australia", "australia", (name) => name !== "Jervis Bay Territory")),
  uk: featureCollection(ukFeatures())
};

const output = [
  "// Generated geographic game data. See scripts/generate-map-data.mjs for sources and licenses.",
  `(function(){window.COUNTRY_DRAW_MAP_DATA=${JSON.stringify(regions)};})();`,
  ""
].join("\n");

writeFileSync(join(root, "assets", "map-data.js"), output);
Object.entries(regions).forEach(([key, collection]) => {
  console.log(`${key}: ${collection.features.length} playable boundaries`);
});
console.log(`Generated assets/map-data.js (${Buffer.byteLength(output)} bytes).`);

function worldFeatures() {
  const grouped = new Map();
  worldTopo.objects.countries.geometries.forEach((geometry) => {
    const numeric = String(geometry.id).padStart(3, "0");
    const alpha3 = numericToAlpha3.get(numeric);
    const fallbackName = normalizedName(geometry.properties?.name);
    const meta = metadata.world.get(alpha3) || metadata.world.get(fallbackName);
    if (!meta) return;
    const key = alpha3 || normalizedName(meta.name);
    const converted = topologyGeometry(geometry);
    const existing = grouped.get(key);
    grouped.set(key, {
      meta,
      code: alpha3 || numeric,
      geometry: existing ? mergeGeometries(existing.geometry, converted) : converted
    });
  });

  const representedNames = new Set([...grouped.values()].map((item) => normalizedName(item.meta.name)));
  worldMeta.features.forEach((feature) => {
    const props = feature.properties || {};
    const name = props.name;
    if (representedNames.has(normalizedName(name))) return;
    const meta = metadata.world.get(props["ISO3166-1-Alpha-3"]) || metadata.world.get(normalizedName(name));
    if (!meta || !["Polygon", "MultiPolygon"].includes(feature.geometry?.type)) return;
    grouped.set(props["ISO3166-1-Alpha-3"] || normalizedName(name), {
      meta,
      code: props["ISO3166-1-Alpha-3"] || "",
      geometry: feature.geometry
    });
  });

  return [...grouped.values()]
    .map((item) => gameFeature(item.meta, item.geometry, "world", item.code))
    .sort(featureSort);
}

function adminFeatures(countryName, regionKey, include = () => true) {
  return admin1.features
    .filter((feature) => feature.properties.admin === countryName)
    .filter((feature) => include(feature.properties.name))
    .map((feature) => {
      const name = canonicalSubdivisionName(feature.properties.name);
      const meta = metadata[regionKey].get(normalizedName(name));
      const fallback = {
        name,
        capital: `${name} center`,
        coords: [Number(feature.properties.longitude), Number(feature.properties.latitude)]
      };
      return gameFeature(meta || fallback, feature.geometry, regionKey, feature.properties.iso_3166_2);
    })
    .sort(featureSort);
}

function ukFeatures() {
  return ukBoundaries.features
    .map((feature) => {
      const name = feature.properties.shapeName;
      const meta = metadata.uk.get(normalizedName(name));
      return gameFeature(meta || { name, capital: `${name} center`, coords: centroid(feature.geometry) }, feature.geometry, "uk", feature.properties.shapeISO);
    })
    .sort(featureSort);
}

function metadataMap(collection, regionKey) {
  const map = new Map();
  collection.features.forEach((feature) => {
    const props = feature.properties || {};
    const rawName = props.name || props.NAME || props.Province || props.ste_name;
    const name = canonicalSubdivisionName(Array.isArray(rawName) ? rawName[0] : rawName);
    const item = {
      name,
      capital: props.Capital || `${name} center`,
      coords: [Number(props.Longitude), Number(props.Latitude)]
    };
    const alpha3 = props["ISO3166-1-Alpha-3"];
    if (alpha3) map.set(alpha3, item);
    map.set(normalizedName(name), item);

    if (regionKey === "canada" && name === "Newfoundland") {
      map.set(normalizedName("Newfoundland and Labrador"), { ...item, name: "Newfoundland and Labrador" });
    }
  });
  return map;
}

function gameFeature(meta, geometry, regionKey, code) {
  return {
    type: "Feature",
    properties: {
      name: canonicalCountryName(meta.name),
      slug: slugify(canonicalCountryName(meta.name)),
      region: regionKey,
      code: code || "",
      capital: meta.capital,
      capitalCoords: meta.coords.map(Number)
    },
    geometry: roundGeometry(geometry)
  };
}

function featureCollection(features) {
  return { type: "FeatureCollection", features };
}

function topologyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.arcs.map(stitchRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.arcs.map((polygon) => polygon.map(stitchRing))
    };
  }
  throw new Error(`Unsupported topology geometry: ${geometry.type}`);
}

function mergeGeometries(first, second) {
  const polygons = [];
  polygons.push(...(first.type === "Polygon" ? [first.coordinates] : first.coordinates));
  polygons.push(...(second.type === "Polygon" ? [second.coordinates] : second.coordinates));
  return polygons.length === 1
    ? { type: "Polygon", coordinates: polygons[0] }
    : { type: "MultiPolygon", coordinates: polygons };
}

function stitchRing(arcIndexes) {
  const ring = arcIndexes.flatMap((arcIndex, index) => {
    const points = decodeArc(arcIndex);
    return index ? points.slice(1) : points;
  });
  if (ring.length && !samePoint(ring[0], ring[ring.length - 1])) ring.push([...ring[0]]);
  return ring;
}

function decodeArc(arcIndex) {
  const reverse = arcIndex < 0;
  const encoded = worldTopo.arcs[reverse ? ~arcIndex : arcIndex];
  const scale = worldTopo.transform?.scale || [1, 1];
  const translate = worldTopo.transform?.translate || [0, 0];
  let x = 0;
  let y = 0;
  const points = encoded.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
  return reverse ? points.reverse() : points;
}

function roundGeometry(geometry) {
  return {
    type: geometry.type,
    coordinates: roundCoordinates(geometry.coordinates)
  };
}

function roundCoordinates(value) {
  if (typeof value[0] === "number") {
    return [Number(value[0].toFixed(4)), Number(value[1].toFixed(4))];
  }
  return value.map(roundCoordinates);
}

function centroid(geometry) {
  const points = [];
  collectPoints(geometry.coordinates, points);
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length
  ];
}

function collectPoints(value, output) {
  if (typeof value[0] === "number") {
    output.push(value);
    return;
  }
  value.forEach((child) => collectPoints(child, output));
}

function canonicalCountryName(name) {
  return {
    "United States of America": "United States",
    "Czechia": "Czech Republic",
    "Türkiye": "Turkey"
  }[name] || name;
}

function canonicalSubdivisionName(name) {
  return {
    "Québec": "Quebec"
  }[name] || name;
}

function normalizedName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function featureSort(a, b) {
  return a.properties.name.localeCompare(b.properties.name);
}

function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${url}: ${response.status}`);
  return response.json();
}
