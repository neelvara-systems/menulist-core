# AI Menu Manager - Implementation Validation

**Status:** Initial implementation validated; production audit hardening applied
**Audience:** Engineering / QA
**Last Updated:** July 10, 2026

---

## Implemented Scope

This implementation establishes the AMM foundation as a standalone MenuList feature:

- feature flags and database collection constants.
- protected AMM API routes for server-backed/fallback command intake, inbox/session load, proposal approval, and proposal completion.
- client DAL compact-session path for normal deterministic selected-project cards.
- action type registry with approval policy and readiness metadata.
- deterministic resolver for price, selected-item bulk price, selected-item availability/visibility, category-scoped updates, special note, design mood, today-special, image-task, and unsupported external commands.
- guarded deterministic-first Gemini planner for unresolved in-domain language. The planner receives capped selected-menu context, returns read/prepare outcomes only, and cannot read/write project/session/proposal truth.
- planner prepare intents are materialized with structured selected entity IDs and must be reproduced by the registered deterministic resolver before a proposal card is created.
- empty-state starter cards that draft daily operations such as store closed today, working-hours changes, and sold-out/time-slot prompts without submitting.
- composer Work on context picker for item, category, menu design, digital menu, official page, digital screens, feedback, and store settings.
- one `+` composer tool entry for Work on and Suggestions on desktop and mobile.
- compact manager replies and receipts in the main conversation timeline, with receipt timeline state appended in the existing completion write.
- loaded-project menu status derived without an additional project read and reduced low-risk card policy copy.
- compact Firestore session repository, with proposal documents reserved for server-backed or durable-ledger adapters.
- desktop Menu Manager owner route under `/menu-manager`; public marketing remains `/ai-menu-manager`; legacy `/use-menulist/ai-menu-manager` redirects to `/menu-manager`.
- mobile Menu Manager screen inside `MobileShell` under the More tab.
- desktop and mobile browser-local copy/open/download card actions with URL admission, rejected Clipboard API fallback retry, and bounded local-action diagnostics.
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
| Planner route | `src/app/api/ai-menu-manager/plan/route.ts` |
| Planner context/revalidation | `src/lib/ai-menu-manager/modelRouter/plannerContext.ts` |
| Planner card mapping | `src/lib/ai-menu-manager/modelRouter/modelRouteCard.ts` |
| Conversation presentation | `src/lib/ai-menu-manager/presentation.ts` |
| Composer context picker | `src/lib/ai-menu-manager/composerContext.ts` |
| Context packet | `src/lib/ai-menu-manager/contextPacket.ts` |
| Patch apply/verify | `src/lib/ai-menu-manager/actions/projectPatches.ts` |
| Firestore repository | `src/database/aiMenuManager/server.ts` |
| Client DAL | `src/database/aiMenuManager/index.ts` |
| API routes | `src/app/api/ai-menu-manager/**/route.ts` |
| Firestore rules | `firestore.rules` |
| Desktop screen | `src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx` |
| Desktop local cards | `src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx` |
| Desktop route | `src/app/(main)/menu-manager/page.tsx` |
| Legacy redirect | `src/app/(main)/use-menulist/ai-menu-manager/page.tsx` |
| Mobile screen | `src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx` |
| Mobile local cards | `src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx` |
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
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json
```

Result on June 18, 2026:

- `npm run verify:ai-menu-manager` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.
- `npx next dev -p 3012` plus `curl -I http://localhost:3012/menu-manager` passed. `/menu-manager` compiled and returned `200`.
- Historical `ecomsai` deploy evidence from June 18, 2026 is retained as past validation only. Current Firestore rules evidence must use `firebase deploy --only firestore:rules --project menulist-qa --config firebase.json` first, then production only after QA evidence and explicit production approval.

Focused browser-local copy hardening result on June 30, 2026:

- `npm run verify:ai-menu-manager` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- AMM-scoped `git diff --check` passed.

Desktop/mobile owner-surface cross-check on July 10, 2026:

- `npm run verify:ai-menu-manager` passed.
- `npm run verify:mobile-shell-route-map` passed.
- `npm run verify:menu-design-presentation-boundary` passed.
- `npm run verify:owner-dashboard-today-boundary` passed.
- `npm run verify:menu-project-editor-boundary` passed.
- `npm run verify:dependency-freeze` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed with no warnings or errors.
- `git diff --check` passed.
- `/menu-manager` compiled successfully on the local Next.js server and produced no browser console warnings or errors. The available browser session was not authenticated and redirected to `/signin`, so this pass does not claim a logged-in visual or action-execution smoke.
- Desktop and mobile cards now use action-state-specific icons, bounded scope labels, blocked repeat taps during clarification, matching before/after presentation, and consistent primary-action ordering.
- The mobile first screen no longer shows redundant empty pending-card or receipt panels. Desktop and mobile use one concise approval trust line instead of three explanatory status chips.

Conversation/planner hardening cross-check on July 10, 2026:

- `npm run verify:ai-menu-manager` passed, including planner context caps, structured target preservation, deterministic action reproduction, selected-item Work on field coverage, unified composer tools, timeline receipts, and planner route admission checks.
- A July 10 follow-up review added verifier coverage that rejects empty planner numeric values instead of coercing them to zero, and prevents active answer/clarification/unsupported card messages from appearing twice in the conversation while preserving dismissed-card history.
- A second July 10 trust review removed `receipt_status` from the cloud planner schema, rejects unverified completion/internal implementation copy, requires read-only model outcomes to name a validated selected-context grounding target, canonicalizes grounded entity labels, validates every model clarification entity ID against selected context, and carries the validated ID through one-tap clarification on both desktop and MobileShell. This added no Firestore call or provider call.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed with no warnings or errors.
- `npm run verify:mobile-shell-route-map` passed.
- `npm run verify:menu-design-presentation-boundary` passed.
- `npm run verify:owner-dashboard-today-boundary` passed.
- `npm run verify:menu-project-editor-boundary` passed.
- `npm run verify:dependency-freeze` passed.
- `npm run verify:doc-npm-scripts` passed.
- `npm run docs:check-links` passed with 0 broken links and 0 naming violations.
- `git diff --check` passed.
- Local `/menu-manager` and `/api/ai-menu-manager/plan` compiled on Next.js 14.2.35. An unauthenticated planner POST returned `401` before provider work, as required.
- The available in-app and Chrome tabs were not authenticated. This pass therefore does not claim a signed-in visual owner flow or a live Gemini provider result.

---

## Cost Check

Firestore cost posture remains aligned with the AMM Firebase doc:

- No per-token or provider-chunk writes.
- Session doc is one compact daily/project doc with capped arrays.
- Normal deterministic selected-project cards stay in the compact session doc as capped pending operations; they do not create proposal docs.
- Proposal docs are written only for server-backed cards that need provider secrets, import/upload jobs, external policy, or durable ledger detail.
- Inbox loads one current selected-project session doc. Proposal detail docs load only when a compact summary points to server-backed durable detail.
- Approved project mutations reuse `updateProjectWithoutLoader()` so existing cache invalidation, MCE/MOL hooks, and outlet save behavior remain in the current project mutation path.
- Desktop and mobile approval flows require `assertProjectUpdateSucceeded()` before local project state changes or executed receipts, so fallback-array project write failures become failed project-update outcomes. If AMM cannot mark that card/proposal as failed, the secondary completion failure logs bounded desktop/mobile runtime diagnostics instead of disappearing.
- Completion/cancel uses the already-loaded compact session snapshot to remove the pending card and write the receipt with one session write. The project write itself stays on the existing `updateProjectWithoutLoader()` path.
- Idempotent retries return existing cards/receipts and do not duplicate compact messages, counters, pending summaries, or execution receipts.
- Approval revalidates the current selected-project base hash before issuing a directive.
- Command submit reuses the already-loaded session snapshot in the open AMM screen and performs one compact-session write for normal deterministic cards.
- Exact commands, known diagnostics, local exports, unsupported external requests, and out-of-scope questions resolve before the planner and add no provider cost.
- An unresolved in-domain planner request sends at most 32 relevant items, 18 categories, and 5 pending-card summaries. The planner route adds no selected-project/session/proposal read or write; when cost protection is enabled it uses one SAFE_MODE read, one bounded provider call, and one existing AI operation accounting write after a valid result.
- Planner requests retain bounded native-language aliases, attach target/value guidance for exactly the current executable action list, and constrain provider responses with the SDK structured response schema before Zod and deterministic re-resolution.
- A planner-assisted card still uses the same single compact-session command write as deterministic routing. Completion appends its receipt timeline entry in the existing one compact-session completion write.

