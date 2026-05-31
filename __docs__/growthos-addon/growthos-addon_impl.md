# GrowthOS Add-on - Technical Implementation Plan

**Status:** Planning only
**Code state:** Not implemented
**Primary constraint:** Build inside MenuList, feature-flagged off, paid-entitlement gated

---

## 1. Implementation Strategy

Use the existing Social Content foundation instead of creating a new growth engine from scratch.

Existing reusable pieces:

| Existing layer | Reuse plan |
| --- | --- |
| `src/types/campaigns.ts` | Reuse campaign type, surface, confidence, and summary concepts where they fit. |
| `src/lib/campaigns/engine.ts` | Reuse candidate generation and confidence scoring as one input into GrowthOS ranking. |
| `src/lib/campaigns/executionSurfaces.ts` | Reuse copy/export surface helpers where possible. |
| `src/hooks/useTodayCampaigns.ts` | Reuse the one-read Today summary pattern. |
| `src/database/campaigns/index.ts` | Reuse export tracking doctrine: execution signals only, not ROI. |
| `src/app/api/campaigns/caption/route.ts` | Mirror auth, Safe Mode, rate limit, Zod validation, AI capacity, AI operation logging, and output sanitization. |
| `src/lib/ai/capacityCheck.ts` | Use before every paid provider call. |
| `src/constants/AI/unitCosts.ts` | Add or reuse action costs through the existing unit system. |

## 2. Feature Flags

Add these flags to `src/config/features.ts` only during implementation:

```ts
ENABLE_GROWTHOS_ADDON: false,
GROWTHOS_ADDON_ACCESS: "disabled" as "disabled" | "pilot" | "paid",
GROWTHOS_DIRECT_POSTING: "disabled" as "disabled",
GROWTHOS_IMAGE_MODE: "existing_only" as "existing_only" | "generate_if_missing",
GROWTHOS_REVIEW_REPLY_MODE: "manual_paste" as "manual_paste" | "disabled",
```

Rules:

- `ENABLE_GROWTHOS_ADDON` is the master kill switch.
- `GROWTHOS_ADDON_ACCESS` controls pilot/paid visibility.
- `GROWTHOS_DIRECT_POSTING` must remain `"disabled"` for the approved scope.
- `GROWTHOS_IMAGE_MODE` starts as `"existing_only"` unless pricing explicitly covers image generation.
- `GROWTHOS_REVIEW_REPLY_MODE` starts as `"manual_paste"` and does not ingest Google reviews.

Do not reuse `ENABLE_TODAY_WEEKLY_GROWTH_PACK` as the GrowthOS flag. That flag remains paused for the older Today wedge.

## 3. Entitlement Gate

Add a small entitlement helper after inspecting current billing/subscription code:

```txt
src/lib/growthos/entitlements.ts
```

Responsibilities:

- check global feature flag
- check store plan or explicit add-on entitlement
- check pilot allowlist when `GROWTHOS_ADDON_ACCESS === "pilot"`
- return owner-safe denial reasons
- expose a server-safe and client-safe variant if needed

Do not add an owner-facing toggle. GrowthOS access is a plan/add-on entitlement, not a setting.

## 4. Data Model

Use bounded summary-first storage.

### `platformSummary/growthos_{sId}`

One-read add-on home summary.

```ts
interface GrowthOSSummaryDocument {
  tId: string;
  sId: string;
  date: string;
  lastUpdated: Timestamp;
  sourceFactsHash: string;
  eligible: boolean;
  reason?: "no_menu" | "incomplete_truth" | "not_entitled" | "no_action";
  primaryAction?: GrowthOSActionSummary;
  secondaryActions: GrowthOSActionSummary[];
  latestKit?: GrowthOSKitSummary;
}
```

### `growthosKits/{kitId}`

Generated output artifact.

```ts
interface GrowthOSKit {
  id: string;
  tId: string;
  sId: string;
  projectId?: string;
  actionType: GrowthOSActionType;
  destinationSet: GrowthOSDestination[];
  sourceFactsHash: string;
  sourceFactsSummary: GrowthOSSourceFactsSummary;
  outputs: GrowthOSOutput[];
  status: "draft" | "copied" | "downloaded" | "shared" | "archived";
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  aiOperationIds?: string[];
}
```

### `growthosExports/{exportId}`

Execution signal only.

```ts
interface GrowthOSExport {
  id: string;
  tId: string;
  sId: string;
  kitId: string;
  destination: GrowthOSDestination;
  method: "copy" | "share" | "download" | "print";
  exportedAt: Timestamp;
}
```

Do not store revenue, order, footfall, or inferred performance in GrowthOS export rows.

## 5. Types And Constants

Planned files:

| File | Purpose |
| --- | --- |
| `src/types/growthos.ts` | Public TypeScript contracts for actions, kits, outputs, exports, and source facts. |
| `src/constants/growthos.ts` | Destination labels, expiry windows, kit limits, allowed actions. |
| `src/lib/validation/growthosSchemas.ts` | Zod schemas for API requests and stored output. |
| `src/lib/growthos/sourceFacts.ts` | Builds and hashes source facts from MenuList truth. |
| `src/lib/growthos/actionRanking.ts` | Ranks action candidates using campaign engine plus store state. |
| `src/lib/growthos/kitBuilder.ts` | Deterministic kit assembly and AI prompt input preparation. |
| `src/lib/growthos/outputGuard.ts` | Sanitizes and rejects unsafe or unsupported claims. |
| `src/database/growthos/index.ts` | Client DAL and write helpers. |

