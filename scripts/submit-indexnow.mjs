import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const host = "verasroofing.com";
const key = "d87505eee9cf47a09d6c9d9065c53b7d";
const keyLocation = `https://${host}/${key}.txt`;
const endpoint = process.env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
const dryRun = process.argv.includes("--dry-run");

const sitemapPath = path.join(root, "public", "sitemap.xml");
const sitemap = await readFile(sitemapPath, "utf8");
const urlList = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)]
  .map((match) => match[1].trim())
  .filter((url) => url.startsWith(`https://${host}/`));

if (!urlList.length) {
  throw new Error(`No ${host} URLs found in ${sitemapPath}`);
}

const payload = {
  host,
  key,
  keyLocation,
  urlList,
};

let result = {
  dryRun,
  endpoint,
  submittedAt: new Date().toISOString(),
  payload,
};

if (!dryRun) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  result = {
    ...result,
    status: response.status,
    statusText: response.statusText,
    body,
  };

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow submission failed: ${response.status} ${response.statusText} ${body}`);
  }
}

await mkdir(path.join(root, "qa"), { recursive: true });
const stamp = result.submittedAt.replace(/[:.]/g, "-");
const logPath = path.join(root, "qa", `indexnow-submission-${stamp}.json`);
await writeFile(logPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  ok: true,
  dryRun,
  endpoint,
  urlCount: urlList.length,
  keyLocation,
  logPath,
  status: result.status || "dry-run",
}, null, 2));
