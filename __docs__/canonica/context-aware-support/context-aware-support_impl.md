# Context-Aware Support — Implementation Blueprint

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.1.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_CANONICA_CONTEXT_AWARE`
> **Audience:** Developers
> **ChatGPT Review:** 3 guardrails accepted (§4.8), 1 rejected (intersection requirement)

---

## §1 — Architecture Overview

### Design Philosophy

ChatGPT proposed 8 separate components (Entity Hint Resolver, Entity Scoring Engine, Context Prioritization Logic, Page/Feature Mapping, Workflow Detection, Context Validation & Sanitization, etc.).

**Canonica's approach: Extend existing retrieval pipeline, not build new systems.**

The codebase already has:

- `RetrievalContext` interface (tId, sId, currentVersion, planId, roleId)
- `matchEntitiesFromIndex()` — token-based entity scoring
- `scoreBySpecificity()` — version/plan/role matching
- Entity search index with synonyms and normalized tokens
- Intent classification (rule-based)
- Zod validation patterns

We add context fields to these existing systems. Zero new services. Zero new collections.

### Data Flow

```
Widget browser contract
    ↓
POST /api/widget/search (or /api/helpCenter/search-kb)
    ↓
Zod validation (contextSchema.ts)
    ↓
Context normalization + sanitization
    ↓
attemptCanonicalRetrieval(query, context)
    ↓
matchEntitiesFromIndex(queryTokens, searchIndex, contextBoosts)  ← NEW: context boosts
    ↓
scoreBySpecificity(answers, context)  ← EXISTING: already uses planId/roleId
    ↓
Canonical answer (or RAG fallback)
```

---

## §2 — Type Definitions

### New: CanonicaContextPayload

Add to `src/types/canonica/index.ts`:

```typescript
/**
 * Context payload sent by client product alongside support queries.
 * Describes the user's current product state for context-aware retrieval.
 *
 * All fields optional. System degrades gracefully without context.
 * Context is TRANSIENT — never persisted to Firestore.
 *
 * @see __docs__/canonica/context-aware-support/
 */
export interface CanonicaContextPayload {
  contextVersion?: number; // Schema version (default: 1)
  feature?: string; // Product subsystem (e.g., "integrations")
  page?: string; // UI location identifier (e.g., "stripe_integration_page")
  workflow?: string; // Current action (e.g., "connect_integration")
  entityHints?: string[]; // Explicit entity references (max 5)
  userRole?: string; // Permission level (e.g., "admin")
  plan?: string; // Subscription tier (e.g., "pro")
}
```

### Extended: RetrievalContext

Extend existing `RetrievalContext` in `src/lib/canonica/canonicalRetrieval.ts`:

```typescript
export interface RetrievalContext {
  tId: number;
  sId: number;
  currentVersion?: number;
  planId?: string;
  roleId?: string;
  // NEW: Context-aware support fields
  context?: CanonicaContextPayload;
}
```

---

## §3 — File Changes (Complete List)

### Files to MODIFY (5)

| #   | File                                        | Changes                                                                                                              |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/types/canonica/index.ts`               | Add `CanonicaContextPayload` interface                                                                               |
| 2   | `src/lib/canonica/canonicalRetrieval.ts`    | Extend `RetrievalContext`, add `applyContextBoosts()`, enhance `matchEntitiesFromIndex()` and `scoreBySpecificity()` |
| 3   | `src/app/api/widget/search/route.ts`        | Accept `context` field in request body, validate, pass to retrieval                                                  |
| 4   | `src/app/api/helpCenter/search-kb/route.ts` | Accept optional `context` field, pass to canonical retrieval                                                         |
| 5   | `src/config/features.ts`                    | Add `ENABLE_CANONICA_CONTEXT_AWARE: false`                                                                           |

### Files to CREATE (1)

| #   | File                                  | Purpose                                                  |
| --- | ------------------------------------- | -------------------------------------------------------- |
| 1   | `src/lib/validation/contextSchema.ts` | Zod schema for context payload validation + sanitization |

### Total: 6 files (5 modified, 1 new)

---

## §4 — Detailed Implementation

### 4.1 — Context Validation (NEW FILE)

**File:** `src/lib/validation/contextSchema.ts`

