import fs from "node:fs/promises";
import fssync from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const publicDir = path.join(root, "public");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const outDir = path.join(root, "qa", `image-render-quality-${runId}`);
await fs.mkdir(outDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function servePath(reqUrl) {
  const url = new URL(reqUrl, "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (!path.extname(pathname)) pathname = `${pathname}.html`;
  const target = path.resolve(publicDir, `.${pathname.replace(/\\/g, "/")}`);
  return target.startsWith(publicDir) ? target : null;
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const target = servePath(req.url || "/");
    if (!target) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    try {
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, "index.html") : target;
      res.writeHead(200, { "Content-Type": mime[path.extname(file).toLowerCase()] || "application/octet-stream" });
      fssync.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

function freePort() {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function browserPath() {
  const candidates = [
    process.env.VERA_BROWSER_PATH,
    process.env.EDGE_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Users\\alexl\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fssync.existsSync(candidate));
  if (!found) throw new Error(`Browser not found. Tried: ${candidates.join(", ")}`);
  return found;
}

function imageFileForUrl(urlPath) {
  const pathname = (urlPath || "").split("?")[0].split("#")[0];
  if (!pathname.startsWith("/")) return null;
  const target = path.resolve(publicDir, `.${pathname.replace(/\\/g, "/")}`);
  return target.startsWith(publicDir) ? target : null;
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const dimensionCache = new Map();
function fileDimensions(urlPath) {
  if (dimensionCache.has(urlPath)) return dimensionCache.get(urlPath);
  const file = imageFileForUrl(urlPath);
  let dims = null;
  try {
    if (file && fssync.existsSync(file)) {
      const buffer = fssync.readFileSync(file);
      const ext = path.extname(file).toLowerCase();
      if (ext === ".jpg" || ext === ".jpeg") dims = jpegDimensions(buffer);
      if (ext === ".png") dims = pngDimensions(buffer);
    }
  } catch {
    dims = null;
  }
  dimensionCache.set(urlPath, dims);
  return dims;
}

async function waitJson(url, timeoutMs = Number.parseInt(process.env.VERA_CDP_WAIT_MS || "45000", 10)) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let id = 1;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => {
        const msgId = id++;
        pending.set(msgId, { res, rej, method });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const waiter = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? waiter.rej(new Error(`${waiter.method}: ${msg.error.message}`)) : waiter.res(msg.result || {});
      }
    };
    ws.onerror = reject;
  });
}

async function waitReady(client) {
  let lastSnapshot = null;
  let stableInteractiveCount = 0;
  for (let i = 0; i < 140; i += 1) {
    const snapshot = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const root = document.documentElement;
        const body = document.body;
        const pendingCriticalImages = Array.from(document.images).filter((img) => {
          if (img.complete) return false;
          const loading = (img.getAttribute("loading") || "").toLowerCase();
          if (loading === "lazy") return false;
          const rect = img.getBoundingClientRect();
          return rect.bottom > -20 && rect.top < (window.innerHeight * 1.5);
        }).length;
        return {
          state: document.readyState,
          hasBody: !!body,
          hasMainContent: !!document.querySelector("main, h1"),
          scrollHeight: Math.max(root?.scrollHeight || 0, body?.scrollHeight || 0),
          pendingCriticalImages,
        };
      })()`,
      returnByValue: true,
    }).then((result) => result.result?.value).catch(() => null);

    lastSnapshot = snapshot || lastSnapshot;
    const state = snapshot?.state || "unknown";
    const interactiveReady = state === "interactive"
      && snapshot?.hasBody
      && snapshot?.hasMainContent
      && snapshot?.scrollHeight > 0
      && snapshot?.pendingCriticalImages === 0;
    if (state === "complete") return;
    if (interactiveReady) {
      stableInteractiveCount += 1;
      if (stableInteractiveCount >= 4) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return;
      }
    } else {
      stableInteractiveCount = 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const summary = lastSnapshot
    ? `state=${lastSnapshot.state}; pendingCriticalImages=${lastSnapshot.pendingCriticalImages}; scrollHeight=${lastSnapshot.scrollHeight}`
    : "state=unknown";
  throw new Error(`Timed out waiting for visual readiness; last snapshot ${summary}`);
}

const pages = [
  ["home", "/"],
  ["services", "/services"],
  ["gutter-cleaning-guards", "/gutter-cleaning-guards"],
  ["photos", "/photos"],
  ["areas", "/areas"],
  ["process", "/process"],
  ["contact", "/contact"],
];

const viewports = [
  { label: "desktop-1366", width: 1366, height: 900, dpr: 1, mobile: false },
  { label: "tablet-768", width: 768, height: 1024, dpr: 1.5, mobile: true },
  { label: "mobile-390", width: 390, height: 844, dpr: 2, mobile: true },
];

const expression = `(() => {
  const rectFor = (el) => {
    const r = el.getBoundingClientRect();
    return {
      left: Math.round(r.left),
      top: Math.round(r.top),
      width: Math.round(r.width),
      height: Math.round(r.height),
      bottom: Math.round(r.bottom),
      right: Math.round(r.right),
    };
  };
  const localSrc = (src) => {
    try {
      const url = new URL(src, location.href);
      return url.pathname;
    } catch {
      return src || "";
    }
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  return Array.from(document.images).filter(visible).map((img) => {
    const rect = rectFor(img);
    const requiredWidth = Math.ceil(rect.width * window.devicePixelRatio);
    return {
      src: localSrc(img.getAttribute("src") || img.src),
      currentSrc: localSrc(img.currentSrc || img.src),
      alt: img.alt || "",
      className: String(img.className || ""),
      figureClass: String(img.closest("figure")?.className || ""),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      requiredWidth,
      rect,
      overscaleRatio: img.naturalWidth ? Number((requiredWidth / img.naturalWidth).toFixed(2)) : null,
    };
  });
})()`;

async function capture(client, base, page, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    mobile: viewport.mobile,
  });
  await client.send("Page.navigate", { url: `${base}${page[1]}` });
  await waitReady(client);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const rawImages = (await client.send("Runtime.evaluate", { expression, returnByValue: true })).result.value;
  const images = rawImages.map((image) => {
    const dims = fileDimensions(image.currentSrc || image.src);
    return {
      ...image,
      actualWidth: dims?.width || null,
      actualHeight: dims?.height || null,
      overscaleRatio: dims?.width ? Number((image.requiredWidth / dims.width).toFixed(2)) : null,
    };
  });
  return { page: page[0], path: page[1], viewport: viewport.label, dpr: viewport.dpr, images };
}

const { server, port } = await startServer();
const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "vera-image-quality-"));
const child = spawn(browserPath(), [
  `--remote-debugging-port=${debugPort}`,
  "--remote-allow-origins=*",
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--disable-background-networking",
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

let stderr = "";
child.stderr?.on("data", (data) => { stderr += String(data); });

try {
  const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === "page" && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  const base = `http://127.0.0.1:${port}`;
  const captures = [];
  for (const viewport of viewports) {
    for (const page of pages) {
      console.error(`[image-quality] ${viewport.label} ${page[0]}`);
      captures.push(await capture(client, base, page, viewport));
    }
  }
  client.close();

  const issues = [];
  for (const capture of captures) {
    for (const image of capture.images) {
      if (!image.actualWidth || !image.actualHeight) {
        issues.push({ ...capture, issue: "broken-image", image });
        continue;
      }
      if (image.rect.width >= 120 && image.overscaleRatio > 1.12) {
        issues.push({ ...capture, issue: "rendered-wider-than-selected-source", image });
      }
    }
  }

  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    root,
    outDir,
    base,
    thresholds: {
      minCssWidthForOverscaleCheck: 120,
      maxOverscaleRatio: 1.12,
      note: "requiredWidth is CSS rendered width multiplied by simulated device pixel ratio.",
    },
    totalCaptures: captures.length,
    issueCount: issues.length,
    issues,
    captures,
  };

  const reportPath = path.join(outDir, "image-render-quality-report.json");
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (issues.length) {
    console.error(`Image render quality FAIL: ${reportPath}`);
    for (const item of issues.slice(0, 20)) {
      console.error(`- ${item.viewport} ${item.path}: ${item.issue} ${item.image.currentSrc} required=${item.image.requiredWidth}px actual=${item.image.actualWidth}px ratio=${item.image.overscaleRatio}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Image render quality PASS: ${reportPath}`);
  }
} finally {
  server.close();
  child.kill();
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
  if (stderr && process.env.VERA_DEBUG_BROWSER_STDERR === "1") console.error(stderr);
}
