# Predictive Support — Technical Implementation Blueprint

> **Version:** 1.1.1
> **Last Updated:** 2026-05-24
> **Status:** ✅ IMPLEMENTED — Enabled with guards
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`

---

## §1 — Architecture Overview

### 1.1 — System Position Inside Answerlattice

Predictive Support sits **above** the retrieval layer and **beside** the widget:

```
┌────────────────────────────────────────────────────┐
│                 ANSWERLATTICE STACK                       │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐    ┌──────────────────────┐       │
│  │ Widget API   │───▶│ Predictive Help API  │       │
│  │  (page ctx)  │    │ /api/answerlattice/       │       │
│  └──────┬───────┘    │ predictive-help      │       │
│         │            └──────────┬───────────┘       │
│         │                       │                   │
│         │            ┌──────────▼───────────┐       │
│         │            │  Predictive Engine   │       │
│         │            │  (rule evaluation)   │       │
│         │            └──────────┬───────────┘       │
│         │                       │                   │
│  ┌──────▼───────┐    ┌──────────▼───────────┐       │
│  │  coreSearch   │    │  Trigger Rules      │       │
│  │  (reactive)   │    │  (platformSummary)  │       │
│  └──────┬───────┘    └──────────┬───────────┘       │
│         │                       │                   │
│  ┌──────▼───────────────────────▼───────────┐       │
│  │     Entity Index + Canonical Answers      │       │
│  │     + Friction Stats + Knowledge Graph    │       │
│  └───────────────────────────────────────────┘       │
│                                                     │
│  ┌───────────────────────────────────────────┐       │
│  │     Nightly Batch (auto-trigger gen)      │       │
│  └───────────────────────────────────────────┘       │
└────────────────────────────────────────────────────┘
```

### 1.2 — Data Flow

```
0. Widget config → /api/widget/config
   Response includes capabilities.predictiveSupport.
   The public widget does not call predictive help unless active triggers exist.

1. Widget browser contract → POST /api/answerlattice/predictive-help
   Payload: { path, title, feature, workflow, role, locale }

2. API Route → predictiveEngine.evaluateTriggers()
   Loads trigger rules from platformSummary (cached; empty/no-active summaries use a longer 5-minute negative cache)
   Evaluates conditions against context
   Checks cooldown in Upstash Redis

3. predictiveEngine → pre-resolved suggestion first
   Uses trigger.resolvedSuggestion from the summary doc. Canonical-answer reads
   are fallback only for stale or legacy summary docs.

4. API Route → Returns suggestion payload
   { type, title, summary, articles[], actionType, triggerId }

5. Widget runtime → Renders context card / tooltip / workflow helper
   Logs suggestion_shown signal (fire-and-forget)

6. User interaction → Logs suggestion_clicked or suggestion_dismissed
   Fire-and-forget to signal events
```

---

## §2 — Data Model

### 2.1 — Trigger Rule Type

```typescript
// Additive to src/types/answerlattice/index.ts

export const ANSWERLATTICE_TRIGGER_ACTION_TYPES = {
  HELP_CARD: "help_card",
  WORKFLOW_GUIDE: "workflow_guide",
  LINK_ARTICLE: "link_article",
} as const;

export type AnswerlatticeTriggerActionType =
  (typeof ANSWERLATTICE_TRIGGER_ACTION_TYPES)[keyof typeof ANSWERLATTICE_TRIGGER_ACTION_TYPES];

export const ANSWERLATTICE_TRIGGER_STATUS = {
  ACTIVE: "active",
  SUGGESTED: "suggested", // Auto-generated, pending founder review
  DISABLED: "disabled",
  ARCHIVED: "archived",
} as const;

export type AnswerlatticeTriggerStatus =
  (typeof ANSWERLATTICE_TRIGGER_STATUS)[keyof typeof ANSWERLATTICE_TRIGGER_STATUS];

export const ANSWERLATTICE_TRIGGER_SOURCE = {
  MANUAL: "manual", // Founder-created
  FRICTION_AUTO: "friction_auto", // Auto-generated from friction patterns
  SYSTEM: "system", // System-generated (e.g., onboarding)
} as const;

