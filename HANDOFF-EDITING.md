# Vera's Roofing site editing handoff

## Source of truth

Edit `public/index.html` first. The root `index.html` is only a deploy mirror.

After editing `public/index.html`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-public-index.ps1
```

## Contact info

The shared contact hrefs live in:

```text
public/assets/js/site-config.js
```

Update that file first if the phone number or email changes. The HTML still keeps readable fallback text for no-JavaScript browsers and search engines.

## SEO and share previews

The canonical URL, Open Graph tags, Twitter tags, favicon links, robots.txt, and sitemap.xml currently use:

```text
https://vera-roofing-review-public.vercel.app/
```

If Vera gets a final custom domain, update those URLs before launch.

## Deploy

```powershell
vercel deploy --prod --yes --scope orbitals-projects
```

## Claim guardrails

Do not add claims such as `FORTIFIED certified`, `one of very few`, grants, insurance approval, awards, or warranty guarantees unless Gustavo provides written proof.