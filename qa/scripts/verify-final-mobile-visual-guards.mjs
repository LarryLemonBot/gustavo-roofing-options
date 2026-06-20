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

const requiredDiscoveryFiles = [
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "ai.txt",
  "agents.txt",
  path.join(".well-known", "ai.txt"),
  path.join(".well-known", "agents.json"),
];

for (const file of requiredDiscoveryFiles) {
  if (!existsSync(path.join(publicDir, file))) fail(`missing AI/search discovery file: public/${file.replace(/\\/g, "/")}`);
}

if (existsSync(path.join(publicDir, "robots.txt"))) {
  const robots = readFileSync(path.join(publicDir, "robots.txt"), "utf8");
  for (const marker of ["Sitemap: https://verasroofing.com/sitemap.xml", "LLMs: https://verasroofing.com/llms.txt", "AI: https://verasroofing.com/ai.txt", "Agents: https://verasroofing.com/agents.txt"]) {
    if (!robots.includes(marker)) fail(`robots.txt missing discovery marker: ${marker}`);
  }
}

if (existsSync(path.join(publicDir, ".well-known", "agents.json"))) {
  try {
    const agents = JSON.parse(readFileSync(path.join(publicDir, ".well-known", "agents.json"), "utf8"));
    if (!agents.publicPages?.includes("https://verasroofing.com/gutter-cleaning-guards")) {
      fail("agents.json must include the gutter cleaning and guards page");
    }
  } catch (error) {
    fail(`agents.json is not valid JSON: ${error.message}`);
  }
}

if (existsSync(path.join(publicDir, ".well-known", "ai.txt"))) {
  const wellKnownAi = readFileSync(path.join(publicDir, ".well-known", "ai.txt"), "utf8");
  if (!wellKnownAi.includes("https://verasroofing.com/gutter-cleaning-guards")) {
    fail(".well-known/ai.txt must include the gutter cleaning and guards page");
  }
}

if (!htmlByPage.has("gutter-cleaning-guards.html")) {
  fail("public/gutter-cleaning-guards.html is missing");
}

const liveCaptureScriptPath = path.join(root, "qa", "scripts", "capture-live-custom-domain-final-qa.mjs");
if (existsSync(liveCaptureScriptPath)) {
  const liveCaptureScript = readFileSync(liveCaptureScriptPath, "utf8");
  for (const url of [
    "https://verasroofing.com/gutter-cleaning-guards",
    "https://verasroofing.com/services#gutter-cleaning-guards",
  ]) {
    if (!liveCaptureScript.includes(url)) fail(`live custom-domain visual QA must capture ${url}`);
  }
}

const crossViewportScriptPath = path.join(root, "qa", "scripts", "verify-premium-cross-viewport.mjs");
if (existsSync(crossViewportScriptPath)) {
  const crossViewportScript = readFileSync(crossViewportScriptPath, "utf8");
  if (!crossViewportScript.includes("tablet-landscape-1024")) {
    fail("cross-viewport QA must include the 1024px tablet landscape header case");
  }
}

const vercelConfigPath = path.join(root, "vercel.json");
if (existsSync(vercelConfigPath)) {
  try {
    const vercel = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
    const redirects = new Map((vercel.redirects || []).map((item) => [item.source, item.destination]));
    for (const [source, destination] of [
      ["/gutter-cleaning-guards/", "/gutter-cleaning-guards"],
      ["/gutter-cleaning", "/gutter-cleaning-guards"],
      ["/gutter-cleaning/", "/gutter-cleaning-guards"],
      ["/gutter-guards", "/gutter-cleaning-guards"],
      ["/gutter-guards/", "/gutter-cleaning-guards"],
      ["/roof-work", "/photos"],
      ["/roof-work/", "/photos"],
      ["/areas-served", "/areas"],
      ["/areas-served/", "/areas"],
    ]) {
      if (redirects.get(source) !== destination) fail(`vercel.json missing redirect ${source} -> ${destination}`);
    }
  } catch (error) {
    fail(`vercel.json is not valid JSON: ${error.message}`);
  }
}

