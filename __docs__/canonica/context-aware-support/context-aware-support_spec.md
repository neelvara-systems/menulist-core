# Context-Aware Support — Product Specification

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_CANONICA_CONTEXT_AWARE`
> **Audience:** CEO, PM, Clients

---

## §1 — Problem Statement

When a SaaS end-user asks Canonica "Why is this not working?", the system currently has no knowledge of **where** in the product the user is or **what** they are trying to do. It can only match against query text.

This means:
- Vague queries produce vague or wrong answers
- Entity resolution is purely text-based, missing obvious context clues
- Canonical answers that are highly relevant to the user's current page/workflow may be ranked lower than generic matches
- More queries fall through to RAG fallback (expensive, less reliable)

**Core insight:** 80%+ of support questions are page-specific. If the system knows the user is on the Stripe integration page, "Why is this not working?" immediately narrows to Stripe integration troubleshooting.

---

## §2 — Solution Overview

Allow the client product (SaaS using Canonica) to pass **structured product context** alongside every support query. This context flows into the existing retrieval pipeline to boost entity matching accuracy.

**Context payload structure:**
```
{
  feature: "integrations",
  page: "stripe_integration_page",
  workflow: "connect_integration",
  entityHints: ["stripe"],
  userRole: "admin",
  plan: "pro"
}
```

The payload is:
- **Optional** — system degrades gracefully without it (existing behavior)
- **Lightweight** — target <1KB per request
- **Transient** — never stored in Firestore
- **Versioned** — `contextVersion: 1` enables future extension without breaking clients

---

## §3 — User Stories

### US-1: End-User Gets Page-Aware Answers
**As** an end-user on the Stripe integration page,
**When** I ask "Why is this not connecting?",
**Then** Canonica returns Stripe-specific troubleshooting (not generic connection docs).

### US-2: End-User Gets Role-Aware Answers
**As** a viewer (non-admin) asking "How do I add a team member?",
**When** the context includes `userRole: "viewer"`,
**Then** Canonica returns "Only admins can add team members" instead of the admin workflow.

### US-3: End-User Gets Plan-Aware Answers
**As** a free-tier user asking "How do I use advanced analytics?",
**When** the context includes `plan: "free"`,
**Then** Canonica returns "Advanced analytics is available on Pro plan" instead of the setup guide.

### US-4: Vague Query With Context
**As** an end-user on the webhook settings page,
**When** I ask "Why is this failing?",
**Then** Canonica resolves "this" to webhook configuration based on page context.

### US-5: Graceful Degradation Without Context
**As** an end-user without SDK context integration,
**When** I ask a question through the widget,
**Then** Canonica behaves exactly as today (no regression).

### US-6: SaaS Founder Sees Improved Coverage
**As** a SaaS founder using Canonica,
**When** I enable context-aware support,
**Then** my canonical coverage rate increases because more queries resolve via canonical answers.

---

## §4 — Context Payload Schema

### Required Fields
None. All context fields are optional. The system degrades gracefully when any or all fields are missing.

### Supported Fields

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `contextVersion` | `number` | Schema version for backwards compatibility | `1` |
| `feature` | `string` | High-level product subsystem | `"integrations"` |
| `page` | `string` | Exact UI location (stable identifier, NOT URL) | `"stripe_integration_page"` |
| `workflow` | `string` | Current user action/process | `"connect_integration"` |
| `entityHints` | `string[]` | Explicit entity references (max 5) | `["stripe"]` |
| `userRole` | `string` | User's permission level | `"admin"` |
| `plan` | `string` | User's subscription tier | `"pro"` |

### Design Constraints
- Total payload < 2KB
- `entityHints` max 5 items, each ≤64 characters
- String fields max 100 characters each
- `contextVersion` defaults to 1 if not provided
- No PII (email, name, IP) — context is product state only
- No analytics data (session length, clicks) — context is product state only

---

## §5 — SDK Integration Model

### Primary: SDK Instrumentation (Recommended)
SaaS developers explicitly send context via the Canonica widget SDK.

```javascript
Canonica.init({
  apiKey: 'ck_...',
  context: {
    feature: 'integrations',
    page: 'stripe_integration_page',
    plan: 'pro',
    userRole: 'admin'
  }
});

