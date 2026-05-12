# Canonica — Formal Threat Model (STRIDE)

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Source:** ChatGPT strategic session + Cascade codebase validation
> **Scope:** Control plane security for multi-tenant SaaS infrastructure

---

## 1. Spoofing (Identity Forgery)

| Attack Surface | Threat | Mitigation |
|---------------|--------|-----------|
| API endpoints | Attacker impersonates another tenant | All tokens signed & verified server-side. tenantId derived from verified token only. Never accepted from request body. |
| JWT/session token | Forged or stolen token | Short-lived tokens. Role embedded in token. Token expiration enforced. |
| Service-to-service | Impersonate internal service | Service accounts isolated with least privilege. |
| CI release webhook | Fake release registration | HMAC signature validation + timestamp window + IP allowlist. |

**Existing mitigations in codebase:** NextAuth session verification, `getActiveSession()` server-side extraction, SAFE_MODE check on all AI routes.

---

## 2. Tampering (Data Manipulation)

| Attack Surface | Threat | Mitigation |
|---------------|--------|-----------|
| Firestore console | Manual edit of CanonicalAnswer | Production DB write access limited to backend service account only. No console editing. |
| Direct client writes | Bypass server validation | Firestore security rules block client writes to core collections. |
| Compromised service account | Unauthorized mutation | CanonicalAnswer edits only via mutation pipeline. Release objects immutable. Drift flags cannot be manually cleared. |
| Audit logs | Tamper with history | Append-only audit logs. No update/delete operations. |

**Existing mitigations:** `requestBodyComposer` auto-injects session fields. DAL pattern wraps all operations.

---

## 3. Repudiation (Action Denial)

| Threat | Mitigation |
|--------|-----------|
| Admin denies approving mutation | Every state transition logged with userId, tenantId, previous state, new state, server timestamp |
| Engineer denies editing release | Release creation logged in audit trail with createdBy |
| Customer disputes answer change | Full mutation history with proposal → approval → implementation chain |

**Requirements:** Logs append-only. Immutable. Retention ≥ 3 years. Per-tenant export capability.

**Existing pattern:** `requestBodyComposer` already logs createdBy/modifiedBy. Extend to mutation pipeline.

---

## 4. Information Disclosure (Data Leak)

| Attack Surface | Threat | Mitigation |
|---------------|--------|-----------|
| Mis-scoped Firestore query | Cross-tenant data exposure | All queries filtered by `tId` + `sId`. Required query/vector indexes support tenant/store-scoped access patterns. |
| Cache contamination | Tenant A sees Tenant B's entities | Cache keys scoped by `tId` + `sId`. No shared entity cache. |
| API error messages | Internal data leakage | Generic error messages. No internal state in responses. |
| LLM prompt context | Cross-tenant knowledge in prompt | Only include current tenant's data. Never cross-tenant retrieval results. |
| Logging aggregation | Tenant data mixed in logs | Structured logging with `tId` + `sId`. Per-tenant log filtering. |

**Zero tolerance category.** Any cross-tenant exposure = Severity 1 incident.

**Existing mitigations:** Tenant-scoped DAL queries (`where('tId', '==', session.tId)`), tenant-scoped storage paths.

---

## 5. Denial of Service (DoS)

| Threat | Mitigation |
|--------|-----------|
| Query flood | Per-tenant rate limiting (existing Upstash). Global QPS cap. |
| Fallback flood (force LLM usage) | Fallback percentage circuit breaker. Token usage cap per tenant. |
| Release spam | Admin-only release creation. Rate limit on release endpoint. |
| Mutation spam | Rate limit on mutation proposals per tenant. |
| Drift engine overload | Batch per tenant. Nightly schedule (not real-time). Indexed fields only. |
| LLM exhaustion | Single-attempt rule. Hard timeout (800-1000ms). Circuit breaker tiers. |

**Graceful degradation hierarchy:**
- Level 1: Disable LLM entity assist
- Level 2: Disable RAG fallback
- Level 3: Canonical-only mode (must still work)

**Existing mitigations:** Upstash rate limiting (`ENABLE_RATE_LIMITING`), SAFE_MODE kill switch, `checkAIOperationLimit()`.

---

## 6. Elevation of Privilege

