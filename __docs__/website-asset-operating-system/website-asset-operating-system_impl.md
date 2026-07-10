# Website Asset Operating System - Implementation Plan

**Audience:** Developers and Codex  
**Status:** Internal v1 implemented  
**Implementation rule:** Contract first, media later

---

## Architecture Verdict

Build a separate-product-style internal package and workflow, not a public app and not a customer-facing feature.

Target structure:

```text
.agents/
  skills/
    website-asset-factory/
      SKILL.md
      references/

__docs__/
  website-asset-operating-system/
  main-website/
  answerlattice/

packages/
  asset-factory/
    brand/
    slots/
    manifest/
    schemas/
    scripts/
    briefs/
    references/
    raw/
    working/
    published/

public/
  images/website/
  answerlattice-*.png
  answerlattice-splash/
```

## Existing Source Files To Reuse

| Existing file | Role |
| --- | --- |
| `__docs__/main-website/main-website_image-assets.md` | MenuList current asset rules and launch asset matrix. |
| `__docs__/main-website/README.md` | MenuList website canonical scope and stage history. |
| `scripts/website-assets/generate-stage6-assets.mjs` | Existing MenuList generated static asset script. |
| `__docs__/answerlattice/answerlattice-website/README.md` | Answerlattice public website route/component map. |
| `scripts/website-assets/generate-answerlattice-splash.js` | Existing Answerlattice static image generation script. |
| `src/app/sites/answerlattice/components/AnswerlatticeFlowDiagram.tsx` | Answerlattice visual language reference. |
| `src/app/sites/answerlattice/components/AnswerlatticeProofBlocks.tsx` | Answerlattice proof block reference. |
| `src/components/website/home/HeroSection.tsx` | MenuList hero asset consumption reference. |
| `src/components/website/home/SurfacesSection.tsx` | MenuList surfaces visual reference. |

## Files To Add In First Implementation

| File | Purpose |
| --- | --- |
| `.agents/skills/website-asset-factory/SKILL.md` | Triggered instructions for asset tasks. |
| `.agents/skills/website-asset-factory/references/menulist-asset-rules.md` | Compact MenuList asset rules for skill context. |
| `.agents/skills/website-asset-factory/references/answerlattice-asset-rules.md` | Compact Answerlattice asset rules for skill context. |
| `packages/asset-factory/README.md` | Internal package overview and workflow. |
| `packages/asset-factory/brand/menulist.asset-context.md` | MenuList brand and narrative rules. |
| `packages/asset-factory/brand/answerlattice.asset-context.md` | Answerlattice brand and narrative rules. |
| `packages/asset-factory/slots/menulist.asset-slots.ts` | MenuList website asset slot declarations. |
| `packages/asset-factory/slots/answerlattice.asset-slots.ts` | Answerlattice website asset slot declarations. |
| `packages/asset-factory/manifest/assets.json` | Asset registry. |
| `packages/asset-factory/schemas/asset-schema.ts` | Shared TypeScript slot/manifest types. |
| `packages/asset-factory/scripts/audit-assets.ts` | Slot/manifest/file/fingerprint audit. |
| `packages/asset-factory/scripts/review-assets.ts` | Quality and approval review. |
| `packages/asset-factory/scripts/generate-brief.ts` | Brief generator. |
| `packages/asset-factory/scripts/lock-fingerprints.ts` | Source-fingerprint locking after reviewed asset/source acceptance. |
| `packages/asset-factory/scripts/lib/asset-runtime.ts` | Shared local-file runtime helpers. |
| `packages/asset-factory/scripts/lib/asset-audit.ts` | Shared audit implementation used by audit and review scripts. |
| `packages/asset-factory/scripts/generate-missing-placeholder.js` | Internal placeholder generator for missing planned slots. |
| `packages/asset-factory/briefs/.gitkeep` | Brief output directory. |
| `packages/asset-factory/references/README.md` | Positive/negative reference-bank rules. |
| `.github/codex/prompts/asset-review.md` | Optional CI/review prompt once `.github` exists. |
| `src/config/features.ts` | Internal feature flag for the package boundary. |

## Package Scripts To Add

Use the repo's existing npm script style. Do not add pnpm-only commands unless the project migrates.

```json
{
  "assets:audit": "ts-node packages/asset-factory/scripts/audit-assets.ts",
  "assets:review": "ts-node packages/asset-factory/scripts/review-assets.ts",
  "assets:brief": "ts-node packages/asset-factory/scripts/generate-brief.ts",
  "assets:fingerprint": "ts-node packages/asset-factory/scripts/lock-fingerprints.ts",
  "assets:generate:missing": "node packages/asset-factory/scripts/generate-missing-placeholder.js"
}
```

If ESM friction appears, use `.mjs` scripts or a small Node runner instead of adding new runtime tooling.

## Asset Slot Shape

```ts
export type AssetSlot = {
  id: string;
  brand: 'menulist' | 'answerlattice';
  page: string;
  route: string;
  placement: string;
  type: 'static-image' | 'og-image' | 'loop-video' | 'product-demo-clip' | 'abstract-motion-video';
  required: boolean;
  intent: string;
  narrativeRules: string[];
  rejectionRules: string[];
  outputs: Array<{
    format: 'webp' | 'png' | 'jpg' | 'webm' | 'mp4';
    role: 'primary' | 'fallback' | 'poster' | 'social' | 'og';
    ratio?: '16:9' | '4:3' | '1:1' | '9:16' | '1200x630';
    maxKb: number;
  }>;
  destination: string;
  component?: string;
  approval: 'automatic' | 'founder-review' | 'founder-required';
  sources: string[];
};
```

