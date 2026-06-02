# Growth Engine Core Doctrine

**Status:** Locked planning doctrine
**Product:** Growth Engine
**Product code:** `GE` proposed

---

## 1. Identity

Growth Engine is the internal distribution automation control system for MenuList.

It exists to:

```txt
find qualified distribution targets
detect menu truth gaps
contact safely where allowed
configure provider adapters only through governed connections
use WhatsApp only for expected owner verification and truth-maintenance where consent exists
route owners into MenuList claim/onboarding
activate confirmed MenuList truth
maintain candidate and confirmed business truth graph relationships
publish owned distribution surfaces
notify discovery systems where allowed
monitor freshness and drift
learn what creates distribution coverage
protect cost, truth quality, and channel reputation
```

It does not exist to maximize scraping, message volume, or generic sales automation.

## 2. North Star

The north-star metric is:

```txt
owner-confirmed MenuList menu truth distributed on owned surfaces
```

Secondary metrics matter only if they explain the north star:

- valid lead rate
- eligible lead rate
- interested reply rate
- onboarding start rate
- completion rate
- cost per completed onboarding
- canonical surface publish rate
- structured data validity rate
- sitemap freshness accuracy
- menu feed export readiness
- truth freshness rate
- DNC/complaint rate
- manual decisions per completion

## 3. Product Law

No outreach or distribution without:

1. source provenance
2. implementation readiness acceptance
3. active connection adapter where a provider is used
4. server-only secret reference where credentials are needed
5. dedupe
6. suppression check
7. channel eligibility
8. approved template
9. WhatsApp governance audit for WhatsApp sends
10. campaign cap
11. stop rule
12. dry-run report
13. kill-switch coverage
14. tracked onboarding route when a link is used
15. distribution target identity
16. Business Truth Graph provenance, confidence, and truth state
17. owner-confirmed or approved MenuList-verified truth before public publishing
18. structured data and sitemap readiness before discovery publishing
19. automation workflow idempotency, budget, and kill-switch checks
20. decision snapshot before any route, send, publish, notify, or pause action
21. AI eval pass before autonomous classification or generation
22. sender assignment before outbound execution

## 4. System Posture

Growth Engine is a controlled operator system.

It should run on:

- queues
- connection adapters
- workflow runs
- enrichment waterfalls
- AI worker registry
- decision snapshots
- exceptions
- operator work items
- approvals
- summaries
- dry-runs
- safety alerts
- budget caps
- surface health checks
- freshness checks
- discovery publish queues
- Business Truth Graph nodes and edges

It should not run on:

- random lead browsing
- manual spreadsheets
- untracked sends
- free-form AI decisions
- unmanaged provider scripts
- "send to all" behavior
- generic CRM/outreach tools as the system of record
- public publishing from candidate-only data
- sender changes that break target conversation continuity

## 5. Relationship To MenuList

Growth Engine serves MenuList distribution but does not become MenuList.

MenuList owns:

- business truth
- onboarding
- menu creation
- owner activation
- public surfaces
- billing

Growth Engine owns:

- acquisition
- Connections And Activation registry
- automation workflows
- enrichment waterfalls
- decision snapshots
- AI worker registry and eval state
- sender assignment and pacing
- WhatsApp Message Governance Layer
- operator work queues
- distribution target operations
- Business Truth Graph candidate edges
- campaigns
- outreach
- public surface readiness
- discovery publish jobs
- feed exports
- GBP handoff state
- truth packet state
- attribution
- freshness health
- source/channel/template learning

MenuList must continue to work if Growth Engine is disabled.

## 6. Artifact Doctrine

Personalized artifacts are useful, but only when truthful, private, and rights-safe.

Allowed:

- noindex claim preview
- public-info audit
- menu/hours freshness report
- tracked onboarding prefill preview
- distribution-readiness report

Not allowed:

- mass public demo websites
- fake owner-verified pages
- rehosted third-party photos/reviews
- invented menu items, offers, prices, or ratings
- sitemap/feed/IndexNow/truth-packet publishing for private artifacts

## 7. AI Doctrine

AI is a bounded worker, not an authority.

AI may:

- clean source rows into typed candidate fields
- resolve likely business identity with evidence and confidence
- classify lead fit
- classify distribution readiness
- detect truth gaps
- summarize source notes
- detect need/risk
- draft inside approved templates
- classify replies
- recommend next action
- produce reports
- validate structured-data readiness
- validate menu feed readiness
- summarize surface health
- summarize incident evidence

AI may not:

- decide to send without policy checks
- invent claims
- override suppression
- choose illegal/unsafe channels
- generate public owner-verified truth
- publish candidate-only facts
- submit discovery jobs without policy checks
- write arbitrary outreach from a blank page
- change sender assignment to force delivery
- approve external listing handoffs
- scale campaigns without human approval

Every AI output must be typed, logged, budgeted, evidence-backed, and evaluable.

Critical DNC, unsubscribe, complaint, wrong-contact, private-data, blocked-source, pricing-invention, and unverified-truth fixtures must have zero critical misses before autonomy.

## 8. Safety Doctrine

Safety beats throughput.

The system should pause or slow down when:

- DNC rises
- complaint rate rises
- wrong-contact rate rises
- provider deliverability drops
- costs exceed thresholds
- AI evals fail
- source quality degrades
- structured data breaks
- sitemap inventory becomes stale
- public truth freshness expires
- feed exports fail validation

Scaling is allowed only after safety is stable.
