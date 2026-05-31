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
npm run assets:generate:missing -- --slot answerlattice.home.hero.support-control-motion
```

## Operating Rules

1. Audit first.
2. Generate a brief before generating or editing any asset.
3. Keep product identities separate.
4. Do not move raw/working captures into `public/`.
5. Do not publish real customer screenshots without founder approval.
6. Do not add Remotion, Playwright, Motion Canvas, FFmpeg wrappers, OpenScreen, or OpenVid as package dependencies until a specific implementation plan justifies it.
7. Run `npm run assets:fingerprint` only after generated/approved assets and their watched sources are intentionally accepted.
8. Do not add Firebase, Vercel deploys, public routes, or scheduled jobs for this package.

## Product Boundary

Website Asset Operating System is an internal product architecture. It is separate from MenuList and Answerlattice runtime behavior, but it reads both product contexts to keep website assets current.

It can later be evaluated as a market-facing product only after repeated internal use proves the workflow and an external buyer is validated.
