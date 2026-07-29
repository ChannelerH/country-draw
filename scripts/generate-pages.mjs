import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const siteUrl = (process.env.SITE_URL || "https://countrydraw.games").replace(/\/$/, "");

const coreLinks = [
  { href: "/", label: "Country Draw" },
  { href: "/draw-country/", label: "Draw Country" },
  { href: "/draw-us-states/", label: "Draw US States" },
  { href: "/draw-flags-from-memory/", label: "Draw Flags" },
  { href: "/country-outline-quiz/", label: "Country Outline Quiz" },
  { href: "/draw-country-borders/", label: "Draw Country Borders" }
];

const socialImage = `${siteUrl}/assets/og-country-draw.png`;

const countries = [
  "Italy", "France", "Japan", "Brazil", "India", "United States", "Mexico", "Australia",
  "United Kingdom", "Germany", "Canada", "Spain", "Norway", "Argentina", "South Africa",
  "Egypt", "China", "Russia", "Sweden", "Greece", "Turkey", "Indonesia", "New Zealand",
  "Ireland"
].map((name) => ({ name, slug: slugify(name), mode: "world" }));

const states = [
  "California", "Texas", "Florida", "New York", "Alaska", "Hawaii", "Colorado",
  "Michigan", "Washington", "Arizona"
].map((name) => ({ name, slug: slugify(name), mode: "states" }));

const flags = [
  "Japan", "Switzerland", "France", "Canada", "United Kingdom", "Brazil",
  "United States", "South Korea"
].map((name) => ({ name, slug: slugify(name), mode: "flags" }));

