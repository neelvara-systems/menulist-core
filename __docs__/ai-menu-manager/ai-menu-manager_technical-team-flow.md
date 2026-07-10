# AI Menu Manager - Technical Team Flow

> **Audience:** Engineering, QA, implementation reviewers
> **Feature:** AI Menu Manager / Menu Manager
> **Owner UI route:** `/menu-manager`
> **Legacy route:** `/use-menulist/ai-menu-manager` redirects to `/menu-manager`
> **Last updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This handoff records source-gated deterministic routing, guarded cloud-planner, registered-adapter, approval, desktop/mobile, and compact-session behavior only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:ai-menu-manager`, `npm run verify:ai-accounting`, authenticated desktop/mobile Menu Manager QA, deterministic-command and approval/cancel/receipt regression evidence, supported-adapter smoke behind AMM feature flags, guarded cloud-planner provider smoke in the target environment, public website/help copy review, target Firebase deploy evidence where rules or indexes change, target Vercel deploy evidence where planner/app routes or clients change, and production-host smoke.

---

## 1. One-Line Contract

AI Menu Manager is a controlled MenuList operation layer:

```text
Owner intent
  -> selected store/project context
  -> registered action or bounded answer
  -> proposal/local/answer/unsupported card
  -> approval when needed
  -> existing MenuList operation path
  -> compact receipt
```

It is not a generic chatbot, not a second menu database, and not a hidden AI write path.
It is a bounded conversational operations agent for MenuList: conversation is flexible, but execution is registered.

Owners can ask or tell MenuList anything inside the menu/public-operations domain, but any truth-changing work must resolve to a registered action and approval policy.

### Router Outcomes

Every owner message must resolve to exactly one primary outcome.

| Outcome | Current card shape | Meaning | Can mutate truth? |
| --- | --- | --- | --- |
| `answer` | `answer` | Read-only selected-context answer. | No. |
| `diagnostic` | `answer` | Read-only explanation of selected project/menu/public state. | No. |
| `recommendation` | `answer` with suggested replies | Bounded next-step suggestion that may draft a command. | No. |
| `clarification` | `clarification` | Needs owner choice or clearer entity/scope before a proposal. | No. |
| `proposal` | `proposal` | Preview for a supported registered operation. | Only after approval when policy allows. |
| `local_export` | `manual_task` with `localActions` | Copy/open/download action owned by browser/MenuList. | No menu truth mutation. |
| `manual_handoff` | `manual_task` without local export controls | Opens or guides an existing MenuList manual flow. | No direct AMM mutation. |
| `unsupported` | `unsupported` | External, out-of-scope, or blocked request. | No. |
| `receipt/status` | `receipt` / receipt summary | Completion or status summary. | No. |

Only `proposal` cards with executable registered action types can mutate MenuList truth.

### Long-Term Conversation Stack

The product goal is ChatGPT-level smoothness for menu operations, but with MenuList authority:

```text
deterministic router first
  -> guarded cloud planner only when unresolved
  -> optional local assist provider remains disabled
  -> MenuList validator/card builder
  -> owner approval when needed
  -> existing MenuList execution path
