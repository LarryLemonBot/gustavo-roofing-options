# Vera Roofing Automation Loops

These loops exist to keep the public site sharp after launch. They should produce decisions, not noise.

## Adaptive Loop Contract

Every loop must move the site forward from the previous result. Do not start a broad "improve everything" pass without first naming the evidence that triggered it.

Before acting, write or identify:

- `Trigger`: the exact prior report, browser comment, live screenshot, automation memory, customer feedback, or owner note that created the loop.
- `Scope`: the smallest page, component, copy block, image set, CTA group, SEO file, or QA script that can resolve the trigger.
- `Decision`: `ship`, `patch`, `backlog`, or `blocked`.
- `Patch rule`: fix only the named issue unless a directly adjacent defect would ship with it.
- `Verifier`: the narrowest machine check plus the required human screenshot review.
- `Next loop`: the next check must be prompted by the new verifier output, not by re-running the same broad prompt.
- `Stop condition`: stop when the verifier is clean, screenshots look public-ready, live custom-domain bytes match local deploy files, and remaining items are either blocked by proof/access or intentionally post-launch.

Useful loop shape:

1. Read the latest report and classify findings.
2. Patch the highest-leverage proof-safe issue.
3. Run the narrow verifier, then the release gate when deploy-relevant files changed.
4. Inspect the generated screenshots with human eyes.
5. Deploy only from a clean committed state.
6. Run live custom-domain QA, live deploy-surface verification, IndexNow, and automation triage.
7. Let those outputs define the next loop.

This keeps the process compounding: every pass either fixes a visible problem, closes a QA gap, records a non-action, or identifies a real blocker.

## Loop 1: Release Gate

Run before every deploy that changes copy, layout, images, navigation, CTAs, trust proof, or SEO files.

```powershell
node qa/scripts/run-release-gate.mjs
```

The command runs:

- static visual guards
- full-page screenshot QA
- cross-viewport symmetry QA
- readable contrast QA

It writes `qa/release-gate-*/release-gate-report.md` and `release-gate-report.json`.

Act on the output this way:

- `FAIL`: do not deploy. Fix the named blocker, rerun the gate, then inspect screenshots.
- `PASS` with action items: inspect the referenced screenshots manually before deploy.
- `PASS` with no machine blockers: still do a human mobile, tablet, and desktop review before deploy.

Human review must judge:

- homepage first-screen clarity
- mobile symmetry
- CTA placement and hierarchy
- copy that sounds like a homeowner would naturally think
- photo choice and crop quality
- trust proof without unsupported claims
- blank space that feels clean, not empty

## Loop 2: Post-Deploy Live Site Watch

Run after every production deploy and on the recurring live QA automation.

```powershell
node qa/scripts/capture-live-custom-domain-final-qa.mjs
```

The live capture writes a primary screenshot and a bottom/footer screenshot for every checked page and viewport. Inspect both. The top view catches first-impression and CTA issues; the bottom view catches footer crowding, blank-space drift, badge imbalance, and stale trust language.

The watch is only useful if the result turns into one of these decisions:

- `Ship`: no visual, copy, CTA, or trust-proof problem visible on the live custom domain.
- `Patch immediately`: broken page, unreadable text, asymmetry, awkward crop, unsupported claim, weak first viewport, or missing CTA.
- `Backlog`: improvement idea that would help conversion but is not a public-site defect.

The live pass must inspect `https://verasroofing.com`, not only a Vercel preview URL.

Then verify deployed bytes, discovery files, assets, and redirects:

```powershell
node qa/scripts/verify-live-deploy-surface.mjs
```

This verifier follows redirect chains from `vercel.json`, so old shared URLs and clean-url redirects must end at the intended public destination.

## Loop 3: Weekly Search And Lead Opportunity Review

This is a content and client-acquisition loop, not a redesign loop.

Review:

- storm, wind, hail, gutter, roof inspection, metal roof, EPDM, and FORTIFIED demand signals around Brunswick County, Wilmington, New Hanover County, Carolina Beach, Leland, Southport, Oak Island, Ocean Isle Beach, Shallotte, Hampstead, and nearby coastal NC
- local competitor offers and CTAs
- whether the homepage still answers the highest-intent homeowner questions quickly
- whether Google Business Profile, Facebook, Instagram, and website copy should get a small seasonal update
- whether `llms.txt`, `robots.txt`, page titles, meta descriptions, and structured data still match the public site

