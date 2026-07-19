# Founder Daily Brief

## Purpose

Founder Daily Brief turns Answerlattice's existing operational summaries into one private daily action surface for solo founders and small SaaS teams.

It does not add a new chatbot, helpdesk workflow, or autonomous AI operator. It ranks existing support work, explains why each item matters, and links the owner to the governed screen where the work must be reviewed.

## Documents

| File | Purpose |
| --- | --- |
| `founder-daily-brief_spec.md` | Business behavior and owner-facing requirements |
| `founder-daily-brief_impl.md` | Technical implementation plan and file map |
| `founder-daily-brief_firebase.md` | Firestore cost and read-model contract |
| `founder-daily-brief_mobile-support.md` | Mobile admission and responsive behavior |
| `founder-daily-brief_test-cases.md` | Acceptance and failure-path matrix |
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

## Runtime Surface

Founder Daily Brief is delivered inside the existing Support Assistant route and API family so owners do not need another destination.

The browser admits only the strict brief response contract. Each of the six summaries is reported as available, missing, invalid, or stale; scheduled evidence older than 48 hours is stale, and future timestamps beyond the five-minute tolerance are invalid. Metrics remain unavailable instead of becoming zero when evidence is missing.

Daily actions and launch/release controls are projected from the caller's current Answerlattice permissions. A support-only user cannot receive a governance, knowledge, readiness, billing, changelog, or other route link they cannot open.

## Verification

`npm run verify:answerlattice-founder-daily-brief` runs the static boundary verifier, owner-assistant contract tests, weekly analytics contract tests, and the scheduler emulator.