Firestore rules now allow tenant/store-scoped client DAL access to compact `aiMenuManagerSessions` and keep direct client reads/writes blocked for `aiMenuManagerProposals` and `aiMenuManagerRules`. No Firestore indexes, Storage rules, or Cloud Functions were changed in this implementation.

---

## Current Execution Boundary

Executable client project mutation cards:

- `item_price_update`
- `item_name_update`
- `item_description_update`
- `item_category_update`
- `item_availability_update`
- `item_visibility_update`
- `item_bestseller_update`
- `item_prep_time_update`
- `category_name_update`
- `category_visibility_update`
- `decision_blocks_update`
- `menu_special_note_update`
- `menu_design_mood_update`
- `menu_design_layout_update`
- `menu_design_preset_apply`
- `menu_design_color_update`
- `menu_design_visibility_update`
- `bulk_price_update`
- `bulk_availability_update`

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

- Complete an authenticated desktop and MobileShell owner smoke for one deterministic action and one unresolved in-domain planner action, including provider failure fallback and console/network review.
- Connect image generation cards to the existing image generation job flow behind `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS`.
- Connect menu import/upload/link cards to existing extraction/import review APIs.
- Connect publish cards to the existing publish/share flow.
- Add merged bulk patch execution for bulk price and availability cards.
- Add durable adapter-specific undo only where before/after state supports reversal.
- Connect create-item/today-special cards before demoing "Add today special Rajma Chawal 129" as an executable live-menu change.

---

## Technical Flow Feedback Alignment - June 27, 2026

External ChatGPT feedback on `ai-menu-manager_technical-team-flow.md` was validated against current code and accepted where it clarified real implementation boundaries.

Applied doc clarifications:

- AMM is now described as a bounded conversational operations agent: conversation is flexible, execution is registered.
- Router outcomes are explicit: answer, diagnostic, recommendation, clarification, proposal, local export, manual handoff, unsupported, and receipt/status.
- Structured `composerContext.target` and `composerContext.selectedEntityIds` are documented as execution scope. Text prefixing is owner-readable context only.
- Clarification choices are documented as safe: current UI submits the selected answer, replaces the clarification, and creates the next card without approving, executing, publishing, or mutating truth.
- Patch safety now requires and enforces declarative, action-scoped patches with base-hash and patch-hash agreement.
- Server-backed routes are documented as a fallback/future adapter lane that cannot execute checklist-only, blocked, manual-only, or `needs_adapter_glue` actions.
- Rule, image, and voice flags are clarified so they cannot be read as broad execution permission.
- Local export, manual handoff, and unsupported external outcomes are separated in owner-visible terms.
- Publish copy is limited to MenuList-controlled surfaces unless a real external adapter exists.
- Rollback wording is conditional on a stored reverse patch and registered rollback support.
- The action readiness contract now states checklist presence alone never makes an action executable.

Validated qualifications:

- Clarification tap-to-next-card is now current runtime for clarification cards only. Starter cards, suggestion sheets, read-only answer suggested replies, and card Edit remain draft-first.
- Local export is still represented by the shared `manual_task` card shape in code, with `localActions` distinguishing copy/open/download actions.
- Staff/account/billing-adjacent AMM routes are allowed only for handoff/status/future guarded adapters, not direct billing/account/platform mutation through the menu operation pipeline.

Code hardening added:

