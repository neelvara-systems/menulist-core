# SignalDesk Content Distribution Rail

**Status:** Runtime implemented for internal testing
**Created:** June 24, 2026
**Audience:** Internal MenuList growth operation only

## Purpose

The Content Distribution Rail turns approved MenuList proof, changelog notes, demos, partner notes, and case-style observations into platform-ready drafts that Danny can approve, queue, and measure.

It is inspired by content distribution products such as Distribution.ai, but it stays inside SignalDesk's owner-control model:

```txt
source asset -> canonical message -> channel drafts -> owner approval -> queued calendar -> manual performance capture
```

## Boundary

- No auto-publish.
- No public SignalDesk website or help center.
- No autonomous social account posting.
- No raw third-party payload storage.
- No replacement for MenuList public product truth.

## Runtime Surface

| Surface | Status |
| --- | --- |
| Route | `/signaldesk/content` |
| API actions | `upsert-content-source`, `create-content-asset`, `generate-content-distribution-drafts`, `review-content-distribution-draft`, `schedule-content-distribution-draft`, `record-content-performance` |
| Kill switch | `content-distribution` |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL` |
| Firestore | `signaldeskContentSources`, `signaldeskContentAssets`, `signaldeskContentDistributionDrafts`, `signaldeskContentCalendarItems`, `signaldeskContentPerformanceSummaries` |

## Doc Set

| Document | Purpose |
| --- | --- |
| [Spec](./signaldesk-content-distribution-rail_spec.md) | Product scope and operating requirements. |
| [Implementation](./signaldesk-content-distribution-rail_impl.md) | Runtime wiring, action contract, and data flow. |
| [Firebase](./signaldesk-content-distribution-rail_firebase.md) | Collections, rules, indexes, and cost posture. |
| [Compliance](./signaldesk-content-distribution-rail_compliance.md) | Claims, proof, approval, disclosure, and publishing boundaries. |
| [Mobile Support](./signaldesk-content-distribution-rail_mobile-support.md) | Mobile admission decision. |
| [Test Cases](./signaldesk-content-distribution-rail_test-cases.md) | Verification coverage. |
