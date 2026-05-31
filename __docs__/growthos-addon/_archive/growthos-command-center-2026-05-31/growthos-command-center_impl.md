# GrowthOS Command Center - Technical Implementation Plan

**Status:** Candidate technical plan for separate GrowthOS. MenuList Today wedge implemented but paused behind a disabled flag.  
**Created:** May 31, 2026

---

## Implementation Gate

Stop before coding unless all are true:

1. Founder explicitly approves active GrowthOS work.
2. Product Evolution Doctrine gate is satisfied or explicitly overridden.
3. Product Separation Doctrine write boundary is resolved.
4. GrowthOS route/domain/product id are approved.
5. Firebase cost contract is accepted.

This gate still applies to any separate GrowthOS app, route, database, scheduler, or publishing workflow.

## Paused MenuList Today Wedge

The first implementation is not GrowthOS Command Center. It is a gated Today enhancement inside MenuList.

Product decision after review: keep it off. Do not freeze or roll it out until owner need and usability are proven through a small pilot.

| Layer | Implemented path |
| --- | --- |
| Flag | `src/config/features.ts` -> `ENABLE_TODAY_WEEKLY_GROWTH_PACK` defaults to `false` and remains paused. |
| Shared copy builder | `src/lib/today/weeklyGrowthPack.ts` |
| Desktop card | `src/components/templates/main-app/today/components/WeeklyGrowthPack/` |
| Mobile card | `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx` |
| Desktop host | `src/components/templates/main-app/today/index.tsx` |
| Mobile host | `src/components/mobile/screens/MobileHoursScreen.tsx` |

Implementation boundaries:

- deterministic client-side copy only
- no AI provider call
- no direct external publishing
- no new Firestore write path
- no scheduler
- no GrowthOS route/domain/product id activation

Revisit gate:

- real owner uses it without explanation
- owner copies/shares output during the session
- mobile presentation is compact and optional
- Today truth fixes continue to appear before growth copy

## Current Codebase Anchors

| Existing surface | Evidence | Reuse decision |
| --- | --- | --- |
| Social Content toggle | `src/config/features.ts:281` | Reuse as proof that GrowthOS-like output already exists. Do not duplicate blindly. |
| Campaign type model | `src/types/campaigns.ts:11` | Reuse concepts where possible; create GrowthAction only if needed. |
| Campaign engine | `src/lib/campaigns/engine.ts:274` | Reuse scoring/selection patterns. |
| Today summary read | `src/database/campaigns/index.ts:76` | Follow summary-first read pattern. |
| Protected generation API | `src/app/api/campaigns/generate/route.ts:25` | Follow `withAuth`, rate limit, validation, tenant isolation. |
| AI caption cost tracking | `src/app/api/campaigns/caption/route.ts:81` | Reuse AI capacity and operation logging pattern. |
| Disabled GrowthOS domain placeholder | `src/constants/productDomains.ts:88` | Do not activate without deployment target update. |
| Today weekly pack wedge | `src/lib/today/weeklyGrowthPack.ts` | Keep inside MenuList until separate GrowthOS is unlocked. |

## Proposed Feature Flags

Add only if implementation is approved:

| Flag | Default | Purpose |
| --- | --- | --- |
| `ENABLE_TODAY_WEEKLY_GROWTH_PACK` | false | Paused MenuList Today wedge. Not a GrowthOS product flag. |
| `ENABLE_GROWTHOS_COMMAND_CENTER` | false | Master GrowthOS Command Center flag. |
| `ENABLE_GROWTHOS_FRESHNESS_CHECK` | false | Enables freshness signals and actions. |
| `ENABLE_GROWTHOS_GROWTH_PACK` | false | Enables weekly Growth Pack generation. |
| `ENABLE_GROWTHOS_DIRECT_PUBLISHING` | false | Reserved. Must remain false in first implementation. |

## Candidate File Structure

These are candidate paths, not existing code.

| Layer | Candidate path |
| --- | --- |
| Types | `src/types/growthos.ts` |
| Constants | `src/constants/growthos.ts` |
| Validation schemas | `src/lib/validation/growthosSchemas.ts` |
| Action ranking | `src/lib/growthos/actionRanking.ts` |
| Freshness signals | `src/lib/growthos/freshnessSignals.ts` |
| Provenance helpers | `src/lib/growthos/provenance.ts` |
| Prompt registry | `src/services/gemini/prompts/v1/growthPack.prompt.ts` |
| DAL | `src/database/growthos/index.ts` |
| Hook | `src/hooks/useGrowthosCommandCenter.ts` |
| API - action generation | `src/app/api/growthos/actions/generate/route.ts` |
| API - asset generation | `src/app/api/growthos/growth-pack/route.ts` |
| API - approval | `src/app/api/growthos/actions/[actionId]/approve/route.ts` |
| Desktop UI | `src/components/templates/growthos/commandCenter/` |
| Mobile UI | `src/components/templates/mobile/growthos/` |
| Product site | `src/app/sites/growthos/` only after routing approval. |

