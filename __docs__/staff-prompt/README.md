# Staff Prompt — Documentation Hub

> **Feature:** Read-only Today staff line
> **Status:** Read-only Today summary display retained; standalone helper code removed
> **Last Updated:** July 1, 2026

## June 1, 2026 Cleanup

The unused standalone helper files under `src/lib/staff-prompt/` were deleted while removing the old Social Content owner-generation path. Active owner surfaces still read `staffPrompt` from the Today summary and render it when present, but there is no separate staff-prompt generation engine in active code.

## Current Runtime Contract

- Source of truth: `platformSummary/campaigns_{sId}.staffPrompt`.
- Runtime read path: `getTodayCampaigns()` returns the existing Today summary and suppresses stale summaries.
- Desktop/mobile display: Today shows the line only when `staffPrompt.eligible` is true.
- No separate staff-facing route, phone reference view, provider call, owner setting, or mobile-only write exists.
- Verification: `npm run verify:staff-prompt-runtime`.

---

## Quick Navigation

| Audience | Document | Purpose |
|----------|----------|---------|
| CEO / PM | [staff-prompt_spec.md](./staff-prompt_spec.md) | Business requirements |
| Developer | [staff-prompt_impl.md](./staff-prompt_impl.md) | Technical blueprint |
| Marketing | [staff-prompt_marketing.md](./staff-prompt_marketing.md) | Sales positioning |
| Website | [staff-prompt_website.md](./staff-prompt_website.md) | Public landing page content |
| Support | [staff-prompt_helpdoc.md](./staff-prompt_helpdoc.md) | Customer help documentation |
| Ops / Finance | [staff-prompt_firebase.md](./staff-prompt_firebase.md) | Firebase cost tracking |

## Additional Documents

| Document | Purpose |
|----------|---------|
| [staff-prompt_validation.md](./staff-prompt_validation.md) | Validation report |
| [staff-prompt_code-review.md](./staff-prompt_code-review.md) | Code review findings |
| [staff-prompt_logic-verification.md](./staff-prompt_logic-verification.md) | Logic verification |

## One-Liner

Show one read-only staff line in Today when the daily summary says it is eligible.

## Problem Solved

Owners sometimes need a simple, safe line their staff can repeat during service. The active runtime does not create a separate staff portal or training assistant; it only renders the `staffPrompt` field already present in the Today summary.
