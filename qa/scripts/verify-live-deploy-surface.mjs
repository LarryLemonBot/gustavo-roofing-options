import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const publicDir = path.join(root, "public");
const qaDir = path.join(root, "qa");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.join(qaDir, `live-deploy-surface-${runId}`);
fs.mkdirSync(outDir, { recursive: true });

const origin = process.env.VERA_LIVE_ORIGIN || "https://verasroofing.com";

const htmlRoutes = [
  { route: "/", file: "index.html" },
  { route: "/services", file: "services.html" },
  { route: "/gutter-cleaning-guards", file: "gutter-cleaning-guards.html" },
  { route: "/photos", file: "photos.html" },
  { route: "/areas", file: "areas.html" },
  { route: "/process", file: "process.html" },
  { route: "/contact", file: "contact.html" },
];

const discoveryRoutes = [
  { route: "/robots.txt", file: "robots.txt" },
  { route: "/sitemap.xml", file: "sitemap.xml" },
  { route: "/llms.txt", file: "llms.txt" },
  { route: "/ai.txt", file: "ai.txt" },
  { route: "/agents.txt", file: "agents.txt" },
  { route: "/.well-known/ai.txt", file: ".well-known/ai.txt" },
  { route: "/.well-known/agents.json", file: ".well-known/agents.json" },
  { route: "/d87505eee9cf47a09d6c9d9065c53b7d.txt", file: "d87505eee9cf47a09d6c9d9065c53b7d.txt" },
];

const criticalAssetRoutes = [
  { route: "/assets/css/site.css", file: "assets/css/site.css" },
  { route: "/assets/js/site-config.js", file: "assets/js/site-config.js" },
  { route: "/assets/images/vera-roofing-logo-header-black-banner.jpg", file: "assets/images/vera-roofing-logo-header-black-banner.jpg" },
  { route: "/assets/images/certainteed-shinglemaster-credentialed-badge-footer.png", file: "assets/images/certainteed-shinglemaster-credentialed-badge-footer.png" },
  { route: "/assets/images/fortified-home-logo.png", file: "assets/images/fortified-home-logo.png" },
  { route: "/assets/images/social-card.jpg", file: "assets/images/social-card.jpg" },
  { route: "/assets/images/hero-metal-roof-coastal.jpeg", file: "assets/images/hero-metal-roof-coastal.jpeg" },
  { route: "/favicon.ico", file: "favicon.ico" },
  { route: "/apple-touch-icon.png", file: "apple-touch-icon.png" },
];

function runGit(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return {
    command: `git ${args.join(" ")}`,
    code: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function localText(file) {
  return fs.readFileSync(path.join(publicDir, file), "utf8").replace(/^\uFEFF/, "");
}

function localBytes(file) {
  return fs.readFileSync(path.join(publicDir, file));
}

async function fetchText(route) {
  const url = new URL(route, origin).href;
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const text = (await response.text()).replace(/^\uFEFF/, "");
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type") || "",
    etag: response.headers.get("etag") || "",
    text,
  };
}

async function fetchBytes(route) {
  const url = new URL(route, origin).href;
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    url,
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get("content-type") || "",
    cacheControl: response.headers.get("cache-control") || "",
    etag: response.headers.get("etag") || "",
    bytes,
  };
}

function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return scripts.map((match, index) => {
    const raw = match[1].trim();
    try {
      JSON.parse(raw);
      return { index, ok: true };
    } catch (error) {
      return { index, ok: false, error: error.message };
    }
  });
}

function normalizeLocalAssetUrl(value) {
  if (!value) return null;
  let raw = value.trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return null;
  if (raw.startsWith(origin)) raw = raw.slice(origin.length);
  if (!raw.startsWith("/")) return null;
  const clean = raw.split("#")[0].split("?")[0];
  if (clean.startsWith("/assets/") || clean === "/favicon.ico" || clean === "/apple-touch-icon.png") return clean;
  return null;
}

