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

