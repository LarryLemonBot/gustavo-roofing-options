import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const outDir = path.join(root, 'qa', `live-custom-domain-final-${runId}`);
await fs.mkdir(outDir, { recursive: true });
const inspectionMode = 'edge-cdp-fallback';
const nativeBrowserInspected = false;
const fallbackReason = process.env.NATIVE_BROWSER_FALLBACK_REASON || 'Native Codex in-app browser control was not used for this automated capture.';
const headless = true;

function runGit(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return {
    command: `git ${args.join(' ')}`,
    code: result.status,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

const sourceCommit = runGit(['rev-parse', 'HEAD']).stdout || null;
const gitStatus = runGit(['status', '--short', '--branch']);

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

async function fetchRouteStatus(url) {
  const target = new URL(url);
  target.hash = '';
  try {
    const response = await fetch(target, { redirect: 'manual' });
    return {
      url: target.href,
      ok: response.ok,
      status: response.status,
      location: response.headers.get('location') || '',
    };
  } catch (error) {
    return { url: target.href, ok: false, status: null, location: '', error: error.message };
  }
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
  const text = (el) => (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 140);
  const vw = innerWidth;
  const bodyText = document.body.innerText || '';
  const bodyTextLower = bodyText.toLowerCase();
  const visibleEls = Array.from(document.querySelectorAll('body *')).filter(visible);
  const offenders = visibleEls.map(el => ({tag:el.tagName.toLowerCase(), cls:String(el.className||''), text:text(el), rect:rect(el)})).filter(x => x.rect.left < -1 || x.rect.right > vw + 1).slice(0, 20);
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
  return {
    href: location.href,
    hash: location.hash || '',
    title: document.title,
    h1: document.querySelector('h1')?.innerText || '',
    missingPrimaryHeading: !document.querySelector('h1'),
    notFoundTitle: /404/i.test(document.title),
    viewport: {width: innerWidth, height: innerHeight, dpr: devicePixelRatio},
    scroll: {documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, maxWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)},
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > innerWidth + 1,
    offenderCount: offenders.length,
    offenders,
    trustCopy: bodyTextLower.includes('family-owned and operated') && (bodyTextLower.includes('owner-led final review') || bodyTextLower.includes("vera's roofing owner review")),
    badFortifiedCertified: bodyText.includes('FORTIFIED certified'),
    requestCtaCount: Array.from(document.querySelectorAll('a')).filter(a => /Request an Inspection|Request Gutter Help|Call to Request|Text to Request/i.test(a.textContent || '')).length,
    forbiddenClaimHits: ['guaranteed insurance approval','best roofer','BBB','GAF certified','FORTIFIED certified','license number','insurance carrier','policy number'].filter(claim => bodyTextLower.includes(claim.toLowerCase())),
    brokenLoadedImages: images.filter(i => i.complete && (i.nw === 0 || i.nh === 0)),
    symmetryIssues,
    visibleHeadings: Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).slice(0, 12).map(h => ({tag:h.tagName.toLowerCase(), text:text(h), rect:rect(h)})),
    ctas: Array.from(document.querySelectorAll('a')).filter(visible).filter(a => /call|text|photo|work|service|contact/i.test(a.textContent || '')).slice(0, 20).map(a => ({text:text(a), href:a.href, rect:rect(a)})),
  };
})()`;

async function alignCapturePosition(client, url) {
  const { hash } = new URL(url);
  if (!hash) {
    await client.send('Runtime.evaluate', { expression: 'window.scrollTo(0,0)', returnByValue: true });
    return { expectedHash: '', actualHash: '', found: null };
  }
  const anchorResult = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const expectedHash = ${JSON.stringify(hash)};
      const id = decodeURIComponent(expectedHash.slice(1));
      const target = document.getElementById(id);
      if (!target) {
        return { expectedHash, actualHash: location.hash || '', found: false };
      }
      target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
      const rect = target.getBoundingClientRect();
      return {
        expectedHash,
        actualHash: location.hash || '',
        found: true,
        id,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        text: (target.innerText || target.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 180),
      };
    })()`,
    returnByValue: true,
  });
  return anchorResult.result?.value || { expectedHash: hash, actualHash: '', found: false };
}