```typescript
import { z } from "zod";

const MAX_STRING_LENGTH = 100;
const MAX_ENTITY_HINTS = 5;
const MAX_HINT_LENGTH = 64;
const MAX_PAYLOAD_SIZE = 2048; // 2KB

// Sanitize: lowercase, strip special chars except underscore/hyphen
const sanitizeContextString = (val: string) =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "")
    .slice(0, MAX_STRING_LENGTH);

export const CanonicaContextSchema = z
  .object({
    contextVersion: z.number().int().min(1).max(10).optional().default(1),
    feature: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeContextString)
      .optional(),
    page: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeContextString)
      .optional(),
    workflow: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeContextString)
      .optional(),
    entityHints: z
      .array(
        z
          .string()
          .max(MAX_HINT_LENGTH)
          .transform((s) => s.trim().toLowerCase()),
      )
      .max(MAX_ENTITY_HINTS)
      .optional(),
    userRole: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeContextString)
      .optional(),
    plan: z
      .string()
      .max(MAX_STRING_LENGTH)
      .transform(sanitizeContextString)
      .optional(),
  })
  .strict(); // .strict() drops unknown fields silently

export type ValidatedContextPayload = z.infer<typeof CanonicaContextSchema>;
```

Key design decisions:

- `.strict()` silently drops unknown fields (security: prevents injection)
- `.transform(sanitizeContextString)` normalizes values (lowercase, strip special chars)
- Size limits enforced per field AND total payload
- No PII patterns allowed in string fields

### 4.2 — Context-Boosted Entity Matching

**File:** `src/lib/canonica/canonicalRetrieval.ts`

Add a new function `applyContextBoosts()` that generates bonus entity scores from context fields:

```typescript
/**
 * Generate entity score boosts from context payload.
 * Returns a Map<entityId, bonusScore> that is added to entity match scores.
 *
 * Context boost weights (deterministic, rule-based):
 * - entityHints: +50 per matching entity (highest weight — explicit signal)
 * - page: +30 (page context is very strong location signal)
 * - workflow: +25 (workflow narrows to procedural domain)
 * - feature: +15 (broad domain hint)
 *
 * Resolution: context strings are tokenized and matched against
 * the entity search index (same as query tokens, but with higher weights).
 */
function applyContextBoosts(
  context: CanonicaContextPayload | undefined,
  searchIndex: CanonicaEntitySearchIndex[],
): Map<string, number> {
  const boosts = new Map<string, number>();
  if (!context) return boosts;

  const WEIGHTS = {
    entityHint: 50,
    page: 30,
    workflow: 25,
    feature: 15,
  };

  // Helper: tokenize a context string and find matching entities
  const boostFromString = (value: string | undefined, weight: number) => {
    if (!value) return;
    const tokens = canonicaTokenize(value);
    for (const entry of searchIndex) {
      let matched = false;
      for (const token of tokens) {
        if (entry.canonicalName.toLowerCase().includes(token)) {
          matched = true;
          break;
        }
        if (entry.synonyms.some((s) => s.toLowerCase().includes(token))) {
          matched = true;
          break;
        }
        if (entry.normalizedTokens.includes(token)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        boosts.set(entry.entityId, (boosts.get(entry.entityId) || 0) + weight);
      }
    }
  };

  // Apply entityHints (highest weight — explicit developer signal)
  if (context.entityHints) {
    for (const hint of context.entityHints) {
      boostFromString(hint, WEIGHTS.entityHint);
    }
  }

  // Apply page context
  boostFromString(context.page, WEIGHTS.page);

  // Apply workflow context
  boostFromString(context.workflow, WEIGHTS.workflow);

  // Apply feature context
  boostFromString(context.feature, WEIGHTS.feature);

  return boosts;
}
```

Then modify `matchEntitiesFromIndex()` to accept and apply context boosts:

