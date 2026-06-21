# AI Menu Manager - Test Cases

**Status:** Current QA plan
**Audience:** Engineering, QA, product review
**Last Updated:** June 20, 2026

---

## Test Goal

AI Menu Manager must prove that a natural owner command becomes a bounded MenuList operation, not an untracked chat answer.

Every passing test should confirm four things:

1. AMM understood enough context to prepare the right card.
2. The card shows the owner what will change before risky work applies.
3. Approved work reuses the correct MenuList mutation path.
4. Firebase writes remain compact and bounded.

---

## Core Acceptance Matrix

| Area | Required result |
| --- | --- |
| Product boundary | AMM does not read or write Business Health action state as its own source of truth. |
| Action registry | Every executable card maps to one registered action adapter. |
| Manual parity | Every executable adapter has a manual equivalent or a documented manual-task fallback. |
| Approval safety | Risky changes cannot execute without approval. |
| Project truth | Menu changes preserve `updateProject()` side effects, cache invalidation, snapshots, and MOL behavior where applicable. |
| Firebase cost | Owner chat does not create one Firestore document per token, message fragment, model step, or card render. |
| Mobile | Mobile opens inside `MobileShell` and supports quick approvals without route bypasses. |
| Security | Protected endpoints validate session, tenant, payload, rate limit, and action authority. |

Current executable write boundary: QA treats `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` in `src/lib/ai-menu-manager/actionTypes.ts` as the current production executable client-project mutation list. The full action checklist remains the production catalog for supported, local, read-only, manual, blocked, and future adapter families. A checklist row marked as field coverage or future adapter work is not considered live executable until it appears in the executable export and has resolver/card/patch coverage.

---

## Command Intake Tests

### AMM-INTAKE-001: Single Item Price Update

**Given** an owner has a menu item named Masala Tea priced at Rs 15.
**When** the owner sends "Masala tea 20 now."
**Then** AMM creates an `item_price_update` proposal card with old price Rs 15 and new price Rs 20.
**And** the card requires owner approval.
**And** no project write occurs before approval.

### AMM-INTAKE-002: Ambiguous Item Name

**Given** the menu contains Veg Sandwich and Cheese Sandwich.
**When** the owner sends "Sandwich 80."
**Then** AMM creates a clarification card instead of a price card.
**And** the owner must choose the item before any proposal can be approved.

### AMM-INTAKE-003: Mixed-Language Command

**Given** the menu contains Masala Chai.
**When** the owner sends "Masala chai khatam hai."
**Then** AMM resolves the command to an availability proposal.
**And** the card still displays owner-readable English or localized copy according to the current app locale.

### AMM-INTAKE-003A: Deactivate Item Command

**Given** the menu contains an active item named Masala Tea.
**When** the owner sends "deactivate Masala Tea item."
**Then** AMM creates an `item_visibility_update` proposal card.
**And** the card shows current visibility `Shown`, new visibility `Hidden`, selected store/project scope, and approval controls.
**And** no project write occurs before approval.

### AMM-INTAKE-003B: Deactivate Category Command

**Given** the menu contains an active category named Desserts with three items.
**When** the owner sends "deactivate Desserts category."
**Then** AMM creates a `category_visibility_update` proposal card.
**And** the card shows current category visibility `Shown`, new category visibility `Hidden`, selected store/project scope, affected item count, and an impact warning.
**And** no project write occurs before approval.

### AMM-INTAKE-004: Unsupported External Publish Request

**When** the owner asks "Update this on Zomato."
**Then** AMM creates a destination-specific not-supported card such as `Zomato is not supported`, not a generic manual-task placeholder.
**And** the card has no `Mark done` control because MenuList cannot complete that external action.
**And** AMM does not mark external platform work complete.

### AMM-INTAKE-004B: General Question Is Out Of Scope

