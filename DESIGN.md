# Vera's Roofing Design System

Internal source of truth for agents and maintainers. This file is intentionally excluded from Vercel deployment.

## Why This Exists

The verified X post from Voxyz_ai said vague feedback such as "the colors look off," "the font is ugly," or "the spacing is weird" leads agents to ship defaults and then chase subjective nitpicks. For Vera's Roofing, every improvement loop must start from a concrete design system, a homeowner conversion goal, and current evidence from the live site or repo.

Replies to that X post were not accessible in the current session without sign-in. Do not invent reply themes. The related verified Voxyz_ai follow-up recommended a `DESIGN.md` containing color tokens, type scale, spacing rhythm, component patterns, and mood guidance. This file is Vera's project-specific version of that idea.

## Decision Rule

Before changing public files, write down the exact issue being solved:

- `Trigger`: browser comment, Gustavo note, live QA failure, automation output, competitor finding, or source inspection.
- `Surface`: one page, section, CTA group, image group, proof block, or SEO/discovery file.
- `Homeowner outcome`: clearer trust, faster call/inspection request, better understanding of roof/gutter services, or less visual friction.
- `Patch`: the smallest change that resolves the issue without changing unrelated approved design.
- `Verification`: static guard, mirror check, native/browser screenshot, live custom-domain capture, or deploy/release gate.

If a change cannot be tied to those five fields, do not patch it.

## Prompt-Derived Review Lanes

The signed-in X thread included eight useful lanes. Apply them to Vera only where they fit a static local-service website:

- `Design System`: consolidate repeated visual decisions into one source of truth before changing UI.
- `Accessibility + multi-device`: verify phone, tablet, desktop, contrast, keyboard movement, focus states, and image/button/form semantics.
- `DESIGN.md first`: use this file before every visual build or review so style does not drift.
- `UX audit`: inspect the actual homeowner path end to end before prescribing a fix.
- `One-page taste`: visual changes should use restrained palette, clear type scale, consistent radius/shadow, and no unrelated feature changes.
- `Interactions and states`: hover, focus, disabled, loading, success, and error states should be deliberate where the static site has controls.
- `Landing page that converts`: nail the value proposition and single primary action before adding more sections.
- `Form usability`: if a form is added later, it must handle validation, errors, success/failure, autofill, keyboard use, and long-form splitting.

Visible replies reinforced the same rule: vague feedback burns cycles. Convert "looks off" into an exact rule such as "non-clickable concern pills must be gray," "mobile CTA row is not centered," "light card body text is too low contrast," or "this image caption describes the obvious instead of why the process matters."

## Brand Mood

Vera's Roofing should feel like a premium coastal North Carolina roofing company: local, owner-led, careful, direct, sturdy, and photo-backed. It should not feel like a generic roofing template, a coupon site, a luxury fashion brand, or an AI/tech landing page.

Use real Vera work and proof-safe trust assets. Avoid stock-looking scenes, AI-generated work photos, unsupported awards, exaggerated storm statistics, and broad claims that sound better than the written proof.

## Color System

- `Primary CTA`: purple gradient used for real actions only, such as Request an Inspection, Call, Text, Email, Schedule, or Contact.
- `Secondary link CTA`: may use the same purple gradient when it is a real click path and needs conversion weight.
- `Non-clickable pills`: charcoal/gray surface with white text. Do not turn informational concern pills, tags, proof chips, or filter labels purple.
- `Dark backgrounds`: white or light gray text with strong contrast. Keep small uppercase labels readable.
- `Light backgrounds`: dark navy/charcoal text. Never place white text over pale gradients or faint purple fills.
- `Trust badges`: keep visually distinct from CTAs. Logos can sit on clean white/neutral plates, but should not look like buttons.

Avoid one-note purple pages. Purple is the brand accent and CTA signal, not the whole interface.

## Type System

- Display/headline type may use the existing condensed display style for large page headers only.
- Body copy should stay calm, readable, and homeowner-friendly.
- Small uppercase labels are acceptable, but they must remain readable on mobile and not stretch awkwardly across the viewport.
- Do not scale fonts by viewport width. Use responsive containers and explicit breakpoints.
- Letter spacing should be restrained; never negative.

