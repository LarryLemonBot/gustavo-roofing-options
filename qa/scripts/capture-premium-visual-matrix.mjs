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
const outDir = path.join(root, 'qa', `premium-visual-matrix-${runId}`);
await fs.mkdir(outDir, { recursive: true });

const base = process.env.VERA_BASE_URL || 'http://127.0.0.1:8136';
const allPages = [
  ['home', '/'],
  ['services', '/services.html'],
  ['gutter-cleaning-guards', '/gutter-cleaning-guards.html'],
  ['photos', '/photos.html'],
  ['areas', '/areas.html'],
  ['process', '/process.html'],
  ['contact', '/contact.html'],
];
const allViewports = [
  { label: 'desktop-1440', width: 1440, height: 920, mobile: false, dpr: 1 },
  { label: 'laptop-1366', width: 1366, height: 768, mobile: false, dpr: 1 },
  { label: 'tablet-768', width: 768, height: 1024, mobile: true, dpr: 2 },
  { label: 'mobile-390', width: 390, height: 844, mobile: true, dpr: 2 },
  { label: 'mobile-360', width: 360, height: 800, mobile: true, dpr: 2 },
];
const pageFilter = (process.env.VERA_PAGE_FILTER || '').split(',').map(s => s.trim()).filter(Boolean);
const viewportFilter = (process.env.VERA_VIEWPORT_FILTER || '').split(',').map(s => s.trim()).filter(Boolean);
const pages = pageFilter.length ? allPages.filter(([label]) => pageFilter.includes(label)) : allPages;
const viewports = viewportFilter.length ? allViewports.filter(({label}) => viewportFilter.includes(label)) : allViewports;

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
    const ws = new WebSocket(wsUrl);
    const pending = new Map(); let id = 1;
    ws.onopen = () => {
      const send = (method, params = {}) => new Promise((res, rej) => {
        const messageId = id++;
        pending.set(messageId, { res, rej, method });
        ws.send(JSON.stringify({ id: messageId, method, params }));
      });
      resolve({ send, close: () => ws.close() });
    };
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const waiting = pending.get(message.id); pending.delete(message.id);
        if (message.error) waiting.rej(new Error(`${waiting.method}: ${message.error.message}`));
        else waiting.res(message.result || {});
      }
    };
    ws.onerror = reject;
  });
}
async function waitReady(client) {
  for (let i = 0; i < 180; i += 1) {
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
  const text = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 160);
  const vw = innerWidth;
  const visibleEls = Array.from(document.querySelectorAll('body *')).filter(visible);
  const offenders = visibleEls.map(el => ({tag:el.tagName.toLowerCase(), cls:String(el.className||''), text:text(el), rect:rect(el)})).filter(x => x.rect.left < -1 || x.rect.right > vw + 1).slice(0, 30);
  const images = Array.from(document.images).map((img) => ({src:img.currentSrc || img.src, alt:img.alt || '', complete:img.complete, nw:img.naturalWidth, nh:img.naturalHeight, rect:rect(img)}));
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
  return {
    href: location.href,
    title: document.title,
    h1: document.querySelector('h1')?.innerText || '',
    viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
    scroll: {documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, maxWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)},
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
    offenderCount: offenders.length,
    offenders,
    brokenLoadedImages: images.filter(i => i.complete && (i.nw === 0 || i.nh === 0)),
    notCompleteImages: images.filter(i => !i.complete).length,
    footerCount: document.querySelectorAll('footer.site-footer').length,
    headerCount: document.querySelectorAll('header.site-header').length,
    requestCtaCount: Array.from(document.querySelectorAll('a')).filter(a => /Request an Inspection|Call to Request|Text to Request/i.test(a.textContent || '')).length,
    hasTrustCopy: bodyTextLower.includes('family-owned and operated') && bodyTextLower.includes('owner-led final review'),
    badClaimHits: ['FORTIFIED certified','license number','insurance carrier','policy number','BBB','GAF','guaranteed insurance','guaranteed claim'].filter(s => bodyText.includes(s)),
    symmetryIssues,
    navRect: document.querySelector('.topbar') ? rect(document.querySelector('.topbar')) : null,
    heroRect: document.querySelector('h1') ? rect(document.querySelector('h1')) : null,
  };
})()`;

async function capture(client, pageLabel, pagePath, vp) {
  await client.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr, mobile: !!vp.mobile });
  await client.send('Emulation.setUserAgentOverride', { userAgent: vp.mobile ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36' });
  const url = `${base}${pagePath}`;
  await client.send('Page.navigate', { url });
  await waitReady(client);
  await new Promise((resolve) => setTimeout(resolve, 950));
  await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)', returnByValue: true });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const evalResult = await client.send('Runtime.evaluate', { expression: reportExpression, returnByValue: true });
  const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const file = path.join(outDir, `${vp.label}-${pageLabel}.png`);
  await fs.writeFile(file, Buffer.from(shot.data, 'base64'));
  return { page: pageLabel, path: pagePath, viewport: vp.label, screenshot: file, report: evalResult.result.value };
}

const debugPort = await freePort();
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-premium-matrix-'));
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
edge.stderr?.on('data', (d) => { const t = String(d).trim(); if (t && /error|failed|crash/i.test(t)) console.error('[edge]', t.split('\n').slice(0, 2).join('\n[edge] ')); });

try {
  const browserInfo = await waitJson(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await waitJson(`http://127.0.0.1:${debugPort}/json/list`);
  const target = targets.find((item) => item.type === 'page' && item.webSocketDebuggerUrl) || targets.find((item) => item.webSocketDebuggerUrl);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  const captures = [];
  for (const vp of viewports) {
    for (const [label, p] of pages) {
      console.error('[capture]', vp.label, label);
      captures.push(await capture(client, label, p, vp));
    }
  }
  client.close();
  const issues = captures.flatMap((c) => {
    const r = c.report; const list = [];
    if (r.horizontalOverflow) list.push('horizontalOverflow');
    if (r.offenderCount) list.push(`offenders:${r.offenderCount}`);
    if (r.brokenLoadedImages.length) list.push(`brokenImages:${r.brokenLoadedImages.length}`);
    if (r.footerCount !== 1) list.push(`footerCount:${r.footerCount}`);
    if (r.headerCount !== 1) list.push(`headerCount:${r.headerCount}`);
    if (r.requestCtaCount < 1) list.push('missingRequestCTA');
    if (!r.hasTrustCopy) list.push('missingTrustCopy');
    if (r.badClaimHits.length) list.push(`badClaims:${r.badClaimHits.join('|')}`);
    if (r.symmetryIssues.length) list.push(`symmetryIssues:${r.symmetryIssues.length}`);
    return list.length ? [{ page: c.page, viewport: c.viewport, issues: list, screenshot: c.screenshot, symmetryIssues: r.symmetryIssues.slice(0, 12) }] : [];
  });
  const summary = { outDir, base, browser: browserInfo.Browser, totalCaptures: captures.length, issueCount: issues.length, issues, captures: captures.map(c => ({page:c.page, viewport:c.viewport, screenshot:c.screenshot, h1:c.report.h1, horizontalOverflow:c.report.horizontalOverflow, offenderCount:c.report.offenderCount, brokenLoadedImages:c.report.brokenLoadedImages.length, notCompleteImages:c.report.notCompleteImages, requestCtaCount:c.report.requestCtaCount, hasTrustCopy:c.report.hasTrustCopy, badClaimHits:c.report.badClaimHits, symmetryIssues:c.report.symmetryIssues.length, symmetryIssueDetails:c.report.symmetryIssues.slice(0, 12)})) };
  await fs.writeFile(path.join(outDir, 'premium-visual-matrix-report.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  try { edge.kill('SIGTERM'); } catch {}
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
