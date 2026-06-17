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
const outDir = path.join(root, 'qa', `live-qa-${runId}`);
await fs.mkdir(outDir, { recursive: true });

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

function edgePath() {
  const c = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const f = c.find(p => fssync.existsSync(p));
  if (!f) throw new Error('Microsoft Edge not found');
  return f;
}

async function waitJson(url, ms = 12000) {
  const t = Date.now(); let last;
  while (Date.now() - t < ms) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); last = new Error(r.status); }
    catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 150));
  }
  throw last;
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map(); const events = []; let id = 1;
    ws.onopen = () => {
      const send = (method, params={}) => new Promise((res, rej) => {
        const mid = id++; pending.set(mid, {res, rej, method});
        ws.send(JSON.stringify({id: mid, method, params}));
      });
      resolve({ send, close: () => ws.close(), events });
    };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        if (m.error) p.rej(new Error(`${p.method}: ${m.error.message}`));
        else p.res(m.result || {});
      } else if (m.method) events.push(m);
    };
    ws.onerror = reject;
  });
}

async function waitReady(client, ms = 20000) {
  const t0 = Date.now(); let s = '?';
  while (Date.now() - t0 < ms) {
    try { const r = await client.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }); s = r.result?.value || s; if (s === 'complete') return; }
    catch {}
    await new Promise(r => setTimeout(r, 120));
  }
  throw new Error('readyState timeout, last=' + s);
}

const pageReportExpr = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const step = Math.max(360, Math.floor(window.innerHeight * 0.8));
  for (let y = 0; y <= max; y += step) { window.scrollTo(0, y); await sleep(120); }
  window.scrollTo(0, 0); await sleep(400);
  const imgs = Array.from(document.images).map((img, i) => {
    const r = img.getBoundingClientRect();
    return { i, src: img.currentSrc || img.src, alt: img.alt || '', loading: img.loading || '', complete: img.complete, nw: img.naturalWidth, nh: img.naturalHeight, rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} };
  });
  const links = Array.from(document.querySelectorAll('a')).map(a => ({
    text: (a.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
    href: a.href,
    cls: a.className || '',
    aria: a.getAttribute('aria-label') || '',
  }));
  const body = (document.body.innerText || '').toLowerCase();
  return {
    title: document.title,
    url: location.href,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    scroll: { w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) },
    h1: document.querySelector('h1')?.innerText,
    h2s: Array.from(document.querySelectorAll('h2')).map(h => h.innerText),
    imageCount: imgs.length,
    brokenImages: imgs.filter(i => !i.complete || i.nw === 0),
    emptyAlt: imgs.filter(i => !i.alt && !i.src.includes('favicon')),
    phoneLinks: links.filter(l => l.href.startsWith('tel:')),
    smsLinks: links.filter(l => l.href.startsWith('sms:')),
    mailLinks: links.filter(l => l.href.startsWith('mailto:')),
    ctaLinks: links.filter(l => /call|text|email|photo|roof|contact/i.test(l.text + ' ' + l.aria)),
    forbiddenClaims: ['guaranteed insurance approval','best roofer','bbb accredited','gaf certified','fortified certified','family owned since','licensed & insured since'].filter(p => body.includes(p)),
    fonts: Array.from(document.fonts || []).map(f => ({family: f.family, status: f.status})).slice(0, 30),
  };
})()`;

async function snap(client, url, label, viewport) {
  client.events.length = 0;
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width, height: viewport.height,
    deviceScaleFactor: 1, mobile: !!viewport.mobile,
  });
  await client.send('Page.navigate', { url });
  await waitReady(client);
  await new Promise(r => setTimeout(r, 700));
  const r = await client.send('Runtime.evaluate', { expression: pageReportExpr, awaitPromise: true, returnByValue: true });
  const m = await client.send('Page.getLayoutMetrics');
  const cs = m.contentSize || m.cssContentSize;
  const clip = { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 };
  const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true, clip });
  const file = path.join(outDir, `${label}-${viewport.width}x${viewport.height}.png`);
  await fs.writeFile(file, Buffer.from(shot.data, 'base64'));
  const events = client.events.filter(e => ['Runtime.consoleAPICalled','Runtime.exceptionThrown','Log.entryAdded'].includes(e.method));
  return { label, url, viewport, screenshot: file, contentSize: { w: clip.width, h: clip.height }, report: r.result.value, events: events.length };
}

const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'live-qa-'));
const edge = spawn(edgePath(), [
  `--remote-debugging-port=${debugPort}`, '--remote-allow-origins=*', '--headless=new',
  '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore','ignore','pipe'] });
edge.stderr?.on('data', d => { const t = String(d).trim(); if (t) console.error('[edge]', t.split('\n').slice(0,2).join('\n[edge] ')); });

let out;
try {
  const v = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const tg = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const t = tg.find(x => x.type === 'page' && x.webSocketDebuggerUrl) || tg.find(x => x.webSocketDebuggerUrl);
  const c = await cdpClient(t.webSocketDebuggerUrl);
  await c.send('Page.enable'); await c.send('Runtime.enable'); await c.send('Log.enable');
  const base = 'https://vera-roofing-review-public.vercel.app';
  const pages = [
    { label: 'home-desktop', url: `${base}/`, viewport: { width: 1905, height: 1176, mobile: false } },
    { label: 'photos-desktop', url: `${base}/photos.html`, viewport: { width: 1905, height: 1176, mobile: false } },
    { label: 'home-mobile', url: `${base}/`, viewport: { width: 390, height: 844, mobile: true } },
    { label: 'photos-mobile', url: `${base}/photos.html`, viewport: { width: 390, height: 844, mobile: true } },
  ];
  const caps = [];
  for (const p of pages) { console.error('[live] capturing', p.label); caps.push(await snap(c, p.url, p.label, p.viewport)); }
  out = { runId, browser: v.Browser, outDir, captures: caps };
  await fs.writeFile(path.join(outDir, 'live-qa-report.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ outDir, captures: caps.map(x => ({label:x.label, screenshot:x.screenshot, contentSize:x.contentSize, events:x.events, broken:x.report.brokenImages.length, emptyAlt:x.report.emptyAlt.length, forbiddenClaims:x.report.forbiddenClaims, phoneLinks:x.report.phoneLinks.length, smsLinks:x.report.smsLinks.length, ctas:x.report.ctaLinks.length})) }, null, 2));
} finally {
  try { edge.kill('SIGTERM'); } catch {}
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