```

The current path remains deterministic and DAL-first. Exact operations, local exports, known diagnostics, external-platform boundaries, and out-of-scope questions do not call a model. Only an unresolved in-domain message may call the guarded Gemini planner. Provider output is never authority. MenuList still validates action type, entity IDs, selected store/project, approval policy, patch whitelist, feature flags, and stale base hash.

Models may use only read/prepare tools such as `search_menu_items`, `get_selected_menu_status`, `prepare_price_update_card`, `prepare_design_card`, `prepare_local_export_card`, and `prepare_unsupported_card`. They must not call `updateProject()`, write Firestore, publish, post externally, execute rules, or complete cards.

---

## 2. What Was Built

AMM is implemented as a chat-style owner work surface with operation cards. The owner can type, use guided suggestions, or set a "Work on" context such as item, category, menu design, feedback, digital menu, digital screens, official page, or store settings.

The important behavior is:

- Typed text and suggestion text go through the same resolver.
- Suggestion clicks only place a command in the composer. They do not execute.
- Clarification choices are different from starter/suggestion chips: they may submit the selected clarification answer and replace the clarification with the next card in the same compact session write.
- "Work on" only scopes the next message. It does not execute.
- Every real change must resolve to a registered action type.
- Risky changes produce a preview card and require owner approval.
- Approved project/menu changes reuse the existing project DAL path.
- Browser-local actions such as copy link or download QR do not create live menu writes.
- Unsupported external requests produce unsupported cards, not fake completion states.
- Compact manager replies and receipts appear in the same conversation timeline. Completion appends its receipt entry in the existing compact-session completion write.
- Desktop and mobile expose one `+` composer tool entry for Work on and Suggestions rather than competing permanent controls.
- A concise menu-status line is derived from the already loaded project; it adds no read.

---

## 3. Product Boundaries

AMM can:

- prepare price, availability, visibility, item text, category text, featured section, note, and design cards for the selected project.
- answer bounded MenuList-domain questions from the loaded selected project context.
- create local export cards for menu links, QR, feedback links, customer app links, digital screen links, and POS setup text.
- guide owners toward existing manual flows for areas that are not executable yet.

AMM cannot:

- answer live weather, news, sports, market, or general web questions.
- post directly to Zomato, Swiggy, Instagram, Facebook, Google Business Profile, or external review systems.
- mutate staff, billing, platform, reseller, or account surfaces through the menu operation pipeline.
- create or maintain a second "menu graph" or duplicate menu source of truth.
- reuse Business Health action state as execution truth.

---

## 4. Current File Map

### Routes

| Surface | File | Role |
| --- | --- | --- |
| Owner route | [`src/app/(main)/menu-manager/page.tsx`](<../../src/app/(main)/menu-manager/page.tsx>) | Primary authenticated AMM page. Feature-flag guarded. |
| Legacy redirect | [`src/app/(main)/use-menulist/ai-menu-manager/page.tsx`](<../../src/app/(main)/use-menulist/ai-menu-manager/page.tsx>) | Redirects old path to `/menu-manager`. |
| Website page | [`src/app/(website)/ai-menu-manager/page.tsx`](<../../src/app/(website)/ai-menu-manager/page.tsx>) | Public marketing page. Not owner runtime. |
| Planner API | [`src/app/api/ai-menu-manager/plan/route.ts`](../../src/app/api/ai-menu-manager/plan/route.ts) | Guarded unresolved-language planner. Returns read/prepare router outcomes only and does not read or write menu/session truth. |
| Command API fallback | [`src/app/api/ai-menu-manager/command/route.ts`](../../src/app/api/ai-menu-manager/command/route.ts) | Server fallback for cases without client project context and future server-backed adapters. |
| Inbox API fallback | [`src/app/api/ai-menu-manager/inbox/route.ts`](../../src/app/api/ai-menu-manager/inbox/route.ts) | Server-backed inbox path. |
| Proposal action API | [`src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts`](../../src/app/api/ai-menu-manager/proposals/[proposalId]/actions/route.ts) | Server-backed proposal approval/cancel path. |
| Proposal completion API | [`src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts`](../../src/app/api/ai-menu-manager/proposals/[proposalId]/complete/route.ts) | Server-backed completion receipt path. |
| Session API | [`src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts`](../../src/app/api/ai-menu-manager/sessions/[sessionId]/route.ts) | Server-backed session path. |

### Core Library

| Area | File | Role |
| --- | --- | --- |
| Types | [`src/types/aiMenuManager.ts`](../../src/types/aiMenuManager.ts) | Action, card, proposal, receipt, patch, session, and local-action contracts. |
| Action catalog | [`src/lib/ai-menu-manager/actionTypes.ts`](../../src/lib/ai-menu-manager/actionTypes.ts) | Registry definitions, executable list, and item/category field coverage. |
| Registry access | [`src/lib/ai-menu-manager/actionRegistry.ts`](../../src/lib/ai-menu-manager/actionRegistry.ts) | Looks up definitions and applies feature-flag gates. |
| Resolver | [`src/lib/ai-menu-manager/commandResolver.ts`](../../src/lib/ai-menu-manager/commandResolver.ts) | Converts owner text plus selected context into a card and optional patch. |
| Domain answers | [`src/lib/ai-menu-manager/domainConversationRouter.ts`](../../src/lib/ai-menu-manager/domainConversationRouter.ts) | Read-only selected-menu answers, diagnostics, and recommendations for menu health, QR/public freshness, print freshness, item/category status, promotion suggestions, and customer price concerns. No provider calls. |
| Model-router contract | [`src/lib/ai-menu-manager/modelRouter/routerOutcomeSchema.ts`](../../src/lib/ai-menu-manager/modelRouter/routerOutcomeSchema.ts) | Provider-safe router outcomes and read/prepare-only tool names. |
| Planner action contracts | [`src/lib/ai-menu-manager/modelRouter/plannerActionContracts.ts`](../../src/lib/ai-menu-manager/modelRouter/plannerActionContracts.ts) | Compact target/value guidance for the current executable list and the SDK structured response schema. This is provider metadata, not a second action catalog. |
| Planner context | [`src/lib/ai-menu-manager/modelRouter/plannerContext.ts`](../../src/lib/ai-menu-manager/modelRouter/plannerContext.ts) | Builds capped context, validates entity IDs, materializes prepare intents, and requires deterministic action compatibility. |
| Planner cards | [`src/lib/ai-menu-manager/modelRouter/modelRouteCard.ts`](../../src/lib/ai-menu-manager/modelRouter/modelRouteCard.ts) | Builds MenuList-owned read-only, clarification, recommendation, and unsupported cards from validated outcomes. |
| Presentation helpers | [`src/lib/ai-menu-manager/presentation.ts`](../../src/lib/ai-menu-manager/presentation.ts) | Builds the compact owner/manager/receipt timeline, loaded-project status, and high-risk policy-detail visibility. |
| Context packet | [`src/lib/ai-menu-manager/contextPacket.ts`](../../src/lib/ai-menu-manager/contextPacket.ts) | Builds selected project/store context from existing project truth, including short token aliases and candidate helpers for ambiguous item/category clarification. |
| Composer context | [`src/lib/ai-menu-manager/composerContext.ts`](../../src/lib/ai-menu-manager/composerContext.ts) | "Work on" target/entity selection and prompt prefixing. |
| Suggestions | [`src/lib/ai-menu-manager/projectPromptHints.ts`](../../src/lib/ai-menu-manager/projectPromptHints.ts) | Loaded-menu attention cards, contextual starter suggestions, and grouped suggestion sheets. |
| Cards | [`src/lib/ai-menu-manager/cardBuilder.ts`](../../src/lib/ai-menu-manager/cardBuilder.ts) | Builds proposal, clarification, answer, manual, local export, and unsupported cards. |
| Approval policy | [`src/lib/ai-menu-manager/approvalPolicy.ts`](../../src/lib/ai-menu-manager/approvalPolicy.ts) | Maps registry risk/approval level to owner approval behavior. |
| Receipts | [`src/lib/ai-menu-manager/receiptBuilder.ts`](../../src/lib/ai-menu-manager/receiptBuilder.ts) | Builds compact receipts after execution/manual completion/failure. |
| Idempotency | [`src/lib/ai-menu-manager/idempotency.ts`](../../src/lib/ai-menu-manager/idempotency.ts) | Session IDs, proposal IDs, execution IDs, stable hashes. |
| Patch policy | [`src/lib/ai-menu-manager/patchPolicy.ts`](../../src/lib/ai-menu-manager/patchPolicy.ts) | Validates action-scoped patch shape and patch hash before execution directives. |
| Project patching | [`src/lib/ai-menu-manager/actions/projectPatches.ts`](../../src/lib/ai-menu-manager/actions/projectPatches.ts) | Applies approved patches to cloned project data before existing project save. |
| Local exports | [`src/lib/ai-menu-manager/localExportUrls.ts`](../../src/lib/ai-menu-manager/localExportUrls.ts) | Menu, feedback, customer app, digital screen, POS copy/download URLs. |

### Data Layer

| Area | File | Role |
| --- | --- | --- |
| Client DAL | [`src/database/aiMenuManager/index.ts`](../../src/database/aiMenuManager/index.ts) | Primary deterministic flow: compact session read/write, command submit, directive build, completion, cancel. |
| Server DAL | [`src/database/aiMenuManager/server.ts`](../../src/database/aiMenuManager/server.ts) | Server-backed fallback: proposal docs, auth-scoped project reads, server receipt flow. |
| Collections | [`src/constants/database.ts`](../../src/constants/database.ts) | Defines `aiMenuManagerSessions`, `aiMenuManagerProposals`, `aiMenuManagerRules`. |
| Feature flags | [`src/config/features.ts`](../../src/config/features.ts) | AMM kill switches and storage mode. |

### UI

| Surface | File | Role |
| --- | --- | --- |
| Desktop route | [`src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx`](../../src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx) | Desktop chat frame, project selector, suggestions, work-on context, pending cards, receipts. |
| Desktop cards | [`src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx`](../../src/components/templates/main-app/aiMenuManager/cards/AiMenuProposalCard.tsx) | Desktop card rendering and local-action controls. |
| Mobile screen | [`src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx`](../../src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx) | Mobile AMM screen using the same DAL/resolver/card flow. |
| Mobile card stack | [`src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx`](../../src/components/mobile/ai-menu-manager/MobileAiMenuCardStack.tsx) | Mobile card rendering. |
| Mobile shell | [`src/components/mobile/MobileShell.tsx`](../../src/components/mobile/MobileShell.tsx) | Owns bottom tab and shell-safe `/menu-manager` mobile routing. |

---

## 5. Source Of Truth Mapping

AMM does not create new operational truth.

| MenuList truth | Used by AMM as |
| --- | --- |
| `Project.files[].extractedData.data.items` | Menu item names, prices, availability, visibility, descriptions, bestseller, duration. |
| `Project.files[].extractedData.data.categories` | Category names, visibility, icons, time slots. |
| `Project.menuSettings` | Notes, decision blocks, featured/popular sections, display-level menu settings. |
| `Project.config.design` | Presentation tone, layout, colors, display options, design presets. |
| Existing project DAL `updateProject()` behavior | Final project/menu save path after card approval. |
| Existing public cache behavior | Public menu freshness after approved project save. |
| Existing import/image/publish APIs | Future or server-backed cards, not parallel AMM-specific providers. |

The conceptual rule is:

```text
AMM card data is operational intent.
Project/store/outlet documents remain operational truth.
```

---

## 6. Runtime Flow: Deterministic Client Path

This is the normal path for selected-project actions such as price, availability, visibility, note, featured section, and design.

### 6.1 Screen Load

Desktop:

1. `/menu-manager` renders `AiMenuManagerRoute`.
2. The route reads current store context from `PlatformGlobalDataContext`.
3. It loads project summaries through `getProjectsListWithoutLoader(true)`.
4. It loads the selected project through `getProjectDataWithoutLoader(projectId)`.
5. It loads today's compact AMM session through `getAiMenuManagerClientInbox()`.
6. It renders the selected project with shared `ProjectSelectorTrigger`.

Mobile:

1. `MobileShell` exposes the `aiMenuManager` tab when AMM mobile flags are enabled.
2. `MobileAiMenuManagerScreen` uses `useMobileProjects()` for selected project and cached project data.
3. It loads the same compact inbox through `getAiMenuManagerClientInbox()`.
4. It renders the same card model through mobile-native components.

### 6.2 Owner Sends A Command

1. The UI builds the final command text.
2. If "Work on" context is selected, `buildAiMenuManagerComposerPrompt()` prefixes selected entity context:

```text
Selected items: Masala Tea, Cold coffee. increase price by 10
Selected category: Beverages. hide this category
Menu design: Use grid layout
Feedback: Copy feedback link
```

The prefix is owner-readable context only. Execution scope must come from the structured composer context passed alongside the text:

```ts
{
  target: 'item' | 'category' | 'menu_design' | 'digital_menu' | 'official_page' | 'digital_screens' | 'feedback' | 'store_settings',
  selectedEntityIds: ['item_or_category_id']
}
```

Resolver and patching code must use entity IDs from `composerContext` when present. Text-prefix parsing must not be the only source of execution scope.

3. `sendAiMenuManagerCommand()` receives the selected project object from the current screen.
4. Because project context exists, it uses the client DAL path.
5. `buildAiMenuManagerContextPacket()` extracts a compact context packet from the selected project.
6. `resolveAiMenuManagerCommand()` resolves the owner text plus structured composer context into:
   - `resolved.actionType`
   - card kind
   - entity refs
   - before/after summary
   - optional project patch
   - optional patch hash
7. If the deterministic resolver returns no result and model-router/cloud-planner flags are enabled, the client builds a provider packet capped to 32 relevant items, 18 relevant categories, and 5 pending-card summaries from the already loaded context. Bounded native-language aliases are retained so selected-menu entities remain discoverable. The planner route does not read the project again.
8. The server intersects the requested allowlist with `AI_MENU_MANAGER_EXECUTABLE_ACTIONS`, adds the matching compact target/value contracts, and requires the provider result to match an SDK structured response schema. `verify:ai-menu-manager` requires planner-contract coverage to equal the executable list exactly.
9. A read-only planned outcome is converted into a MenuList-owned card only when it includes at least one validated selected-context target. Item/category/project labels are replaced with canonical MenuList context labels. A planned `prepare_action` is materialized into an owner-readable command plus structured entity IDs and re-run through the deterministic resolver. It is accepted only when the registered resolved action is compatible with the planned action. The cloud planner cannot originate receipts or completion/status claims.
10. If the planner is unavailable, invalid, fabricates a target, exposes internal implementation copy, claims work is complete, or chooses an unsupported action, AMM keeps the deterministic clarification fallback.
11. The client DAL builds a deterministic operation ID from tenant, store, project, idempotency key, action type, and patch hash.
12. The operation is stored inside today's compact session doc.

No separate proposal doc is created for this deterministic path.

### 6.3 Card Is Shown

The pending operation contains the full card payload:

- proposal cards for executable changes.
- clarification cards when the target is ambiguous.
- answer cards for read-only MenuList-domain answers.
- local export cards for copy/open/download actions.
- manual cards for existing-flow handoffs.
- unsupported cards for blocked or external requests.

The same card payload is rendered by desktop and mobile.

Clarification choices are safe. Desktop and mobile card UIs submit the selected clarification answer plus its validated structured item/category ID, remove the old clarification from pending cards, and create the next answer/proposal/unsupported card in the same compact session write. They do not approve, execute, publish, persist menu truth, or create durable output without the normal card policy. Ambiguous item/category names such as "Sandwich 80" use loaded context candidates so AMM asks for the exact entity instead of guessing the first match or relying only on display-name parsing.

Loaded-menu attention cards, starter cards, and suggestion sheets remain draft-only. The first screen prioritizes actionable issues found in the already-loaded selected project, such as hidden categories, unavailable items, hidden items, missing prices, missing photos, or missing descriptions. If no attention issue is found, it falls back to high-frequency daily work such as temporary status, working hours, and availability. These cards fill the composer or open a second suggestion layer because they are discovery aids, not clarifications of an existing pending operation.

Short follow-up messages can update the one pending proposal without a separate cancel/write cycle. For example:

```text
Owner: Tea 20
AMM: Masala Tea Rs 15 -> Rs 20. Approve?
Owner: Actually 25
AMM: Masala Tea Rs 15 -> Rs 25. Approve?
```

The owner message is still stored as typed, but the DAL rewrites the resolver input from the loaded compact session context and replaces the previous pending card in the same session write.

Current safe follow-up rewrites cover one pending proposal for price, availability, item visibility, category visibility, menu note, and menu design/presentation cards. If there is no single matching pending proposal, AMM falls back to normal routing or clarification.

Compound deterministic messages are a separate safe path. The resolver may prepare up to four independent registered project proposals from one message only when every segment resolves without provider help and patch touch keys do not overlap. The resulting cards share a command group. Desktop and MobileShell may approve the group together; the client revalidates each patch and base hash, applies all patches to one clone, calls the existing project save once, then removes the group and appends receipts in one compact session write. A ten-second source fingerprint suppresses accidental immediate duplicate submission with zero additional Firebase/provider work.

### 6.4 Owner Approves

For `client_project_mutation` proposal cards:

1. UI finds the pending operation by `cardId`.
2. `buildAiMenuManagerClientExecutionDirective()` checks:
   - AMM is enabled.
   - confirmed writes are enabled.
   - operation is executable.
   - stored patch exists.
   - stored patch hash exists.
   - patch shape is allowed for the registered action type.
   - selected project hash still matches the card base hash.
3. `applyAiMenuManagerProjectPatch()` applies the stored patch to a cloned project object.
4. UI saves through `updateProjectWithoutLoader(patchedProject)`.
5. UI requires `assertProjectUpdateSucceeded()` before updating local project state.
6. `completeAiMenuManagerClientOperation()` removes the pending operation and appends both the capped receipt summary and receipt timeline entry in the same compact-session write.
7. Receipt appears in the UI.

### 6.5 Owner Cancels

Cancel uses `cancelAiMenuManagerClientOperation()`:

- verifies the operation still belongs to the selected compact session.
- removes the pending operation.
- does not mutate project truth.

### 6.6 Manual Done / Local Export Done

Manual handoff and local export cards do not mutate menu truth. Marking them done:

- removes the card from pending operations.
- adds a receipt explaining that no MenuList menu truth changed.
- is only an owner workflow marker.

Unsupported external cards are different: they should not show `Mark done` or imply an external task has been completed.

### 6.7 Patch Safety Contract

Client-project mutations use declarative stored patches, not arbitrary mutation functions.

Each executable action type owns the fields it may patch. The approval card, patch payload, patch hash, and base project hash must agree before execution.

Examples:

- `item_price_update` may patch only the resolved item price fields.
- `item_availability_update` may patch only availability fields.
- `item_visibility_update` may patch only visibility/active fields.
- `category_visibility_update` may patch only the resolved category visibility fields.
- `menu_design_color_update` may patch only approved `config.design` color fields.
- `bulk_price_update` may patch only the listed resolved item price fields.

If the selected project hash no longer matches the base hash, AMM must show a stale/conflict path and must not apply the patch silently. Patch hashes protect the approved payload; action-scoped patch validation protects the allowed mutation shape.

---

## 7. Server-Backed Path

The API routes remain available for server-backed cases, but they are not the default for deterministic selected-project cards. The planner route is a narrow exception: it may classify an unresolved message, but it cannot read/write menu/session truth or issue execution directives.

Use server-backed AMM routes only when needed for:

- provider/API work.
- import and extraction jobs.
- image generation or future media jobs that require server capacity/accounting.
- external integrations with real auth/policy.
- handoff, status, or exact guarded-adapter cards for staff/account/billing-adjacent surfaces.
- durable ledger behavior that cannot be safely enforced from the client DAL.
- cases where the selected project is not already loaded in the owner screen.

The server path uses:

- `withAuth`.
- `MANAGE_MENU` permission.
- request body caps.
- Zod schemas.
- rate limits.
- tenant/store/project scope checks.
- proposal docs in `aiMenuManagerProposals`.
- compact session summaries in `aiMenuManagerSessions`.

The server path is a fallback and future server-adapter lane, not the everyday deterministic card lane.

Server-backed proposal/action routes must validate action definition, readiness, execution mode, approval level, actor permission, tenant/store/project scope, and required feature flags before mutating or completing anything. A server route must not approve, execute, or complete a checklist-only, blocked, manual-only, or `needs_adapter_glue` action.

Staff, account, billing, platform, and reseller state must not be mutated through the menu operation pipeline. Any future staff access mutation requires a dedicated access-management adapter with explicit permission checks, product approval, and separate QA coverage.

---

## 8. Data Model And Cost Model

### Collections

| Collection | Current role |
| --- | --- |
| `aiMenuManagerSessions` | Primary compact daily/session state for loaded owner screen. |
| `aiMenuManagerProposals` | Reserved for server-backed/durable proposal cards. Not used for normal deterministic selected-project cards. |
| `aiMenuManagerRules` | Reserved for owner-approved deterministic rules. Rule execution is not the default path. |

### Compact Session Shape

The client DAL caps the growing arrays:

| Field | Cap | Purpose |
| --- | ---: | --- |
| `compactMessages` | 20 | Owner/manager timeline summaries. |
| `pendingCardSummaries` | 25 | Lightweight card summaries. |
| `pendingOperations` | 25 | Full pending deterministic operation payloads. |
| `recentReceiptSummaries` | 20 | Recent receipts. |
| `artifactRefs` | 20 | References only, not heavy payloads. |

Normal deterministic command overhead after screen open:

```text
Submit command:
  0 AMM reads
  1 compact session write

