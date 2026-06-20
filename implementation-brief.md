# Implementation Brief: Vera's Roofing LLC Website Enhancements
**Context:** Local static site review (public/index.html + root mirror, public/assets/css/site.css, public/assets/images/). Real Gustavo photos from archive/preview-choice-board-2026-06-02/gustavo-roofing-options/ (hero-photos/, album-photos/). Current safe service positioning: roofing, EPDM, storm documentation, gutter cleaning, gutter guard installation, copper flashing, metal and specialty details, hand-nailed shingle work only when included in the agreed scope, owner-led final review, CertainTeed roof-system warranty questions for eligible projects, and FORTIFIED Home program-requirement conversations when applicable.
**Constraints honored:** Static/plain HTML+CSS only (handoff-friendly, use existing CLIENT-EDIT comment pattern). ONLY real Gustavo photos (curated descriptive from archive first; no stock/AI). NO unsupported claims (no "FORTIFIED certified", no "insurance guaranteed/approved", no "best roofer", no unverified "50 year warranty" without manufacturer backing + labor phrasing, no specific founding year). Phone-first conversion. Conservative Brunswick County coastal tone (practical, trustworthy, premium details without fluff). Self-contained in public/assets. Review of EDITING-GUIDE.md, README.md, research/brunswick-roofing-market-brief.md, and full site + multiple images completed via tools before drafting. No existing files edited.

## Highest-impact content sections (ranked 1-5)
Ranked by conversion/owner-craft proof impact for local coastal service. Exact section names, suggested placement relative to existing structure, Gustavo services mapped, key safe copy bullets. Insert with `<!-- CLIENT-EDIT: ... -->` markers per EDITING-GUIDE. Mirror changes to root index.html.

