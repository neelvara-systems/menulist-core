# Decision Intelligence — Implementation

**Last verified:** July 21, 2026
**Authority:** Current codebase.

**Launch boundary:** Not current launch certification or deploy approval. This implementation is local source evidence only; release still requires current production-readiness audit and External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped scheduler deploy evidence, browser/mobile customer-menu QA, public-cache evidence, and production-host smoke.

## Components

| Layer | Source | Responsibility |
| --- | --- | --- |
| Shared config | `src/data/shared/decisionBlockConfig.ts` and byte-mirrored Functions copy | Duration defaults, Quick thresholds, enabled blocks, default category |
| Analytics input | `functions/src/intelligence/shared/analyticsAggregator.ts` | One compact 7-day snapshot read; missing/stale fails empty |
| Item boundary | `functions/src/intelligence/shared/itemExtractor.ts` | Current active catalog only; alias continuity; normalized bounded fields |
| Scoring | `functions/src/decisionBlocksScoring.ts` | Eligible candidates, TTL, project projection, manual recovery |
| Owner settings | `decisionBlocks.shared.ts` | One desktop/mobile settings shape and pin normalization |
| Public runtime | `DecisionBlocks.tsx` | TTL/data/availability/time-slot/duplicate/price/minimum-block gates |
| Public route | `src/app/client/[[...slug]]/page.tsx` | Embedded projection load through tagged public cache |

## Stored contracts

```typescript
project.menuSettings.decisionBlocks = {
  enablePopular?: boolean;
  enableQuickPick?: boolean;
  enableBestValue?: boolean;
  pinnedPopular?: string;
  pinnedQuickPick?: string;
  pinnedBestValue?: string;
};

project.publicDecisionBlocks = {
  tId: string;
  sId: string;
  projectId: string;
  popular: ScoredItem[];
  quickPick: ScoredItem[];
  bestValue: ScoredItem[];
  computedAt: Timestamp;
  validUntil: Date;
  statsUsed: { /* bounded eligibility metadata */ };
};
```

The generated projection is not accepted from owner project mutation payloads.

## Catalog-first extraction

`extractActiveItems()` walks `project.files[].extractedData.data.items` first. It ignores `active: false`, requires a current ID, merges analytics across `id` plus `extractionIdAliases`, and normalizes:

- localized item name;
- numeric positive price;
- explicit non-negative duration, including `0`;
- owner boost clamped to `-20..20`;
- current owner-authored bestseller flag; and
- hourly/recommendation click maps.

An analytics map entry cannot create an item by itself.

The extractor rejects malformed file/item containers, duplicate current IDs, more than 2,000 active items or aliases, and analytics sums that would leave JavaScript's safe-integer range. Its output re-enters the exact `ExtractedItem` projector before scoring, so direct and catalog-derived inputs share one runtime contract.

## Public DTO boundary

`src/lib/decisionBlocks/publicProjection.ts` is the only raw embedded-projection admission into the public route. It requires exact resolved tenant/store/project identity, three bounded candidate arrays, coherent bounded stats, primitive fields, and a current timestamp window. Unknown top-level or candidate fields fail closed. The returned DTO omits internal scores and duplicated catalog name/category/price/duration fields; the renderer resolves the current item from canonical menu truth and receives ISO timestamps only. Typed props preserve this DTO through the website renderer, menu page, and Decision Blocks component.

`clearStaleDecisionBlocksForProject()` uses the already-loaded project snapshot to avoid a read. When scoring finds no current item and the generated field exists, it merge-deletes only `publicDecisionBlocks`; when the field is already absent, it performs zero writes. Both hourly scheduler paths and project/store manual recovery use the helper. A successful delete participates in the same per-store public-cache invalidation as a replacement write.

## Scoring

Popular scoring uses views, weighted behavioral clicks, the currently unused zero order field, bounded owner boost, and the current bestseller bonus. Candidate admission separately requires at least three behavioral clicks on the item. Public reason text is always the neutral `decision.popular.default.popular` for automatic candidates.

Quick scoring:

- runs only for categories whose shared configuration enables Quick choice;
- rejects missing duration;
- accepts `duration <= shared threshold`;
- uses the explicit duration for public reason text; and
- never substitutes a default for `0` or an unknown duration.

Value scoring:

- rejects missing/zero price;
- computes the average from priced items only; and
- admits only candidates at or below that average before popularity/value scoring.

Each enabled block stores at most three candidates. Equal scores use binary item-ID order as the stable secondary key, so candidate persistence does not inherit file/category traversal order. Runtime owns final selection.

## Scheduler and cache

`computeDecisionBlocksScores` runs at `30 * * * *` and filters stores by their store-local settlement window. A valid `platformSummary/projects_{sId}` with zero active projects returns empty without scanning the nested project collection. A missing or malformed summary can use the compatibility query fallback.

After one or more project projections change, the scheduler calls `revalidatePublicClientCacheForStore()` once for that store. Manual project/store scoring does the same. The revalidation endpoint clears `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` through the existing public cache contract.

## Runtime behavior

`DecisionBlocks.tsx`:

1. verifies projection timestamps and hard-stale age;
2. evaluates global and block-specific data gates;
3. applies owner block toggles and selections;
4. resolves current IDs and aliases;
5. rejects inactive, unavailable, out-of-time, duplicate, or hidden-price Value candidates; and
6. renders at least two automatic blocks, or a valid explicit owner-selected block.

If automatic data is absent, expired, or insufficient, no client-side ranking occurs.

## Manual callables

- `triggerDecisionBlocksScoring`: one project or store; current active platform owner; current store/project scope; bounded response; no platform-wide fan-out.
- `triggerStoreNightlyScheduler`: one store; runs analytics settlement, Decision Blocks, CMI, and the other store scheduler tasks through the shared store path.

Both re-read the current platform user document instead of relying only on potentially stale custom claims.

## Feature gates

- `FEATURE_FLAGS.ENABLE_DECISION_BLOCKS`: owner UI and public renderer.
- `FUNCTION_FLAGS.ENABLE_DECISION_BLOCKS_SCORING`: generated projection writes.

## Verification

- `npm run test:decision-intelligence-boundary`
- `node scripts/verification/verify-decision-intelligence-boundary.js`
- `npm --prefix functions run build`
- focused root typecheck/lint/public/menu/mobile gates listed in `decision-intelligence_verification-2026-07-16.md`

Historical implementation document: `_archive/pre-2026-07-16/decision-intelligence_impl.md`.
