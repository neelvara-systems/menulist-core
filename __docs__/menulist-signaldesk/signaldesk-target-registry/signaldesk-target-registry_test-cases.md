# SignalDesk Target Registry - Test Cases

**Status:** Runtime-backed matrix
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Import Boundary

| Case | Expected |
| --- | --- |
| Feature flag disabled | Manual and provider import stop before provider/Firestore work; form is hidden. |
| Empty, malformed, shifted, oversized, or 51-row CSV | Client/server boundary rejects it. |
| Missing/expired/wrong-product/wrong-identity policy | Complete import fails with zero durable target truth. |
| Manual row claims provider identity | Fails before durable import truth. |
| Retained contact lacks permission evidence | Complete import fails. |
| Exact duplicate rows | Collapse to one identity; duplicate count increments. |
| Divergent same-identity rows | Complete import fails. |
| Exact retry or concurrent exact request | Reuses one run and target set. |
| Changed payload reuses retry key | Conflicts. |

## Identity And Lifecycle

| Case | Expected |
| --- | --- |
| Same-name provider records have different record IDs | Two stable targets. |
| Same provider record appears in another run | Existing target reused. |
| Provider record tries another source policy | Rebind fails. |
| Identity index exists without summary/detail | Import fails as orphaned authority. |
| Summary/detail exists without identity | Import fails as orphaned target. |
| Contact belongs to another target/policy | Contact rebind fails. |
| Mature target is re-imported | Status, segment, next action, scores, and outcomes do not regress. |
| Suppression identity exists | Target becomes held/blocked for downstream work. |

## Projection And Paging

| Case | Expected |
| --- | --- |
| Summary contains private/raw fields | Strict list DTO excludes/rejects the malformed persisted row. |
| 35 valid targets share one timestamp | Page one returns 30, page two 5, with no omission/duplication. |
| Foreign/malformed target is in the newest window | It is excluded; bounded scan continues only until the valid page is full. |
| Partial/malformed cursor or cursor on another section | Workspace route rejects it. |
| Older targets requested | Existing route returns the next stable page; no full registry scan. |

## Security And Mobile

| Case | Expected |
| --- | --- |
| Unauthorized role imports | Protected route rejects it. |
| Browser writes summary/detail/contact/identity | Firestore rules deny it. |
| Mobile opens Targets/Imports or submits import | Route rejects it and mutation is blocked/audited by the mobile boundary. |
| Contact is displayed in target list | Fails projection/UI contract. |

## Maintained Commands

```bash
npm run test:signaldesk:target-registry-boundary
npm run test:signaldesk:e2e:local
npm run test:signaldesk:rules
npm run verify:signaldesk
npm run typecheck
```
