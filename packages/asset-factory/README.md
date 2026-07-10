# Website Asset Operating System Package

**Status:** Internal v1 implemented  
**Public runtime:** Disabled  
**Public marketing:** Disabled  
**Architecture:** Separate-product-style package inside the shared repo

This package gives Codex and future operators a durable contract for MenuList and Answerlattice website assets.

It does not publish a route, add Firebase reads or writes, create a customer-facing app, or expose a public product. It is built like a separate product internally so the architecture can be tested against our own products before any extraction decision.

## Answerlattice Relationship

AssetOS is Answerlattice-adjacent, not Answerlattice runtime.

The package can read Answerlattice website files, docs, brand context, and approved source summaries when generating briefs or checking whether a visual is stale. A later adapter may read Answerlattice product-surface, intake, release, signal, or drift summaries as source context.

The package must not write Answerlattice KB content, canonical answers, tickets, support signals, widget configuration, product surfaces, Firebase data, or runtime state.

## What Lives Here

| Path | Purpose |
| --- | --- |
| `brand/` | Product-specific asset context for MenuList and Answerlattice. |
| `slots/` | Typed declarations for every website asset slot. |
| `manifest/assets.json` | Registry of generated, draft, missing, approved, and planned assets. |
| `schemas/asset-schema.ts` | Shared TypeScript types for slots and manifest entries. |
| `scripts/audit-assets.ts` | Local audit for missing, stale, oversized, approval-blocked, and disconnected assets. |
| `scripts/review-assets.ts` | Local review summary for manifest and slot quality. |
| `scripts/generate-brief.ts` | Brief generator for a slot before any asset work begins. |
| `scripts/lock-fingerprints.ts` | Locks watched source hashes after accepted asset/source changes. |
| `raw/` and `working/` | Local-only media staging. Do not commit raw/working media. |
| `published/` | Approved package-level generated outputs that are not public website assets. |

## Commands

```bash
npm run assets:audit
npm run assets:review
npm run assets:brief -- --slot menulist.home.hero.official-source
npm run assets:fingerprint
npm run assets:fingerprint -- --slot menulist.home.hero.official-source
npm run assets:launch:frames
npm run assets:generate:missing -- --slot answerlattice.home.hero.support-control-motion
node scripts/website-assets/generate-assetos-motion-compositions.mjs
node scripts/website-assets/transcode-assetos-motion-assets.mjs
node scripts/website-assets/generate-assetos-motion-compositions.mjs --approve-manifest
```

## Creative Helper Skills

AssetOS can use installed creative skills as helpers after a slot brief exists:

| Skill | Use |
| --- | --- |
| `imagegen-frontend-web` | Website hero images, section assets, browser mockups, social images, and product-proof compositions. |
| `imagegen-frontend-mobile` | Phone mockups, mobile screenshots, onboarding frames, and app-store-style visuals. |
| `brandkit` | Brand boards and identity exploration for new or materially refreshed brands. |
| `image-to-code-skill` | Converting an approved visual reference into implementation guidance. |

These skills do not override AssetOS. The manifest, slot file, brand context, source files, approval level, and audit/review commands remain the authority.

## Operating Rules

1. Audit first.
2. Generate a brief before generating or editing any asset.
3. Keep product identities separate.
4. Do not move raw/working captures into `public/`.
5. Do not publish real customer screenshots without founder approval.
6. Use local HyperFrames plus FFmpeg by default for MenuList video and motion assets; cloud video tools or parallel render stacks require explicit founder approval for the specific asset.
7. Do not add Remotion, Playwright, Motion Canvas, FFmpeg wrappers, OpenScreen, or OpenVid as package dependencies until a specific implementation plan justifies it.
8. Run `npm run assets:fingerprint -- --slot <slot-id>` only after a generated/approved asset and its watched sources are intentionally accepted. Use all-slot `npm run assets:fingerprint` only when every non-missing asset in the manifest has been reviewed against current sources.
9. Do not add Firebase, Vercel deploys, public routes, or scheduled jobs for this package.
10. If a better asset workflow requires a repo-rule change, update the AssetOS docs and skill instructions rather than leaving the decision only in chat.

## Motion Asset Path

Current short website motion clips use HyperFrames source folders under `__docs__/videos/hyperframes/`, local MP4 source renders under each folder's `renders/` directory, and final public webm/mp4/poster outputs declared in `manifest/assets.json`.

The local flow is:

1. Generate/update deterministic HyperFrames source with `node scripts/website-assets/generate-assetos-motion-compositions.mjs`.
2. Run each source folder's `npm run check`.
3. Render each source MP4 with `npm run render -- --output ./renders/<slug>-source.mp4 --workers 1 --experimental-fast-capture=false --quiet`.
4. Transcode public outputs with `node scripts/website-assets/transcode-assetos-motion-assets.mjs`.
5. Approve the manifest only after visual review with `node scripts/website-assets/generate-assetos-motion-compositions.mjs --approve-manifest`.
6. Lock fingerprints and rerun `npm run assets:audit` and `npm run assets:review`.

For coordinated MenuList launch packs, reuse approved website, social, and device slots. Run `npm run assets:launch:frames` to refresh editorial keyframes from the approved business-truth loop instead of creating a parallel video stack.

## Product Boundary

Website Asset Operating System is an internal product architecture. It is separate from MenuList and Answerlattice runtime behavior, but it reads both product contexts to keep website assets current.

It can later be evaluated as a market-facing product only after repeated internal use proves the workflow and an external buyer is validated.