// Context auto-attached to every query
Canonica.search('Why is Stripe not connecting?');
```

### Fallback: No Context
If no context is provided, the system operates exactly as today. Zero regression.

### Dynamic Context Updates
Context can be updated as the user navigates:

```javascript
Canonica.updateContext({
  page: 'webhook_settings_page',
  workflow: 'configure_webhook'
});
```

---

## §6 — How Context Improves Retrieval

### Without Context (Current)
```
Query: "Why is this not working?"
→ Tokenize: ["working"]
→ Entity match: 0 entities matched (too vague)
→ Fallback to RAG (expensive, unreliable)
```

### With Context
```
Query: "Why is this not working?"
Context: { page: "stripe_integration_page", entityHints: ["stripe"] }
→ Tokenize query: ["working"]
→ Context boost: entity "integration_stripe" gets +50 from entityHints, +30 from page
→ Entity match: integration_stripe (score: 80+)
→ Canonical answer: Stripe integration troubleshooting
→ No RAG needed (fast, cheap, reliable)
```

### Impact on Canonical Coverage KPI
- Vague queries that currently fall through to RAG → resolved canonically via context
- Estimated canonical coverage increase: **15-25%** for context-enabled clients
- Each avoided RAG fallback saves: 1 embedding API call + ~8 Firestore reads

---

## §7 — Context Collection Architecture

### Decision: SDK-First (Industry Standard)

| Approach | Accuracy | Adoption Friction | Scalability | Firebase Cost |
|----------|----------|-------------------|-------------|---------------|
| **SDK instrumentation** | Very high | Medium (15-30 min) | Very high | Zero additional |
| URL inference | Low | Zero | Medium | Higher (more fallbacks) |
| DOM scanning | Low-Medium | Zero | Low | Higher |

Canonica targets **SaaS developers** (ICP). SDK instrumentation aligns with developer infrastructure expectations (Stripe, Segment, Sentry pattern).

### Why Not URL Inference
- URLs are unstable (change with redesigns)
- SPAs often have identical URLs across different views
- Cannot detect workflow state from URL
- Security risk (reading arbitrary DOM content)

---

## §8 — Security Requirements

1. **Context is untrusted input** — all fields validated against strict schema
2. **No prompt injection** — context values are data, never mixed with LLM instructions
3. **Field whitelist** — unknown fields silently dropped
4. **Size limits** — payload rejected if >2KB
5. **No PII** — validated that no email/phone patterns are in context values
6. **Rate limiting** — existing API key rate limits apply (no additional needed)

---

## §9 — Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| AC-1 | Context payload accepted by widget search API | POST with context returns 200 |
| AC-2 | Context payload accepted by search-kb API | POST with context returns 200 |
| AC-3 | entityHints boost entity matching scores | Query "why failing" + hint "stripe" → stripe entity ranked #1 |
| AC-4 | Page context boosts entity matching | Query "why failing" + page "stripe_page" → stripe entity ranked #1 |
| AC-5 | Plan/role context flows to specificity scoring | Plan "free" → free-tier specific answer preferred |
| AC-6 | No context = no regression | All existing queries return identical results |
| AC-7 | Invalid context silently sanitized | Bad payload → cleaned, query still processed |
| AC-8 | Context payload <2KB enforced | Oversized payload → 400 error |
| AC-9 | Feature flag gates the feature | Flag OFF → context fields ignored |
| AC-10 | Zero additional Firestore reads | Performance logs show same read count |

---

## §10 — Out of Scope (v1)

- Context-based article suggestion (proactive support) → Item #12
- Workflow step-by-step rendering → Item #2
- Context-based friction analytics → Item #5
- External tool integrations (Slack notifications) → Item #7
- In-memory entity dictionary cache → Item #3
- Client-side page/feature mapping tables (client sends stable IDs)
- Workflow stage persistence across sessions

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial spec from ChatGPT analysis + codebase audit + external research |
