# AI Menu Manager Technical Team Flow Feedback Audit - June 27, 2026

## Input Reviewed

External feedback compared `ai-menu-manager_technical-team-flow.md` against AMM product/spec direction and recommended clarifications before teams build more adapters.

## Verdict

Accepted with qualifications. The feedback correctly identified doc gaps around router outcomes, structured composer context, patch safety, flag semantics, server fallback authority, local/manual/unsupported separation, publish scope, and rollback wording.

The implementation already had the important runtime primitives:

- structured composer context IDs in `src/lib/ai-menu-manager/composerContext.ts`.
- deterministic executable boundary in `src/lib/ai-menu-manager/actionTypes.ts`.
- local export and unsupported card builders in `src/lib/ai-menu-manager/cardBuilder.ts`.
- desktop/mobile suggested replies that draft prompts instead of executing in `AiMenuProposalCard.tsx` and `MobileAiMenuCardStack.tsx`.

Follow-up code hardening added explicit action-scoped patch validation so the patch safety contract is enforced before client and server execution directives are issued.

## Feedback Decisions

| Feedback item | Decision | Reason / adjustment |
| --- | --- | --- |
| Add positive identity as bounded conversational operations agent. | Accepted | Added after the one-line contract without weakening "not a generic chatbot." |
| Add router outcome list. | Accepted | Added owner-visible outcome table and mapped categories to current card shapes. |
| Structured Work On context must not rely only on text prefixing. | Accepted | Documented `composerContext.target` and `selectedEntityIds` as execution scope; text prefix is owner-readable only. |
| Clarification option should create next proposal. | Qualified | Current UI drafts the next prompt only. Doc now states current behavior and future-safe invariant: clarification choices must not execute or approve by themselves. |
| Add patch safety contract. | Accepted | Documented declarative, action-scoped patch contract and stale/hash guard expectations. |
| Tighten server route authority. | Accepted | Added route authority constraints and blocked/checklist-only action prohibition. |
| Split/explain rules flag. | Accepted | Clarified that `ENABLE_AI_MENU_MANAGER_RULES` is suggestion/registry visibility only, not rule execution. |
| Split/explain image flag. | Accepted | Clarified that image flag does not make all image checklist rows executable. |
| Clarify voice flag. | Accepted | Clarified as voice-input readiness unless production speech-to-command is verified. |
| Separate local export, manual handoff, unsupported cards. | Accepted | Added owner-visible category distinction on top of current shared card shapes. |
| Resolve staff/account/billing wording. | Accepted | Server path now says handoff/status/guarded-adapter only; no billing/account/platform mutation through menu pipeline. |
| Add MenuList-surface-only publish wording. | Accepted | Added invariant that `menu_publish` is MenuList-controlled surfaces only unless a real external adapter exists. |
| Strengthen rollback wording. | Accepted | Receipts must not show rollback available unless reverse patch and registered rollback support exist. |
| Add action readiness contract. | Accepted | Added ten-point executable gate; checklist presence alone is not executable support. |
| Update QA focus. | Accepted | Added clarification, Work On multi-select, wide-scope, stale-card, and confirmed-writes-disabled checks. |

## Updated Files

- `__docs__/ai-menu-manager/ai-menu-manager_technical-team-flow.md`
- `__docs__/ai-menu-manager/ai-menu-manager_validation.md`
- `src/lib/ai-menu-manager/patchPolicy.ts`
- `src/database/aiMenuManager/index.ts`
- `src/database/aiMenuManager/server.ts`
- `scripts/verification/verify-ai-menu-manager.js`

## Safe Current Claim

AMM has a verified deterministic core for selected-project daily menu operations, bounded context answers, local export cards, and unsupported external handling. The broader action checklist remains the expansion map, not a live execution claim.
