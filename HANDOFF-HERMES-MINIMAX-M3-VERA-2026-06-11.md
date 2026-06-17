# Vera's Roofing Website Handoff - 2026-06-11

## Status

The Vera's Roofing public review site is updated, verified locally, and deployed to production.

- Live alias: https://vera-roofing-review-public.vercel.app/
- Production deployment: https://vera-roofing-review-public-cjg6ni3n0-orbitals-projects.vercel.app
- Vercel deployment id: `dpl_HteNkDGNikUXKWXyrkbDrX3sDEH9`
- Vercel status: `Ready`
- Last verified: 2026-06-11 03:25 ET

## What Changed

- Replaced the wrong low-slope/flat-roof service-card image with a real EPDM Carolina Beach deck waterproofing photo.
- Added a dedicated homepage EPDM project section with 9 real Carolina Beach photos.
- Added a dedicated `/photos.html#epdm-carolina-beach` gallery category with the same 9 project photos.
- Reworded Gustavo's flagged contradiction:
  - Old: `The owner reviews the finished roof before the job is complete.`
  - New: `The owner reviews the work before final cleanup and closeout.`
- Removed public `Hyperstock` copy from deployable HTML.
- Removed the unused stock/reference EPDM placeholder asset from `public/assets/images`.
- Updated `public/sitemap.xml` lastmod dates to `2026-06-11`.
- Kept root `index.html` and `photos.html` synced with `public/index.html` and `public/photos.html`.
- Added this handoff file to `.vercelignore` so it is not deployed publicly.

## Files Changed

- `index.html`
- `photos.html`
- `public/index.html`
- `public/photos.html`
- `public/assets/css/site.css`
- `public/sitemap.xml`
- `.vercelignore`
- `public/assets/images/epdm-deck-carolina-beach-01.jpg`
- `public/assets/images/epdm-deck-carolina-beach-02.jpg`
- `public/assets/images/epdm-deck-carolina-beach-03.jpg`
- `public/assets/images/epdm-deck-carolina-beach-04.jpg`
- `public/assets/images/epdm-deck-carolina-beach-05.jpg`
- `public/assets/images/epdm-deck-carolina-beach-06.jpg`
- `public/assets/images/epdm-deck-carolina-beach-07.jpg`
- `public/assets/images/epdm-deck-carolina-beach-08.jpg`
- `public/assets/images/epdm-deck-carolina-beach-09.jpg`
- `HANDOFF-HERMES-MINIMAX-M3-VERA-2026-06-11.md`

Removed:

- `public/assets/images/roof-epdm-flat-roof-reference.jpg`

## MacBook Access Path

Successful path into the MacBook:

```powershell
ssh -i $env:USERPROFILE\.ssh\larrybuildsai_codex_alex_laptop -o IdentitiesOnly=yes alex@100.88.153.118 "hostname; whoami"
```

Verified response:

```text
Mac.lan
alex
```

Use normal SSH with the explicit key. The `tailscale ssh` wrapper hit strict host-key behavior in this run, while the explicit key path worked.

## Album Export

Remote Photos album:

- Apple Photos library: `/Users/alex/Pictures/Photos Library.photoslibrary`
- Album name: `Vera Roofing`
- Album id: `183`
- Album assets found: `58`
- Exported image files: `58`
- Missing files: `0`

Local copy:

```text
C:\Users\alexl\Documents\Codex\LarryBuildsAI\local-only\vera-roofing-recovery\macbook\vera-roofing-photos-export-2026-06-11
```

Important local files:

- `manifest.csv`
- `files\vera-roofing-album-01-46E32326-D0F0-46B7-9A49-74BDFDF4CD7D.jpeg` through the full 58-photo album set
- `contact-sheet-newest-9-epdm-candidates.jpg`

The export preserved source evidence in `manifest.csv`, including Photos timestamps, original/derivative source kind, file paths, byte counts, and SHA-256 hashes.

## 9 EPDM Photos Used

Selection basis: the 9 newest `Vera Roofing` album items by Apple Photos `created_utc` and `added_utc`, visually inspected on the generated contact sheet as the Carolina Beach EPDM/deck waterproofing job.

