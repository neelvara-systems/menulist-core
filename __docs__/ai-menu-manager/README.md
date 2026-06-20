# AI Menu Manager - Documentation Hub

> **Feature:** AI Menu Manager
> **Internal slug:** `ai-menu-manager`
> **Product:** MenuList
> **Status:** Initial implementation validated - controlled launch ready for supported adapters behind AMM feature flags
> **Last Updated:** June 20, 2026
> **Version:** 1.1

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| Founder / Product | [ai-menu-manager_spec.md](./ai-menu-manager_spec.md) | Product boundary, owner flows, scope, accepted/rejected behavior |
| Engineering | [ai-menu-manager_impl.md](./ai-menu-manager_impl.md) | Technical architecture, action registry, APIs, file plan, integration points |
| Engineering / QA | [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md) | Production checklist for AMM action types, manual equivalents, approvals, cost class, and readiness |
| Engineering / QA | [ai-menu-manager_feature-action-audit.md](./ai-menu-manager_feature-action-audit.md) | Feature-by-feature audit ledger for discovering AMM action types from existing docs and source |
| Engineering / Finance | [ai-menu-manager_firebase.md](./ai-menu-manager_firebase.md) | Firestore, Storage, cache, AI, and cost model |
| Mobile / Product | [ai-menu-manager_mobile-support.md](./ai-menu-manager_mobile-support.md) | MobileShell admission, mobile action split, thumb-first card behavior |
| QA | [ai-menu-manager_test-cases.md](./ai-menu-manager_test-cases.md) | Test scenarios, parity matrix, failure cases |
| Engineering / QA | [ai-menu-manager_validation.md](./ai-menu-manager_validation.md) | Implemented scope, evidence, validation commands, cost check |
| Sales / Marketing | [ai-menu-manager_marketing.md](./ai-menu-manager_marketing.md) | Internal positioning, demo narrative, approved language |
| Website | [ai-menu-manager_website.md](./ai-menu-manager_website.md) | Public website copy guidance, SEO, visual slots |
| Support | [ai-menu-manager_helpdoc.md](./ai-menu-manager_helpdoc.md) | Owner-facing help article draft |
| Source archive | [_archive/agentic-ai-for-menu-ops-chatgpt-conversation-2026-06-17.md](./_archive/agentic-ai-for-menu-ops-chatgpt-conversation-2026-06-17.md) | Captured ChatGPT conversation used as input, not source of truth |

---

## What This Feature Is

AI Menu Manager is the owner-facing menu operations layer where owners can tell MenuList what changed and approve prepared work.

It is a conversational shortcut over real MenuList actions, not a separate menu system. AMM understands owner input, creates proposal cards, gets approval when needed, and applies approved work through registered MenuList action adapters.

AMM can also answer MenuList-domain questions from the loaded selected menu context. These read-only answers use `system_context_answer` cards, do not call an AI provider, do not read extra Firestore documents, and do not mutate menu truth. Examples include "What should I fix today?", "Which items have no photos?", "Is my menu ready to share?", and "What items are unavailable?"

One-sentence product definition:

> Tell MenuList what changed. It prepares the update. You approve. The menu stays correct.

---

## Locked Product Boundary

AI Menu Manager is:

- a standalone MenuList feature, separate from Business Health.
- a chat-first work surface with card-native execution.
- an action registry over existing menu operations.
- a selected-context answer surface for menu readiness, content gaps, visibility, and share-readiness checks.
- an approval-safe route for supported price, availability, design, selected-menu answer, and browser-local/share actions, with image, import, publish, rule, rollback, staff, and special-menu families kept behind adapter readiness and review/handoff cards until their safe execution paths are connected.
- a voice-ready input surface because voice enters the same command pipeline as text.

AI Menu Manager is not:

- a successor to Business Health.
- a generic chatbot.
- a renamed Menu Command Center.
- a new menu data model.
- an analytics dashboard.
- a live weather, news, sports, market, or general web-answering assistant.
- a hidden AI write path.

---

## Architecture Overview

```text
Owner text / voice / upload / suggested action
  -> selected store and selected project context
  -> AMM command intake
  -> intent and entity resolution
  -> if read-only MenuList question:
       context answer card -> compact session
  -> if MenuList operation:
       registered action adapter
       -> proposal card
       -> owner approval, edit, scope change, or cancel
       -> existing MenuList mutation path
       -> public cache, MOL, snapshots, publish/verification side effects
       -> receipt and compact history
```

The most important rule:

