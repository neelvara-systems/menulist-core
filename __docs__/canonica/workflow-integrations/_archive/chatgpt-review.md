# Canonica — External Workflow Integrations — ChatGPT Review

> **Version:** 1.0.0
> **Date:** 2026-03-09
> **Source:** ChatGPT ICP gap analysis conversation (System 7)
> **Reviewer:** Cascade (full codebase access)

---

## §1 — ChatGPT Accuracy Score: ~75%

### What ChatGPT Got Right (~75%)

| Claim | Assessment | Notes |
|-------|:----------:|-------|
| Canonica should be event producer only, NOT workflow orchestrator | ✅ CORRECT | Aligns perfectly with Non-Goals Charter §I (not a helpdesk) and doctrine freeze |
| Integration Event Bus as central pattern | ✅ CORRECT | Industry-standard pattern (Stripe, GitHub, Intercom all use this) |
| 5 adapters: Slack, Linear, GitHub, Notion, Email | ✅ MOSTLY CORRECT | Notion deferred to Tier C. Other 4 are valid. |
| Append-only event log in Firestore | ✅ CORRECT | Matches existing Canonica patterns (signalEvents, auditLogs are append-only) |
| onCreate Cloud Function trigger | ✅ CORRECT | Best pattern for Firebase — event-driven, zero cost when idle |
| Per-project integration config | ✅ CORRECT | Adapted to per-tenant in platformSummary (Canonica uses tId/sId, not projectId) |
| Stateless adapters with send() interface | ✅ CORRECT | Clean, testable, matches adapter pattern |
| 3 retries then drop | ✅ CORRECT | Industry standard (Stripe uses 3 days, but for our scale 3 attempts is sufficient) |
| Firebase cost: ~$3-8/month for 10k events | ✅ CORRECT | Our calculation confirms ~$0.15/month at 100 tenants, ~$1.45 at 1000 tenants |
| No bidirectional sync, no Slack bots, no automation builder | ✅ CORRECT | Critical architectural boundary |

### What ChatGPT Got Wrong or Missed (~25%)

| Claim | Assessment | Reality |
|-------|:----------:|---------|
| Event types: generic (ticket_created, ticket_escalated, etc.) | ⚠️ WRONG FOCUS | Canonica doesn't send ticket events — it sends **governance events** (drift_detected, mutation_proposed, coverage_drop). ChatGPT proposed helpdesk-style events. |
| `projects/{projectId}/integrations` config path | ❌ WRONG | Canonica uses `tId/sId` scoping, not `projectId`. Config stored in `platformSummary/integrationConfig_{tId}_{sId}`. |
| `integration_events/{eventId}` collection name | ⚠️ ADAPTED | Changed to `canonica_integrationEvents` to follow Canonica naming convention (`canonica_` prefix). |
| `integration_logs/{eventId}` for delivery logs | ⚠️ ADAPTED | Changed to `canonica_integrationDeliveryLogs` (separate collection, not log per event). |
| Firebase Secret Manager for secrets | ⚠️ OVERENGINEERED | For <100 tenants, Firebase Functions environment variables are sufficient and simpler. Secret Manager is a valid future optimization. |
| Notion as Tier B | ⚠️ WRONG TIER | Notion is Tier C (future). Most SaaS teams don't publish knowledge to Notion from external tools. |
| No mention of existing notification infrastructure | ❌ MISSED | Canonica already has `ENABLE_CANONICA_NOTIFICATIONS` flag with email notification system for ticket events. The integration email adapter must coexist cleanly with this. |
| No mention of existing signal emitter | ❌ MISSED | `signalEmitter.ts` is already a fire-and-forget event pattern. Integration event bus follows the same pattern — ChatGPT reinvented what partially exists. |
| "processIntegrationEvent()" as generic name | ⚠️ OK BUT ADAPTED | Cloud Function exported as `processCanonica IntegrationEvent` for clarity in multi-product environment. |
| No circuit breaker mentioned | ❌ MISSED | Circuit breaker is essential for production. Added: 10 consecutive failures → auto-disable adapter. |
| No rate limiting per adapter mentioned initially | ❌ MISSED (added later) | ChatGPT added 20 events/min/integration in follow-up. This is correct and included. |
| No TTL/cleanup strategy | ❌ MISSED | Events and logs need TTL (90 days) to prevent unbounded Firestore growth. Added. |
| No mention of nightly batch integration point | ❌ MISSED | ChatGPT didn't know about the 12-step nightly batch. Events hook in as Step 13. |