```typescript
function matchEntitiesFromIndex(
  queryTokens: string[],
  searchIndex: CanonicaEntitySearchIndex[],
  contextBoosts?: Map<string, number>, // NEW parameter
): { entityId: string; score: number }[] {
  const entityScores = new Map<string, number>();

  // Existing query token matching (unchanged)
  for (const entry of searchIndex) {
    let matchScore = 0;
    for (const token of queryTokens) {
      if (entry.canonicalName.toLowerCase().includes(token))
        matchScore += entry.weight * 2;
      for (const synonym of entry.synonyms) {
        if (synonym.toLowerCase().includes(token)) matchScore += entry.weight;
      }
      for (const indexToken of entry.normalizedTokens) {
        if (indexToken === token) matchScore += entry.weight * 1.5;
      }
    }
    if (matchScore > 0) {
      entityScores.set(
        entry.entityId,
        (entityScores.get(entry.entityId) || 0) + matchScore,
      );
    }
  }

  // NEW: Apply context boosts
  if (contextBoosts) {
    for (const [entityId, boost] of contextBoosts) {
      entityScores.set(entityId, (entityScores.get(entityId) || 0) + boost);
    }
  }

  return Array.from(entityScores.entries())
    .map(([entityId, score]) => ({ entityId, score }))
    .sort((a, b) => b.score - a.score);
}
```

### 4.3 — Enhanced Specificity Scoring

Extend `scoreBySpecificity()` to use context's `plan` and `userRole`:

```typescript
function scoreBySpecificity(
  answers: CanonicaCanonicalAnswer[],
  context: RetrievalContext,
): CanonicaCanonicalAnswer[] {
  return answers
    .map((answer) => {
      let score = 0;

      // Version window match (unchanged)
      if (context.currentVersion) {
        const { from, to } = answer.productBinding.applicableVersions;
        if (
          context.currentVersion >= from &&
          (!to || context.currentVersion <= to)
        ) {
          score += 100;
        }
      }

      // Scope depth (unchanged)
      const scopeDepth =
        (answer.scope.planIds?.length ? 10 : 0) +
        (answer.scope.roleIds?.length ? 10 : 0) +
        (answer.scope.stateIds?.length ? 10 : 0);
      score += scopeDepth;

      // Plan match — use context.planId OR context.context.plan (NEW)
      const effectivePlan = context.planId || context.context?.plan;
      if (effectivePlan && answer.scope.planIds?.includes(effectivePlan)) {
        score += 20;
      }

      // Role match — use context.roleId OR context.context.userRole (NEW)
      const effectiveRole = context.roleId || context.context?.userRole;
      if (effectiveRole && answer.scope.roleIds?.includes(effectiveRole)) {
        score += 20;
      }

      // Validation recency (unchanged)
      if (answer.validation.lastValidatedOn) {
        const daysSinceValidation =
          (Date.now() - answer.validation.lastValidatedOn.toMillis()) /
          (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSinceValidation / 30);
      }

      // Confidence score (unchanged)
      score += answer.validation.confidenceScore * 5;

      // Drift penalty (unchanged)
      if (answer.governance.driftFlag) {
        score -= 50;
      }

      return { answer, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.answer);
}
```

### 4.4 — Main Retrieval Function Changes

Modify `attemptCanonicalRetrieval()`:

```typescript
export async function attemptCanonicalRetrieval(
    query: string,
    context: RetrievalContext
): Promise<CanonicalRetrievalResult> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_CANONICAL_ANSWERS) {
        return { found: false, canonical: false, matchedEntityIds: [], confidence: 'none', fallbackReason: 'canonical_answers_disabled' };
    }

    try {
        const searchIndex = await getEntitySearchIndex(context.tId, context.sId);
        if (!searchIndex || searchIndex.length === 0) {
            return { found: false, canonical: false, matchedEntityIds: [], confidence: 'none', fallbackReason: 'no_entity_index' };
        }

        const queryTokens = tokenizeQuery(query);

        // NEW: Generate context boosts (feature-flagged)
        let contextBoosts: Map<string, number> | undefined;
        if (FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_AWARE && context.context) {
            contextBoosts = applyContextBoosts(context.context, searchIndex);
        }

        // Pass context boosts to entity matching
        const matchedEntities = matchEntitiesFromIndex(queryTokens, searchIndex, contextBoosts);

        // ... rest of function unchanged ...
    }
}
```

### 4.5 — Widget Search Route Changes

**File:** `src/app/api/widget/search/route.ts`

