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

const countryProfiles = {
  "Italy": ["Southern Europe", "an unmistakable boot-shaped peninsula", "the Alpine arc across the north, the narrow leg, and Sicily below the toe"],
  "France": ["Western Europe", "a compact, roughly hexagonal mainland", "the broad north, the Atlantic side, and the southeast corner toward the Mediterranean"],
  "Japan": ["East Asia", "a curved island chain running northeast to southwest", "Hokkaido at the top, long Honshu through the center, and the smaller southern islands"],
  "Brazil": ["South America", "a broad body with a long Atlantic curve", "the wide north, the eastern bulge, and the gradual taper toward the south"],
  "India": ["South Asia", "a wide northern base above a triangular peninsula", "the Himalayan edge, two sloping coasts, and the southern tip"],
  "United States": ["North America", "a wide mainland with several memorable projections", "the Pacific and Atlantic sides, the Gulf Coast, Florida, Alaska, and Hawaii"],
  "Mexico": ["North America", "a broad north that narrows toward Central America", "the Baja California peninsula, the Gulf curve, and the southeast bend"],
  "Australia": ["Oceania", "a wide island continent with a comparatively simple silhouette", "Cape York in the northeast, the southern bight, the west coast, and Tasmania"],
  "United Kingdom": ["Northern Europe", "a tall island outline with an uneven coastline", "Scotland at the top, Wales to the west, southeast England, and Northern Ireland"],
  "Germany": ["Central Europe", "a compact country that is wider through the middle", "the northern coast, the western bulge, and the narrower southern edge"],
  "Canada": ["North America", "an extremely wide northern outline broken by water", "the Pacific and Atlantic ends, Hudson Bay, the Arctic islands, and Newfoundland"],
  "Spain": ["Southern Europe", "a solid Iberian shape with a broad top", "the Pyrenees edge, the Atlantic northwest, and the Mediterranean southeast"],
  "Norway": ["Northern Europe", "a long, narrow country with a rugged western coast", "the rounded south, the fjord-cut west, and the far northern reach"],
  "Argentina": ["South America", "a long north-to-south silhouette", "the broader north, the eastward shoulder, and the taper through Patagonia"],
  "South Africa": ["Southern Africa", "a broad shape wrapped around the continent's southern end", "the Atlantic west, Indian Ocean east, and the Cape at the bottom"],
  "Egypt": ["North Africa", "a mostly angular mainland with a distinct eastern extension", "the straight Mediterranean edge, the Nile-facing center, Sinai, and the Red Sea side"],
  "China": ["East Asia", "a very broad east-to-west silhouette", "the wider east, the northern arc, the western interior, and the southern coast"],
  "Russia": ["Europe and Asia", "the widest country outline in the game", "the compact European west, the long Arctic top, and the tapering Pacific far east"],
  "Sweden": ["Northern Europe", "a long north-to-south form", "the narrow north, the Baltic-facing east, and the broader curved south"],
  "Greece": ["Southern Europe", "an irregular mainland surrounded by peninsulas and islands", "the northern mainland, the Peloponnese, the Aegean side, and the island groups"],
  "Turkey": ["Europe and Asia", "a long horizontal shape centered on Anatolia", "the narrow European end, the Black Sea top, and the Mediterranean south coast"],
  "Indonesia": ["Southeast Asia", "a scattered archipelago stretching west to east", "Sumatra, Java, Kalimantan, Sulawesi, and the eastern island chain"],
  "New Zealand": ["Oceania", "two main islands aligned northeast to southwest", "the narrower North Island, the longer South Island, and the gap of Cook Strait"],
  "Ireland": ["Northern Europe", "a compact island with a rounded overall shape", "the rugged Atlantic west, the smoother east coast, and the narrower northern end"]
};

const stateProfiles = {
  "California": ["West Coast", "a long diagonal shape", "the straight eastern border, the Pacific curve, and the pointed southern end"],
  "Texas": ["South Central", "a large shape with a northern panhandle", "the panhandle, the Gulf Coast, the Rio Grande curve, and the eastern edge"],
  "Florida": ["Southeast", "a long peninsula attached to a wider northern section", "the panhandle, the Atlantic side, the Gulf curve, and the southern tip"],
  "New York": ["Northeast", "a broad upstate body with a narrow southeastern extension", "the Great Lakes side, the Hudson corridor, and Long Island"],
  "Alaska": ["Pacific Northwest", "a large irregular mainland with a long island chain", "the northern coast, the southeastern panhandle, and the Aleutian sweep"],
  "Hawaii": ["Pacific", "an island chain rather than one continuous outline", "the northwest-to-southeast direction and the increasing island size toward Hawaii"],
  "Colorado": ["Mountain West", "a near-rectangular outline", "four mostly straight sides and subtle surveying irregularities"],
  "Michigan": ["Great Lakes", "two separate peninsulas", "the Upper Peninsula, the mitten-shaped Lower Peninsula, and the water gap between them"],
  "Washington": ["Pacific Northwest", "a broad rectangular state with an irregular western side", "the Pacific coast, Puget Sound, and the straighter southern and eastern borders"],
  "Arizona": ["Southwest", "a tall angular shape", "the Colorado River side, the slanted western edge, and the straight southern border"]
};

