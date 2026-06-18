import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const pages = readdirSync(publicDir).filter((file) => file.endsWith(".html")).sort();
const htmlByPage = new Map(
  pages.map((file) => [file, readFileSync(path.join(publicDir, file), "utf8")]),
);
const css = readFileSync(path.join(publicDir, "assets", "css", "site.css"), "utf8");

const failures = [];
const notes = [];

const fail = (message) => failures.push(message);
const note = (message) => notes.push(message);

function assetExists(src) {
  if (!src || !src.startsWith("/")) return true;
  const cleanSrc = src.split("#")[0].split("?")[0];
  return existsSync(path.join(publicDir, cleanSrc.slice(1)));
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function extractIds(html) {
  return new Set([...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]));
}

function extractLinks(html) {
  return [...html.matchAll(/\shref=["']([^"']+)["']/g)].map((match) => match[1]);
}

function looksLikeAssetPath(href) {
  return /\.(css|js|ico|png|jpe?g|webp|svg|xml|txt)$/i.test(href.split("#")[0].split("?")[0]);
}

function extractImageSources(html) {
  return [...html.matchAll(/\ssrc=["']([^"']+)["']/g)].map((match) => match[1]);
}

function extractSrcsetSources(html) {
  return [...html.matchAll(/\ssrcset=["']([^"']+)["']/g)]
    .flatMap((match) => match[1].split(","))
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

const allHtml = [...htmlByPage.values()].join("\n");

for (const [file, html] of htmlByPage.entries()) {
  for (const src of extractImageSources(html)) {
    if (!assetExists(src)) fail(`${file}: missing image/script asset ${src}`);
  }

  for (const src of extractSrcsetSources(html)) {
    if (!assetExists(src)) fail(`${file}: missing responsive image candidate ${src}`);
  }

  if (!/href=["']tel:\+19102288034["']/.test(html)) {
    fail(`${file}: missing primary tel:+19102288034 call path`);
  }

  if (/<img\b(?![^>]*\salt=)/.test(html)) {
    fail(`${file}: contains image without alt text`);
  }
}

const idsByPage = new Map([...htmlByPage.entries()].map(([file, html]) => [file, extractIds(html)]));

for (const [file, html] of htmlByPage.entries()) {
  for (const href of extractLinks(html)) {
    if (!href || href.startsWith("#") || /^(tel:|sms:|mailto:|https?:)/.test(href)) continue;
    if (!href.startsWith("/")) continue;

    const [route, anchor] = href.split("#");
    if (looksLikeAssetPath(route)) {
      if (!assetExists(route)) fail(`${file}: missing linked asset ${href}`);
      continue;
    }
    let targetFile = route === "/" || route === "" ? "index.html" : route.replace(/^\//, "");
    if (!htmlByPage.has(targetFile) && !targetFile.endsWith(".html") && htmlByPage.has(`${targetFile}.html`)) {
      // Vercel cleanUrls=true serves /services from services.html.
      targetFile = `${targetFile}.html`;
    }
    if (!htmlByPage.has(targetFile)) {
      fail(`${file}: broken internal link ${href}`);
      continue;
    }
    if (anchor && !idsByPage.get(targetFile).has(anchor)) {
      fail(`${file}: broken anchor ${href}`);
    }
  }
}

const unsafeCopy = [
  "LICENSED & INSURED",
  "Licensed & Insured",
  "Owner hand-inspected",
  "Owner-inspected",
  "50-year material warranties",
  "installation and labor coverage",
  "guaranteed",
  "insurance approval",
  "5-star",
  "five-star",
];

for (const phrase of unsafeCopy) {
  if (allHtml.includes(phrase)) fail(`unsupported or awkward public copy found: ${phrase}`);
}

if (allHtml.includes("epdm-flat-roofing.html")) {
  fail("standalone EPDM page link is still present; EPDM belongs in services.html and photos.html");
}
if (/what homeowners want to see/i.test(allHtml)) {
  fail("public gallery copy contains internal-sounding wording: what homeowners want to see");
}
if (/\bin[-\s]?progress jobs\b/i.test(allHtml)) {
  fail("public gallery copy contains temporary wording: in-progress jobs");
}

const home = htmlByPage.get("index.html") || "";
const homeSectionCount = countMatches(home, /<section\b/g);
if (homeSectionCount !== 7) fail(`homepage should stay at 7 sections; found ${homeSectionCount}`);
if (/class=["'][^"']*epdm-gallery/.test(home) || /class=["'][^"']*epdm-project/.test(home)) {
  fail("homepage contains a full EPDM project/gallery block");
}

const photos = htmlByPage.get("photos.html") || "";
const epdmRefs = new Set([...photos.matchAll(/\/assets\/images\/epdm-[^"'\s]+\.jpg/g)].map((match) => match[0]));
if (epdmRefs.size !== 9) fail(`photos.html should retain all 9 EPDM images; found ${epdmRefs.size}`);
if (!idsByPage.get("photos.html")?.has("epdm-carolina-beach")) {
  fail("photos.html is missing #epdm-carolina-beach");
}
if (!idsByPage.get("services.html")?.has("epdm-flat-roofing")) {
  fail("services.html is missing #epdm-flat-roofing");
}

for (const caption of [...photos.matchAll(/<figcaption>([^<]+)<\/figcaption>/gi)].map((match) => match[1])) {
  if (/\b(in[-\s]?progress|progress)\b/i.test(caption)) {
    fail(`photo caption uses temporary status wording instead of a durable description: ${caption}`);
  }
}

const logoRefs = [...allHtml.matchAll(/class=["'][^"']*brand-lockup[^"']*["'][^>]*src=["']([^"']+)["']/g)].map((match) => match[1]);
if (logoRefs.some((src) => src.includes("header-transparent-clean") || src.includes("header-lockup"))) {
  fail("header logo uses an asset that visibly includes unverified license/insurance text");
}
if (!logoRefs.length) fail("no header logo references found");

const highContrastLight = "(?:#fffaf2|#f7f9ff)";

if (/mobile-call|mobile-cta-ready/.test(allHtml) || /mobile-call|mobile-cta-ready/.test(css)) {
  fail("sticky mobile CTA component should stay removed to avoid duplicate first-viewport call buttons");
}
if (/vera-roofing-20260618v(?:1[89]|20|21|22)/.test(allHtml)) {
  fail("public HTML still references an older v18/v19/v20/v21/v22 CSS cache token");
}
if (!allHtml.includes("vera-roofing-20260618v23")) {
  fail("public HTML does not reference the current v23 CSS cache token");
}
if (!/Final v23 cohesion polish/i.test(css)) {
  fail("final v23 CSS cohesion block is missing");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.navlinks\s+a\s*\{[^}]*min-height:\s*44px/i.test(css)) {
  fail("mobile nav tap targets should stay at least 44px high");
}
if (!/@media\s*\(min-width:\s*761px\)\s+and\s+\(max-width:\s*1020px\)\s*\{[\s\S]*?\.navlinks\s+\.call-number\s*\{[^}]*display:\s*none/i.test(css)) {
  fail("tablet nav must hide the phone number to prevent CTA wrapping");
}
if (!/\.hero h1,\s*\.page-hero h1,\s*\.photo-hero h1\s*\{[^}]*letter-spacing:\s*0;[^}]*line-height:\s*1\.06/i.test(css)) {
  fail("home, page, and photo hero headings should use normalized tracking and line-height");
}
if (!/\.photo-contact h2\s*\{[^}]*letter-spacing:\s*0/i.test(css)) {
  fail("photos lower contact heading should not use hero-scale negative tracking");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.brand img\.brand-lockup\s*\{[^}]*width:\s*min\(100%,\s*200px\);[^}]*max-height:\s*96px/i.test(css)
  && !/@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.brand img\.brand-lockup\s*\{[^}]*width:\s*min\(100%,\s*150px\);[^}]*max-height:\s*70px/i.test(css)) {
  fail("final mobile logo size guard changed; recheck mobile nav height before deploy");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.trust-band\s*\{[^}]*margin-top:\s*0;[^}]*padding-top:\s*32px;[^}]*background:\s*var\(--paper\)/i.test(css)) {
  fail("mobile trust strip must sit fully on the light page background without negative overlap");
}
if (/\.final-cta\s+\.contact-card\s*\{[^}]*margin-top:\s*-/i.test(css) || /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.final-cta\s+\.contact-card\s*\{[^}]*margin-top:\s*-/i.test(css)) {
  fail("final CTA contact card must not use negative top margin or overlap the service-area strip");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.navlinks\s*\{[^}]*grid-template-columns:\s*1fr\s+1fr/i.test(css)) {
  fail("mobile nav must remain a balanced two-column grid");
}
if (!/\.navlinks\s+\.phone\s*\{[^}]*grid-column:\s*auto/i.test(css)) {
  fail("mobile Call Now nav item should not span both columns; keep the 6-link nav symmetrical");
}
if (!/\.photo-grid figcaption\s*\{[^}]*width:\s*fit-content/i.test(css)) {
  fail("gallery caption pills must remain fit-content width");
}
if (!/\.work-item figcaption\s*\{[^}]*width:\s*fit-content/i.test(css)) {
  fail("homepage work caption pills must remain fit-content width");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.home-page\s+\.home-work-preview\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*grid-auto-rows:\s*250px/i.test(css)) {
  fail("homepage recent-work preview must stack as a visible one-column grid on phones");
}
if (!/\.home-page\s+\.home-work-preview\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);[^}]*overflow:\s*visible/i.test(css)) {
  fail("homepage recent-work preview must remain a visible responsive grid on desktop");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.btn,[\s\S]*?\.hero-actions\s+\.btn,[\s\S]*?\.contact-actions\s+\.btn,[\s\S]*?\.final-cta\s+\.contact-actions\s+\.btn\s*\{[^}]*width:\s*fit-content;[^}]*max-width:\s*100%/i.test(css)) {
  fail("mobile CTA buttons must remain compact fit-content pills, not full-width bars");
}
if (!/\.photo-category\s+\.eyebrow\s*\{[\s\S]*?color:\s*var\(--purple\)/i.test(css) && !/\.section:not\(\.dark\)\s+\.eyebrow,[\s\S]*?\.photo-category\s+\.eyebrow\s*\{[\s\S]*?color:\s*var\(--purple\)/i.test(css)) {
  fail("light photo-category eyebrow labels must use the readable dark token");
}
if (!new RegExp(`section\\.section\\.why\\s+\\.why-list\\s*>\\s*p\\.eyebrow\\s*\\{[\\s\\S]*?color:\\s*${highContrastLight}`, "i").test(css)) {
  fail("why-section eyebrow label must have an explicit high-contrast dark-panel override");
}
if (!new RegExp(`\\.contact-card\\s+\\.eyebrow,[\\s\\S]*?\\.photo-contact\\s+\\.eyebrow\\s*\\{[\\s\\S]*?color:\\s*${highContrastLight}`, "i").test(css)) {
  fail("dark card/section eyebrow text must use the high-contrast light token");
}
if (!new RegExp(`\\.section\\.area-strip\\s+\\.eyebrow,[\\s\\S]*?color:\\s*${highContrastLight}`, "i").test(css) && !new RegExp(`\\.section\\.area-strip\\s+\\.eyebrow\\s*\\{[\\s\\S]*?color:\\s*${highContrastLight}`, "i").test(css)) {
  fail("area-strip eyebrow label must have an explicit high-contrast override that beats the generic section eyebrow selector");
}
const normalizedCss = css.replace(/\r\n/g, "\n");
const genericEyebrowIdx = normalizedCss.indexOf(".section:not(.dark) .eyebrow");
const finalContrastIdx = normalizedCss.lastIndexOf("Final contrast guard for small labels on dark image/CTA surfaces");
if (genericEyebrowIdx < 0 || finalContrastIdx < genericEyebrowIdx) {
  fail("high-contrast dark-surface eyebrow override must come after the generic section eyebrow rule");
}
if (normalizedCss.lastIndexOf("Final contrast guard for small labels on dark image/CTA surfaces") < normalizedCss.indexOf(".photo-hero .eyebrow,\n.photo-contact .eyebrow")) {
  fail("final dark-surface eyebrow contrast guard must remain after page-specific photo eyebrow rules");
}

note("Manual native-browser visual pass is still required after this script:");
note("- mobile 390x844: homepage first viewport, services #epdm-flat-roofing, photos #epdm-carolina-beach, contact");
note("- desktop 1366x900: homepage and process/about page");
note("- inspect for text overlap, duplicate CTAs, oversized logo/nav, cramped buttons, full-width pills, unsafe claims, and section creep");
note("- save screenshots and results JSON under qa/");

if (failures.length) {
  console.error("FINAL MOBILE VISUAL GUARDS FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("FINAL MOBILE VISUAL GUARDS PASSED");
for (const item of notes) console.log(item);