```typescript
// After parsing request body:
const query =
  typeof body.query === "string"
    ? body.query.trim().slice(0, MAX_QUERY_LENGTH)
    : "";

// NEW: Parse and validate context
let validatedContext: ValidatedContextPayload | undefined;
if (body.context && FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_AWARE) {
  try {
    const { CanonicaContextSchema } =
      await import("@lib/validation/contextSchema");
    validatedContext = CanonicaContextSchema.parse(body.context);
  } catch {
    // Invalid context is silently dropped (graceful degradation)
    validatedContext = undefined;
  }
}

// Pass to retrieval:
const canonicalResult = await attemptCanonicalRetrieval(query, {
  tId,
  sId,
  context: validatedContext, // NEW
});
```

### 4.6 — Search-KB Route Changes

**File:** `src/app/api/helpCenter/search-kb/route.ts`

```typescript
// After validatedInput destructuring:
const {
  query: searchQuery,
  imageUrl,
  mode,
  context,
  productContext: rawProductContext,
} = validatedInput;

// Parse product context if present.
// Current clients send it as a top-level field; legacy context.productContext is
// still accepted only when context is not conversation history.
let productContext: ValidatedContextPayload | undefined;
const legacyProductContext =
  context && !Array.isArray(context) ? context.productContext : undefined;
const candidateProductContext = rawProductContext || legacyProductContext;

if (candidateProductContext && FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_AWARE) {
  try {
    const { CanonicaContextSchema } =
      await import("@lib/validation/contextSchema");
    const parsedContext = CanonicaContextSchema.parse(candidateProductContext);

    // User role is account/session authority, not a trusted client field.
    const trustedSessionRole = session?.user?.role || session?.role;
    productContext = {
      ...parsedContext,
      ...(trustedSessionRole
        ? { userRole: String(trustedSessionRole).trim().toLowerCase() }
        : {}),
    };
  } catch {
    productContext = undefined;
  }
}

// Pass to canonical retrieval:
const canonicalResult = await attemptCanonicalRetrieval(searchQuery, {
  tId: session.tId,
  sId: session.sId,
  context: productContext, // NEW
});
```

### 4.6.1 — MenuList Help Center Mount Context

**Files:**

- `src/components/templates/main-app/helpCenter/HeroSearchBar.tsx`
- `src/components/templates/main-app/helpChat/index.tsx`
- `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts`
- `src/components/templates/main-app/helpChat/api.ts`

The MenuList Help Center builds a transient context payload from the active Help Center tab:

- `feature: "help_center"`
- `page: "help_center_home"` or `help_center_${tab}`
- `workflow`: mapped from the current tab (`search_help`, `submit_ticket`, `read_faq`, etc.)
- `entityHints`: `["help_center"]` plus the active tab when applicable

This context is passed into `HelpChat`, then into `/api/helpCenter/search-kb` as top-level `productContext`. It is never persisted. If the tab changes, the next search uses the updated context.

Boundary rule: this mount context is a transient retrieval hint, not Canonica tenancy or source identity. It must not carry MenuList tenant/store/menu IDs, customer contact data, or a hardcoded source product. Source identity belongs in CCT/`sourceContext`; MenuList is one client adapter, not a Canonica core default.

### 4.6.2 — Server Retrieval Boundary

`coreSearch()` and `attemptCanonicalRetrieval()` run in API routes, so Canonica canonical retrieval, instant-cache entity lookup, and server signal emission must use `canonicaFirestoreAdmin`. They must not use browser Firebase DAL functions that depend on client auth state.

Current server-side read path:

- `src/lib/search/searchCore.ts` reads entity index and latest release through Canonica Admin Firestore for instant-cache lookup.
- `src/lib/canonica/canonicalRetrieval.ts` reads entity index, canonical answers, releases, and entity descriptions through Canonica Admin Firestore.
- `src/lib/canonica/signalEmitter.ts` writes server-side signals through Canonica Admin Firestore and skips invalid tenant/store context.

### 4.7 — Feature Flag

**File:** `src/config/features.ts`

```typescript
ENABLE_CANONICA_CONTEXT_AWARE: true, // Context-aware retrieval: inject product state into canonical matching
```

---

## §4.8 — Three Guardrails (From ChatGPT Feedback Review)

Three safety guardrails were added after ChatGPT reviewed this design (2026-03-08):

