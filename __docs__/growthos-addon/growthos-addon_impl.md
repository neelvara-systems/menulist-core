# GrowthOS Add-on - Technical Implementation Plan

**Status:** Enabled behind Pro/Premium entitlement gate
**Code state:** V1 deterministic add-on shell implemented June 1, 2026
**Primary constraint:** Build inside MenuList, Pro/Premium-entitlement gated

---

## 1. Implementation Strategy

Use the existing Social Content foundation instead of creating a new growth engine from scratch.

Existing reusable pieces:

| Existing layer | Reuse plan |
| --- | --- |
| `src/types/campaigns.ts` | Reuse campaign type, surface, confidence, and summary concepts where they fit. |
| `src/lib/campaigns/executionSurfaces.ts` | Reuse copy/export surface helpers where possible. |
| `src/hooks/useTodayCampaigns.ts` | Reuse the one-read Today summary pattern. |
| `src/database/campaigns/index.ts` | Reuse export tracking doctrine: execution signals only, not ROI. |
| `src/app/api/campaigns/caption/route.ts` | Mirror auth, Safe Mode, rate limit, Zod validation, AI capacity, AI operation logging, and output sanitization. |
| `src/lib/ai/capacityCheck.ts` | Use before every paid provider call. |
| `src/constants/AI/unitCosts.ts` | Add or reuse action costs through the existing unit system. |

## 2. Feature Flags

Add these flags to `src/config/features.ts` only during implementation:

```ts
ENABLE_GROWTHOS_ADDON: true,
GROWTHOS_ADDON_ACCESS: "paid" as "disabled" | "pilot" | "paid",
GROWTHOS_PILOT_STORE_IDS: [] as Array<string | number>,
GROWTHOS_PAID_PLAN_IDS: ["pro", "premium"] as string[],
GROWTHOS_DIRECT_POSTING: "disabled" as "disabled",
GROWTHOS_STAFF_BRIEF_MODE: "deterministic" as "disabled" | "deterministic",
GROWTHOS_IMAGE_MODE: "disabled" as "disabled" | "existing_only",
GROWTHOS_REVIEW_REPLY_MODE: "manual_paste_guarded" as "disabled" | "manual_paste_guarded",
GROWTHOS_OFFER_BUILDER_MODE: "disabled" as "disabled" | "pilot",
GROWTHOS_QUICK_REPLIES_MODE: "disabled" as "disabled" | "pilot",
GROWTHOS_PHOTO_PROMPTS_MODE: "disabled" as "disabled" | "pilot",
GROWTHOS_MULTI_OUTLET_MODE: "disabled" as "disabled" | "pilot",
GROWTHOS_USED_HISTORY_UI: "disabled" as "disabled" | "pilot",
GROWTHOS_LOW_DATA_CACHE: "latest_only" as "disabled" | "latest_only" | "pilot",
```

Rules:

- `ENABLE_GROWTHOS_ADDON` is the master kill switch.
- `GROWTHOS_ADDON_ACCESS` defaults to `"paid"` so turning on the master flag still requires plan entitlement.
- `GROWTHOS_PILOT_STORE_IDS` gates pilot stores when access is `"pilot"`; pilot stores must still have an eligible paid plan.
- `GROWTHOS_PAID_PLAN_IDS` gates rollout plan IDs and must remain `["pro", "premium"]` unless pricing changes.
- `GROWTHOS_DIRECT_POSTING` must remain `"disabled"` for the approved scope.
- `GROWTHOS_STAFF_BRIEF_MODE` is V1 core and deterministic.
- `GROWTHOS_IMAGE_MODE` starts disabled. It may move to `"existing_only"` only after pilot demand; never default to image generation.
- `GROWTHOS_REVIEW_REPLY_MODE` starts as `"manual_paste_guarded"` only if the guarded review flow is implemented; it does not ingest Google reviews.
- offer builder, quick replies, photo prompts, multi-outlet localization, used history UI, and advanced low-data behavior remain disabled until pilot admission.

Do not reuse `ENABLE_TODAY_WEEKLY_GROWTH_PACK` as the GrowthOS flag. That flag remains paused for the older Today wedge.

The legacy Social Content owner generator is deleted, not feature-flagged. Existing Today campaigns, staff prompts, and physical-surface cards can still be read, completed, skipped, copied, or downloaded. New generated action creation should go through GrowthOS / `Today's Sales Pack`, not a replacement `Generate Today Action` prompt, helper, route, or campaign engine.

## 3. Entitlement Gate

Implemented entitlement helpers:

```txt
src/lib/growthos/entitlements.ts
src/lib/growthos/serverEntitlements.ts
```

Responsibilities:

- check global feature flag
- check active Pro or Premium subscription through the same valid-subscription helper used by billing gates
- check pilot allowlist when `GROWTHOS_ADDON_ACCESS === "pilot"`, then still require Pro or Premium
- return owner-safe denial reasons
- expose a server-safe and client-safe variant if needed

