# AI Menu Manager - Product Specification

**Status:** Product contract - initial implementation validated
**Feature flag:** `ENABLE_AI_MENU_MANAGER`
**Internal feature name:** AI Menu Manager
**Public launch name:** AI Menu Manager
**In-app owner label:** Menu Manager, with AI badge where useful
**Last Updated:** June 19, 2026

---

## Executive Summary

AI Menu Manager lets an owner tell MenuList what changed and receive a prepared operation card.

The owner should not need to remember whether the work lives in editor, settings, image generation, menu import, special menus, sharing, or publishing. AMM resolves the request, shows what will change, asks for approval when needed, and applies supported approved work through existing MenuList systems.

The product is not a chatbot. It is a controlled, proposal-driven, approval-safe menu operations layer.

It can answer MenuList-domain questions only from the loaded selected menu context. Those answers are read-only `system_context_answer` cards for menu readiness, missing photos/descriptions, unavailable or hidden entries, share readiness, and price-change guidance. They do not perform provider calls, external lookups, Firestore scans, or mutations.

Core loop:

```text
Owner intent
  -> AMM proposal
  -> approved MenuList operation
  -> existing system write
  -> receipt
```

---

## Product Boundary

### In Scope

- Chat-like owner input for menu operations.
- Read-only selected-menu answers for operational questions such as missing photos, unavailable items, menu readiness, and share readiness.
- Card-based proposals and receipts.
- Text, upload, click, and voice-input-ready command intake.
- Action registry for supported MenuList operations.
- Manual UI parity for every action.
- Store selector and project selector inside AMM so commands run in the same selected store/project context as current manual flows.
- Approval, edit, cancel, scope, time, and rollback controls.
- Compact session and proposal history.
- Existing image generation, extraction, project save, design setting, public cache, MOL, and multi-outlet paths.
- MobileShell approval and fast-operation surface.

### Out of Scope

- A generic "ask anything" chatbot.
- Live weather, news, sports, stock, trivia, or general web-answering questions.
- Provider-backed open-ended consulting answers without a registered read-only or action adapter.
- A second menu data model.
- Always-on full transcript storage.
- Hidden AI writes to live public menu truth.
- Direct third-party posting or listing updates for Zomato, Swiggy, Google Business Profile, Instagram, Facebook, or similar external platforms.
- Freeform theme/design generation outside the existing menu design system.
- Merging AMM with Business Health.
- A new analytics dashboard.

---

## Naming Rule

Use `AI Menu Manager` / `AMM` in internal engineering docs and action registry discussions.

Use `AI Menu Manager` in public website, launch, SEO, and sales copy for this feature. This is a feature-level naming decision and must not reposition all of MenuList as generic AI restaurant software.

Use `Menu Manager` in daily in-app owner navigation, with a small AI badge where useful.

Owner-facing language should stay action-oriented: tell MenuList what changed, review the prepared card, approve the update.

---

## Feature Gate

| Gate | Answer | Result |
| --- | --- | --- |
| Removes a decision? | Yes. Owners can state the business change instead of finding the correct screen and field. | PASS |
| Would anyone notice if absent? | Yes. Frequent menu changes, sold-out items, photos, prices, and publishing are daily owner work. | PASS |
| Strengthens customer decision? | Yes. It keeps menu content, availability, photos, and presentation accurate. | PASS |
| One sentence without "and"? | Tell MenuList what changed; approve the prepared update. | PASS |
| Still matters in 3 years? | Yes. SMB menus will still need accurate prices, availability, photos, styles, and publishing. | PASS |

Verdict: Approved as a standalone MenuList operations layer.

---

## ChatGPT Conversation Verdict

The captured ChatGPT conversation is useful product input, but MenuList codebase truth controls the final design.

