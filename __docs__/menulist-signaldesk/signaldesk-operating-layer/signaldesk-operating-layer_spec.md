# SignalDesk Operating Layer - Spec

**Status:** Implemented
**Created:** June 24, 2026
**Last Updated:** July 16, 2026

## Goal

SignalDesk should show the founder the smallest useful set of growth decisions for the day.

The operating layer exists to prove one narrow acquisition loop before SignalDesk expands into more send, provider, partner, or content automation.

## Included

- Daily Growth Mission.
- 7-day operating trial support.
- Offer and CTA records.
- Reply-to-conversion playbooks.
- Lightweight experiment cards with baseline and candidate windows, one primary metric, known confounders, and a scheduled readback.
- Source-quality learning snapshots.
- Research Agent Table for prompt-to-table provider discovery, enrichment columns, pass/fail/unsure scoring, and source-transparent market mapping.
- Dashboard lead batch for up to 30 prepared leads with validated/needs-evidence state, recommended action, contact path, and share message.
- Founder review state for mission and experiment decisions.

## Excluded

- Public SignalDesk pages.
- Public partner portal.
- Public MenuList marketing pages.
- Provider send.
- Social auto-publish.
- Paid campaign automation.
- Automatic winner promotion, automatic rollback, or provider-fed metric decisions.
- New Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, or sequencer adapters.
- Direct writes into MenuList store, project, menu, billing, onboarding, or public output truth.

## Owner Workflow

1. Open Dashboard.
2. Review Today's Lead Batch: up to 30 prepared leads, each with why it matters, where to contact, what to share, and the next safe action.
3. Run a Market Search prompt such as `independent cafes in Indiranagar Bengaluru with weak current-menu presence` when the approved pod, source, or partner list needs mapping.
4. Open Mission for the deeper Research Agent Table, Daily Growth Mission, and experiment controls.
5. Review no more than five ranked mission actions.
6. Approve, hold, pause, redirect, or manually complete an action.
7. Define the baseline window, candidate window, primary metric, known confounders, and next readback before creating an experiment card.
8. Record a fresh 2-1000 character result summary and make the founder decision: repeat, narrow, hold, stop, or complete.
9. Use source-quality snapshots to decide whether to continue, narrow, refresh, or stop a source.
10. Use reply playbooks to convert replies without inventing claims.

## Acceptance

- Mission route exists.
- Dashboard loads the latest research runs/table rows and renders Today's Lead Batch.
- Mission workspace loads missions, experiments, offers, reply playbooks, source-quality snapshots, market pods, CTAs, approvals, replies, outcomes, demand signals, content assets, and partner profiles.
- Research Agent Table creates governed research runs and table rows with source refs, enrichment columns, pass/fail/unsure decisions, and market-pod updates.
- Market Search is source-policy governed, capped at 30 rows, and does not infer contact permission from provider/source readiness.
- Today's Lead Batch excludes failed research rows and suppressed/held/rejected fallback targets.
- Market Search keeps a 30-row hard cap; the approved Bengaluru presets default to the 25-row first-trial batch.
- Mission generation is deterministic and uses existing SignalDesk data.
- Mission action list is capped at five actions.
- Mission generation does not call paid providers.
- Mission generation does not send messages.
- New experiment cards store hypothesis, pod, source, CTA, proof asset, stop rule, result, decision, baseline/candidate windows, primary metric, confounders, and next readback.
- Experiment windows cannot overlap; each window must end after it starts; the next readback cannot precede the candidate-window end.
- Every repeat, narrow, hold, stop, or complete decision requires a fresh bounded result summary; `pending` is stored state, not a review action.
- Legacy experiment cards remain visible with an explicit `readbackPlan: null` state rather than being hidden or backfilled with invented evidence.
- Readback data informs the existing founder decision only; it cannot send, publish, spend, promote a winner, or roll back an experiment automatically.
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

The first approved Bengaluru trial defaults to manual preparation, 25 candidates, five owner conversations, five private previews, three two-surface activations within seven days, one permissioned proof asset, and zero external provider, media, or partner spend.
