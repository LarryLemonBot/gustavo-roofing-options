import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const args = process.argv.slice(2);
const shouldKill = args.includes("--kill");
const shouldPruneTemp = args.includes("--prune-temp") || args.includes("--prune");
const outputJson = args.includes("--json");
const verbose = args.includes("--verbose");
const currentPid = process.pid;
const rootNeedle = root.toLowerCase().replace(/\//g, "\\");
const tempRoot = path.resolve(os.tmpdir());

const qaScriptNames = [
  "capture-fullpage-qa.mjs",
  "capture-live-custom-domain-final-qa.mjs",
  "capture-live-qa.mjs",
  "capture-premium-visual-matrix.mjs",
  "cleanup-qa-processes.mjs",
  "run-release-gate.mjs",
  "verify-phase2-responsive.mjs",
  "verify-premium-cross-viewport.mjs",
  "verify-readable-contrast.mjs",
  "verify-rendered-touch-targets.mjs",
];

const edgeProfilePrefixes = [
  "vera-live-custom-qa-",
  "vera-premium-matrix-",
  "vera-phase2-edge-",
  "live-qa-",
  "vera-phase2-responsive-",
  "vera-contrast-",
  "vera-premium-xv-",
  "vera-touch-targets-",
];

function parseOlderThanMinutes() {
  const index = args.indexOf("--older-than-minutes");
  if (index === -1) return 120;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value < 0) throw new Error("--older-than-minutes requires a non-negative number");
  return value;
}

function parseMaxTempRemovals() {
  const index = args.indexOf("--max-temp-removals");
  if (index === -1) return 80;
  const raw = String(args[index + 1] || "").toLowerCase();
  if (raw === "all") return Number.POSITIVE_INFINITY;
  if (raw === "none" || raw === "0") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) throw new Error("--max-temp-removals requires a positive number, 0, none, or all");
  return Math.floor(value);
}

function getProcesses() {
  const command = [
    "$ErrorActionPreference = 'Stop';",
    "Get-CimInstance Win32_Process |",
    "Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate |",
    "ConvertTo-Json -Depth 3",
  ].join(" ");
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "Failed to query processes").trim());
  }
  const raw = (result.stdout || "").replace(/^\uFEFF/, "").trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function classifyProcess(processInfo) {
  const pid = Number(processInfo.ProcessId);
  if (!pid || pid === currentPid) return null;

  const name = String(processInfo.Name || "").toLowerCase();
  const commandLine = String(processInfo.CommandLine || "");
  const commandNeedle = commandLine.toLowerCase().replace(/\//g, "\\");
  const hasRepoRoot = commandNeedle.includes(rootNeedle);
  const hasQaScriptPath = commandNeedle.includes("\\qa\\scripts\\");
  const hasKnownQaScript = qaScriptNames.some((script) => commandNeedle.includes(script.toLowerCase()));
  const hasQaEdgeProfile = edgeProfilePrefixes.some((prefix) => commandNeedle.includes(prefix));

  if (name.includes("node") && ((hasRepoRoot && (hasQaScriptPath || hasKnownQaScript)) || hasKnownQaScript)) {
    return {
      pid,
      name: processInfo.Name,
      reason: "node process launched from this repo's QA scripts",
      commandLine,
    };
  }

  if (
    name === "msedge.exe" &&
    commandNeedle.includes("--remote-debugging-port") &&
    commandNeedle.includes("--headless") &&
    hasQaEdgeProfile
  ) {
    return {
      pid,
      name: processInfo.Name,
      reason: "headless Edge process using a Vera QA temporary profile",
      commandLine,
    };
  }

  return null;
}

function stopProcesses(matches) {
  if (!matches.length) return { attempted: false, code: 0, stdout: "", stderr: "" };
  const ids = matches.map((match) => match.pid).join(",");
  const command = `Stop-Process -Id ${ids} -Force -ErrorAction Stop`;
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    encoding: "utf8",
  });
  return {
    attempted: true,
    code: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function listTempProfiles(olderThanMinutes) {
  const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
  if (!fs.existsSync(tempRoot)) return [];
  return fs
    .readdirSync(tempRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && edgeProfilePrefixes.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => {
      const fullPath = path.resolve(tempRoot, entry.name);
      const stats = fs.statSync(fullPath);
      return {
        name: entry.name,
        path: fullPath,
        mtime: stats.mtime.toISOString(),
        olderThanThreshold: stats.mtimeMs <= cutoff,
      };
    })
    .filter((entry) => entry.olderThanThreshold);
}

function pruneTempProfiles(entries) {
  const removed = [];
  const failed = [];
  for (const entry of entries) {
    const resolved = path.resolve(entry.path);
    const insideTemp = resolved === tempRoot || resolved.startsWith(`${tempRoot}${path.sep}`);
    const allowedName = edgeProfilePrefixes.some((prefix) => path.basename(resolved).startsWith(prefix));
    if (!insideTemp || !allowedName) {
      failed.push({ path: entry.path, error: "Refused to remove path outside the expected temp profile scope" });
      continue;
    }
    try {
      fs.rmSync(resolved, { recursive: true, force: true });
      removed.push(entry.path);
    } catch (error) {
      failed.push({ path: entry.path, error: error.message });
    }
  }
  return { removed, failed };
}

const olderThanMinutes = parseOlderThanMinutes();
const maxTempRemovals = parseMaxTempRemovals();
const matches = getProcesses().map(classifyProcess).filter(Boolean);
const allTempProfiles = listTempProfiles(olderThanMinutes);
const tempProfiles = Number.isFinite(maxTempRemovals) ? allTempProfiles.slice(0, maxTempRemovals) : allTempProfiles;
const stopResult = shouldKill ? stopProcesses(matches) : { attempted: false, code: 0, stdout: "", stderr: "" };
const pruneResult = shouldPruneTemp ? pruneTempProfiles(tempProfiles) : { removed: [], failed: [] };

const report = {
  generatedAt: new Date().toISOString(),
  repoRoot: root,
  dryRun: !shouldKill && !shouldPruneTemp,
  killRequested: shouldKill,
  pruneTempRequested: shouldPruneTemp,
  olderThanMinutes,
  maxTempRemovals,
  processMatchCount: matches.length,
  processMatches: matches,
  stopResult,
  tempProfileMatchCount: allTempProfiles.length,
  tempProfileSelectedCount: tempProfiles.length,
  tempProfileSelectionLimited: tempProfiles.length < allTempProfiles.length,
  tempProfiles,
  pruneResult,
  passed: stopResult.code === 0 && pruneResult.failed.length === 0,
};

if (outputJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Vera QA cleanup ${report.dryRun ? "dry run" : "run"}: ${matches.length} process match(es), ${allTempProfiles.length} temp profile(s) older than ${olderThanMinutes} minute(s), ${tempProfiles.length} selected.`);
  for (const match of matches) {
    console.log(`- ${match.pid} ${match.name}: ${match.reason}`);
  }
  if (shouldKill && stopResult.code !== 0) console.error(stopResult.stderr || "Stop-Process failed");
  if (shouldPruneTemp) {
    console.log(`Removed ${pruneResult.removed.length} Vera QA temp profile(s).`);
    for (const removed of verbose ? pruneResult.removed : pruneResult.removed.slice(0, 5)) console.log(`- removed ${removed}`);
    if (!verbose && pruneResult.removed.length > 5) console.log(`- ${pruneResult.removed.length - 5} more removed; rerun with --verbose for the full list`);
    for (const failed of pruneResult.failed) console.error(`- failed ${failed.path}: ${failed.error}`);
  }
}

process.exitCode = report.passed ? 0 : 1;
