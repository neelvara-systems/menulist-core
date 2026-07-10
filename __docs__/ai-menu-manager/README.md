# AI Menu Manager - Documentation Hub

> **Feature:** AI Menu Manager
> **Internal slug:** `ai-menu-manager`
> **Product:** MenuList
> **Status:** Deterministic core and guarded conversation planner implemented; not current launch certification
> **Release boundary:** Current approval requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:ai-menu-manager`, authenticated desktop/mobile Menu Manager QA, supported-adapter smoke behind AMM feature flags, public website/help copy review, target deploy evidence, and production-host smoke.
> **Last Updated:** July 10, 2026
> **Version:** 1.3

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| Founder / Product | [ai-menu-manager_spec.md](./ai-menu-manager_spec.md) | Product boundary, owner flows, scope, accepted/rejected behavior |
| Engineering | [ai-menu-manager_impl.md](./ai-menu-manager_impl.md) | Technical architecture, action registry, APIs, file plan, integration points |
| Engineering | [ai-menu-manager_technical-team-flow.md](./ai-menu-manager_technical-team-flow.md) | Team handoff for current runtime flow, file map, data model, action lifecycle, mobile path, and extension rules |
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

It is a bounded conversational operations agent over real MenuList actions, not a separate menu system. Conversation is flexible; execution is registered. AMM understands owner input, creates proposal cards, gets approval when needed, and applies supported approved work through registered MenuList action adapters.

AMM can also answer MenuList-domain questions from the loaded selected menu context. Known diagnostics and recommendations use deterministic `system_context_answer` cards with no provider call or extra Firestore read. When deterministic routing cannot understand an in-domain message, the guarded cloud planner may receive a capped selected-menu packet and return a read-only router outcome or a prepare-action intent. Provider output never mutates truth and is never accepted as an executable patch.

One owner message may prepare up to four independent deterministic project updates, for example `Masala Tea 20 and Cold coffee sold out`. AMM accepts the split only when every part independently resolves to a registered client-project proposal and the patches do not touch the same field. The cards share a command group and expose **Approve all** on desktop and MobileShell. Approval applies the whitelisted patches to one cloned project, performs one existing project save, and records all compact receipts in one session write. Immediate duplicate submits return the pending cards from loaded state without another write or planner call.

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
- a deterministic-first conversation router with a bounded cloud-planner fallback only for unresolved in-domain language.
- a voice-ready command contract, with the production voice flag disabled until a verified speech-to-command UI exists. Any future voice input must enter the same command pipeline as text and cannot bypass cards, approvals, or receipts.
- hardened local copy handoffs on desktop and mobile: rejected Clipboard API writes retry the acknowledged textarea fallback before copied feedback can appear.

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
  -> deterministic intent and entity resolution
  -> if unresolved and still inside the MenuList domain:
       guarded cloud planner over capped selected-menu context
       -> MenuList revalidates targets and re-runs prepare actions through the deterministic resolver
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

The composer exposes one familiar `+` tool entry for **Work on** and **Suggestions**. Opening either guided surface closes the other, so the owner never has competing panels around the composer. **Work on** scopes the next message to an item, multiple items, one category, menu design, digital menu, official page, digital screens, feedback, or store settings. Item/category choices use compact selectable rows; search appears only for longer lists or active search text. Picking context does not create a card or write Firestore. AMM keeps the owner-visible text explicit, such as `Selected items: Masala Tea, Cold coffee. increase price by 10`, and passes the selected entity IDs into the resolver so duplicate item/category names still resolve to exactly what the owner picked. The normal resolver, action registry, approval card, existing mutation path, and receipt flow still apply.

Compact Menu Manager replies and receipts appear in the conversation timeline. Completion appends the receipt to the existing capped session payload in the same completion write; it does not add a receipt document or another session write. The selected menu status line is derived from the already loaded project.

Clarification cards can also show option rows. Choosing an item/category option submits that selected answer with its validated selected-menu entity ID, removes the old clarification, and creates the next answer/proposal/unsupported card in the same compact session write. It does not approve, execute, publish, or persist menu truth by itself.

Read-only answer cards are different from clarification and manual-task cards. They summarize what MenuList can see in the selected menu context, such as missing photos, missing descriptions, unavailable items, hidden categories, or share readiness. They can offer suggested replies, but those replies only draft the next command. Any resulting change still becomes a registered proposal card and follows approval.

Direct operation commands take precedence over read-only answers. For example, "increase all drinks price by 10" must create a bulk price proposal, while "Can I increase drinks prices?" may create a read-only guidance card.

Feedback link and feedback QR requests are dedicated browser-local export cards, not generic manual tasks. When the owner sends "Copy feedback link" or "Show feedback QR", AMM prepares the selected menu's feedback URL with Copy link, Open link, and Download QR controls. These controls do not mutate menu truth and do not store QR base64 in Firestore.

---

## Codebase Truth Anchors

| Existing system | AMM use |
| --- | --- |
| `updateProject()` customer-truth invariant | AMM project/menu writes must preserve the existing DAL path and side effects. Evidence: `src/database/projects/index.ts:945` |
| Public cache invalidation | Approved public-menu changes must revalidate menu, owner Business Assistant cache, and screen content version. Evidence: `src/lib/cache/publicClientCache.ts:77` |
| Menu extraction jobs | AMM import/upload cards reuse the protected extraction job API. Evidence: `src/app/api/menu-extraction/jobs/route.ts:473` |
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
| AI cost | Deterministic routing runs first. Only unresolved in-domain language can reach the capped planner route, which is protected by safe mode, rate limits, capacity checks, validation, and accounting. |
| Image generation | Generate draft images; owner must approve before menu use. |
| Voice | Voice input remains disabled until a verified input adapter can enter the same command flow. |
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
- rule suggestion and future owner-approved rule execution after the rule adapter is available
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

Unsupported external actions become destination-specific unsupported cards. Where MenuList already has a truthful browser-local copy/download output, that output remains a separate local export action; AMM never claims the external destination was updated.

---

## Feature Flag Plan

```ts
// src/config/features.ts
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

The feature is designed as a complete day-one contract. Flags are safety controls, not scope-reduction switches.

Flag note: enabled flags only allow the AMM surface and registered card families to appear. They do not bypass the action checklist. A rule, image, import, publish, rollback, or staff request still remains blocked, manual-task-only, or review-only unless its registered adapter is marked ready and verified.

Planner note: enabling the model router does not route every message to Gemini. Exact commands, known diagnostics, local exports, unsupported external destinations, and out-of-scope questions resolve deterministically first. The planner is called only after that resolver returns no outcome, and a planned prepare action is accepted only when MenuList can reproduce it as a registered deterministic action against validated selected-menu entity IDs. Cloud output cannot originate receipts/completion states, and internal or unverified completion copy is rejected before a card is shown.

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
| 1.3 | July 10, 2026 | Added guarded unresolved-language planning, unified composer tools, inline compact replies/receipts, loaded-project status, and truthful voice gating without changing the compact deterministic write model. |
