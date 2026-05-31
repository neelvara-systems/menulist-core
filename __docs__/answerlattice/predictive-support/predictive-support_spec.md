# Predictive Support — Product Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-03-10
> **Status:** ✅ IMPLEMENTED — Enabled with guards
> **Feature Flag:** `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`

---

## §1 — Problem Statement

### The Reactive Support Problem

Current Answerlattice flow:

```
User encounters confusion → Opens widget → Types question → Waits for answer
```

This is **reactive**. The user must:
1. Realize they're confused
2. Find the help widget
3. Formulate a question
4. Wait for retrieval/answer

By the time they ask, frustration has already occurred. Many users never ask — they abandon the workflow or create a support ticket instead.

### The Predictive Solution

```
User opens page → System detects known friction → Shows contextual help → Confusion prevented
```

The system intervenes **before** the question is asked, using:
- **Page/feature context** (where the user is)
- **Historical friction patterns** (what causes confusion on this page)
- **Entity-bound canonical answers** (what help exists for these topics)

---

## §2 — Target Users

| User | Benefit |
|------|---------|
| **End-user** (SaaS product user) | Gets help before getting confused. Fewer support tickets. |
| **SaaS founder** (Answerlattice tenant) | Reduced support volume. Better product experience. Self-improving help. |
| **Support team** | Fewer repetitive tickets. Focus on complex issues. |

---

## §3 — Core Capabilities

### 3.1 — Contextual Page Detection (Cap 63)

The widget browser contract reports the user's current location in the product.

**Already exists:** `AnswerlatticeContextPayload` with `page`, `feature`, `workflow`, `entityHints`, `userRole`, `plan` fields. Sent with every search query today.

**Extension needed:** Widget also sends context on **page entry** (not just on search), enabling proactive help before any question is asked.

### 3.2 — Trigger Rule Engine (Cap 64)

Deterministic rule evaluation — no ML, no probabilistic logic.

A trigger rule defines:
- **When** to intervene (page + conditions)
- **What** to show (entity-bound canonical answer or article)
- **Who** to target (role, plan, user type)
- **How often** (cooldown per user)

Example trigger:
```
IF page = "webhook_setup"
AND plan = "free"
AND role = "admin"
THEN show article "Webhook setup requires Pro plan"
WITH cooldown = 24 hours
```

### 3.3 — Historical Friction Patterns (Cap 65)

**Already exists:** `AnswerlatticeFrictionSnapshot` computed nightly with:
- `topFrictionEntities[]` — entities with highest friction scores
- `emergingTopics[]` — new friction sources
- `overallHealth` — HIGH/MODERATE/LOW

**Extension needed:** Nightly batch auto-suggests trigger rules from friction patterns. Founder reviews and approves/rejects.

### 3.4 — Proactive Issue Suggestions (Cap 66)

When a trigger fires, the system resolves the best canonical answer or KB article for that context and returns it as a suggestion payload.

Suggestion includes:
- Title
- Summary (from canonical answer structuredSummary)
- Related articles (if knowledge graph enabled)
- Action type (HELP_CARD, WORKFLOW_GUIDE, LINK_ARTICLE)

### 3.5 — Pre-Emptive Help UI (Cap 67)

Three UI patterns only:

1. **Context Card** — Small card near widget, shows help title + summary. Default pattern.
2. **Inline Tooltip** — Attached to specific UI element. For simple hints.
3. **Workflow Helper** — Step-by-step guide for complex flows. Uses guided workflows (Item #2).

Rules:
- Non-blocking (never covers content)
- Dismissible (one click to close)
- Appears once per cooldown window
- Context-aware (different help per page)

### 3.6 — Prediction Learning Loop (Cap 68)

Three interaction signals only:
- `suggestion_shown` — Help appeared
- `suggestion_clicked` — User engaged with help
- `suggestion_dismissed` — User closed without engaging

Daily nightly job computes effectiveness score per trigger. Low-performing triggers get priority reduced. High-performing triggers get boosted.

---

## §4 — User Flows

### Flow 1: End-User Receives Proactive Help

```
1. User navigates to "Webhook Setup" page in the SaaS product
2. SaaS product calls `window.AnswerlatticeWidget.page({ path, feature, workflow })`
3. Widget calls POST /api/answerlattice/predictive-help with context payload
4. Server loads trigger rules for this workspace (cached)
5. Server evaluates rules against context (page + plan + role)
6. Match found: "Webhook Signature Help" trigger (priority 80)
7. Server checks cooldown in Upstash Redis — not shown in 24h ✅
8. Server resolves canonical answer for bound entity
9. Returns suggestion payload to widget
10. Widget renders context card: "Common issue: webhook signature verification"
11. User clicks → opens full article in side panel
12. Suggestion signal logged: suggestion_clicked
```

### Flow 2: Auto-Generated Trigger from Friction Pattern

```
1. Nightly batch runs friction aggregation
2. Detects: entity "API Keys" has rising friction (40 signals in 7 days)
3. Auto-generates suggested trigger rule:
   - page: "api_keys"
   - entity: "API Keys" 
   - action: show canonical answer for "API Keys" entity
   - status: "suggested" (pending founder review)
4. Founder sees suggestion in Governance UI → "Trigger Rules" tab
5. Founder approves → trigger becomes active
6. Next time a user opens API Keys page → proactive help appears
```

### Flow 3: Founder Manually Creates Trigger

```
1. Founder opens Answerlattice Governance Dashboard → Trigger Rules tab
2. Clicks "Create Trigger Rule"
3. Selects:
   - Page: "billing_settings"
   - Condition: plan = "free"
   - Action: show article "Upgrade to Pro"
   - Cooldown: 48 hours
   - Priority: 60
4. Saves trigger → immediately active
5. Free-plan users opening billing page see proactive help
```

---

## §5 — What This Is NOT

- **NOT a product analytics platform** — We don't track sessions, heatmaps, or behavior patterns
- **NOT an ML prediction system** — Rules are deterministic, human-authored or friction-derived
- **NOT a notification/marketing system** — This is contextual help, not outbound messaging
- **NOT a chatbot** — It surfaces existing canonical answers, doesn't generate new content
- **NOT real-time event streaming** — API call on page entry, not continuous event pipeline

---

## §6 — Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Trigger-prevented tickets | 20-30% reduction | Compare ticket rate before/after trigger activation |
| Suggestion click rate | >15% | suggestion_clicked / suggestion_shown |
| False positive rate | <10% | suggestion_dismissed / suggestion_shown (within 3s = false positive) |
| Trigger rule coverage | >60% of friction entities | Entities with active triggers / total friction entities |
| Evaluation latency | <50ms server-side | API response time minus network |

---

## §7 — Constraints

1. **Firebase cost** — Must remain <$5/month at 1,000 tenants
2. **Latency** — Trigger evaluation <50ms server-side
3. **3-year freeze** — Additive fields only. No breaking changes to existing types.
4. **Feature-flagged** — Must work with flag OFF (zero impact on existing behavior)
5. **Widget browser contract** — Changes must be backwards-compatible (older installs ignore predictive features)
6. **Multi-tenant isolation** — Trigger rules scoped to tId+sId. Never cross-tenant.

---

## §8 — Phased Rollout

| Phase | Scope | Feature Flag |
|-------|-------|-------------|
| Phase 1 | Manual trigger rules + API + widget rendering | `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT` |
| Phase 2 | Auto-trigger generation from friction patterns | Same flag + nightly batch extension |
| Phase 3 | Learning loop (effectiveness scoring + auto-adjust) | Same flag + `ENABLE_ANSWERLATTICE_PREDICTION_LEARNING` |
