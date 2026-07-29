import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync("assets/map-data.js", "utf8");
const sandbox = { window: {} };
runInNewContext(source, sandbox);

const data = sandbox.window.COUNTRY_DRAW_MAP_DATA;
const expectedCounts = { world: 197, us: 50, canada: 13, australia: 8, uk: 4 };
const errors = [];

Object.entries(expectedCounts).forEach(([region, expected]) => {
  const collection = data?.[region];
  if (collection?.type !== "FeatureCollection") {
    errors.push(`${region}: missing FeatureCollection`);
    return;
  }
  if (collection.features.length !== expected) {
    errors.push(`${region}: expected ${expected} features, found ${collection.features.length}`);
  }

  const names = new Set();
  const slugs = new Set();
  collection.features.forEach((feature) => {
    const label = `${region}/${feature.properties?.slug || "unknown"}`;
    if (!["Polygon", "MultiPolygon"].includes(feature.geometry?.type)) {
      errors.push(`${label}: invalid geometry type`);
    }
    if (!feature.properties?.name || !feature.properties?.capital) {
      errors.push(`${label}: missing name or capital`);
    }
    if (!feature.properties?.capitalCoords?.every(Number.isFinite)) {
      errors.push(`${label}: invalid capital coordinates`);
    }
    if (names.has(feature.properties.name)) errors.push(`${label}: duplicate name`);
    if (slugs.has(feature.properties.slug)) errors.push(`${label}: duplicate slug`);
    names.add(feature.properties.name);
    slugs.add(feature.properties.slug);

    const rings = polygonRings(feature.geometry);
    if (!rings.length) errors.push(`${label}: no polygon rings`);
    rings.forEach((ring, index) => {
      if (ring.length < 4) errors.push(`${label}: ring ${index} has fewer than four points`);
      if (!samePoint(ring[0], ring[ring.length - 1])) {
        errors.push(`${label}: ring ${index} is not closed`);
      }
      if (!ring.flat().every(Number.isFinite)) errors.push(`${label}: ring ${index} has invalid coordinates`);
    });
    const bounds = geometryBounds(rings);
    if (bounds.width <= 0 || bounds.height <= 0) errors.push(`${label}: zero-area bounds`);
  });
});

const indonesia = feature("world", "indonesia");
if (indonesia.geometry.type !== "MultiPolygon" || indonesia.geometry.coordinates.length < 10) {
  errors.push("world/indonesia: island geometry was unexpectedly discarded");
}
["france", "norway", "japan", "new-zealand"].forEach((slug) => {
  if (feature("world", slug).geometry.type !== "MultiPolygon") {
    errors.push(`world/${slug}: expected complete MultiPolygon geometry`);
  }
});
["italy", "france", "japan", "brazil", "india", "united-states", "australia"].forEach((slug) => {
  if (!feature("world", slug)) errors.push(`world/${slug}: dedicated target missing`);
});
["california", "texas", "florida", "alaska", "hawaii"].forEach((slug) => {
  if (!feature("us", slug)) errors.push(`us/${slug}: dedicated target missing`);
});

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Map data audit passed for 272 geographic targets.");
}

function feature(region, slug) {
  return data[region].features.find((item) => item.properties.slug === slug);
}

function polygonRings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  return geometry.coordinates.flat();
}

function geometryBounds(rings) {
  const points = rings.flat();
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function samePoint(first, second) {
  return first?.[0] === second?.[0] && first?.[1] === second?.[1];
}