| Site file | Album export file | Photos created UTC | Photos added UTC | Source kind |
| --- | --- | --- | --- | --- |
| `epdm-deck-carolina-beach-01.jpg` | `vera-roofing-album-01-46E32326-D0F0-46B7-9A49-74BDFDF4CD7D.jpeg` | 2026-06-10 11:31:56 | 2026-06-10 19:43:46 | original |
| `epdm-deck-carolina-beach-02.jpg` | `vera-roofing-album-02-A222BE57-7504-4607-B822-0D7EB412C0F1.jpeg` | 2026-06-10 11:31:11 | 2026-06-10 19:43:43 | derivative-best-available |
| `epdm-deck-carolina-beach-03.jpg` | `vera-roofing-album-03-C6B5A5E1-0718-4007-A28C-A4E119EFD1BB.jpeg` | 2026-06-10 11:30:52 | 2026-06-10 19:43:43 | derivative-best-available |
| `epdm-deck-carolina-beach-04.jpg` | `vera-roofing-album-04-ABAFB944-DE67-4187-A4D2-8483AFD51D32.jpeg` | 2026-06-10 10:36:35 | 2026-06-10 19:43:41 | derivative-best-available |
| `epdm-deck-carolina-beach-05.jpg` | `vera-roofing-album-05-A8273E94-26AF-4942-8457-59A6890499D3.jpeg` | 2026-06-10 10:36:35 | 2026-06-10 19:43:40 | derivative-best-available |
| `epdm-deck-carolina-beach-06.jpg` | `vera-roofing-album-06-FC0577CD-1748-4137-9335-B6C79F6E9BE7.jpeg` | 2026-06-10 10:36:35 | 2026-06-10 19:43:39 | derivative-best-available |
| `epdm-deck-carolina-beach-07.jpg` | `vera-roofing-album-07-38F7AC2B-6C53-4167-9ACE-A528EA71F055.jpeg` | 2026-06-10 10:34:57 | 2026-06-10 19:43:38 | derivative-best-available |
| `epdm-deck-carolina-beach-08.jpg` | `vera-roofing-album-08-702EA523-7093-489D-A727-026212528F11.jpeg` | 2026-06-10 10:34:52 | 2026-06-10 19:43:37 | derivative-best-available |
| `epdm-deck-carolina-beach-09.jpg` | `vera-roofing-album-09-D4F59CC0-7D0B-4CE1-A315-1E4E74A1A050.jpeg` | 2026-06-10 10:34:46 | 2026-06-10 19:43:35 | derivative-best-available |

Optimized site image sizes:

- `01`: 69,208 bytes
- `02`: 43,996 bytes
- `03`: 44,205 bytes
- `04`: 40,655 bytes
- `05`: 42,978 bytes
- `06`: 39,168 bytes
- `07`: 45,563 bytes
- `08`: 39,967 bytes
- `09`: 41,356 bytes

No private MacBook paths are exposed in the public website. Private source paths remain only in the local manifest.

## Copy Notes For Gustavo

Gustavo's feedback is addressed:

- The low-slope/flat-roof card now uses an EPDM/deck waterproofing image instead of the wrong roof style.
- The owner-inspection line no longer says the finished work is inspected before it is complete.
- The EPDM gallery copy avoids time-sensitive wording like `current project`, so the website remains accurate after the job is no longer active.
- The EPDM work is described as project documentation and waterproofing detail work, not as a fake award, guarantee, or completed-system claim.

## Verification Commands And Results

Static site build status:

```text
no package.json - static site, no npm build step
```

Root mirror hashes:

```text
index mirror: True 264A73B657FF74EF916CA46BBEFF6D96C48E4AE4F353E9A9FE54BE39767ADB53
photos mirror: True B101B6F4DC887F128F7462DA617BF27BE14EA287718AFEB54C77A0C7FD3F7DA4
```

Stale-copy scan:

```text
specific-stale-scan PASS
```

Local asset HTTP scan:

```text
checked_urls=35
asset-http PASS
```

Local browser QA:

- Desktop `1366x900`: no horizontal overflow, stale checks false, homepage EPDM images `11`, gallery EPDM figures `9`.
- Phone `390x844`: no horizontal overflow, stale checks false, homepage EPDM images `11`, gallery EPDM figures `9`.

Production deployment:

```powershell
C:\Users\alexl\AppData\Roaming\npm\vercel.cmd deploy --prod --yes --scope orbitals-projects
```

Result:

```text
Production  https://vera-roofing-review-public-cjg6ni3n0-orbitals-projects.vercel.app
Aliased     https://vera-roofing-review-public.vercel.app
```

Production inspect:

```text
status  Ready
id      dpl_HteNkDGNikUXKWXyrkbDrX3sDEH9
target  production
alias   https://vera-roofing-review-public.vercel.app
```

Live HTTP checks:

```text
/ 200 text/html; charset=utf-8
/photos.html 200 text/html; charset=utf-8
/sitemap.xml 200 application/xml
/assets/images/epdm-deck-carolina-beach-01.jpg 200 image/jpeg 69208
/assets/images/epdm-deck-carolina-beach-09.jpg 200 image/jpeg 41356
```

Live browser QA:

- Desktop `1366x900`: no horizontal overflow, stale checks false, homepage H1 is `Roofing and waterproofing built for coastal homes.`
- Desktop gallery: EPDM figures `9`, paragraph is permanent wording.
- Phone `390x844`: no horizontal overflow, stale checks false, homepage and gallery render with correct EPDM counts.

## Remaining Assumptions

- The 9 EPDM images are treated as the Carolina Beach EPDM/deck waterproofing set because they are the newest items in the Vera Roofing album and visually match the deck/low-slope EPDM job.
- Eight of the 9 EPDM files came from best available Apple Photos derivatives because their full originals were not locally present inside the Photos library package. They were not upscaled for the website.
- Warranty and FORTIFIED language remains conservative and avoids claiming certification, designation, or guaranteed outcomes.

## Next Review Checklist

When showing Gustavo:

1. Open https://vera-roofing-review-public.vercel.app/
2. Review the new homepage EPDM section.
3. Open https://vera-roofing-review-public.vercel.app/photos.html#epdm-carolina-beach
4. Confirm the 9 EPDM photos are the right job and the captions feel accurate.
5. Confirm the owner-review wording reads correctly.
6. Decide whether any EPDM photo should be swapped, cropped differently, or removed for privacy/jobsite reasons.