---

## §2 — Cascade's Critical Additions (Not in ChatGPT)

| Addition | Why |
|----------|-----|
| **Governance-specific event types** | ChatGPT proposed generic ticket events. Canonica's value is knowledge governance events (drift, mutations, coverage). Completely different event vocabulary. |
| **platformSummary config storage** | Follows existing Canonica pattern for per-tenant config. No new collection for config. |
| **canonica_ collection prefix** | All Canonica collections use this prefix (existing convention). |
| **Step 13 in nightly batch** | Events generated from data already loaded in Steps 1-5. Zero additional reads. |
| **Circuit breaker** | Auto-disables broken integrations after 10 failures. Essential for production reliability. |
| **90-day TTL** | Prevents unbounded collection growth. Cleaned up by nightly batch. |
| **Coexistence with ticket notifications** | Integration email adapter is for governance events. Existing notification system is for ticket events. Different systems, different purposes. |
| **ADR-6: Secret handling** | Slack webhook URLs in config (acceptable per Slack docs). Linear/GitHub tokens in environment variables. Config doc stores `hasApiKey: true` flag only. |
| **Event cap (50/tenant/night)** | Prevents noisy tenants from flooding. ChatGPT didn't consider this. |
| **Coverage drop threshold (60%)** | Specific, meaningful threshold from existing CanonicaCoverageKPI system. |

---

## §3 — Decisions That Override ChatGPT

| ChatGPT Suggested | Cascade Decision | Reason |
|-------------------|-----------------|--------|
| 5 adapters including Notion | **4 adapters, Notion deferred** | Notion integration has lowest demand. Add only if proven demand. |
| `projects/{projectId}` scoping | **`tId/sId` scoping** | Canonica uses tenant/store isolation, not project-level. |
| Firebase Secret Manager | **Environment variables (v1)** | Simpler for <100 tenants. Migrate to Secret Manager at scale. |
| Generic event types (ticket_created, etc.) | **Governance event types** | Canonica's unique value is knowledge governance, not ticket management. |
| Event payload with generic context | **Typed payloads per event type** | Each event type has a specific TypeScript interface. Stronger typing = fewer integration bugs. |

---

## §4 — What ChatGPT Proposed That Was Correctly Rejected

| Proposal | Why Rejected |
|----------|-------------|
| Bidirectional Slack sync | Violates Canonica identity (event producer only) |
| Slack chatbot / AI answering | Non-goal per doctrine (§I: not a helpdesk) |
| GitHub comment bots | Scope creep. Creates maintenance burden. |
| Notion sync engine | Too complex. Bidirectional sync is explicitly forbidden. |
| Workflow automation builder | Turns Canonica into Zapier. Permanent exclusion. |
| Custom webhook URLs (arbitrary) | SSRF risk. Unknowable API behavior. Add in v2 if demand proven. |

---

## §5 — Final Verdict

ChatGPT provided a **solid architectural foundation** for the integration event bus pattern. The core idea (event producer → adapters → external tools) is industry-standard and correct.

However, ChatGPT had **zero context about Canonica's actual architecture**:
- Didn't know about the 12-step nightly batch
- Didn't know about existing signal emitter pattern
- Didn't know about existing notification infrastructure
- Proposed generic ticket events instead of governance events
- Used `projectId` scoping instead of `tId/sId`

Cascade's synthesis preserved the valid architectural pattern while adapting it to Canonica's real infrastructure, naming conventions, and governance philosophy.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-09 | 1.0.0 | Initial ChatGPT review |
