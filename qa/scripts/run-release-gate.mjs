import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const qaDir = path.join(root, "qa");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.join(qaDir, `release-gate-${runId}`);
const logDir = path.join(outDir, "logs");
fs.mkdirSync(logDir, { recursive: true });

const steps = [
  {
    name: "public mirror verification",
    command: ["powershell", "-ExecutionPolicy", "Bypass", "-File", "scripts/verify-public-mirrors.ps1"],
    reportPrefix: null,
  },
  {
    name: "static visual guards",
    command: ["node", "qa/scripts/verify-final-mobile-visual-guards.mjs"],
    reportPrefix: null,
  },
  {
    name: "rendered touch-target QA",
    command: ["node", "qa/scripts/verify-rendered-touch-targets.mjs"],
    reportPrefix: "rendered-touch-targets-",
    reportFile: "rendered-touch-targets-report.json",
  },
  {
    name: "full-page screenshot QA",
    command: ["node", "qa/scripts/capture-fullpage-qa.mjs"],
    reportPrefix: "phase2-fullpage-",
    reportFile: "phase2-fullpage-report.json",
  },
  {
    name: "cross-viewport symmetry QA",
    command: ["node", "qa/scripts/verify-premium-cross-viewport.mjs"],
    reportPrefix: "premium-cross-viewport-edge-",
    reportFile: "premium-cross-viewport-report.json",
  },
  {
    name: "readable contrast QA",
    command: ["node", "qa/scripts/verify-readable-contrast.mjs"],
    reportPrefix: "readable-contrast-",
    reportFile: "readable-contrast-report.json",
  },
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

const gitStatus = runGit(["status", "--short", "--branch"]);
const sourceCommit = runGit(["rev-parse", "HEAD"]).stdout || null;
const dirtyEntries = gitStatus.stdout
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter((line) => line && !line.startsWith("##"));
const strictCleanTree = process.env.ALLOW_DIRTY_RELEASE_GATE !== "1";
const preflight = {
  sourceCommit,
  gitStatus,
  dirtyEntries,
  strictCleanTree,
  passed: gitStatus.code === 0 && (!strictCleanTree || dirtyEntries.length === 0),
  allowDirtyReason: strictCleanTree ? null : "ALLOW_DIRTY_RELEASE_GATE=1",
};

function newestReport(prefix, fileName) {
  if (!prefix || !fileName) return null;
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

function runStep(step) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const safeName = step.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const stdoutPath = path.join(logDir, `${safeName}.stdout.log`);
    const stderrPath = path.join(logDir, `${safeName}.stderr.log`);
    const stdout = fs.createWriteStream(stdoutPath);
    const stderr = fs.createWriteStream(stderrPath);
    const child = spawn(step.command[0], step.command.slice(1), {
      cwd: root,
      shell: false,
      env: process.env,
    });

    child.stdout.pipe(stdout);
    child.stderr.pipe(stderr);

    child.on("close", (code) => {
      stdout.end();
      stderr.end();
      const finishedAt = new Date().toISOString();
      const reportPath = newestReport(step.reportPrefix, step.reportFile);
      resolve({
        name: step.name,
        command: step.command.join(" "),
        code,
        passed: code === 0,
        startedAt,
        finishedAt,
        stdoutPath,
        stderrPath,
        reportPath,
      });
    });
  });
}