| ChatGPT idea | Verdict | MenuList decision |
| --- | --- | --- |
| Agent Inbox cards with proposal, approval, execution, and receipt | Agree | Keep card model, but use a chat-first work surface with an inbox/context layer. |
| Event-driven operation model | Agree | Use event/status vocabulary internally, but avoid one Firestore write per tiny event. |
| Menu Graph as source of truth | Partial | Do not create a new Menu Graph collection. Current project extracted data remains truth. |
| Many small specialist agents | Partial | Implement as action adapters first. Specialist AI prompts can exist behind adapters. |
| Human approval for risky actions | Agree | Prices, deletes, supported publish actions, multi-outlet scope, rollback, and generated media publish require approval. Unsupported external platforms are blocked. |
| One doc per event/API payload style | Disagree | Use compact session docs, actionable proposal docs, and Storage-backed heavy artifacts. |
| Separate Home, Growth, Control screens | Partial | Preserve the concepts as filters/context panels. Do not create a large dashboard surface. |
| Advanced image generation as menu improvement | Partial | Generated images are draft assets until owner approves use on menu. Real photos remain preferred when trust matters. |
| External publishing everywhere | Reject for current AMM | Direct publishing to Zomato, Swiggy, Google Business Profile, Instagram, Facebook, or similar external platforms is not supported. Owner-typed requests become destination-specific not-supported cards. |
| Menu Health inside AMM | Partial | AMM can create action cards from safe signals, but Business Health remains separate. |

---

## Market Pattern Check

This product direction matches current market movement without copying competitor shape.