async function capture(client, page) {
  const routeStatus = await fetchRouteStatus(page.url);
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
  const anchorState = await alignCapturePosition(client, page.url);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const evalResult = await client.send('Runtime.evaluate', { expression: reportExpression, returnByValue: true });
  const screenshots = [];
  const primaryYResult = await client.send('Runtime.evaluate', {
    expression: 'Math.round(window.scrollY || 0)',
    returnByValue: true,
  });
  const primaryShot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const primaryScreenshot = path.join(outDir, `${page.label}.png`);
  await fs.writeFile(primaryScreenshot, Buffer.from(primaryShot.data, 'base64'));
  screenshots.push({ position: 'primary', y: primaryYResult.result?.value || 0, path: primaryScreenshot });

  const bottomYResult = await client.send('Runtime.evaluate', {
    expression:
      '(() => { const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight); const y = Math.max(0, h - window.innerHeight); window.scrollTo(0, y); return Math.round(y); })()',
    returnByValue: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const bottomShot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const bottomScreenshot = path.join(outDir, `${page.label}-bottom.png`);
  await fs.writeFile(bottomScreenshot, Buffer.from(bottomShot.data, 'base64'));
  screenshots.push({ position: 'bottom', y: bottomYResult.result?.value || 0, path: bottomScreenshot });

  return { ...page, screenshot: primaryScreenshot, screenshots, routeStatus, anchorState, report: evalResult.result.value };
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
    ['gutter-cleaning-guards', 'https://verasroofing.com/gutter-cleaning-guards'],
    ['services-gutter', 'https://verasroofing.com/services#gutter-cleaning-guards'],
    ['services-certainteed', 'https://verasroofing.com/services#certainteed-roof-system'],
    ['services-epdm', 'https://verasroofing.com/services#epdm-flat-roofing'],
    ['photos', 'https://verasroofing.com/photos'],
    ['photos-epdm', 'https://verasroofing.com/photos#epdm-carolina-beach'],
    ['areas', 'https://verasroofing.com/areas'],
    ['process', 'https://verasroofing.com/process'],
    ['contact', 'https://verasroofing.com/contact'],
  ];
  const pages = routes.flatMap(([name, url]) => [
    { label: `${name}-desktop`, url, viewport: { width: 1366, height: 900, mobile: false, dpr: 1 } },
    { label: `${name}-tablet`, url, viewport: { width: 768, height: 1024, mobile: true, dpr: 2 } },
    { label: `${name}-mobile`, url, viewport: { width: 390, height: 844, mobile: true, dpr: 2 } },
  ]);
  const captures = [];
  for (const page of pages) {
    console.error('[capture]', page.label, page.url);
    captures.push(await capture(client, page));
  }
  client.close();
  const issues = captures.flatMap((item) => {
    const report = item.report;
    const list = [];
    if (item.routeStatus.error) list.push(`httpError:${item.routeStatus.error}`);
    else if (item.routeStatus.status !== 200) list.push(`httpStatus:${item.routeStatus.status}`);
    if (report.notFoundTitle) list.push('notFoundTitle');
    if (report.missingPrimaryHeading) list.push('missingPrimaryHeading');
    if (report.horizontalOverflow) list.push('horizontalOverflow');
    if (report.offenderCount) list.push(`offenders:${report.offenderCount}`);
    if (item.anchorState.expectedHash && item.anchorState.actualHash !== item.anchorState.expectedHash) list.push(`hashMismatch:${item.anchorState.actualHash || 'none'}`);
    if (item.anchorState.expectedHash && item.anchorState.found === false) list.push('missingAnchorTarget');
    if (!report.trustCopy) list.push('missingTrustCopy');
    if (report.requestCtaCount < 1) list.push('missingRequestCTA');
    if (report.forbiddenClaimHits.length) list.push(`forbiddenClaims:${report.forbiddenClaimHits.join('|')}`);
    if (report.badFortifiedCertified) list.push('unsafeFortifiedCertifiedCopy');
    if (report.brokenLoadedImages.length) list.push(`brokenLoadedImages:${report.brokenLoadedImages.length}`);
    if (report.symmetryIssues.length) list.push(`symmetryIssues:${report.symmetryIssues.length}`);
    return list.length ? [{ label: item.label, url: item.url, screenshot: item.screenshot, issues: list, anchorState: item.anchorState, symmetryIssues: report.symmetryIssues }] : [];
  });
  finalReport = {
    runId,
    generatedAt: new Date().toISOString(),
    outDir,
    browser: browserInfo.Browser,
    inspectionMode,
    nativeBrowserInspected,
    fallbackReason,
    headless,
    sourceCommit,
    gitStatus,
    productionDomain: 'https://verasroofing.com',
    vercelDeploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    issueCount: issues.length,
    issues,
    captures,
  };
  await fs.writeFile(path.join(outDir, 'live-custom-domain-final-report.json'), JSON.stringify(finalReport, null, 2));
  console.log(JSON.stringify({
    outDir,
    browser: browserInfo.Browser,
    inspectionMode,
    nativeBrowserInspected,
    fallbackReason,
    headless,
    sourceCommit,
    issueCount: issues.length,
    issues,
    captures: captures.map((item) => ({
      label: item.label,
      screenshot: item.screenshot,
      screenshots: item.screenshots,
      viewport: item.report.viewport,
      routeStatus: item.routeStatus,
      scroll: item.report.scroll,
      hash: item.report.hash,
      anchorState: item.anchorState,
      horizontalOverflow: item.report.horizontalOverflow,
      offenderCount: item.report.offenderCount,
      notFoundTitle: item.report.notFoundTitle,
      missingPrimaryHeading: item.report.missingPrimaryHeading,
      trustCopy: item.report.trustCopy,
      badFortifiedCertified: item.report.badFortifiedCertified,
      requestCtaCount: item.report.requestCtaCount,
      forbiddenClaimHits: item.report.forbiddenClaimHits,
      brokenLoadedImages: item.report.brokenLoadedImages.length,
      symmetryIssues: item.report.symmetryIssues.length,
      h1: item.report.h1,
    })),
  }, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  try { edge.kill('SIGTERM'); } catch {}
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