export type AnswerlatticeTriggerSource =
  (typeof ANSWERLATTICE_TRIGGER_SOURCE)[keyof typeof ANSWERLATTICE_TRIGGER_SOURCE];

export interface AnswerlatticePredictiveTrigger {
  id: string;
  tId: number;
  sId: number;

  // Identification
  name: string; // Human-readable trigger name (≤100 chars)
  description?: string; // Optional description (≤300 chars)

  // Conditions (ALL must match — AND logic)
  conditions: {
    page?: string; // Page identifier (e.g., "webhook_setup")
    feature?: string; // Feature identifier (e.g., "api_keys")
    workflow?: string; // Workflow identifier (e.g., "connect_integration")
    plan?: string; // Plan filter (e.g., "free", "pro")
    userRole?: string; // Role filter (e.g., "admin", "viewer")
  };

  // Action (what to show)
  action: {
    type: AnswerlatticeTriggerActionType;
    entityId?: string; // Entity to resolve canonical answer for
    articleId?: string; // Direct KB article link (alternative to entity)
    customTitle?: string; // Override title (optional)
    customSummary?: string; // Override summary (optional, ≤200 chars)
  };

  // Behavior
  priority: number; // 0-100 (highest wins on conflict)
  cooldownHours: number; // Minimum hours between showing to same user (1-720)
  maxImpressionsPerUser?: number; // Optional lifetime cap per user

  // Metadata
  status: AnswerlatticeTriggerStatus;
  source: AnswerlatticeTriggerSource;

  // Effectiveness (updated by nightly learning job)
  effectiveness?: {
    impressions: number;
    clicks: number;
    dismissals: number;
    score: number; // (clicks - dismissals) / impressions
    lastEvaluated?: Timestamp;
  };

  // Provenance (for auto-generated triggers)
  frictionSource?: {
    entityId: string;
    entityName: string;
    frictionScore: number;
    signalCount: number;
  };