function collectReferencedAssets() {
  const assets = new Map();
  for (const entry of criticalAssetRoutes) assets.set(entry.route, entry);

  for (const route of htmlRoutes) {
    const html = localText(route.file);
    const attrMatches = html.matchAll(/\b(?:src|href|content)=["']([^"']+)["']/gi);
    for (const match of attrMatches) {
      const localRoute = normalizeLocalAssetUrl(match[1]);
      if (!localRoute) continue;
      assets.set(localRoute, { route: localRoute, file: localRoute.replace(/^\//, "") });
    }

    const srcsetMatches = html.matchAll(/\bsrcset=["']([^"']+)["']/gi);
    for (const match of srcsetMatches) {
      for (const candidate of match[1].split(",")) {
        const localRoute = normalizeLocalAssetUrl(candidate.trim().split(/\s+/)[0]);
        if (!localRoute) continue;
        assets.set(localRoute, { route: localRoute, file: localRoute.replace(/^\//, "") });
      }
    }
  }

  return [...assets.values()].sort((a, b) => a.route.localeCompare(b.route));
}

const assetRoutes = collectReferencedAssets();

async function compareRoute(entry, kind) {
  const local = localText(entry.file);
  const live = await fetchText(entry.route);
  const localHash = sha256(local);
  const liveHash = sha256(live.text);
  const jsonLd = kind === "html" ? parseJsonLd(live.text) : [];
  return {
    kind,
    route: entry.route,
    file: entry.file,
    url: live.url,
    status: live.status,
    ok: live.ok,
    contentType: live.contentType,
    etag: live.etag,
    localBytes: Buffer.byteLength(local),
    liveBytes: Buffer.byteLength(live.text),
    localHash,
    liveHash,
    matchesLocal: localHash === liveHash,
    jsonLdCount: jsonLd.length,
    jsonLdValid: jsonLd.every((item) => item.ok),
    jsonLdErrors: jsonLd.filter((item) => !item.ok),
  };
}

async function compareAsset(entry) {
  const local = localBytes(entry.file);
  const live = await fetchBytes(entry.route);
  const localHash = crypto.createHash("sha256").update(local).digest("hex");
  const liveHash = crypto.createHash("sha256").update(live.bytes).digest("hex");
  return {
    kind: "asset",
    route: entry.route,
    file: entry.file,
    url: live.url,
    status: live.status,
    ok: live.ok,
    contentType: live.contentType,
    cacheControl: live.cacheControl,
    etag: live.etag,
    localBytes: local.length,
    liveBytes: live.bytes.length,
    localHash,
    liveHash,
    matchesLocal: localHash === liveHash,
  };
}

const htmlChecks = [];
for (const entry of htmlRoutes) htmlChecks.push(await compareRoute(entry, "html"));

const discoveryChecks = [];
for (const entry of discoveryRoutes) discoveryChecks.push(await compareRoute(entry, "discovery"));

const assetChecks = [];
for (const entry of assetRoutes) assetChecks.push(await compareAsset(entry));

const checks = [...htmlChecks, ...discoveryChecks, ...assetChecks];
const issues = [];

for (const check of checks) {
  if (!check.ok) issues.push(`${check.route} returned ${check.status}`);
  if (!check.matchesLocal) issues.push(`${check.route} live hash does not match public/${check.file}`);
  if (check.kind === "html" && !check.jsonLdValid) issues.push(`${check.route} has invalid JSON-LD`);
}

const report = {
  runId,
  generatedAt: new Date().toISOString(),
  origin,
  sourceCommit: runGit(["rev-parse", "HEAD"]).stdout || null,
  gitStatus: runGit(["status", "--short", "--branch"]),
  issueCount: issues.length,
  issues,
  htmlChecks,
  discoveryChecks,
  assetChecks,
};

const jsonPath = path.join(outDir, "live-deploy-surface-report.json");
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const md = [
  "# Live Deploy Surface Verification",
  "",
  `- generated: ${report.generatedAt}`,
  `- origin: ${origin}`,
  `- source commit: ${report.sourceCommit}`,
  `- issue count: ${report.issueCount}`,
  "",
  "## Issues",
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ["- None"]),
  "",
  "## HTML Routes",
  ...htmlChecks.map(
    (check) =>
      `- ${check.route}: ${check.status}, matches local: ${check.matchesLocal ? "yes" : "no"}, JSON-LD valid: ${
        check.jsonLdValid ? "yes" : "no"
      }, hash: ${check.liveHash.slice(0, 12)}`,
  ),
  "",
  "## Discovery Files",
  ...discoveryChecks.map(
    (check) =>
      `- ${check.route}: ${check.status}, matches local: ${check.matchesLocal ? "yes" : "no"}, hash: ${check.liveHash.slice(0, 12)}`,
  ),
  "",
  "## Referenced Assets",
  ...assetChecks.map(
    (check) =>
      `- ${check.route}: ${check.status}, matches local: ${check.matchesLocal ? "yes" : "no"}, hash: ${check.liveHash.slice(0, 12)}`,
  ),
  "",
];

fs.writeFileSync(path.join(outDir, "live-deploy-surface-report.md"), md.join("\n"));

console.log(`Live deploy surface ${issues.length ? "FAIL" : "PASS"}`);
console.log(path.relative(root, jsonPath));
if (issues.length) {
  for (const issue of issues) console.log(`- ${issue}`);
  process.exitCode = 1;
}
