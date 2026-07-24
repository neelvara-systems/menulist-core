# SignalDesk Operating Layer - Test Cases

**Status:** Current source and deterministic E2E coverage
**Created:** June 24, 2026
**Last Updated:** July 22, 2026

## Feature and Access

| Case | Expected |
| --- | --- |
| Parent flag disabled | Mission and Opportunities pages return not found; Mission workspace and every Operating Layer action reject. |
| Research child flag disabled | Research UI/action/read arrays are absent while the rest of Operating Layer remains available. |
| Disabled Content/Partner/Revenue child rail | Mission read/generation does not query or rank that rail's stale records. |
| Unauthenticated request | `withAuth()` blocks it. |
| Wrong permission | API and workspace controls reject/hide the action-specific mutation. |
| Mobile mutation | Server mobile read-only gate rejects it. |
| Mobile workspace | Compact Dashboard only; no Mission/Opportunities editor. |

## Mission and Experiments

| Case | Expected |
| --- | --- |
| Create mission | Deterministic record with at most five approved action classes. |
| Review mission | Valid transition and note commit with audit/cost; exact terminal retry does not duplicate effects. |
| Create experiment | Valid hypothesis, authority references, stop rule, and `signaldesk-experiment-readback-v1`. |
| Invalid windows/confounders/readback | Rejected before writes. |
| Review without fresh 2-1000 character result | `EXPERIMENT_REVIEW_RESULT_REQUIRED`; no write/audit/cost. |
| Pending review decision | Rejected; pending remains initial stored state only. |
| Terminal reopen | Rejected. Exact terminal replay returns existing truth. |
| Legacy experiment | Readable with `readbackPlan: null`; no backfill or invented evidence. |

## Today Activation Desk

| Case | Expected |
| --- | --- |
| Mission reply plus live opportunity for one target | One Today item; no duplicate work. |
| Resolved approval still present in the mission | Removed from Today by current approval truth. |
| Mission target now has a terminal opportunity | Removed from Today; stale mission work cannot revive completed or rejected work. |
| Direct action succeeds | Existing server action settles and refreshes; focus advances afterward. |
| Direct action lacks bounded client authority | Opens Opportunities for review; does not bypass the existing guard. |
| Operator selects Next | Changes local focus only; no completion, audit, cost, or outcome claim. |
| Interested owner handoff | Copies the existing anonymous founder-pilot MenuList setup URL; no provider send or route token. |
| Target Journey | Uses existing bounded summaries, reveals no raw contact identity, and performs no read/write. |
| Verified two-surface target proof preparation | Requires durable activation time, evidence reference, approved integrity, and two distinct surfaces before Content can review permission/source and prefill fields. |
| Unverified, evidence-missing, one-surface, or integrity-missing target | Proof preparation remains unavailable even if an older outcome row says `two_surface_activation`. |
| Seven-day outcomes | Counts only in-window route/upload/preview/publish summaries and evidence-backed verified two-surface outcomes; the percentage links unique routed targets to the same targets' verified activation outcomes. |
| Stalled outcome | Requires an elapsed durable activation deadline and excludes activated, terminal, suppressed, and source-policy-expired opportunities. |
| Mobile Today | Remains observe-only; queue mutations, link copy, and proof preparation are disabled. |

## Offer, Reply, Quality, and Pod

| Case | Expected |
| --- | --- |
| Offer upsert | Validates nested CTA/pod/proof authority; stores blocked claims. |
| Offer authority change | Existing dependent content authority is reconciled through the bounded existing recovery flow. |
| Reply playbook unsafe suppression route | Rejected before writes. |
| Reply playbook exact retry | Returns the projected stored record; no repeat audit, timeline, or cost. |
| Malformed stored reply | Fails with `REPLY_PLAYBOOK_SHAPE_INVALID`. |
| Source-quality explicit policy/run missing | Rejected before snapshot writes. |
| Source-quality policy/run mismatch | Rejected with `SOURCE_QUALITY_POLICY_RUN_MISMATCH`. |
| Source-quality exact retry | Returns existing canonical snapshot; no repeat side effects. |
| Malformed source-quality snapshot | Fails closed. |
| Market-pod exact recommendation | Returns existing projected pod; no repeat side effects. |
| Malformed market pod | Fails closed. |
| Founder-reviewed market pod | Recommendation cannot overwrite review/approval authority. |

## Research

| Case | Expected |
| --- | --- |
| Invalid/missing source policy | Rejected before provider execution. |
| Active source-provider kill switch | Rejected before provider execution. |
| Result cap above 30 | Normalized to the hard 30-row maximum. |
| Exact concurrent retries | One provider execution; later request replays the durable run/rows. |
| Changed actor/request under same key | Idempotency conflict. |
| Provider success and final transaction ambiguity | Durable completed run/rows are recovered before compensation. |
| Failed rows | Retained for audit but excluded from Today's Lead Batch. |
| Source-only rows | Never create contact permission/identities. |

## Isolation and Persistence

| Case | Expected |
| --- | --- |
| Client Firestore write | Denied by SignalDesk rules. |
| Cross-product document | Product-shape/project guards reject it. |
| Public/MenuList output scan | Operating records and identifiers are absent. |
| Exact retry | No duplicate entity, audit, timeline, provider execution, or daily cost effect. |

## Commands

```bash
SIGNALDESK_E2E_FOCUS=operating npm run test:signaldesk:e2e:local
npm run test:signaldesk:daily-activation-desk
npm run verify:signaldesk
npm run test:signaldesk:workspace-client-contracts
npm run test:signaldesk:access-boundary
npm run typecheck
npm run verify:dependency-freeze
npm run docs:check-links
git diff --check
```

The July 22 Today improvement changed no SignalDesk rules, indexes, Storage rules, or Functions, so an infrastructure deploy is not part of this feature closeout.