  createdOn?: Timestamp;
  modifiedOn?: Timestamp;
  createdBy?: string;
}
```

### 2.2 — Suggestion Payload Type (API Response)

```typescript
export interface AnswerlatticePredictiveSuggestion {
  triggerId: string;
  type: AnswerlatticeTriggerActionType;
  title: string;
  summary: string;
  articles?: Array<{
    id: string;
    title: string;
  }>;
  procedure?: AnswerlatticeProcedure; // If workflow_guide type
  relatedEntities?: Array<{
    entityId: string;
    entityName: string;
  }>;
}
```

### 2.3 — Signal Types Extension

Extend existing `ANSWERLATTICE_SIGNAL_TYPE` (additive, freeze-compliant):

```typescript
// Add to ANSWERLATTICE_SIGNAL_TYPE
SUGGESTION_SHOWN: 'suggestion_shown',
SUGGESTION_CLICKED: 'suggestion_clicked',
SUGGESTION_DISMISSED: 'suggestion_dismissed',
```

Signal metadata for suggestion events:

```typescript
metadata: {
    triggerId: string;
    page: string;
    entityId?: string;
    actionType: AnswerlatticeTriggerActionType;
}
```

---

## §3 — Storage Architecture

### 3.1 — Trigger Rules Storage

**Location:** `platformSummary/predictiveTriggers_{tId}_{sId}`

**Why platformSummary, not a separate collection?**

- Trigger rules are bounded (~500 rules max per tenant)
- Loaded as a single document (1 read)
- Cached in-memory by trigger workers
- Same pattern as `entityGraphIndex_{tId}_{sId}` (proven)

**Document structure:**

```typescript
{
  tId: number;
  sId: number;
  lastUpdated: Timestamp;
  version: number;
  triggerCount: number;
  activeTriggerCount: number;
  sourceHash: string;
  triggers: Record<string, AnswerlatticePredictiveTrigger>; // triggerId → trigger
}
```

Active entity-bound triggers may include `resolvedSuggestion` with title, summary, source answer ID/version, related article IDs, and procedure metadata. This keeps runtime predictive calls to one summary read in the common path.

**Size estimate:** 500 triggers × ~500-900 bytes = ~250-450KB (well within Firestore 1MB doc limit)

### 3.2 — Individual Trigger Documents (for CRUD)

**Collection:** `answerlattice_predictiveTriggers`

**Purpose:** CRUD operations on individual triggers. Nightly batch rebuilds the platformSummary cache from this collection.

**Why both?**

- platformSummary doc = **read-optimized** (1 read loads all triggers)
- Collection = **write-optimized** (CRUD on individual triggers)
- Same dual-storage pattern as entity graph index

### 3.3 — Cooldown State

**Location:** Upstash Redis (existing infrastructure)

**Key format:** `canon:cooldown:{userId}:{triggerId}`

**TTL:** `cooldownHours` from trigger rule

**Why Redis, not Firestore?**

- TTL auto-expiry (no cleanup needed)
- Zero Firestore writes for cooldown tracking
- Already deployed for rate limiting
- Sub-millisecond reads

### 3.4 — Suggestion Signals

**Location:** Existing `answerlattice_signalEvents` collection

**Why reuse, not new collection?**

- Same append-only pattern
- Same 12-month TTL cleanup
- Same nightly aggregation
- Existing batched signal counts can include new types

---

## §4 — File Structure

### 4.1 — New Files

```
src/types/answerlattice/index.ts                          — +3 interfaces, +3 const objects (additive)
src/lib/answerlattice/predictiveEngine.ts                 — Core evaluation engine (~250 lines)
src/database/answerlattice/predictiveTriggers.ts           — DAL for trigger CRUD (~150 lines)
src/app/api/answerlattice/predictive-help/route.ts        — API route (~120 lines)
src/hooks/answerlattice/usePredictiveTriggers.ts          — Admin hook for trigger management (~100 lines)
src/components/templates/answerlattice/governance/PredictiveTriggerManager.tsx  — Admin UI (~200 lines)
functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts  — Nightly: auto-gen + cache rebuild (~200 lines)
```

### 4.2 — Modified Files

```
src/config/features.ts                               — +1 feature flag (×2: frontend + CF)
functions-answerlattice/src/constants/features.ts          — +1 feature flag
src/constants/database.ts                            — +1 collection constant
functions-answerlattice/src/constants/database.ts          — +1 collection constant
src/types/answerlattice/index.ts                          — +signal types, +trigger types
src/lib/answerlattice/signalEmitter.ts                    — +emitSuggestionSignal helper
functions-answerlattice/src/answerlattice/answerlatticeNightly.ts   — +Step 16 (trigger sync + auto-gen)
src/components/templates/answerlattice/governance/index.tsx — +Triggers tab
```

---

## §5 — Predictive Engine Design

### 5.1 — Core Algorithm

```typescript
// src/lib/answerlattice/predictiveEngine.ts

