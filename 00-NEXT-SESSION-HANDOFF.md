# Vera's Roofing LLC — next-session handoff

Created: 2026-06-04 00:48 EDT  
Purpose: keep the Vera's Roofing job organized and make the next Hermes Desktop session clean, focused, and self-contained.

---

## Copy/paste this into the new Hermes session

```text
Continue the Vera's Roofing LLC website job in a clean, organized way.

Load the `claude-design` skill before doing design or website edits.

Work from this local desktop workspace only unless I explicitly ask you to compare old sources:
C:/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/deploy-public/vera-roofing-review-public

Primary public site:
https://vera-roofing-review-public.vercel.app/

Current source of truth:
- public/index.html — homepage content
- index.html — mirrored copy of public/index.html
- public/photos.html — organized photo gallery
- photos.html — mirrored copy of public/photos.html
- public/assets/css/site.css — all styling
- public/assets/js/site-config.js — small site config JS
- public/assets/images/ — approved live website images/logos
- README.md and EDITING-GUIDE.md — maintenance/handoff docs
- .vercelignore — keeps archive/research/mcps/terminal junk out of deployment

Start by reading README.md, EDITING-GUIDE.md, this handoff file, public/index.html, public/photos.html, and public/assets/css/site.css. Then summarize the current state before editing.

Keep the job clean:
- Do not work from archive/preview-choice-board unless I explicitly ask to revive an old concept.
- Do not restore older rejected logo versions.
- Do not publish/deploy without my explicit approval.
- Do not contact Gustavo/client or send anything externally unless I explicitly ask.
- Use careful claim language: avoid unsupported guarantees, certifications, BBB/GAF/financing/family-owned/since-year claims unless verified.
- Say FORTIFIED-style / FORTIFIED planning unless credentials are verified.
- Say insurance documentation/support, not guaranteed insurance approval.
- Preserve the static, handoff-first approach: plain HTML/CSS, no WordPress, no database, no CMS unless I ask.

Before any meaningful edit:
1. Make a short backup or snapshot of the files being changed.
2. Edit the canonical public file and keep the root mirror in sync.
3. Verify locally after edits.
4. If deployment is requested, run the deploy only after explicit approval and then verify the live URL.

Recommended next action: do a clean final handoff/QA pass for Gustavo: check homepage + photos page copy, mobile nav/CTA clarity, image labels, public-only deploy hygiene, and the client editing guide. Return a concise punch list before making edits unless I ask for a specific change.
```

---

## Current local workspace

```text
C:/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/deploy-public/vera-roofing-review-public
```

Status verified in this session:

- The local Vera workspace exists on this desktop.
- It is **not a git repository**.
- `public/index.html` and root `index.html` are mirrored exactly.
- `public/photos.html` and root `photos.html` are mirrored exactly.
- `public/assets/images/` contains 26 approved image/logo assets.
- The public site returned HTTP `200` on an earlier live check in this session.
- A later live-content curl check was blocked by approval timeout, so do not treat that later blocked check as a site failure.

---

## Public URL and Vercel project

Public review URL:

```text
https://vera-roofing-review-public.vercel.app/
```

Vercel project metadata found locally:

```text
projectName: vera-roofing-review-public
projectId: prj_bwN97gsVKP6blBAHiN4uvgMzhfbi
orgId/team: team_F9qHrANz4FCzKbYPQW68BwbV
```

Deploy command documented in the project:

```bash
vercel deploy --prod --yes --scope orbitals-projects
```

Important: deploy is a public side effect. Ask Alex before running it.

---

## What the website currently represents

Business/client:

- Vera's Roofing LLC
- Gustavo / Vera's Roofing job
- Brunswick County / nearby coastal NC roofing
- Phone-first / text-first local service site

Current site positioning:

- Hand-nailed roofing
- Owner-inspected work
- Roof repairs and replacements
- Storm damage inspection/documentation
- Metal roofing and copper detail work
- EPDM low-slope work
- Cedar shake and specialty-system conversations
- Wind-mitigation / FORTIFIED-style planning language
- Warranty options where selected systems qualify
- Real Vera's Roofing job photos, not generic stock photos

Approved logo state:

- `public/assets/images/vera-roofing-logo-approved.jpg`
- Logo 10 / flat modern direction
- Utility knife removed
- Circled purple swoosh behind hammer removed
- Purple/silver/white palette approved

---

## Key files

```text
README.md
EDITING-GUIDE.md
HANDOFF-EDITING.md
implementation-brief.md
POLISH-PASS-RECOMMENDATION.md
.vercelignore
vercel.json
public/index.html
index.html
public/photos.html
photos.html
public/assets/css/site.css
public/assets/js/site-config.js
public/assets/images/
```

