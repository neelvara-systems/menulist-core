# Staff Prompt — Documentation Hub

> **Feature:** AI-Powered Staff Training Prompts  
> **Status:** Read-only Today summary display retained; standalone helper code removed
> **Last Updated:** June 1, 2026

## June 1, 2026 Cleanup

The unused standalone helper files under `src/lib/staff-prompt/` were deleted while removing the old Social Content owner-generation path. Active owner surfaces still read `staffPrompt` from the Today summary and render it when present, but there is no separate staff-prompt generation engine in active code.

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

Auto-generate staff training prompts from menu data — new hires learn the menu in minutes, not days.

## Problem Solved

Staff onboarding for menu knowledge is slow and inconsistent. Staff Prompt uses AI to generate training materials directly from the live menu, ensuring staff always know current offerings, allergens, and upsell opportunities.
