import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const pages = ["index", "services", "gutter-cleaning-guards", "photos", "areas", "process", "contact"];
const failures = [];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

for (const page of pages) {
  const publicPath = path.join(root, "public", `${page}.html`);
  const rootPath = path.join(root, `${page}.html`);

  if (!fs.existsSync(publicPath) || !fs.existsSync(rootPath)) {
    failures.push(`Missing mirror file for ${page}`);
    continue;
  }

  const publicHash = sha256(publicPath);
  const rootHash = sha256(rootPath);

  if (publicHash !== rootHash) {
    failures.push(`Mirror mismatch: public/${page}.html != ${page}.html`);
  } else {
    console.log(`Mirror OK: ${page}`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log("All public/root HTML mirrors match.");
}