export async function evaluateTriggers(
  context: AnswerlatticeContextPayload,
  tId: number,
  sId: number,
  userId: string,
): Promise<AnswerlatticePredictiveSuggestion | null> {
  // 0. Public widget only calls this route when /api/widget/config reports
  // capabilities.predictiveSupport=true for the tenant.

  // 1. Load trigger rules (platformSummary doc — 1 read, cached)
  const triggerDoc = await loadTriggerIndex(tId, sId);
  if (!triggerDoc || triggerDoc.triggerCount === 0) return null;

  // 2. Filter triggers by page match
  const pageTriggers = filterByPage(triggerDoc.triggers, context.page);
  if (pageTriggers.length === 0) return null;

  // 3. Evaluate conditions for each matching trigger
  const matchedTriggers = pageTriggers
    .filter((t) => evaluateConditions(t.conditions, context))
    .filter((t) => t.status === "active")
    .sort((a, b) => b.priority - a.priority);

  if (matchedTriggers.length === 0) return null;

  // 4. Check cooldown for top-priority trigger
  for (const trigger of matchedTriggers) {
    const cooledDown = await checkCooldown(
      userId,
      trigger.id,
      trigger.cooldownHours,
    );
    if (cooledDown) continue; // Skip — recently shown

    // 5. Resolve content for this trigger.
    // Common path uses trigger.resolvedSuggestion from the nightly summary.
    // Canonical-answer lookup is a stale/legacy summary fallback only.
    const suggestion = await resolveSuggestion(trigger, tId, sId);
    if (!suggestion) continue;

    // 6. Set cooldown
    await setCooldown(userId, trigger.id, trigger.cooldownHours);

    return suggestion;
  }

  return null; // All triggers on cooldown
}
```

### 5.2 — Condition Evaluation

```typescript
function evaluateConditions(
  conditions: AnswerlatticePredictiveTrigger["conditions"],
  context: AnswerlatticeContextPayload,
): boolean {
  // ALL conditions must match (AND logic)
  if (conditions.page && context.page !== conditions.page) return false;
  if (conditions.feature && context.feature !== conditions.feature)
    return false;
  if (conditions.workflow && context.workflow !== conditions.workflow)
    return false;
  if (conditions.plan && context.plan !== conditions.plan) return false;
  if (conditions.userRole && context.userRole !== conditions.userRole)
    return false;
  return true;
}
```

### 5.3 — Suggestion Resolution

```typescript
async function resolveSuggestion(
  trigger: AnswerlatticePredictiveTrigger,
  tId: number,
  sId: number,
): Promise<AnswerlatticePredictiveSuggestion | null> {
  let title = trigger.action.customTitle || trigger.name;
  let summary = trigger.action.customSummary || "";
  let procedure: AnswerlatticeProcedure | undefined;
  let articles: Array<{ id: string; title: string }> = [];

  // Resolve from entity → canonical answer
  if (trigger.action.entityId) {
    const answers = await getActiveAnswersForEntity(
      tId,
      sId,
      trigger.action.entityId,
    );
    if (answers && answers.length > 0) {
      const best = answers[0];
      title = trigger.action.customTitle || best.title;
      summary = trigger.action.customSummary || best.content.structuredSummary;
      procedure = best.content.procedure;
      articles.push({ id: best.id, title: best.title });
    }
  }

  // Resolve from direct article link
  if (trigger.action.articleId) {
    articles.push({ id: trigger.action.articleId, title: title });
  }

  if (!title) return null;

  return {
    triggerId: trigger.id,
    type: trigger.action.type,
    title,
    summary,
    articles: articles.length > 0 ? articles : undefined,
    procedure: trigger.action.type === "workflow_guide" ? procedure : undefined,
  };
}
```

### 5.4 — Cooldown via Upstash Redis

```typescript
import { Redis } from "@upstash/redis";

const COOLDOWN_PREFIX = "canon:cooldown:";

async function checkCooldown(
  userId: string,
  triggerId: string,
  cooldownHours: number,
): Promise<boolean> {
  if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) return false;
  if (!isRedisConfigured()) return true; // fail closed if cooldown storage is unavailable
  const key = `${COOLDOWN_PREFIX}${userId}:${triggerId}`;
  const exists = await redis.exists(key);
  return exists === 1; // true = on cooldown, skip
}

async function setCooldown(
  userId: string,
  triggerId: string,
  cooldownHours: number,
): Promise<void> {
  const key = `${COOLDOWN_PREFIX}${userId}:${triggerId}`;
  await redis.set(key, "1", { ex: cooldownHours * 3600 });
}
```

---

## §6 — API Route

### 6.1 — POST /api/answerlattice/predictive-help

```
POST /api/answerlattice/predictive-help
Content-Type: application/json
X-API-Key: ml_<api_key>

Request Body:
{
    "page": "webhook_setup",
    "feature": "webhooks",
    "workflow": "connect_webhook",
    "plan": "pro",
    "userRole": "admin",
    "entityHints": ["webhooks"],
    "userId": "user_123"
}

Response (200 — suggestion found):
{
    "suggestion": {
        "triggerId": "trigger_abc",
        "type": "help_card",
        "title": "Webhook Signature Verification",
        "summary": "Verify webhook signatures using HMAC-SHA256...",
        "articles": [
            { "id": "article_xyz", "title": "Webhook Signature Guide" }
        ]
    }
}

