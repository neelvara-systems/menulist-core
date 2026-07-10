# SignalDesk Revenue Operating Layer

**Status:** Runtime implemented and locally verified
**Created:** July 10, 2026
**Audience:** SignalDesk founder/admin, growth operators, implementers
**Runtime:** Private `/signaldesk/revenue` workspace only

## Purpose

The Revenue Operating Layer connects SignalDesk acquisition records to a bounded commercial lifecycle without turning SignalDesk into a generic CRM or allowing it to own MenuList customer truth.

It adds:

- organization/location-aware revenue accounts linked to existing targets;
- deterministically qualified commercial opportunities;
- immutable versioned standard commercial offers with one pipeline currency;
- operating envelopes that require an active market pod and reference only compatible source, budget, sender, template, and offer policies;
- interested replies that deterministically create or reuse the eligible revenue lifecycle without granting outreach rights;
- activation watches automatically refreshed from SignalDesk outcome summaries, with read-time seven-day stall detection and a manual recovery recheck;
- compact revenue-control summaries and a daily founder brief covering pipeline, stalls, attention, and estimated spend.

## Boundary

SignalDesk may organize, qualify, prepare, summarize, and request approval. It must not:

- write MenuList stores, projects, menus, billing, publish state, or public output;
- infer consent or source rights;
- override suppression;
- auto-enable provider send;
- let an operating envelope grant itself a higher autonomy level;
- replace the MenuList Activation Concierge.

## Documents

- [Specification](./signaldesk-revenue-operating-layer_spec.md)
- [Implementation](./signaldesk-revenue-operating-layer_impl.md)
- [Firebase](./signaldesk-revenue-operating-layer_firebase.md)
- [Compliance](./signaldesk-revenue-operating-layer_compliance.md)
- [Mobile support](./signaldesk-revenue-operating-layer_mobile-support.md)
- [Test cases](./signaldesk-revenue-operating-layer_test-cases.md)

## Runtime Contract

```txt
existing target + evidence + reply/outcome state
  -> interested reply or authorized deterministic qualification
  -> revenue account
  -> commercial opportunity when criteria pass
  -> versioned standard offer
  -> operating envelope in shadow or approval-only mode
  -> SignalDesk route/outcome observation automatically refreshes activation watch
  -> expired seven-day deadline reads as stalled without a new scheduler
  -> activated outcome closes the linked opportunity and removes it from open forecast
  -> compact revenue summary
```
