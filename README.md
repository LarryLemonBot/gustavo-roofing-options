# Vera's Roofing LLC Website

Static website for Vera's Roofing LLC.

## Build approach

This site is intentionally simple for handoff:

- Plain HTML and CSS.
- No WordPress.
- No database.
- No paid CMS.
- No required monthly maintenance package.
- Assets are self-contained in `public/assets`.
- The public homepage is `public/index.html` and is mirrored to root `index.html` for static host compatibility.
- `.vercelignore` keeps old archive, research notes, and handoff docs out of production deploy uploads.

## Public site

Current public URL:

https://vera-roofing-review-public.vercel.app/

Old preview-board URLs under `/gustavo-roofing-options/*` redirect to `/`.

## Key files

- `public/index.html` - main website content.
- `public/services.html` - full service detail page, including the concise EPDM section.
- `public/photos.html` - organized real-work gallery, including all 9 Carolina Beach EPDM photos at `#epdm-carolina-beach`.
- `public/areas.html`, `public/process.html`, `public/contact.html` - supporting subpages that keep the homepage short.
- `index.html` - mirror copy for static host compatibility.
- `public/assets/css/site.css` - all styling.
- `public/assets/images/` - approved logo and live website photos.
- `EDITING-GUIDE.md` - plain-English edit instructions.
- `research/brunswick-roofing-market-brief.md` - research notes used for the first draft; excluded from deploy.
- `archive/preview-choice-board-2026-06-02/` - old preview/logo-choice material; excluded from deploy.

## Current service language

The homepage is intentionally short. Deeper details belong on subpages. Current public service language represents Gustavo's stated services with careful wording:

- Roofing repairs, replacements, and new construction.
- EPDM low-slope work.
- Cedar shake conversations.
- Storm damage inspections.
- Insurance documentation support without promising claim approval.
- Hand-nailed shingle installation.
- Owner-reviewed closeout.
- Manufacturer warranty option conversations for qualifying systems.
- Copper flashing, copper detail work, and metal roofing.

## Current service area language

The homepage and photos page now mention Brunswick County, Wilmington, and New Hanover County in visible copy and metadata. The service-area section includes Brunswick County's 19 municipalities and separates New Hanover County's four incorporated municipalities from nearby local communities such as Castle Hayne, Ogden, Porters Neck, Masonboro, Myrtle Grove, and Wrightsboro.

## Deploy

From this folder:

```powershell
node qa/scripts/verify-final-mobile-visual-guards.mjs
vercel deploy --prod --yes --scope orbitals-projects
```

Before deploy, also run a native Codex browser mobile pass at `390x844` for:

- `/`
- `/services.html#epdm-flat-roofing`
- `/photos.html#epdm-carolina-beach`
- `/contact.html`

Do not deploy if the mobile nav/logo feels oversized, first-viewport CTAs duplicate each other, text overlaps, image pills stretch wider than their text, unsupported license/insurance/review claims appear, or the homepage has grown past the intended seven sections.

## Handoff principle

Future edits should usually be simple text or photo swaps. Keep the site static and portable unless the business later asks for a blog, online quote form, CRM, or CMS.