const pages = [
  {
    path: "/",
    title: "Country Draw - Draw Countries From Memory",
    description: "Play Country Draw online. Draw countries from memory, compare your sketch with the real outline, and practice map shapes, borders, states, flags, and silhouettes.",
    mode: "world",
    h1: "Country Draw",
    intro: "Country Draw is a fast geography drawing game for people who know a map until they try to sketch it. Start with a country name, draw the outline from memory, then compare the result with the real shape.",
    faq: [
      ["What is Country Draw?", "Country Draw is a browser game where you draw a country, state, flag, or outline from memory and compare your result with a target shape."],
      ["Is Country Draw free?", "Yes. The game is designed to run in the browser without an account or download."],
      ["Can I practice specific countries?", "Yes. Country and state pages can launch a specific target so you can practice one shape at a time."]
    ]
  },
  {
    path: "/draw-country/",
    title: "Draw Country - Draw Countries From Memory Online",
    description: "Draw countries from memory online. Practice country borders, coastlines, and silhouettes with an instant outline comparison.",
    mode: "world",
    h1: "Draw Countries From Memory",
    intro: "This country drawing game focuses on the classic map memory challenge: can you draw the country well enough that another person would recognize it?",
    faq: [
      ["How does the country drawing score work?", "The score compares your normalized sketch against sampled points from the target outline."],
      ["Which countries are included?", "The first version includes a focused set of common countries, with more country pages designed to be added over time."],
      ["Can this help with geography practice?", "Yes. Repeating the same outline helps you remember proportion, coastline, and border features."]
    ]
  },
  {
    path: "/draw-the-country/",
    title: "Draw The Country Game",
    description: "Play Draw The Country as a browser geography challenge. Sketch countries from memory and reveal the real outline after each attempt.",
    mode: "world",
    h1: "Draw The Country",
    intro: "Draw The Country is the search phrase many players use when they want the country outline drawing challenge without installing anything.",
    faq: [
      ["Is this the same as a map quiz?", "It is related, but the main action is drawing instead of choosing from a list."],
      ["Do I need a stylus?", "No. Mouse, trackpad, and touch drawing all work."],
      ["What should I try first?", "Start with a familiar outline such as Italy, Japan, Australia, or the United States."]
    ]
  },
  {
    path: "/draw-country-borders/",
    title: "Draw Country Borders From Memory",
    description: "Practice drawing country borders and coastlines from memory. Submit a sketch and compare it with the target outline.",
    mode: "world",
    h1: "Draw Country Borders",
    intro: "Country borders are harder to remember than country names. This mode gives each outline enough space for repeated geography practice.",
    faq: [
      ["Are borders exact?", "The first target set uses simplified outlines for fast play and scoring."],
      ["Can I use this for study?", "Yes. It works best as repeated recall practice before checking a real map."],
      ["Will more regions be added?", "The static page structure supports more countries, states, and region packs."]
    ]
  },
  {
    path: "/draw-us-states/",
    title: "Draw US States From Memory",
    description: "Draw US states from memory online. Practice California, Texas, Florida, New York, Alaska, Hawaii, and more state outlines.",
    mode: "states",
    h1: "Draw US States From Memory",
    intro: "US state outlines make strong geography challenges because many shapes are familiar but difficult to sketch accurately.",
    faq: [
      ["Which states can I draw?", "The first set includes California, Texas, Florida, New York, Alaska, Hawaii, Colorado, Michigan, Washington, and Arizona."],
      ["Does the game work on mobile?", "Yes. The drawing canvas supports touch input."],
      ["Why add state pages?", "State pages create useful long tail entrances for players looking for one specific outline."]
    ]
  },
  {
    path: "/draw-flags-from-memory/",
    title: "Draw Flags From Memory",
    description: "Draw flags from memory and compare your sketch with the key layout. Practice Japan, Canada, Brazil, France, and more.",
    mode: "flags",
    h1: "Draw Flags From Memory",
    intro: "Flag drawing is a nearby memory challenge for players who like geography games but want a faster visual prompt than a map outline.",
    faq: [
      ["Is this a flag coloring game?", "No. The first version compares the main flag geometry rather than color accuracy."],
      ["Which flags are included?", "The first set includes Japan, Switzerland, France, Canada, the United Kingdom, Brazil, the United States, and South Korea."],
      ["Why include flags on a country drawing site?", "Flag pages broaden the geography drawing keyword set and create repeatable practice loops."]
    ]
  },
  {
    path: "/country-outline-quiz/",
    title: "Country Outline Quiz - Guess Countries By Shape",
    description: "Play a country outline quiz online. Guess the country by silhouette, then switch to drawing mode to practice the shape.",
    mode: "outline",
    h1: "Country Outline Quiz",
    intro: "Country outline quiz searches often come from players who want to recognize map shapes before they try drawing them.",
    faq: [
      ["How is this different from Country Draw?", "The outline quiz starts with recognition. Country Draw starts with recall and drawing."],
      ["Can I switch from quiz to drawing?", "Yes. The app links the outline quiz back to the drawing challenge."],
      ["Is the quiz timed?", "The first version is untimed so the page remains easy to use on desktop and mobile."]
    ]
  },
  {
    path: "/guess-country-by-shape/",
    title: "Guess Country By Shape",
    description: "Guess the country by shape in a simple outline quiz, then practice drawing the same country from memory.",
    mode: "outline",
    h1: "Guess Country By Shape",
    intro: "This outline quiz is made for players who remember coastlines and borders visually. Each silhouette is a direct bridge into country drawing practice.",
    faq: [
      ["What shapes are included?", "The initial quiz uses common country outlines from the drawing pool."],
      ["Can I learn from wrong answers?", "Yes. Repeating the outline and then drawing it creates a useful memory loop."],
      ["Does it require an account?", "No account is required."]
    ]
  },
  {
    path: "/geography-drawing-game/",
    title: "Geography Drawing Game",
    description: "A geography drawing game for countries, US states, flags, and country outlines. Play online without a download.",
    mode: "world",
    h1: "Geography Drawing Game",
    intro: "The broader geography drawing game page collects the country, state, flag, and outline modes into one search-friendly entry point.",
    faq: [
      ["What can I draw?", "Countries, selected US states, and simplified flag layouts."],
      ["Is it a learning tool or a game?", "It is both: quick enough to play, structured enough to practice geography recall."],
      ["Can new packs be added?", "Yes. The static data model supports more regions and topic packs."]
    ]
  }
];