**When** the owner asks "What is today's weather?"
**Then** AMM creates a `system_unsupported_action` card.
**And** the card explains that Menu Manager handles MenuList work, not live weather, news, sports, market, or general chat questions.
**And** no external lookup, menu mutation, store mutation, or public truth change occurs.
**And** the card has no `Mark done` control.

### AMM-INTAKE-005: Selected Project Context

**Given** AMM is open with Store A and Project Lunch selected in the screen selectors.
**When** the owner sends "make masala tea 30."
**Then** AMM resolves the item only inside Project Lunch for Store A.
**And** the card shows Store A and Project Lunch as the action scope.
**And** no other project is loaded or mutated by default.

### AMM-INTAKE-006: All-Project Scope Requires Explicit Approval

**Given** the owner has multiple projects in the selected store.
**When** the owner sends "change this price in every menu."
**Then** AMM creates a scope card before any mutation.
**And** the card lists the affected projects.
**And** no cross-project write occurs until the owner approves that scope.

### AMM-INTAKE-007: Today Special Resolves To Smallest Matching Action

**When** the owner says "Add today special Rajma Chawal 129."
**Then** AMM resolves to `item_create` in the selected project with Today Special placement when available.
**When** the owner says "Create weekend special menu."
**Then** AMM resolves to `special_menu_create`.
**When** the owner says "Show today's special note."
**Then** AMM resolves to `menu_special_note_update`.
**And** ambiguous wording creates a clarification card before proposal creation.

### AMM-INTAKE-008: Featured Section Request

**Given** the selected project contains Cold Coffee.
**When** the owner sends "Show Cold Coffee in Featured section."
**Then** AMM resolves to `decision_blocks_update`.
**And** the card shows the selected store/project scope.
**And** the card says this changes only the Featured section, not normal menu order.
**When** the owner sends "Show Featured section" without an item name.
**Then** AMM prepares a `decision_blocks_update` card that enables Featured with automatic MenuList choice.

---

## Proposal Card Tests

### AMM-CARD-001: Price Approval Card

The card must show:

- item name.
- category.
- old price.
- new price.
- affected project/outlet scope.
- selected store and selected project.
- approval button.
- cancel/edit option.
- receipt expectation.

### AMM-CARD-002: Availability Card

The card must show:

- item name.
- current availability.
- proposed unavailable/available state.
- optional restore time.
- scope.
- customer-facing preview text.

### AMM-CARD-003: Image Draft Card

The card must show:

- generated image preview.
- item name.
- Use on menu.
- Download.
- Regenerate.
- Reject.
- approval state.

Using the image on the menu must require an explicit owner action.

### AMM-CARD-004: Theme Card

The card must show:

- current menu design state.
- proposed preset or setting changes.
- preview.
- Apply this.
- Cancel.

The card must map to existing menu design settings, not a separate theme model.

Theme/layout/color/display clarification behavior:

- "change the theme" shows the existing presentation tone choices: Clean & Calm, Warm & Inviting, Premium & Minimal, Bold & Social, Fast & Direct.
- "change menu layout" shows List, Grid, and Card.
- "change theme color" shows the existing brand color presets.
- "change display options" shows show/hide choices for item prices, item images, category icons, and category tabs.
- Choosing any option drafts the next owner message; sending that message creates the proposal card.

### AMM-CARD-004A: Featured Section Card

The card must show:

- selected menu.
- current Featured choice or automatic choice.
- proposed Featured choice or automatic choice.
- section state before and after.
- note that normal menu order is unchanged.
- approval button and cancel option.

The card must map to existing `menuSettings.decisionBlocks`, not a separate Featured source of truth.

### AMM-CARD-005: Multi-Outlet Scope Card

For a linked outlet or HQ menu, the card must show:

- current outlet/project scope.
- affected outlets.
- whether the action applies to one outlet, selected outlets, or all linked outlets.
- approval before any multi-outlet propagation.

---

## Execution Tests

### AMM-EXEC-001: Approved Price Update Uses Existing Project Path

