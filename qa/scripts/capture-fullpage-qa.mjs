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
const outDir = path.join(root, 'qa', `phase2-fullpage-${runId}`);
await fs.mkdir(outDir, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sanitizeRequestPath(reqUrl) {
  const u = new URL(reqUrl, 'http://127.0.0.1');
  let pathname = decodeURIComponent(u.pathname);
  if (pathname === '/') pathname = '/index.html';
  pathname = pathname.replace(/\\/g, '/');
  const resolved = path.resolve(publicDir, `.${pathname}`);
  if (!resolved.startsWith(publicDir)) return null;
  return resolved;
}

function startServer() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const target = sanitizeRequestPath(req.url || '/');
    requests.push({ url: req.url, target, at: new Date().toISOString() });
    if (!target) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    try {
      let stat = await fs.stat(target);
      let file = target;
      if (stat.isDirectory()) {
        file = path.join(target, 'index.html');
        stat = await fs.stat(file);
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
      fssync.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, requests, port: server.address().port });
    });
  });
}

function getFreePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });
}

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    '/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/c/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fssync.existsSync(p)) return p;
  }
  throw new Error(`Microsoft Edge not found. Tried: ${candidates.join(', ')}`);
}

async function waitForJson(url, timeoutMs = 12000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      lastErr = new Error(`${r.status} ${r.statusText}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw lastErr || new Error(`Timed out waiting for ${url}`);
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const events = [];
    let id = 1;
    ws.onopen = () => {
      const send = (method, params = {}) => new Promise((res, rej) => {
        const msgId = id++;
        pending.set(msgId, { res, rej, method });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
      const close = () => ws.close();
      resolve({ send, close, events });
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.rej(new Error(`${p.method}: ${msg.error.message}`));
        else p.res(msg.result || {});
      } else if (msg.method) {
        events.push(msg);
      }
    };
    ws.onerror = (err) => reject(err);
  });
}

async function waitForDocumentReady(client, timeoutMs = 15000) {
  const start = Date.now();
  let lastState = 'unknown';
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await client.send('Runtime.evaluate', {
        expression: 'document.readyState',
        returnByValue: true,
      });
      lastState = result.result?.value || lastState;
      if (lastState === 'complete') return lastState;
    } catch {
      // The execution context can briefly disappear during navigation.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for document.readyState=complete; last state=${lastState}`);
}

function expressionForPageReport(pageName) {
  const photosOverlap = `(() => {
    const a = document.querySelector('.photo-hero h1');
    const b = document.querySelector('.photo-hero-card');
    if (!a || !b) return null;
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    return {
      overlap: !(ar.right <= br.left || br.right <= ar.left || ar.bottom <= br.top || br.bottom <= ar.top),
      horizontalGap: Math.round(br.left - ar.right),
      a: { left: Math.round(ar.left), right: Math.round(ar.right), top: Math.round(ar.top), bottom: Math.round(ar.bottom) },
      b: { left: Math.round(br.left), right: Math.round(br.right), top: Math.round(br.top), bottom: Math.round(br.bottom) }
    };
  })()`;
  const homeOverlap = `(() => {
    const a = document.querySelector('.hero-copy');
    const b = document.querySelector('.hero-card');
    if (!a || !b) return null;
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    return {
      overlap: !(ar.right <= br.left || br.right <= ar.left || ar.bottom <= br.top || br.bottom <= ar.top),
      horizontalGap: Math.round(br.left - ar.right),
      a: { left: Math.round(ar.left), right: Math.round(ar.right), top: Math.round(ar.top), bottom: Math.round(ar.bottom) },
      b: { left: Math.round(br.left), right: Math.round(br.right), top: Math.round(br.top), bottom: Math.round(br.bottom) }
    };
  })()`;
  return `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // Exercise scroll positions so native lazy-loading images actually request before full-page capture.
    const max = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const step = Math.max(320, Math.floor(window.innerHeight * 0.72));
    for (let y = 0; y <= max; y += step) {
      window.scrollTo({ top: y, left: 0, behavior: 'auto' });
      await sleep(180);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    await sleep(450);
    const imageData = Array.from(document.images).map((img, i) => {
      const r = img.getBoundingClientRect();
      return {
        index: i,
        src: img.currentSrc || img.src,
        alt: img.getAttribute('alt') || '',
        loading: img.getAttribute('loading') || '',
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      };
    });
    const links = Array.from(document.querySelectorAll('a')).map((a, i) => ({
      index: i,
      text: (a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      href: a.href,
      classes: a.className || '',
      aria: a.getAttribute('aria-label') || '',
    }));
    const h1 = document.querySelector('h1');
    const nav = document.querySelector('header, .site-header, nav');
    const bodyText = document.body.innerText || '';
    return {
      pageName: ${JSON.stringify(pageName)},
      title: document.title,
      url: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      scroll: {
        width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      },
      h1: h1 ? h1.textContent.trim().replace(/\s+/g, ' ') : null,
      navText: nav ? nav.textContent.trim().replace(/\s+/g, ' ').slice(0, 300) : null,
      imageCount: imageData.length,
      brokenImages: imageData.filter(img => img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0)),
      notCompleteImages: imageData.filter(img => !img.complete).length,
      emptyAltImages: imageData.filter(img => !img.alt && !(img.src || '').includes('favicon')),
      phoneLinks: links.filter(l => l.href.startsWith('tel:')),
      mailLinks: links.filter(l => l.href.startsWith('mailto:')),
      photosLinks: links.filter(l => l.href.includes('photos.html')),
      ctaTexts: links.filter(l => /call|text|photo|roof|contact/i.test(l.text + ' ' + l.aria)).map(l => ({ text: l.text, href: l.href, classes: l.classes, aria: l.aria })),
      forbiddenClaimHits: ['guaranteed insurance approval','best roofer','BBB','GAF certified','FORTIFIED certified','family owned since'].filter(s => bodyText.toLowerCase().includes(s.toLowerCase())),
      homeHeroOverlap: ${homeOverlap},
      photosHeroOverlap: ${photosOverlap},
    };
  })()`;
}