## 6. API Routes

Use API routes only for operations that need server-side auth, paid capacity checks, provider calls, or write validation.

| Route | Purpose |
| --- | --- |
| `POST /api/growthos/actions/refresh` | Build/rerank current action summary from MenuList truth. No provider call by default. |
| `POST /api/growthos/kits/generate` | Generate one paid Growth Kit. Uses AI only when deterministic output is insufficient. |
| `POST /api/growthos/kits/export` | Record copy/share/download/print execution signal. |
| `POST /api/growthos/reviews/suggest` | Optional wrapper around review reply assist for owner-pasted review text. |

Each route must:

- use `withAuth()`
- verify tenant/store access
- validate input with Zod
- rate limit before expensive work
- check Safe Mode before provider calls
- check GrowthOS entitlement
- check AI capacity before provider calls
- sanitize generated output
- log security-relevant failures through approved logger
- avoid sensitive/raw payload logs

## 7. AI Action Accounting

Preferred launch accounting:

| Operation | Accounting |
| --- | --- |
| Deterministic action ranking | Free. No provider call. |
| Text kit generation | Add `GROWTHOS_KIT_GENERATION` or reuse `CAMPAIGN_CAPTION` only if product finance accepts shared accounting. |
| Review reply draft | Reuse `REVIEW_REPLY_SUGGESTION` if the payload matches existing review assist behavior. |
| Missing item image | Reuse `IMAGE_GENERATION` only when `GROWTHOS_IMAGE_MODE === "generate_if_missing"`. |

If `GROWTHOS_KIT_GENERATION` is added:

- add to `AI_ACTIONS_TYPES`
- add real provider estimate in `GEMINI_COST_USD`
- add unit cost in `AI_UNIT_COSTS`
- include in AI operation logs
- update docs before code activation

Suggested unit shape:

- deterministic kit: 0 units
- text Growth Kit: 1 or 2 units depending provider token usage
- image generation: existing 5 units per image

## 8. UI Plan

### Desktop

Planned folder:

```txt
src/components/templates/main-app/growthos/
```

Owner-visible label:

```txt
Growth Kits
```

Desktop views:

- add-on overview
- current action queue
- generated kit detail
- copy/download/print controls
- stale source warning
- entitlement empty state

Today integration:

- do not insert the full GrowthOS module into Today
- show only a small paid entry point when an eligible action exists
- keep Today focused on "No action needed" operational truth

### Mobile

Use mobile-native patterns:

- antd-mobile components
- Tailwind mobile styling
- 44px minimum action targets
- copy/share/download first
- no dense editing surface

The mobile host can initially be the real owner Today tab currently rendered by `src/components/mobile/screens/MobileHoursScreen.tsx`, plus a compact Growth Kits screen if navigation supports it.

## 9. Direct Posting Policy

No direct posting in the approved implementation.

Allowed:

- copy to clipboard
- native share sheet
- download text/image/PDF
- print/export
- mark used

Not allowed:

- post to Google
- post to Instagram
- send WhatsApp messages through an API
- schedule posts
- auto-repeat posts

## 10. Freshness And Staleness

Every kit must have a source fact hash.

If any critical fact changes after kit generation:

- mark kit as stale
- show owner-safe copy: "This kit may use old menu details."
- require regeneration before copying if the changed fact affects price, availability, hours, or public link

Critical facts:

- item name
- price
- availability
- store status
- opening hours for the promoted date
- public menu link
- review text for reply drafts

## 11. Scheduler Policy

Do not add a new Cloud Scheduler function.

Initial GrowthOS is on-demand:

- summary read on open
- action refresh on owner request or eligible Today entry
- kit generation on owner request

If a background refresh is later approved, it must be added to the existing MenuList maintenance scheduler with lease/state tracking and cost docs. Do not create a standalone scheduled function.

## 12. Security Notes

Security-sensitive implementation requirements:

- tenant isolation is mandatory on every API route and write
- free/base users cannot call paid generation APIs directly
- output must not include hidden prompts, provider text, or raw model responses
- review text must not be logged raw
- generated public copy must pass forbidden phrase and safety guards
- no external access tokens are needed in the approved scope

## 13. Implementation Order

1. Add flags, constants, types, schemas, and entitlement helper.
2. Add source fact builder and deterministic action ranking.
3. Add DAL summary read/write helpers.
4. Add API route for action refresh.
5. Add kit builder and text generation route with AI capacity checks.
6. Add desktop Growth Kits shell.
7. Add mobile Growth Kits support.
8. Add export tracking.
9. Add stale source detection.
10. Add tests and docs parity verification.

Do not activate the add-on for production until desktop, mobile, entitlement, cost, security, and support docs all pass.
