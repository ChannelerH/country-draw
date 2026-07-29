# Country Draw

**Play the free geography game:** [countrydraw.games](https://countrydraw.games/)

Draw countries from memory on a real map, then compare your outline with the
true border using matched, missed, and extra-area scoring. Country Draw includes
daily challenges, 197 country practice targets, US states, Canadian provinces,
Australian states, and UK regions.

Static geography drawing game built for search traffic around:

- country draw
- draw the country
- draw countries from memory
- draw US states
- draw flags from memory
- country outline quiz

The site has no build dependency. Core pages and long tail SEO pages are generated as plain HTML, then served with shared CSS and JavaScript.

The map drawing modes include deterministic daily challenges, Cover and
Capital clues, local streak and personal-best tracking, stroke undo, geographic
area scoring, matched/missed/extra result overlays, searchable practice pools,
and native sharing where the browser supports it.

## Generate Pages

```bash
node scripts/generate-pages.mjs
node scripts/audit-seo.mjs
```

The production canonical domain defaults to `https://countrydraw.games`. Override it for previews or alternate deployments:

```bash
SITE_URL=https://your-domain.com node scripts/generate-pages.mjs
```

Generated outputs include:

- `index.html`
- core keyword routes
- country, US state, and flag long tail routes
- `sitemap.xml`
- `robots.txt`
- `manifest.webmanifest`
- `404.html`

Country outlines are generated from Natural Earth data distributed by
`world-atlas`:

```bash
node scripts/generate-country-shapes.mjs
```

The generated `assets/country-shapes.js` file is committed so the production
game does not need a third-party request at runtime.

The primary map game uses Natural Earth 1:50m country and administrative
boundaries, plus CC BY 4.0 UK boundaries from geoBoundaries:

```bash
node scripts/generate-map-data.mjs
```

The generated `assets/map-data.js`, MapLibre, and Turf bundles are committed.
Only the OpenFreeMap basemap tiles are loaded at runtime.

## Local Preview

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## SEO Notes

The first screen is the playable tool. SEO copy, FAQ schema, canonical links, sitemap entries, and internal links are present below the app surface.

Add new targets in two places:

1. `assets/app.js` for playable shapes.
2. `scripts/generate-pages.mjs` for generated SEO pages.

Keep target pages playable. The map game exposes 197 searchable countries plus
US, Canadian, Australian, and UK subdivisions. Dedicated long-tail pages remain
limited to targets with reviewed, unique practice guidance.
