# Country Draw

Static geography drawing game built for search traffic around:

- country draw
- draw the country
- draw countries from memory
- draw US states
- draw flags from memory
- country outline quiz

The site has no build dependency. Core pages and long tail SEO pages are generated as plain HTML, then served with shared CSS and JavaScript.

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

Keep target pages playable. The game exposes 172 searchable country and
territory outlines, while dedicated long-tail pages are limited to targets
with reviewed, unique practice guidance.
