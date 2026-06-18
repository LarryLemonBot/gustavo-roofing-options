# Editing Guide - Vera's Roofing LLC

This guide is for future edits without needing a maintenance package.

## Common text edits

Open the page you need to edit:

- Homepage: `public/index.html`
- Services and EPDM section: `public/services.html`
- Full photo gallery and all 9 EPDM photos: `public/photos.html`
- Service areas: `public/areas.html`
- Process: `public/process.html`
- Contact: `public/contact.html`

Search for the text you want to change. Most client-editable areas have comments like:

```html
<!-- CLIENT-EDIT: Main headline and intro copy. Keep this direct and phone-first. -->
```

After changing a `public/*.html` file, mirror the same file at the root if a root copy exists.

## Phone and email

Current phone:

```text
910.228.8034
```

Current email:

```text
verasroofing@gmail.com
```

When changing the phone number, update both:

```html
href="tel:+19102288034"
```

and the visible text:

```text
910.228.8034
```

When changing the email, update both:

```html
href="mailto:verasroofing@gmail.com"
```

and visible text.

## Replacing photos

Approved website images live here:

```text
public/assets/images/
```

Use descriptive filenames. Good examples:

```text
roof-copper-flashing-tight.jpeg
roof-storm-damage-inspection.jpeg
roof-synthetic-underlayment-prep.jpeg
hero-metal-roof-coastal.jpeg
```

Recommended image rules:

- Use real Vera's Roofing job photos when possible.
- Avoid stock photos unless clearly approved.
- Remove or crop house numbers, license plates, faces, timestamps, and identifying details unless approved.
- Keep image names descriptive.
- Try to keep images under 1 MB each.

To replace the homepage hero side-card image:

1. Put the new photo in `public/assets/images/`.
2. Open `public/index.html`.
3. Search for `hero-metal-roof-coastal.jpeg`.
4. Replace it with the new filename.

To replace the hero side-card image:

1. Put the new photo in `public/assets/images/`.
2. Open `public/index.html`.
3. Search for `roof-finished-home.jpeg` inside the `hero-card` block.
4. Replace the filename and update the `alt` text.

## Logo

Header logo currently used:

```text
public/assets/images/vera-roofing-logo-header-black-banner.jpg
```

This uses the client-supplied black-background Vera's Roofing logo and blends into the current dark header treatment.

Current responsive variants live in:

```text
public/assets/images/responsive/vera-roofing-logo-header-black-banner-*.jpg
```

Older logo-choice files and rejected logo variants should stay out of `public/` and remain archived outside the deploy tree. Do not restore older logo versions unless the client explicitly asks.


## Adding or editing service cards

For the homepage preview cards, open `public/index.html` and search for:

```html
<section class="section services" id="services">
```

The cards live inside:

```html
<div class="service-grid">
```

Copy one existing `<article class="service">...</article>` block and update:

- Image filename.
- Image `alt` text.
- Number label.
- Heading.
- Paragraph.

For full service details, open `public/services.html`. The EPDM section is:

Search for:

```html
id="epdm-flat-roofing"
```

Keep EPDM concise on the services page. The full coastal deck proof set belongs in:

```text
public/photos.html#epdm-carolina-beach
```

Use careful language for claims:

- Say `wind-mitigation`, `code-related roof-upgrade options`, or `roof-upgrade conversations` unless FORTIFIED credentials, scope language, and evaluator coordination are verified.
- Say `documentation for insurance claim conversations`, not `we handle insurance claims` or `guaranteed approval`.
- Say `Ask about available manufacturer warranty options for qualifying roofing systems`, not a blanket guarantee.

## Adding a new service area

Open `public/areas.html` and search for:

```html
<div class="area-list" aria-label="Service areas">
```

Add another tag:

```html
<span>Town Name</span>
```

## Copy style

Use direct, human, local language.

Good:

```text
We document visible roof damage and provide a written scope homeowners can use during insurance claim conversations.
```

Avoid:

```text
Insurance will pay for your roof.
```

Avoid unsupported claims like:

- Best roofer in Brunswick County.
- Guaranteed insurance approval.
- Family owned since a specific year, unless confirmed.
- Certified, GAF, BBB, FORTIFIED, financing, license, or warranty claims unless verified.

## Production deploy hygiene

`.vercelignore` excludes old archive and research material from deploy uploads. Keep old logo-choice pages and preview boards out of `public/` unless the client explicitly wants them public again.

## Deploy after edits

From this folder:

```powershell
.\scripts\sync-public-index.ps1
.\scripts\verify-public-mirrors.ps1
node qa/scripts/verify-final-mobile-visual-guards.mjs
vercel deploy --prod --yes --scope orbitals-projects
```

The scoped CLI deploy is the default path. Do not rely on an unscoped GitHub-triggered Vercel deploy for this site; it can route through the wrong team membership and fail before production is updated.

If you intentionally use the prebuilt path, verify the generated output before uploading it:

```powershell
vercel build --prod --yes --scope orbitals-projects
.\scripts\verify-vercel-output.ps1
vercel deploy --prebuilt --prod --scope orbitals-projects
```

Then open:

```text
https://verasroofing.com/
```

Check:

- `https://www.verasroofing.com/` redirects to the apex custom domain.
- `https://vera-roofing-review-public.vercel.app/` redirects to the apex custom domain.
- Header loads.
- Logo loads.
- Photos load.
- Phone button works.
- Homepage still has only the seven intended sections.
- Mobile nav/logo is not oversized.
- First viewport does not show duplicate call buttons.
- Service page EPDM section is concise.
- `photos.html#epdm-carolina-beach` still shows all 9 EPDM photos.
- Caption pills fit the text instead of stretching full-width.
- No old preview-board content appears.

Do not deploy if the public/root mirror verifier reports a mismatch. Fix the source files and re-run the verifier first.
