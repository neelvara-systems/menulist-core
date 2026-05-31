# Growth Engine Infrastructure Freeze v1

**Status:** Planning freeze target
**Product:** Growth Engine

---

## 1. Freeze Principle

Growth Engine must be designed as long-term acquisition infrastructure from the first implementation.

Do not build throwaway scripts that later become production.

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

## 2. Required Foundation Before Any Sending

No outbound channel can send until these exist:

1. lead identity model
2. dedupe keys
3. suppressions
4. campaign model
5. approved templates
6. dry-run engine
7. budget policy
8. kill switches
9. send job model
10. DNC/unsubscribe handling
11. route tracking
12. feedback ingestion

## 3. First Production Slice

```txt
source import
-> normalize/dedupe/suppress
-> lead intelligence
-> campaign dry-run
-> email execution
-> tracked route
-> feedback
-> attribution summary
-> safety/cost report
```

WhatsApp assisted comes next.

## 4. Firebase Freeze

Firestore is for hot operational state.

Cloud Storage is for raw payloads and large artifacts.

BigQuery is for analytics and mature cohort reporting.

Cloud Tasks is for asynchronous, rate-limited, resource-heavy workers.

Dashboards read summary docs only.

## 5. Product Separation Freeze

Growth Engine must have:

- product code
- product docs
- product route group if UI is built
- product API namespace
- product DAL
- product Firebase project
- product Cloud Functions package
- product feature flags
- product collection constants

MenuList integration stays narrow and explicit.

## 6. Provider Freeze

Providers are adapters.

Growth Engine remains the system of record.

Provider payloads must be normalized before they affect campaign state.

Provider failures must not corrupt lead state.

## 7. Launch Freeze

First controlled use is not approved until:

- dry-run can block unsafe campaigns
- DNC recall passes eval tests
- suppression works across channels
- budget caps pause non-critical jobs
- global and channel kill switches block execution
- route feedback updates attribution
- dashboards read bounded summary docs