**When** the owner approves a price card.
**Then** the approved patch must apply through the existing project update path or a formally equivalent execution path.
**And** customer-facing cache invalidation runs.
**And** Menu Observation Layer writes only according to existing feature flags.
**And** the compact session receipt records completion. Server-backed adapters may also record completion on the proposal document.

### AMM-EXEC-002: Rejected Card Does Not Mutate Project

**When** the owner rejects a proposal.
**Then** the proposal status becomes `rejected`.
**And** no project write occurs.
**And** no public cache invalidation is triggered.

### AMM-EXEC-002A: Featured Section Update Uses Existing Project Path

**When** the owner approves a `decision_blocks_update` card.
**Then** AMM applies `menuSettings.decisionBlocks` through the existing project update path.
**And** customer-facing cache invalidation runs through the same path as manual Featured section changes.
**And** the receipt states what changed and where.

### AMM-EXEC-003: Expired Card Cannot Apply

**Given** a card has expired.
**When** the owner taps Apply.
**Then** AMM revalidates current project truth.
**And** returns an expired/conflict state instead of writing stale data.

### AMM-EXEC-004: Conflict Recheck Before Apply

**Given** a staff member or manual editor changed the same item after AMM prepared a card.
**When** the owner approves the older card.
**Then** AMM detects the version mismatch.
**And** the card asks the owner to review the current value.

### AMM-EXEC-005: Client Execution Directive Integrity

**Given** AMM returns a client execution directive for a project mutation.
**When** the client completes the proposal.
**Then** the completion route verifies proposal status, idempotency key, action type, selected store/project scope, `executionId`, `patchHash`, and resulting project marker.
**And** a modified patch, stale base marker, or mismatched scope cannot mark the proposal executed.

### AMM-EXEC-006: Rollback Proposal

**Given** a completed action has rollback support.
**When** the owner asks to undo it.
**Then** AMM creates a rollback proposal using the stored before/after state.
**And** rollback approval is required before execution.

### AMM-EXEC-007: Unsupported Rollback Does Not Overpromise

**Given** a completed action does not store enough before/after state for safe reversal.
**When** the owner asks to undo it.
**Then** AMM creates a manual task or explanation card.
**And** AMM does not show "rollback available" or apply a reverse mutation.

---

## Existing Flow Parity Tests

The parity matrix must be generated from [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). The table below is a minimum family-level sweep, not a substitute for the checklist.

| AMM action | Manual equivalent to verify |
| --- | --- |
| Price update | Project editor item price edit and save. |
| Bulk price update | Existing bulk/editor operation logic where available. |
| Availability | Item availability controls. |
| New item | Project editor item creation. |
| Today special | Single-item special resolves to item creation/placement, scheduled alternate menu resolves to special menu, banner text resolves to special note. |
| Offer/combo | Existing offer/special logic or manual-task fallback. |
| Description repair | Existing AI enhancement/accounting path where reused. |
| Image generation | `/api/image-generation` safe mode, rate limit, capacity, accounting. |
| Outlet image generation | Existing local-only item filtering and inherited image override policy. |
| Image apply | Existing project image field update and cache invalidation. |
| Theme update | Existing menu design settings and presets. |
| Import review | Existing menu extraction job and review flow. |
| Import identity acceptance | Existing upload identity modal and `updateStore()` path. |
| Import creates new project | Existing identity mismatch create-new-menu path and `addProject()` guard. |
| Upload queue cleanup | Existing local remove/clear-unprocessed actions without persisting menu truth. |
| Project active status | Existing project form active toggle and `setProjectActive()` linked-outlet guard. |
| Project cover image | Existing project image resolve/save path. |
| Publish | Existing publish/snapshot/cache path. |
| Multi-outlet update | Existing outlet save and propagation rules. |
| Outlet customization | Existing Store Customization modal and outlet override policy. |
| Store/Official Business Page update | Existing `updateStore()` summary/cache path. |
| Mobile store profile/locale/hours/time slots | Existing mobile Basic Settings, Locale, Working Hours, Time Slots screens and store DAL. |
| Mobile public presence/domain/SEO/analytics | Existing mobile Official Page, Advanced Settings, Business Attributes, Business Copy, SEO Analytics, Domain screens and store/API paths. |
| Mobile customer app | Existing PWA settings/icon/install-link DAL and browser-local share behavior. |
| Mobile digital screens | Existing screen state, override, slide upload/caption/delete, copy/open link paths. |
| Mobile feedback | Existing guest feedback list/detail/status/reply/link/QR paths. |
| Mobile POS/integrations | Existing POS sync settings/test/setup-copy and read-only integration status paths. |
| Mobile share/export/menu kit | Existing mobile share/download/native-share behavior without extra Firestore writes. |
| Compliance pages | Existing `/api/compliance` status, override, and reset behavior. |
| Customer communication templates | Existing browser-local `generateMessageTemplates()` copy/share behavior. |
| Sharable item cards | Existing item card canvas download/native-share fallback. |
| Menu presence monitor | Existing desktop/mobile presence monitor and `updateMenuPresence()` path. |
| Physical/print surface exports | Existing menu kit, print template preview/download, table tent, and sticker export utilities. |
| POS support helpers | Existing copy secret, prepare instructions, copy technical summary, and sample payload download actions. |
| New item metadata/image editing | Existing accounted AI APIs with draft-before-apply behavior. |
| Reviews/reputation guard | Existing disabled feature flags and guarded/manual fallback behavior. |
| Staff/access update | Existing guarded staff APIs. |