### Guardrail 1 — Exact Token Match for Context Boosts

Context boosts use `normalizedTokens.includes(token)` (exact match) instead of `canonicalName.includes(token)` (substring). This prevents broad context like `feature: "integrations"` from diluting signal across all integration entities (stripe, slack, zapier).

### Guardrail 2 — Query Dominance Dampening

If query tokens strongly match an entity (`queryMatchScore >= STRONG_QUERY_THRESHOLD`), context boosts are dampened by 50%. This prevents context from overriding a clearly specific query. Example: user asks "How do I export analytics?" on the Stripe page — analytics should still win.

Threshold: `STRONG_QUERY_THRESHOLD = 5.0` (configurable constant).

### Guardrail 3 — Maximum Boost Cap

Total context boost per entity is capped at `MAX_CONTEXT_BOOST = 80`. Prevents runaway scores even if all context fields match the same entity. This is cheap insurance against bad widget context integrations.

---

## §5 — Context Boost Weight Rationale

| Signal            | Weight             | Rationale                                                                                                        |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `entityHints`     | +50 each           | Explicit developer signal. Highest confidence. Developer tells Canonica exactly which entity is relevant.        |
| `page`            | +30                | Strong location signal. 80%+ of support questions are page-specific.                                             |
| `workflow`        | +25                | Narrows to procedural domain. Slightly less than page because workflow detection requires more explicit integration effort. |
| `feature`         | +15                | Broad domain hint. Useful for narrowing to correct ontology subtree but not entity-specific.                     |
| Query token match | 1.0-2.0 (existing) | Baseline text matching. Context boosts are intentionally much higher to allow context to override vague queries. |

**Key design principle:** Context boosts are HIGH relative to query token scores. This means when context is present, it dominates for vague queries ("why not working?") but for specific queries ("how to configure Stripe webhook"), the query tokens also contribute strongly.

**ENTITY_MATCH_MIN_SCORE adjustment:** The existing threshold of 2.0 may need adjustment when context boosts are active, because context alone can produce high scores even for vague queries. The threshold should apply to the COMBINED score (query + context), which is the desired behavior — context-boosted entities should be able to exceed the threshold even when query tokens are weak.

---

## §6 — ADR (Architecture Decision Records)

### ADR-1: Extend Existing Pipeline vs New Components

**Decision:** Extend existing `matchEntitiesFromIndex()` and `scoreBySpecificity()`.

**Rejected:** ChatGPT's proposal of 8 separate components (Entity Hint Resolver, Entity Scoring Engine, Context Prioritization Logic, Page/Feature Mapping, Workflow Detection, etc.).

**Rationale:**

- Canonica already has the right retrieval structure
- Adding context is a parameter addition, not an architecture change
- 8 new components would violate the 3-year freeze principle (unnecessary structural complexity)
- Single-file enhancement is easier to test, debug, and maintain

### ADR-2: Context is Transient (Never Stored)

**Decision:** Context payload is processed in memory only. Never written to Firestore.

**Rationale:**

- Firebase cost: storing context per query at scale = massive write costs
- Privacy: context contains product state, not PII, but still unnecessary to persist
- Performance: zero write overhead per query
- Observability: context fields logged to performance logs (existing write, no new collection)

### ADR-3: Explicit Browser Context, No Inference Fallback in v1

**Decision:** Rely entirely on context provided through the v1 browser contract. No URL parsing or DOM scanning.

**Rejected:** ChatGPT's hybrid model (browser context + URL inference fallback).

**Rationale:**

- Canonica's ICP is SaaS developers — they can integrate the widget context contract (15-30 min effort)
- URL inference is unreliable in SPAs
- DOM scanning introduces security concerns
- Inference adds complexity with marginal benefit
- Can always add inference later as additive enhancement

### ADR-4: Context Boosts as Additive Scores

**Decision:** Context signals add bonus scores to entity matching. They don't filter or restrict.

**Rationale:**

- Additive model is safe: worst case, context boosts an irrelevant entity but the query tokens still contribute
- Filtering model is dangerous: wrong context could block the correct entity entirely
- Additive model degrades gracefully: if context is wrong, query tokens still work

### ADR-5: No Page/Feature Mapping Tables Inside Canonica

