# AI Menu Manager Doc Feedback Audit - June 27, 2026 Round 2

**Feedback source:** External ChatGPT review of updated AMM docs.
**Mode:** Docs-only validation against current AMM docs and runtime/code boundaries.

## Summary

Total points reviewed: 10
Accepted: 10
Rejected: 0
Needs code decision: 0

## Audit Table

| # | Feedback item | Decision | Evidence / reason | Applied to |
| --- | --- | --- | --- | --- |
| 1 | Update stale `Last Updated` metadata. | Accepted | Active AMM docs were revised on June 27, 2026. | Active AMM docs |
| 2 | Fix Today Special catalog wording. | Accepted | Spec already distinguishes single-item today special from scheduled special menu. Catalog wording was less precise. | `ai-menu-manager_spec.md` |
| 3 | Align Business Health action naming. | Accepted | Checklist uses `menu_missing_photo_task`; no `photo_task_create` registry action exists. | `ai-menu-manager_spec.md` |
| 4 | Add first-screen acceptance tests. | Accepted | Current product goal is ChatGPT-like smoothness, not only command correctness. | `ai-menu-manager_test-cases.md` |
| 5 | Add diagnostic/recommendation tests. | Accepted | Router outcomes are now first-class; tests should cover non-command owner questions. | `ai-menu-manager_test-cases.md` |
| 6 | Add follow-up/clarification tests. | Accepted | Technical flow supports pending-card updates and one-tap clarification-to-next-card. | `ai-menu-manager_test-cases.md` |
| 7 | Clarify local export, manual handoff, and unsupported categories in spec. | Accepted | Technical flow already separates them; spec needed owner/product wording. | `ai-menu-manager_spec.md` |
| 8 | Formalize future model provider contract. | Accepted | Model-router code defines safe outcomes/tools and flags default off. Docs needed a compact contract. | `ai-menu-manager_impl.md` |
| 9 | Add owner-copy quality test. | Accepted | Owner UI must avoid internal implementation terms. | `ai-menu-manager_test-cases.md` |
| 10 | Add public website claim guard. | Accepted | Launch copy must not claim checklist-only or unsupported capabilities. | `ai-menu-manager_spec.md`, `ai-menu-manager_website.md`, `ai-menu-manager_marketing.md`, `ai-menu-manager_test-cases.md` |

## Result

The feedback was valid and aligned with current AMM direction. Changes were limited to documentation and QA expectations. No executable scope was expanded.