## Layout Rhythm

- Mobile is primary. Every nav row, CTA group, pill row, logo row, footer link row, and proof-logo row must feel centered and symmetrical.
- Desktop should stay organized and premium, not oversized or overfilled.
- Tablet must not be a forgotten middle state. Check 768x1024 after mobile and desktop changes.
- Avoid broad CSS fixes. Patch the exact component or breakpoint that failed.
- Avoid nested cards and decorative card-on-card layouts.
- Reduce blank space only when it improves flow. Do not crowd text, logos, or images.
- Stable controls need stable dimensions so hover states, labels, captions, and dynamic text cannot shift layout.

## CTA Rules

Primary public conversion path:

1. Request an Inspection.
2. Call 910.228.8034.
3. View Recent Work or Email as supporting actions.

Use appointment/inspection language as the lead ask. Photo sharing can remain supportive, but the site should not make homeowners feel the burden is on them to diagnose the roof before calling.

Clickable CTAs should be visually clear and purple-weighted when they are important. Informational pills should remain gray.

## Copy Rules

Write naturally, like a careful roofing contractor talking to a homeowner:

- Lead with the problem, property type, local area, and next step.
- Use "roofing contractor," "roofer," "roof repair," "roof replacement," "roof leak," "gutter cleaning," and "gutter guards" naturally where they fit.
- Keep claims proof-safe. If written proof is missing, use "ask about," "can discuss," "may qualify," or "available on request."
- Do not publish unsupported percentages, rankings, review counts, guarantees, license numbers, or insurance details.
- Hand-nailing can be positioned as a precision/care differentiator only when phrased without unsupported industry-wide statistics.
- CertainTeed warranty language must remain conditional and tied to eligible materials, specifications, registration, written terms, and homeowner discussion.
- FORTIFIED language must respect the supplied proof: Gustavo completed the FORTIFIED Standard Roofing Contractor Exam and provider evidence exists, but the certificate itself says completion does not by itself imply FORTIFIED certification.

## Image Rules

- Real Vera job photos are preferred over stock or generated images.
- Crop out random purple lines, browser artifacts, and distracting borders.
- Remove duplicates unless the second use has a distinct conversion purpose.
- Captions should explain why the image matters to a homeowner, not merely describe the obvious visual.
- Use captions sparingly. If a section already explains the image category, individual photo captions should add process/trust meaning or stay short.
- Avoid overusing soft or low-detail photos in premium positions.

## Trust Proof

Minimum footer trust system:

- CertainTeed ShingleMaster credential badge, with conditional warranty/planning copy.
- FORTIFIED proof handled carefully as requirements/conversation evidence, not blanket certification language.
- Vera logo only where it strengthens the brand presentation. Do not force the Vera logo beside certificate logos when it creates visual imbalance.

Trust proof must be easy to understand without looking like a row of competing buttons.

## Funnel Pattern

The site should answer these questions in order:

1. Does Vera work in my area?
2. Can they handle my roof or gutter issue?
3. What proof shows they are careful and credible?
4. What should I do next?
5. What will happen after I reach out?

Every page should move a homeowner toward a call, inspection request, or clear next step without making the page feel pushy.

## QA Loop

After each meaningful patch:

1. Run static guards and mirror checks.
2. Inspect mobile, tablet, and desktop screenshots.
3. Confirm CTA color hierarchy: purple for links/actions, gray for non-clickable pills.
4. Confirm light-background text and dark-background text are readable.
5. Confirm no internal directives, competitor notes, agent notes, or unsupported claims are public.
6. After deploy, inspect the live custom domain, not just the preview URL.
7. Submit IndexNow only after the deployed custom domain is verified.
8. Triage automation outputs and act only on concrete, proof-safe findings.

The loop is not "take screenshots again." The loop is: find the next visible or conversion-relevant defect, patch narrowly, verify the actual improvement, then continue.
