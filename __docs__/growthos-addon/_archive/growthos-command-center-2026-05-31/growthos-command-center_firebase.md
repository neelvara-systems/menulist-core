# GrowthOS Command Center - Firebase Cost Contract

**Status:** Proposed cost model for separate GrowthOS. MenuList Today wedge is paused and has `$0.00` Firebase cost.  
**Created:** May 31, 2026

---

## Cost Position

The implemented MenuList Today wedge adds no Firebase cost.

It also remains disabled. The blocker is owner-value confidence, not Firebase cost.

If implemented as separate GrowthOS, GrowthOS Command Center must be summary-first, on-demand, and paid-gated before provider work. It must not introduce broad collection scans, realtime listeners, standalone scheduled functions, or direct public publishing in the first approved build.

## Implemented Today Wedge

| Operation | Firebase cost |
| --- | --- |
| Build Weekly Growth Pack from already-loaded Today/store/project data | 0 reads |
| Copy pack text to clipboard | 0 writes |
| Direct publishing | Not implemented |
| Scheduler | Not implemented |
| Provider call | Not implemented |

The current implementation uses `src/lib/today/weeklyGrowthPack.ts` behind `ENABLE_TODAY_WEEKLY_GROWTH_PACK`. The flag stays `false`. It does not use any GrowthOS collection.

## Proposed Collections

| Path | Purpose | Cost rule |
| --- | --- | --- |
| `platformSummary/growthos_{sId}` | One-read command center summary. | Write only when action summary hash changes. |
| `growthActions/{tId}/{sId}/{actionId}` | Bounded action lifecycle docs. | Write only generated/changed actions. TTL/archive old actions. |
| `growthAssets/{tId}/{sId}/{assetId}` | Asset metadata and provenance. | Store metadata only; media goes to Storage. |
| `growthBrandProfiles/{tId}/{sId}` | Approved tone, rejected phrases, claims, colors. | Write only on explicit owner edit/approval. |
| Existing `aiOperations` | Provider usage accounting. | Reuse existing AI ledger pattern. |

## Open Command Center

| Operation | Estimated cost |
| --- | --- |
| Read `platformSummary/growthos_{sId}` | 1 read |
| Optional read existing `platformSummary/campaigns_{sId}` | 1 read |
| Optional read existing `platformSummary/projects_{sId}` | 1 read |
| Writes | 0 |

Target: 1-3 reads per open.

## Generate Freshness Actions

| Operation | Estimated cost |
| --- | --- |
| Read store/business summary | 1 read |
| Read project summary | 1 read |
| Read campaign/growth summary | 1 read |
| Write changed action docs | 0-7 writes |
| Write summary hash | 0-1 write |

Rules:

- Generate on demand.
- Diff by signal hash.
- Do not rewrite unchanged actions.
- Do not scan all projects or all reviews.
- Use existing compact summaries wherever possible.

## Generate Weekly Growth Pack

| Operation | Estimated cost |
| --- | --- |
| Read selected source item/project/store docs | 2-4 reads |
| Reserve/check AI capacity | Existing subscription/credit reads/writes per current AI pattern |
| Provider call | Paid AI/provider operation |
| Write AI operation ledger | 1 write |
| Write generated asset metadata | 1 write per asset |
| Upload media to Storage | Only if generated media exists |
| Update action status | 1 write |
| Update summary hash | 0-1 write |

Rules:

- No provider call before entitlement/capacity check.
- No base64 media in Firestore.
- No hidden fanout per surface.
- No direct external publishing in first implementation.

## Approve, Ignore, Export

| User action | Firestore operations |
| --- | --- |
| Approve action | 1 action write, 0-1 approval event write |
| Edit asset text | 1 asset write, 0-1 action write |
| Ignore action | 1 action write, 0-1 summary write |
| Export asset | 1 export/status write only if export history is required |
| Archive expired action | 1 action write, or batch cleanup through approved maintenance scheduler |

## Public Cache Invalidation

First implementation should not write public MenuList truth.

If an approved implementation writes public-facing `projects` or `stores` truth, it must use MenuList-owned write paths and invalidate public cache tags through the existing contract:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`

GrowthOS must not create a parallel direct Firestore write path for public truth.

## Scheduler Position

No new standalone scheduler for GrowthOS planning.

If scheduled cleanup or summary refresh is required in the MenuList Firebase project, it must use the consolidated MenuList maintenance scheduler pattern instead of a new standalone scheduled Cloud Function.

## Cost Guardrails

| Guardrail | Requirement |
| --- | --- |
| Summary-first UI | Command Center loads from `platformSummary/growthos_{sId}`. |
| On-demand generation | No nightly full-store action generation until usage proves value. |
| Hash writes | Do not rewrite unchanged action summaries. |
| No listeners | Use pull/read pattern, not realtime command-center listeners. |
| Bounded action count | Keep active visible actions to 7 by default. |
| Provider gating | Entitlement and capacity check before AI calls. |
| Storage discipline | Generated images/files in Storage with lifecycle policy. |

## Cost Impact

No runtime Firebase cost change in this session. Proposed implementation adds bounded reads/writes only after approval and coding.