- `src/lib/ai-menu-manager/patchPolicy.ts` defines action-scoped patch allowlists.
- Client execution directives validate stored patches through `assertAiMenuManagerPatchAllowedForAction()`.
- Server-backed approval directives validate the same patch/action contract before issuing execution directives.
- `scripts/verification/verify-ai-menu-manager.js` now checks that the patch policy exists and is used by both client and server approval lanes.
- Desktop and mobile Menu Manager screens now show fixed owner-safe failure copy for load, prompt, apply, project-update, and cancel failures while logging coded runtime diagnostics.
- `scripts/verification/verify-ai-menu-manager.js` now fails if desktop/mobile Menu Manager UI surfaces raw `error?.message`/`error.message` text or persists raw project-update failure text.

Audit record:

- `__docs__/ai-menu-manager/_archive/ai-menu-manager_technical-team-flow-feedback-audit-2026-06-27.md`

---

## Doc Feedback Alignment - June 27, 2026 Round 2

External feedback on the updated AMM docs was validated against the current registry, model-router scaffold, patch policy, compact-session flow, and website/marketing claim boundaries.

Applied doc-only cleanup:

- active AMM docs now carry June 27, 2026 metadata.
- Today Special wording now separates single-item `item_create` from scheduled-menu `special_menu_create`.
- Business Health signal examples now use canonical action IDs such as `menu_missing_photo_task`.
- product spec separates local export, manual handoff, and unsupported outcomes.
- implementation doc formalizes the future model provider contract: compact context in, router outcome out, read/prepare tools only, no write/execute/publish/delete/external-post tools.
- test cases now cover first-screen context, diagnostics, recommendations, follow-up edits, one-tap clarification, owner-copy quality, and public claim guardrails.
- website and marketing docs now state that launch copy must not claim checklist-only actions, direct external posting, rule execution, universal rollback, full voice execution, or provider-backed image/import/publish execution unless separately verified.

Audit record:

- `__docs__/ai-menu-manager/_archive/ai-menu-manager_doc-feedback-audit-2026-06-27-round-2.md`

---

## Runtime Response Diagnostics - June 29, 2026

The AMM client DAL response sweep found the shared fallback API reader still used `response.json().catch(() => ({}))`. Malformed or oversized command, inbox, proposal-action, or completion responses could collapse into a generic downstream failure without stable parse evidence.

Applied hardening:

- `src/database/aiMenuManager/index.ts` now reads shared AMM API responses through `readJsonResponseWithLimit()` with a 64KB cap.
- Malformed, oversized, or empty successful responses log `ai_menu_manager_response_parse_failed` with bounded phase/status metadata only.
- Non-OK responses still keep fixed local failure text, HTTP status, and bounded `code` only; raw response message/error text and raw payloads are not propagated.
- `scripts/verification/verify-ai-menu-manager.js` now guards the byte cap, parser helper, stable diagnostic, fixed parse failure codes, and removal of the old silent JSON fallback.

Scope boundary:

- This is owner-runtime response-parsing hardening only. It changes no valid AMM command/inbox/proposal/completion behavior, Firestore reads/writes/deletes, project update execution, public cache invalidation, API route auth/rate limits, rules, indexes, Cloud Functions, Firebase deployment, or Vercel deployment.

---

## Compound Conversation And Grounding - July 10, 2026

Validated runtime additions:

- deterministic compound commands prepare at most four independent, non-overlapping registered project proposals.
- connector-aware partitioning preserves entity names such as `Fish and chips`.
- desktop and MobileShell expose grouped approval while retaining individual review/cancel controls.
- grouped approval performs one existing project save and one compact session completion write.
- immediate duplicate command fingerprints reuse loaded pending cards with no additional write or planner call.
- `Restore <item>` distinguishes sold-out, hidden, and both-off states instead of always choosing visibility.
- accepted cloud answer/diagnostic/recommendation cards retain validated entity refs and show owner-visible grounding labels.
- aggregate route-quality counters reuse the existing compact command write and store no raw provider payload or per-event documents.

Verification is owned by `npm run verify:ai-menu-manager`, TypeScript, lint, and desktop/mobile runtime smoke checks.
