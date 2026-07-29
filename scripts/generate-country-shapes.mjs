import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const sourceUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
const sourceFile = process.env.COUNTRY_SHAPES_SOURCE;
const topo = sourceFile
  ? JSON.parse(readFileSync(sourceFile, "utf8"))
  : await fetch(sourceUrl).then((response) => {
      if (!response.ok) throw new Error(`Unable to download country shapes: ${response.status}`);
      return response.json();
    });

const excluded = new Set(["Antarctica", "Fr. S. Antarctic Lands", "N. Cyprus", "Somaliland"]);
const renamed = {
  "W. Sahara": "Western Sahara",
  "United States of America": "United States",
  "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Dominican Rep.": "Dominican Republic",
  "Falkland Is.": "Falkland Islands",
  "Central African Rep.": "Central African Republic",
  "Eq. Guinea": "Equatorial Guinea",
  "eSwatini": "Eswatini",
  "Solomon Is.": "Solomon Islands",
  "Bosnia and Herz.": "Bosnia and Herzegovina",
  "Macedonia": "North Macedonia",
  "S. Sudan": "South Sudan"
};

const shapes = topo.objects.countries.geometries
  .filter((geometry) => !excluded.has(geometry.properties.name))
  .map((geometry) => {
    const name = renamed[geometry.properties.name] || geometry.properties.name;
    return {
      slug: slugify(name),
      name,
      region: "World",
      path: geometryToPath(geometry)
    };
  })
  .filter((shape) => usablePath(shape.path))
  .sort((a, b) => a.name.localeCompare(b.name));

const output = `// Natural Earth country boundaries via world-atlas 2.0.2 (public domain data).\n` +
  `(function(){window.COUNTRY_DRAW_SHAPES=${JSON.stringify(shapes)};})();\n`;

writeFileSync(join(root, "assets", "country-shapes.js"), output);
console.log(`Generated ${shapes.length} country outlines.`);

function geometryToPath(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.arcs] : geometry.arcs;
  const allRings = polygons
    .map((polygon) => polygon[0])
    .filter(Boolean)
    .map(stitchRing);
  const ringStats = allRings.map((ring) => ringSummary(ring));
  const primary = ringStats.reduce((largest, item) => item.area > largest.area ? item : largest, ringStats[0]);
  const rings = ringStats
    .filter((item) => {
      const longitudeDistance = circularDistance(item.longitude, primary.longitude);
      const latitudeDistance = Math.abs(item.latitude - primary.latitude);
      return item === primary || longitudeDistance <= 55 && latitudeDistance <= 38;
    })
    .map((item) => item.ring);
  if (!rings.length) return "";

  const longitudes = rings.flat().map(([longitude]) => normalizeLongitude(longitude));
  const start = longitudeWindowStart(longitudes);
  const projected = rings.map((ring) => ring.map(([longitude, latitude]) => {
    let x = normalizeLongitude(longitude);
    if (x < start) x += 360;
    return [x, -latitude];
  }));

  const points = projected.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = Math.max(0.001, maxX - minX);
  const height = Math.max(0.001, maxY - minY);
  const scale = 88 / Math.max(width, height);
  const offsetX = 50 - ((minX + maxX) / 2) * scale;
  const offsetY = 50 - ((minY + maxY) / 2) * scale;

  return projected.map((ring) => {
    const commands = ring.map(([x, y], index) => {
      const px = trim(x * scale + offsetX);
      const py = trim(y * scale + offsetY);
      return `${index ? "L" : "M"}${px} ${py}`;
    });
    return `${commands.join(" ")} Z`;
  }).join(" ");
}

function ringSummary(ring) {
  const unwrapped = [];
  ring.forEach(([longitude, latitude], index) => {
    let x = longitude;
    if (index) {
      const previous = unwrapped[index - 1][0];
      while (x - previous > 180) x -= 360;
      while (x - previous < -180) x += 360;
    }
    unwrapped.push([x, latitude]);
  });

  let doubleArea = 0;
  for (let index = 0; index < unwrapped.length; index += 1) {
    const [x1, y1] = unwrapped[index];
    const [x2, y2] = unwrapped[(index + 1) % unwrapped.length];
    doubleArea += x1 * y2 - x2 * y1;
  }

  return {
    ring,
    area: Math.abs(doubleArea / 2),
    longitude: normalizeLongitude(unwrapped.reduce((sum, [x]) => sum + x, 0) / unwrapped.length),
    latitude: unwrapped.reduce((sum, [, y]) => sum + y, 0) / unwrapped.length
  };
}

function circularDistance(a, b) {
  const direct = Math.abs(a - b);
  return Math.min(direct, 360 - direct);
}

function stitchRing(arcIndexes) {
  return arcIndexes.flatMap((arcIndex, index) => {
    const points = decodeArc(arcIndex);
    return index ? points.slice(1) : points;
  });
}

function decodeArc(arcIndex) {
  const reverse = arcIndex < 0;
  const encoded = topo.arcs[reverse ? ~arcIndex : arcIndex];
  const scale = topo.transform?.scale || [1, 1];
  const translate = topo.transform?.translate || [0, 0];
  let x = 0;
  let y = 0;
  const points = encoded.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
  return reverse ? points.reverse() : points;
}

function longitudeWindowStart(longitudes) {
  const sorted = [...longitudes].sort((a, b) => a - b);
  let largestGap = -1;
  let start = sorted[0] || 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
    if (next - current > largestGap) {
      largestGap = next - current;
      start = next % 360;
    }
  }
  return start;
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}

function trim(value) {
  return Number(value.toFixed(2));
}

function usablePath(path) {
  if (!path) return false;
  const values = Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number(match[0]));
  const xs = values.filter((_, index) => index % 2 === 0);
  const ys = values.filter((_, index) => index % 2 === 1);
  return Math.max(...xs) - Math.min(...xs) >= 1 && Math.max(...ys) - Math.min(...ys) >= 1;
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
