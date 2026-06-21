# Vera's Roofing Visual QA Workflow

Use this workflow before every deploy that changes layout, copy density, mobile nav, CTAs, images, or page structure.

Each visual pass must be prompted by the previous result. Start from the newest browser comment, Gustavo note, release-gate report, live custom-domain report, or automation finding. Name the exact issue being judged, inspect the smallest affected surface first, then expand to mobile, tablet, and desktop only to verify that the fix did not break symmetry, CTA hierarchy, readability, or image rhythm elsewhere.

Do not repeat screenshots as a ritual. A pass is productive only when it creates one of these outcomes:

- a narrow patch to a visible public-site issue
- a confirmed non-action with the reason written down
- a blocked item that names the missing proof, access, asset, or owner decision
- a clean deploy-ready result that includes screenshots and machine-readable reports

## 1. Static Guard

Run:

```powershell
node qa/scripts/verify-final-mobile-visual-guards.mjs
```

This catches repeatable failures before browser review:

- broken internal links and anchors
- missing public assets
- unsupported visible claims
- homepage section creep
- stale standalone EPDM links
- missing EPDM anchors or image count
- oversized-header-logo guard changes
- duplicate homepage sticky CTA risk
- full-width caption pill regressions

## 2. Native Browser Mobile Pass

Use the native Codex desktop browser at `390x844`.

If the native Codex browser cannot attach or bootstrap, record that failure in the handoff or final QA note, then run the Edge/CDP fallback scripts:

```powershell
node qa/scripts/report-local-state.mjs
node qa/scripts/capture-live-custom-domain-final-qa.mjs
node qa/scripts/capture-fullpage-qa.mjs
node qa/scripts/verify-premium-cross-viewport.mjs
```

Inspect the saved screenshots under `qa/`. Do not call this a native-browser pass unless the native Codex browser was actually inspected. If `report-local-state.mjs` shows the Browser bridge prerequisites passing but the Browser tool still returns a transport failure, restart Codex Desktop or its app-server before retrying; do not change website files to fix a local Browser bridge issue.

If the browser can be inspected manually in the Codex Desktop side panel but the automation bridge cannot control it, create `qa/native-sidepanel-signoff.json` from `qa/native-sidepanel-signoff.template.json` after the manual pass. The signoff must match the current `git rev-parse HEAD`, use `https://verasroofing.com`, include every required route and viewport, and be newer than the latest live custom-domain capture. `REQUIRE_NATIVE_BROWSER=1 node qa/scripts/run-release-gate.mjs` accepts either an automated native-browser report or this valid manual native side-panel signoff.

Inspect:

- `/`
- `/services.html`
- `/services.html#certainteed-roof-system`
- `/services.html#epdm-flat-roofing`
- `/photos.html`
- `/photos.html#epdm-carolina-beach`
- `/areas.html`
- `/process.html`
- `/contact.html`

Reject the pass if any of these are visible:

- logo/nav consumes too much of first viewport
- two call buttons compete in the same first viewport
- text overlaps, clips, or touches card edges
- pills/buttons stretch far beyond their text
- sticky CTA covers important content
- captions block important photo details
- hero headline feels cramped or generic
- small uppercase labels on dark cards are too low-contrast to read
- any unsupported license, insurance, review, award, certification, or guarantee claim appears
- any CTA, nav row, footer link row, or pill row feels visually off-center or asymmetrical

## 3. Native Browser Tablet Pass

Use `768x1024`.

Inspect every public page and key anchors:

- `/`
- `/services.html`
- `/services.html#certainteed-roof-system`
- `/services.html#epdm-flat-roofing`
- `/photos.html`
- `/photos.html#epdm-carolina-beach`
- `/areas.html`
- `/process.html`
- `/contact.html`

Reject the pass if any row of CTAs, nav links, footer links, service-area pills, proof pills, or gallery links is visibly left-heavy, right-heavy, uneven, or not deliberately centered.

## 4. Native Browser Desktop Pass

Use `1366x900`.

Inspect:

- `/`
- `/services.html`
- `/services.html#certainteed-roof-system`
- `/services.html#epdm-flat-roofing`
- `/photos.html`
- `/photos.html#epdm-carolina-beach`
- `/areas.html`
- `/process.html`
- `/contact.html`

Reject the pass if any of these are visible:

- homepage reads like a long all-in-one landing page again
- image crops feel random or weak
- sections feel repetitive
- nav feels oversized or off-balance
- service cards are too dense
- gallery captions are full-width blocks instead of tight pills
- proof cards or CTA cards leave obvious interior dead space

## 5. Three-Perspective Review

Before deploy, explicitly review the current screenshots as:

- Gustavo deciding whether the site is ready to show
- a homeowner deciding whether to call
- a designer looking for clutter, awkward hierarchy, generic visuals, or mobile rough edges

If any perspective finds a visible issue, fix before deploy.

## 6. Post-Deploy Custom-Domain Pass

After every production deploy, run the live custom-domain capture and inspect the generated screenshots:

```powershell
node qa/scripts/capture-live-custom-domain-final-qa.mjs
```

This pass must cover the live `https://verasroofing.com` custom domain, not only a preview URL. It must include desktop, tablet, and mobile captures for every public page plus the CertainTeed, EPDM, and EPDM-photo anchors.

## 7. Evidence

Save browser evidence under `qa/`:

- viewport screenshots
- a JSON result file with URL, viewport, overflow status, console issue count, mobile/tablet CTA state, symmetry issue count, section count, unsafe-claim status, and EPDM image count

Do not count the visual pass as complete unless both screenshots and machine-readable results exist.

## 8. Automation Output Triage

After every deploy and before acting on any recurring automation recommendation, run:

```powershell
node qa/scripts/triage-automation-outputs.mjs
```

This checks the Vera-specific Codex automations, the latest saved automation outputs, the latest release-gate and live custom-domain QA reports, the standalone gutter page, gutter redirects, and the public AI discovery file.

Treat the output as:

- `BLOCKING`: fix before the site is considered public-ready.
- `WARNING`: inspect and either fix, schedule, or document why it is not urgent.
- `RESOLVED`: prior automation finding is confirmed fixed on the current live site.
- `NON-ACTION`: no patch is appropriate because the finding is not due, not proof-safe, or not tied to homeowner conversion.