countries.forEach((country) => {
  pages.push({
    path: `/draw/${country.slug}/`,
    title: `Draw ${country.name} From Memory`,
    description: `Draw ${country.name} from memory online. Practice the outline, compare your sketch, and improve your country shape recall.`,
    mode: "world",
    target: country.slug,
    h1: `Draw ${country.name} From Memory`,
    intro: `This page starts Country Draw with ${country.name} selected, so players can practice one country outline instead of cycling through the full country list.`,
    faq: [
      [`Can I draw ${country.name} directly?`, `Yes. This page opens the drawing game with ${country.name} selected as the first challenge.`],
      [`Why practice ${country.name} alone?`, `Single country pages are useful when you want repeated recall on one outline before moving to a full map quiz.`],
      ["Can I switch to another country?", "Yes. Use the challenge list or the new shape button inside the game."]
    ]
  });
});

states.forEach((state) => {
  pages.push({
    path: `/draw/us/${state.slug}/`,
    title: `Draw ${state.name} From Memory`,
    description: `Draw ${state.name} from memory in a US state outline drawing game. Practice the state shape and compare your sketch.`,
    mode: "states",
    target: state.slug,
    h1: `Draw ${state.name} From Memory`,
    intro: `This state page starts the US states drawing mode with ${state.name} selected for focused outline practice.`,
    faq: [
      [`Can I draw ${state.name} online?`, `Yes. This page opens the drawing canvas with ${state.name} selected.`],
      ["Are other states available?", "Yes. The US states mode includes a starter set of recognizable state outlines."],
      ["Does it work on touch screens?", "Yes. Pointer input supports touch and mouse drawing."]
    ]
  });
});

flags.forEach((flag) => {
  pages.push({
    path: `/draw-flags/${flag.slug}/`,
    title: `Draw The ${flag.name} Flag From Memory`,
    description: `Draw the ${flag.name} flag from memory online. Practice the key flag layout and compare your sketch.`,
    mode: "flags",
    target: flag.slug,
    h1: `Draw The ${flag.name} Flag From Memory`,
    intro: `This flag page starts the flag drawing mode with the ${flag.name} flag selected for focused memory practice.`,
    faq: [
      [`Can I draw the ${flag.name} flag?`, `Yes. This page opens the flag drawing mode with the ${flag.name} flag selected.`],
      ["Does color matter?", "The first scoring pass focuses on the main geometry of the flag."],
      ["Can I draw countries too?", "Yes. Country and state drawing modes are linked from the same app."]
    ]
  });
});

writeFileSync(join(root, ".nojekyll"), "");
writeFileSync(join(root, "manifest.webmanifest"), JSON.stringify({
  name: "Country Draw",
  short_name: "Country Draw",
  start_url: "/",
  display: "standalone",
  background_color: "#f7f3e8",
  theme_color: "#173f58",
  description: "Draw countries, states, flags, and outlines from memory."
}, null, 2));