Response (204 — no suggestion / auth failure / rate limited):
No body.
```

### 6.2 — Authentication

- **Auth method:** API key via `X-API-Key` header (same as `/api/widget/search`)
- **Validation:** `validatePublicApiKey(apiKey)` — same as widget search route
- **Tenant isolation:** `tId`/`sId` extracted from auth result, **never** from request body
- **Origin control:** Reuses `widgetAllowedOrigins`; if configured, missing or unlisted origins return 204
- **Context normalization:** Request context is parsed through `AnswerlatticeContextSchema` before trigger evaluation, and stored trigger conditions are normalized at read time for backward compatibility
- **Graceful failure:** All auth/validation failures return 204 (not error JSON) — widget must never show errors

---

## §7 — Nightly Batch Integration

### Step 16 — Predictive Trigger Sync

Added to `answerlatticeNightly.ts` after existing 15 steps.

```
Step 16: Predictive Trigger Sync
  16a. Auto-generate suggested triggers from friction patterns
  16b. Rebuild platformSummary cache from collection
  16c. Compute effectiveness scores for active triggers
  16d. Auto-disable low-performing triggers (score < -0.3 after 100+ impressions)
```

### Auto-Trigger Generation Logic

```typescript
// For each top friction entity NOT already covered by a trigger:
// → Generate a suggested trigger rule
// → Status: 'suggested' (pending founder approval)
// → Priority: derived from friction score
// → Cooldown: 24 hours (default)
// → Action: help_card pointing to entity's canonical answer