## Manifest Shape

```json
{
  "version": 1,
  "updatedAt": "2026-05-31",
  "assets": {
    "menulist.home.hero.official-source": {
      "status": "generated",
      "brand": "menulist",
      "version": 1,
      "slot": "menulist.home.hero.official-source",
      "files": {
        "primary": "public/images/website/menulist-hero-official-source.webp",
        "og": "public/images/website/menulist-og-official-source.png"
      },
      "brief": "packages/asset-factory/briefs/menulist.home.hero.official-source.md",
      "sourceFingerprint": {
        "slot": "",
        "page": "",
        "brand": "",
        "demoFlow": ""
      },
      "review": {
        "decision": "approved",
        "strategicFit": 9,
        "brandFit": 9,
        "narrativeClarity": 8,
        "performance": "pass"
      }
    }
  }
}
```

## First MenuList Slots

| Slot | First status | Notes |
| --- | --- | --- |
| `menulist.home.hero.official-source` | Generated | Maps existing `menulist-hero-official-source.webp`. |
| `menulist.home.og.official-source` | Generated | Maps existing `menulist-og-official-source.png` and `public/og-image.png`. |
| `menulist.home.customer-browse.mobile-menu` | Generated | Maps existing public menu mobile visual. |
| `menulist.home.setup-relief.workflow` | Generated | Maps existing setup workflow visual. |
| `menulist.home.public-surfaces.matrix` | Generated | Maps existing surfaces matrix visual. |
| `menulist.home.analytics.status-proof` | Draft/supporting | Must not imply real customer metrics. |
| `menulist.launch.social.square` | Generated | Maps existing launch square image. |
| `menulist.launch.social.linkedin` | Generated | Maps existing LinkedIn image. |
| `menulist.launch.device.owner-pwa-dashboard` | Approved | Tracks the mounted owner-PWA device proof using categorical demo states only. |
| `menulist.home.hero.business-truth-loop` | Approved | Local HyperFrames/FFmpeg motion loop wired into the MenuList homepage hero with poster fallback. |
| `menulist.launch.video.frame.approved-source` | Approved | Opening launch-video frame extracted from the approved MenuList hero motion. |
| `menulist.launch.video.frame.public-surfaces` | Approved | Public-surfaces launch-video frame extracted from the approved MenuList hero motion. |
| `menulist.launch.video.frame.stable-loop` | Approved | Stable-loop launch-video frame extracted from the approved MenuList hero motion. |
| `menulist.launch.video.frame.final-proof` | Approved | Closing proof launch-video frame extracted from the approved MenuList hero motion. |

## First Answerlattice Slots

| Slot | First status | Notes |
| --- | --- | --- |
| `answerlattice.home.og.main` | Generated | Maps `public/answerlattice-og-image.png`. |
| `answerlattice.brand.logo.mark` | Generated | Maps current SVG/PNG logo mark assets. |
| `answerlattice.pwa.icons` | Generated | Maps `public/answerlattice-icon-*.png`. |
| `answerlattice.pwa.splash` | Generated | Maps `public/answerlattice-splash/apple-splash-*.png`. |
| `answerlattice.home.hero.support-control-motion` | Approved | Local HyperFrames/FFmpeg motion layer wired into the Answerlattice homepage hero with poster fallback. |
| `answerlattice.home.section.authority-transfer` | Approved | Local HyperFrames/FFmpeg authority-transfer motion wired into the Answerlattice learning-loop section. |
| `answerlattice.product.page-aware-widget.clip` | Approved | Local HyperFrames/FFmpeg product proof clip wired into the page-aware widget product page. |

## Audit Algorithm

1. Load slot files.
2. Load manifest.
3. Verify every required slot has a manifest entry.
4. Verify every manifest file exists.
5. Check file sizes against output budgets.
6. Verify every video slot has poster and fallback if required.
7. Hash slot file, source page/component, brand context, and demo-flow files.
8. Compare hashes with manifest source fingerprints.
9. Report missing, stale, oversized, disconnected, and approval-blocked assets.
10. Exit non-zero only for broken generated/approved assets; missing planned assets should be warnings until slots are marked blocking.

## Dependency Review

Do not add these in the first contract PR unless implementation proves they are needed:

| Dependency/tool | Status | Rule |
| --- | --- | --- |
| Playwright | Not installed | Add only with capture-flow scripts and test/dev dependency review. |
| Remotion | Not installed | Add only after license review and motion-template decision. |
| Motion Canvas | Not installed | Alternative to Remotion, not both by default. |
| FFmpeg | External binary | Prefer documented system binary or optional wrapper, not bundled heavy dependency. |
| OpenScreen | External app | Optional local finishing, not package dependency. |
| OpenVid | External/browser app | Optional finishing, not package dependency. |

## Validation Commands

For docs-only planning:

```bash
git diff --check
```

For first implementation:

```bash
npm run assets:audit
npm run assets:review
npm run assets:brief -- --slot menulist.home.hero.official-source
npm run assets:fingerprint
npx tsc --noEmit --incremental false
```

Do not run `npm run build` or any Vercel deploy unless explicitly requested in that session.