## Data Model

### Preferred Storage Shape

Keep the first implementation summary-first and bounded.

| Collection/doc | Purpose | Notes |
| --- | --- | --- |
| `growthActions/{tId}/{sId}/{actionId}` | Action lifecycle records. | Use only after approval. |
| `growthAssets/{tId}/{sId}/{assetId}` | Generated asset metadata and provenance. | Store media in Storage, not base64 in Firestore. |
| `platformSummary/growthos_{sId}` | Command Center summary. | One read for initial UI. |
| `growthBrandProfiles/{tId}/{sId}` | Tone, colors, approved claims, rejected phrases. | Write only when owner edits/approves. |
| `aiOperations` existing pattern | AI operation ledger. | Reuse current billing/accounting pattern. |

Do not create five separate graph collections for Truth, Signal, Action, Asset, and Memory. Those are conceptual layers, not initial storage layers.

### GrowthAction Lifecycle

```text
draft -> pending_approval -> approved -> exported -> archived
draft -> pending_approval -> edited -> approved -> exported -> archived
draft -> pending_approval -> ignored -> archived
```

`published` stays reserved until direct publishing is explicitly approved.

## API Rules

Every protected route must:

1. Use `withAuth()`.
2. Validate input with Zod before data access.
3. Verify tenant/store access with `verifyTenantAccess()`.
4. Rate-limit before AI/provider work.
5. Use `logger.security()` for validation and tenant failures.
6. Use generic error responses.
7. Record AI capacity/cost before and after provider calls.

## Freshness Check Rules

Candidate on-demand checks:

| Check | Source | Output |
| --- | --- | --- |
| Missing hours | Store/business profile summary | `confirm_hours` action |
| Holiday hours absent | Store hours + calendar helper | `update_holiday_hours` action |
| Expired offer | Offer/menu metadata | `archive_expired_offer` action |
| Broken link | Owner-provided public links | `fix_broken_link` action |
| Missing FAQ | Profile FAQ state + repeated questions if available | `add_faq` action |
| Old photo | Photo metadata | `refresh_photo` action |
| No recent public update | Existing campaign/export summary | `generate_growth_pack` action |

## Growth Pack Rules

Input may include:

- business name
- selected menu item/service/offer
- approved item description
- approved price
- approved photos/logo/colors
- owner-selected goal from a bounded list
- approved claim or review excerpt if source is permitted

Output may include:

- WhatsApp message
- Google post draft
- short caption
- story text
- printable flyer metadata

Output must not invent:

- prices
- offers
- discounts
- hours
- ingredients
- dietary claims
- awards
- ratings
- delivery coverage
- reservation availability

## Routing Work If Separate App Is Approved

Do not activate GrowthOS by editing only `PRODUCT_SITES`.

Required routing work:

1. Add an approved lowercase product id to deployment targets.
2. Add local, preview, and production GrowthOS domains.
3. Resolve the current placeholder id casing in `src/constants/productDomains.ts`.
4. Add middleware/dev-prefix smoke tests.
5. Update URL routing architecture docs.
6. Keep MenuList, Answerlattice, MyCodex, tenant, and custom-domain routing isolated.

## Validation Plan

| Validator | When |
| --- | --- |
| `git diff --check` | After docs and any code changes. |
| `npx tsc --noEmit --incremental false` | Required if implementation starts. Not required for docs-only planning. |
| API route tests | Required for new protected routes. |
| Firestore rules/index validation | Required if new collections need explicit rules/indexes. |
| Host-header smoke tests | Required if GrowthOS product host is activated. |
| Mobile visual check | Required if mobile UI is built. |

## Implementation Non-Goals

- No Vercel deploy unless explicitly requested.
- No Firebase deploy unless rules, indexes, Storage rules, or Cloud Function logic are changed.
- No scheduler in the first approved build unless on-demand generation cannot satisfy the product.
- No external posting integrations in the first approved build.

## Cost Impact

No runtime Firebase cost change. This is an implementation plan only.