| Source | Signal | AMM implication |
| --- | --- | --- |
| [OpenAI Agents SDK human-in-the-loop](https://openai.github.io/openai-agents-python/human_in_the_loop/) | Sensitive tool calls can pause for approval or rejection. | AMM must pause risky menu actions and resume only after owner decision. |
| [OpenAI Agents guide](https://developers.openai.com/api/docs/guides/agents) | Agents coordinate tools and state; application owns orchestration. | AMM action registry owns tools, state, and approvals; the model does not own writes. |
| [Google Business Profile menu editor help](https://support.google.com/business/answer/9455840?hl=en) | Business owners can publish/edit menu entries and item photos after review. | Menu import and publish must stay review-first. |
| [Uber merchant product update](https://www.uber.com/us/en/newsroom/merchant-product/) | Restaurant platforms are adding menu descriptions, photo enhancement, and review summaries. | AMM should compete on source-of-truth operations, not only generated descriptions/photos. |
| [Square restaurant AI article](https://squareup.com/us/en/the-bottom-line/operating-your-business/opportunities-for-ai-in-restaurants) | Operators use AI for content and communication tasks. | AMM should convert prompts into MenuList operations, not stop at draft text. |

Market conclusion: AI menu content is becoming common. MenuList's stronger position is approved, logged, publish-aware menu operations.

---

## Owner Mental Model

The owner should think:

> I tell MenuList what changed. It prepares the update. I approve important changes.

The owner should not think:

- Which field do I edit?
- Is this an item, variant, category, setting, project, or outlet?
- Which menu surface is live?
- Did this publish everywhere?
- Is this image attached yet?
- Did I remember to restore the sold-out item?

---

## Main Surface

AMM is a work surface with three layers:

| Layer | Purpose |
| --- | --- |
| Conversation timeline | Owner messages, AMM responses, cards, images, receipts. |
| Operation cards | Approve, edit, scope, publish, rollback, manual task, receipt. |
| Context panels | Current menu/project/outlet, pending approvals, history, publish status. |

The first screen should not be an empty generic chat screen. It should show:

- selected store/project/outlet.
- visible store selector and project selector before command execution.
- current menu status.
- pending approvals.
- bottom composer for text, upload, and voice-ready input.
- empty-state starter cards for frequent daily work, such as store closed today, working-hours changes, and a contextual sold-out item. If no item context exists, the third starter can fall back to time-slot work. Starter cards fill the composer or open the second-layer suggestion choice; they do not submit.
- separate composer tools for Work on and Suggestions.
- Work on context picker for item, category, menu design, digital menu, official page, digital screens, feedback, and store settings. Item context supports multi-select so commands like "increase price by 10" can become a selected-item bulk price card without the owner retyping item names. Item/category entity choices must stay compact; search is shown only when the list is long or the owner is actively searching.
- contextual suggestion sheet for common work; settings-style suggestions can open a second layer of exact options, and final suggestions fill the composer without submitting automatically.

---

## Core Interaction Rules

1. AMM creates actions, not advice.
2. Every meaningful action becomes a card.
3. Every card has a registered action type.
4. The card payload contains before/after, scope, risk, approval need, and available actions.
5. Frontend must not reconstruct risk or approval policy from raw menu data.
6. Related commands update existing pending cards when safe.
7. Conflicting pending changes must be shown explicitly.
8. Critical cards do not disappear silently.
9. Notifications deep-link to the relevant card.
10. Completion receipts show what changed, where, who approved, and rollback if available.
11. Work on context selection is draft context only. It must not execute, approve, or persist anything until the owner sends the composed message.
12. Suggestion and starter-card selection is draft text only. It must not execute, approve, or persist anything until the owner sends the composed message.
13. Work on and Suggestions are mutually exclusive composer guidance surfaces. Opening either closes the other on desktop and mobile.
14. Commands default to the selected store and selected project shown on the AMM screen.
15. AMM must not silently apply project-level work to all projects; cross-project or all-store scope requires an explicit scope card and owner approval.
16. Clarification options are draft prompts only. Choosing one fills the composer and does not approve, execute, or create a new card until the owner sends it.

---

## Approval Weight

| Weight | Use | Required UI |
| --- | --- | --- |
| Light | Low-risk task creation, reminder, manual task, draft copy. | One primary action. |
| Normal | Availability, image approval, description batch, theme style. | Before/after and scope. |
| Heavy | Price, delete/archive, all-outlet change, supported MenuList publish, rollback. | Before/after, scope, customer preview, approver, rollback note. |

Mapping to implementation approval levels:

| Product weight | Checklist level |
| --- | --- |
| Light | `none` or `confirm` |
| Normal | `confirm` |
| Heavy price/public-scope change | `high_confirm` |
| Heavy multi-record change | `bulk_confirm` |
| Heavy delete/reset/archive | `destructive_confirm` |
| Heavy MenuList export/publish/share | `external_confirm` |

Hard rules:

- Price changes always require owner approval.
- Direct price changes use `high_confirm` and must show old price, new price, selected store/project scope, public impact, and receipt expectation.
- Delete/archive always requires owner approval.
- Supported MenuList publish/export/share actions require preview and approval where the action affects public output or creates a durable artifact.
- Third-party platform posting and listing updates are not supported in current AMM.
- Staff requests that touch high-risk truth escalate to owner.
- Rule creation requires explicit owner approval.
- Until the rule execution registry exists, AMM may suggest rules but must not auto-execute them.
- Rule execution is allowed only after the rule infrastructure exists and the execution exactly matches the approved rule.

---

## Action Catalog

This table is the product-level catalog. Exact action IDs, readiness states, source evidence, execution modes, and cost classes are governed by [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md).

| Action type | Owner command example | Manual equivalent | Approval |
| --- | --- | --- | --- |
| `system_context_answer` | "What should I fix today?" | Read current selected menu context | None |
| `item_price_update` | "Tea is 20 now" | Item editor / Command Center | Heavy |
| `bulk_price_update` | "Increase all dosa by 10" | Command Center bulk pricing | Heavy |
| `item_availability_update` | "Cold coffee over" | Availability toggle | Normal or manager-permitted |
| `item_availability_update` | "Cold coffee is back" | Availability toggle; sets `available: true` | Light/normal |
| `item_visibility_update` | "Deactivate Masala Tea item" | Item active toggle | Normal |
| `category_visibility_update` | "Deactivate Desserts category" | Category active toggle | Normal |
| `item_create` | "Add cheese dosa 90" | Add item | Normal |
| `special_menu_create` | "Add lunch thali today only" | Special menu / item editor | Normal/heavy depending publish |
| `menu_missing_photo_task` | "Ask staff for photos" | Manual task / staff workflow | Light |
| `image_item_generate` | "Generate image for masala tea" | AI Image Generator | Normal before apply |
| `image_item_apply_generated` | "Use this image" | Apply generated image to item | Normal |
| `menu_design_preset_apply` | "Make my menu look premium" | Menu page settings/design presets | Normal |
| `menu_design_mood_update` | "Set menu tone to Premium & Minimal" | Menu design presentation tone | Normal |
| `menu_design_layout_update` | "Use grid layout" | Menu design item layout | Normal |
| `menu_design_color_update` | "Set theme color to Gold" | Menu design theme color | Normal |
| `menu_design_visibility_update` | "Hide item prices" | Menu design display options | Heavy |
| `menu_import_review_apply` | "Apply these extracted changes" | Menu extraction job/review | Normal/heavy depending changes |
| `menu_publish` | "Publish this everywhere" | Save/share/publish flow | Normal/heavy by surface |
| `system_manual_task_create` | "Ask staff to take photo" | Ad hoc manual checklist | Light |
| `system_rollback_offer` | "Undo last price change" | History/rollback | Heavy for high-risk changes |
| `rule_suggestion` | "Do this every morning" | Rules settings | Heavy to create rule |

---

## Today Special Resolution

Owner language around "today special" resolves by intent and scope:

| Owner command shape | Default AMM resolution |
| --- | --- |
| "Add today special Rajma Chawal 129" | `item_create` in the selected project, with Today Special category/label/placement when the current menu supports it. |
| "Create Diwali/weekend/lunch special menu" | `special_menu_create` because the owner is asking for an alternate or scheduled menu. |
| "Show today's note/banner" | `menu_special_note_update` because the owner is asking for public message text, not an item or menu. |

If the command is ambiguous between a single item, a scheduled special menu, and a banner/note, AMM must ask a clarification question before creating a proposal.

---

## Theme And Design Example

Owner says:

```text
make my menu look more premium
```

AMM creates a `menu_design_preset_apply` or related menu design card:

- Current: existing mood, layout, price/photo/category visibility.
- Suggested: approved preset from `MENU_DESIGN_PRESETS`.
- Broad theme requests such as "change the theme" first show presentation-tone choices from the existing Menu design screen: Clean & Calm, Warm & Inviting, Premium & Minimal, Bold & Social, and Fast & Direct.
- Broad layout requests such as "change menu layout" first show the existing owner layouts: List, Grid, and Card.
- Theme color requests first show the existing brand color presets before preparing a color card.
- Display option requests first show show/hide choices for item prices, item images, category icons, and category tabs.
- Preview: customer menu before/after.
- Scope: this project, selected outlets, or all outlets.
- Actions: Apply this, Try another style, Edit, Cancel.

The adapter must use existing `config.design` fields and existing design preset helpers. Evidence: `src/components/templates/main-app/projects/types/theme.types.ts:16`, `src/lib/menu/menuDesignPresets.ts:48`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:75`.

---

## Image Generation Example

Owner says:

```text
generate image for masala tea
```

AMM:

1. Resolves the item from current project data.
2. Creates an `image_item_generate` card.
3. Uses the existing image generation API after approval/start.
4. Shows generated variants in a card.
5. Allows Use on menu, Download, Regenerate, Edit prompt, Reject.
6. Applies selected image through the existing project update path.

Generated images are draft assets until the owner applies them to the menu.

For linked outlet projects, image generation must keep the existing media governance: outlets see policy-allowed local-only items unless inherited image override is explicitly enabled.

---

## Manual UI Parity

Manual UI and AMM are alternative entrances into the same operation.

| Manual flow | AMM flow |
| --- | --- |
| Owner changes field in editor/settings. | Owner says the same change in natural language. |
| UI updates local project state. | AMM adapter prepares a patch/proposal. |
| Owner saves. | Owner approves card. |
| Existing DAL/API writes. | Existing DAL/API writes. |
| Existing side effects run. | Existing side effects run. |

If an AMM action cannot map to a manual equivalent or a clearly defined MenuList operation, AMM can only create a manual-task card or ask clarification.

---

## Data And Cost Position

Firestore cost is the top constraint.

The data model must:

- store one compact session/day document when possible.
- store normal deterministic cards inside the compact selected-project session doc as capped pending operations.
- store proposal docs only for server-backed cards that need provider secrets, jobs, external policy, or durable ledger detail.
- update the same compact session/proposal record for lifecycle/status instead of writing every event.
- store heavy prompts, raw responses, full transcripts, generated images, and debug traces in Storage.
- cache menu context packets with `unstable_cache`, Redis/Upstash, or compact summaries.
- enforce explicit caps on compact arrays inside session/proposal docs.
- expose active pending cards without scanning old daily sessions.
- use deterministic IDs or idempotency keys for retry-safe command/proposal creation.
- merge related approved patches into one project update when approval scope and risk allow it.
- prefer Storage lifecycle or existing cleanup paths for generated drafts and debug artifacts.
- stop job polling when the card is hidden, the route is backgrounded, or the job reaches terminal status.
- avoid always-on listeners.
- paginate history.
- use existing project/store docs as source of truth.

---

## Mobile Position

AMM is relevant on mobile, but not every action has the same mobile shape.

Mobile supports:

- quick command input.
- pending approvals.
- price/availability confirmations.
- restore cards.
- staff photo approvals.
- receipts.
- light manual task completion.

Mobile limits:

- heavy menu import review opens a controlled review surface.
- generated image authoring is desktop-first unless the mobile card is review/apply only.
- deep theme customization is desktop-first; applying a prepared style card can be mobile-safe.

This preserves MobileShell doctrine while still making AMM useful during operating hours.

---

## Business Health Boundary

Business Health remains separate.

AMM may consume a Business Health signal only through an explicit action adapter, for example:

- "Popular item missing photo" -> `photo_task_create`
- "High-view item has missing description" -> `description_batch_update`

AMM must not reuse Business Health's disabled public-truth write path or turn Business Health into an execution system. Evidence: Business Health action flags keep public-truth writes disabled in `src/config/features.ts:1053`.

---

## Risks

| Risk | Control |
| --- | --- |
| Owner thinks AMM is a freeform chatbot | UI uses cards and action buttons, not long advice. |
| AI silently changes public truth | Registered adapters only; approval policy enforced. |
| Firebase cost grows with chat history | Compact sessions for normal cards, proposal docs only for server-backed/durable cards, Storage for heavy artifacts. |
| Duplicate logic drifts from manual UI | Every action must list its manual equivalent and shared mutation path. |
| Mobile becomes heavy admin software | Mobile approval surface only for fast cards; heavy review stays controlled. |
| Generated food images reduce trust | Draft-only until owner applies; prefer real photo tasks where appropriate. |
| Multi-outlet mistakes | Scope preview required before approval. |
| External publish confusion | No direct third-party posting exists in current AMM; unsupported destinations show not-supported cards and leave MenuList truth unchanged. |

---

## Decisions Before Implementation

| Topic | Current decision |
| --- | --- |
| Naming | Public launch uses AI Menu Manager; daily in-app owner UI uses Menu Manager with optional AI badge. |
| Direct server project writes | Default implementation should reuse existing client DAL for project mutations unless a server mutation adapter proves equivalent invariants. |
| Rule execution schedule | Rules are designed now, but execution must use existing scheduler discipline and deterministic leases. |
| External publishing adapters | Not present. Unsupported destinations become read-only not-supported cards. |

---

## Doctrine Preservation Check

No new constitution-level doctrine file is required from this conversation.

The durable principles already fit existing doctrine:

- Core Doctrine: MenuList owns menu behavior and public surfaces demand correctness.
- Feature Rejection Gate: AMM removes owner decisions instead of adding dashboards.
- Automation Evolution Doctrine: repeated approvals become owner-approved deterministic rules, not hidden AI behavior.

This feature doc set records AMM-specific operating rules without changing constitution-level law.
