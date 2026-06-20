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
const outDir = path.join(root, 'qa', `readable-contrast-${runId}`);
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

async function waitJson(url, timeoutMs = 12000) {
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
        const mid = id++;
        pending.set(mid, { res, rej, method });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const waiting = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiting.rej(new Error(`${waiting.method}: ${message.error.message}`));
      else waiting.res(message.result || {});
    };
    ws.onerror = reject;
  });
}

async function waitReady(client) {
  for (let i = 0; i < 150; i += 1) {
    const state = await client.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }).catch(() => null);
    if (state?.result?.value === 'complete') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for complete');
}

const contrastExpression = `(() => {
  const colorRegex = /rgba?\\([^)]*\\)|#[0-9a-f]{3,8}/ig;
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  };
  const text = (el) => Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ')
    .trim()
    .replace(/\\s+/g, ' ');
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const parseColor = (value) => {
    if (!value || value === 'transparent') return null;
    const hex = value.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    const rgb = value.match(/rgba?\\(([^)]*)\\)/i);
    if (!rgb) return null;
    const parts = rgb[1].split(/,|\\s+/).map((part) => part.trim()).filter((part) => part && part !== '/');
    const nums = parts.map((part) => part.endsWith('%') ? Number(part.slice(0, -1)) * 2.55 : Number(part));
    if (nums.length < 3 || nums.some((n) => Number.isNaN(n))) return null;
    return { r: clamp(nums[0]), g: clamp(nums[1]), b: clamp(nums[2]), a: nums.length > 3 ? Math.max(0, Math.min(1, nums[3])) : 1 };
  };
  const blend = (top, bottom) => {
    const a = top.a + bottom.a * (1 - top.a);
    if (a <= 0) return { r: 255, g: 255, b: 255, a: 1 };
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
      a,
    };
  };
  const avgColors = (colors) => {
    if (!colors.length) return null;
    const weight = colors.reduce((sum, c) => sum + Math.max(c.a, 0.001), 0);
    return {
      r: colors.reduce((sum, c) => sum + c.r * Math.max(c.a, 0.001), 0) / weight,
      g: colors.reduce((sum, c) => sum + c.g * Math.max(c.a, 0.001), 0) / weight,
      b: colors.reduce((sum, c) => sum + c.b * Math.max(c.a, 0.001), 0) / weight,
      a: Math.max(...colors.map((c) => c.a)),
    };
  };
  const luminance = ({ r, g, b }) => {
    const channel = (value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const contrast = (a, b) => {
    const l1 = luminance(a);
    const l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const backgroundFor = (el) => {
    let bg = { r: 243, g: 245, b: 247, a: 1 };
    const chain = [];
    for (let n = document.documentElement; n; n = n === el ? null : n.parentElement) {
      chain.push(n);
      if (n === el) break;
    }
    if (!chain.includes(el)) {
      const ancestors = [];
      for (let n = el; n; n = n.parentElement) ancestors.push(n);
      chain.splice(0, chain.length, ...ancestors.reverse());
    }
    for (const node of chain) {
      const style = getComputedStyle(node);
      const image = style.backgroundImage || '';
      if (image && image !== 'none') {
        const colors = Array.from(image.matchAll(colorRegex)).map((match) => parseColor(match[0])).filter(Boolean);
        const average = avgColors(colors);
        if (average) bg = blend(average, bg);
      }
      const color = parseColor(style.backgroundColor);
      if (color && color.a > 0.02) bg = blend(color, bg);
    }
    return bg;
  };
  const isBigText = (style) => {
    const size = Number.parseFloat(style.fontSize) || 16;
    const weight = Number.parseInt(style.fontWeight, 10) || 400;
    return size >= 24 || (size >= 18.66 && weight >= 700);
  };
  const selector = (el) => {
    if (el.id) return '#' + el.id;
    const cls = String(el.className || '').trim().split(/\\s+/).filter(Boolean).slice(0, 3).join('.');
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const elements = Array.from(document.querySelectorAll('body *'))
    .filter(visible)
    .map((el) => ({ el, label: text(el) }))
    .filter((item) => item.label.length >= 2);
  return elements.map(({ el, label }) => {
    const style = getComputedStyle(el);
    const bg = backgroundFor(el);
    const fgRaw = parseColor(style.color) || { r: 0, g: 0, b: 0, a: 1 };
    const fg = fgRaw.a < 1 ? blend(fgRaw, bg) : fgRaw;
    const ratio = contrast(fg, bg);
    const threshold = isBigText(style) ? 3 : 4.5;
    return {
      selector: selector(el),
      text: label.slice(0, 120),
      ratio: Number(ratio.toFixed(2)),
      threshold,
      color: style.color,
      background: { r: Math.round(bg.r), g: Math.round(bg.g), b: Math.round(bg.b) },
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      rect: rect(el),
    };
  }).filter((item) => item.ratio + 0.01 < item.threshold).slice(0, 60);
})()`;

const pages = [['home', '/'], ['services', '/services'], ['gutter-cleaning-guards', '/gutter-cleaning-guards'], ['photos', '/photos'], ['areas', '/areas'], ['process', '/process'], ['contact', '/contact']];
const viewports = [
  { label: 'desktop-1366', width: 1366, height: 900, mobile: false },
  { label: 'tablet-768', width: 768, height: 1024, mobile: true },
  { label: 'mobile-390', width: 390, height: 844, mobile: true },
];
const ua = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const { server, port } = await startServer();
const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-contrast-'));
const child = spawn(browserPath(), [
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-background-networking',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

try {
  const version = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  const base = `http://127.0.0.1:${port}`;
  const results = [];
  for (const viewport of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
    });
    await client.send('Emulation.setUserAgentOverride', { userAgent: viewport.mobile ? ua.mobile : ua.desktop });
    for (const [page, route] of pages) {
      console.error(`[contrast] ${viewport.label} ${page}`);
      await client.send('Page.navigate', { url: `${base}${route}` });
      await waitReady(client);
      await new Promise((resolve) => setTimeout(resolve, 400));
      const failures = (await client.send('Runtime.evaluate', { expression: contrastExpression, returnByValue: true })).result.value || [];
      results.push({ page, viewport: viewport.label, failures });
    }
  }
  client.close();
  const issues = results.filter((item) => item.failures.length);
  const report = { outDir, browser: version.Browser, base, totalChecks: results.length, issueCount: issues.length, issues, results };
  await fs.writeFile(path.join(outDir, 'readable-contrast-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outDir, browser: version.Browser, totalChecks: results.length, issueCount: issues.length, issues }, null, 2));
  if (issues.length) process.exit(1);
} finally {
  try { child.kill('SIGTERM'); } catch {}
  server.close();
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
