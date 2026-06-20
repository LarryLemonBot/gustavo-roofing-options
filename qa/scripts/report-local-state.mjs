import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const qaDir = path.join(root, "qa");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.join(qaDir, `local-state-${runId}`);
fs.mkdirSync(outDir, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  return {
    command: [command, ...args].join(" "),
    code: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function lines(text) {
  return text ? text.split(/\r?\n/).filter(Boolean) : [];
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const branchStatus = run("git", ["status", "--short", "--branch"]);
const porcelain = run("git", ["status", "--porcelain=v1"]);
const modifiedDeleted = run("git", ["ls-files", "--modified", "--deleted"]);
const visibleUntracked = run("git", ["ls-files", "--others", "--exclude-standard"]);
const ignoredStatus = run("git", ["status", "--ignored", "--short"]);
const sourceCommit = run("git", ["rev-parse", "HEAD"]);
const topLevel = run("git", ["rev-parse", "--show-toplevel"]);

const ignoredEntries = lines(ignoredStatus.stdout).filter((line) => line.startsWith("!! "));
const trackedDirtyEntries = lines(modifiedDeleted.stdout);
const visibleUntrackedEntries = lines(visibleUntracked.stdout);
const releaseBlockingEntries = lines(porcelain.stdout);

const configPath = path.join(process.env.USERPROFILE || "C:\\Users\\alexl", ".codex", "config.toml");
const browserClientPath = path.join(
  process.env.USERPROFILE || "C:\\Users\\alexl",
  ".codex",
  "plugins",
  "cache",
  "openai-bundled",
  "browser",
  "26.616.41845",
  "scripts",
  "browser-client.mjs",
);
const runtimeRoot = path.join(
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "C:\\Users\\alexl", "AppData", "Local"),
  "OpenAI",
  "Codex",
  "runtimes",
  "cua_node",
);

let configText = "";
try {
  configText = fs.readFileSync(configPath, "utf8");
} catch {
  configText = "";
}

const nodeReplPathMatch = configText.match(/command\s*=\s*['"]([^'"]*node_repl\.exe)['"]/i);
const nodeReplPath = nodeReplPathMatch ? nodeReplPathMatch[1] : null;
const trustedHashMatch = configText.match(/NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S\s*=\s*["']([^"']+)["']/);
const trustedHashes = trustedHashMatch
  ? trustedHashMatch[1].split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  : [];
const browserClientExists = fs.existsSync(browserClientPath);
const browserClientHash = browserClientExists ? await sha256(browserClientPath) : null;
const runtimeExists = fs.existsSync(runtimeRoot);
const nodeReplExists = nodeReplPath ? fs.existsSync(nodeReplPath) : false;
const runtimeAcl = runtimeExists ? run("icacls", [runtimeRoot]) : null;
const runtimeAclHasSandboxRx = Boolean(runtimeAcl?.stdout.match(/CodexSandboxUsers:.*\(RX\)/i));

const report = {
  generatedAt: new Date().toISOString(),
  root,
  topLevel: topLevel.stdout || null,
  sourceCommit: sourceCommit.stdout || null,
  releaseClean: releaseBlockingEntries.length === 0,
  trackedClean: trackedDirtyEntries.length === 0,
  visibleUntrackedClean: visibleUntrackedEntries.length === 0,
  branchStatus,
  releaseBlockingEntries,
  trackedDirtyEntries,
  visibleUntrackedEntries,
  ignoredArtifactSummary: {
    count: ignoredEntries.length,
    sample: ignoredEntries.slice(0, 30),
    note: "Ignored entries are generated/local artifacts. They are not deploy blockers unless a specific retention or artifact cleanup task is approved.",
  },
  browserBridgePrerequisites: {
    configPath,
    configExists: Boolean(configText),
    nodeReplPath,
    nodeReplExists,
    runtimeRoot,
    runtimeExists,
    runtimeAclHasSandboxRx,
    browserClientPath,
    browserClientExists,
    browserClientHash,
    browserClientHashTrusted: browserClientHash ? trustedHashes.includes(browserClientHash.toLowerCase()) : false,
    mcpTransportStatus: "not verified by this script; use the native node_repl tool after prerequisites pass",
  },
};

const reportPath = path.join(outDir, "local-state-report.json");
const summaryPath = path.join(outDir, "local-state-summary.md");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(
  summaryPath,
  [
    "# Local State Report",
    "",
    `- generated: ${report.generatedAt}`,
    `- source commit: ${report.sourceCommit || "unknown"}`,
    `- release clean: ${report.releaseClean ? "yes" : "no"}`,
    `- tracked clean: ${report.trackedClean ? "yes" : "no"}`,
    `- visible untracked clean: ${report.visibleUntrackedClean ? "yes" : "no"}`,
    `- ignored generated/local artifacts: ${report.ignoredArtifactSummary.count}`,
    `- browser bridge prerequisites: ${
      report.browserBridgePrerequisites.nodeReplExists &&
      report.browserBridgePrerequisites.runtimeAclHasSandboxRx &&
      report.browserBridgePrerequisites.browserClientHashTrusted
        ? "pass"
        : "check required"
    }`,
    "",
    "Ignored QA/output artifacts are not release blockers. Do not run broad cleanup commands such as `git clean -xdf` from this repo.",
    "",
  ].join("\n"),
);

console.log(`Local state report: ${reportPath}`);
console.log(`Release clean: ${report.releaseClean ? "yes" : "no"}`);
console.log(`Ignored generated/local artifacts: ${ignoredEntries.length}`);
console.log(
  `Browser bridge prerequisites: ${
    report.browserBridgePrerequisites.nodeReplExists &&
    report.browserBridgePrerequisites.runtimeAclHasSandboxRx &&
    report.browserBridgePrerequisites.browserClientHashTrusted
      ? "pass"
      : "check required"
  }`,
);

process.exitCode = report.releaseClean ? 0 : 1;
