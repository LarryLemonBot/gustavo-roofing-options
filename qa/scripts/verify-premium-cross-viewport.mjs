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
const browserName = process.env.VERA_BROWSER_NAME || 'edge';
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const outDir = path.join(root, 'qa', `premium-cross-viewport-${browserName}-${runId}`);
await fs.mkdir(outDir, { recursive: true });

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
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
    if (!target) { res.writeHead(403); res.end('Forbidden'); return; }
    try {
      const stat = await fs.stat(target);
      const file = stat.isDirectory() ? path.join(target, 'index.html') : target;
      res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fssync.createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end('Not Found'); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}
async function freePort() { const server = net.createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); const port = server.address().port; await new Promise(r => server.close(r)); return port; }
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
  const start = Date.now(); let lastError;
  while (Date.now() - start < timeoutMs) {
    try { const response = await fetch(url); if (response.ok) return await response.json(); lastError = new Error(`${response.status} ${response.statusText}`); }
    catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}
function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl); const pending = new Map(); let id = 1;
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((res, rej) => { const mid = id++; pending.set(mid, { res, rej, method }); ws.send(JSON.stringify({ id: mid, method, params })); }),
      close: () => ws.close(),
    });
    ws.onmessage = (event) => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { const w = pending.get(m.id); pending.delete(m.id); m.error ? w.rej(new Error(`${w.method}: ${m.error.message}`)) : w.res(m.result || {}); } };
    ws.onerror = reject;
  });
}
async function waitReady(client) {
  for (let i = 0; i < 140; i += 1) {
    const state = await client.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }).catch(() => null);
    if (state?.result?.value === 'complete') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for complete');
}
const expression = `(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) }; };
  const text = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 140);
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const vw = window.innerWidth;
  const visibleEls = Array.from(document.querySelectorAll('body *')).filter(visible);
  const offenders = visibleEls.map(el => ({tag:el.tagName.toLowerCase(), cls:String(el.className||''), text:text(el), rect:rect(el)})).filter(item => item.rect.left < -1 || item.rect.right > vw + 1).slice(0, 20);
  const images = Array.from(document.images).map(img => ({src: img.currentSrc || img.src, alt: img.alt || '', complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, rect: rect(img)}));
  const symmetryGroups = Array.from(document.querySelectorAll('.navlinks, .hero-actions, .contact-actions, .contact-hero-actions, .compact-actions, .home-area-actions, .footer-links, .footer-contact, .footer-trust-logos, .hero-issue-links, .hero-proof-pills, .gallery-nav, .area-list')).filter(visible);
  const symmetryIssues = [];
  for (const group of symmetryGroups) {
    const gr = rect(group);
    const groupName = String(group.className || group.tagName || '').replace(/\\s+/g, '.').slice(0, 90);
    const children = Array.from(group.children).filter(visible).map((child) => ({ text: text(child), rect: rect(child) }));
    if (children.length < 2) continue;
    const rows = [];
    for (const child of children) {
      const center = (child.rect.top + child.rect.bottom) / 2;
      const row = rows.find((candidate) => Math.abs(center - candidate.center) <= Math.max(14, Math.min(28, Math.min(candidate.height, child.rect.height) * 0.55)));
      if (row) {
        row.items.push(child);
        row.center = row.items.reduce((sum, item) => sum + ((item.rect.top + item.rect.bottom) / 2), 0) / row.items.length;
        row.height = Math.max(row.height, child.rect.height);
      } else {
        rows.push({ center, height: child.rect.height, items: [child] });
      }
    }
    for (const row of rows) {
      const rowItems = row.items;
      if (rowItems.length < 2) continue;
      rowItems.sort((a, b) => a.rect.left - b.rect.left);
      const rowTop = Math.round(Math.min(...rowItems.map((item) => item.rect.top)));
      const rowLeft = rowItems[0].rect.left;
      const rowRight = rowItems[rowItems.length - 1].rect.right;
      const leftPad = Math.round(rowLeft - gr.left);
      const rightPad = Math.round(gr.right - rowRight);
      const edgeDelta = Math.abs(leftPad - rightPad);
      const widths = rowItems.map((item) => item.rect.width);
      const widthDelta = Math.max(...widths) - Math.min(...widths);
      const strictWidthGroup = group.matches('.navlinks, .hero-actions, .contact-actions, .contact-hero-actions, .compact-actions, .footer-links, .footer-contact');
      if (innerWidth <= 760 && strictWidthGroup && widthDelta > 18) {
        symmetryIssues.push({ group: groupName, rowTop, type: 'uneven-row-widths', widthDelta, items: rowItems.map((item) => item.text) });
      }
      if (innerWidth <= 1020 && edgeDelta > 30 && gr.width <= innerWidth - 24) {
        symmetryIssues.push({ group: groupName, rowTop, type: 'off-center-row', edgeDelta, leftPad, rightPad, items: rowItems.map((item) => item.text) });
      }
    }
  }
  const bodyText = document.body.innerText || '';
  const bodyTextLower = bodyText.toLowerCase();
  const h1 = document.querySelector('h1');
  return {
    title: document.title,
    h1: h1?.innerText || '',
    h1Rect: h1 ? rect(h1) : null,
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    scroll: { documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, maxWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) },
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 1,
    offenderCount: offenders.length,
    offenders,
    brokenLoadedImages: images.filter(img => img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)),
    unloadedImages: images.filter(img => !img.complete).length,
    emptyAltImages: images.filter(img => !img.alt && !img.src.includes('favicon')).length,
    footerCount: document.querySelectorAll('footer.site-footer').length,
    headerCount: document.querySelectorAll('header.site-header').length,
    requestCtaCount: Array.from(document.querySelectorAll('a')).filter(a => /Request an Inspection|Request Gutter Help|Call to Request|Text to Request/i.test(a.textContent || '')).length,
    hasTrustCopy: bodyTextLower.includes('family-owned and operated') && bodyTextLower.includes('owner-led final review'),
    forbiddenClaimHits: ['guaranteed insurance approval','best roofer','BBB','GAF certified','FORTIFIED certified','license number','insurance carrier','policy number'].filter(claim => bodyTextLower.includes(claim.toLowerCase())),
    symmetryIssues,
    navRect: document.querySelector('.topbar') ? rect(document.querySelector('.topbar')) : null,
    footerRect: document.querySelector('.site-footer') ? rect(document.querySelector('.site-footer')) : null,
  };
})()`;
const allPages = [['home','/'], ['services','/services'], ['gutter-cleaning-guards','/gutter-cleaning-guards'], ['photos','/photos'], ['areas','/areas'], ['process','/process'], ['contact','/contact']];
const allViewports = [
  { label:'desktop-1440', width:1440, height:920, mobile:false, ua:'desktop' },
  { label:'laptop-1366', width:1366, height:768, mobile:false, ua:'desktop' },
  { label:'tablet-landscape-1024', width:1024, height:768, mobile:false, ua:'desktop' },
  { label:'tablet-768', width:768, height:1024, mobile:true, ua:'safari-mobile' },
  { label:'mobile-390', width:390, height:844, mobile:true, ua:'safari-mobile' },
  { label:'mobile-360', width:360, height:800, mobile:true, ua:'safari-mobile' },
];
const pageFilter = (process.env.VERA_PAGE_FILTER || '').split(',').map((item) => item.trim()).filter(Boolean);
const viewportFilter = (process.env.VERA_VIEWPORT_FILTER || '').split(',').map((item) => item.trim()).filter(Boolean);
const pages = pageFilter.length ? allPages.filter(([label]) => pageFilter.includes(label)) : allPages;
const viewports = viewportFilter.length ? allViewports.filter(({ label }) => viewportFilter.includes(label)) : allViewports;
const ua = { desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36', 'safari-mobile': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
async function capture(client, base, page, vp) {
  await client.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  await client.send('Emulation.setUserAgentOverride', { userAgent: ua[vp.ua] });
  await client.send('Page.navigate', { url: `${base}${page[1]}` });
  await waitReady(client);
  await new Promise(r => setTimeout(r, 500));
  await client.send('Runtime.evaluate', { expression: `(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const max=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight); const step=Math.max(420,Math.floor(innerHeight*.9)); for(let y=0;y<=max;y+=step){scrollTo(0,y); await sleep(45);} scrollTo(0,0); await sleep(260);})()`, awaitPromise: true });
  const report = (await client.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const screenshot = path.join(outDir, `${vp.label}-${page[0]}.png`);
  await fs.writeFile(screenshot, Buffer.from(shot.data, 'base64'));
  return { page: page[0], path: page[1], viewport: vp.label, screenshot, report };
}

const { server, port } = await startServer();
const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-premium-xv-'));
const child = spawn(browserPath(), [`--remote-debugging-port=${debugPort}`, '--remote-allow-origins=*', '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-background-networking', `--user-data-dir=${profile}`, 'about:blank'], { stdio:['ignore','ignore','pipe'] });
let stderr = '';
child.stderr?.on('data', d => { stderr += String(d); });
try {
  const version = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl) || targets.find(t => t.webSocketDebuggerUrl);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send('Page.enable'); await client.send('Runtime.enable');
  const base = `http://127.0.0.1:${port}`;
  const captures = [];
  for (const vp of viewports) for (const page of pages) { console.error(`[capture] ${browserName} ${vp.label} ${page[0]}`); captures.push(await capture(client, base, page, vp)); }
  client.close();
  const issues = captures.flatMap(c => {
    const r = c.report; const arr = [];
    if (r.horizontalOverflow) arr.push('horizontalOverflow');
    if (r.offenderCount) arr.push(`offenders:${r.offenderCount}`);
    if (r.brokenLoadedImages.length) arr.push(`brokenImages:${r.brokenLoadedImages.length}`);
    if (r.emptyAltImages) arr.push(`emptyAltImages:${r.emptyAltImages}`);
    if (r.footerCount !== 1) arr.push(`footerCount:${r.footerCount}`);
    if (r.headerCount !== 1) arr.push(`headerCount:${r.headerCount}`);
    if (r.requestCtaCount < 1) arr.push('missingRequestCTA');
    if (!r.hasTrustCopy) arr.push('missingTrustCopy');
    if (r.forbiddenClaimHits.length) arr.push(`forbiddenClaims:${r.forbiddenClaimHits.join('|')}`);
    if (r.symmetryIssues.length) arr.push(`symmetryIssues:${r.symmetryIssues.length}`);
    return arr.length ? [{ page:c.page, viewport:c.viewport, issues:arr, screenshot:c.screenshot, symmetryIssues:r.symmetryIssues.slice(0, 12) }] : [];
  });
  const summary = { outDir, browserName, browser: version.Browser, base, totalCaptures: captures.length, issueCount: issues.length, issues, captures: captures.map(c => ({ page:c.page, viewport:c.viewport, screenshot:c.screenshot, h1:c.report.h1, h1Rect:c.report.h1Rect, horizontalOverflow:c.report.horizontalOverflow, offenderCount:c.report.offenderCount, brokenLoadedImages:c.report.brokenLoadedImages.length, unloadedImages:c.report.unloadedImages, emptyAltImages:c.report.emptyAltImages, requestCtaCount:c.report.requestCtaCount, hasTrustCopy:c.report.hasTrustCopy, forbiddenClaimHits:c.report.forbiddenClaimHits, symmetryIssues:c.report.symmetryIssues.length, symmetryIssueDetails:c.report.symmetryIssues.slice(0, 12) })) };
  await fs.writeFile(path.join(outDir, 'premium-cross-viewport-report.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  try { child.kill('SIGTERM'); } catch {}
  server.close();
  await fs.rm(profile, { recursive:true, force:true }).catch(()=>{});
}