| Attack Surface | Threat | Mitigation |
|---------------|--------|-----------|
| Client-side role storage | Support agent gains knowledge_admin capability | Role enforced server-side only. Never trust client role. |
| Token not invalidated | Stale token retains old permissions | Role change forces token invalidation + re-authentication. |
| RBAC gaps | Missing permission check on new endpoint | All write endpoints validate role explicitly. Security review on any new endpoint. |
| Hidden admin flags | Backdoor access | No hidden admin-only flags. All access paths documented. |

**Existing pattern:** `platformRole` check for platform admin pages. Must extend to Canonica-specific roles.

**RBAC Matrix (Future — When Canonica Pillars Implemented):**

| Action | platform_admin | tenant_admin | knowledge_admin | support_agent | read_only |
|--------|:-:|:-:|:-:|:-:|:-:|
| Create Entity | ✔ | ✔ | ✔ | ✘ | ✘ |
| Modify Entity | ✔ | ✔ | ✔ | ✘ | ✘ |
| Create Canonical Answer | ✔ | ✔ | ✔ | ✘ | ✘ |
| Approve Mutation | ✔ | ✔ | ✔ | ✘ | ✘ |
| Register Release | ✔ | ✔ | ✘ | ✘ | ✘ |
| View Drift Dashboard | ✔ | ✔ | ✔ | ✔ | ✔ |
| Submit Ticket | ✔ | ✔ | ✔ | ✔ | ✔ |
| Trigger Manual Drift Audit | ✔ | ✔ | ✘ | ✘ | ✘ |

---

## 7. LLM-Specific Threats

| Threat | Mitigation |
|--------|-----------|
| **Prompt injection** ("Ignore canonical rules...") | Canonical-first enforced before LLM. LLM output schema validated. No system prompt leakage. |
| **Model drift attack** (silent behavior change) | Model version pinning. Output validation. Monitoring distribution shift. |
| **Data extraction via prompts** | No sensitive data in LLM prompts. Tenant data only. |
| **Token exhaustion** | Hard per-tenant caps. Circuit breaker. |

---

## 8. Red Team Findings (From ChatGPT Session)

### 12 Attack Scenarios Tested

| # | Scenario | Risk Level | Mitigation |
|---|----------|:----------:|-----------|
| 1 | Poor ontology modeling → coverage stalls | High | Formal entity design guidelines + periodic audit |
| 2 | Canonical coverage plateau | High | Coverage KPI + mutation SLA + fallback auto-proposal |
| 3 | Release discipline breakdown | High | Mandatory release workflow + CI/CD integration |
| 4 | Mutation governance bottleneck | Medium | Prioritization scoring + review SLA + auto-close low-impact |
| 5 | Version explosion (micro releases) | Medium | Patch grouping + cap active versions |
| 6 | Tenant abuse (query spam) | Medium | Rate limiting + query dedup + signal spam detection |
| 7 | Silent data drift (manual DB edit) | High | Remove console write access + daily hash verification |
| 8 | Organizational drift (feature creep) | High | RFC governance + Non-Goals Charter + annual audit |
| 9 | Retrieval ambiguity tie | Medium | Ambiguity threshold + clarifying question + log metrics |
| 10 | Long-term data growth | Medium | Annual pruning + archive deprecated + cold-store signals |
| 11 | Dependency cascade failure | Medium | Canonical coverage >70% before scaling + cache pre-warm |
| 12 | Confidence score misinterpretation | Low | Confidence internal only + language discipline |

---

## 9. Economic Threat Modeling

| Scenario | Worst Case | Guardrail |
|----------|-----------|----------|
| Query flood abuse (1 tenant) | $3,600/month LLM cost | Per-tenant rate limits + fallback circuit breaker |
| Ambiguity explosion (70% fallback) | $21/tenant/month | Coverage KPI enforcement + improvement sprint |
| Signal event flood | Cloud Function cost spike | TTL archive + rolling window queries |
| Recursive fallback cascade | 2-3× token usage | Single-attempt rule + hard timeout |
| Multi-tenant bot attack | $30K-50K/month | Abuse pattern detection + per-tenant caps |

**Key insight:** Canonical coverage rate is both a quality metric AND a cost control mechanism.