Do not add an owner-facing toggle. GrowthOS access is a Pro/Premium plan entitlement, not a setting or standalone add-on override.

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

### `growthosKits/{tId}/{sId}/{kitId}`

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

Required V1 action and destination types:

```ts
type GrowthOSActionType =
  | "promote_item"
  | "menu_event"
  | "staff_push"
  | "local_trust"
  | "truth_fix"
  | "review_reply";

type GrowthOSDestination =
  | "whatsapp_status"
  | "whatsapp_message"
  | "instagram_caption"
  | "google_update_draft"
  | "staff_brief"
  | "counter_prompt"
  | "qr_table_prompt"
  | "review_reply";
```

Staff brief output remains inside the kit output structure. It does not create a staff system.

```ts
interface GrowthOSStaffBriefOutput {
  destination: "staff_brief";
  mainLine: string;
  reason?: string;
  avoidLines?: string[];
  menuLinkLine?: string;
  counterPrompt?: string;
  expiresAt: Timestamp;
  preflight: GrowthOSPreflightResult;
}
```

### `growthosExports/{tId}/{sId}/{exportId}`

Execution signal only.

```ts
interface GrowthOSExport {
  id: string;
  tId: string;
  sId: string;
  kitId: string;
  destination: GrowthOSDestination;
  method: "copy" | "share" | "download" | "print" | "mark_used";
  exportedAt: Timestamp;
}
```

Do not store revenue, order, footfall, or inferred performance in GrowthOS export rows.

### Deferred Data Models

Do not add these collections or document types in the V1 core unless the pilot explicitly unlocks them:

| Deferred model | Reason |
| --- | --- |
| `growthosOffers` | Owner-Confirmed Offer Builder creates new business truth and needs separate governance. |
| persisted quick replies | Most customer snippets should be deterministic and generated from source facts, not stored per read. |
| persisted image assets | Existing Image Adaptation should generate on owner action and persist only when needed. |
| multi-outlet campaign group | Multi-outlet localization should remain per selected store, not brand campaign ops. |

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
| `src/lib/growthos/staffBrief.ts` | Builds deterministic staff brief output and avoid lists from source facts. |
| `src/lib/growthos/readiness.ts` | Computes ready/limited/blocked/stale states for kit families. |
| `src/lib/growthos/reviewGuard.ts` | Triage-first manual pasted review reply guard when enabled. |
| `src/database/growthos/index.ts` | Client DAL and write helpers. |
| `src/database/growthos/server.ts` | Admin SDK server read/write helpers for scoped kit/export documents. |
| `src/lib/growthos/serverContext.ts` | Server-only source snapshot, entitlement context, and bounded API loading helpers. |

Client response boundary:

- `src/database/growthos/index.ts` sends GrowthOS route requests with no-store cache, same-origin credentials, and manual redirect handling.
- `src/database/growthos/index.ts` parses GrowthOS route responses through `readJsonResponseWithLimit()` with a 64 KB cap.
- Parse failures, rejected responses, and invalid successful envelopes log fixed GrowthOS client failure codes with bounded operation and response-status metadata only.
- Owner-facing failure copy remains fixed per operation; raw API response text is not surfaced.

## 6. API Routes

Use API routes only for operations that need server-side auth, paid capacity checks, provider calls, or write validation.

| Route | Purpose |
| --- | --- |
| `POST /api/growthos/actions/refresh` | Build/rerank current action summary from MenuList truth. No provider call by default. |
| `POST /api/growthos/kits/generate` | Generate one Growth Kit. V1 is deterministic and does not call a provider. |
| `POST /api/growthos/kits/export` | Record copy/share/download/print execution signal. |
| `POST /api/growthos/reviews/suggest` | Optional deterministic guard around owner-pasted review text. No review ingestion and no provider call in V1. |

GrowthOS project, kit, and scope ID boundary: refresh and generate requests validate `projectId` with the shared Firestore document-ID guard before `readGrowthOSProjectDataServer()` can read either `projects/{tId}/{sId}/{projectId}` or legacy `projects/{projectId}`. Export requests validate `kitId` with the same guard before `readGrowthOSKitServer()` can read `growthosKits/{tId}/{sId}/{kitId}`. The server DAL also trims and normalizes project/kit document IDs before Firestore refs, validates session-derived tenant/store scope IDs before `stores/{sId}`, `platformSummary/growthos_{sId}`, `projects/{tId}/{sId}/{projectId}`, `growthosKits/{tId}/{sId}/{kitId}`, or `growthosExports/{tId}/{sId}` refs, returns `null` before Firestore access if a persisted project, kit, or scope ID is malformed, and throws before summary/kit/export writes when an internal caller supplies malformed generated or scope IDs.

Each route must:

