# Platform Founder Monitor Spec

## Problem

MenuList already has owner analytics, ops monitors, cost posture, reseller flows, support queues, and Store Truth summaries, but there was no single founder-level daily scoreboard that combined:

- Store activation quality
- Recurring revenue movement
- Store Truth freshness
- Onboarding leakage
- Distribution readiness
- Support and payment risk

Generic "clients onboarded today" is not reliable enough because one tenant can contain multiple incomplete stores. The platform unit for this monitor is the store.

## Primary Metric

**Trusted Live Stores**

A store counts when the existing signals show:

- Store is active and not blocked.
- Store has a live published menu signal.
- Store has a plan entitlement or current subscription signal.
- Store is not stale.
- Store Truth Score is either healthy or not yet available.

## Screen Placement

This feature belongs under `/platform/founder-monitor`, not inside:

- `/dashboard`, because that is the restaurant owner dashboard.
- `/ops`, because ops is incident/recovery oriented.
- `/reseller`, because reseller is partner/client onboarding oriented.

## Users

Only MenuList platform operators with `platformRole === PLATFORM`.

## Non-Goals

- No owner-facing analytics changes.
- No customer-facing page changes.
- No new analytics event collection.
- No hot-path per-store analytics fan-out.
- No BigQuery or Cloud Billing export integration.
- No expansion/downgrade emitting until billing plan-change events are durable.

## Success Criteria

- Platform admin can open `/platform/founder-monitor`.
- Non-platform users remain blocked by platform route/API guards.
- The dashboard loads from bounded precomputed read models and a capped revenue movement ledger.
- Razorpay payment, verification, top-up, and cancellation paths update the founder revenue read model at transaction time.
- The shared MenuList maintenance scheduler refreshes the operational snapshot every 30 minutes.
- The UI shows source coverage and data gaps instead of pretending incomplete signals are exact.
- Navigation and mobile platform wrapper include the screen.