1. **Specialty Roofing & Details** (new or augmented after current services grid; id="specialties" or integrate as additional .service cards in existing .service-grid if keeping 3-col on desktop)
   - Placement: Immediately after `</div>` closing the current services .service-grid (after #services section), before #storm "Storm Ready". Highest impact: surfaces full Gustavo offerings early, after proof-strip and basic 3 services, before storm focus.
   - Maps to: copper flashing, works with copper, EPDM, Hyperstock, cedar shake, FORTIFIED Home program questions, hand-nailed shingle work when in scope, owner-led final review, CertainTeed roof-system questions, gutter cleaning, gutter guards, and "plus more".
   - Key safe copy bullets (4-5 cards total; extend current 01-03 lightly, add 04-05; use existing .service HTML pattern for handoff):
     - Retain/adjust 01 Tear-offs & replacements (map core roofing/storm damage).
     - Retain/adjust 02 New construction roofing (map new builds + framing).
     - Retain/adjust 03 Repairs & storm work (map storm damage + inspections).
     - 04 Copper flashing & specialty details: Precision copper flashing, custom transitions, and work with premium systems including metal, EPDM membranes, and cedar shake. Details finished for salt air and wind exposure.
     - 05 Hand-nailing & roof-system questions: When hand-nailing is included in the agreed shingle scope, it gives the crew deliberate control over nail placement and depth. Eligible CertainTeed roof systems may qualify for manufacturer warranty options depending on current written terms, products, installation requirements, registration, transfer rules, and property type.
   - Why #1: Directly covers source-of-truth without fluff; phone CTA can link here or to contact. On mobile stacks cleanly.

2. **Storm Ready & Documentation** (update existing #storm section; minor title tweak or subhead)
   - Placement: Keep current location (after services/specialties). 
   - Maps to: storm damage, insurance claims, FORTIFIED roofs, inspections, repairs.
   - Key safe copy bullets (enhance existing split layout + .check-list):
     - Keep core: "Ready for wind, rain, and salt air." + para on humidity/sun/wind/storm season + clean flashing/edges/penetrations.
     - Update/expand .check-list:
       - Roof inspections and visible damage documentation
       - Metal and shingle roof options
       - Repair recommendations explained in plain language
       - Questions about FORTIFIED Home program requirements welcomed when applicable
       - Detailed photo documentation to support your insurance claim process (homeowner contacts insurer first)
     - Add/keep text-link: "Request a roof inspection" (tel).
   - Why #2: Builds trust for storm-prone Brunswick market per research; conservative insurance language only.

3. **Craft & Warranties** (new lightweight section or heavy enhancement to existing dark .why "Why" section; reuse .why-grid / .why-items / .quote-card patterns)
   - Placement: Keep/replace current #why location (after #work "Our Work", before #areas). Or insert a compact "Owner craft" row between Our Work and current Why if splitting. Highest for proof of "hand nailed and inspected by owner".
   - Maps to: hand-nailed shingle work when in scope, owner-led final review, CertainTeed roof-system questions for eligible systems, clean sites, photo documentation, written scopes, and local coastal experience.
   - Key safe copy bullets (reorder/add why-items; keep quote-card copper image for visual tie-in):
     - "Owner-led final review": The owner reviews finished-work photos and key details before the project is considered complete.
     - "Manufacturer warranty questions": Eligible CertainTeed systems may qualify for manufacturer warranty options when products, installation, registration, property type, transfer rules, and written terms are satisfied.
     - Retain/adjust: Written estimates, Photo documentation, Clean job sites, Local coastal focus.
     - Optional quote update: "Clear expectations, clean work areas, owner inspection, and enough documentation for the homeowner."
   - Why #3: Elevates Gustavo differentiator (owner involvement) without hype; dark premium fits existing visual.

4. **Our Work** (expand existing #work "Our Work" gallery)
   - Placement: Keep current (after Storm Ready).
   - Maps to: all visual proof of copper, metal, shingle, new construction, storm response, flashing.
   - Key safe copy: Keep intro "Actual Vera roofing photos" + "Every image here comes from Vera's Roofing work...". Add captions noting specialty where relevant. Expand grid by 2-4 items (see photo strategy).
   - Why #4: Real photos = strongest proof per research and tone; phone-friendly scroll.

5. **Areas + Contact refinements** (minor updates to existing #areas and #contact)
   - Placement: Keep at end.
   - Maps to: Brunswick County service (Southport etc.).
   - Key safe copy: Add subtle nod in areas head or contact para: "Copper, metal, and specialty work across Brunswick County and nearby coastal NC." Keep lists and CTAs. Update contact p slightly for "practical next step, written scope, and photo-backed documentation."
   - Why #5: Closes loop with phone/email; low effort, high consistency.

Additional: Light hero/hero-card tweaks (rank ~6 but high visibility) for specialties mention. Proof-strip: keep 3 items or swap one to "Owner-inspected | Copper details | Free estimate".

## Photo strategy
Use ONLY real Gustavo photos. Curated descriptive names from archive first. Copy/rename to public/assets/images/ (follow EDITING-GUIDE: descriptive "roof-*.jpeg", <1MB preferred, remove identifying details). Update src + alt in public/index.html + mirror root index.html. No wholesale archive copy.

- **Keep (current public/assets/images/ are strong real-job quality):** 
  - hero-metal-roof-coastal.jpeg (hero bg + services; black metal coastal panorama impact).
  - roof-finished-home.jpeg (services 01; clean finished shingle + dormer).
  - roof-shingle-inspection.jpeg (services 03; damage close-up proof for repairs/storm).
  - roof-copper-flashing-tight.jpeg, roof-copper-flashing-polished.jpeg, roof-copper-flashing-long.jpeg (gallery + why; premium copper details).
  - roof-blue-metal-panorama.jpeg (gallery wide + contact bg).
  - roof-silver-metal-neighborhood.jpeg and remaining metal-roof gallery images.
  - roof-clean-shingle-detail.jpeg (storm split).
  - vera-roofing-logo-approved.jpg (header + hero-card; approved version only).

- **Replace/minor swaps (for better fit/variety without loss):** 
  - Consider roof-clean-shingle-detail.jpeg vs archive clean-shingle-storm-detail.jpeg (latter shows more context/yard if sharper for storm).
  - Rotate one metal in gallery with archive equivalent if fresher (e.g. blue-metal-clean-panorama.jpeg source).

- **Add specific new from archive (exact filenames; copy then rename per guide style for consistency):**
  - `framing-progress.jpeg` (album-photos) → `public/assets/images/roof-framing-progress.jpeg`. Target: New construction service card (02) or add as tall/wide work-item in #work gallery; or new progress detail in specialties. Shows real build framing for "new construction".
  - `construction-progress.jpeg` (album-photos) → `public/assets/images/roof-construction-progress.jpeg`. Target: Specialties or expanded gallery; elevated coastal home under roof work + worker context. Strong new construction proof.
  - `premium-coastal-black-metal.jpeg` (album-photos) → `public/assets/images/roof-premium-coastal-black-metal.jpeg`. Target: Hero variant (if swapping bg) or gallery lead + specialties metal/copper strip. Ocean view + house = high coastal impact for phone hero scroll.
  - `storm-response-shingle.jpeg` (album-photos) → `public/assets/images/roof-storm-response-shingle.jpeg` (CROP bottom timestamp/address "Jan 10... 113 Rockledge Road Wilmington New Hanover County" first; not Brunswick but similar coastal work). Target: Storm Ready or repairs gallery item or new storm detail.
  - `clean-shingle-storm-detail.jpeg` (hero-photos) → `public/assets/images/roof-clean-shingle-storm-detail.jpeg` (if not duplicate of current). Target: Storm split or gallery.
  - Copper variants for dedicated detail: `copper-flashing-clean-detail.jpeg`, `copper-flashing-long-detail.jpeg` (hero-photos) → `roof-copper-flashing-clean-detail.jpeg` etc. (note some archive copper-detail-brick.jpeg has overlay; crop if used). Target: New "Copper craft strip" (3-col grid of closeups) inserted after #work or in Craft & Warranties for proof emphasis.
  - Others if needed for rotation: `bright-metal-sky-detail.jpeg`, `silver-metal-neighborhood.jpeg`, `blue-metal-clean-panorama.jpeg` (hero-photos) → rename with roof- prefix. Use in expanded work-grid.

- **Quantity & layout targets:** Current 5 in .work-grid (with .wide/.tall spans). Expand to 7-8 figures total. Add 2-3 small coppers in new .detail-strip (reuse grid CSS or simple divs) after gallery or in specialties. 1-2 progress shots in services/new construction emphasis or Why quote area. Total new adds: 4-6 max to avoid bloat.
- **Order for phone impact & proof:** Hero (wide coastal metal first). Services (finished home + progress). Storm (clean shingle/inspection). Gallery: lead wide panorama (premium-coastal or blue-metal), coppers next (detail proof), shingle/storm/response, neighborhood. Mobile: all stack 1-col (existing CSS handles). Scroll order builds from big picture → craft details → trust.
- **Alt text patterns (local, benefit, descriptive, no hype):** 
  - "Premium copper flashing detail on coastal brick home - hand-finished by Vera's Roofing for salt air protection, Brunswick County NC."
  - "Roof framing in progress on new coastal construction home - Vera's Roofing, owner-inspected hand-nailing."
  - "Storm response shingle work on residential roof - documented damage assessment and repair, Brunswick County area."
  - "Finished shingle roof with dormer on coastal North Carolina home - clean tear-off and replacement by Vera's Roofing."
  - "Black metal coastal roof panorama with ocean view - standing seam installation for wind and weather."
- **Notes:** Some archive images (storm-response-shingle, copper-detail-brick) contain date/address overlays - crop/remove in editor before copying to public/assets/images/. If full-album-export on MacBook path has cedar/EPDM/owner-inspect variety (e.g. cedar-shake-coastal-detail.jpeg, epdm-membrane-seam.jpeg, owner-hand-nail-inspection.jpeg, hyperstock-or-specialty-close.jpeg), pull 2-3 real ones, rename descriptively (roof-cedar-shake-*.jpeg), add to gallery or copper/specialties strip with "cedar shake install detail" or "EPDM flat roof transition" alts. Current archive lacks them; do not invent or use pngs from photos/ (illustrative, not real job photos). Update any new images in CSS if hero bg swap (search for filename).

## Visual hierarchy changes
Minimal only. Preserve existing clean patterns, responsive grid, colors (plum/purple/gold/paper), Antonio/Manrope, shadows, radii, mobile sticky call. No frameworks, no breakage risk. Focus emphasis on owner craft, warranties, copper/specialties for Gustavo source-of-truth. Handoff: use existing classes (.service, .work-item, .why-item, .check-list, .split, .wrap) + light new CSS if needed (document in comments).

- **HTML structure notes (inserts only):**
  - Services: Extend .service-grid with 2 more <article class="service"> for 04/05 (or add new <section class="section specialties" id="specialties"> after services with similar head + smaller cards or 3-col detail strip). Use `<!-- CLIENT-EDIT: expand services for copper/EPDM/cedar/owner-inspect/warranties per Gustavo -->`.
  - After #work gallery: optional compact <div class="copper-strip"> or reuse work-grid for 3 copper closeups (new files).
  - Why: Reorder .why-items (owner inspect + warranties first), add 1-2 items using existing article.why-item. Keep .quote-card (copper img good tie to specialty). Add `<!-- CLIENT-EDIT: emphasize owner hand-nail + manufacturer warranty language -->`.
  - Storm: Add 1-2 <li> in existing .check-list. No layout change.
  - Hero/hero-card: Minor text update in .card-copy h2/p (e.g. "Tear-offs. New roofs. Copper details. Warranties."). Keep proof-strip.
  - Gallery .work-grid: Add more <figure class="work-item"> (use existing .wide/.tall sparingly; CSS already handles mobile collapse to 1fr).
  - Contact/areas: Light para tweaks.
  - Overall flow: Hero (phone CTAs) → proof → services/specialties (Gustavo map) → storm+doc → work (visual proof) → craft/warranties (owner diff) → areas → contact (phone/email). Good existing phone-first.

- **Mobile priorities:** Existing @media (max-width:1020px) and 760px/430px already stack services (block), work (1col), grids (1fr), hero (col), nav (2col + phone full). New sections must use .wrap + existing padding. Keep .mobile-call. Large tap targets on all tel: and buttons. De-emphasize non-CTA elements on small screens if needed (e.g. hero-card logo secondary).
- **CSS tweaks (minimal, append to site.css only if structure requires; prefer HTML-first):**
  - For expanded services or new strip: `.service-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }` (or keep 3 and let wrap; test). Or new `.detail-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }` + `.detail-strip img { height: 160px; object-fit: cover; border-radius: 16px; }` (reuse --line, --gold accents).
  - Accent for owner/copper: Existing .service span (purple), .why-item, gold buttons. Add e.g. `.why-item:first-child { border-color: var(--gold); }` sparingly.
  - No changes to :root, body, .hero, .proof-strip, .section, .work-grid, .contact-card, .mobile-call, reduced-motion. Avoid gold-plating.
  - Hero bg swap: update .site-header { background: ... url("/assets/images/newfile.jpeg") ... }
  - Comment new rules: `/* CLIENT-EDIT: minimal grid support for added specialty cards / copper strip */`
- **De-emphasize:** Hero-card logo repetition (keep for quick visual but secondary to CTAs). Overload proof-strip (keep 3). Generic "repairs" without storm/inspection tie. Old preview sites/ ideas reviewed only for hierarchy (e.g. more service cards, progress shots) - not copied.
- **Benefits:** Better flow to owner craft (differentiator), copper/specialties proof (source-of-truth), safe claims in context. Responsive remains solid. Low risk of breakage.

## Claims-safe wording
6-10 ready-to-paste examples (conservative, local, benefit-oriented, phone/conversion friendly). Use exactly or adapt; all map to EDITING-GUIDE safe examples ("We document visible roof damage and provide a written scope."). Place with CLIENT-EDIT comments. Gustavo to final-approve.

1. **Hero intro (replace current p.intro if enhancing specialties mention):**
   `Vera's Roofing LLC handles tear-offs, new construction roofing, repairs, storm repairs, and roof inspections for Brunswick County homes and nearby coastal communities. We focus on copper flashing, hand-nailed installations personally inspected by the owner, and manufacturer-backed warranties on qualifying roofs. Expect clean work, clear communication, and details that matter in wind, rain, and salt air.`

2. **Hero-card h2 + p (in .card-copy):**
   `Tear-offs. New roofs. Copper details. Warranties.`
   `Call for a practical next step, a written scope, and photo-backed roof documentation when needed.`

3. **Services 04 new card (after 03 in grid or new section):**
   `<span>04</span>`
   `<h3>Copper flashing &amp; specialty details</h3>`
   `<p>Precision copper flashing, custom transitions, and work with premium systems including metal, EPDM membranes, and cedar shake. Details finished for salt air and wind exposure common on the Brunswick County coast.</p>`

4. **Services 05 new card:**
   `<span>05</span>`
   `<h3>Owner-inspected hand-nailing &amp; warranties</h3>`
   `<p>When hand-nailing is included in the agreed shingle scope, the crew can slow down and control nail placement and nail depth. Eligible CertainTeed roof systems may qualify for manufacturer warranty options depending on the selected materials, installation requirements, registration, property type, transfer rules, and current written terms.</p>`

5. **Storm Ready check-list addition (append to existing ul.check-list):**
   `<li>Detailed photo documentation to support your insurance claim process</li>`
   `<li>Questions about FORTIFIED Home program requirements welcomed when applicable</li>`

6. **Storm Ready safe insurance para (update existing p in .split-copy or add):**
   `Brunswick County roofs take a steady beating from humidity, sun, wind, and storm season. Vera's Roofing focuses on the details that prevent avoidable callbacks: clean flashing transitions, secure roof edges, tidy penetrations, and documentation when storm damage needs review. We provide photo documentation and written scopes to help with your insurance claim process after you contact your insurer.`

7. **Why / Craft item (new or first .why-item):**
   `<article class="why-item">`
   `<h3>Owner-led final review</h3>`
   `<p>The owner reviews finished-work photos and key details at the end of the job so the final walkthrough is clear.</p>`
   `</article>`
   `<article class="why-item">`
   `<h3>Manufacturer-backed warranties</h3>`
   `<p>Eligible CertainTeed roof systems may qualify for manufacturer warranty options depending on the selected materials, installation requirements, registration, property type, transfer rules, and current written terms.</p>`
   `</article>`

8. **Copper / specialty call (in services, new strip, or Why quote update):**
   `Copper flashing provides long-term corrosion resistance ideal for the Brunswick County coast.`

9. **Contact / areas refinement (in .contact-card p or areas head):**
   `Request an inspection, describe the roof or gutter concern, and share photos if they help. You'll get a practical next step, written scope, and photo-backed documentation when appropriate - not pressure. Copper, metal, EPDM, cedar, gutters, guards, and FORTIFIED Home program-requirement conversations when applicable across Southport, Oak Island, Leland, Shallotte, Supply, Holden Beach, Ocean Isle Beach, Sunset Beach, Calabash, Bolivia, St. James, and nearby coastal NC.`

10. **Proof-strip or footer-adjacent safe line (optional 4th item or swap):**
    `Owner-inspected | Copper &amp; metal details | Written scopes for claims | Free estimate`

**Additional guidance:** Keep direct/local ("Brunswick County", town lists, "salt air", "wind and rain"). All examples avoid guarantees, certifications, "best", specific years, or unbacked warranty/insurance claims. FORTIFIED public copy should stay limited to "FORTIFIED Home program requirements" or "FORTIFIED Home program questions" with project-specific qualifiers. Insurance always "support your... process" + "homeowner contacts insurer". Update phone/email only via existing patterns (tel:+19102288034, verasroofing@gmail.com). After HTML edits, verify images load, phones work, no console errors, then deploy per README.md (`vercel deploy --prod --yes --scope orbitals-projects`).

This brief is self-contained, actionable for handoff, and prioritizes safety + impact while covering Gustavo offerings fully and conservatively. Review with Gustavo before implementation.

---
*Prepared after full tool-based inspection: list_dir on ., public/, public/assets/images/, archive/.../hero-photos/, album-photos/, photos/; full read_file on public/index.html, index.html (mirror), public/assets/css/site.css, research/brunswick-roofing-market-brief.md, README.md, EDITING-GUIDE.md; multimodal read_file on 12+ key .jpeg (current approved + archive variants: hero-metal-roof-coastal, copper tight/polished, finished-home, shingle-inspection, storm-inspection-detail, black-metal-panorama, construction-progress, premium-coastal-black-metal, storm-response-shingle, copper-detail-brick, framing-progress, neighborhood-home-exterior, clean-shingle-storm-detail, finished-home-no-address, etc.); terminal ls for complete image inventories; grep for image refs, patterns, and md content.*