pages.forEach((page) => writePage(page));
mkdirSync(join(root, "privacy"), { recursive: true });
writeFileSync(join(root, "privacy", "index.html"), privacyTemplate());
writeFileSync(join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
writeFileSync(join(root, "sitemap.xml"), sitemap(pages.concat([{
  path: "/privacy/",
  target: true
}])));
writeFileSync(join(root, "404.html"), template({
  path: "/404.html",
  title: "Country Draw Page Not Found",
  description: "This Country Draw page was not found. Jump back into the geography drawing game.",
  mode: "world",
  h1: "Country Draw",
  intro: "This page was not found, but the drawing game is ready.",
  faq: [
    ["Where should I go next?", "Start with the main Country Draw page or the country drawing mode."],
    ["Can I still play?", "Yes. The app loads on this page too."]
  ]
}));

function writePage(page) {
  const file = page.path === "/" ? join(root, "index.html") : join(root, page.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, template(page));
}

function template(page) {
  const canonical = `${siteUrl}${page.path}`;
  const related = relatedLinks(page.path);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Country Draw",
      url: canonical,
      applicationCategory: "GameApplication",
      operatingSystem: "Any",
      description: page.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map(([question, answer]) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Country Draw",
          item: `${siteUrl}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.h1,
          item: canonical
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Country Draw",
      url: `${siteUrl}/`,
      inLanguage: "en"
    }
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>${redirectScript()}</script>
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#173f58">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Country Draw">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${socialImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Country Draw geography drawing game">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(page.title)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${socialImage}">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/assets/styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script src="/assets/analytics.js"></script>
</head>
<body>
  <div data-country-draw-app data-mode="${page.mode}" data-target="${page.target || ""}"></div>
  <main class="seo-wrap">
    <article class="seo-card">
      <p class="kicker">Geography drawing game</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <p>${escapeHtml(page.intro)}</p>
      <div class="seo-columns">
        <section>
          <h2>What to Notice</h2>
          <p>${escapeHtml(practiceTip(page))}</p>
        </section>
        <section>
          <h2>Practice Loop</h2>
          <p>Each attempt turns vague map memory into a visible outline. The page is intentionally lightweight so repeat plays, mobile drawing, and search indexing stay fast.</p>
        </section>
      </div>
      <div class="seo-columns">
        ${page.faq.map(([question, answer]) => `<section><h2>${escapeHtml(question)}</h2><p>${escapeHtml(answer)}</p></section>`).join("")}
      </div>
    </article>
    <aside class="related-panel">
      <h2>Related Geography Games</h2>
      <div class="related-links">
        ${related.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
      </div>
    </aside>
  </main>
  <footer class="site-footer">
    Country Draw is a free browser geography game.
    <span class="footer-links"><a href="/privacy/">Privacy</a><button class="footer-privacy-button" type="button" data-privacy-choices>Analytics choices</button></span>
  </footer>
  <script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function practiceTip(page) {
  if (page.mode === "flags") {
    return "Start with the flag's largest blocks, then place the central symbol or cross. Proportion matters more than tiny details on the first attempt.";
  }
  if (page.mode === "states") {
    return "Look for the longest edge, the overall aspect ratio, and one distinctive corner. Those three anchors make a state outline much easier to recall.";
  }
  if (page.mode === "outline") {
    return "Compare the silhouette's width, coastline direction, and any narrow peninsula before choosing an answer. Then draw the same shape to strengthen recall.";
  }
  if (page.target) {
    return `Sketch the overall width and height of ${page.h1.replace(/^Draw | From Memory$/g, "")} before adding coastlines or borders. Large proportions have the biggest effect on recognition.`;
  }
  return "Block in the overall width and height first. Add one memorable coastline, border, or peninsula only after the main proportion feels right.";
}

function redirectScript() {
  return `(function(){var h=location.hostname;if(h==="www.countrydraw.games"||(h==="countrydraw.games"&&location.protocol!=="https:")){location.replace("https://countrydraw.games"+location.pathname+location.search+location.hash);}})();`;
}

function privacyTemplate() {
  const title = "Privacy - Country Draw";
  const description = "Learn how Country Draw uses Google Analytics and manage your analytics choice.";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script>${redirectScript()}</script>
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#173f58">
  <link rel="canonical" href="${siteUrl}/privacy/">
  <link rel="stylesheet" href="/assets/styles.css">
  <script src="/assets/analytics.js"></script>
</head>
<body>
  <main class="privacy-page">
    <header>
      <p class="kicker">Country Draw</p>
      <h1>Privacy</h1>
      <p>Last updated: July 28, 2026</p>
    </header>
    <section>
      <h2>What the game stores</h2>
      <p>Your drawing stays in the browser while you play. Country Draw does not require an account and does not ask for your name, email address, or payment details.</p>
    </section>
    <section>
      <h2>Analytics</h2>
      <p>With your permission, Google Analytics measures page visits and game actions such as starting a drawing, submitting a score, changing a target, and answering an outline quiz. Event data identifies the game mode and shape, not the player.</p>
      <p>Advertising storage and ad personalization are disabled. You can decline analytics and continue using every game feature.</p>
    </section>
    <section>
      <h2>Your choice</h2>
      <div class="privacy-controls">
        <button type="button" data-privacy-choices>Review analytics choice</button>
        <a class="ghost-link" href="/">Back to Country Draw</a>
      </div>
    </section>
    <section>
      <h2>Third-party service</h2>
      <p>Google Analytics is provided by Google. Google's handling of analytics data is described in its privacy and data-use documentation.</p>
    </section>
  </main>
</body>
</html>
`;
}

function relatedLinks(currentPath) {
  return coreLinks.filter((link) => link.href !== currentPath).slice(0, 6);
}

function sitemap(allPages) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = allPages.map((page) => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.path === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${page.path === "/" ? "1.0" : page.target ? "0.7" : "0.9"}</priority>
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