Clarification choice or short follow-up:
  0 AMM reads
  1 compact session write
  replaces the old pending card in the same write

Approve executed card:
  0 AMM reads
  1 existing project write through updateProject path
  1 compact session write for receipt
```

Planner-assisted unresolved command:

```text
  0 selected-project/session/proposal reads in the planner route
  0 selected-project/session/proposal writes in the planner route
  1 bounded provider call after rate limit, SAFE_MODE, permission, capacity, and Zod admission
  1 existing compact session command write after MenuList validation
```

Known deterministic commands and answers never call the planner. Receipt timeline rendering adds no write because the entry is appended during the existing completion write.

For two successful deterministic project operations:

```text
AMM overhead:
  0 proposal reads
  0 proposal writes
  4 compact session writes

Existing business write:
  2 project saves, same class of write as manual editing
```

Forbidden cost patterns:

- no Firestore write per token.
- no Firestore doc per chat message.
- no Firestore doc per card render.
- no base64 image or QR data in Firestore.
- no unbounded listener over old sessions.
- no opening-screen scan across all history.
- no standalone AMM mirror collections for menu truth.

---

## 9. Action Registry State

The registry has three different layers. Do not confuse them.

### 9.1 Product Checklist

[`ai-menu-manager_action-type-checklist.md`](./ai-menu-manager_action-type-checklist.md) is the long-term production checklist. It includes current, future, manual-only, server-backed, and blocked action families.

### 9.2 Code Registry

[`actionTypes.ts`](../../src/lib/ai-menu-manager/actionTypes.ts) defines the current action definitions. Each definition must declare:

- `actionType`
- `ownerLabel`
- `manualEquivalent`
- `executionMode`
- `approvalLevel`
- `risk`
- `costClass`
- `mobileBehavior`
- `sourceEvidence`
- `readiness`
- optional `requiredFlags`

### 9.3 Executable Client-Project List

Only the `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` list should be treated as current deterministic project mutation support.

Current executable actions:

```text
item_price_update
item_name_update
item_description_update
item_category_update
item_availability_update
item_visibility_update
item_bestseller_update
item_prep_time_update
category_name_update
category_visibility_update
decision_blocks_update
menu_special_note_update
menu_design_mood_update
menu_design_layout_update
menu_design_preset_apply
menu_design_visibility_update
menu_design_color_update
bulk_price_update
bulk_availability_update
```

Important:

- Field coverage arrays are audit coverage, not automatic execution support.
- Checklist-only rows are not shipped until they have registry definitions, resolver support, card tests, approval policy, patch/API path, mobile behavior, and verifier coverage.
- `needs_adapter_glue`, `manual_task_only`, and `blocked` actions must not silently execute.

---

## 10. Card Kinds

| Card kind | Meaning | Can mutate truth? |
| --- | --- | --- |
| `proposal` | Preview for a supported operation. | Only after approval. |
| `clarification` | Needs owner choice or clearer command. | No. |
| `answer` | Read-only MenuList-domain answer from selected context. | No. |
| `manual_task` | Handoff to existing UI/manual flow or local export completion marker. | No direct mutation from AMM. |
| `unsupported` | Blocked/out-of-scope/external request. | No. |
| `receipt` | Completion summary. | No. |

Owner-visible categories are stricter than the current shared card shape:

- Local export cards are `manual_task` cards with `localActions` such as copy/open/download.
- URL-bearing local actions must normalize through the shared AMM local-action URL helper before copy, browser open, or QR generation.
- Manual handoff cards are `manual_task` cards without external "done" claims.
- Unsupported external cards are `unsupported` cards and should not offer `Mark done`.

Risk rules:

- Price changes use `high_confirm`.
- Bulk changes use bulk-visible summaries with affected rows.
- Destructive actions must require explicit entity naming before they ever become executable.
- External unsupported actions are `unsupported`, not manual "done" cards.
- Rollback/undo can be shown only when reverse execution exists for that adapter.
- Receipts must not display "rollback available" unless the completed operation has a stored reverse patch and the action type is registered as rollback-supported.

---

## 11. Resolver Priority

The resolver intentionally checks local/export and exact operational routes before broader read-only answers.

High-level order:

1. Menu/share, official page, feedback, customer app, digital screen, and POS local exports.
2. Unsupported external destinations.
3. Selected item/category composer-context commands.
4. Publish/import/special menu/today special/image.
5. Featured section, special note, and explicit design actions.
6. Read-only MenuList-domain answers and diagnostics.
7. Existing mobile More/manual flow cards.
8. Bulk price and bulk availability.
9. Item/category text, category move, bestseller, prep time.
10. Availability, category visibility, item visibility, price.
11. General out-of-scope unsupported card.
12. Clarification fallback.

This order is important. Example:

```text
"Copy feedback link"
  -> feedback_link_share local export

