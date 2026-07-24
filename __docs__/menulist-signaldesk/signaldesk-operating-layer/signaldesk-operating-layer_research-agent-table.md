# SignalDesk Operating Layer - Research Agent Table

**Status:** Implemented for governed internal use
**Created:** June 26, 2026
**Last Updated:** July 21, 2026
**Parent:** [SignalDesk Operating Layer](./README.md)

## Purpose

Convert one founder prompt into a bounded, source-transparent review table:

```txt
prompt
  -> provider/source-policy admission
  -> durable idempotency claim and running record
  -> governed source-provider execution
  -> normalized targets and retention evidence
  -> pass / fail / unsure research rows
  -> founder-readable lead batch and held market-pod recommendation
```

It is a research workflow, not an autonomous campaign or contact-permission system.

## Admission

Every new run requires:

- parent `ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER` enabled;
- child `ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE` enabled;
- authenticated desktop SignalDesk access with `source.configure`;
- no active `source-provider` kill switch;
- one explicit usable source policy compatible with the selected provider;
- provider readiness and transaction-current budget admission;
- a bounded actor/request idempotency key; and
- `maxResults` between 1 and 30.

## Providers

The current selectable source providers are `google-places`, `apify`, and `fhrs-fhis`. Availability still depends on configuration, policy, and budget. Presets do not grant provider, contact, spend, or send permission.

## Durable Lifecycle

1. A transaction creates the actor/request-bound idempotency claim, running research record, and initial timeline before provider use.
2. The provider call uses a stable derived key and the existing source-provider accounting/recovery contract.
3. Result records are normalized; raw provider payloads are not copied into the research table.
4. Completion atomically writes rows, run state, a held/recommended pod projection, audit, timeline, and cost summary.
5. Existing founder-reviewed pod authority is preserved during completion.
6. Concurrent exact retries return durable truth and do not invoke the provider twice. Changed actor/request identity conflicts.
7. Ambiguous completion probes the deterministic run and rows before compensation or review-required status.

## Output

Business-prospect rows contain bounded identity/location fields, source references, evidence summary, fit decision, recommended safe channel/CTA/message angle, and next action. Partner-list rows use the partner-oriented subset. Every row retains source transparency.

| Decision | Meaning | Use |
| --- | --- | --- |
| `pass` | Useful candidate for founder review. | Score, partner review, or pod review. |
| `unsure` | Evidence is incomplete. | Evidence or pod review. |
| `fail` | Low fit, held, or suppressed. | Keep for audit; do not place in the daily lead batch. |

## Today's Lead Batch

- Only `pass` and `unsure` research rows are actionable.
- Pass rows sort before unsure; higher fit score sorts first.
- The batch is capped at 30.
- Failed rows remain visible in research output for audit/source learning.
- Before research exists, the dashboard may use clear, non-held, non-rejected target summaries.
- When the child feature is disabled, Research records are not loaded and the UI/action are unavailable.

## Boundaries

- No Origami dependency or external sequencer.
- No provider send, social DM automation, paid campaign, public SignalDesk page, or MenuList truth write.
- Source-only records never become contact identities without a separately compatible contact source policy.
- Research recommendation cannot activate or overwrite a founder-reviewed market pod.

## Verification

```bash
SIGNALDESK_E2E_FOCUS=operating npm run test:signaldesk:e2e:local
npm run verify:signaldesk
npm run typecheck
```

The deterministic E2E uses local provider fixtures and validates claim/replay behavior, row/source transparency, dashboard visibility, changed-input conflicts, concurrent exact delivery, pod preservation, and no source-only contact promotion.
