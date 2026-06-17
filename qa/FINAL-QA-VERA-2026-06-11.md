# Vera's Roofing Public Review Site QA - 2026-06-11

## A. Executive Summary

Status: PASS, with minor notes.

Decision: GO WITH MINOR NOTES. The site is ready to show Gustavo. It is visually polished, local, rugged, trustworthy, and conversion-focused. The live Vercel alias is serving the reported production deployment.

Visual score: 91/100.

Production-readiness score: 94/100.

The site is not a 100 because several gallery/source images are larger than ideal for a static contractor site, and the fixed mobile call button can cover the lower edge of a card caption at some scroll positions. Neither issue blocks showing the site.

## B. Verified Live URLs

- Homepage: https://vera-roofing-review-public.vercel.app/ - 200 OK
- Photos page: https://vera-roofing-review-public.vercel.app/photos.html - 200 OK
- EPDM gallery section: https://vera-roofing-review-public.vercel.app/photos.html#epdm-carolina-beach - 200 OK
- Sitemap: https://vera-roofing-review-public.vercel.app/sitemap.xml - 200 OK
- Robots: https://vera-roofing-review-public.vercel.app/robots.txt - 200 OK

Vercel deployment verified with `vercel inspect`: `dpl_HteNkDGNikUXKWXyrkbDrX3sDEH9`, target `production`, status `Ready`, alias includes the public URL.

## C. Commands Run

- `Get-Content` on the downloaded goal file: PASS.
- `rg` memory/project scans for Vera Roofing context and risky copy terms: PASS.
- `Get-ChildItem` on local deploy project and album export: PASS.
- Python live URL, link, asset, hash, metadata, and exposure audit: PASS.
- `vercel inspect https://vera-roofing-review-public.vercel.app --scope orbitals-projects`: PASS.
- `vercel build --prod --scope orbitals-projects`: initial settings error, then PASS after `vercel build --prod --yes --scope orbitals-projects` pulled project settings.
- Python static deployable-file audit for private terms, risky claims, EPDM references, and album count: PASS.
- Native Codex desktop browser viewport QA at 1920x1080, 1366x900, 768x1024, 390x844, 375x667 for homepage and photos page: PASS.
- Native Codex desktop browser focused EPDM screenshots and settled `#work` anchor checks: PASS.
- PIL image dimension/weight audit: PASS.

## D. Files Inspected

- `public/index.html`
- `public/photos.html`
- `public/assets/css/site.css`
- `public/assets/js/site-config.js`
- `public/sitemap.xml`
- `public/robots.txt`
- `vercel.json`
- `.vercel/project.json`
- `.vercelignore`
- `HANDOFF-HERMES-MINIMAX-M3-VERA-2026-06-11.md`
- `macbook/vera-roofing-photos-export-2026-06-11/manifest.csv`
- Required EPDM images under `public/assets/images/`

## E. Photo Verification

Album export exists and contains 58 files.

All 9 required EPDM website images exist locally and return 200 on the live site:

- `epdm-deck-carolina-beach-01.jpg` through `epdm-deck-carolina-beach-09.jpg`

All 9 appear in `photos.html#epdm-carolina-beach`. They are used with professional alt text and visible captions. The homepage low-slope/EPDM service card uses a real EPDM project photo, not a stock placeholder.

No wrong stock EPDM placeholder image was found in the live public asset set.

## F. Issues Found

Critical: none.

High: none.

Medium:

- Several gallery/source JPEGs are heavier than ideal for a static contractor site, including multiple 0.79 MB to 0.96 MB images. Lazy loading reduces the impact, but a compression pass would improve mobile performance.

Low:

- The fixed mobile "Call Us Now" button can cover the bottom of a photo/card caption at certain scroll positions.
- The homepage work grid is a horizontally clipped carousel-like layout; DOM geometry reports offscreen cards, but measured page width confirms no actual horizontal overflow.

## G. Fixes Applied

No site-code fixes were required or applied during this verification pass.

Created this QA report under `qa/`, which is excluded from production by `.vercelignore`.

## H. Remaining Recommendations

- Compress the largest non-EPDM gallery JPEGs or generate responsive derivatives before a broader public launch.
- Add bottom scroll padding on mobile sections or slightly raise mobile card captions if the fixed call button overlap becomes distracting during live review.
- Keep FORTIFIED, insurance, grant, certification, award, and warranty language conservative unless written proof is added.

## I. Final Go/No-Go Decision

GO WITH MINOR NOTES: Ready to show Gustavo.

