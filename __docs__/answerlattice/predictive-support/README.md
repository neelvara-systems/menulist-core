# Predictive Support And Known Issues

**Status:** Implemented and locally hardened on July 18, 2026
**Feature flags:** `ENABLE_ANSWERLATTICE_WIDGET`, `ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT`, `ENABLE_ANSWERLATTICE_KNOWN_ISSUES`, and optional `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`

## Purpose

Predictive support gives an end user a bounded, page-specific support cue before they submit a question. Known issues use the same governed runtime to show an active incident notice on an exact product page.

This feature does not watch the DOM, infer arbitrary behavior, publish knowledge, or change the client product. It selects an owner-reviewed trigger from approved runtime truth and opens the existing Answerlattice widget.

## Governed flow

```text
owner or system suggestion
-> review and exact page assignment
-> active trigger summary
-> widget config capability check
-> safe product context
-> authenticated predictive request
-> deterministic trigger match
-> bounded widget suggestion
-> shown, opened, or dismissed signal
-> engagement evidence for owner review
```

System-generated friction suggestions remain `suggested` and have no page. They cannot become active until an owner reviews the content and assigns an exact page.

## Runtime contracts

- Conditions: exact normalized `page`, plus optional `feature`, `workflow`, `plan`, and `userRole`.
- Page input: `context.page`, with `contextKey` accepted by the public loader as the page fallback.
- Context exclusions: raw DOM, unrestricted URL/path data, form values, tokens, screenshots, email, customer ID, and arbitrary application state.
- Trigger cap: 200 per workspace. Summary overflow fails closed and does not replace the last valid summary.
- Priority: integer 0-100.
- Cooldown: integer 1-720 hours for ordinary predictive prompts.
- Known issues: severity, optional start/end window, and optional public HTTPS status-page URL.
- Response: bounded to 32 KiB and normalized again in the public loader and widget iframe.
- Cooldown identity: non-PII per-tab session identity stored in `sessionStorage`.

## Security boundary

Both predictive endpoints require:

1. an `al_` widget key;
2. fail-closed pre-auth and API-key rate limits;
3. Answerlattice product, widget purpose, and `widget:predictive` scope;
4. exact tenant/workspace scope derived from the key;
5. allowed origin and widget runtime-token authorization;
6. a strict 4 KiB request body.

Interaction events are rechecked against the current active trigger, applicability window, and submitted context before a signal can be emitted.

## Evidence semantics

`suggestion_shown`, `suggestion_clicked`, and `suggestion_dismissed` are engagement evidence only. `suggestion_clicked` currently means the user opened the widget from the cue. These events do not prove resolution, ticket prevention, answer correctness, or task completion.

The nightly function may aggregate this evidence for review. It does not automatically disable triggers, change priority, approve content, or publish new truth.

## Data and cost

- Source collection: `answerlattice_predictiveTriggers`.
- Hot read model: `platformSummary/predictiveTriggers_{tId}_{sId}`.
- Runtime cache: 60 seconds when active triggers exist; 5 minutes for an empty result.
- A trigger mutation performs the trigger write, one bounded summary query, one summary write, and existing compiled-context invalidation work.
- An interaction writes an existing signal only when signal mutation is enabled and the event passes admission.
- No new listener, collection, index, Storage object, AI call, or standalone scheduler was added by the Feature 18 hardening.

## Owner surfaces

- Predictive triggers: Governance -> Advanced -> Predictive Triggers.
- Known issues: `/answerlattice/known-issues`.
- Suggested triggers open in review/edit mode. They are not directly activated.
- The management surface labels aggregate counts as engagement evidence rather than effectiveness or resolution.

## Maintained documents

- [Specification](./predictive-support_spec.md)
- [Implementation](./predictive-support_impl.md)
- [Firebase and cost](./predictive-support_firebase.md)
- [Help](./predictive-support_helpdoc.md)
- [Marketing boundary](./predictive-support_marketing.md)
- [Website boundary](./predictive-support_website.md)
- [Mobile support](./predictive-support_mobile-support.md)
- [Test cases](./predictive-support_test-cases.md)

## Named hardening checkpoints

- **Answerlattice App Predictive Trigger ID Boundary**
- strict shared trigger and suggestion projection;
- exact-page activation gate;
- public widget runtime authorization;
- bounded interaction evidence contract;
- no automatic trigger mutation from engagement signals.

## Verification boundary

Local verification proves source contracts, rules, compilation, and deterministic tests. Hosted allowed-origin behavior, real Redis cooldown persistence, production traffic, desktop/mobile browser behavior, and measured customer outcomes require separate external evidence.
