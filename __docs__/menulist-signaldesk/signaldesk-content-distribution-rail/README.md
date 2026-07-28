# SignalDesk Content Distribution Rail

**Status:** Feature 16 locally source-complete; app release and live operator certification pending
**Created:** June 24, 2026
**Last Updated:** July 22, 2026
**Audience:** Internal MenuList growth operation only

## Purpose

The Content Distribution Rail turns approved MenuList proof, changelog notes, demos, partner notes, and case-style observations into platform-ready drafts that Danny can approve, queue, and measure.

It is inspired by content distribution products such as Distribution.ai, but it stays inside SignalDesk's owner-control model:

```txt
source asset -> canonical message -> channel drafts -> owner approval -> queued calendar -> manual performance capture
```

## External Distribution Doctrine

The July 28 review of the founder-supplied `distribution 101` article is
maintained in the [Product Portfolio Distribution Insight
Ledger](../../strategy/product-portfolio-distribution-insight-ledger.md).

SignalDesk applies only the parts that strengthen the existing control model:

- bind every draft to one approved product, audience, problem, proof source,
  channel, and CTA;
- define packaging before production: intended viewer, promise, title or first
  frame, evidence, prohibited claims, disclosure, and next action;
- derive multiple native drafts from one approved proof source without changing
  the source truth;
- use useful education and verified demonstrations instead of generic founder
  volume;
- score results through qualified conversations, previews, activations,
  referrals, partner-attributed outcomes, complaints, and founder time;
- treat platform metrics as diagnostics rather than authority.

The Rail must never operationalize proxy or fake-region accounts, device-reset
identity workarounds, aged/bought/transferred accounts, fake engagement,
engagement groups, undisclosed affiliate or creator amplification, guaranteed
growth, spam-volume schedules, competitor copying, or algorithm folklore.
Creator, affiliate, employee, gifted, or paid-partner content requires the
applicable clear disclosure and current proof permission.

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
| API actions | `upsert-content-source`, `upsert-proof-permission`, `create-content-asset`, `review-content-asset`, `generate-content-distribution-drafts`, `review-content-distribution-draft`, `schedule-content-distribution-draft`, `record-content-performance` |
| Kill switch | `content-distribution` |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL` |
| Firestore | `signaldeskContentSources`, `signaldeskContentAssets`, `signaldeskContentDistributionDrafts`, `signaldeskContentCalendarItems`, `signaldeskContentPerformanceSummaries` |

The feature flag gates the route, workspace API section, advanced-navigation link, UI mutations, and server mutations. The workspace loads its independent bounded lists in parallel. Target options are returned only to `signaldesk.configure` users because they are used to grant proof permission; draft-only operators receive no target registry rows.

Mutation authority remains split by purpose: `source.configure` manages sources, `signaldesk.configure` manages proof permission, `draft.create` creates assets/drafts, `draft.approve` reviews assets/drafts and queues approved drafts, and `target.review` records manual performance. The UI repeats these gates, but the protected action API is authoritative.

A durable verified two-surface activation can open Content with a target-scoped `proofTargetId`. Admission requires the target projection's activation timestamp, evidence reference, approved integrity state, and two distinct surfaces before the browser reviews current public proof permission and a usable existing source. It then prefills title/message fields for review only. Missing activation authority or permission remains visibly blocked. No asset, draft, approval, calendar item, publication, performance row, or MenuList record is created by opening the preparation path.

## Doc Set

| Document | Purpose |
| --- | --- |
| [Spec](./signaldesk-content-distribution-rail_spec.md) | Product scope and operating requirements. |
| [Implementation](./signaldesk-content-distribution-rail_impl.md) | Runtime wiring, action contract, and data flow. |
| [Firebase](./signaldesk-content-distribution-rail_firebase.md) | Collections, rules, indexes, and cost posture. |
| [Compliance](./signaldesk-content-distribution-rail_compliance.md) | Claims, proof, approval, disclosure, and publishing boundaries. |
| [Mobile Support](./signaldesk-content-distribution-rail_mobile-support.md) | Mobile admission decision. |
| [Test Cases](./signaldesk-content-distribution-rail_test-cases.md) | Verification coverage. |

## First Proof Distribution Run

The first live customer-proof run is prepared in [`menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md`](../../menulist-marketing-distribution/menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md).

It maps one permissioned two-surface activation to the existing source, asset, draft, approval, calendar, performance, audit, and kill-switch contracts. It does not add a collection, API, channel adapter, auto-publisher, external send, or paid workflow.
