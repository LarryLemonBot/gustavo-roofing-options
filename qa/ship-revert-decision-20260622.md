# Vera Roofing Ship/Revert Decision Sheet - 2026-06-22

## Current Decision

No production deploy is authorized from this sheet. The current local source is QA-clean for the exact changed surfaces, but production is still behind local source and the worktree is intentionally dirty.

## Ship Candidates

These changes are coherent and should be shipped together if the decision is to publish the current local improvement pass.

| Surface | Exact Files | Ship Rationale | Revert Cost |
| --- | --- | --- | --- |
| Homepage helper copy and exact low-res service-card image | `index.html`, `public/index.html`, `public/assets/css/site.css` | Shortens the first-screen helper paragraph and prevents the exact EPDM deck service image from being rendered larger than its available source quality. | Homepage returns to longer helper copy and a visibly softer low-res service-card image. |
| Services image sizing and copper wording | `services.html`, `public/services.html`, `public/assets/css/site.css` | Fixes exact source selection for a roof repair image, improves the CertainTeed badge source choice on mobile, removes repeated copper wording, and keeps the exact EPDM strip as compact thumbnails. | Image-quality QA would likely regress on selected service images, and copper copy would regain the repeated `finished` wording. |
| Photos EPDM grids | `photos.html`, `public/photos.html`, `public/assets/css/site.css` | Applies compact source-limited rendering to the exact low-resolution EPDM grids instead of using a broad roofing-type rule. | Low-resolution EPDM project photos may again read as enlarged/pixelated in gallery layouts. |
| Contact active-water routing and SMS CTA | `contact.html`, `public/contact.html` | Makes urgent-water routing clearer, changes the hero SMS CTA to `Text Photos + Town`, and adds `Water actively coming in: yes / no` to the message template. | Contact flow becomes less specific for urgent leaks and less photo/town oriented. |
| Gutter guard wording | `gutter-cleaning-guards.html`, `public/gutter-cleaning-guards.html` | Softens direct guard-install wording into a proof-safe repeated-clog/guard-options framing. | Public copy returns to a stronger guard-install claim. |
| Hash-scroll reliability | `public/assets/js/site-config.js` | Adds extra hash-scroll scheduling points for late-loading layouts and browser page restore. | Anchor links may be more fragile on slow loads. |
| Mobile logo sizing | `public/assets/css/site.css` | Keeps the enlarged mobile/interior logo sizing from the pending local visual pass. | Mobile logo returns to the smaller previous sizing. |
| QA workflow and gates | `.gitignore`, `README.md`, `qa/VISUAL-QA-WORKFLOW.md`, `qa/scripts/run-release-gate.mjs`, `qa/scripts/triage-automation-outputs.mjs`, `qa/scripts/verify-rendered-touch-targets.mjs`, `qa/scripts/verify-image-render-quality.mjs`, `qa/final-gpt55-xhigh-subagent-review-20260622.md` | Makes the GPT 5.5 xhigh final review durable, adds image render quality QA to the release gate, fixes triage wording/drift detection, and hardens visual readiness checks. | Future deploy checks lose the exact image-quality gate and the saved final-review artifact. |

## Current Evidence

- Public/root mirrors: pass.
- Image render quality: `qa/image-render-quality-20260622T181809Z/image-render-quality-report.json`, `issueCount: 0` across 21 captures.
- Latest local release gate: `qa/release-gate-20260622T175221Z/release-gate-report.json`, `allPassed: true`; it was run with dirty-tree override and is not production clearance.
- Latest live deploy-surface: `qa/live-deploy-surface-20260622T181959Z/live-deploy-surface-report.json`, `issueCount: 7`.
- Latest automation triage: `qa/automation-output-triage-20260622T182052Z/automation-output-triage-report.json`, blocked by deploy-relevant dirty files and live/local drift.
- Final GPT 5.5 xhigh review record: `qa/final-gpt55-xhigh-subagent-review-20260622.md`.

## If Shipping

1. Keep the ship candidates together; do not split root mirrors from matching `public/` files.
2. Run a clean release gate without `ALLOW_DIRTY_RELEASE_GATE=1`.
3. Run a fresh GPT 5.5 xhigh final review and update `qa/final-gpt55-xhigh-subagent-review-20260622.md`.
4. Deploy only after explicit approval.
5. After deploy, run live deploy-surface, live custom-domain capture, IndexNow, and automation triage.

## If Reverting

Revert the deploy-relevant site surfaces as groups, not one file at a time:

- homepage pair plus image CSS
- services pair plus image CSS
- photos pair plus image CSS
- contact pair
- gutter pair
- `public/assets/js/site-config.js`

Keep the QA workflow improvements unless the decision is to abandon the image-quality/GPT 5.5 xhigh deploy gate.