### AMM-MOBILE-MORE-001: Existing More Flow Handoff

**When** the owner says "Open customer app settings", "Change working hours for today", "Open digital screens", "Open print menu", or "Open billing".
**Then** AMM creates the exact registered action-family card, such as `customer_app_settings_update`, `store_working_hours_update`, `digital_screen_status_card`, `print_menu_open`, or `billing_screen_open`.
**And** the card names the exact existing More path where the owner should finish the work.
**And** no store, staff, billing, screen, POS, or public truth is mutated from the card.
**And** known MenuList flows must not fall back to `system_manual_task_create`.

### AMM-MOBILE-MORE-002: Internal More Flow Block

**When** the owner says "Open platform tenants", "Open reseller dashboard", or "Open Answerlattice intake".
**Then** AMM creates a `system_unsupported_action` card.
**And** the card explains that internal platform/reseller/Answerlattice screens cannot be operated by Menu Manager.
**And** the owner is directed to use the existing internal screen with the required permissions.

### AMM-MOBILE-MORE-003: Design Navigation Versus Design Mutation

**When** the owner says "Open menu design".
**Then** AMM creates a `menu_design_settings_open` card for `More > Menu Design`.
**When** the owner says "Use grid layout", "Set theme color to Gold", or "Make menu premium".
**Then** AMM creates the matching registered menu design proposal card.

### AMM-MOBILE-MORE-004: Guided More Choices

**When** the owner says "Change working hours", "Set temporary status", "Setup customer app", "Show menu on TV", or "Manage feedback".
**Then** AMM creates a `system_clarification_request` card with bounded option rows.
**And** choosing an option drafts a follow-up owner command instead of executing immediately.
**And** the drafted command resolves to the exact registered action-family card that names the existing Mobile More path.
**And** no store, screen, feedback, PWA, or temporary-status truth is mutated by the guided choice itself.

### AMM-DOMAIN-ANSWER-001: Selected Menu Read-Only Answers

**When** the owner asks "What should I fix today?", "Which items have no photos?", "Which items are missing descriptions?", "What items are unavailable?", or "Is my menu ready to share?".
**Then** AMM creates a `system_context_answer` card.
**And** the card is `read_only_card` with no approve or mark-done action.
**And** the answer is built from the loaded selected project context packet only.
**And** there is no provider call, external lookup, proposal doc write, project/store mutation, or extra Firestore read.
**And** any suggested reply only drafts the next owner command; the owner must send it before a proposal card is prepared.