Recommended output:

1. Top 3 lead opportunities this week.
2. One copy/image patch if the website should change.
3. One Google Business or social post idea based on real services and real photos.
4. Claims to avoid until Vera's Roofing has written proof.
5. Whether to act now, backlog, or ignore.

Do not invent reviews, awards, warranty coverage, service areas, certifications, or performance statistics. Use only verified public sources or written proof from Gustavo.

## Loop 4: Roofing And Gutter Competitor Pattern Review

Run when Vera's Roofing adds or revises services, and at least weekly after launch.

Use the native Codex desktop browser for visual inspection. Start with current public traffic/search evidence, then inspect the actual sites.

Research lanes:

- roofing companies and roofing lead funnels: Erie Home, Power Home Remodeling, DaBella, Mighty Dog Roofing, Mr. Roof, Baker Roofing, Tecta America, and any newer high-traffic roofing company surfaced by Google, Similarweb snippets, or other public market pages
- gutter cleaning, gutter guard, and gutter repair companies: LeafFilter, LeafGuard, Gutter Helmet, Ned Stevens, The Brothers That Just Do Gutters, All American Gutter Protection, and any newer high-traffic gutter site surfaced by public sources
- local Brunswick County, Wilmington, and New Hanover County roofing competitors when the change affects local positioning

Inspect each useful competitor at desktop and mobile.

For every inspected site, record:

- source link or search evidence that made the site worth inspecting
- first-screen headline, CTA, phone/quote path, and service promise
- whether the site uses a form, call button, text button, chat widget, review widget, badge row, or visual proof
- which images/videos are carrying trust, problem recognition, or finished-work proof
- whether the site has video or audio; if media duration is exposed, stay on the page at least that long before judging it; if media is muted, looping, or cross-origin and duration/audio is not exposed, record that limitation
- one lesson worth considering for Vera's Roofing
- one pattern to avoid because it feels too aggressive, cluttered, unsupported, generic, or off-brand for Vera

Apply only targeted Vera changes:

- clearer homeowner words
- stronger roof/gutter concern labels
- cleaner CTA hierarchy
- better image placement or captions
- proof-safe trust language
- SEO/discovery updates that match actual site content

Do not copy competitor claims, offers, badges, review counts, warranties, pricing, guarantees, or urgency language unless Gustavo provides written proof that Vera can say the same thing.

## Loop 5: Automation Output Triage

Run on the recurring `Vera Roofing Automation Output Triage` automation and whenever an automation posts useful findings into this thread.

Inputs:

- latest saved output or memory from `vera-roofing-live-visual-conversion-qa`
- latest saved output or memory from `vera-roofing-gutter-competitor-review`
- latest local QA reports under `qa/`
- live browser comments or Gustavo feedback that arrived after the last deploy

Classify every finding:

- `ACTION`: concrete, proof-safe, narrow, and likely to improve homeowner conversion, trust, symmetry, readability, image fit, CTA clarity, gutter/roof findability, or live QA reliability.
- `NON-ACTION`: interesting but too broad, unsupported, already handled, not visible to users, or lower value than the current launch gate.
- `BLOCKED`: needs written proof, an approved asset, account access, a live credential, or a decision from Gustavo or Alex.

For `ACTION` items, patch narrowly, preserve root/public mirrors, and rerun the relevant verifier. Do not bundle unrelated visual sweeps into an automation-output fix.

## Current Quality Thresholds

- Mobile homepage target height: under 8400px unless a new high-value section justifies the length.
- Mobile services target height: under 26000px unless service detail is intentionally expanded.
- All public pages: zero horizontal overflow, zero broken images, zero empty alt text, zero unsupported-claim hits, zero readable-contrast failures.
- Live deploy surface: all HTML, discovery files, referenced assets, and configured redirects must match or resolve as intended on `https://verasroofing.com`.
- CTAs: clickable links and primary calls can use the purple gradient; non-clickable concern pills should stay restrained grey.
- Captions: use only when they help a homeowner understand the work. Avoid captions that merely describe obvious photo content.