Keep production clean:

- `.vercelignore` excludes `archive/**`, `research/**`, `photo-audit/**`, `mcps/**`, `terminals/**`, `.vercel/**`, docs, and archive bundles.
- Do not move old preview boards back into `public/` unless Alex explicitly asks.

---

## Local artifact sources found on this desktop

Main recovered/active workspace:

```text
C:/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/deploy-public/vera-roofing-review-public
```

Vector/logo work:

```text
C:/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/vector-logo-work
```

Recovered Mac/offload material:

```text
C:/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/macbook
```

Original uploaded logo candidate also exists at:

```text
C:/Users/alexl/Downloads/vera logo.png.heic
```

Use these old/recovery folders for reference only. The active website source of truth is the `deploy-public/vera-roofing-review-public` folder above.

---

## VPS references found

VPS SSH target:

```text
ubuntu@moltbot-vps
```

Older/simple concept workspace on VPS:

```text
/home/ubuntu/LarryBuildsAI/clients/gustavo-vera-roofing
```

Files there include:

```text
designs/vera-roofing-bold-impact.html
designs/vera-roofing-modern-premium.html
designs/vera-roofing-traditional-trust.html
designs/vera-roofing-style-explorer.html
plans/implementation-plan.md
docs/style-comparison.md
README.md
```

Treat the VPS folder as historical/reference material, not the active deploy source, unless Alex explicitly asks to compare.

---

## Imported Hermes/VPS session references

Imported VPS profile database on this desktop:

```text
C:/Users/alexl/AppData/Local/hermes/profiles/moltbotvps/state.db
```

Most directly relevant Hermes session found:

```text
20260602_152229_7d09dd0c
```

What it contains:

- Alex sent the new Vera's Roofing logo screenshot.
- Assistant extracted visible business-card details: Vera's Roofing LLC, tear-offs/new construction/repairs, email, phone, licensed & insured, deep purple + silver/white, roofline houses, hammer icon, bold roofing treatment.
- Assistant recommended a handoff-first build approach for a local roofing business.

Useful Grok Build search command:

```bash
grok sessions search Vera
```

Relevant Grok session themes found locally:

```text
019e8e46-3e77-76e0-8db2-5d0f22f886a1 — Strict Roofing Photo-Label QA for Vera's Roofing
019e8e17-a63b-73d0-aecf-b4aeca5d4c90 — Vera Roofing Polish Pass: Nav Fixes and Photo Gallery Options
019e8d9b-1f7b-72d0-af90-8c2ebabbbb83 — Hero CTA: "Text Roof Photos" vs "Text Us" QA
019e8d1f-7f21-7482-931d-ec4c529054dd — Critical QA Feedback Post-Deploy
019e8bf5-06d4-79b1-b6c4-2b4bbc71c45a — Final Strict QA Gate After Fixes
019e8bec-* — Nit-picky public-surface, copy credibility, and visual QA passes
019e8be3-363b-7801-a983-6a82fb78dbee — Delegated Design Review Partner
019e8a5d-406d-7280-a6da-0ff14db3e05b — Homepage polish: FORTIFIED addition, services to top, hierarchy
019e8880-d861-7162-ad20-f5ad912ffbbe — Six distinct visual directions, copy, QA checklist
019e8519-9934-76a0-b88b-f15bbc2fa2ad — 8 SVG logo concepts from business card
019e76d4-ed35-72f1-94c0-876483f2d340 — Original premium roofing landing page design exploration
```

Use these only if the new session needs historical reasoning. Do not let them create context bloat unless needed.

---

## Verification checklist for future edits

Local file checks:

```bash
cd '/c/Users/alexl/Documents/Codex/LarryBuildsAI/local-only/vera-roofing-recovery/deploy-public/vera-roofing-review-public'
cmp -s public/index.html index.html; echo "index mirror:$?"
cmp -s public/photos.html photos.html; echo "photos mirror:$?"
```

Expected:

```text
index mirror:0
photos mirror:0
```

Manual/browser QA:

- Homepage loads.
- Photos page loads.
- Header/logo display correctly on desktop and mobile.
- Primary CTA is clear: call/text.
- Image captions match what is visibly shown.
- No old preview-board pages are public.
- No unsupported claims slipped in.
- Contact info and email are consistent.
- `photos.html` is linked from homepage and nav.
- `.vercelignore` still excludes archive/research/mcps/terminals.

---

## Clean operating rule

For the next session, stay narrow:

1. Understand current state.
2. Make only the requested edit or QA pass.
3. Verify.
4. Keep source-of-truth files mirrored.
5. Do not drag in old archives unless needed.
6. Ask before public deploy.
