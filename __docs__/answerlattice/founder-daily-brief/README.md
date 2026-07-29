# Founder Daily Brief

## Purpose

Founder Daily Brief turns Answerlattice's existing operational summaries into one private daily action surface for solo founders and small SaaS teams.

It does not add a new chatbot, helpdesk workflow, or autonomous AI operator. It ranks existing support work, explains why each item matters, and links the owner to the governed screen where the work must be reviewed.

The externally proposed name `Owner Action Center` describes this feature's job, but it is not a separate Answerlattice feature, route, collection, or queue. The owner-facing product name remains **Daily Brief**.

## Status

- Post-activation operating-home routing: implemented.
- Six-summary, zero-write brief: implemented.
- Permission filtering and bounded browser response: implemented.
- Highest-friction entity projection: implemented.
- Strict evidence qualification and true quiet state: implemented and locally verified.
- Entity-focused friction handoff and canonical-coverage repair route: implemented and locally verified.
- Persistent owner-action lifecycle: rejected.

## Documents

| File | Purpose |
| --- | --- |
| `founder-daily-brief_spec.md` | Business behavior and owner-facing requirements |
| `founder-daily-brief_impl.md` | Technical implementation plan and file map |
| `founder-daily-brief_firebase.md` | Firestore cost and read-model contract |
| `founder-daily-brief_mobile-support.md` | Mobile admission and responsive behavior |
| `founder-daily-brief_test-cases.md` | Acceptance and failure-path matrix |
| `founder-daily-brief_validation.md` | Deep review of the external Owner Action Center proposal |
| `founder-daily-brief_marketing.md` | Internal positioning boundaries |
| `founder-daily-brief_website.md` | Public website copy guidance |
| `founder-daily-brief_helpdoc.md` | Owner help documentation |

## Boundaries

- Summary-backed only by default.
- No raw conversation reads.
- No transcript collection.
- No autonomous publishing.
- No ticket closing.
- No support-truth mutation outside existing Governance review.
- No new scheduler.
- No new Firestore collection.
- No assistant-owned action documents.
- No manual task completion, snooze, dismissal, or accepted-risk state.
- No ticket SLA, assignment, or routing expansion.

## Runtime Surface

Founder Daily Brief is delivered inside the existing Support Assistant route and API family so owners do not need another destination.

The browser admits only the strict brief response contract. Each of the six summaries is reported as available, missing, invalid, or stale; scheduled evidence older than 48 hours is stale, and future timestamps beyond the five-minute tolerance are invalid. Metrics remain unavailable instead of becoming zero when evidence is missing.

Daily actions and launch/release controls are projected from the caller's current Answerlattice permissions. A support-only user cannot receive a governance, knowledge, readiness, billing, changelog, or other route link they cannot open.

The accepted target requires every action to represent a current, evidence-backed condition with one source-owned resolution path. A complete and healthy packet must be allowed to return no actions. Release recording, cost guidance, and other useful commands stay available outside the ranked action queue.

## Verification

`npm run verify:answerlattice-founder-daily-brief` runs the static boundary verifier, owner-assistant contract tests, weekly analytics contract tests, and the scheduler emulator.
