# Vera's Roofing Visual QA Workflow

Use this workflow before every deploy that changes layout, copy density, mobile nav, CTAs, images, or page structure.

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

Inspect:

- `/`
- `/services.html#epdm-flat-roofing`
- `/photos.html#epdm-carolina-beach`
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

## 3. Native Browser Desktop Pass

Use `1366x900`.

Inspect:

- `/`
- `/services.html`
- `/photos.html`
- `/process.html`

Reject the pass if any of these are visible:

- homepage reads like a long all-in-one landing page again
- image crops feel random or weak
- sections feel repetitive
- nav feels oversized or off-balance
- service cards are too dense
- gallery captions are full-width blocks instead of tight pills

## 4. Three-Perspective Review

Before deploy, explicitly review the current screenshots as:

- Gustavo deciding whether the site is ready to show
- a homeowner deciding whether to call
- a designer looking for clutter, awkward hierarchy, generic visuals, or mobile rough edges

If any perspective finds a visible issue, fix before deploy.

## 5. Evidence

Save browser evidence under `qa/`:

- viewport screenshots
- a JSON result file with URL, viewport, overflow status, console issue count, mobile CTA state, section count, and EPDM image count

Do not count the visual pass as complete unless both screenshots and machine-readable results exist.
