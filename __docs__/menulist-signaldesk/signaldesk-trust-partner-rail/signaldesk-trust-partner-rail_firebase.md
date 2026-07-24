# SignalDesk Trust Partner Rail - Firebase Cost Plan

**Status:** Feature 17 locally source-complete
**Created:** June 24, 2026
**Last Updated:** July 21, 2026
**Cost impact now:** Low bounded Firestore reads/writes through protected SignalDesk actions only; no raw social payloads, no paid campaign automation, and no provider send.

## Collections

| Collection | Purpose | Default read surface |
| --- | --- | --- |
| `signaldeskTrustPartnerProfiles` | Candidate partner and trust score. | Partners list and niche test detail. |
| `signaldeskTrustPartnerNicheTests` | 3-5 test group and recommendation. | Partners dashboard summary. |
| `signaldeskTrustPartnerDeals` | Flat fee, deliverables, approval, and budget state. | Deals panel. |
| `signaldeskTrustPartnerBriefs` | Lean brief, approved claims, CTA, disclosure checklist. | Brief detail only. |
| `signaldeskTrustPartnerDeliverables` | Due dates, post URLs, reminder state, review status. | Deliverables panel. |
| `signaldeskTrustPartnerMetrics` | Compact post/deal results. | Metrics panel and renewal decision. |
| `signaldeskTrustPartnerRenewalDecisions` | Renew/hold/cut recommendation and owner decision. | Renewal panel. |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Load partners workspace | Up to 10 bounded queries, in parallel | 0 | Budget policy query is omitted unless the caller has `signaldesk.configure`; no raw comments. |
| Upsert partner profile | Claim, profile, pause | 5 | Profile, idempotency claim, timeline, audit, daily cost. Exact replay writes zero. |
| Create niche test | Claim, niche, pause, optional pod, up to 5 partners | 5 | Niche, claim, timeline, audit, daily cost. Exact replay writes zero. |
| Create brief | Partner, optional deal, existing brief, CTA authority, pause | 4 | Brief, timeline, audit, daily cost. Deterministic exact replay writes zero. |
| Review deal | Partner, optional niche, budget, deal, pause | 4 or 5 | Deal, timeline, audit, daily cost, plus budget only when a reservation is first made. |
| Record deliverable | Claim, deliverable, partner, optional deal, pause | 5 | Deliverable, claim, timeline, audit, daily cost. Exact replay writes zero. |
| Record metrics | Claim, metric, partner, optional deliverable | 5 or 7 | Base metric, claim, timeline, audit, daily cost; plus demand and control summaries only when owner signals exist and Demand Signals is enabled. |
| Renewal decision | Claim, decision, partner, optional niche, pause, last 10 metrics | 6 | Decision, profile state, claim, timeline, audit, daily cost. Exact replay writes zero. |

## Cost Controls

1. Do not read raw social comments by default.
2. Store post URLs and compact comment-quality notes, not scraped social payloads.
3. Keep dashboard on profile/niche/deal/deliverable/metric summaries.
4. Link MenuList outcomes by ID/reference instead of duplicating outcome documents.
5. Use manual metric entry or approved provider summaries only.
6. Use capped page sizes and no real-time broad listeners.
7. Deny all client writes in Firestore rules; write through protected action API only.
8. Treat metric rows as incremental observations: exact retries are claim-deduped and daily demand summaries increment each independent row.

## Indexes

| Collection | Index |
| --- | --- |
| `signaldeskTrustPartnerProfiles` | `status + updatedAt desc` |
| `signaldeskTrustPartnerProfiles` | `partnerType + trustScore desc` |
| `signaldeskTrustPartnerNicheTests` | `marketPodId + status + updatedAt desc` |
| `signaldeskTrustPartnerDeals` | `approvalStatus + dueDate asc` |
| `signaldeskTrustPartnerDeliverables` | `status + dueDate asc` |
| `signaldeskTrustPartnerMetrics` | `partnerId + capturedAt desc` |
| `signaldeskTrustPartnerRenewalDecisions` | `recommendation + createdAt desc` |

## Retention

| Data | Default retention |
| --- | --- |
| Partner profile | Active plus 24 months after last deal. |
| Deal terms | 24 months or legal/accounting requirement. |
| Briefs | 24 months. |
| Deliverables and post URLs | 24 months. |
| Metrics summaries | 24 months. |
| Raw social payloads | Not stored. |
| Disclosure proof | Same as deal/brief record. |

## Current Infrastructure Decision

This hardening reuses existing collections, indexes, rules, and the actions route. It adds no Firestore rule, index, Storage, Function, scheduler, listener, or deployment requirement.

## Owner-Run Questions Before A Real Paid Test

| Question | Needed before |
| --- | --- |
| Whether partner contracts need Storage attachments | First paid partner test. |
| Whether payment records need accounting export | First paid partner test. |
| Whether comments are manually summarized or provider-imported | First metrics workflow. |
