# AI Menu Manager - Implementation Validation

**Status:** Initial implementation validated; production audit hardening applied
**Audience:** Engineering / QA
**Last Updated:** June 20, 2026

---

## Implemented Scope

This implementation establishes the AMM foundation as a standalone MenuList feature:

- feature flags and database collection constants.
- protected AMM API routes for server-backed/fallback command intake, inbox/session load, proposal approval, and proposal completion.
- client DAL compact-session path for normal deterministic selected-project cards.
- action type registry with approval policy and readiness metadata.
- deterministic resolver for price, selected-item bulk price, selected-item availability/visibility, category-scoped updates, special note, design mood, today-special, image-task, and unsupported external commands.
- empty-state starter cards that draft daily operations such as store closed today, working-hours changes, and sold-out/time-slot prompts without submitting.
- composer Work on context picker for item, category, menu design, digital menu, official page, digital screens, feedback, and store settings.
- compact Firestore session repository, with proposal documents reserved for server-backed or durable-ledger adapters.
- desktop Menu Manager owner route under `/menu-manager`; public marketing remains `/ai-menu-manager`; legacy `/use-menulist/ai-menu-manager` redirects to `/menu-manager`.
- mobile Menu Manager screen inside `MobileShell` under the More tab.
- client project patch execution through existing `updateProjectWithoutLoader()` and compact-session completion verification.
- production hardening for adapter metadata, selected project/action scope verification, stale-card conflict checks, idempotent retry no-ops, generic validation errors, and manual-task receipts.
- static verifier script: `npm run verify:ai-menu-manager`.

Owner-facing UI name is **Menu Manager**. Internal files and docs keep `ai-menu-manager` / AMM.

---

## Evidence

| Area | Evidence |
| --- | --- |
| Feature flags | `src/config/features.ts` |
| Collections | `src/constants/database.ts` |
| Shared types | `src/types/aiMenuManager.ts` |
| Action registry | `src/lib/ai-menu-manager/actionTypes.ts`, `src/lib/ai-menu-manager/actionRegistry.ts` |
| Approval policy | `src/lib/ai-menu-manager/approvalPolicy.ts` |
| Command resolver | `src/lib/ai-menu-manager/commandResolver.ts` |
| Composer context picker | `src/lib/ai-menu-manager/composerContext.ts` |
| Context packet | `src/lib/ai-menu-manager/contextPacket.ts` |
| Patch apply/verify | `src/lib/ai-menu-manager/actions/projectPatches.ts` |
| Firestore repository | `src/database/aiMenuManager/server.ts` |
| Client DAL | `src/database/aiMenuManager/index.ts` |
| API routes | `src/app/api/ai-menu-manager/**/route.ts` |
| Firestore rules | `firestore.rules` |
| Desktop screen | `src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx` |
| Desktop route | `src/app/(main)/menu-manager/page.tsx` |
| Legacy redirect | `src/app/(main)/use-menulist/ai-menu-manager/page.tsx` |
| Mobile screen | `src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx` |
| Mobile shell mapping | `src/components/mobile/MobileShell.tsx`, `src/components/mobile/screens/MobileMoreScreen.tsx` |
| Navigation | `src/constants/navigations.ts`, `src/components/organisms/sidebar/index.tsx`, `src/components/organisms/sidebar/horizontalSidebar.tsx` |
| Permissions | `src/lib/permissions/permissionRequirements.ts` |
| Verifier | `scripts/verification/verify-ai-menu-manager.js` |

---

## Validation Commands

```bash
npm run verify:ai-menu-manager
npx tsc --noEmit --incremental false --pretty false
npm run lint
git diff --check
npx next dev -p 3012
curl -I http://localhost:3012/menu-manager
firebase deploy --only firestore:rules --project ecomsai
```

Result on June 18, 2026:

- `npm run verify:ai-menu-manager` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.
- `npx next dev -p 3012` plus `curl -I http://localhost:3012/menu-manager` passed. `/menu-manager` compiled and returned `200`.
- `firebase deploy --only firestore:rules --project ecomsai` passed. Firebase reported `firestore.rules` was already up to date and released the rules.

---

## Cost Check

Firestore cost posture remains aligned with the AMM Firebase doc:

- No per-token or provider-chunk writes.
- Session doc is one compact daily/project doc with capped arrays.
- Normal deterministic selected-project cards stay in the compact session doc as capped pending operations; they do not create proposal docs.
- Proposal docs are written only for server-backed cards that need provider secrets, import/upload jobs, external policy, or durable ledger detail.
- Inbox loads one current selected-project session doc. Proposal detail docs load only when a compact summary points to server-backed durable detail.
- Approved project mutations reuse `updateProjectWithoutLoader()` so existing cache invalidation, MCE/MOL hooks, and outlet save behavior remain in the current project mutation path.
- Completion/cancel uses the already-loaded compact session snapshot to remove the pending card and write the receipt with one session write. The project write itself stays on the existing `updateProjectWithoutLoader()` path.
- Idempotent retries return existing cards/receipts and do not duplicate compact messages, counters, pending summaries, or execution receipts.
- Approval revalidates the current selected-project base hash before issuing a directive.
- Command submit reuses the already-loaded session snapshot in the open AMM screen and performs one compact-session write for normal deterministic cards.

Firestore rules now allow tenant/store-scoped client DAL access to compact `aiMenuManagerSessions` and keep direct client reads/writes blocked for `aiMenuManagerProposals` and `aiMenuManagerRules`. No Firestore indexes, Storage rules, or Cloud Functions were changed in this implementation.

---

## Current Execution Boundary

Executable client project mutation cards:

- `item_price_update`
- `item_availability_update`
- `item_visibility_update`
- `menu_special_note_update`
- `menu_design_mood_update`
- `menu_design_layout_update`
- `menu_design_preset_apply`
- `menu_design_color_update`
- `menu_design_visibility_update`

Execution is additionally gated by `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES`. With this flag off, AMM can prepare cards but cannot apply approved writes.

Registry/manual/existing-flow cards are present for broader day-one product positioning, but they do not silently mutate menu truth until their adapters are connected.

---

## Post-Feedback Maturity Check - June 20, 2026

External ChatGPT feedback was validated against the codebase and current AMM docs. The feedback was accurate that AMM is a verified foundation, registry, UI/control layer, and compact-session implementation, not a fully mature autonomous agent with every adapter, rollback path, rules engine, image/import flow, and long-term memory complete.

Decision:

- keep the current product boundary: action registry, proposal cards, approvals, existing MenuList paths, receipts.
- keep read-only selected-menu answers through `system_context_answer`.
- keep generic questions and unsupported external posting out of scope.
- keep `ready_adapter`, `needs_adapter_glue`, `manual_task_only`, and `blocked` as production readiness states.
- do not market unfinished adapter families as completed direct execution.

Claim fix applied:

- public website metadata, locale strings, and AMM website/marketing docs now describe today-special/new item work as draft/review card behavior unless the create-item adapter is connected.
- broad website language now says supported changes go live after approval, so image/import/publish/rule/rollback families are not overclaimed while still visible as card-governed action families.

---

## Open Implementation Follow-Ups

- Connect image generation cards to the existing image generation job flow behind `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS`.
- Connect menu import/upload/link cards to existing extraction/import review APIs.
- Connect publish cards to the existing publish/share flow.
- Add merged bulk patch execution for bulk price and availability cards.
- Add durable adapter-specific undo only where before/after state supports reversal.
- Connect create-item/today-special cards before demoing "Add today special Rajma Chawal 129" as an executable live-menu change.