async function capturePage({ client, url, label, viewport }) {
  client.events.length = 0;

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor ?? 1,
    mobile: viewport.mobile ?? false,
  });
  await client.send('Page.navigate', { url });
  console.error(`[phase2] ${label}: navigated, waiting ready`);
  await waitForDocumentReady(client, 20000);
  console.error(`[phase2] ${label}: document ready`);
  await new Promise((r) => setTimeout(r, 650));
  await client.send('Runtime.evaluate', {
    expression: 'document.documentElement.style.scrollBehavior = "auto"; document.body.style.scrollBehavior = "auto";',
    returnByValue: true,
  });
  console.error(`[phase2] ${label}: collecting DOM report`);
  const reportEval = await client.send('Runtime.evaluate', {
    expression: expressionForPageReport(label),
    awaitPromise: true,
    returnByValue: true,
  });
  const consoleMessages = client.events.flatMap((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      return [{
        type: msg.params.type,
        args: (msg.params.args || []).map((a) => a.value ?? a.description ?? a.unserializableValue ?? '').join(' '),
      }];
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      return [{ type: 'exception', args: msg.params.exceptionDetails?.text || 'exceptionThrown' }];
    }
    if (msg.method === 'Log.entryAdded') {
      return [{ type: msg.params.entry.level, args: msg.params.entry.text }];
    }
    return [];
  });
  const pageReport = reportEval.result.value;
  console.error(`[phase2] ${label}: DOM report collected`);

  const metrics = await client.send('Page.getLayoutMetrics');
  const contentSize = metrics.contentSize || metrics.cssContentSize;
  const captureMode = (process.env.VERA_CAPTURE_MODE || 'scan').toLowerCase();
  const screenshots = [];
  if (captureMode === 'full') {
    const clip = {
      x: 0,
      y: 0,
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
      scale: 1,
    };
    console.error(`[phase2] ${label}: capturing full screenshot ${clip.width}x${clip.height}`);
    const shot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      fromSurface: true,
      clip,
    });
    const outPath = path.join(outDir, `${label}-${viewport.width}x${viewport.height}-full.png`);
    await fs.writeFile(outPath, Buffer.from(shot.data, 'base64'));
    screenshots.push({ position: 'full', y: 0, path: outPath });
  } else {
    const maxY = Math.max(0, Math.ceil(contentSize.height) - viewport.height);
    const anchorEval = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (!location.hash) return null;
        const id = decodeURIComponent(location.hash.slice(1));
        const target = document.getElementById(id);
        if (!target) return null;
        const top = target.getBoundingClientRect().top + window.scrollY;
        return Math.max(0, Math.round(top - 24));
      })()`,
      returnByValue: true,
    });
    const anchorY = Number.isFinite(anchorEval.result?.value) ? anchorEval.result.value : null;
    const rawPositions = anchorY === null
      ? [
        ['top', 0],
        ['middle', Math.round(maxY / 2)],
        ['bottom', maxY],
      ]
      : [
        ['anchor', anchorY],
        ['anchor-next', Math.min(maxY, anchorY + Math.round(viewport.height * 0.82))],
        ['anchor-follow', Math.min(maxY, anchorY + Math.round(viewport.height * 1.64))],
      ];
    const seenY = new Set();
    const positions = rawPositions.map(([name, y]) => [name, Math.max(0, y)])
      .filter(([, y]) => {
        if (seenY.has(y)) return false;
        seenY.add(y);
        return true;
      });
    for (const [position, y] of positions) {
      await client.send('Runtime.evaluate', {
        expression: `window.scrollTo({ top: ${JSON.stringify(y)}, left: 0, behavior: 'auto' }); window.scrollY`,
        returnByValue: true,
      });
      await new Promise((r) => setTimeout(r, 180));
      const scrollResult = await client.send('Runtime.evaluate', {
        expression: 'window.scrollY',
        returnByValue: true,
      });
      const actualY = Math.round(scrollResult.result?.value || 0);
      const shot = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
      });
      const outPath = path.join(outDir, `${label}-${viewport.width}x${viewport.height}-${position}.png`);
      console.error(`[phase2] ${label}: wrote ${position} viewport screenshot at y=${actualY}`);
      await fs.writeFile(outPath, Buffer.from(shot.data, 'base64'));
      screenshots.push({ position, y: actualY, requestedY: y, path: outPath });
    }
    await client.send('Runtime.evaluate', {
      expression: 'window.scrollTo({ top: 0, left: 0, behavior: "auto" })',
      returnByValue: true,
    });
  }
  console.error(`[phase2] ${label}: wrote ${screenshots.length} screenshot(s)`);
  return {
    label,
    url,
    viewport,
    screenshot: screenshots[0]?.path,
    screenshots,
    contentSize: {
      width: Math.ceil(contentSize.width),
      height: Math.ceil(contentSize.height),
    },
    consoleMessages: consoleMessages.filter((m) => m.type !== 'log'),
    report: pageReport,
  };
}

console.error(`[phase2] writing screenshots to ${outDir}`);
const { server, requests, port: serverPort } = await startServer();
console.error(`[phase2] local server http://127.0.0.1:${serverPort}`);
const debugPort = Number(process.env.VERA_DEBUG_PORT || await getFreePort());
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'vera-phase2-edge-'));
console.error(`[phase2] launching Edge debug port ${debugPort}`);
const edge = spawn(edgePath(), [
  `--remote-debugging-port=${debugPort}`,
  '--remote-allow-origins=*',
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=msEdgeAutoUpdate,EdgeAutoUpdate,EdgeWelcome,EdgeUpdate,EdgeUpdateUI,Sync,EdgeAssistant',
  '--disable-extensions',
  '--disable-component-update',
  '--disable-default-apps',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
edge.stderr?.on('data', (chunk) => {
  const text = String(chunk).trim();
  if (text) console.error(`[edge] ${text.split('\n').slice(0, 3).join('\n[edge] ')}`);
});
edge.on('exit', (code, signal) => console.error(`[phase2] Edge exited code=${code} signal=${signal}`));

let finalReport;
try {
  const browserInfo = await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
  console.error(`[phase2] Edge ready: ${browserInfo.Browser}`);
  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  console.error(`[phase2] Edge targets: ${targets.length}`);
  const target = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl) || targets.find((t) => t.webSocketDebuggerUrl);
  if (!target) throw new Error(`No debuggable Edge page target found: ${JSON.stringify(targets)}`);
  const client = await cdpClient(target.webSocketDebuggerUrl);
  console.error(`[phase2] CDP connected`);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');

  const base = `http://127.0.0.1:${serverPort}`;
  const wantedRoutes = new Set((process.env.VERA_PAGE_FILTER || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean));
  const wantedViewports = new Set((process.env.VERA_VIEWPORT_FILTER || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean));
  const extraRoutes = (process.env.VERA_EXTRA_ROUTES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [label, ...pathParts] = entry.split('=');
      const routePath = pathParts.join('=');
      if (!label || !routePath) throw new Error(`Invalid VERA_EXTRA_ROUTES entry: ${entry}`);
      return [label.trim().toLowerCase(), routePath.trim()];
    });
  const routes = [
    ['home', '/'],
    ['services', '/services.html'],
    ['gutter-cleaning-guards', '/gutter-cleaning-guards.html'],
    ['photos', '/photos.html'],
    ['areas', '/areas.html'],
    ['process', '/process.html'],
    ['contact', '/contact.html'],
    ...extraRoutes,
  ].filter(([label]) => wantedRoutes.size === 0 || wantedRoutes.has(label));
  const viewports = [
    ['desktop', { width: 1366, height: 900, mobile: false, deviceScaleFactor: 1 }],
    ['tablet', { width: 768, height: 1024, mobile: true, deviceScaleFactor: 1 }],
    ['mobile', { width: 390, height: 844, mobile: true, deviceScaleFactor: 1 }],
  ].filter(([label]) => wantedViewports.size === 0 || wantedViewports.has(label));
  if (!routes.length) throw new Error(`No routes selected by VERA_PAGE_FILTER=${process.env.VERA_PAGE_FILTER || ''}`);
  if (!viewports.length) throw new Error(`No viewports selected by VERA_VIEWPORT_FILTER=${process.env.VERA_VIEWPORT_FILTER || ''}`);
  const pages = viewports.flatMap(([viewportLabel, viewport]) =>
    routes.map(([routeLabel, routePath]) => ({
      path: routePath,
      label: `${routeLabel}-${viewportLabel}`,
      viewport,
    })),
  );
  const captures = [];
  for (const page of pages) {
    console.error(`[phase2] capture ${page.label} ${page.viewport.width}x${page.viewport.height}`);
    captures.push(await capturePage({
      client,
      url: `${base}${page.path}`,
      label: page.label,
      viewport: page.viewport,
    }));
    console.error(`[phase2] captured ${page.label}`);
  }
  client.close();
  const issues = captures.flatMap((capture) => {
    const report = capture.report || {};
    const list = [];
    if (report.scroll?.width > capture.viewport.width + 1) list.push('horizontalOverflow');
    if (report.brokenImages?.length) list.push(`brokenImages:${report.brokenImages.length}`);
    if (report.emptyAltImages?.length) list.push(`emptyAltImages:${report.emptyAltImages.length}`);
    if (report.forbiddenClaimHits?.length) list.push(`forbiddenClaims:${report.forbiddenClaimHits.join('|')}`);
    if (report.homeHeroOverlap?.overlap) list.push('homeHeroOverlap');
    if (report.photosHeroOverlap?.overlap) list.push('photosHeroOverlap');
    return list.length ? [{
      label: capture.label,
      viewport: `${capture.viewport.width}x${capture.viewport.height}`,
      issues: list,
      screenshots: capture.screenshots,
    }] : [];
  });
  finalReport = {
    runId,
    root,
    publicDir,
    outDir,
    serverBase: base,
    browser: browserInfo.Browser,
    issueCount: issues.length,
    issues,
    captures,
    requests,
  };
  await fs.writeFile(path.join(outDir, 'phase2-fullpage-report.json'), JSON.stringify(finalReport, null, 2));
  console.log(JSON.stringify({
    outDir,
    browser: browserInfo.Browser,
    issueCount: issues.length,
    issues,
    captures: captures.map(c => ({
      label: c.label,
      screenshot: c.screenshot,
      screenshots: c.screenshots,
      contentSize: c.contentSize,
      consoleCount: c.consoleMessages.length,
      brokenImages: c.report.brokenImages.length,
      emptyAltImages: c.report.emptyAltImages.length,
      forbiddenClaimHits: c.report.forbiddenClaimHits,
      homeHeroOverlap: c.report.homeHeroOverlap,
      photosHeroOverlap: c.report.photosHeroOverlap,
    })),
  }, null, 2));
  if (issues.length) {
    process.exitCode = 1;
  }
} finally {
  server.close();
  edge.kill('SIGTERM');
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {});
}
