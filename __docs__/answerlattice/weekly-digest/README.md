# Weekly Digest

> **Status:** Implemented and source-hardened
> **Last verified:** 2026-07-19
> **Feature flag:** `ENABLE_ANSWERLATTICE_WEEKLY_DIGEST`

## Purpose

Weekly Digest gives an authorized Answerlattice user a deterministic summary of the latest completed seven-day UTC support period. It highlights repeated questions, recorded feedback, answer gaps, and the next governed review work.

It is not an AI-written executive report, an email-delivery system, or proof that a customer issue was resolved. It never changes approved knowledge.

## Runtime Contract

- `/answerlattice/weekly-digest` requires `canViewReadiness`.
- The browser reads one exact workspace document at `insights/{tId}/stores/{sId}/ai/weekly`.
- The document must have exact `AL` product, tenant, and store identity, an exact seven-day inclusive window, `generationMode: deterministic`, bounded content, and a valid generation timestamp.
- The Answerlattice master scheduler prepares the completed week on Sunday UTC from strict daily chat-analytics summaries.
- A user with `canManageSupport` may run the bounded `Prepare latest week` compatibility route.
- Comparison metrics remain `Not available` until both the current and previous seven-day windows contain seven admitted source days.
- Missing, invalid, future-dated, stale, and partial summaries are visible failure states.
- Recommendations open only routes the current user is allowed to use.
- Export repeats the same completeness boundary shown on screen.

## Product Boundary

The digest turns settled support evidence into review work. It does not:

- claim inferred customer satisfaction;
- call an AI provider;
- debit support credits;
- scan raw conversations in the browser;
- send email;
- auto-create Support Board cards;
- approve, publish, or mutate an answer;
- replace source evidence or Answer Tests.

## Documents

| File | Purpose |
| --- | --- |
| `weekly-digest_spec.md` | Product and evidence contract |
| `weekly-digest_impl.md` | Current end-to-end runtime flow |
| `weekly-digest_firebase.md` | Storage, rules, cost, and scheduler behavior |
| `weekly-digest_mobile-support.md` | Responsive and touch behavior |
| `weekly-digest_test-cases.md` | Acceptance and regression matrix |
| `weekly-digest_marketing.md` | Safe positioning boundaries |
| `weekly-digest_website.md` | Public-claim guidance |
| `weekly-digest_helpdoc.md` | Owner-facing operating guidance |

## Primary Evidence

- `src/components/templates/answerlattice/weeklyDigest/AnswerlatticeWeeklyDigest.tsx`
- `src/lib/answerlattice/analyticsIntelligenceContracts.ts`
- `src/app/api/analytics/weekly-narrative/generate-local/route.ts`
- `functions-answerlattice/src/answerlattice/chatIntelligence.ts`
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts`
- `firestore-answerlattice.rules`
- `scripts/verification/test-answerlattice-chat-analytics-contracts.ts`
- `scripts/verification/test-answerlattice-chat-analytics-scheduler.ts`

## Deployment Boundary

The required `answerlattice-qa` Functions/rules and `menulist-qa` shared-rule deployments were attempted on 2026-07-19 and stopped before upload because Firebase CLI authentication was unavailable. No remote revision changed. Hosted browser and real scheduled-run proof remain pending.