for (const entity of frictionSnapshot.topFrictionEntities) {
  if (entity.frictionScore < 5) continue; // Low friction, skip
  if (existingTriggerEntities.has(entity.entityId)) continue; // Already covered

  await addPredictiveTrigger({
    tId,
    sId,
    name: `Help for ${entity.entityName}`,
    conditions: { page: undefined }, // Founder must set page
    action: {
      type: "help_card",
      entityId: entity.entityId,
    },
    priority: Math.min(Math.round(entity.last7d.frictionScore * 10), 100),
    cooldownHours: 24,
    status: "suggested",
    source: "friction_auto",
    frictionSource: {
      entityId: entity.entityId,
      entityName: entity.entityName,
      frictionScore: entity.last7d.frictionScore,
      signalCount: entity.last7d.queryCount,
    },
  });
}
```

---

## §8 — Widget Browser Contract Integration

### 8.1 — Page Entry Hook

The widget runtime uses the v1 browser contract on page navigation:

```typescript
window.AnswerlatticeWidget?.page({
  path: "/settings/webhooks",
  title: "Webhook setup",
  feature: "webhooks",
  workflow: "connect_webhook",
});
```

This triggers:

1. POST to `/api/answerlattice/predictive-help` with context
2. If suggestion returned → render pre-emptive help UI
3. Log `suggestion_shown` signal

### 8.2 — Backwards Compatibility

Older installs that do not call `window.AnswerlatticeWidget.page()` simply do not provide predictive context. No breaking change. Predictive support is an enhancement, not a requirement.

---

## §9 — Governance Rules

1. **Trigger rules are human-governed** — Auto-generated triggers start as `suggested` status. Never auto-activate.
2. **Maximum 500 triggers per tenant** — Hard cap to prevent explosion.
3. **Priority 0-100** — Strictly bounded.
4. **Cooldown minimum 1 hour** — Prevents annoyance.
5. **Cooldown maximum 720 hours (30 days)** — Prevents stale triggers from never showing.
6. **Auto-disable threshold** — Triggers with score < -0.3 after 100+ impressions are auto-disabled.
7. **Audit logged** — All trigger create/update/delete/auto-disable events logged.
8. **Multi-tenant isolation** — Triggers scoped to tId+sId. Never cross-tenant.

---

## §10 — Edge Cases & Failure Handling

| Scenario                              | Handling                                                   |
| ------------------------------------- | ---------------------------------------------------------- |
| Trigger rules doc not found           | Return 204 (no suggestion). Silent.                        |
| No triggers match context             | Return 204 (no suggestion). Silent.                        |
| All matching triggers on cooldown     | Return 204 (no suggestion). Silent.                        |
| Canonical answer not found for entity | Use trigger title/summary if present; otherwise skip trigger and try next. |
| Redis unavailable for cooldown        | Fail closed and skip proactive suggestions to avoid repeated prompts. |
| Trigger doc exceeds 1MB               | Log error. Hard limit of 500 triggers plus bounded snippets prevents this. |
| API route error                       | Return 204. Never block product. Never throw to widget.    |
| Nightly batch fails                   | Triggers remain unchanged. No operational risk.            |

---

## §11 — Performance Constraints

| Operation              | Target    | Actual (Estimated)             |
| ---------------------- | --------- | ------------------------------ |
| Trigger rule loading   | <20ms     | ~5ms (single doc read, cached) |
| Condition evaluation   | <5ms      | ~1ms (simple string matching)  |
| Cooldown check         | <10ms     | ~3ms (Upstash Redis)           |
| Answer resolution      | <30ms     | ~0ms common path via `resolvedSuggestion`; 1 Firestore read only for stale/legacy summaries |
| **Total API response** | **<50ms** | **~30ms**                      |

---

## §12 — Feature Flags

### Frontend (`src/config/features.ts`)

```typescript
ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT: true,
// Requires: ENABLE_ANSWERLATTICE_CONTEXT_AWARE = true
// Requires: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS = true
```

### Cloud Functions (`functions-answerlattice/src/constants/features.ts`)

```typescript
ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT: true,
```

---

## §13 — Backwards Compatibility

| Concern                  | Resolution                                                     |
| ------------------------ | -------------------------------------------------------------- |
| Existing widget installs | No change needed. Predictive help is opt-in via `window.AnswerlatticeWidget.page()` |
| Existing search pipeline | Untouched. Predictive help is a separate API route             |
| Existing signal events   | New signal types are additive. Existing queries unaffected     |
| Existing nightly batch   | New step 16 appended. All prior steps unchanged                |
| Existing types           | Additive fields only. No breaking changes                      |

---

## §14 — ADRs (Architecture Decision Records)

### ADR-1: platformSummary Cache vs Separate Collection Query

**Decision:** Use BOTH — collection for CRUD, platformSummary doc for read-hot-path.

**Rationale:** Same proven pattern as `entityGraphIndex_{tId}_{sId}`. Single doc read loads all triggers. CRUD operates on individual collection docs. Nightly batch syncs collection → platformSummary.

### ADR-2: Upstash Redis for Cooldowns vs Firestore

**Decision:** Upstash Redis.

**Rationale:** TTL auto-expiry. Zero cleanup needed. Sub-millisecond reads. Already deployed. Firestore alternative would require: writes on every impression + cleanup job = more expensive and slower.

### ADR-3: Reuse Signal Events vs New Collection

**Decision:** Reuse existing `answerlattice_signalEvents` with new signal types.

**Rationale:** Same append-only pattern. Same TTL. Same nightly aggregation. Adding 3 new signal types is freeze-compliant (additive). Avoids collection proliferation.

### ADR-4: API Call on Page Entry vs Event Streaming

**Decision:** Simple API call per page entry. No Pub/Sub, no Cloud Run, no event streaming.

**Rationale:** Answerlattice's scale (<1000 tenants initially) doesn't justify streaming infrastructure. An API call per page entry is: simpler, cheaper, easier to debug, sufficient for sub-50ms response. If scale demands streaming later, the trigger evaluation engine is already stateless and can be moved to a Cloud Function subscriber.

### ADR-5: AND Logic Only (No OR Conditions)

**Decision:** All trigger conditions use AND logic. No OR, no nested conditions.

**Rationale:** Simplicity. Zendesk supports OR/nested but it creates complex UX and error-prone rules. AND-only covers 95% of use cases. If OR is needed later, create two separate triggers (same result, simpler model).

### ADR-6: Maximum 500 Triggers Per Tenant

**Decision:** Hard cap at 500 triggers per tenant.

**Rationale:** 500 triggers with pre-resolved snippets remains within Firestore's 1MB document limit for the intended trigger shape. Most tenants will have 10-50 active triggers. The cap prevents runaway widget/runtime cost while keeping room for larger products.

### ADR-7: Auto-Generated Triggers Require Approval

**Decision:** Auto-generated triggers start as `suggested` status. Never auto-activate.

**Rationale:** Answerlattice doctrine: "Signals propose mutations. Humans approve." Same principle applies to trigger rules. Auto-activation could cause annoying/incorrect proactive help.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-24 | 1.1.1 | Added longer negative cache for empty/no-active trigger summaries. |
| 2026-05-24 | 1.1.0 | Added widget capability gating, summary-backed resolved suggestions, targeted answer lookup, unchanged-write skip, and Redis fail-closed behavior. |
| 2026-03-10 | 1.0.0 | Initial implementation blueprint. |
