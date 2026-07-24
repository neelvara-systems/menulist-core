# SignalDesk AI Intelligence - Mobile Support

**Status:** Read-only mobile contract
**Last Updated:** July 21, 2026

## Decision

SignalDesk AI review is dense, infrequent, cost-bearing internal work. Mobile may display the existing projected AI section inside the responsive SignalDesk shell, but it does not expose AI mutation authority.

## Mobile Allowed

- view projected model routes and statuses;
- view compact model-eval counters;
- view compact volume-parent status and costs;
- view projected provider-run and rules-score summaries;
- see that controls are read-only.

## Mobile Blocked

- run rules scoring from target actions;
- run standalone AI Assist;
- start or retry AI Volume Mode;
- clear or alter a paid volume retry workflow;
- accept, edit, reject, or hold a shadow run;
- edit prompts or model routes;
- activate or pause the `ai-worker` kill switch;
- view raw prompt/provider payloads.

Mobile may activate only the separately governed global outbound emergency pause. It cannot mutate scoped AI-worker state.

## Enforcement

The client uses `mobileReadOnly` and disabled fieldsets. The protected action route independently classifies AI execution as `provider_run` and shadow review as `approve`, both blocked for mobile requests. Server permissions and founder checks remain authoritative if client controls are bypassed.

## Acceptance

- No mobile AI action reaches provider work.
- No mobile shadow review changes model-eval or founder-attention totals.
- No mobile scoped kill-switch change is accepted.
- Read-only summaries contain projected fields only and no prompt, raw response, secret, or contact value.
