# Vera's Roofing Polish Pass - Concise Implementation Recommendation

**Date:** 2026 (current polish iteration)  
**Context:** Site polish to add FORTIFIED/FORTIFIED Roof capability carefully, move services offered closer to the top, keep flow natural/customer-facing. Brand: black/deep plum/silver/white, approved logo, Brunswick County NC roofer. All services to surface per query. No unsupported guarantees/cert overclaims.

## Core Recommendation: Hero / Services / Copy Hierarchy

**Target customer-facing flow (phone-first, conversion-oriented, services high and complete early):**

1. **Hero (immediate top, high visual + CTAs)**
   - Headline (kept strong): "Hand-nailed roofing, inspected by the owner."
   - Intro: One paragraph that names the key offerings naturally: roof repairs, replacements, storm damage documentation, **FORTIFIED-style roof upgrades**, metal roofing, copper flashing, EPDM low-slope, cedar shake, and warranty options. Local (Brunswick County, wind/rain/humidity/salt air).
   - Chips (quick-scan services, 6 max): Roof repair, Replacements, Storm damage, **FORTIFIED upgrades**, Metal & copper, EPDM & cedar.
   - CTAs: Call, Text roof photos, See recent work. (sticky mobile call preserved)
   - Proof-strip (below hero, 3 items): Owner-inspected work | Hand-nailed shingles | Warranty options. (FORTIFIED lives in services for weight)
   - Hero-card: "Send roof photos. Get a clear next step." Updated lightly to reference FORTIFIED-style upgrades.
   - Why high: Instant trust + services glimpse before scroll. No bloat.