- use `withAuth()`
- verify tenant/store access
- validate input with Zod
- rate limit before expensive work
- check Safe Mode before provider calls
- check GrowthOS entitlement
- check AI capacity before provider calls
- sanitize generated output
- require the source project to resolve under the current tenant/store scope; legacy project fallback must prove tenant/store ownership
- recompute current source facts before export when the kit has a project ID
- reuse already-loaded store entitlement context during export stale checks
- block export for stale kits and blocked preflight outputs
- skip summary status writes when status and stale state did not change
- log security-relevant failures through approved logger
- avoid sensitive/raw payload logs

## 7. AI Action Accounting

Implemented V1 launch accounting:

| Operation | Accounting |
| --- | --- |
| Deterministic action ranking | Platform-absorbed. No provider call. |
| Text kit generation | Platform-absorbed deterministic templates in V1. No provider call and no AI operation row. |
| Review reply draft | Platform-absorbed deterministic triage in V1. No raw review text persisted. |
| Staff brief | 0 units in V1 deterministic mode. |
| Existing image adaptation | 0 provider units; Storage/render cost only when pilot-enabled and owner-triggered. |
| Missing item image | No provider call in V1. Use photo prompt later instead of generating fake food. |

If `GROWTHOS_KIT_GENERATION` is added later:

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

Implemented folder:

```txt
src/components/templates/main-app/growthos/
src/app/(main)/growth-kits/page.tsx
```

Owner-visible label:

```txt
Growth Kits
```

Desktop views:

- add-on overview
- current action queue
- menu truth readiness checklist
- generated kit detail
- Staff Brief Pack output
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

Required mobile V1 behaviors:

- copy/share latest message
- copy/share Staff Brief
- mark used
- regenerate stale kit
- keep latest loaded kit visible when refresh/generation fails
- label the Today card as `Today's Sales Pack`
- present the paid outcome as one customer message, one staff line, and one counter line
- hide or disable copy/share/download actions when the kit is stale or blocked
- make `Update pack` the primary action when menu details changed
- avoid owner-facing confidence percentages on Today; use current/freshness language instead
- no long editor, analytics, calendar, channel setup, or design variant browsing

## 9. Direct Posting Policy

No direct posting in the approved implementation.

Allowed:

- copy to clipboard
- fallback textarea copy when Clipboard API is unavailable, blocked, or slow
- copied feedback only after Clipboard API success or acknowledged textarea fallback success
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

Also not allowed in V1:

- direct WhatsApp API sending
- CRM/inbox handling
- staff management
- offer invention
- loyalty/coupon flow
- AI image generation by default

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

Staff Brief expires at end of business day or when item availability/store status/public link changes.

Offer kits, if ever approved, must expire at the earliest of offer end date, critical fact change, or manual deactivation.

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
- Starter/base plan users cannot call paid generation APIs directly
- client Firestore writes to GrowthOS kit/export documents are not allowed; authenticated APIs write through server Admin SDK after entitlement and stale checks
- output must not include hidden prompts, provider text, or raw model responses
- review text must not be logged raw
- generated public copy must pass forbidden phrase and safety guards
- no external access tokens are needed in the approved scope

## 13. Implementation Order

1. Add flags, constants, types, schemas, and entitlement helper. Done.
2. Add source fact builder and deterministic action ranking. Done.
3. Add readiness checklist logic. Done.
4. Add deterministic Staff Brief builder and preflight. Done.
5. Add DAL summary read/write helpers. Done.
6. Add API route for action refresh. Done.
7. Add deterministic kit builder and generation route. Done.
8. Add desktop Growth Kits shell. Done.
9. Add mobile Growth Kits support, including latest-kit fallback. Done.
10. Add export tracking for copy/share/download/print/mark-used. Done.
11. Add stale source detection. Done.
12. Add guarded review reply. Done as deterministic triage, no provider call.
13. Add tests and docs parity verification. Tracked in `growthos-addon_validation.md`.
14. Add repeatable dry-run verification in `npm run verify:growthos`. Done.

Do not widen beyond active Pro/Premium stores until desktop, mobile, entitlement, cost, security, and support checks all pass.

## 14. Pilot Extension Admission

Do not implement pilot extensions until pilot evidence exists.

| Extension | Admission criteria | Technical guard |
| --- | --- | --- |
| Existing Image Adaptation | Owners use text/staff kits and image assets are a repeated blocker. | `GROWTHOS_IMAGE_MODE="existing_only"`, owner-triggered render only. |
| Customer FAQ Reply Snippets | Owners/staff repeatedly need menu/hour/item reply snippets. | Deterministic templates, no chatbot, no inbox. |
| Photo Capture Prompts | Missing item images block recommended kits and owners upload after prompts. | No provider call; prompts rank only useful items. |
| Multi-Outlet Localized Kits | Multi-outlet pilot has store-specific differences. | Generate per selected store; no broad fanout. |
| Used History UI | Owners use multiple kits and need memory/repetition control. | Paginated export rows only, no ROI. |
| Advanced Low-Data Access | Mobile use is high and refresh failures are observed. | Latest kit only; strict stale/entitlement policy. |
| Owner-Confirmed Offer Builder | Founder approves new offer truth governance. | Separate offer facts with validity, terms, expiry, and store scope. |
