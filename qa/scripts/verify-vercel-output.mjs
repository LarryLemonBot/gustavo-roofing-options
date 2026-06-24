import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const outputDir = path.join(root, ".vercel", "output");
const staticDir = path.join(outputDir, "static");
const configPath = path.join(outputDir, "config.json");

const required = new Map([
  ["index.html", "public/index.html"],
  ["services.html", "public/services.html"],
  ["gutter-cleaning-guards.html", "public/gutter-cleaning-guards.html"],
  ["photos.html", "public/photos.html"],
  ["areas.html", "public/areas.html"],
  ["process.html", "public/process.html"],
  ["contact.html", "public/contact.html"],
  ["assets/css/site.css", "public/assets/css/site.css"],
  ["sitemap.xml", "public/sitemap.xml"],
  ["robots.txt", "public/robots.txt"],
  ["llms.txt", "public/llms.txt"],
  ["ai.txt", "public/ai.txt"],
  ["agents.txt", "public/agents.txt"],
  [".well-known/ai.txt", "public/.well-known/ai.txt"],
  [".well-known/agents.json", "public/.well-known/agents.json"],
]);

const failures = [];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

if (!fs.existsSync(staticDir)) {
  failures.push("Missing .vercel/output/static. Run vercel build before using --prebuilt.");
}

if (!fs.existsSync(configPath)) {
  failures.push("Missing .vercel/output/config.json. Run vercel build before using --prebuilt.");
}

if (!failures.length) {
  for (const [outputRelative, sourceRelative] of required) {
    const outputPath = path.join(staticDir, outputRelative);
    const sourcePath = path.join(root, sourceRelative);

    if (!fs.existsSync(sourcePath)) {
      failures.push(`Missing source file for prebuilt output check: ${sourceRelative}`);
      continue;
    }

    if (!fs.existsSync(outputPath)) {
      failures.push(`Missing prebuilt output file: ${outputRelative}`);
      continue;
    }

    const outputSize = fs.statSync(outputPath).size;
    if (outputSize < 20) {
      failures.push(`Prebuilt output file is unexpectedly small: ${outputRelative} (${outputSize} bytes)`);
      continue;
    }

    if (sha256(sourcePath) !== sha256(outputPath)) {
      failures.push(`Prebuilt output hash differs from source: ${outputRelative}`);
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("Vercel prebuilt output is present and matches the required public files.");
}