const flagProfiles = {
  "Japan": ["a white field with one centered red disc", "place the circle at the exact center and keep generous white space around it"],
  "Switzerland": ["a square red field with a white Greek cross", "keep all four arms equal and leave a consistent red margin"],
  "France": ["three equal vertical bands in blue, white, and red", "divide the rectangle into thirds before adding any color"],
  "Canada": ["two red side panels, a white center, and a maple leaf", "set the three vertical zones first, then center the leaf"],
  "United Kingdom": ["layered diagonal and upright crosses", "draw the broad diagonals first, then the centered vertical and horizontal cross"],
  "Brazil": ["a green field, yellow diamond, and blue globe", "center each nested shape and preserve the margin around the diamond"],
  "United States": ["thirteen horizontal stripes with a blue canton", "mark the canton first, then divide the remaining height into even stripes"],
  "South Korea": ["a white field with a central taegeuk and four corner trigrams", "center the circular symbol before placing the four black corner groups"]
};

const pages = [
  {
    path: "/",
    primaryKeyword: "draw countries from memory",
    secondaryKeyword: "country draw",
    title: "Draw Countries From Memory Online | Country Draw",
    description: "Draw countries from memory with Country Draw. Sketch borders on a real map, compare matched, missed, and extra areas, and practice 197 countries online.",
    mode: "world",
    h1: "Draw Countries From Memory with Country Draw",
    intro: "Draw countries from memory directly on a real map with Country Draw. Use surrounding borders and a capital marker as clues, sketch the missing outline, and reveal exactly which areas matched, were missed, or went beyond the real boundary.",
    faq: [
      ["What is Country Draw?", "Country Draw is a free browser geography game where you draw countries from memory on a real map and compare your sketch with the actual geographic boundary."],
      ["How is the drawing scored?", "The result separates the target into matched and missed areas, measures any extra area outside the boundary, and combines those differences into an accuracy score."],
      ["How many countries can I practice?", "World mode includes 197 countries. You can also practice US states, Canadian provinces and territories, Australian states and territories, and the four UK countries."],
      ["Can I choose a specific country?", "Yes. Use the practice selector or open a dedicated country page to repeat the same outline as often as needed."],
      ["Does Country Draw work on mobile?", "Yes. The map supports touch drawing, zooming, and panning on phones and tablets, as well as mouse and trackpad input on desktop."],
      ["Is an account required?", "No. Country Draw runs in the browser without an account or download, and game statistics are stored locally on your device."]
    ]
  },
  {
    path: "/draw-country/",
    primaryKeyword: "country drawing game",
    title: "Country Drawing Game - Draw Country Borders Online",
    description: "Play a country drawing game on a real map. Practice country borders, coastlines, and silhouettes with instant matched, missed, and extra feedback.",
    mode: "world",
    h1: "Country Drawing Game",
    intro: "This country drawing game turns map memory into a playable border challenge: choose a place, reconstruct its missing outline, and compare your result with the real geographic boundary.",
    faq: [
      ["How does the country drawing score work?", "The score compares your normalized sketch against sampled points from the target outline."],
      ["Which countries are included?", "The searchable map drawing pool includes 197 countries with Natural Earth 1:50m boundaries, including complete MultiPolygon geometry for island groups."],
      ["Can this help with geography practice?", "Yes. Repeating the same outline helps you remember proportion, coastline, and border features."]
    ]
  },
  {
    path: "/draw-the-country/",
    primaryKeyword: "draw the country",
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
    primaryKeyword: "draw country borders",
    title: "Draw Country Borders From Memory",
    description: "Practice drawing country borders and coastlines from memory. Submit a sketch and compare it with the target outline.",
    mode: "world",
    h1: "Draw Country Borders",
    intro: "Country borders are harder to remember than country names. This mode gives each outline enough space for repeated geography practice.",
    faq: [
      ["Are borders exact?", "The game uses Natural Earth 1:50m geographic boundaries for scoring and reveal layers. They are map-grade generalized borders rather than hand-drawn SVG approximations."],
      ["Can I use this for study?", "Yes. It works best as repeated recall practice before checking a real map."],
      ["Will more regions be added?", "The static page structure supports more countries, states, and region packs."]
    ]
  },
  {
    path: "/draw-us-states/",
    primaryKeyword: "draw US states",
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
    primaryKeyword: "draw flags from memory",
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
    primaryKeyword: "country outline quiz",
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
    primaryKeyword: "guess country by shape",
    title: "Guess Country By Shape",
    description: "Guess the country by shape in a simple outline quiz, then practice drawing the same country from memory.",
    mode: "outline",
    h1: "Guess Country By Shape",
    intro: "This outline quiz is made for players who remember coastlines and borders visually. Each silhouette is a direct bridge into country drawing practice.",
    faq: [
      ["What shapes are included?", "The quiz draws from the same searchable pool of 172 country and territory outlines as the drawing game."],
      ["Can I learn from wrong answers?", "Yes. Repeating the outline and then drawing it creates a useful memory loop."],
      ["Does it require an account?", "No account is required."]
    ]
  },
  {
    path: "/geography-drawing-game/",
    primaryKeyword: "geography drawing game",
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

const corePageProfiles = {
  "/": {
    play: "Country Draw places a hidden country on a real map and marks its capital. Reconstruct the missing border from geographic context, submit the drawing, and compare matched, missed, and extra areas with the real boundary.",
    focus: "The main country drawing mode trains recall rather than recognition. Outline quiz mode reverses the task and asks you to identify a silhouette. US state and flag modes keep the same short practice loop while changing the visual details you need to remember.",
    scoring: "The score is feedback, not a geography grade. It rewards a sketch that follows the target's broad proportions and major turns. Small coastal details matter less than the overall width, height, direction, and placement of distinctive parts.",
    practice: "Choose one familiar country first, draw it three times, and check the same two or three landmarks after every attempt. Then switch to a nearby or similarly shaped country. That contrast is more useful than drawing many random outlines only once."
  },
  "/draw-country/": {
    play: "To draw countries from memory, begin with the outside envelope of the shape: estimate its width, height, and direction before adding a coastline or border. Submit only after the silhouette is closed, then compare the target outline with the parts you remembered.",
    focus: "Country shapes become easier when you reduce them to a few anchors. Italy has a boot and an island, India has a triangular peninsula, and Japan forms a curved island chain. Less iconic countries can still be learned through one long edge, one major bend, and one unusual corner.",
    scoring: "A high score comes from matching the recognizable structure of the country, not from tracing every geographic detail. Drawing too narrow, rotating the outline, or placing a projection on the wrong side usually changes the silhouette more than a rough coastline.",
    practice: "Use focused practice pages when one outline keeps causing trouble. Draw the same country, reveal it, name the largest error, clear the canvas, and immediately redraw it. Spaced repetition later in the day helps turn that correction into durable map memory."
  },
  "/draw-the-country/": {
    play: "The Draw the Country game starts with a named place instead of a visible map. Your task is to reconstruct the country's border on a blank canvas and then compare the result with its real silhouette. No download, account, or reference image is required.",
    focus: "This is different from a multiple-choice map quiz because recognition cannot carry the answer. You must remember where the shape widens, where it narrows, which side contains the coastline, and whether islands or peninsulas belong to the outline.",
    scoring: "The comparison is designed for quick visual feedback. Treat a low score as a prompt to inspect proportion and direction first. Correcting the broad form produces more improvement than copying small border bends that you will not remember on the next attempt.",
    practice: "Start with Italy, Australia, Japan, or another shape you can describe in words. After one successful attempt, choose a less familiar outline from the same region and look for a shared coast, orientation, or proportion."
  },
  "/draw-country-borders/": {
    play: "When you draw country borders from memory, separate political borders from coastlines in your mind. First block out the entire country silhouette. Then identify which edges touch water and which edges are shared with neighboring countries.",
    focus: "Straight-looking international borders, river bends, peninsulas, and coastal arcs create different kinds of memory cues. A useful sketch does not need survey-level precision, but the sequence and direction of the major turns should remain recognizable.",
    scoring: "The target overlay shows where your border drifted outward or inward. Look for one large mismatch rather than dozens of tiny ones. Width, height, orientation, and the placement of major projections dominate the visual result.",
    practice: "Describe the border aloud before drawing: start in the north, move clockwise, and name the main change of direction on each side. That route-based method connects the finished outline to a repeatable memory sequence."
  },
  "/draw-us-states/": {
    play: "Draw US states from memory by starting with the state's strongest structural clue. Texas has a panhandle, Florida has a long peninsula, Michigan has two separate peninsulas, and Colorado is close to a rectangle. Build the remaining border around that clue.",
    focus: "State outlines combine coastlines, rivers, surveyed lines, and borders inherited from neighboring states. This creates a useful range from simple angular shapes to irregular coastal silhouettes.",
    scoring: "The drawing comparison favors the overall outline. For a nearly rectangular state, watch the aspect ratio. For a coastal or river state, place the biggest curve first. A recognizable state with simplified edges is a stronger result than detailed edges with the wrong proportions.",
    practice: "Practice by region so neighboring states reinforce one another. Move from a distinctive shape to a harder nearby state, and revisit missed outlines after several rounds instead of immediately memorizing the revealed answer. Keep a short list of shapes that need another attempt later."
  },
  "/draw-flags-from-memory/": {
    play: "To draw flags from memory, establish the flag ratio and largest color blocks before adding symbols. Divide the field into bands, crosses, panels, or nested shapes, then place the central emblem last.",
    focus: "Flag memory depends on layout, color order, symmetry, and proportion. France is organized as three vertical bands, Japan around one centered disc, and Brazil around nested geometric shapes. The construction sequence is often easier to remember than the finished image.",
    scoring: "This first scoring mode emphasizes the main geometry rather than artistic detail. A centered symbol, even band widths, and the correct direction of a cross or stripe matter more than a perfectly drawn emblem.",
    practice: "Look at a flag once, hide it, describe its construction in one sentence, and draw it. Compare the large blocks before checking small symbols. Repeat after a delay to test whether you remember the design rather than the previous stroke."
  },
  "/country-outline-quiz/": {
    play: "The country outline quiz shows a silhouette without a label. Compare its aspect ratio, coastline direction, peninsulas, islands, and major bends, then choose the country that best fits those clues.",
    focus: "Outline recognition and outline drawing train different sides of the same memory. The quiz helps you name a shape you can see; drawing asks you to rebuild that shape with no visual prompt. Switching between them creates a stronger learning loop.",
    scoring: "Quiz results count correct answers across the session. There is no timer, so use each wrong answer to compare the distractors. Ask which single landmark separates the correct outline from the alternatives.",
    practice: "Begin with distinctive silhouettes and move toward compact inland countries that share similar proportions. After identifying an outline, open its drawing page and reproduce it from memory before moving to the next quiz item."
  },
  "/guess-country-by-shape/": {
    play: "To guess a country by shape, ignore size because every silhouette is scaled to fit the same stage. Focus instead on orientation, relative width, coastline complexity, islands, and the placement of any long peninsula.",
    focus: "Some countries have obvious visual signatures, while others are recognized through combinations of smaller clues. Italy's peninsula, Japan's island chain, and Argentina's length are direct cues. Compact shapes require closer comparison of corners and edge direction.",
    scoring: "Every answer is immediate feedback. A wrong choice is most useful when you identify why the alternative looked plausible and which feature rules it out. That turns guessing into repeatable geographic reasoning.",
    practice: "Use a three-pass scan: overall proportion first, large projection second, coastline or border texture third. Then draw the correct country once from memory to reinforce the clue you just learned."
  },
  "/geography-drawing-game/": {
    play: "This geography drawing game combines country borders, US state outlines, flag layouts, and silhouette recognition in one browser experience. Each mode starts with a short prompt and produces immediate visual feedback.",
    focus: "Drawing is an active-recall geography exercise. Instead of selecting a familiar answer, you reconstruct spatial information: direction, proportion, adjacency, coastline, and shape. The result exposes knowledge that a standard map quiz can hide.",
    scoring: "Scores make repeated attempts comparable, but improvement is the useful signal. Track whether the largest mismatch changes from one drawing to the next and whether you can reproduce the correction without reopening a reference map.",
    practice: "Mix practice only after a focused round. Learn three country outlines, test them in silhouette mode, then add one state or flag challenge. Short, repeated sessions work better than a long sequence of unrelated shapes."
  }
};

countries.forEach((country) => {
  const [region, silhouette, anchors] = countryProfiles[country.name];
  pages.push({
    path: `/draw/${country.slug}/`,
    primaryKeyword: `draw ${country.name} from memory`,
    title: `Draw ${country.name} From Memory`,
    description: `Draw ${country.name} from memory online. Practice the outline, compare your sketch, and improve your country shape recall.`,
    mode: "world",
    target: country.slug,
    name: country.name,
    targetType: "country",
    region,
    silhouette,
    anchors,
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
  const [region, silhouette, anchors] = stateProfiles[state.name];
  pages.push({
    path: `/draw/us/${state.slug}/`,
    primaryKeyword: `draw ${state.name} from memory`,
    title: `Draw ${state.name} From Memory`,
    description: `Draw ${state.name} from memory in a US state outline drawing game. Practice the state shape and compare your sketch.`,
    mode: "states",
    target: state.slug,
    name: state.name,
    targetType: "state",
    region,
    silhouette,
    anchors,
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
  const [construction, anchors] = flagProfiles[flag.name];
  pages.push({
    path: `/draw-flags/${flag.slug}/`,
    primaryKeyword: `draw the ${flag.name} flag`,
    title: `Draw The ${flag.name} Flag From Memory`,
    description: `Draw the ${flag.name} flag from memory online. Practice the key flag layout, compare your sketch, and improve without tracing a reference image.`,
    mode: "flags",
    target: flag.slug,
    name: flag.name,
    targetType: "flag",
    construction,
    anchors,
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
writeFileSync(join(root, "404.html"), cleanGeneratedHtml(template({
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
})));

function writePage(page) {
  const file = page.path === "/" ? join(root, "index.html") : join(root, page.path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, cleanGeneratedHtml(template(page)));
}

function template(page) {
  const canonical = `${siteUrl}${page.path}`;
  const related = relatedLinks(page.path);
  const guide = guideTemplate(page);
  const directory = directoryTemplate(page);
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
    <article class="seo-card" data-primary-keyword="${escapeHtml(page.primaryKeyword || "country draw")}"${page.secondaryKeyword ? ` data-secondary-keyword="${escapeHtml(page.secondaryKeyword)}"` : ""}>
      <p class="kicker">Geography drawing game</p>
      <h1>${escapeHtml(page.h1)}</h1>
      <p class="seo-lead">${escapeHtml(page.intro)}</p>
      ${guide}
      <section class="faq-section" aria-labelledby="faq-heading">
        <p class="kicker">Common questions</p>
        <h2 id="faq-heading">Country Drawing FAQ</h2>
        <div class="faq-list">
          ${page.faq.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}
        </div>
      </section>
    </article>
    ${directory}
    <aside class="related-panel">
      <h2>Related Geography Games</h2>
      <div class="related-links">
        ${related.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
      </div>
    </aside>
  </main>
  <footer class="site-footer">
    Country Draw is a free browser geography game.
    <span class="footer-links"><a href="/privacy/">Privacy</a><a href="https://www.naturalearthdata.com/" rel="external">Natural Earth</a><a href="https://www.geoboundaries.org/" rel="external">geoBoundaries</a><button class="footer-privacy-button" type="button" data-privacy-choices>Analytics choices</button></span>
  </footer>
  ${["flags", "outline"].includes(page.mode) ? '<script src="/assets/country-shapes.js" defer></script>' : ""}
  <script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

function guideTemplate(page) {
  if (page.targetType === "country" || page.targetType === "state") {
    return outlineGuideTemplate(page);
  }
  if (page.targetType === "flag") {
    return flagGuideTemplate(page);
  }

  if (page.path === "/") {
    return homeGuideTemplate();
  }

  const profile = corePageProfiles[page.path];
  if (!profile) {
    return `<section class="content-section"><h2>Start a Geography Drawing Challenge</h2><p>${escapeHtml(practiceTip(page))}</p></section>`;
  }

  return `
      <section class="content-section">
        <h2>${escapeHtml(titleCase(page.primaryKeyword))}: How It Works</h2>
        <p>${escapeHtml(profile.play)}</p>
        <ol class="step-list">
          <li><strong>Read the prompt.</strong> Picture the full outline before touching the canvas.</li>
          <li><strong>Draw the large form.</strong> Set width, height, and direction before small details.</li>
          <li><strong>Submit and reveal.</strong> Compare matched, missed, and extra map areas.</li>
          <li><strong>Correct one error.</strong> Redraw the biggest mismatch while it is still fresh.</li>
        </ol>
      </section>
      <div class="content-grid">
        <section class="content-section">
          <h2>What This Geography Game Trains</h2>
          <p>${escapeHtml(profile.focus)}</p>
          <p>${escapeHtml(practiceTip(page))}</p>
        </section>
        <section class="content-section">
          <h2>How the Drawing Score Helps</h2>
          <p>${escapeHtml(profile.scoring)}</p>
          <p>Use the revealed outline as a diagnostic layer. Check the outside envelope first, then inspect one peninsula, island, coast, or border turn that would make the next sketch easier to recognize.</p>
        </section>
      </div>
      <section class="content-section">
        <h2>A Practical Memory Routine</h2>
        <p>${escapeHtml(profile.practice)}</p>
        <p>The game works with a mouse, trackpad, finger, or stylus. Because the round is short and no account is required, you can repeat a shape immediately or return later for a quick retrieval test.</p>
      </section>
  `;
}

function homeGuideTemplate() {
  return `
      <section class="content-section">
        <h2>How to Draw Countries From Memory</h2>
        <p>Each Country Draw round removes one geographic outline from the map while leaving the surrounding countries, coastlines, water, and capital location available as context. Your task is to rebuild the missing boundary where it belongs. This is more demanding than recognizing a silhouette because you must remember both the shape and its position relative to neighboring places.</p>
        <p>Begin by looking at the empty space as one large envelope. Estimate the target's northern, southern, eastern, and western limits before drawing any detailed bend. Then identify one or two anchors: a peninsula, a long coast, a straight land border, an island group, or a corner where several neighboring countries meet. Connect those anchors with a closed line and submit the result when the broad form feels complete.</p>
        <ol class="step-list">
          <li><strong>Read the challenge.</strong> Picture the country and locate its capital before starting the line.</li>
          <li><strong>Set the outside limits.</strong> Estimate the width, height, direction, and position of the missing area.</li>
          <li><strong>Draw the main border.</strong> Use a few confident curves and corners instead of chasing every small coastal detail.</li>
          <li><strong>Submit and compare.</strong> Review matched, missed, and extra areas, then redraw the largest error.</li>
        </ol>
      </section>

      <div class="content-grid">
        <section class="content-section">
          <h2>Cover and Capital Clue Modes</h2>
          <p>Cover mode places an opaque mask over the target area. You can see the wider map and a capital marker, but the country itself is hidden. This mode gives enough geographic context to make the task approachable while still requiring you to reconstruct the border.</p>
          <p>Capital mode removes the cover and uses the marked capital as the main location clue. Switch between the modes when you draw countries from memory: Cover is useful while learning a region, and Capital is a stronger test once you can place the country without relying on the masked space.</p>
        </section>
        <section class="content-section">
          <h2>What the Accuracy Score Means</h2>
          <p>Country Draw compares your closed geographic shape with the real target boundary. Green shows the part of the country your drawing matched. Red shows land that should have been included but was missed. Gold shows extra area drawn outside the real country. The accuracy score penalizes both missed and extra area.</p>
          <p>Read the three measurements separately instead of focusing only on the final number. High matched area with high extra area means the drawing was too large. Low matched area with high missed area usually means it was too small, misplaced, or shaped in the wrong direction. That diagnosis gives you a specific correction for the next attempt.</p>
        </section>
      </div>

      <section class="content-section">
        <h2>Practice 197 Countries and More Regions</h2>
        <p>World mode includes 197 geographic targets, from large mainland countries to archipelagos and small island states. Country Draw keeps complete MultiPolygon geometry, so places such as Indonesia, Japan, New Zealand, Norway, and the Philippines are represented by their real groups of islands rather than one simplified blob. The map boundaries use generalized geographic data suitable for a fast browser game.</p>
        <p>The same drawing system also supports all 50 US states, 13 Canadian provinces and territories, eight Australian states and territories, and the four countries of the United Kingdom. Region tabs make it possible to stay with one map system until its shapes become familiar. Dedicated practice pages let you repeat Italy, France, Japan, Brazil, India, the United States, and other popular outlines without waiting for a random challenge.</p>
      </section>

      <div class="content-grid">
        <section class="content-section">
          <h2>Learn Country Shapes by Region</h2>
          <p>A regional approach is more effective than treating every outline as an isolated picture. In South America, compare the long western edge of Chile, the taper of Argentina, the Atlantic bulge of Brazil, and the smaller northern countries. In Europe, focus on how peninsulas, seas, and neighboring borders divide a compact area into recognizable shapes.</p>
          <p>For Africa, start with the continent's outer coasts and then learn where inland borders create straighter edges. In Asia, compare the orientation and scale of large countries before working through island chains and compact states. Oceania is useful for practicing MultiPolygon shapes because location, spacing, and direction matter as much as a single coastline.</p>
        </section>
        <section class="content-section">
          <h2>Remember Landmarks, Not Every Bend</h2>
          <p>When people first draw countries from memory, they often spend too much effort reproducing tiny coastline changes. Those details are difficult to retain and have less effect on recognition than proportion. A better plan is to remember an outline as four to six decisions: overall direction, widest point, narrowest point, one major projection, one coast or straight edge, and the placement of important islands.</p>
          <p>Describe those decisions aloud before drawing. Italy becomes a boot below the Alpine arc with Sicily near the toe. India becomes a wide north above a triangular peninsula. Japan becomes a curved northeast-to-southwest island chain. Verbal construction rules make the next Country Draw attempt easier to retrieve than a vague mental image.</p>
        </section>
      </div>

      <section class="content-section">
        <h2>A Repeatable Country Drawing Routine</h2>
        <p>Use three short attempts instead of one slow tracing session. On the first attempt, draw only the broad envelope and submit quickly. On the second, correct the largest matched, missed, or extra region shown by the result map. On the third, add one defining border turn, peninsula, coastline, or island while preserving the improved proportions.</p>
        <p>After those attempts, switch countries and return later. Immediate repetition helps you understand the correction, while delayed repetition tests whether it entered memory. Daily challenges provide a simple retrieval habit, and free practice lets you target a difficult country without changing the shared challenge for that day. Local statistics record games, best score, average score, and daily streak on the current device.</p>
      </section>

      <div class="content-grid">
        <section class="content-section">
          <h2>Hard Country Outlines to Draw</h2>
          <p>Archipelagos are difficult because each island must be placed at a believable distance and angle. Countries with long irregular coastlines, such as Norway or Croatia, are hard for a different reason: the small coastal detail can distract from the main silhouette. Very wide countries such as Russia and Canada challenge proportion, while compact inland countries can be hard to distinguish from their neighbors.</p>
          <p>Do not avoid difficult targets. Simplify them. Draw the main landmass first, add only the largest islands, and use the surrounding map as a scale check. Country Draw is most useful when the result exposes one clear misconception that can be corrected on the next round.</p>
        </section>
        <section class="content-section">
          <h2>Play on Desktop, Phone, or Tablet</h2>
          <p>The drawing layer accepts mouse, trackpad, finger, and stylus input. Draw mode places geographic points on the map; Move mode lets you pan and zoom without adding to the border. Undo removes the previous stroke, Clear starts the outline again, and Try again resets the same target after scoring.</p>
          <p>No account or installation is required. Country Draw loads in a modern browser, keeps game history locally, and offers a share action after each scored round. On smaller screens, submitting automatically returns to the map so the revealed boundary and score panel remain visible.</p>
        </section>
      </div>

      <section class="content-section">
        <h2>Why Drawing Builds Stronger Geography Recall</h2>
        <p>Recognition quizzes ask whether a visible shape looks familiar. Drawing asks you to retrieve the shape without seeing it, organize its main parts, and place those parts in geographic context. The effort involved in retrieval makes errors obvious: you may know a country's name and capital while still misunderstanding its width, coastline, neighbors, or orientation.</p>
        <p>Use the reveal as feedback rather than an answer to copy. Identify the single largest difference, hide the target again, and reconstruct that part from memory. Over repeated rounds, the goal is not an artistic border. It is a stable mental map that helps you recognize locations, understand neighboring countries, and recall how regions fit together.</p>
      </section>
  `;
}

function outlineGuideTemplate(page) {
  const kind = page.targetType === "state" ? "state" : "country";
  const geographicLabel = page.targetType === "state" ? `${page.region} United States` : page.region;
  return `
      <section class="content-section">
        <h2>How to ${escapeHtml(titleCase(page.primaryKeyword))}</h2>
        <p>To ${escapeHtml(page.primaryKeyword)}, start with ${escapeHtml(page.silhouette)}. Do not chase every small border bend on the first pass. Build a recognizable ${escapeHtml(page.name)} outline from a few large decisions, then use the reveal layer to find the biggest difference.</p>
        <ol class="step-list">
          <li><strong>Set the envelope.</strong> Estimate the overall width, height, and orientation of the ${escapeHtml(kind)}.</li>
          <li><strong>Place the main anchors.</strong> Remember ${escapeHtml(page.anchors)}.</li>
          <li><strong>Connect the edges.</strong> Use simple curves or straight segments before adding detail.</li>
          <li><strong>Close and compare.</strong> Submit the sketch, reveal the target, and choose one correction.</li>
        </ol>
      </section>
      <div class="content-grid">
        <section class="content-section">
          <h2>${escapeHtml(page.name)} Outline Landmarks</h2>
          <p>${escapeHtml(page.name)} is in ${escapeHtml(geographicLabel)}. For drawing practice, its most useful description is ${escapeHtml(page.silhouette)}. The key landmarks are ${escapeHtml(page.anchors)}.</p>
          <p>Turn those landmarks into a clockwise route. Begin at the topmost point, move around the outside edge, and pause whenever the outline changes direction. A route is easier to repeat than a disconnected list of visual facts.</p>
        </section>
        <section class="content-section">
          <h2>Common Drawing Mistakes</h2>
          <p>The most common error is getting the overall proportion wrong before the details begin. A second error is placing the most distinctive projection on the wrong side or at the wrong height. Rotation also changes how recognizable a map outline feels.</p>
          <p>After revealing the answer, compare the blank space around both shapes. That negative space quickly shows whether your ${escapeHtml(page.name)} drawing is too wide, too tall, tilted, or unevenly balanced.</p>
        </section>
      </div>
      <section class="content-section">
        <h2>Practice the ${escapeHtml(page.name)} Map Shape</h2>
        <p>Use three short attempts instead of one careful tracing session. On attempt one, draw only the broad silhouette. On attempt two, correct the largest proportion error. On attempt three, add one coastline, border, peninsula, island, or corner that makes ${escapeHtml(page.name)} easier to identify.</p>
        <p>Then wait before trying again. Recalling the ${escapeHtml(page.name)} outline after a delay tests memory more honestly than copying the revealed target. When the shape becomes reliable, switch to another ${escapeHtml(kind)} and return later for a mixed geography challenge.</p>
      </section>
  `;
}

function flagGuideTemplate(page) {
  return `
      <section class="content-section">
        <h2>How to ${escapeHtml(titleCase(page.primaryKeyword))} From Memory</h2>
        <p>To ${escapeHtml(page.primaryKeyword)} from memory, reduce the design to a construction rule: ${escapeHtml(page.construction)}. Draw the outer rectangle first, divide the major areas, and add symbols only after the layout is balanced.</p>
        <ol class="step-list">
          <li><strong>Set the flag frame.</strong> Leave enough room to judge the full composition.</li>
          <li><strong>Divide the field.</strong> Mark bands, panels, crosses, or nested shapes.</li>
          <li><strong>Add the focal symbol.</strong> Remember to ${escapeHtml(page.anchors)}.</li>
          <li><strong>Compare proportions.</strong> Check alignment and spacing before small details.</li>
        </ol>
      </section>
      <div class="content-grid">
        <section class="content-section">
          <h2>${escapeHtml(page.name)} Flag Layout</h2>
          <p>The ${escapeHtml(page.name)} flag uses ${escapeHtml(page.construction)}. That sentence is the memory plan for the whole drawing. It tells you which element controls the design and which parts should be added later.</p>
          <p>Pay particular attention to this anchor: ${escapeHtml(page.anchors)}. Correct placement and proportion make a simplified flag recognizable even before decorative details are complete.</p>
        </section>
        <section class="content-section">
          <h2>Common Flag Drawing Mistakes</h2>
          <p>People often begin with the emblem and run out of space for the larger geometry. Another common mistake is using uneven bands or placing a centered symbol slightly too high or low. Establishing guides first prevents both problems.</p>
          <p>The game currently evaluates the main geometric structure. Treat color names and symbolic details as a second memory layer after the layout is stable.</p>
        </section>
      </div>
      <section class="content-section">
        <h2>Build Reliable Flag Memory</h2>
        <p>Study the flag briefly, hide the reference, describe its construction aloud, and draw it. Reveal the target only after the large blocks are complete. Redraw once immediately and once after a delay.</p>
        <p>Compare the ${escapeHtml(page.name)} flag with another design that shares a band, cross, centered emblem, or color scheme. Contrast helps you remember which detail belongs to which country instead of blending similar flags together.</p>
      </section>
  `;
}

function directoryTemplate(page) {
  let heading = "Popular Country Drawing Challenges";
  let links = countries.map((item) => ({
    href: `/draw/${item.slug}/`,
    label: `Draw ${item.name}`
  }));

  if (page.mode === "states") {
    heading = "US State Drawing Practice";
    links = states.map((item) => ({
      href: `/draw/us/${item.slug}/`,
      label: `Draw ${item.name}`
    }));
  } else if (page.mode === "flags") {
    heading = "Flag Drawing Practice";
    links = flags.map((item) => ({
      href: `/draw-flags/${item.slug}/`,
      label: `${item.name} Flag`
    }));
  } else if (page.targetType === "country") {
    links = countries
      .filter((item) => item.slug !== page.target)
      .slice(0, 12)
      .map((item) => ({ href: `/draw/${item.slug}/`, label: `Draw ${item.name}` }));
  } else if (page.targetType === "state") {
    heading = "More US State Outlines";
    links = states
      .filter((item) => item.slug !== page.target)
      .map((item) => ({ href: `/draw/us/${item.slug}/`, label: `Draw ${item.name}` }));
  } else if (page.targetType === "flag") {
    heading = "More Flags to Draw";
    links = flags
      .filter((item) => item.slug !== page.target)
      .map((item) => ({ href: `/draw-flags/${item.slug}/`, label: `${item.name} Flag` }));
  }

  return `
    <nav class="link-directory" aria-label="${escapeHtml(heading)}">
      <p class="kicker">Choose a challenge</p>
      <h2>${escapeHtml(heading)}</h2>
      <div class="directory-links">
        ${links.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
      </div>
    </nav>
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

function titleCase(value) {
  return String(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function cleanGeneratedHtml(value) {
  return String(value).replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
}
