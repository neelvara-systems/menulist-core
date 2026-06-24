# SignalDesk Content Distribution Rail - Spec

**Status:** Implemented for internal testing
**Date:** June 24, 2026

## Goal

Help a solo technical founder distribute MenuList consistently from approved internal proof without needing a marketing team to manually rewrite every idea for each channel.

The system should prepare work. Danny should approve, schedule, monitor, and decide what to repeat.

## Included

- Source registry for owned proof, changelog, demo, case note, customer story, blog, video, podcast, and manual assets.
- Canonical content asset records with audience, proof level, CTA, market pod, risk notes, and source notes.
- Deterministic channel draft generation for LinkedIn, X, email, newsletter, partner brief, blog, short video, and other.
- Draft review states: pending, approved, rejected, hold.
- Calendar queue state without auto-publishing.
- Manual performance capture: views, clicks, owner leads, current-list submissions, activations, and engagement quality.
- Demand signal bridge when content produces owner-quality signals.
- Content-specific kill switch.

## Excluded

- Auto-posting to social platforms.
- Paid campaign automation.
- External adapter work for social schedulers.
- Public SignalDesk marketing pages.
- Generic social media management for non-MenuList products.

## Owner Workflow

```txt
Observe: review sources, assets, drafts, calendar, and performance.
Monitor: check approval state, risk notes, and owner-signal quality.
Approve: approve draft, queue calendar item, or reject/hold.
Redirect: reuse winning assets in trust partner, email, or market pod tests.
Pause: activate content-distribution kill switch.
```

## Acceptance

- A founder can seed defaults, create a source, create an asset, generate drafts, approve one, queue it, and record performance from `/signaldesk/content`.
- Content work remains internal, noindexed, authenticated, rate-limited, and server-written only.
- No content path publishes externally without a later explicit adapter decision.
