# Campaign Memory 2.0 - Specification

## Owner Problem

SMB owners rarely have complete platform analytics. They can still remember whether a campaign brought replies, calls, bookings, orders, walk-ins, or no useful response. CampaignCue should preserve that practical evidence without claiming that manual input proves attribution.

## Product Promise

`Record what happened -> keep a small evidence summary -> explain what appears useful -> change one thing next.`

## Owner Outcomes

Campaign Memory must answer:

- How many results have I recorded?
- Is there enough evidence to learn anything yet?
- Which campaign recipe has the strongest owner-reported signal?
- Which channel has the strongest owner-reported signal?
- What should I repeat, review, or test next?

## Confidence States

| State | Meaning |
| --- | --- |
| `not_enough_results` | No result or only one result supports the signal. CampaignCue asks for more evidence. |
| `early_signal` | At least two receipts exist, but the evidence is still directional or mixed. |
| `repeated_signal` | At least three receipts point in the same useful or unhelpful direction. This is still owner-reported, not provider proof. |

## Memory Dimensions

The first runtime summarizes only:

- recipe;
- channel;
- useful, not-useful, and not-used receipt counts;
- bounded totals for replies, calls, bookings, orders, walk-ins, and link clicks;
- latest campaign, result identifier, and result time.

It does not store customer identities, message content, contact lists, raw provider events, owner notes, or generated explanations in the aggregate.

## Decision Rules

- `not_used` increases the follow-up count but does not reward or penalize a recipe.
- `not_useful` contributes a negative signal.
- Any recipe-approved result other than `not_used` and `not_useful` contributes a useful signal.
- A positive count does not prove revenue or causal attribution.
- Mixed evidence produces a review recommendation, not a winner claim.
- A recipe may influence ranking only through bounded deterministic weights.
- Current facts, trust gates, missing inputs, commercial safety, and repetition controls continue to outrank result memory.

## Bounds

- One workspace summary document.
- At most 16 recipe signals.
- At most the configured CampaignCue channel count.
- Non-negative integer counters capped by the persisted summary boundary.
- No result ID outside the recipe registry.
- No aggregate note or free-text field.

## Non-Goals

- Perfect attribution.
- Revenue forecasting.
- Automatic campaign strategy from a model.
- Raw event analytics.
- Customer-level tracking.
- Social/provider account connection.
- Background metric imports.