### AMM-DOMAIN-ANSWER-002: Domain Answers Do Not Capture Direct Commands

**When** the owner sends direct commands such as "Selected items: Masala Tea, Cold coffee. increase price by 10", "increase all drinks price by 10", "Cold coffee sold out", or "Generate image for Masala Tea".
**Then** the matching registered action resolver wins before `system_context_answer`.
**And** risky work still creates proposal/manual-task cards according to the action registry.

### AMM-MOBILE-MORE-005: Exact Local Export Cards

**When** the owner says "Copy menu link" or "Download menu QR".
**Then** AMM creates `menu_share_copy_link` or `menu_qr_download` with Copy, Open, and Download QR controls when the loaded selected-project context has a public menu link.
**And** AMM creates the same exact action type as a setup handoff only when the loaded context has no public menu link.

**When** the owner says "Copy official page link" or "Download official page QR".
**Then** AMM creates `public_presence_link_share` or `public_presence_qr_download` with Copy, Open, and Download QR controls when the loaded store context has an official page link.
**And** AMM creates the same exact action type as a setup handoff only when the loaded context has no official page link.

**When** the owner says "Copy feedback link" or "Show feedback QR".
**Then** AMM creates `feedback_link_share` or `feedback_qr_download` with Copy, Open, and Download QR controls.

**When** the owner says "Copy customer app install link".
**Then** AMM creates `customer_app_install_link_share` with Copy, Open, and Download QR controls when the loaded store context has a public link.
**And** AMM creates `customer_app_settings_update` only when the public link is missing and the owner must finish setup.

**When** the owner says "Copy digital screen link".
**Then** AMM creates `digital_screen_link_share` with Copy, Open, and Download QR controls when the loaded store context has a screen token.
**And** AMM creates the same exact action type as a setup handoff only when the loaded context has no screen token.

**When** the owner says "Copy POS setup details", "Copy POS technical summary", or "Download POS sample payload".
**Then** AMM creates `pos_sync_setup_info_copy`, `pos_sync_technical_summary_copy`, or `pos_sync_sample_payload_download`.
**And** those cards expose Copy text and/or Download text controls without creating a Firestore proposal doc.

---

## Firebase Cost Tests

### AMM-COST-001: Session Storage Is Compact

**When** an owner sends multiple messages in one AMM session.
**Then** AMM writes compact session summaries according to the configured storage mode.
**And** AMM does not create a Firestore document per token or model step.

### AMM-COST-002: Card Writes Are Bounded

Normal deterministic selected-project cards must update the compact daily session doc rather than creating a proposal document per card.
Server-backed cards may create or update one proposal document when provider secrets, import/upload jobs, external policy, or durable ledger detail requires it.
Status transitions should update the same compact session/proposal record unless retention/audit requirements explicitly require a separate artifact.

### AMM-COST-003: Heavy Artifacts Go To Storage

Generated images, import files, model traces enabled by debug flags, and large review payloads must use Firebase Storage or existing artifact stores.
Firestore documents should store pointers and compact summaries.

### AMM-COST-004: Context Packet Cache Hit

Repeated commands against the same unchanged project should reuse the cached context packet where possible.
The test should verify the cache key includes tenant, store, project, and project update marker/hash.

### AMM-COST-005: No Listener On Growing History

The UI should read bounded inbox/session data.
It must not attach an unbounded listener to all historical AMM proposals or sessions.

### AMM-COST-006: Compact Array Caps

Session and proposal documents must enforce caps for compact messages, pending card summaries, pending operations, receipt summaries, artifact refs, and idempotency keys.
When a cap is exceeded, old detail must move to Storage or remain on proposal detail docs instead of growing the compact document.

### AMM-COST-007: Active Inbox Does Not Scan Old Sessions

