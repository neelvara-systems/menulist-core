# MenuList Coordinated Launch Pack

**Generated:** July 10, 2026  
**Status:** AssetOS-approved synthetic asset set — not launch, publication, or deploy certification
**Governance:** Website Asset Operating System  
**Demo identity:** The Daily Plate, Indiranagar, Bengaluru

## Purpose

This record binds the current MenuList website, social, device, and launch-film derivatives into one governed launch pack. It reuses approved product visuals where they already exist and adds only the missing AssetOS connections and film keyframes.

> **Publication boundary:** AssetOS approval means a named file passed its slot, brand, source, size, and synthetic-data review. It does not authorize MenuList launch, public distribution, website deployment, social posting, paid use, or production certification. Those actions still require the active production-readiness audit, External Certification Runbook evidence, current AssetOS fingerprints, founder approval where the slot requires it, applicable browser/device and production-host QA, and explicit deploy or distribution action.

## Data Policy

- Fictional demo business and menu data only.
- No real customer names, screenshots, testimonials, reviews, private identifiers, phone numbers, or tenant data.
- No automatic Google, Instagram, WhatsApp, POS, delivery, payroll, CRM, or accounting sync claims.
- No invented activity counts, growth percentages, or performance metrics.
- Treat every asset as a demo product visual, not live customer proof.

## Shared Creative Direction

- Calm light product-proof system with MenuList blue, ink, white, and restrained green status accents.
- The Daily Plate remains the single business identity across the coordinated pack.
- Product UI and public surfaces carry the story; there are no generic restaurant photos, AI motifs, gradients, or floating decoration.
- The narrative stays: current menu -> owner review -> approved source -> customer link and public surfaces.

## Pack Contents

| Use | AssetOS slot | File | Runtime status |
| --- | --- | --- | --- |
| Website hero motion | `menulist.home.hero.business-truth-loop` | `public/images/website/menulist-business-truth-loop.webm` | Mounted on `/` with MP4 and poster fallbacks |
| Website static fallback | `menulist.home.hero.official-source` | `public/images/website/menulist-hero-official-source.webp` | CSS background fallback and OG source |
| LinkedIn launch | `menulist.launch.social.linkedin` | `public/images/website/menulist-linkedin-launch.png` | Distribution asset, not runtime-mounted |
| Square social launch | `menulist.launch.social.square` | `public/images/website/menulist-launch-square.png` | Distribution asset, not runtime-mounted |
| Owner device proof | `menulist.launch.device.owner-pwa-dashboard` | `public/images/website/product-proof/owner-phone-dashboard.webp` | Mounted on `/features/owner-phone-dashboard` |
| Film opening frame | `menulist.launch.video.frame.approved-source` | `packages/asset-factory/published/menulist/launch-video-frames/01-approved-source.png` | Internal launch derivative |
| Public-surfaces frame | `menulist.launch.video.frame.public-surfaces` | `packages/asset-factory/published/menulist/launch-video-frames/02-public-surfaces.png` | Internal launch derivative |
| Stable-loop frame | `menulist.launch.video.frame.stable-loop` | `packages/asset-factory/published/menulist/launch-video-frames/03-stable-loop.png` | Internal launch derivative |
| Closing proof frame | `menulist.launch.video.frame.final-proof` | `packages/asset-factory/published/menulist/launch-video-frames/04-final-proof.png` | Internal launch derivative |

## Regeneration

```bash
node scripts/website-assets/generate-stage6-assets.mjs
npm run assets:launch:frames
npm run assets:brief -- --all
npm run assets:audit
npm run assets:review
```

The launch-film frames are editorial derivatives of the approved local HyperFrames render. Regenerate the HyperFrames composition first only when the motion narrative, source UI, or brand rules change.

## Approval Notes

- The website hero motion and its poster were already approved through AssetOS.
- The square launch asset remains unchanged and uses The Daily Plate.
- The LinkedIn asset was regenerated to remove the prior cross-business mismatch and now uses The Daily Plate.
- The owner-device image was already public and mounted; this pass adds the missing AssetOS slot.
- The four film frames are deterministic extracts from the approved six-second motion loop. The closing frame uses the clean 5.40-second proof state; the prior 4.90-second capture intersected a one-frame mask/render artifact and is not retained.
- Current approval is per manifest slot and per file. It does not convert the coordinated set into launch approval.
