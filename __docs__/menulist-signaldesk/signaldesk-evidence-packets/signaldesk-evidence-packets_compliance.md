# SignalDesk Evidence Packets - Compliance

**Status:** Enforced in current runtime
**Last Updated:** July 21, 2026

## Authority Rule

Data availability is not permission. Evidence creation revalidates the current
source policy and target source lifecycle inside the transaction. A previous UI
decision, score, packet, or policy renewal cannot bypass current authority.

## Allowed Facts

The active packet may carry only bounded target summary facts already admitted
under source policy: display name, category, city, website, current-list URL,
opportunity classification, source confidence, and source policy/run references.

Raw contacts, permission evidence text, provider payloads, ratings, reviews,
photos, menu content, operator notes, and arbitrary model output are excluded.

## Required Rejections

Packets state that owner control and mobile accessibility are unverified and
reject unsupported customer-loss, sales-impact, ranking, and platform-partnership
claims. A missing URL is an observed absence in approved source data, not proof
that a business has no menu.

## Downstream Use

`draft-personalization` appears only when current source policy permits it.
Downstream draft, approval, route, outcome, export, and send boundaries re-read
their own current authority; the packet is not a standing permission grant.

## Privacy And Audit

- Detail is server-only; summary is protected SignalDesk internal data.
- No raw contact or free-form operator text enters packet or packet-create audit.
- Exact retries do not create duplicate audit/cost rows.
- Expiry replaces source-derived content with a bounded tombstone and records a
  deterministic system audit.
- Direct browser writes remain denied.

## Dispute And Takedown

The current runtime uses suppression, target holds, source-policy blocking, kill
switches, and source-data lifecycle reconciliation. It does not implement an
editable evidence-fact workflow. Correct the governing source/target authority,
then regenerate; do not mutate an old deterministic packet in place.
