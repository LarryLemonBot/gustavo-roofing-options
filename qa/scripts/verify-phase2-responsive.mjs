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
const outDir = path.join(root, 'qa', `phase2-responsive-${runId}`);
await fs.mkdir(outDir, { recursive: true });

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
};

function servePath(reqUrl) {
  const url = new URL(reqUrl, 'http://127.0.0.1');
  const pathname = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const target = path.resolve(publicDir, `.${pathname.replace(/\\/g, '/')}`);
  return target.startsWith(publicDir) ? target : null;
}

async function startServer() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const target = servePath(req.url || '/');
    requests.push(req.url || '/');
    if (!target) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fssync.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, requests, port: server.address().port };
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => fssync.existsSync(candidate));
  if (!found) throw new Error(`Microsoft Edge not found. Tried: ${candidates.join(', ')}`);
  return found;
}

async function waitForJson(url, timeoutMs = 12000) {
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
    const events = [];
    let id = 1;
    ws.onopen = () => {
      const send = (method, params = {}) => new Promise((res, rej) => {
        const messageId = id++;
        pending.set(messageId, { res, rej, method });
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });
      resolve({ send, close: () => ws.close(), events });
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const waiting = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) waiting.rej(new Error(`${waiting.method}: ${message.error.message}`));
        else waiting.res(message.result || {});
      } else if (message.method) {
        events.push(message);
      }
    };
    ws.onerror = reject;
  });
}

async function waitReady(client) {
  for (let i = 0; i < 120; i += 1) {
    const state = await client.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    }).catch(() => null);
    if (state?.result?.value === 'complete') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for document.readyState=complete');
}

const pageExpression = `(() => {
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
  };
  const text = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const viewportWidth = window.innerWidth;
  const elements = Array.from(document.querySelectorAll('body *')).filter(visible);
  const offenders = elements
    .map((el) => ({ tag: el.tagName.toLowerCase(), className: el.className || '', text: text(el), rect: rect(el) }))
    .filter((item) => item.rect.left < -1 || item.rect.right > viewportWidth + 1)
    .slice(0, 30);
  const links = Array.from(document.querySelectorAll('a')).map((el) => ({ text: text(el), href: el.href, className: el.className || '', rect: rect(el) }));
  const images = Array.from(document.images).map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '', complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }));
  const bodyText = document.body.innerText || '';
  return {
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    scroll: {
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      maxWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
    },
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1,
    offenders,
    navLinks: links.filter((item) => item.className.includes('phone') || item.rect.top < 240),
    ctaLinks: links.filter((item) => /call|text|email|roof work/i.test(item.text)),
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 18).map((el) => ({ tag: el.tagName.toLowerCase(), text: text(el), rect: rect(el) })),
    unloadedImages: images.filter((img) => !img.complete),
    brokenLoadedImages: images.filter((img) => img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)),
    emptyAltImages: images.filter((img) => !img.alt && !img.src.includes('favicon')),
    forbiddenClaimHits: ['guaranteed insurance approval','best roofer','BBB','GAF certified','FORTIFIED certified','family owned since'].filter((claim) => bodyText.toLowerCase().includes(claim.toLowerCase()))
  };
})()`;

async function capture(client, base, page) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: page.viewport.width,
    height: page.viewport.height,
    deviceScaleFactor: 1,
    mobile: page.viewport.mobile,
  });
  await client.send('Page.navigate', { url: `${base}${page.path}` });
  await waitReady(client);
  await new Promise((resolve) => setTimeout(resolve, 900));
  await client.send('Runtime.evaluate', {
    expression: `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const step = Math.max(360, Math.floor(window.innerHeight * 0.85));
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await sleep(90);
      }
      window.scrollTo(0, 0);
      await sleep(500);
    })()`,
    awaitPromise: true,
  });
  const evalResult = await client.send('Runtime.evaluate', {
    expression: pageExpression,
    returnByValue: true,
  });
  const shot = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
  });
  const screenshot = path.join(outDir, `${page.label}.png`);
  await fs.writeFile(screenshot, Buffer.from(shot.data, 'base64'));
  return { ...page, screenshot, report: evalResult.result.value };
}

const { server, requests, port: serverPort } = await startServer();
const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-phase2-responsive-'));
const edge = spawn(edgePath(), [
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' });

let finalReport;
try {
  const browserInfo = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
  if (!target) throw new Error('No debuggable page target found');
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const base = `http://127.0.0.1:${serverPort}`;
  const pages = [
    { label: 'home-desktop', path: '/', viewport: { width: 1905, height: 1176, mobile: false } },
    { label: 'photos-desktop', path: '/photos.html', viewport: { width: 1905, height: 1176, mobile: false } },
    { label: 'home-mobile', path: '/', viewport: { width: 390, height: 844, mobile: true } },
    { label: 'photos-mobile', path: '/photos.html', viewport: { width: 390, height: 844, mobile: true } },
  ];
  const captures = [];
  for (const page of pages) captures.push(await capture(client, base, page));
  client.close();
  finalReport = { runId, outDir, base, browser: browserInfo.Browser, captures, requests };
  await fs.writeFile(path.join(outDir, 'responsive-report.json'), JSON.stringify(finalReport, null, 2));
  console.log(JSON.stringify({
    outDir,
    browser: browserInfo.Browser,
    captures: captures.map((item) => ({
      label: item.label,
      screenshot: item.screenshot,
      viewport: item.report.viewport,
      scroll: item.report.scroll,
      horizontalOverflow: item.report.horizontalOverflow,
      offenderCount: item.report.offenders.length,
      unloadedImages: item.report.unloadedImages.length,
      brokenLoadedImages: item.report.brokenLoadedImages.length,
      emptyAltImages: item.report.emptyAltImages.length,
      forbiddenClaimHits: item.report.forbiddenClaimHits,
    })),
  }, null, 2));
} finally {
  server.close();
  edge.kill('SIGTERM');
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