Opening AMM with unresolved cards from a previous day must not scan historical daily session docs.
The unresolved cards must be available through the current compact summary, deterministic active-inbox summary, or direct bounded proposal reads.

### AMM-COST-008: Retry Does Not Duplicate Proposals

Submitting the same command twice with the same idempotency key must not create duplicate compact pending operations or proposal docs.
Approving the same card twice with the same idempotency key must not execute the project mutation twice.

### AMM-COST-009: Completion Uses Loaded Session Snapshot

For normal deterministic selected-project cards, completion and cancel must reuse the compact session already loaded in the open AMM screen.
They must not transaction-read the session again before writing the receipt/pending-card update.

### AMM-COST-010: Related Approved Patches Merge

When an owner approves a safe related batch, AMM should produce one project mutation instead of many sequential saves.
The test should cover bulk price, batch availability, and description repair.

### AMM-COST-010: Job Polling Is Bounded

Active job cards may poll while visible.
Polling must stop when the card is hidden, the screen is backgrounded, the route changes, or the job reaches terminal status.

### AMM-COST-011: Storage Lifecycle Preferred

Generated drafts, debug artifacts, raw provider traces, and upload review artifacts must have a retention marker.
Cleanup must use Storage lifecycle rules or existing consolidated cleanup discipline, not a standalone AMM scheduler.

### AMM-COST-012: Mobile Local Actions Stay Local

Mobile QR, menu kit, print asset, customer app link, feedback link, digital screen link, POS setup copy, and native share/download actions must not create Firestore writes unless a durable AMM proposal/receipt is explicitly required.

Feedback link and QR acceptance: "Copy feedback link" must create a `feedback_link_share` card with the selected menu feedback URL, Copy link, Open link, and Download QR controls. "Show feedback QR" must create a `feedback_qr_download` card with the same local controls. Neither flow may mutate menu truth or store generated QR image data in Firestore.

### AMM-COST-013: Mobile Operational Actions Reuse Existing Docs

Store, domain, customer app, digital screen, feedback, POS, and integration-status actions must reuse existing MenuList DAL/API documents.
The test fails if implementation creates a mobile-only AMM mirror collection for these action families.

### AMM-COST-014: Feature-Sweep Local Actions Stay Local

Communication templates, sharable item cards, menu kit asset share, print template preview/download, table tent/sticker downloads, POS technical summary copy, and sample payload download must stay `C0 local`.
The test fails if these actions create Firestore proposal detail by default instead of using browser-local/native-share behavior.

### AMM-COST-015: Guarded Operational Actions Do Not Poll Or Mirror

Compliance status, review status, presence status, and POS instruction state must reuse existing guarded APIs/store fields.
The test fails if AMM adds a second operational mirror collection or repeated polling loop for these status cards.

---

## Security Tests

### AMM-SEC-001: Command API Requires Auth

Unauthenticated requests to the command endpoint return unauthorized.
No AI call or Firestore write occurs.

### AMM-SEC-002: Tenant Isolation

An owner cannot submit, read, approve, or cancel AMM proposals for another tenant/store/project.

### AMM-SEC-003: Payload Validation

Invalid action type, malformed card payload, missing project ID, unsupported scope, and oversized prompt all fail before AI/provider calls.

### AMM-SEC-004: Approval Authority

Staff-originated requests that require owner approval cannot self-approve unless the current role already has the matching MenuList authority.

### AMM-SEC-005: Rate Limit Before Expensive Work

Image generation, import analysis, provider calls, and batch actions must be rate-limited before external or expensive work starts.

### AMM-SEC-006: Safe Logging

Logs must not include raw owner prompts when they may contain private details, secrets, phone numbers, payment details, or staff/customer data.
Logs should use proposal IDs, action types, tenant IDs, and redacted summaries.

---

## Mobile Tests

### AMM-MOB-001: MobileShell Entry

AMM opens inside `MobileShell` from the relevant owner mobile entry point.
When mobile flags and menu-management permission allow it, AMM appears as the guarded Menu Manager bottom tab.
Back navigation returns to the previous shell screen.