2. **Services Offered (first <main> section, #services - now the complete "what we do" right after hero/proof)**
   - Eyebrow + H2: "Services for coastal homes" / "Roof repair, replacements, storm work, and specialty upgrades."
   - Lead para: Mentions photos, inspection, written scope, practical rec. Lists the full set (tear-offs, repairs, FORTIFIED-style, metal, copper, EPDM, cedar, more) for Brunswick County.
   - 5 service cards (customer language, benefit + safe qualifiers, numbered 01-05):
     - 01 Roof repair & replacements: Leak repairs, full tear-offs, new systems. Clean sites, clear comms.
     - 02 Storm damage & insurance documentation: Inspections, visible damage photos, plain-language notes, written scopes homeowners can share with their insurer.
     - 03 **FORTIFIED roof work**: FORTIFIED-style roof upgrades, wind-mitigation details, reinforced deck prep, and coastal reinforcement options *discussed for qualifying homes*.
     - 04 Metal roofing & copper work: Metal systems + precision copper flashing, custom transitions, copper detail work finished for salt air/wind.
     - 05 Low-slope & specialty systems: EPDM for flat/low-slope, Hyperstock, cedar shake, other systems matched to project. Hand-nailed where specified.
   - **Key to "move closer to top"**: Removed the prior long 12-item ".capabilities" grid (was duplicative "also handles" checklist that pushed real content down and felt internal). Services section now owns the full surfaced list immediately in flow. 5 cards use existing .service pattern + auto-fit grid (CSS tweak) so natural wrap (4-5 cols wide, 2 on tablet, 1 mobile). All requested services (repair/replacements/storm/ins/FORTIFIED/EPDM/Hyperstock/cedar/metal/copper/hand-nailed/owner/warranty) covered without sprawl.
   - Images: Reused/rotated existing approved real-job photos (no new files needed for this pass).

3. **Storm Ready (#storm, next for local relevance)**
   - Keep split visual + practical focus on wind/rain/salt air details (edges, flashing, penetrations, material choices, photo doc).
   - Check-list: inspections/doc, metal/shingle/cedar/EPDM work, plain repair recs, **FORTIFIED-style and wind-mitigation upgrade options discussed**, + new: "Photo documentation and written scopes for your insurance claim conversations (homeowner contacts insurer first)".
   - Language: Always "discussed", "options", "for your ... conversations", parenthetical on homeowner/insurer process. Tel link preserved.

4. **Proof / Gallery (#work)**
   - Keep after storm (visual proof of the services just described).
   - Minor head polish: "Actual job photos from Vera's Roofing work in the Brunswick County area...".
   - Captions unchanged (real photos of metal, copper, storm, prep, finished). Supports credibility without text overload.

5. **Craft / Why (owner differentiator)**
   - Keep for proof of hand-nailed + owner-inspected (core brand).
   - Updated items: Owner hand-inspected (stronger), Hand-nailed shingles, Warranty options (qualified "Select systems carry manufacturer 50-year... backed by our installation and labor where eligible"), Copper & metal details, Photo documentation, **Coastal & FORTIFIED focus** ("FORTIFIED-style upgrades... discussed with Brunswick County wind, rain, and salt air in mind").
   - Quote-card: Enhanced to mention "careful hand-nailed fastening, owner inspection".

6. **Areas + Contact (close)**
   - Areas para: Updated to list key services + FORTIFIED-style.
   - Contact para: Mirrors services + FORTIFIED-style + warranty options.
   - CTAs unchanged (phone/email/sms strong).

## Copy / Language Rules (enforced)
- FORTIFIED: "FORTIFIED-style roof upgrades", "FORTIFIED-style ... options discussed", card title "FORTIFIED roof work" qualified immediately in body. Never "FORTIFIED certified", "FORTIFIED roofer", "FORTIFIED approved", "we install FORTIFIED roofs" as certification claim.
- Insurance: "written scopes homeowners can share with their insurer", "for your insurance claim conversations (homeowner contacts insurer first)". Never guarantees, approvals, "we handle claims".
- Warranties: "warranty options", "available 50-year material warranties and eligible installation or labor coverage", "Select systems carry manufacturer 50-year material warranties backed by our installation and labor where eligible". Never blanket "includes 50-year warranty".
- General: Direct/local ("Brunswick County", "salt air", "wind and rain"). "Options discussed", "reviewed", "matched during planning". Phone-first, no hype, no "best", no unverified years/cert/financing.
- All per EDITING-GUIDE.md + implementation-brief.md constraints.

## Visual / Tech Notes
- No layout breakage: reused .section, .service, .wrap, .split, .work-grid, .why-item, .check-list, .hero-chips etc.
- CSS: One minimal change to .service-grid (repeat(auto-fit, minmax(240px,1fr))) + CLIENT-EDIT comment. Media queries already handle collapse. No color/brand changes.
- CLIENT-EDIT comments added at key polish points (services block) for future handoff.
- Both public/index.html + root index.html kept identical (synced via copy after edits).
- Images: All real approved (from public/assets/images/), descriptive alts, no stock/AI.
- Length: Shorter/ tighter (removed 12-item wall) → services feel closer to top, better scroll on mobile.
- Nav/anchors: Unchanged (Services still first target). Proof-strip + hero chips give early services signal.
- Safe for deploy: `vercel deploy --prod --yes --scope orbitals-projects` (from project root).

## Before/After Hierarchy Impact
- Before: Hero → proof → services(4) → long capabilities(12) → storm → work → why → areas → contact. (Services "offered" felt split/buried.)
- After: Hero(+chips+proof) → services(5 complete, FORTIFIED explicit) → storm → work → why(+FORTIFIED nod) → areas → contact. Natural, offerings visible in first screenful after header, full list owned by one customer-facing section.

## Files Changed
- public/index.html (main)
- index.html (mirror)
- public/assets/css/site.css (grid only)
- POLISH-PASS-RECOMMENDATION.md (this)

## Next / Optional
- If more proof needed later: add 1-2 real photos (per EDITING-GUIDE + photo strategy in implementation-brief) for FORTIFIED-relevant (e.g. underlayment/wind-rated closeups already used).
- Review with owner: confirm "FORTIFIED roof work" card title + "qualifying homes" phrasing is accurate to capabilities.
- Test: load in browser (desktop + mobile), tap phones, confirm images, no text overflow on 5th card.
- Update EDITING-GUIDE or implementation-brief if this becomes new baseline.

This delivers the polish pass cleanly, surfaces everything requested early and naturally, honors conservative claims, preserves brand/hand-off simplicity.

---
*Implemented after full file reads (public/index.html, index.html, site.css, EDITING-GUIDE.md, implementation-brief.md, README.md, research brief), dir/image inventory, greps for claims/FORTIFIED, and image existence verification.*