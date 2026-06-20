import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const qaDir = path.join(root, "qa");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.join(qaDir, `automation-output-triage-${runId}`);
fs.mkdirSync(outDir, { recursive: true });

const automationBase = path.join(os.homedir(), ".codex", "automations");
const expectedAutomations = [
  {
    id: "vera-roofing-live-visual-conversion-qa",
    role: "Live custom-domain visual and homeowner-conversion QA",
    requiredMemory: true,
    staleAfterHours: 18,
  },
  {
    id: "vera-roofing-automation-output-triage",
    role: "Reads Vera automation outputs and turns concrete findings into patches or handoff items",
    requiredMemory: true,
    staleAfterHours: 18,
  },
  {
    id: "vera-roofing-gutter-competitor-review",
    role: "Weekly roofing and gutter competitor-pattern review",
    requiredMemory: false,
    staleAfterHours: 24 * 8,
  },
];

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function newestReport(prefix, fileName) {
  if (!fs.existsSync(qaDir)) return null;
  const dirs = fs
    .readdirSync(qaDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => {
      const fullPath = path.join(qaDir, entry.name);
      return { name: entry.name, fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const dir of dirs) {
    const reportPath = path.join(dir.fullPath, fileName);
    if (fs.existsSync(reportPath)) return reportPath;
  }
  return null;
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function mtimeMs(filePath) {
  return filePath && fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : null;
}

function parseAutomationToml(text) {
  const pick = (key) => {
    const match = text.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
    if (!match) return null;
    const raw = match[1].trim();
    if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
    if (/^\d+$/.test(raw)) return Number(raw);
    return raw;
  };

  return {
    id: pick("id"),
    kind: pick("kind"),
    name: pick("name"),
    status: pick("status"),
    rrule: pick("rrule"),
    model: pick("model"),
    reasoningEffort: pick("reasoning_effort"),
    executionEnvironment: pick("execution_environment"),
    createdAt: pick("created_at"),
    updatedAt: pick("updated_at"),
  };
}

function latestMemoryBlock(memory) {
  if (!memory.trim()) return null;
  const lines = memory.split(/\r?\n/);
  const starts = [];
  lines.forEach((line, index) => {
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Z]{3}\s*$/.test(line)) starts.push(index);
  });
  if (!starts.length) return memory.trim();
  return lines.slice(starts.at(-1)).join("\n").trim();
}

function hoursSince(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return (Date.now() - fs.statSync(filePath).mtimeMs) / 36e5;
}

async function fetchProbe(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: options.redirect || "manual",
      signal: controller.signal,
      headers: { "User-Agent": "VeraRoofingAutomationTriage/1.0" },
    });
    const body = options.readBody ? await response.text() : "";
    return {
      url,
      ok: response.ok,
      status: response.status,
      location: response.headers.get("location"),
      body,
    };
  } catch (error) {
    return { url, ok: false, status: null, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function addUnique(list, item) {
  if (!list.includes(item)) list.push(item);
}

function runGit(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", shell: false });
  return {
    command: `git ${args.join(" ")}`,
    code: result.status,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function isDeployExcluded(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    [
      "README.md",
      "EDITING-GUIDE.md",
      "implementation-brief.md",
      "POLISH-PASS-RECOMMENDATION.md",
      "HANDOFF-EDITING.md",
      "00-NEXT-SESSION-HANDOFF.md",
      "local-photo-label-audit-sheet.jpg",
    ].includes(normalized)
  ) {
    return true;
  }
  if (
    normalized.startsWith("archive/") ||
    normalized.startsWith(".hermes/") ||
    normalized.startsWith("research/") ||
    normalized.startsWith("photo-audit/") ||
    normalized.startsWith("mcps/") ||
    normalized.startsWith("terminals/") ||
    normalized.startsWith("backups/") ||
    normalized.startsWith("qa/") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith(".vercel/") ||
    normalized.startsWith("scripts/")
  ) {
    return true;
  }
  if (/^HANDOFF-(CODEX-DESKTOP-|RETURN-).+\.md$/.test(normalized)) return true;
  if (/^HANDOFF-HERMES-MINIMAX-M3-VERA-2026-06-11\.md$/.test(normalized)) return true;
  if (/^HANDOFF-MINI-M3-FOR-VERA-2026-06-10\.md$/.test(normalized)) return true;
  if (/\.(zip|tgz|tar|tar\.gz)$/i.test(normalized)) return true;
  if (/\.DS_Store$/i.test(normalized)) return true;
  return false;
}

function deployDiffBetween(fromCommit, toCommit) {
  if (!fromCommit || !toCommit || fromCommit === toCommit) {
    return {
      fromCommit,
      toCommit,
      command: null,
      changedFiles: [],
      deployRelevantFiles: [],
      deployExcludedFiles: [],
      diffReadable: true,
    };
  }
  const diff = runGit(["diff", "--name-only", fromCommit, toCommit]);
  const changedFiles = diff.stdout ? diff.stdout.split(/\r?\n/).filter(Boolean) : [];
  const deployRelevantFiles = changedFiles.filter((file) => !isDeployExcluded(file));
  const deployExcludedFiles = changedFiles.filter((file) => isDeployExcluded(file));
  return {
    fromCommit,
    toCommit,
    command: diff.command,
    code: diff.code,
    stderr: diff.stderr,
    changedFiles,
    deployRelevantFiles,
    deployExcludedFiles,
    diffReadable: diff.code === 0,
  };
}

const blockingIssues = [];
const warnings = [];
const resolvedFindings = [];
const nonActions = [];

const automations = expectedAutomations.map((expected) => {
  const dir = path.join(automationBase, expected.id);
  const tomlPath = path.join(dir, "automation.toml");
  const memoryPath = path.join(dir, "memory.md");
  const toml = readText(tomlPath);
  const memory = readText(memoryPath);
  const parsed = parseAutomationToml(toml);
  const memoryAgeHours = hoursSince(memoryPath);
  const latestMemory = latestMemoryBlock(memory);

  if (!toml) {
    addUnique(blockingIssues, `${expected.id}: missing automation.toml`);
  } else {
    if (parsed.kind !== "cron") addUnique(blockingIssues, `${expected.id}: expected cron automation, found ${parsed.kind || "unknown"}`);
    if (parsed.status !== "ACTIVE") addUnique(blockingIssues, `${expected.id}: automation is ${parsed.status || "missing status"}`);
  }

  if (expected.requiredMemory && !memory) {
    addUnique(blockingIssues, `${expected.id}: missing saved memory.md output`);
  } else if (!memory) {
    addUnique(warnings, `${expected.id}: no saved run output yet; acceptable until the first scheduled weekly competitor run completes`);
  } else if (memoryAgeHours > expected.staleAfterHours) {
    const staleMessage = `${expected.id}: saved output is ${memoryAgeHours.toFixed(1)} hours old; inspect the Codex automation card if this exceeds the expected cadence`;
    if (expected.requiredMemory) addUnique(blockingIssues, staleMessage);
    else addUnique(warnings, staleMessage);
  }

  return {
    ...expected,
    dir,
    tomlPath: fs.existsSync(tomlPath) ? tomlPath : null,
    memoryPath: fs.existsSync(memoryPath) ? memoryPath : null,
    parsed,
    memoryAgeHours: memoryAgeHours === null ? null : Number(memoryAgeHours.toFixed(2)),
    latestMemory,
  };
});

const latestReleaseGatePath = newestReport("release-gate-", "release-gate-report.json");
const latestReleaseGate = readJson(latestReleaseGatePath);
const latestReleaseGateSourceCommit = latestReleaseGate?.sourceCommit || latestReleaseGate?.preflight?.sourceCommit || null;
if (!latestReleaseGatePath) {
  addUnique(warnings, "No release-gate report exists yet.");
} else if (latestReleaseGate?.allPassed !== true) {
  addUnique(blockingIssues, `Latest release gate did not pass: ${path.relative(root, latestReleaseGatePath)}`);
}

const latestLivePath = newestReport("live-custom-domain-final-", "live-custom-domain-final-report.json");
const latestLiveReport = readJson(latestLivePath);
const latestLiveSourceCommit = latestLiveReport?.sourceCommit || null;
if (!latestLivePath) {
  addUnique(warnings, "No live custom-domain visual report exists yet.");
} else if (latestLiveReport?.issueCount !== 0) {
  addUnique(blockingIssues, `Latest live custom-domain visual report has ${latestLiveReport?.issueCount ?? "unknown"} issue(s): ${path.relative(root, latestLivePath)}`);
}

const latestReleaseGateMtime = mtimeMs(latestReleaseGatePath);
const latestLiveMtime = mtimeMs(latestLivePath);
const latestDeployDiff = deployDiffBetween(latestLiveSourceCommit, latestReleaseGateSourceCommit);
const hasDeployRelevantCommitDrift = !latestDeployDiff.diffReadable || latestDeployDiff.deployRelevantFiles.length > 0;
if (latestReleaseGatePath && latestLivePath && latestLiveMtime < latestReleaseGateMtime) {
  if (hasDeployRelevantCommitDrift) {
    addUnique(
      blockingIssues,
      `Latest live custom-domain QA is older than the latest release gate for deploy-relevant changes; run node qa/scripts/capture-live-custom-domain-final-qa.mjs after deploy. Live: ${path.relative(root, latestLivePath)}; release: ${path.relative(root, latestReleaseGatePath)}`,
    );
  } else {
    addUnique(
      nonActions,
      `Latest release gate is newer than live QA only because deploy-excluded files changed (${latestDeployDiff.deployExcludedFiles.join(", ")}). No public redeploy is required for this drift.`,
    );
  }
}
if (latestReleaseGateSourceCommit && latestLiveSourceCommit && latestReleaseGateSourceCommit !== latestLiveSourceCommit) {
  if (hasDeployRelevantCommitDrift) {
    addUnique(
      blockingIssues,
      `Latest live custom-domain QA commit does not match latest release gate commit for deploy-relevant changes. Live: ${latestLiveSourceCommit}; release: ${latestReleaseGateSourceCommit}`,
    );
  } else {
    addUnique(
      nonActions,
      `Latest live custom-domain QA commit differs from the release gate commit, but the diff is deploy-excluded only (${latestDeployDiff.deployExcludedFiles.join(", ")}).`,
    );
  }
}

const liveProbes = [];
for (const probe of [
  { url: "https://verasroofing.com/gutter-cleaning-guards", expectStatus: 200 },
  { url: "https://verasroofing.com/gutter-cleaning", expectStatus: 308, expectLocation: "/gutter-cleaning-guards" },
  { url: "https://verasroofing.com/gutter-guards", expectStatus: 308, expectLocation: "/gutter-cleaning-guards" },
  { url: "https://verasroofing.com/.well-known/ai.txt", expectStatus: 200, bodyIncludes: "https://verasroofing.com/gutter-cleaning-guards", readBody: true },
]) {
  const result = await fetchProbe(probe.url, { readBody: probe.readBody });
  const statusMatches = result.status === probe.expectStatus;
  const locationMatches = !probe.expectLocation || (result.location || "").includes(probe.expectLocation);
  const bodyMatches = !probe.bodyIncludes || result.body.includes(probe.bodyIncludes);
  const probePassed = statusMatches && locationMatches && bodyMatches;
  liveProbes.push({
    ...probe,
    ...result,
    httpOk: result.ok,
    ok: probePassed,
    statusMatches,
    locationMatches,
    bodyMatches,
    body: result.body ? `${result.body.slice(0, 400)}${result.body.length > 400 ? "..." : ""}` : "",
  });

  if (!statusMatches) {
    addUnique(blockingIssues, `${probe.url}: expected ${probe.expectStatus}, got ${result.status || result.error}`);
    continue;
  }
  if (!locationMatches) {
    addUnique(blockingIssues, `${probe.url}: expected redirect to include ${probe.expectLocation}, got ${result.location || "no location header"}`);
  }
  if (!bodyMatches) {
    addUnique(blockingIssues, `${probe.url}: response is missing ${probe.bodyIncludes}`);
  }
}

const latestLiveMemory = automations.find((automation) => automation.id === "vera-roofing-live-visual-conversion-qa")?.latestMemory || "";
if (latestLiveMemory.includes("gutter-cleaning-guards") && latestLiveMemory.includes("404")) {
  const gutterProbe = liveProbes.find((probe) => probe.url === "https://verasroofing.com/gutter-cleaning-guards");
  if (gutterProbe?.status === 200) {
    addUnique(resolvedFindings, "Historical automation finding resolved: standalone /gutter-cleaning-guards now returns 200 on the live custom domain.");
  }
}
if (latestLiveMemory.includes("capture-live-custom-domain-final-qa.mjs") && latestLiveMemory.includes("scrollTo")) {
  const captureScript = readText(path.join(root, "qa", "scripts", "capture-live-custom-domain-final-qa.mjs"));
  if (captureScript.includes("anchorState") && captureScript.includes("missingAnchorTarget")) {
    addUnique(resolvedFindings, "Historical automation finding resolved: live custom-domain screenshots now preserve and report hash-anchor state.");
  }
}

if (!automations.find((automation) => automation.id === "vera-roofing-gutter-competitor-review")?.latestMemory) {
  addUnique(
    nonActions,
    "No patch from the gutter competitor automation yet: it has not produced a saved run note, and the weekly job has not reached its first Monday run window.",
  );
}

const report = {
  runId,
  generatedAt: new Date().toISOString(),
  root,
  automationBase,
  automations,
  qaReports: {
    latestReleaseGatePath,
    latestReleaseGatePassed: latestReleaseGate?.allPassed ?? null,
    latestReleaseGateSourceCommit,
    latestLivePath,
    latestLiveIssueCount: latestLiveReport?.issueCount ?? null,
    latestLiveCaptureCount: latestLiveReport?.captures?.length ?? null,
    latestLiveSourceCommit,
    latestDeployDiff,
    sourceCommitMatches:
      latestReleaseGateSourceCommit && latestLiveSourceCommit
        ? latestReleaseGateSourceCommit === latestLiveSourceCommit
        : null,
    deployRelevantSourceCommitDrift: latestReleaseGateSourceCommit && latestLiveSourceCommit ? hasDeployRelevantCommitDrift : null,
    latestLiveIsNewerThanReleaseGate: latestReleaseGatePath && latestLivePath ? latestLiveMtime >= latestReleaseGateMtime : null,
  },
  liveProbes,
  resolvedFindings,
  nonActions,
  warnings,
  blockingIssues,
  issueCount: blockingIssues.length,
};

const reportPath = path.join(outDir, "automation-output-triage-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [
  `# Vera Roofing Automation Output Triage ${runId}`,
  "",
  `Status: ${blockingIssues.length ? "FAIL" : "PASS"}`,
  "",
  "## Blocking Issues",
  ...(blockingIssues.length ? blockingIssues.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Warnings",
  ...(warnings.length ? warnings.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Resolved Findings",
  ...(resolvedFindings.length ? resolvedFindings.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Non-Actions",
  ...(nonActions.length ? nonActions.map((item) => `- ${item}`) : ["- None"]),
  "",
  "## Automation Outputs",
  ...automations.map((automation) => {
    const age = automation.memoryAgeHours === null ? "no memory" : `${automation.memoryAgeHours}h old`;
    return `- ${automation.id}: ${automation.parsed.status || "unknown"} / ${automation.parsed.rrule || "no rrule"} / ${age}`;
  }),
  "",
  "## QA Reports",
  `- Release gate: ${latestReleaseGatePath ? path.relative(root, latestReleaseGatePath) : "none"} (${latestReleaseGate?.allPassed === true ? "PASS" : "not passing or unavailable"})`,
  `- Live custom-domain QA: ${latestLivePath ? path.relative(root, latestLivePath) : "none"} (${latestLiveReport?.issueCount === 0 ? "0 issues" : "not clean or unavailable"})`,
  "",
  "## Live Probes",
  ...liveProbes.map((probe) => `- ${probe.url}: ${probe.status || probe.error}${probe.location ? ` -> ${probe.location}` : ""}`),
  "",
].join("\n");

fs.writeFileSync(path.join(outDir, "automation-output-triage-report.md"), md);

console.log(`Automation output triage ${blockingIssues.length ? "FAIL" : "PASS"}`);
console.log(path.relative(root, reportPath));
for (const item of blockingIssues) console.log(`- BLOCKING: ${item}`);
for (const item of warnings) console.log(`- WARNING: ${item}`);
for (const item of resolvedFindings) console.log(`- RESOLVED: ${item}`);
for (const item of nonActions) console.log(`- NON-ACTION: ${item}`);

process.exitCode = blockingIssues.length ? 1 : 0;