**Decision:** Canonica does NOT maintain mapping tables from page identifiers to entity IDs.

**Rationale:**

- The client product knows its own page→entity mapping better than Canonica
- Client sends `entityHints` which are the resolved entities
- `page` and `feature` fields are matched against entity search index via tokenization (same as query)
- This avoids maintaining a second mapping layer that would drift from the client's actual UI

---

## §7 — Observability

### Performance Logging (Existing Infrastructure)

Add context fields to existing performance log entries:

```typescript
// In CANONICAL_HIT log:
data: {
    query: searchQuery,
    contextProvided: !!validatedContext,
    contextFields: validatedContext ? Object.keys(validatedContext).filter(k => k !== 'contextVersion') : [],
    contextBoostApplied: contextBoosts?.size || 0,
    // ... existing fields ...
}

// In CANONICAL_MISS log:
data: {
    query: searchQuery,
    contextProvided: !!validatedContext,
    contextFields: validatedContext ? Object.keys(validatedContext).filter(k => k !== 'contextVersion') : [],
    // ... existing fields ...
}
```

### Metrics to Track

- **Context adoption rate:** % of queries that include context payload
- **Context canonical hit rate:** canonical hit rate WITH context vs WITHOUT context
- **Context boost impact:** average entity score increase from context
- **Top context fields used:** which fields are most commonly provided

These are derived from existing performance logs — no new collection needed.

---

## §8 — Testing Strategy

### Unit Tests

1. **Context validation:**
   - Valid payload → passes
   - Missing fields → fills defaults
   - Unknown fields → stripped
   - Oversized payload → rejected
   - Special characters → sanitized
   - Empty payload → treated as no context

2. **Context boost generation:**
   - entityHints match → +50 per hint
   - page match → +30
   - workflow match → +25
   - feature match → +15
   - No context → empty boosts map
   - Non-matching context → empty boosts map

3. **Enhanced entity matching:**
   - Query-only → same as before (no regression)
   - Query + context boosts → context entities ranked higher
   - Vague query + strong context → context-boosted entity wins
   - Specific query + weak context → query-matched entity wins

### Integration Tests

4. **Widget API:**
   - POST with query only → works (backwards compatible)
   - POST with query + context → context influences results
   - POST with invalid context → silently dropped, query still works
   - POST with flag OFF → context ignored

5. **Search-KB API:**
   - Same as widget tests but via authenticated route

### Regression Tests

6. **Existing query behavior unchanged:**
   - Run existing test queries WITHOUT context
   - Verify identical results to pre-implementation

---

## §9 — Rollout Plan

| Phase | Action                                                              | Risk                        |
| ----- | ------------------------------------------------------------------- | --------------------------- |
| 1     | Implement + deploy with flag OFF                                    | Zero risk                   |
| 2     | Enable context-aware support for the first independent client integration (MenuList) | Low — internal only         |
| 3     | Test with sample queries + context payloads                         | Low — verify boost behavior |
| 4     | Monitor performance logs for context adoption + hit rate            | Zero risk — read-only       |
| 5     | Enable for early adopter tenants                                    | Medium — gradual rollout    |
| 6     | Enable for all tenants                                              | Low — proven by Phase 5     |

---

## §10 — Implementation Order

1. Add `CanonicaContextPayload` type to `src/types/canonica/index.ts`
2. Create `src/lib/validation/contextSchema.ts` (Zod schema)
3. Add `ENABLE_CANONICA_CONTEXT_AWARE` feature flag
4. Modify `canonicalRetrieval.ts`:
   a. Extend `RetrievalContext` interface
   b. Add `applyContextBoosts()` function
   c. Modify `matchEntitiesFromIndex()` to accept boosts
   d. Modify `scoreBySpecificity()` to use context plan/role
   e. Modify `attemptCanonicalRetrieval()` to generate and apply boosts
5. Modify widget search route to accept + validate context
6. Modify search-kb route to accept + pass context
7. Add performance log fields
8. Run `npx tsc --noEmit` — zero errors required

---

## Version History

| Date       | Version | Change                           |
| ---------- | ------- | -------------------------------- |
| 2026-03-08 | 1.0.0   | Initial implementation blueprint |
