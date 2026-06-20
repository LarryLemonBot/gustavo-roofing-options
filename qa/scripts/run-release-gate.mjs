import { spawn } from "node:child_process";
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
    name: "static visual guards",
    command: ["node", "qa/scripts/verify-final-mobile-visual-guards.mjs"],
    reportPrefix: null,
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
      shell: process.platform === "win32",
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
for (const step of steps) {
  completedSteps.push(await runStep(step));
}

const summarizedSteps = completedSteps.map(summarizeStep);
const allPassed = summarizedSteps.every((step) => step.passed);

const actionItems = [];
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

if (actionItems.length === 0) {
  actionItems.push("No machine-detected blockers. Do a human screenshot pass before deploy.");
}

const report = {
  runId,
  root,
  outDir,
  allPassed,
  generatedAt: new Date().toISOString(),
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
  "## Action Items",
  ...actionItems.map((item) => `- ${item}`),
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

process.exit(allPassed ? 0 : 1);