function readJson(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseJsonFile(filePath) {
  try {
    return { ok: true, value: readJson(filePath), error: null };
  } catch (error) {
    return { ok: false, value: null, error: error.message };
  }
}

function latestLiveInspectionSummary() {
  const liveReportPath = newestReport("live-custom-domain-final-", "live-custom-domain-final-report.json");
  const liveReport = readJson(liveReportPath);
  if (!liveReport) {
    return {
      reportPath: null,
      inspectionMode: null,
      nativeBrowserInspected: false,
      fallbackUsed: null,
      issueCount: null,
    };
  }
  return {
    reportPath: liveReportPath,
    generatedAt: liveReport.generatedAt || null,
    inspectionMode: liveReport.inspectionMode || null,
    nativeBrowserInspected: liveReport.nativeBrowserInspected === true,
    fallbackUsed: liveReport.nativeBrowserInspected !== true,
    headless: liveReport.headless === true,
    issueCount: typeof liveReport.issueCount === "number" ? liveReport.issueCount : null,
  };
}

function nativeSidepanelSignoffSummary(latestLiveInspection) {
  const signoffPath = path.join(qaDir, "native-sidepanel-signoff.json");
  const requiredRoutes = [
    "/",
    "/services.html",
    "/services.html#certainteed-roof-system",
    "/services.html#epdm-flat-roofing",
    "/photos.html",
    "/photos.html#epdm-carolina-beach",
    "/areas.html",
    "/process.html",
    "/contact.html",
  ];
  const requiredViewports = ["390x844", "768x1024", "1366x900"];
  const exists = fs.existsSync(signoffPath);
  const parsed = exists ? parseJsonFile(signoffPath) : { ok: false, value: null, error: "missing" };
  const signoff = parsed.value || {};
  const routes = Array.isArray(signoff.routes) ? signoff.routes : [];
  const viewports = Array.isArray(signoff.viewports) ? signoff.viewports : [];
  const missingRoutes = requiredRoutes.filter((route) => !routes.includes(route));
  const missingViewports = requiredViewports.filter((viewport) => !viewports.includes(viewport));
  const signedAtMs = signoff.signedAt ? Date.parse(signoff.signedAt) : NaN;
  const latestLiveMs = latestLiveInspection?.generatedAt ? Date.parse(latestLiveInspection.generatedAt) : NaN;
  const signedAfterLatestLive =
    Number.isFinite(signedAtMs) && (!Number.isFinite(latestLiveMs) || signedAtMs >= latestLiveMs);
  const issues = [];

  if (!exists) issues.push("qa/native-sidepanel-signoff.json is missing.");
  if (exists && !parsed.ok) issues.push(`qa/native-sidepanel-signoff.json is invalid JSON: ${parsed.error}.`);
  if (parsed.ok) {
    if (signoff.result !== "pass") issues.push('native side-panel signoff result must be "pass".');
    if (signoff.sourceCommit !== sourceCommit) {
      issues.push(`native side-panel signoff sourceCommit must match current HEAD ${sourceCommit}.`);
    }
    if (signoff.liveDomain !== "https://verasroofing.com") {
      issues.push('native side-panel signoff liveDomain must be "https://verasroofing.com".');
    }
    if (!Number.isFinite(signedAtMs)) issues.push("native side-panel signoff signedAt must be a valid ISO timestamp.");
    if (!signedAfterLatestLive) {
      issues.push("native side-panel signoff must be newer than the latest live custom-domain capture.");
    }
    if (missingRoutes.length) issues.push(`native side-panel signoff is missing route(s): ${missingRoutes.join(", ")}.`);
    if (missingViewports.length) {
      issues.push(`native side-panel signoff is missing viewport(s): ${missingViewports.join(", ")}.`);
    }
  }

  return {
    path: signoffPath,
    exists,
    valid: issues.length === 0,
    issues,
    result: signoff.result || null,
    reviewer: signoff.reviewer || null,
    signedAt: signoff.signedAt || null,
    sourceCommit: signoff.sourceCommit || null,
    liveDomain: signoff.liveDomain || null,
    routes,
    viewports,
  };
}

function captureByLabel(report, label) {
  return report?.captures?.find((capture) => capture.label === label) || null;
}

function summarizeStep(step) {
  const report = readJson(step.reportPath);
  const summary = {
    ...step,
    issueCount: typeof report?.issueCount === "number" ? report.issueCount : null,
    totalCaptures: report?.totalCaptures || report?.captures?.length || null,
    totalChecks: report?.totalChecks || null,
  };

  if (step.reportPath?.includes("phase2-fullpage-")) {
    const homeMobile = captureByLabel(report, "home-mobile");
    const servicesMobile = captureByLabel(report, "services-mobile");
    summary.contentBudgets = {
      homeMobileHeight: homeMobile?.contentSize?.height || null,
      homeMobileMax: 8400,
      servicesMobileHeight: servicesMobile?.contentSize?.height || null,
      servicesMobileMax: 26000,
    };
    summary.passed =
      summary.passed &&
      summary.issueCount === 0 &&
      (!summary.contentBudgets.homeMobileHeight ||
        summary.contentBudgets.homeMobileHeight <= summary.contentBudgets.homeMobileMax) &&
      (!summary.contentBudgets.servicesMobileHeight ||
        summary.contentBudgets.servicesMobileHeight <= summary.contentBudgets.servicesMobileMax);
  } else if (typeof summary.issueCount === "number") {
    summary.passed = summary.passed && summary.issueCount === 0;
  }

  return summary;
}

const completedSteps = [];
if (preflight.passed) {
  for (const step of steps) {
    completedSteps.push(await runStep(step));
  }
}

const summarizedSteps = completedSteps.map(summarizeStep);
let allPassed = preflight.passed && summarizedSteps.every((step) => step.passed);
const inspectionCoverage = {
  latestLiveInspection: latestLiveInspectionSummary(),
};
inspectionCoverage.nativeSidepanelSignoff = nativeSidepanelSignoffSummary(
  inspectionCoverage.latestLiveInspection,
);
inspectionCoverage.nativeApprovalSatisfied =
  inspectionCoverage.latestLiveInspection.nativeBrowserInspected === true ||
  inspectionCoverage.nativeSidepanelSignoff.valid === true;
const requireNativeBrowser = process.env.REQUIRE_NATIVE_BROWSER === "1";

const actionItems = [];
if (!preflight.passed) {
  if (gitStatus.code !== 0) {
    actionItems.push(`Clean-worktree preflight could not read git status: ${gitStatus.stderr || "unknown git error"}.`);
  } else {
    actionItems.push(
      `Clean-worktree preflight failed with ${dirtyEntries.length} tracked change(s). Commit/stash before deploy, or set ALLOW_DIRTY_RELEASE_GATE=1 only for local investigation.`,
    );
  }
} else {
  for (const step of summarizedSteps) {
    if (step.code !== 0) {
      actionItems.push(`${step.name}: command failed; inspect ${path.relative(root, step.stderrPath)}.`);
    }
    if (typeof step.issueCount === "number" && step.issueCount > 0) {
      actionItems.push(`${step.name}: ${step.issueCount} issue(s); inspect ${path.relative(root, step.reportPath)}.`);
    }
    const budgets = step.contentBudgets;
    if (budgets?.homeMobileHeight && budgets.homeMobileHeight > budgets.homeMobileMax) {
      actionItems.push(
        `home mobile height is ${budgets.homeMobileHeight}px; compress repeated proof, image cards, or vertical gaps before deploy.`,
      );
    }
    if (budgets?.servicesMobileHeight && budgets.servicesMobileHeight > budgets.servicesMobileMax) {
      actionItems.push(
        `services mobile height is ${budgets.servicesMobileHeight}px; review service-page density and anchor repetition.`,
      );
    }
  }
}

if (requireNativeBrowser && inspectionCoverage.nativeApprovalSatisfied !== true) {
  allPassed = false;
  actionItems.push(
    "REQUIRE_NATIVE_BROWSER=1 is set but the latest live inspection did not use the native Codex in-app browser and no valid manual native side-panel signoff exists.",
  );
  for (const issue of inspectionCoverage.nativeSidepanelSignoff.issues) {
    actionItems.push(`Native side-panel signoff: ${issue}`);
  }
}

if (actionItems.length === 0) {
  actionItems.push("No machine-detected blockers. Do a human screenshot pass before deploy.");
}

const report = {
  runId,
  root,
  outDir,
  allPassed,
  generatedAt: new Date().toISOString(),
  preflight,
  inspectionCoverage,
  requireNativeBrowser,
  sourceCommit,
  steps: summarizedSteps,
  actionItems,
};

const reportPath = path.join(outDir, "release-gate-report.json");
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const md = [
  `# Vera Roofing Release Gate ${runId}`,
  "",
  `Status: ${allPassed ? "PASS" : "FAIL"}`,
  "",
  "## Preflight",
  `- source commit: ${sourceCommit || "unknown"}`,
  `- clean worktree required: ${strictCleanTree ? "yes" : "no"}`,
  `- git status: ${gitStatus.code === 0 ? "read" : "failed"}`,
  ...(dirtyEntries.length ? dirtyEntries.map((item) => `  - ${item}`) : ["  - clean"]),
  "",
  "## Action Items",
  ...actionItems.map((item) => `- ${item}`),
  "",
  "## Inspection Coverage",
  `- latest live inspection report: ${
    inspectionCoverage.latestLiveInspection.reportPath
      ? path.relative(root, inspectionCoverage.latestLiveInspection.reportPath)
      : "not found"
  }`,
  `- latest live inspection mode: ${inspectionCoverage.latestLiveInspection.inspectionMode || "unknown"}`,
  `- native browser inspected: ${inspectionCoverage.latestLiveInspection.nativeBrowserInspected ? "yes" : "no"}`,
  `- fallback used: ${inspectionCoverage.latestLiveInspection.fallbackUsed === null ? "unknown" : inspectionCoverage.latestLiveInspection.fallbackUsed ? "yes" : "no"}`,
  `- native browser required: ${requireNativeBrowser ? "yes" : "no"}`,
  `- manual native side-panel signoff: ${inspectionCoverage.nativeSidepanelSignoff.valid ? "valid" : "not valid"}`,
  `- manual native side-panel signoff file: ${path.relative(root, inspectionCoverage.nativeSidepanelSignoff.path)}`,
  "",
  "## Step Results",
  ...summarizedSteps.map((step) => {
    const lines = [
      `- ${step.passed ? "PASS" : "FAIL"}: ${step.name}`,
      `  - command: \`${step.command}\``,
      `  - report: ${step.reportPath ? path.relative(root, step.reportPath) : "command output only"}`,
    ];
    if (typeof step.issueCount === "number") lines.push(`  - issueCount: ${step.issueCount}`);
    if (step.contentBudgets) {
      lines.push(`  - home mobile height: ${step.contentBudgets.homeMobileHeight}px / ${step.contentBudgets.homeMobileMax}px`);
      lines.push(
        `  - services mobile height: ${step.contentBudgets.servicesMobileHeight}px / ${step.contentBudgets.servicesMobileMax}px`,
      );
    }
    return lines.join("\n");
  }),
  "",
  "## Human Review Requirement",
  "Open the generated mobile, tablet, and desktop screenshots. Confirm copy, image choices, CTA placement, symmetry, text contrast, and blank-space rhythm with human eyes before deploying.",
  "",
].join("\n");

fs.writeFileSync(path.join(outDir, "release-gate-report.md"), md);

console.log(`Release gate ${allPassed ? "PASS" : "FAIL"}`);
console.log(path.relative(root, reportPath));
for (const item of actionItems) console.log(`- ${item}`);

process.exitCode = allPassed ? 0 : 1;