### AMM-MOB-002: Composer Keyboard Safety

The composer stays usable when the mobile keyboard opens.
Cards do not hide behind the composer.

### AMM-MOB-003: Touch Target Size

Apply, Cancel, Edit, Regenerate, Reject, Use image, and Done controls meet 44px minimum touch target requirements.

### AMM-MOB-004: Quick Approval

Mobile can approve a prepared low-complexity card such as availability or single price after showing before/after details.
Mobile can also approve a `decision_blocks_update` Featured section card after showing the selected menu, current Featured choice, proposed Featured choice, and unchanged normal menu order.

### AMM-MOB-005: Heavy Review Routing

Complex import review, large image batches, and deep theme comparison show a controlled review screen rather than squeezing dense desktop UI into mobile.

### AMM-MOB-006: Shell-Routed Mobile Actions

Mobile AMM actions launched from More, Menu, Share, Customer App, Digital Screens, Feedback, POS, or Project Selector remain inside `MobileShell` state/callback routing.
No action opens a desktop route through `window.location` as its primary mobile path.

### AMM-MOB-007: Mobile Action Checklist Coverage

Every owner mobile PWA screen family is represented in `ai-menu-manager_action-type-checklist.md` as supported, read-only/manual-task, or explicitly unsupported.
Adding a new mobile owner screen requires updating the checklist in the same change if AMM could reasonably become an alternate entry point.

### AMM-MOB-008: Unsupported Account And Internal Surfaces

Account profile/password/logout, billing, transactions, platform, reseller, Answerlattice, and internal screens cannot be directly mutated by AMM.
AMM may create an explanation or handoff card only.

### AMM-MOB-009: Local Share And Export Cost

Mobile QR, menu kit, print asset, customer app link, feedback link, digital screen link, POS setup copy, and native share actions stay browser-local unless the owner explicitly asks AMM to retain a durable proposal/receipt.

### AMM-MOB-010: Operational Mobile Paths Reuse Existing APIs

Domain, customer app, digital screen, feedback, POS, and integration actions use existing DAL/API paths only.
The test should fail if an implementation introduces a separate mobile AMM collection or direct Firestore write path for these actions.

---

## Image Flow Tests

### AMM-IMG-001: Generate Draft Image

**When** the owner asks for an image for a menu item.
**Then** AMM calls the existing image generation path where enabled.
**And** generated output is a draft artifact.
**And** the public menu image does not change before approval.

### AMM-IMG-002: Apply Generated Image

**When** the owner selects Use on menu.
**Then** AMM creates or executes an approved image apply action.
**And** the item image field updates through the project mutation path.
**And** public cache invalidation runs.

### AMM-IMG-003: Reject Generated Image

Rejecting a generated image marks the artifact rejected and keeps the project unchanged.

### AMM-IMG-004: Outlet Image Governance

**Given** the selected project is a linked outlet project.
**When** the owner asks AMM to generate or apply an image for an inherited or overridden item.
**Then** AMM must respect the same local-only filtering and inherited image override policy as the existing image generation UI.
**And** AMM must create a blocked/manual-review card instead of bypassing the policy.

---

## Import Flow Tests

### AMM-IMP-001: Upload Reuses Extraction Jobs

AMM upload/import cards must reuse the existing menu extraction job API and destination rules.

### AMM-IMP-002: Existing Active Job Reuse

When the same destination has an active job, AMM should reuse or surface that job according to existing extraction behavior instead of creating duplicate processing work.

### AMM-IMP-003: Review Before Apply

Extracted menu changes remain in review until owner approval.
AMM must not auto-overwrite the live menu from an upload.

---

## Rule Tests

### AMM-RULE-001: Rule Suggestion Requires Owner Approval

When AMM detects a repeated pattern, it may suggest a rule.
The rule is not active until the owner approves the rule card.

