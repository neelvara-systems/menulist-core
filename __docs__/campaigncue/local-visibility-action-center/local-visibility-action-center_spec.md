# Local Visibility Action Center - Specification

## Owner Problem

Local owners often know that visibility matters but do not know whether to update business details, prepare a current Google handoff, add a photo, fix an expired offer, or request a review. A generic content prompt makes the owner decide again.

## Product Promise

Show the safest useful local visibility action supported by saved CampaignCue truth. Explain the evidence, the manual steps, and what the action unlocks. Admit when data is missing or stale.

## Action Categories

- local business identity
- customer destination
- owner-managed profile destinations
- current Google-ready pack
- current local input
- expired details
- approved local image
- customer review destination
- branch context when multiple active locations exist

## States

Each action is one of `missing`, `needs_review`, or `ready`, mapped to `do_now`, `review`, or `ready` priority. Missing and review actions sort before ready confirmations. Sorting is deterministic.

## Invariants

1. A Google handoff is ready only when a non-archived Google output exists, campaign trust is `clear`, and its truth receipt is current at the caller-provided time.
2. A local image is ready only when it is an image or logo and passes the shared durable visual-readiness boundary. Video cannot satisfy image readiness.
3. Expiry uses the Daily Desk clock so tests, server rendering, and UI projection agree.
4. Evidence, steps, references, and unlocks are bounded.
5. The center never calls a model, provider, scraper, or Firebase API.
6. The center never claims that an external profile is complete, current, visible, indexed, or ranked.
7. The owner remains responsible for verifying and updating external profiles manually.

## Non-goals

- direct Google Business Profile updates
- profile scraping or competitor monitoring
- SEO or ranking guarantees
- review solicitation automation
- new local-visibility persistence
- inferred offers, dates, locations, contacts, or rights
