import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const files = walk(root)
  .filter((file) => file.endsWith("index.html"))
  .filter((file) => !file.includes("/privacy/"));

const results = [];
const errors = [];
const titleOwners = new Map();
const descriptionOwners = new Map();

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const pagePath = relative(root, file) || "index.html";
  const title = match(html, /<title>([\s\S]*?)<\/title>/i);
  const description = match(html, /<meta name="description" content="([^"]*)"/i);
  const primaryKeyword = match(html, /data-primary-keyword="([^"]+)"/i);
  const h1s = matches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi).map(cleanText);
  const h2s = matches(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi).map(cleanText);
  const visibleText = cleanText(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
  );
  const words = visibleText.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) || [];
  const keywordCount = countPhrase(visibleText, primaryKeyword);
  const density = words.length ? (keywordCount / words.length) * 100 : 0;
  const internalLinks = matches(html, /<a\b[^>]*href="\/[^"]*"/gi).length;
  const minimumWords = pagePath === "index.html" || !pagePath.startsWith("draw/") && !pagePath.startsWith("draw-flags/")
    ? 450
    : 350;

  check(title.length >= 20 && title.length <= 65, pagePath, `title length ${title.length} is outside 20-65`);
  check(description.length >= 100 && description.length <= 165, pagePath, `description length ${description.length} is outside 100-165`);
  check(h1s.length === 1, pagePath, `expected one H1, found ${h1s.length}`);
  check(h2s.length >= 4, pagePath, `expected at least four H2s, found ${h2s.length}`);
  check(words.length >= minimumWords, pagePath, `word count ${words.length} is below ${minimumWords}`);
  check(includesPhrase(title, primaryKeyword), pagePath, `title misses primary keyword "${primaryKeyword}"`);
  check(includesPhrase(h1s[0] || "", primaryKeyword), pagePath, `H1 misses primary keyword "${primaryKeyword}"`);
  check(includesPhrase(words.slice(0, 120).join(" "), primaryKeyword), pagePath, `first 120 words miss primary keyword "${primaryKeyword}"`);
  check(keywordCount >= 2, pagePath, `primary keyword appears only ${keywordCount} time(s)`);
  check(density <= 2.5, pagePath, `primary keyword density ${density.toFixed(2)}% exceeds 2.5%`);
  check(internalLinks >= 8, pagePath, `only ${internalLinks} internal links`);
  checkUnique(titleOwners, title, pagePath, "title");
  checkUnique(descriptionOwners, description, pagePath, "description");

  results.push({
    path: pagePath,
    words: words.length,
    keyword: primaryKeyword,
    occurrences: keywordCount,
    density: `${density.toFixed(2)}%`,
    links: internalLinks
  });
}

console.table(results);

if (errors.length) {
  console.error(`\nSEO audit failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`\nSEO audit passed for ${results.length} indexable game pages.`);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    if (entry === ".git" || entry === "tmp") return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function match(value, pattern) {
  return cleanText(value.match(pattern)?.[1] || "");
}

function matches(value, pattern) {
  return Array.from(value.matchAll(pattern), (item) => item[1] || item[0]);
}

function cleanText(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function countPhrase(text, phrase) {
  if (!phrase) return 0;
  return Array.from(text.toLowerCase().matchAll(new RegExp(`\\b${escapeRegExp(phrase.toLowerCase())}\\b`, "g"))).length;
}

function includesPhrase(text, phrase) {
  return text.toLowerCase().includes(phrase.toLowerCase());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function check(condition, path, message) {
  if (!condition) errors.push(`${path}: ${message}`);
}

function checkUnique(owners, value, path, label) {
  const owner = owners.get(value);
  if (owner) {
    errors.push(`${path}: duplicate ${label} also used by ${owner}`);
  } else {
    owners.set(value, path);
  }
}
