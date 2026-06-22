import fs from 'node:fs/promises';
import fssync from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'public');
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const outDir = path.join(root, 'qa', `rendered-touch-targets-${runId}`);
await fs.mkdir(outDir, { recursive: true });

const routes = [
  { label: 'home', path: '/' },
  { label: 'services', path: '/services' },
  { label: 'gutters', path: '/gutter-cleaning-guards' },
  { label: 'photos', path: '/photos' },
  { label: 'areas', path: '/areas' },
  { label: 'process', path: '/process' },
  { label: 'contact', path: '/contact' },
];

const viewports = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
];

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function servePath(reqUrl) {
  const url = new URL(reqUrl, 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (!path.extname(pathname)) pathname = `${pathname}.html`;
  const target = path.resolve(publicDir, `.${pathname.replace(/\\/g, '/')}`);
  return target.startsWith(publicDir) ? target : null;
}

async function startServer() {
  const server = http.createServer(async (req, res) => {
    const target = servePath(req.url || '/');
    if (!target) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    try {
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fssync.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function browserPath() {
  const candidates = [
    process.env.VERA_BROWSER_PATH,
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Users\\alexl\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fssync.existsSync(candidate));
  if (!found) throw new Error(`Browser not found. Tried: ${candidates.join(', ')}`);
  return found;
}

async function waitJson(url, timeoutMs = Number.parseInt(process.env.VERA_CDP_WAIT_MS || '45000', 10)) {
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
      if (!msg.id || !pending.has(msg.id)) return;
      const waiting = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? waiting.rej(new Error(`${waiting.method}: ${msg.error.message}`)) : waiting.res(msg.result || {});
    };
    ws.onerror = reject;
  });
}

async function getVisualReadySnapshot(client) {
  const result = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.documentElement;
      const body = document.body;
      const pendingCriticalImages = Array.from(document.images).filter((img) => {
        if (img.complete) return false;
        const loading = (img.getAttribute('loading') || '').toLowerCase();
        if (loading === 'lazy') return false;
        const rect = img.getBoundingClientRect();
        return rect.bottom > -20 && rect.top < (window.innerHeight * 1.5);
      }).length;
      return {
        state: document.readyState,
        hasBody: !!body,
        hasMainContent: !!document.querySelector('main, h1'),
        scrollHeight: Math.max(root?.scrollHeight || 0, body?.scrollHeight || 0),
        pendingCriticalImages,
      };
    })()`,
    returnByValue: true,
  });
  return result.result?.value || null;
}

async function waitReady(client) {
  let lastSnapshot = null;
  let stableInteractiveCount = 0;
  for (let i = 0; i < 140; i += 1) {
    const snapshot = await getVisualReadySnapshot(client).catch(() => null);
    lastSnapshot = snapshot || lastSnapshot;
    const state = snapshot?.state || 'unknown';
    const interactiveReady = state === 'interactive'
      && snapshot?.hasBody
      && snapshot?.hasMainContent
      && snapshot?.scrollHeight > 0
      && snapshot?.pendingCriticalImages === 0;
    if (state === 'complete') return;
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
    ? `state=${lastSnapshot.state}; hasBody=${lastSnapshot.hasBody}; hasMainContent=${lastSnapshot.hasMainContent}; pendingCriticalImages=${lastSnapshot.pendingCriticalImages}; scrollHeight=${lastSnapshot.scrollHeight}`
    : 'state=unknown';
  throw new Error(`Timed out waiting for visual readiness; last snapshot ${summary}`);
}

const expression = `(() => {
  const selectors = [
    '.btn',
    '.navlinks a',
    '.hero-actions a',
    '.contact-actions a',
    '.hero-issue-links a',
    '.gallery-nav a',
    '.footer-links a',
    '.footer-contact a',
    '.home-area-actions a',
    '.area-strip-card > a',
    '.service-fit-guide a',
    '.mobile-email-hero a'
  ];
  const seen = new Set();
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const text = (el) => (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' ').slice(0, 120);
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  };
  const targets = [];
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (seen.has(el) || !visible(el)) continue;
      seen.add(el);
      targets.push({ selector, tag: el.tagName.toLowerCase(), text: text(el), rect: rect(el) });
    }
  }
  const failures = targets.filter((target) => target.rect.width < 44 || target.rect.height < 44);
  return { href: location.href, viewport: { width: innerWidth, height: innerHeight }, targetCount: targets.length, failures };
})()`;

async function run() {
  const { server, port } = await startServer();
  const debugPort = await freePort();
  const userDataDir = path.join(os.tmpdir(), `vera-touch-targets-${runId}`);
  const browser = spawn(browserPath(), [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], { stdio: 'ignore' });

  const checks = [];
  try {
    await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
    if (!target) throw new Error('No debuggable browser page target found');
    const client = await cdpClient(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    for (const viewport of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.label === 'mobile' ? 2 : 1,
        mobile: viewport.label === 'mobile',
      });
      for (const route of routes) {
        const url = `http://127.0.0.1:${port}${route.path}`;
        await client.send('Page.navigate', { url });
        await waitReady(client);
        const result = await client.send('Runtime.evaluate', { expression, returnByValue: true });
        checks.push({ label: `${route.label}-${viewport.label}`, route: route.path, viewport, ...result.result.value });
      }
    }

    client.close();
  } finally {
    server.close();
    browser.kill();
  }

  const failures = checks.flatMap((check) => check.failures.map((failure) => ({ label: check.label, ...failure })));
  const report = {
    runId,
    generatedAt: new Date().toISOString(),
    issueCount: failures.length,
    checks,
    failures,
  };

  const reportPath = path.join(outDir, 'rendered-touch-targets-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: failures.length === 0, reportPath, issueCount: failures.length }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

await run();
