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
- The public HTML source files are `public/*.html` and all six pages are mirrored to root `*.html` files for static host compatibility.
- `.vercelignore` keeps old archive, research notes, and handoff docs out of production deploy uploads.

## Public site

Current public URL:

https://verasroofing.com/

The default Vercel project domain and `www.verasroofing.com` intentionally redirect to the apex custom domain.

Old preview-board URLs under `/gustavo-roofing-options/*` redirect to `/`.

## Key files

- `public/index.html` - main website content.
- `public/services.html` - full service detail page, including the concise EPDM section.
- `public/photos.html` - organized real-work gallery, including all 9 coastal EPDM deck photos at `#epdm-carolina-beach`.
- `public/areas.html`, `public/process.html`, `public/contact.html` - supporting subpages that keep the homepage short.
- `index.html` - mirror copy for static host compatibility.
- `public/assets/css/site.css` - all styling.
- `public/assets/images/` - approved logo and live website photos.
- `DESIGN.md` - internal design-system rules for visual, copy, CTA, image, and QA decisions; excluded from deploy.
- `EDITING-GUIDE.md` - plain-English edit instructions.
- `research/brunswick-roofing-market-brief.md` - research notes used for the first draft; excluded from deploy.
- `archive/preview-choice-board-2026-06-02/` - old preview/logo-choice material; excluded from deploy.

## Current service language

The homepage is intentionally short. Deeper details belong on subpages. Current public service language represents owner-provided services with careful wording:

- Roofing repairs, replacements, and new construction.
- EPDM low-slope work.
- Cedar shake conversations.
- Storm damage inspections.
- Insurance documentation support without promising claim approval.
- Hand-nailed shingle installation.
- Owner-reviewed closeout.
- Manufacturer warranty questions and code-related roof-upgrade options when applicable.
- Copper flashing, copper detail work, and metal roofing.

## Current service area language

The homepage and photos page now mention Brunswick County, Wilmington, and New Hanover County in visible copy and metadata. The service-area section includes Brunswick County's 19 municipalities and separates New Hanover County's four incorporated municipalities from nearby local communities such as Castle Hayne, Ogden, Porters Neck, Masonboro, Myrtle Grove, and Wrightsboro.

## Claim policy

Before adding trust, warranty, certification, service-area, or storm/upgrade language, check `archive/claim-policy-20260618.md`. It lists currently approved public positioning and claims that require written verification before publishing.

## Deploy

GitHub-triggered Vercel deployments are intentionally disabled with `git.deploymentEnabled: false` in `vercel.json`. Deploy from this linked workspace with the Vercel CLI so GitHub commits do not trigger Vercel team-membership failures.

Known-good local deploy tools on June 18, 2026:

- Node `v24.15.0`
- npm `11.12.1`
- Vercel CLI `54.1.0`
- Vercel scope `orbitals-projects`

From this folder:

```powershell
.\scripts\sync-public-index.ps1
.\scripts\verify-public-mirrors.ps1
node qa/scripts/report-local-state.mjs
git status --short --branch
node qa/scripts/run-release-gate.mjs
vercel deploy --prod --yes --scope orbitals-projects
node qa/scripts/capture-live-custom-domain-final-qa.mjs
node scripts/submit-indexnow.mjs
node qa/scripts/triage-automation-outputs.mjs
```

Or run the guarded production sequence with:

```powershell
.\scripts\deploy-production.ps1
```

Use `.\scripts\deploy-production.ps1 -SkipDeploy` to run the local release checks without uploading a new deployment.

`sync-public-index.ps1` keeps its historical name, but it now syncs all seven `public/*.html` files to their root mirror files.
`report-local-state.mjs` separates release-blocking tracked or visible untracked changes from ignored generated QA/output artifacts. Do not use broad cleanup commands such as `git clean -xdf` to make ignored artifacts disappear.
`run-release-gate.mjs` records the source commit and refuses to pass with uncommitted tracked changes. Use `ALLOW_DIRTY_RELEASE_GATE=1` only for local investigation, never for a production deploy gate.
`deploy-production.ps1` runs the same release checks, deploys with Vercel CLI, runs live custom-domain QA, submits IndexNow, and triages automation outputs so post-deploy search notification is not missed.

If native Codex Browser control fails while `report-local-state.mjs` shows browser bridge prerequisites passing, the remaining safe repair is to restart Codex Desktop or its app-server, then retry the Browser tool. Do not change or redeploy the website to fix a local Browser bridge failure.

If you intentionally use the prebuilt path, verify the build output before uploading it:

```powershell
vercel build --prod --yes --scope orbitals-projects
.\scripts\verify-vercel-output.ps1
vercel deploy --prebuilt --prod --scope orbitals-projects
```

Before deploy, also follow [qa/VISUAL-QA-WORKFLOW.md](qa/VISUAL-QA-WORKFLOW.md). At minimum, run a native Codex browser mobile pass at `390x844` for:

- `/`
- `/services#epdm-flat-roofing`
- `/photos#epdm-carolina-beach`
- `/contact`

After deploy, verify:

- `https://verasroofing.com/` returns the current site.
- `https://www.verasroofing.com/` redirects to `https://verasroofing.com/`.
- `https://vera-roofing-review-public.vercel.app/` redirects to `https://verasroofing.com/`.
- `node qa/scripts/capture-live-custom-domain-final-qa.mjs` returns `issueCount: 0` on the live custom domain.
- `https://verasroofing.com/d87505eee9cf47a09d6c9d9065c53b7d.txt` returns the IndexNow key before running `node scripts/submit-indexnow.mjs`.
- `node qa/scripts/triage-automation-outputs.mjs` returns `PASS` after the live custom-domain capture.

Do not deploy if the mobile nav/logo feels oversized, first-viewport CTAs duplicate each other, text overlaps, image pills stretch wider than their text, unsupported license/insurance/FORTIFIED/review claims appear, or the homepage has grown past the intended seven sections.

Do not deploy if `scripts/verify-public-mirrors.ps1` reports any mismatch. The `public/*.html` files are the deploy source; the root mirrors must match them before a Vercel upload.

## Handoff principle

Future edits should usually be simple text or photo swaps. Read `DESIGN.md` before visual, CTA, copy-density, or image-placement changes so the site keeps one consistent standard instead of drifting from subjective feedback. Keep the site static and portable unless the business later asks for a blog, online quote form, CRM, or CMS.
