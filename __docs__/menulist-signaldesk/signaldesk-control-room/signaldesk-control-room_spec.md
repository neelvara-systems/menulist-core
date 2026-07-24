# SignalDesk Control Room - Specification

**Status:** Implemented source contract
**Revalidated:** July 21, 2026

## Objective

Give authorized SignalDesk operators one bounded surface for observing safety,
cost, queue, incident, and pause truth without turning monitoring into another
growth-action dashboard.

## Admitted Behavior

| Capability | Current behavior |
| --- | --- |
| Operating summary | Shows channel/source/cost status, queue counts, outcomes, demand, targets, runtime and provider-send state. |
| Pauses | Shows all valid active scopes and permits confirmed activation/clear when the user has the exact permission. |
| Incidents | Counts and lists strict `open` plus `acknowledged` incidents. Resolved incidents are excluded. |
| Cost | Shows today's strict AI/provider estimate and Firestore operation estimates. |
| Control navigation | Links to settings, policies, sources, channels, AI, content, partners and audit. |
| Holds | Shows non-approved provider accounts and budget posture already loaded for Controls. |
| Mobile | Dashboard overview plus confirmed emergency global-pause activation only. |

## Kill-Switch Scopes

`global-outbound`, `email`, `whatsapp`, `instagram`, `messenger`,
`source-provider`, `ai-worker`, `campaign`, `content-distribution`,
`trust-partner`, and `menu-list-bridge`.

Relevant source, AI, outbound, campaign, content, partner and bridge paths re-read
their governed pause documents before expensive or external work. A pause does
not grant permission, clear suppression, change a source policy, or enable a
provider.

## Requirements

1. Dedicated Controls routes and reads honor the master feature flag.
2. Client reads remain strict, bounded, product-scoped DTOs.
3. Active pause count is derived from the eleven canonical documents, not a
   potentially stale aggregate counter.
4. Unresolved incident count includes acknowledged work and fails visibly above
   500 matching records; the rendered list remains capped at 50.
5. Every successful pause transition writes switch, audit, claim, and daily-cost
   truth atomically. Exact replay writes nothing.
6. Desktop and mobile require explicit confirmation before activation.
7. Controls must not expose dashboard research, lead, evidence, or draft actions.
8. No raw event stream, private incident payload, secret, or contact PII reaches
   the overview DTO.

## Non-Goals

- No autonomous optimizer or automatic threshold engine.
- No generic incident acknowledge/resolve API.
- No raw event drill-down on the Controls page.
- No scheduled pause expiry.
- No public or MenuList-owner analytics surface.
- No provider send or publication authority.
