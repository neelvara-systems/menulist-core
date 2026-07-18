# MenuList Activation Concierge - Specification

**Status:** Local source complete
**Last reviewed:** July 16, 2026

## Goal

Help a starter owner finish two practical placement/sharing actions through existing MenuList surfaces without a second onboarding engine.

## Requirements

| Requirement | Current behavior |
| --- | --- |
| Eligibility | Store `onboardingSource` is a supported starter source. |
| Target | Two distinct allowlisted actions. |
| Evidence validity | Each action/presence entry requires a valid timestamp. |
| Evidence labels | MenuList-recorded owner action or owner-confirmed external placement. |
| Currentness | Removing a presence confirmation removes its matching activation action. |
| Acknowledgement | UI advances only after a typed store/signal/time acknowledgement. |
| Store switch | Late acknowledgement updates only the matching current store. |
| Presentation | Existing starter banner, setup cards, sharing, and Presence Monitor. |
| Product separation | SignalDesk may observe separate summary/output state but cannot mutate MenuList store/project truth. |

## Non-goals

- Verifying a third-party profile automatically.
- Claiming customer traffic, scans, leads, or sales.
- Public case-study/proof generation.
- A new owner route, public route, API, collection, or job.
- Replacing Menu Setup Progress, Presence Monitor, or Billing.
