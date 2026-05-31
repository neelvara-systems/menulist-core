# GrowthOS Command Center - Test Cases

**Status:** Candidate test matrix for separate GrowthOS. MenuList Today wedge exists but is paused behind a disabled flag.  
**Created:** May 31, 2026

---

## Decision Tests

| ID | Test | Expected |
| --- | --- | --- |
| DT-1 | Check whether founder approved GrowthOS Stage 2. | Implementation does not start unless approved. |
| DT-2 | Check whether MenuList system-of-record proof exists. | If absent, docs remain planning only. |
| DT-3 | Check whether GrowthOS can write MenuList truth. | If not explicitly approved, all GrowthOS outputs remain drafts/exports. |
| DT-4 | Check whether GrowthOS route/domain exists in deployment targets. | If absent, no product host is activated. |
| DT-5 | Check whether Today Weekly Growth Pack owner-value pilot passed. | If absent, keep `ENABLE_TODAY_WEEKLY_GROWTH_PACK=false`. |

## Today Wedge Revisit Tests

| ID | Test | Expected |
| --- | --- | --- |
| WT-1 | Non-technical owner sees the hidden pilot pack. | Owner understands the output without explanation. |
| WT-2 | Owner reviews the pack during a real work session. | Owner copies/shares at least one output. |
| WT-3 | Store has stale hours, missing link, or inactive items. | Critical truth fix appears before growth copy. |
| WT-4 | Mobile Today shows the pack. | Pack is compact and optional, not a long default card. |
| WT-5 | Owner ignores the pack. | Today remains useful through truth/status actions alone. |

## Product Tests

| ID | Scenario | Expected |
| --- | --- | --- |
| PT-1 | Business has complete profile and menu. | Command Center shows a bounded weekly queue. |
| PT-2 | Business has missing holiday hours. | Freshness action is created without exposing scoring details. |
| PT-3 | Business has expired offer. | Action asks owner to archive or update; no public change happens automatically. |
| PT-4 | Owner generates Growth Pack from a menu item. | Output uses the selected item and approved facts only. |
| PT-5 | Owner ignores an action. | Action leaves queue and records ignored status. |
| PT-6 | Owner exports WhatsApp copy. | Text is copied/exported and action status updates if export tracking is enabled. |
| PT-7 | No strong signal exists. | Command Center can show "No action needed" or stay empty. |

## Claim Safety Tests

| ID | Input | Expected |
| --- | --- | --- |
| CS-1 | Item has no price. | Output does not invent a price. |
| CS-2 | Owner asks for "best in city." | Output refuses or removes unverifiable claim. |
| CS-3 | Review proof is unavailable. | Output does not mention customer praise. |
| CS-4 | Offer expired yesterday. | Output does not promote the expired offer. |
| CS-5 | Dietary claim is not in source facts. | Output does not mention it. |

## Security Tests

| ID | Test | Expected |
| --- | --- | --- |
| ST-1 | Unauthenticated request to GrowthOS API. | 401/403 through `withAuth()`. |
| ST-2 | Cross-tenant action id request. | Forbidden and security logged. |
| ST-3 | Invalid payload. | Zod validation rejects before database access. |
| ST-4 | Repeated generation calls. | Rate limit triggers before provider work. |
| ST-5 | Provider output includes forbidden claim. | Sanitizer/fallback blocks unsafe output. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| CT-1 | Open Command Center. | 1-3 reads, no writes. |
| CT-2 | Generate unchanged freshness actions twice. | Second run avoids rewriting unchanged action docs. |
| CT-3 | Generate Growth Pack without entitlement. | No provider call. |
| CT-4 | Generate Growth Pack with entitlement. | AI operation ledger records provider usage. |
| CT-5 | Archive expired actions. | Bounded write count or approved scheduler path. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| MT-1 | Open mobile action queue. | Actions fit without horizontal scroll. |
| MT-2 | Tap approve/ignore. | Touch target is at least 44px and updates optimistically. |
| MT-3 | Copy WhatsApp text. | Copy confirmation appears without blocking modal. |
| MT-4 | Open heavy setup on mobile. | Not available; direct owner to desktop if needed. |
| MT-5 | Slow network during approval. | Retry state appears without losing local action state. |

## Routing Tests If Separate App Is Approved

| ID | Test | Expected |
| --- | --- | --- |
| RT-1 | `localhost:3000/__growthos` | Rewrites to GrowthOS site only when flag enabled. |
| RT-2 | MenuList host | Still serves MenuList routes. |
| RT-3 | Answerlattice host | Still serves Answerlattice routes. |
| RT-4 | MyCodex host | Still serves MyCodex routes. |
| RT-5 | Tenant custom domain | Not captured by GrowthOS product host logic. |

## Cost Impact

No runtime Firebase cost change. This is a test plan only.
