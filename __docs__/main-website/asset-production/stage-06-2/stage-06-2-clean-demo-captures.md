# Stage 6.2 Clean Demo Captures

**Date:** May 17, 2026  
**Status:** Completed  
**Scope:** Private browser-rendered screenshot board and synthetic demo captures for marketing asset planning

## Scope Guardrail

- No production app route was added.
- No tenant, store, project, menu, analytics, or customer data was read or written.
- No pricing, payment, subscription, Razorpay, billing, auth, onboarding, or `/create-menu` runtime code was touched.
- No third-party extracted menu data was used.
- Captures use synthetic MenuList-owned demo data only.

## Why This Pass Exists

Stage 6.1 created safe synthetic image assets under `public/images/website/`. Stage 6.2 adds browser-rendered captures that are easier to review as screenshot sources and future composite references.

These files are not final customer proof. They are private source material for:

- hero composition review,
- screenshot-slot validation,
- visual hierarchy QA,
- future real-demo-tenant capture planning,
- launch-asset direction.

## Capture Source

The source board is:

- `__docs__/main-website/asset-production/stage-06-2/demo-screenshot-board.html`

It is a docs-only HTML board. It is not imported by the website app and is not placed under `public/`.

The board supports capture mode through a query parameter:

```text
http://localhost:4179/demo-screenshot-board.html?shot=hero-official-source
```

## Demo Identity

- Business: `The Daily Plate`
- Location: `Indiranagar, Bengaluru`
- Data type: synthetic demo data only
- Currency style: `Rs.`
- Positioning: owner-approved public source, Official Business Page, public menu, setup/review/publish flow, public-surface matrix, analytics confirmation

## Captured Files

Captures are stored under:

```text
__docs__/main-website/asset-production/stage-06-2/captures/
```

| Capture | File | Role |
| --- | --- | --- |
| Hero official-source composite | `hero-official-source.png` | Hero/OG composition reference |
| Mobile public menu | `public-menu-mobile.png` | Customer browse proof reference |
| Official Business Page | `official-business-page.png` | Public-presence proof reference |
| Setup/review workflow | `setup-review-workflow.png` | Setup-relief proof reference |
| Public surfaces matrix | `public-surfaces-matrix.png` | Multi-surface consistency reference |
| Analytics proof | `analytics-proof.png` | Post-publish owner confirmation reference |

## Capture Method

The board was served locally from the docs folder:

```bash
cd __docs__/main-website/asset-production/stage-06-2
python3 -m http.server 4179 --bind 127.0.0.1
```

Captures were exported with local headless Chrome. Example:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=1500 \
  --window-size=1472,860 \
  --screenshot=__docs__/main-website/asset-production/stage-06-2/captures/hero-official-source.png \
  "http://localhost:4179/demo-screenshot-board.html?shot=hero-official-source"
```

## Quality Review

- Captures were visually inspected after export.
- The first hero export had overlap issues; the board was tightened and the hero was recaptured.
- All final capture files avoid real customer identifiers, real phone numbers, real addresses, private tenant IDs, debug overlays, and third-party menu data.
- Public surfaces language explicitly avoids automatic Google, Instagram, or WhatsApp sync claims.
- Analytics capture is labelled as synthetic demo metrics and avoids customer identities, revenue, exact GPS, and private behavior claims.

## Publishing Rule

Do not place these raw captures in `public/` without a separate review pass.

To publish a screenshot-led asset:

1. Replace synthetic demo states with a founder-approved demo tenant or keep the synthetic identity explicitly approved.
2. Reconfirm no real or third-party customer data appears.
3. Compress final public exports to the file-size targets in `main-website_image-assets.md`.
4. Update website metadata or homepage visuals only after the final exported asset is approved.

## Next Step

Prepare a founder-approved demo tenant when real product screenshots are required. Until then, use Stage 6.1 public assets as safe launch placeholders and Stage 6.2 captures as private art-direction references.