> AMM can talk naturally, but it can act only through registered, previewable, approved MenuList operations.

Suggestion prompts are draft helpers only. The empty chat state should lead with frequent daily owner work: store closed today, working-hours changes, and a contextual sold-out item when the selected menu has items. If item context is unavailable, the third starter can fall back to time-slot work. AMM groups the full suggestion sheet by current menu context such as quick fixes, promotion, photos/content, style, daily operations, and publish/import. When a suggestion has sub-options, AMM first shows the owner a focused second layer such as presentation tone, layout, theme color, working-hours choice, customer app task, or digital screen task. Choosing a final option places the command in the composer; the owner must still send it before a card is prepared.

The composer exposes **Work on** and **Suggestions** as separate tools. Opening one closes the other, so the owner never has two guidance panels competing for the composer. **Work on** scopes the next message to an item, multiple items, one category, menu design, digital menu, official page, digital screens, feedback, or store settings. Item/category choices use compact selectable rows; search appears only for longer lists or active search text. Picking context does not create a card or write Firestore. AMM keeps the owner-visible text explicit, such as `Selected items: Masala Tea, Cold coffee. increase price by 10`, and passes the selected entity IDs into the resolver so duplicate item/category names still resolve to exactly what the owner picked. The normal resolver, action registry, approval card, existing mutation path, and receipt flow still apply.

Clarification cards can also show option rows. Choosing an option only drafts the next owner message; it does not approve or execute a card.

Read-only answer cards are different from clarification and manual-task cards. They summarize what MenuList can see in the selected menu context, such as missing photos, missing descriptions, unavailable items, hidden categories, or share readiness. They can offer suggested replies, but those replies only draft the next command. Any resulting change still becomes a registered proposal card and follows approval.

Direct operation commands take precedence over read-only answers. For example, "increase all drinks price by 10" must create a bulk price proposal, while "Can I increase drinks prices?" may create a read-only guidance card.

Feedback link and feedback QR requests are dedicated browser-local export cards, not generic manual tasks. When the owner sends "Copy feedback link" or "Show feedback QR", AMM prepares the selected menu's feedback URL with Copy link, Open link, and Download QR controls. These controls do not mutate menu truth and do not store QR base64 in Firestore.

---

## Codebase Truth Anchors