for (const stale of [
  "assets/images/roof-bright-metal-slope.jpeg",
  "assets/images/responsive/roof-bright-metal-slope-480w.jpeg",
  "assets/images/responsive/roof-bright-metal-slope-768w.jpeg",
  "assets/images/responsive/roof-bright-metal-slope-1024w.jpeg",
  "assets/images/responsive/roof-bright-metal-slope-1400w.jpeg",
]) {
  if (existsSync(path.join(publicDir, stale))) fail(`stale duplicate metal photo should stay removed: public/${stale}`);
}

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
const stylesheetRefs = [...allHtml.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
const stylesheetText = stylesheetRefs.join("\n");
if (/vera-roofing-20260618v(?:1[89]|2[0-8])/.test(stylesheetText)) {
  fail("public HTML still references an older v18-v28 CSS cache token");
}
const cssTokenBaseline = { date: 20260620, version: 3, label: "20260620v3" };
const stylesheetTokens = stylesheetRefs.map((href) => {
  const match = href.match(/vera-roofing-(\d{8})v(\d+)/);
  return match ? { raw: match[0], date: Number(match[1]), version: Number(match[2]) } : null;
});
const uniqueStylesheetTokens = new Set(stylesheetTokens.filter(Boolean).map((token) => token.raw));
if (!stylesheetRefs.length || stylesheetTokens.some((token) => !token)) {
  fail("public HTML stylesheet refs must include a versioned Vera CSS cache token");
}
if (uniqueStylesheetTokens.size > 1) {
  fail(`public HTML references inconsistent CSS cache tokens: ${[...uniqueStylesheetTokens].join(", ")}`);
}
const activeStylesheetToken = stylesheetTokens.find(Boolean);
if (
  activeStylesheetToken &&
  (activeStylesheetToken.date < cssTokenBaseline.date ||
    (activeStylesheetToken.date === cssTokenBaseline.date && activeStylesheetToken.version < cssTokenBaseline.version))
) {
  fail(`public HTML references a CSS cache token older than the release-gate baseline ${cssTokenBaseline.label}`);
}
if (!/Site cohesion: local reassurance, credential proof, Photos CTA layout, hand-nailed shingles, footer, and header behavior/i.test(css)) {
  fail("site cohesion CSS block is missing");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.navlinks\s+a\s*\{[^}]*min-height:\s*44px/i.test(css)) {
  fail("mobile nav tap targets should stay at least 44px high");
}
if (!/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.home-page\s+\.compact-service-grid\s+\.service\s+\.text-link\s*\{[^}]*min-height:\s*44px/i.test(css)) {
  fail("mobile homepage service text links must stay at least 44px high");
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
if (!/\.hero-issue-links\s+a\s*\{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/i.test(css)) {
  fail("homepage concern pills must keep the quieter grey treatment, not the purple CTA gradient");
}
if (!/\.service-panel\.credential-panel\s*\{[\s\S]*?color:\s*var\(--ink\)/i.test(css)) {
  fail("CertainTeed credential panel must set a readable dark text color on its light surface");
}
if (!/\.service-panel\.credential-panel\s+\.service-panel-copy\s+\.eyebrow,[\s\S]*?\.service-panel\.credential-panel\s+h2,[\s\S]*?\.service-panel\.credential-panel\s+strong,[\s\S]*?\.service-panel\.credential-panel\s+\.service-proof-card\s*>\s*strong\s*\{[\s\S]*?color:\s*var\(--ink\)[\s\S]*?text-shadow:\s*none/i.test(css)) {
  fail("CertainTeed credential headings/strong text must not inherit white feature-panel styling");
}
if (!/\.service-panel\.credential-panel\s+p,[\s\S]*?\.service-panel\.credential-panel\s+\.service-fit,[\s\S]*?\.service-panel\.credential-panel\s+\.service-value,[\s\S]*?\.service-panel\.credential-panel\s+\.service-solve,[\s\S]*?\.service-panel\.credential-panel\s+\.service-proof-card\s+p\s*\{[\s\S]*?color:\s*#4f5963/i.test(css)) {
  fail("CertainTeed credential body and value-card text must stay readable on the light panel");
}
if (!/\.service-panel\.credential-panel\s+\.service-proof-card\s+span\s*\{[\s\S]*?color:\s*var\(--ink\)[\s\S]*?background:\s*rgba\(239,\s*243,\s*247,\s*0\.88\)/i.test(css)) {
  fail("CertainTeed proof chips must use muted grey styling, not low-contrast white text");
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
const finalContrastIdx = normalizedCss.lastIndexOf("Dark image and CTA label contrast");
if (genericEyebrowIdx < 0 || finalContrastIdx < genericEyebrowIdx) {
  fail("high-contrast dark-surface eyebrow override must come after the generic section eyebrow rule");
}
if (normalizedCss.lastIndexOf("Dark image and CTA label contrast") < normalizedCss.indexOf(".photo-hero .eyebrow,\n.photo-contact .eyebrow")) {
  fail("final dark-surface eyebrow contrast guard must remain after page-specific photo eyebrow rules");
}

note("Manual native-browser visual pass is still required after every deployment:");
note("- inspect every public page at desktop and mobile: home, services, gutter cleaning and guards, photos, areas, process, contact");
note("- include services #certainteed-roof-system, services #epdm-flat-roofing, photos #epdm-carolina-beach, and homepage first viewport");
note("- inspect for text overlap, low contrast, duplicate CTAs, asymmetry, oversized logo/nav, cramped buttons, full-width pills, image/caption mismatch, unsafe claims, and section creep");
note("- save screenshots and results JSON under qa/");

if (failures.length) {
  console.error("FINAL MOBILE VISUAL GUARDS FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("FINAL MOBILE VISUAL GUARDS PASSED");
for (const item of notes) console.log(item);
