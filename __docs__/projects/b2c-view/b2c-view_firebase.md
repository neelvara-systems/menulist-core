# B2C View — Firebase and Storage Boundary

**Status:** Local source-cost evidence; not current launch certification
**Last Updated:** July 17, 2026

The prior estimate-based note is preserved in `_archive/b2c-view_firebase-pre-2026-07-16.md`. This maintained document records operation shape from current source and does not publish speculative monthly cost totals.

**Launch boundary:** Current approval still requires the [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md), Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

## Data model

Menu design adds no collection. It is stored under `config.design.menu` and `config.design.brand` in the canonical project document at `projects/{tId}/{sId}/{projectId}`. The current summary/published-truth/cache effects belong to the shared project mutation/publish flow rather than a parallel design record.

Prepared menu backgrounds use the canonical public-media path:

```text
media/menuBackground/{tenantId}/{storeId}/{entityId}/{mediaId}_{variant}.webp
```

The exact extension and variant follow the `menuBackground` media profile. The older `MenuListAi/project/assets/{projectId}/background` path is not the current prepared-media contract.

## Read and write shape

| Flow | Current source behavior | Cost boundary |
| --- | --- | --- |
| Open desktop/mobile design editor | Uses the project already loaded by the existing project provider/editor flow | No design-only listener or duplicate Firestore collection |
| Publish standalone design | `publishProject()` reads current project truth, checks the expected mutation version, then uses the shared standalone project transaction and post-commit truth/cache path | Existing project publish reads/writes; no additional normalization read/write |
| Publish linked-outlet design | Reads current outlet project and linked master truth, then calls protected `/api/projects/outlet-save` with `publish: true` | Existing linked-outlet policy transaction plus post-commit truth/cache path |
| Prepare background | Client-side image preparation | No Firestore operation |
| Upload pending background | One or more immutable prepared-media variant object uploads, according to the media profile | Storage writes only; returned URL is included in the existing project publish |
| Verify acknowledged public publish | Best-effort `verifyMenuPublish` callable when `ENABLE_MENU_HEALTH_MONITOR` is enabled | Existing health-monitor store-scope reads, HTTP verification, health write, and optional lifecycle-notification work; failure does not roll back the acknowledged publish |

Design-only changes do not increment the master operational-change signal or append a multi-outlet menu-revision observation. The shared project DAL reuses the same operational diff result for both writes, so theme/layout/background-only saves keep the canonical project mutation, public cache invalidation, publish truth, and existing POS handoff without an unrelated observation write. Actual item, price, availability, variant, and category changes retain both operational behaviors.

## Storage lifecycle

Background objects are immutable/content-addressed public media with the shared `public_asset_until_replaced_or_deleted` retention policy. A failed or ambiguous project publish does not prove the object is unreferenced across retries, duplicates, or outlet projections, so this feature does not add destructive cleanup, a reference collection, or a scheduler. That bounded retention decision favors customer-output safety over speculative reclamation.

## Scale and index posture

- Design normalization is pure in-memory work.
- Public rendering does not issue a design-specific Firestore read.
- No new query, listener, composite index, Firestore rule, Storage rule, Function, or scheduler was added in the July 16 pass.
- Large menus no longer use an estimated-height category placeholder; removing that client approximation changes no Firebase operations.
- Public cache invalidation remains one post-commit shared project operation rather than a per-control write.
- Cosmetic design saves do not create a `menuChangeLog` multi-outlet revision row. This removes one optional Firestore write per non-operational save while keeping operational menu-change history intact.

## Verification boundary

`npm run verify:menu-design-presentation-boundary` source-gates the design save path, standalone/linked publish acknowledgement, published-truth and cache calls, mobile parity, public normalization, active option prices, background admission, and docs. It does not run live Firestore/Storage operations, Firebase or Vercel deploys, provider smoke, browser/mobile customer-menu QA, or target production smoke.
