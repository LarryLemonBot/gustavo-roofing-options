import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const outDir = path.join(root, 'qa', `live-custom-domain-final-${runId}`);
await fs.mkdir(outDir, { recursive: true });

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
  for (let i = 0; i < 150; i += 1) {
    const state = await client.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }).catch(() => null);
    if (state?.result?.value === 'complete') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for document.readyState=complete');
}

const reportExpression = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  };
  const rect = (el) => { const r = el.getBoundingClientRect(); return {left:Math.round(r.left), right:Math.round(r.right), top:Math.round(r.top), bottom:Math.round(r.bottom), width:Math.round(r.width), height:Math.round(r.height)}; };
  const text = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140);
  const vw = innerWidth;
  const bodyText = document.body.innerText || '';
  const visibleEls = Array.from(document.querySelectorAll('body *')).filter(visible);
  const offenders = visibleEls.map(el => ({tag:el.tagName.toLowerCase(), cls:String(el.className||''), text:text(el), rect:rect(el)})).filter(x => x.rect.left < -1 || x.rect.right > vw + 1).slice(0, 20);
  const images = Array.from(document.images).map((img) => ({src:img.currentSrc || img.src, alt:img.alt || '', complete:img.complete, nw:img.naturalWidth, nh:img.naturalHeight, rect:rect(img)}));
  return {
    href: location.href,
    title: document.title,
    h1: document.querySelector('h1')?.innerText || '',
    viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
    scroll: {documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, maxWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)},
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
    offenderCount: offenders.length,
    offenders,
    trustCopy: bodyText.includes('Family-owned and operated') && bodyText.includes('Owner-led final review'),
    badFortifiedCertified: bodyText.includes('FORTIFIED certified'),
    brokenLoadedImages: images.filter(i => i.complete && (i.nw === 0 || i.nh === 0)),
    visibleHeadings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).slice(0, 12).map(h => ({tag:h.tagName.toLowerCase(), text:text(h), rect:rect(h)})),
    ctas: Array.from(document.querySelectorAll('a')).filter(visible).filter(a => /call|text|photo|work|service|contact/i.test(a.textContent || '')).slice(0, 20).map(a => ({text:text(a), href:a.href, rect:rect(a)})),
  };
})()`;

async function capture(client, page) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: page.viewport.width,
    height: page.viewport.height,
    deviceScaleFactor: page.viewport.dpr || 1,
    mobile: !!page.viewport.mobile,
  });
  if (page.viewport.mobile) {
    await client.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  } else {
    await client.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
    });
  }
  await client.send('Page.navigate', { url: page.url });
  await waitReady(client);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)', returnByValue: true });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const evalResult = await client.send('Runtime.evaluate', { expression: reportExpression, returnByValue: true });
  const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshot = path.join(outDir, `${page.label}.png`);
  await fs.writeFile(screenshot, Buffer.from(shot.data, 'base64'));
  return { ...page, screenshot, report: evalResult.result.value };
}

const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-live-custom-qa-'));
const edge = spawn(edgePath(), [
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
edge.stderr?.on('data', (d) => {
  const t = String(d).trim();
  if (t) console.error('[edge]', t.split('\n').slice(0, 2).join('\n[edge] '));
});

let finalReport;
try {
  const browserInfo = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  const routes = [
    ['home', 'https://verasroofing.com/'],
    ['services', 'https://verasroofing.com/services'],
    ['photos', 'https://verasroofing.com/photos'],
    ['areas', 'https://verasroofing.com/areas'],
    ['process', 'https://verasroofing.com/process'],
    ['contact', 'https://verasroofing.com/contact'],
  ];
  const pages = routes.flatMap(([name, url]) => [
    { label: `${name}-desktop`, url, viewport: { width: 1366, height: 900, mobile: false, dpr: 1 } },
    { label: `${name}-mobile`, url, viewport: { width: 390, height: 844, mobile: true, dpr: 2 } },
  ]);
  const captures = [];
  for (const page of pages) {
    console.error('[capture]', page.label, page.url);
    captures.push(await capture(client, page));
  }
  client.close();
  finalReport = { runId, outDir, browser: browserInfo.Browser, captures };
  await fs.writeFile(path.join(outDir, 'live-custom-domain-final-report.json'), JSON.stringify(finalReport, null, 2));
  console.log(JSON.stringify({
    outDir,
    browser: browserInfo.Browser,
    captures: captures.map((item) => ({
      label: item.label,
      screenshot: item.screenshot,
      viewport: item.report.viewport,
      scroll: item.report.scroll,
      horizontalOverflow: item.report.horizontalOverflow,
      offenderCount: item.report.offenderCount,
      trustCopy: item.report.trustCopy,
      badFortifiedCertified: item.report.badFortifiedCertified,
      brokenLoadedImages: item.report.brokenLoadedImages.length,
      h1: item.report.h1,
    })),
  }, null, 2));
} finally {
  try { edge.kill('SIGTERM'); } catch {}
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
