# SignalDesk Operating Layer - Spec

**Status:** Implementation-ready
**Created:** June 24, 2026

## Goal

SignalDesk should show the founder the smallest useful set of growth decisions for the day.

The operating layer exists to prove one narrow acquisition loop before SignalDesk expands into more send, provider, partner, or content automation.

## Included

- Daily Growth Mission.
- 7-day operating trial support.
- Offer and CTA records.
- Reply-to-conversion playbooks.
- Lightweight experiment cards.
- Source-quality learning snapshots.
- Founder review state for mission and experiment decisions.

## Excluded

- Public SignalDesk pages.
- Public partner portal.
- Public MenuList marketing pages.
- Provider send.
- Social auto-publish.
- Paid campaign automation.
- New Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, or sequencer adapters.
- Direct writes into MenuList store, project, menu, billing, onboarding, or public output truth.

## Owner Workflow

1. Open Mission.
2. Create or refresh today's Daily Growth Mission.
3. Review no more than five ranked actions.
4. Approve, hold, pause, redirect, or manually complete an action.
5. Use experiment cards to keep one pod test bounded.
6. Use source-quality snapshots to decide whether to continue, narrow, refresh, or stop a source.
7. Use reply playbooks to convert replies without inventing claims.

## Acceptance

- Mission route exists.
- Mission workspace loads missions, experiments, offers, reply playbooks, source-quality snapshots, market pods, CTAs, approvals, replies, outcomes, demand signals, content assets, and partner profiles.
- Mission generation is deterministic and uses existing SignalDesk data.
- Mission action list is capped at five actions.
- Mission generation does not call paid providers.
- Mission generation does not send messages.
- Experiment cards store hypothesis, pod, source, CTA, proof asset, stop rule, result, and decision.
- Offer/CTA records keep approved owner asks and blocked claims.
- Reply playbooks map common reply intents to approved next copy and routes.
- Source-quality snapshots measure activation-oriented source quality, not raw lead volume.

## First 7-Day Trial

The first trial uses:

```txt
one market pod
one approved source list
one CTA
one sender identity
one export-only rail
one outcome report
```

The trial is not passed until SignalDesk can show source rights, evidence, approval, reply state, outcome state, and founder workload.
