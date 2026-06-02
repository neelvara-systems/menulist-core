# Growth Engine Infrastructure Freeze v1

**Status:** Planning freeze target
**Product:** Growth Engine

---

## 1. Freeze Principle

Growth Engine must be designed as long-term MenuList distribution infrastructure from the first implementation.

Do not build throwaway scripts that become production by accident.

Every first-version module needs:

- typed schemas
- idempotency
- suppression checks
- audit logs
- summary docs
- budget checks
- kill-switch checks
- retry/queue behavior where needed
- data retention policy
- connection adapter state
- secret reference state
- webhook endpoint state
- Business Truth Graph node and edge state
- automation workflow state
- enrichment waterfall state
- AI worker eval state
- decision snapshot state
- sender assignment state
- WhatsApp governance state
- operator work-item state
- surface health state
- discovery publishing state
- freshness state

## 2. Required Foundation Before Any Sending Or Publishing

No outbound channel can send and no public distribution job can publish until these exist:

1. lead identity model
2. distribution target identity model
3. Business Truth Graph model
4. dedupe keys
5. suppressions
6. implementation readiness acceptance
7. connection adapter registry
8. secret reference registry
9. webhook endpoint registry
10. campaign model
11. approved templates
12. canonical surface model
13. discovery publish job model
14. menu feed export model
15. GBP handoff model
16. dry-run engine
17. budget policy
18. kill switches
19. send job model
20. DNC/unsubscribe handling
21. route tracking
22. feedback ingestion
23. freshness and surface health monitor
24. automation workflow engine
25. enrichment waterfall registry
26. AI worker registry
27. decision snapshot ledger
28. sender assignment and pacing registry
29. WhatsApp Message Governance Layer
30. operator workboard

## 3. Launch Baseline

```txt
source import
-> connection activation
-> normalize/dedupe/suppress
-> distribution target registry
-> Business Truth Graph registry
-> automation workflow engine
-> enrichment waterfall
-> AI worker gated decision
-> decision snapshot
-> truth gap intelligence
-> canonical surface readiness
-> discovery publisher
-> menu feed exporter
-> GBP handoff manager
-> Apple/Bing handoff manager
-> campaign dry-run
-> email execution
-> WhatsApp governance
-> tracked route
-> owner-confirmed truth activation
-> public surface publish
-> structured data validation
-> sitemap and changed-URL jobs
-> truth packet publish
-> freshness monitor
-> feedback
-> attribution summary
-> safety/cost report
```

WhatsApp assisted remains gated by channel policy, opt-in proof, and suppression checks.

## 4. Firebase Freeze

Firestore is for hot operational state.

Cloud Storage is for raw payloads, large artifacts, sitemap snapshots, menu feed exports, and truth packet artifacts.

BigQuery is for analytics and mature cohort reporting.

Cloud Tasks is for asynchronous, rate-limited, resource-heavy workers.

Dashboards read summary docs only.

Workflow step events, AI run details, and evidence packets are operational/debug data, not normal dashboard data.

## 5. Product Separation Freeze

Growth Engine must have:

- product code
- product docs
- product route group if UI is built
- product API namespace
- product DAL
- product workflow engine
- product connection registry
- product Firebase project
- product Cloud Functions package
- product feature flags
- product collection constants

MenuList integration stays explicit and contract-based.

## 6. Provider Freeze

Providers are adapters.

Growth Engine remains the system of record.

Provider execution must pass through Connections And Activation.

Plaintext provider credentials must not live in Firestore, browser state, logs, AI prompts, or operator notes.

Provider payloads must be normalized before they affect campaign state.

Provider failures must not corrupt lead state.

Third-party growth tools must not become the system of record for targets, campaigns, distribution jobs, attribution, or freshness.

Third-party workflow builders, enrichment tables, sequencers, or CRMs must not become the source of automation truth. Growth Engine owns workflows, waterfalls, decision snapshots, sender assignment, operator queues, and attribution.

## 7. Launch Freeze

First controlled use is not approved until:

- dry-run can block unsafe campaigns
- connection activation can block providers with missing policy, secret ref, webhook, budget, kill switch, validation, or approval
- distribution targets can block public publishing from candidate-only data
- Business Truth Graph can block public publishing from candidate or low-confidence edges
- canonical surfaces have structured data, sitemap, and freshness state
- discovery jobs can be blocked, retried, and audited
- menu feed exports validate entity/menu/section/item data
- GBP handoff blocks non-authorized locations
- DNC recall passes eval tests
- suppression works across channels
- budget caps pause non-critical jobs
- WhatsApp API sends are blocked without consent, template/window eligibility, governance audit, webhook health, sender quality, and pacing
- global and channel kill switches block execution
- route feedback updates attribution
- dashboards read bounded summary docs
- workflow runs are idempotent, resumable, budget-gated, and kill-switch-aware
- enrichment waterfalls stop after valid evidence and cache by source hash
- AI workers cannot act autonomously without current eval pass
- every target action stores a decision snapshot
- sender assignment preserves one sender per target conversation
- operator queues exist for every human-review, handoff, incident, eval, and cost exception
