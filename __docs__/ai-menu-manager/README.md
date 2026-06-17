# AI Menu Manager - Documentation Hub

> **Feature:** AI Menu Manager
> **Internal slug:** `ai-menu-manager`
> **Product:** MenuList
> **Status:** Initial implementation validated - feature flagged off by default
> **Last Updated:** June 17, 2026
> **Version:** 1.0

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

One-sentence product definition:

> Tell MenuList what changed. It prepares the update. You approve. The menu stays correct.

---

## Locked Product Boundary

AI Menu Manager is:

- a standalone MenuList feature, separate from Business Health.
- a chat-first work surface with card-native execution.
- an action registry over existing menu operations.
- an approval-safe route for price, availability, import, design, photo, image, special menu, publish, adapter-supported undo/rollback, staff, and rule actions.
- a voice-ready input surface because voice enters the same command pipeline as text.

AI Menu Manager is not:

- a successor to Business Health.
- a generic chatbot.
- a renamed Menu Command Center.
- a new menu data model.
- an analytics dashboard.
- a hidden AI write path.

---

## Architecture Overview

```text
Owner text / voice / upload / suggested action
  -> selected store and selected project context
  -> AMM command intake
  -> intent and entity resolution
  -> registered action adapter
  -> proposal card
  -> owner approval, edit, scope change, or cancel
  -> existing MenuList mutation path
  -> public cache, MOL, snapshots, publish/verification side effects
  -> receipt and compact history
```

The most important rule:

> AMM can talk naturally, but it can act only through registered, previewable, approved MenuList operations.

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
| Data model | Compact session/day docs, actionable proposal docs, Storage for heavy artifacts. |
| Firebase cost | Reads are cached and bounded; no per-token/per-message Firestore writes. |
| AI cost | Acceptable when bounded by safe mode, rate limits, capacity, and accounting. |
| Image generation | Generate draft images; owner must approve before menu use. |
| Voice | Voice input is an input adapter into the same command flow. |
| Mobile | Mobile supports fast cards and approvals inside MobileShell; heavy authoring stays controlled. |
| Business Health | Separate product surface; AMM may consume signals only through explicit action adapters. |

---

## Day-One Action Catalog

The production checklist for exact action types is [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). The docs define these action families from the start:

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
- staff and access requests through guarded APIs
- low-confidence clarification
- mixed-language command
- completion/failure receipt

Unsupported or unavailable external actions become manual-task/export cards, not fake automation.

---

## Feature Flag Plan

```ts
// src/config/features.ts
ENABLE_AI_MENU_MANAGER: false
ENABLE_AI_MENU_MANAGER_MOBILE: false
ENABLE_AI_MENU_MANAGER_VOICE_INPUT: false
ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS: false
ENABLE_AI_MENU_MANAGER_RULES: false
ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES: false
AI_MENU_MANAGER_SESSION_STORAGE_MODE: "daily_compact"
```

The feature is designed as a complete day-one contract. Flags are safety controls, not scope-reduction switches.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | June 17, 2026 | Initial docs-first contract created from the captured ChatGPT conversation, current Codex planning discussion, and MenuList codebase cross-check. |