| Existing system | AMM use |
| --- | --- |
| `updateProject()` customer-truth invariant | AMM project/menu writes must preserve the existing DAL path and side effects. Evidence: `src/database/projects/index.ts:945` |
| Public cache invalidation | Approved public-menu changes must revalidate menu, owner Business Assistant cache, and screen content version. Evidence: `src/lib/cache/publicClientCache.ts:77` |
| Menu extraction jobs | AMM import/upload cards reuse the protected extraction job API. Evidence: `src/app/api/menu-extraction/jobs/route.ts:402` |
| Existing image generation API | AMM generated-image cards reuse existing safe mode, rate limit, capacity, and accounting flow. Evidence: `src/app/api/image-generation/route.ts:24` |
| Menu Observation Layer | AMM should not create a second noisy change log; approved menu writes flow into existing MOL where applicable. Evidence: `src/database/menuChangeLog/index.ts:1` |
| Current menu data shape | AMM edits `Project.files[].extractedData.data.categories/items`, not a new Menu Graph collection. Evidence: `src/components/templates/main-app/projects/types/extractedData.types.ts:149` |
| Existing design settings | Theme/style commands map to `config.design` and menu design presets. Evidence: `src/components/templates/main-app/projects/types/theme.types.ts:16` |
| Menu Command Center | Existing bulk-operation logic is reusable as action-adapter logic, not as the final UI. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:1` |
| Business Health flags | Business Health has separate read-model/action flags; AMM must not merge with it. Evidence: `src/config/features.ts:1039` |

---

## Core Decisions

| Decision | Locked outcome |
| --- | --- |
| Naming | Public launch uses AI Menu Manager; daily in-app owner UI uses Menu Manager with optional AI badge. |
| UI model | Chat-like conversation with MenuList operation cards. |
| Execution model | Action registry; no unregistered writes. |
| Manual parity | Manual UI and AMM are alternative entrances into the same actions. |
| Store/project context | AMM screen includes store and project selectors; actions default to the currently selected store and project, not all projects. |
| Data model | Compact session/day docs for normal cards, proposal docs only for server-backed/durable cards, Storage for heavy artifacts. |
| Firebase cost | Reads are cached and bounded; no per-token/per-message Firestore writes. |
| AI cost | Acceptable when bounded by safe mode, rate limits, capacity, and accounting. |
| Image generation | Generate draft images; owner must approve before menu use. |
| Voice | Voice input is an input adapter into the same command flow. |
| Mobile | Mobile supports fast cards and approvals inside MobileShell; heavy authoring stays controlled. |
| Business Health | Separate product surface; AMM may consume signals only through explicit action adapters. |

---

## Day-One Action Catalog

The production checklist for exact action types is [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). The docs define these action families from the start:

Readiness rule: this catalog is the day-one product contract and production checklist, not a claim that every listed family is fully executable from AMM today. Each row in the checklist decides whether the current behavior is executable, needs adapter glue, browser-local, manual-task-only, or blocked. Public demos should lead with verified daily ops and selected-menu answer cards; unfinished families must be shown as draft, review, handoff, or not-supported cards.

- menu import and review
- import identity acceptance and import-created new menu
- upload queue cleanup
- single price update
- bulk price update
- item availability, item visibility, and category visibility
- item/category/attribute field updates with protected system-owned keys
- new item
- today special
- offer/combo and expiry
- description batch update
- label/category/icon repair
- photo task and photo approval
- generated item image
- project lifecycle, active status, cover image, language, and public content
- menu design/theme update
- publish menu
- publish failure/manual task
- external drift decision
- staff request
- customer complaint correction
- adapter-supported undo/rollback
- rule suggestion and owner-approved rule execution
- multi-outlet scope approval
- outlet-local customization
- public presence and store profile updates
- store profile, locale, working hours, and time-slot presets
- domain checks, custom-domain connection, SEO, analytics, and feedback settings
- customer app settings, app icon, and install-link share
- digital screen status, link, override, slide upload, caption, and delete
- feedback inbox, resolve/reply, feedback link, and feedback QR
- POS sync settings, secret, test, setup-copy, and integration status review
- mobile share/export, menu kit, official page QR, print assets, and browser-local downloads
- item share cards, customer communication templates, physical surface exports, and browser-local/native-share handoffs
- compliance page status, override, and reset through the existing guarded compliance API
- menu presence monitor status and owner confirmation actions
- review/reputation guard and reply-assist cards only while the reviews feature flags and production adapters allow them
- new item metadata and image-editing draft cards through existing accounted AI APIs
- POS setup details, secret copy, instructions draft, technical summary copy, and sample payload download
- selected-menu context answers for readiness, missing content, availability/visibility, share readiness, and price-change guidance
- staff and access requests through guarded APIs
- low-confidence clarification
- mixed-language command
- completion/failure receipt

Unsupported or unavailable external actions become manual-task/export cards, not fake automation.

---

## Feature Flag Plan

```ts
// src/config/features.ts
ENABLE_AI_MENU_MANAGER: true
ENABLE_AI_MENU_MANAGER_MOBILE: true
ENABLE_AI_MENU_MANAGER_VOICE_INPUT: true
ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS: true
ENABLE_AI_MENU_MANAGER_RULES: true
ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES: true
ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS: false
AI_MENU_MANAGER_SESSION_STORAGE_MODE: "daily_compact"
```

The feature is designed as a complete day-one contract. Flags are safety controls, not scope-reduction switches.

Flag note: enabled flags only allow the AMM surface and registered card families to appear. They do not bypass the action checklist. A rule, image, import, publish, rollback, or staff request still remains blocked, manual-task-only, or review-only unless its registered adapter is marked ready and verified.

## Firebase Cost Rule

For deterministic selected-project actions, prefer the client DAL over AMM API routes when the selected project context is already loaded and no server-only secret, provider, import job, external integration, staff/account permission, or durable server ledger is required.

Normal price, availability, visibility, featured section, note, and design preset cards are stored in the compact `aiMenuManagerSessions/{sessionId}` daily doc as capped pending operations. They do not create one proposal document per card. Approval applies the stored patch through the existing `updateProject()` path and then writes the compact receipt back to the same session doc.

Command submit, completion, and cancel reuse the compact session already loaded in the open AMM screen and write the updated daily session doc directly. They do not read a proposal doc or transaction-read the session again for normal deterministic cards.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | June 17, 2026 | Initial docs-first contract created from the captured ChatGPT conversation, current Codex planning discussion, and MenuList codebase cross-check. |
| 1.1 | June 18, 2026 | Deterministic project actions moved to the client DAL compact-session model to avoid proposal-doc reads/writes for normal owner operations. |