### AMM-RULE-002: Rule Execution Creates Proposal Or Receipt

An approved rule must still produce an auditable proposal or receipt according to the action risk level.

### AMM-RULE-003: Rule Kill Switch

Disabling `ENABLE_AI_MENU_MANAGER_RULES` stops rule suggestion and rule execution while keeping normal AMM cards usable.

---

## Regression Tests

- Suggestion chooser selection fills the composer and does not prepare a card until the owner presses Send.
- Empty-state starter cards prioritize frequent daily operations: Store closed today, Change working hours, and a contextual sold-out item when available. They fill the composer or open a second-layer suggestion choice and do not prepare a card until the owner presses Send.
- Suggestion chooser groups are contextual to the selected menu and include quick fixes, promotion, photos/content, style, and publish/import where relevant.
- Suggestion chooser supports a two-layer guided flow for settings-style work: the owner first chooses the action area, then chooses the exact option such as Premium & Minimal, Grid layout, Closed today, Copy screen link, or Download feedback QR.
- Moving between suggestion layers is local UI state only and creates zero Firebase reads or writes.
- Work on context picker selection fills no card by itself and creates zero Firebase reads or writes.
- Work on > Item supports multi-select. Selecting three items and sending "increase price by 10" creates one bulk price proposal with old/new rows for the selected items only.
- Work on > Category supports one selected category. Sending "deactivate" creates a category visibility proposal for that category; sending "increase price by 10" creates a category-scoped bulk price proposal.
- Work on item/category lists use compact rows and do not show a search input for short lists; search appears for longer lists or active search text.
- Desktop suggestion chooser stays inside the Menu Manager chat frame as an inline tray and does not open a page-level drawer over the dashboard.
- Desktop Work on picker stays inside the Menu Manager chat frame near the composer and does not open a page-level drawer.
- Desktop and mobile Work on/Suggestions surfaces are mutually exclusive: opening one closes the other, including when a nested suggestion layer is active.
- Mobile suggestion chooser remains a MobileShell bottom sheet with large touch rows.
- Mobile Work on picker remains a MobileShell bottom sheet with large touch rows.
- Mobile suggestion chooser shows back navigation from the second layer and never routes out of `MobileShell`.
- Vague choice commands such as "change the theme", "generate image", or "promote this item" create clarification cards with selectable option rows instead of generic dead-end text.
- Selecting a clarification option row fills the composer and does not approve, complete, or execute anything until the owner sends the drafted message.
- Card Edit fills the composer with an owner-readable draft command and leaves the pending card unchanged unless the owner sends/cancels separately.
- Business Health dashboard still loads without AMM data dependencies.
- Menu Command Center still applies its supported operations.
- Existing project editor save flow still invalidates public cache.
- Existing image generation page/API still works without AMM enabled.
- Existing extraction job creation still works without AMM enabled.
- Existing mobile menu editor still works without AMM enabled.

---

## Verification Commands

Docs-only verification:

```bash
git diff --check
```

Implementation verification target:

```bash
npm run verify:ai-menu-manager
```

Required implementation checks:

- feature flags exist.
- registry metadata covers every row in `ai-menu-manager_action-type-checklist.md`.
- current executable writes match `AI_MENU_MANAGER_EXECUTABLE_ACTIONS`.
- every action in `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` has resolver fixture coverage and approved-patch verification.
- every adapter has manual parity.
- every executable adapter has an approval policy.
- every adapter cost class and mobile handling matches the checklist.
- every protected route has auth, tenant validation, Zod validation, and rate limiting where required.
- project writes preserve cache invalidation.
- compact session/proposal arrays enforce max lengths.
- deterministic command, completion, and cancel use the loaded compact session snapshot instead of extra AMM session transaction reads.
- retry-safe command/proposal/approval paths do not duplicate writes.
- active inbox loading does not scan historical sessions.
- active job polling is bounded and stops on hidden/backgrounded state.
- AMM disabled state hides UI and blocks write routes.
