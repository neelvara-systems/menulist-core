# SignalDesk Trust Partner Rail - Firebase Cost Plan

**Status:** Runtime implemented for internal testing
**Created:** June 24, 2026
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
| Load partners workspace | 5-8 | 0 | Summary docs only; no raw comments by default. |
| Upsert partner profile | 1-3 | 2-4 | Profile, audit, cost summary, optional timeline. |
| Create niche test | 3-6 | 3-5 | Reads market pod/audience/budget; writes niche test, timeline, audit. |
| Create brief | 4-8 | 3-5 | Reads partner/deal/CTA/policy; writes brief, approval packet, audit. |
| Review deal | 4-8 | 3-6 | Reads budget and profile; writes deal, budget hold, audit, timeline. |
| Record deliverable | 2-5 | 2-4 | Writes deliverable and audit; post URL only, not raw social payload. |
| Record metrics | 3-7 | 4-7 | Transaction reads actor/key claim, partner and optional deliverable; writes one incremental compact metric, demand observation, claim, audit, timeline and cost summary. |
| Renewal decision | 4-9 | 3-6 | Reads metrics/outcomes; writes decision, timeline, audit. |

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

## Open Firebase Questions

| Question | Needed before |
| --- | --- |
| Whether partner contracts need Storage attachments | First paid partner test. |
| Whether payment records need accounting export | First paid partner test. |
| Whether comments are manually summarized or provider-imported | First metrics workflow. |
