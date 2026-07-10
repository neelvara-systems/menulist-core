# Growth Intelligence Implementation

**Status:** Approved  
**Last Updated:** July 10, 2026

## Public Loop

`src/lib/growth/acquisitionAttribution.ts` owns the allowlist and URL/query helpers. `PublicMenuListAttribution` creates fixed tagged links. `CreateMenuClient` reads only supported values, preserves them in authentication callbacks, and submits them with photo or link drafts.

The create-menu API normalizes attribution before storage. Reused drafts keep their original attribution. The claim transaction copies supported attribution to the resulting project and records an idempotent claim event in the bounded founder growth read model.

## Founder Growth Read Model

`src/lib/ops/founderGrowthReadModel.ts` writes:

- `platformSummary/founderMonitorGrowth`
- `publicMenuDrafts/{draftId}.growthTelemetry.*RecordedAt`

The existing draft document supplies the draft/claim idempotency markers, so no separate growth-event ledger is created. Those markers share the parent draft's existing lifecycle. The summary contains only counters, latest timestamps, and fixed source keys. Founder Monitor performs one additional bounded document read on manual refresh.

## Churn Intelligence

`src/lib/billing/cancellationReasons.ts` owns stable reason codes, labels, legacy normalization, and bounded detail cleanup. Desktop and mobile submit the same code contract.

The cancellation API stores the structured cancellation audit on the subscription and passes the code into the existing idempotent founder revenue movement. The first accepted churn movement increments the matching reason counter in the live and daily revenue summaries. Webhook churn without an owner reason remains `provider_cancelled` only when explicitly supplied by that path; it is not guessed.

The API ignores `otherReason` unless the normalized code is `other`. A temporary compatibility boundary accepts the former `mobile_cancellation` value from a cached mobile client as `other` without requiring detail; current desktop and mobile code never emits that legacy value.

## Failure Rules

- Acquisition summary failure must not block draft creation or claim.
- Billing cancellation provider/state updates remain authoritative; founder telemetry is best-effort and idempotent.
- Unknown acquisition values are discarded.
- Unknown cancellation values are rejected after legacy normalization.
