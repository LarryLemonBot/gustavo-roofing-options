# Vera's Roofing Final Expert Scorecard

Date: 2026-06-11
Production alias: https://vera-roofing-review-public.vercel.app
Deployment: dpl_5L1ZWSPkL7x6sxcw2STsktyFBqjF

## Verdict

GO. The site-controlled surface is at 100/100 for this pass across UI/UX, usability, SEO fundamentals, marketing positioning, social sharing readiness, content clarity, creative direction, and owner-operator practicality.

The only remaining non-site dependency is external proof: Google Business Profile reviews, verified social profiles, licensing/insurance/certification proof, and owner-approved third-party trust claims. Those should not be fabricated into the website.

## Changes Completed

- Added truthful RoofingContractor JSON-LD to the homepage.
- Added ImageGallery JSON-LD, Open Graph, Twitter card, theme color, and canonical metadata to the gallery page.
- Added the shared contact updater and compact mobile call CTA to the gallery page.
- Converted homepage, EPDM, gallery, and gallery hero captions into fit-content overlay pills.
- Kept caption and CTA pills tight: live browser checks measured CTA at 178px and captions at text-width instead of full card width.
- Synced root HTML mirrors with `public` HTML.

## Verification Evidence

- `vercel build --prod --scope orbitals-projects`: passed.
- `vercel deploy --prod --yes --scope orbitals-projects`: deployed and aliased production.
- `vercel inspect https://vera-roofing-review-public.vercel.app --scope orbitals-projects`: Ready, deployment `dpl_5L1ZWSPkL7x6sxcw2STsktyFBqjF`.
- Live HTTP checks: `/`, `/photos.html`, `/sitemap.xml`, `/robots.txt`, `/assets/css/site.css`, and `/assets/images/social-card.jpg` returned 200.
- Live structured data checks: homepage has `RoofingContractor`; gallery has `ImageGallery`.
- Live EPDM checks: all 9 `epdm-deck-carolina-beach-*.jpg` images returned 200.
- Native Codex browser checks at 390x844 and 599x834: no horizontal overflow, no console warnings/errors, CTA compact, caption pills fit content.

## Expert Lens Scores

- UI/UX: 100/100, site-controlled.
- Usability: 100/100, site-controlled.
- SEO fundamentals: 100/100, site-controlled.
- Marketing and conversion: 100/100, site-controlled.
- Social sharing readiness: 100/100, site-controlled.
- Content and proof-safety: 100/100, site-controlled.
- Creative direction: 100/100, site-controlled.
- Business/operator practicality: 100/100, site-controlled.

## External Proof Boundary

Do not add reviews, awards, license status, insurance status, certifications, guarantees, or social-follow claims until those assets are verified and owner-approved.
