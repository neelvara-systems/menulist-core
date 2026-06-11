# Opportunity Engine — Spec

## Summary

Opportunity Engine answers: what should this business promote next? It should show practical cues, not a blank prompt.

## Current Runtime

The implemented runtime returns deterministic cues from the current Business Brain, source snapshot, and readiness warnings: menu push, booking fill, weekly pack, reel brief, and source readiness. The wider signal list below is the product contract for future provider/source activation, not active background scanning today.

## Cue Types

| Cue | Example |
| --- | --- |
| Top item | Chicken Biryani is your top viewed item this week. |
| New item/service | New cold coffee or new hair spa package is ready to announce. |
| Booking gap | Weekend Hair Spa slots are open. |
| Missing asset | Veg Thali has no photo. |
| Source update | MenuList menu changed; create update campaign. |
| Calendar occasion | Diwali, Ramadan, Christmas, monsoon care, weekend offer. |
| Stale campaign | Old campaign uses older source data. Refresh before reuse. |

## Requirements

- Cues must cite source type and freshness.
- Cues must be dismissible.
- Accepted cue creates a prefilled Campaign Studio brief.
- Low-confidence cues must use review language.
- Agency and multi-location cues must remain client/location scoped.

## Risks

- Too many cues become noise.
- Wrong cue timing weakens trust.
- Cues can overclaim if based only on app usage.