"What should I fix today?"
  -> system_context_answer

"Why is my print menu wrong?"
  -> system_context_answer

"Cold coffee sold out"
  -> item_availability_update proposal

"What is today's weather?"
  -> system_unsupported_action
```

---

## 12. Desktop UI Flow

Desktop lives in `AiMenuManagerRoute`.

Primary zones:

- Header with title and selected project selector.
- Chat/composer frame.
- First-screen cards that prioritize loaded-menu attention issues, then high-frequency daily work.
- `Work on` context picker.
- `Suggestions` grouped sheet with second-level option rows.
- Pending cards and receipts.

Key rules:

- Use shared `ProjectSelectorTrigger` / `ProjectSelectorList`.
- Do not show store selection inside AMM if the global header already owns selected store context.
- One `+` composer menu opens Work on or Suggestions.
- Opening suggestions closes Work on; opening Work on closes suggestions.
- Suggestion final selection drafts input only.
- Card approval uses the stored pending operation, not rebuilt text.
- Compact replies and receipts remain in the main timeline; low-risk cards omit repetitive policy explanations.

---

## 13. Mobile PWA Flow

Mobile lives inside `MobileShell`.

Rules:

- The Manager tab is feature-flag guarded by `ENABLE_AI_MENU_MANAGER` and `ENABLE_AI_MENU_MANAGER_MOBILE`.
- `/menu-manager` is mapped into the shell state for mobile.
- It must not route-bypass into desktop UI.
- It uses `MobileProjectsProvider` for selected project state.
- It uses the same `sendAiMenuManagerCommand()`, `buildAiMenuManagerClientExecutionDirective()`, `applyAiMenuManagerProjectPatch()`, and completion/cancel DAL methods as desktop.
- Heavy/dense flows should be guided cards or exact existing-flow handoffs, not squeezed desktop screens.

Touch/UI expectations:

- approval/cancel/edit/local actions need mobile-sized controls.
- composer must remain usable above the mobile tab bar.
- card content must show before/after/scope without horizontal overflow.
- the one `+` composer button opens a MobileShell sheet for Work on or Suggestions.
- pending cards stay above the composer in the main chat surface; receipts remain inline instead of creating a second receipt panel.

---

## 14. Local Export Flows

Local export cards are first-class cards, not generic manual task placeholders.

Examples:

| Owner command | Expected action |
| --- | --- |
| `Copy feedback link` | `feedback_link_share` with copy/open/download QR controls. |
| `Download feedback QR` | `feedback_qr_download` with QR download. |
| `Copy menu link` | `menu_share_copy_link`. |
| `Download menu QR` | `menu_qr_download`. |
| `Copy customer app install link` | `customer_app_install_link_share`. |
| `Copy digital screen link` | `digital_screen_link_share`. |
| `Copy POS setup info` | `pos_sync_setup_info_copy`. |

Local export cards:

- do not write menu truth.
- do not store generated QR images in Firestore.
- can be marked done as an owner workflow receipt.
- should not claim an external platform was updated.

---

## 15. Unsupported External Flows

AMM does not integrate with these destinations today:

- Zomato
- Swiggy
- Uber Eats
- Instagram posting
- Facebook posting
- direct Google Business Profile mutation
- direct Google review posting

Commands mentioning those destinations must resolve to `system_unsupported_action`.

Correct owner copy:

```text
Menu Manager cannot update Zomato directly yet. Use the export/copy flow and update it there.
```

Incorrect owner copy:

```text
Zomato task completed.
Posted on Instagram.
Manual task marked done.
```

`menu_publish` means MenuList-controlled surfaces only unless a real external adapter exists. Cards and receipts must name the actual scope, for example `Publish to MenuList public menu and QR menu`. Do not use "publish everywhere" unless the card explicitly lists only supported MenuList surfaces and separates unsupported external platforms.

---

## 16. Feature Flags

Current flags live in [`src/config/features.ts`](../../src/config/features.ts):

```ts
ENABLE_AI_MENU_MANAGER: true
ENABLE_AI_MENU_MANAGER_MOBILE: true
ENABLE_AI_MENU_MANAGER_VOICE_INPUT: false
ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS: true
ENABLE_AI_MENU_MANAGER_RULES: true
ENABLE_AI_MENU_MANAGER_MODEL_ROUTER: true
ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER: true
ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST: false
ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES: true
ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS: false
AI_MENU_MANAGER_SESSION_STORAGE_MODE: "daily_compact"
```

Flag behavior:

- `ENABLE_AI_MENU_MANAGER=false`: route should not render.
- `ENABLE_AI_MENU_MANAGER_MOBILE=false`: mobile tab should not appear.
- `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES=false`: approved cards must not mutate project truth.
- the cloud planner may run only after deterministic routing returns no result; local assist remains disabled.
- image/rule flags do not make unverified adapters executable by themselves.
- debug artifacts remain off unless specifically needed.

Clarifications:

- `ENABLE_AI_MENU_MANAGER_RULES` currently means rule suggestion/registry visibility only. It must not enable automatic rule execution. Rule execution requires a separate verified execution registry, scheduler/lease contract, idempotency, approval policy, and receipt model.
- `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS` does not make every image checklist row executable. Only registry-defined, verified image actions with adapter support may produce executable cards.
- `ENABLE_AI_MENU_MANAGER_VOICE_INPUT` remains false until a production speech-to-command UI is verified. Voice commands, when enabled, must enter the same text command resolver and approval flow.
- `ENABLE_AI_MENU_MANAGER_MODEL_ROUTER` admits the provider abstraction. `ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER` enables only the bounded unresolved-language planner; `ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST` remains false. No model provider may receive full raw project JSON, return raw project patches, or expose write tools.

---

## 17. How To Add A New Action Safely

Use this order.

1. Confirm there is an existing manual MenuList path or a deliberate local export path.
2. Add or update the row in [`ai-menu-manager_action-type-checklist.md`](./ai-menu-manager_action-type-checklist.md).
3. Add the action definition in [`actionTypes.ts`](../../src/lib/ai-menu-manager/actionTypes.ts).
4. Declare manual equivalent, execution mode, approval level, risk, cost class, mobile behavior, source evidence, readiness, and required flags.
5. Add resolver logic in [`commandResolver.ts`](../../src/lib/ai-menu-manager/commandResolver.ts) or exact local export/manual-flow routing.
6. Add card content with before/after/scope and truthful owner copy.
7. If it mutates project truth, add patch support in [`projectPatches.ts`](../../src/lib/ai-menu-manager/actions/projectPatches.ts).
8. If it needs server authority, use existing guarded API/job paths instead of direct Firestore writes.
9. Add/update verifier coverage in [`scripts/verification/verify-ai-menu-manager.js`](../../scripts/verification/verify-ai-menu-manager.js).
10. Add mobile behavior and ensure it stays inside `MobileShell`.
11. Update docs and QA cases.

Do not add a new action just because a prompt exists. The adapter and manual path must exist first.

An action is executable only when all are true:

1. The action type exists in the code registry.
2. Readiness is `ready_adapter` or an equivalent executable state.
3. Execution mode is supported by the current client or server lane.
4. Required feature flags are enabled.
5. Resolver can produce entity refs and before/after.
6. Approval policy exists.
7. Card renders on desktop and mobile, or has an approved mobile handoff.
8. Patch/API/job path exists and reuses the existing MenuList operation path.
9. Verifier coverage exists.
10. Unsupported/manual/blocked states are tested.

Checklist presence alone never makes an action executable.

---

## 18. Implementation Invariants

These should be checked during every AMM review:

- No AMM live writes outside registered adapters.
- No second menu source of truth.
- No model-confidence-based execution.
- No planner call before deterministic routing, and no planned mutation without deterministic registered-action reproduction.
- No proposal doc per deterministic selected-project card.
- No Firestore doc per message/token/render.
- No base64 images or QR payloads in Firestore.
- No unsupported external "done" state.
- No Business Health execution dependency.
- No mobile desktop-route bypass.
- No broad all-project/all-outlet mutation without explicit scope approval.
- No price mutation without old/new price and high confirmation.
- No stale selected-project approval after base hash mismatch.
- No hidden project mutation when owner cancels or only chooses a suggestion.
- No text-prefix-only execution scope when structured `composerContext` IDs are available.
- No arbitrary broad project replacement through an action-scoped card.
- No publish wording that implies unsupported external surfaces.
- No rollback wording unless reverse patch support exists for that completed action.

---

## 19. Verification

Primary verifier:

```bash
npm run verify:ai-menu-manager
```

Useful repo checks before handoff:

```bash
git diff --check
npx tsc --noEmit --incremental false
npm run lint
```

For UI/runtime review, test at least:

```text
Masala tea 20 now
Cold coffee sold out
deactivate Cold coffee item
deactivate Drinks category
Make menu premium
Use grid layout
Set theme color to Gold
Show Featured section
Feature Cold coffee
Copy feedback link
Download feedback QR
Copy menu link
Download menu QR
Update this on Zomato
What should I fix today?
What is today's weather?
Sandwich 80
Selected items: Masala Tea, Cold Coffee. increase price by 10
Change this in every menu
Make the drinks section feel easier to scan
```

Expected behavior:

- executable changes become cards and wait for approval.
- local exports show copy/open/download controls.
- external integrations are unsupported.
- domain questions become answer cards.
- general questions are unsupported.
- receipts are compact and truthful.
- clarification choices advance to the next card without mutating truth or adding an extra cancel write.
- short follow-ups such as "Actually 25" can replace the one pending matching card in the same compact session write.
- structured Work on context targets the selected entity IDs.
- all-project/all-outlet scope asks for explicit scope approval before any mutation.
- stale cards do not silently overwrite newer project truth.
- disabling confirmed writes blocks project mutation while still allowing safe cards.
- exact deterministic commands and known local answers do not call the planner.
- unresolved in-domain language uses only capped context; invalid targets/provider failures fall back safely.

---

## 20. Current Known Gaps

The registry and checklist are intentionally broader than the current executable core.

Known implementation state:

- Current deterministic project mutation support is the 19-action executable list.
- Many checklist rows are discovery/reserved adapter rows, not owner-reachable execution yet.
- Server-backed image/import/publish/rule/rollback/staff families must remain guarded, handoff-only, local export, blocked, or existing-api-only until their adapters are fully verified.
- Rule execution, durable rollback, direct external adapters, and full speech-to-command are not launch claims unless separately verified.
- Full Chrome owner-POV action sweep was previously blocked by a Chrome connector issue; do not claim every checklist row has live-click runtime coverage unless a fresh browser sweep is completed.

Source-gated product claim:

```text
Menu Manager has source-gated support for verified daily menu operations and local export cards, but this handoff is not current launch certification.
The broader checklist remains the production expansion map, not a claim that every action is executable today.
Current release approval requires the production-readiness audit, External Certification Runbook evidence, npm run verify:ai-menu-manager, authenticated desktop/mobile Menu Manager QA, supported-adapter smoke behind AMM feature flags, public website/help copy review, target deploy evidence, and production-host smoke.
```

---

## 21. Quick Mental Model For Engineers

When reviewing or extending AMM, ask these questions:

1. Does the owner command resolve to exactly one registered action type?
2. Is this read-only, local export, manual handoff, unsupported, or executable?
3. If executable, what existing MenuList path applies it?
4. Does the card show scope, entity, before/after, risk, and approval?
5. Does cancel do nothing to truth?
6. Does approve use the stored patch and patch hash?
7. Does completion write a compact receipt?
8. Does the mobile screen behave the same way inside MobileShell?
9. What is the Firestore read/write count?
10. Is the owner-facing copy truthful?

If any answer is unclear, do not make the action executable.
