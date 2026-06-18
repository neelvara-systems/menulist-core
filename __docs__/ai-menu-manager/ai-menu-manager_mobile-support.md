# AI Menu Manager - Mobile Support Assessment

**Status:** Required mobile support plan
**Decision:** Partial mobile support inside MobileShell with a guarded bottom-tab entry
**Last Updated:** June 18, 2026

---

## Mobile Relevance Decision

**Decision:** PARTIAL, but mandatory.

AI Menu Manager is highly relevant to mobile because owners make urgent menu corrections during business hours. However, not every AMM action belongs fully on mobile.

Mobile AMM must support fast operating actions and approvals. Heavy authoring/review work must remain controlled and may hand off to a desktop-first or full review surface.

---

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | PASS | Price, availability, restore, staff photo, and quick menu corrections can happen daily. |
| Speed | PARTIAL PASS | Approval cards and simple commands can finish in under 5 seconds; imports/image generation/theme review can take longer. |
| Touch | PASS for cards | Cards, chips, bottom sheets, and approve/cancel controls work with thumbs. |
| Value | PASS | Owners need corrections and approvals while away from desk. |

Verdict: Mobile gets a purpose-built AMM approval and quick-command surface. It does not become a full desktop editor in a phone shell.

---

## Mobile Scope

Exact per-action mobile handling is tracked in [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). This file defines the mobile behavior rules; the checklist decides whether each action is a fast card, summary card, upload card, scope card, review card, native mobile screen, task card, or desktop/full-review handoff.

### Mobile Supported

- Open AMM from the `MobileShell` bottom tab bar when `ENABLE_AI_MENU_MANAGER`, `ENABLE_AI_MENU_MANAGER_MOBILE`, and menu-management permission allow it.
- Keep the More-screen Menu Manager entry as a shell-routed secondary entry point/search result.
- View pending approvals.
- Approve/cancel/edit light cards.
- Type short commands.
- Voice transcript input when flag is enabled.
- Approve price/availability only after clear before/after.
- Restore sold-out item.
- Mark manual task done.
- Approve/reject staff photo.
- Use generated image only from a prepared review card.
- Apply a prepared menu design preset card.
- See completion/failure receipts.

### Mobile Restricted

- Full menu import review.
- Batch image generation authoring.
- Deep prompt editing.
- Freeform theme exploration.
- Complex multi-outlet branch selection beyond prepared scope cards.
- Large bulk price review without strong summarized scope.
- Long history browsing.
- Direct AMM mutation of account profile, password, logout, billing, transactions, platform, reseller, and Answerlattice/internal screens.

Restricted actions can show a compact card with "Continue review" rather than forcing a cramped workflow.

## Mobile PWA Screen Coverage Sweep

The mobile PWA review found these action families that AMM must either support through existing paths or explicitly refuse:

| Mobile PWA screen/family | AMM coverage decision |
| --- | --- |
| `MobileShell` route map and callbacks | AMM must open through the guarded bottom tab and shell state/callbacks, not desktop route bypasses. |
| Mobile Menu | Item/category availability and visibility, import cancel, price-outlier review markers, preview, and print actions are valid AMM card candidates. |
| Mobile Project Selector | Project create/edit/duplicate/default/active/reset/delete, public content translation, copy link, preview, QR, and manage-items actions map to project metadata or project mutation adapters. |
| Basic Settings, Locale, Working Hours, Time Slots | Store profile, language/currency/timezone, hours, and time-slot preset actions need explicit store-level adapters. |
| Official Page, Advanced Settings, Business Attributes, Business Copy, SEO, Domain | Public presence, social links, feedback settings, business copy generation/translation, SEO, analytics, and domain actions must reuse existing `updateStore()` or domain APIs. |
| Customer App | PWA settings, app icon, and install-link share actions are standalone AMM action families using existing PWA DAL/browser-local share behavior. |
| Digital Screens | Screen status, screen link share, override, slide upload/caption/delete actions are standalone families using existing campaign/screen DAL. |
| Feedback | Inbox list, resolve/status, reply save, feedback link, and QR actions are standalone families using existing guest feedback DAL and browser-local share behavior. |
| POS Sync and Integrations | POS settings, secret rotation, test, setup-copy, and read-only integration status cards are supported only through existing POS/API/status paths. |
| Share screen | Menu link, official page QR, feedback QR, customer app link, menu kit, single asset, print templates, digital screen link, and POS setup copy should remain browser-local where possible. |
| Compliance Pages | Status, custom override, and reset cards use the existing `/api/compliance` flow; mobile already has `MobileCompliancePagesEditor`. |
| Communication Kit | Template generation, copy, WhatsApp/native share stay C0 local and can be rendered as compact AMM message cards. |
| Presence Monitor | Status, "I added it", and remove-confirmation actions reuse the existing desktop/mobile presence monitor and `updateMenuPresence()`. |
| Sharable Item Cards and Physical/Print Assets | Item cards, menu kit assets, print previews, table tents, and stickers remain browser-local/native-share cards. |
| Reviews/Reputation | Disabled today; AMM can show only blocked/manual cards until the review flags and production adapters are intentionally enabled. |
| Account, Billing, Transactions, Platform, Reseller, Answerlattice/internal | Direct AMM mutation is unsupported; AMM may explain or hand off to the existing screen only. |

### Mobile More Command Bridge

AMM recognizes owner commands that reference existing Mobile More screens and returns a precise registered action-family card or unsupported card instead of a generic item-change clarification.

This bridge covers:

- Business Profile, Brand Settings, Official Page, Social Media, Business Attributes, and Customer App.
- Search & Discovery, Domain, Business Copy, SEO, Analytics, Discovery Setup, and Integrations.
- Language & Region, Working Hours, Time Slots, Temporary Status, Locations, Staff, Roles, Billing, Transactions, Business Health, Past Activity, Help, Assets, Print Menu, Feedback, Digital Screens, and POS Sync.
- Platform, Reseller, and Answerlattice/internal screens as blocked/explanation cards only.

The bridge is intentionally handoff-only for mutations. It does not write store, staff, billing, location, platform, reseller, Answerlattice, POS, or external integration truth. Known screen/action families still use exact action types such as `store_working_hours_update`, `menu_temp_status_set`, `customer_app_settings_update`, `digital_screen_status_card`, `billing_screen_open`, and `print_menu_open`. `system_manual_task_create` is reserved for true ad hoc tasks that do not map to a known MenuList family.

Broad More commands that have fixed manual choices use the same guided-choice pattern as Menu Design:

- "Change working hours" asks for Today only, All weekdays, Weekend, or Closed today.
- "Set temporary status" asks for Closed today, Holiday, Special hours, or Back open.
- "Change time slots" asks for Breakfast, Lunch, Dinner, or Happy hour.
- "Setup customer app" asks for Copy install link, Share app link, Open app settings, or Update app icon.
- "Show menu on TV" asks for Copy screen link, Open screen setup, Update slides, or Pause screen.
- "Manage feedback" asks for Copy feedback link, Download feedback QR, Open feedback inbox, or Prepare reply.

Choosing one option only drafts the next owner message. It does not execute, approve, or write anything until the owner sends that message and finishes the existing flow.

When the owner sends "Copy menu link", "Download menu QR", "Copy official page link", "Download official page QR", "Copy feedback link", "Download feedback QR", "Copy customer app install link", "Copy digital screen link", "Copy POS setup details", "Copy POS technical summary", or "Download POS sample payload", AMM prepares the matching browser-local export card for the selected context. The card shows copy/open/download controls where available. This stays inside `MobileShell`, creates no menu-truth write, and does not store generated QR image or text export data in Firestore.

The suggestion launcher uses the same two-layer pattern for owner-friendly discovery:

- the empty mobile state may show a short set of starter cards for frequent daily work: store closed today, working hours, and sold-out/time-slot drafts.
- layer 1 shows the action area, such as menu style, working hours, temporary status, customer app, digital screens, feedback, or print/export.
- layer 2 shows only the relevant choices, such as Premium & Minimal, List/Grid/Card, Closed today, Copy screen link, or Download feedback QR.
- starter cards and final sheet selections fill the composer; they do not send, approve, or mutate data.
- the mobile version stays inside the `MobileShell` bottom sheet with large touch rows and back navigation.

The composer Work on picker is separate from suggestions:

- it opens as a MobileShell bottom sheet.
- its launcher sits beside Suggestions as a composer tool, not inside the suggestion list.
- opening Work on closes the suggestion sheet, and opening Suggestions closes Work on.
- top-level targets are Item, Category, Menu design, Digital menu, Official page, Digital screens, Feedback, and Store settings.
- Item supports multi-select for selected-item operations, such as choosing three tea items and sending "increase price by 10".
- Category supports one selected category so commands such as "deactivate" or "increase price by 10" resolve against that category.
- Item/category lists use compact rows and only show search for long lists or active search text, so short category lists do not waste screen height.
- selecting context only affects the next message text; no card, approval, Firestore write, or mutation happens until the owner sends the message.

---

## MobileShell Contract

AMM must stay inside the owner mobile PWA shell.

Implementation must:

- add a guarded `MobileShell` bottom tab for Menu Manager and keep any secondary More/Menu entry shell-routed.
- use existing mobile providers for selected project/store context.
- show the current selected project and allow project switching through existing mobile project selector behavior before preparing project-scoped cards.
- avoid `window.location` route bypass from mobile tab actions.
- use `antd-mobile` and Tailwind for mobile UI.
- use shared DAL/hooks/action adapters.
- use `react-icons/lu` only.

Reference rule: `src/components/mobile/screens/MobileMoreScreen.tsx` already gates sub-screens by feature flags and permissions, with entries such as Business Health, Print Menu, Special Menus, and More modules. Evidence: `src/components/mobile/screens/MobileMoreScreen.tsx:480`.

---

## Mobile UI Shape

```text
MobileShell
  -> AMM screen
     -> compact store/project bar
     -> project selector for current menu context
     -> pending card stack
     -> conversation snippets
     -> bottom composer
     -> bottom-sheet card actions
```

Rules:

- 44px minimum touch targets.
- No dense tables.
- No side-by-side diff tables on phone.
- Use before/after rows.
- Use bottom sheets for edit/scope/time.
- Show contextual suggestion groups in a bottom sheet; selecting a suggestion fills the composer and does not submit.
- Clarification card option rows also fill the composer only; they do not approve or execute work.
- Optimistic UI only after backend accepts approval lock.
- Non-blocking retry for failed completion.
- No red/alarming copy unless destructive action requires it.

---

## Mobile Card Behavior

| Card | Mobile behavior |
| --- | --- |
| Price update | Show item, old price, new price, scope, approve/cancel; heavy confirmation for large/all-outlet changes. |
| Availability | One-tap mark unavailable/restore with expiry/time chip. |
| Menu design update | Show selected preset and small preview thumbnail; Apply or Try another. |
| Generated image | Review variant, Use on menu, Reject, Regenerate only if flag allows. |
| Outlet generated image | Show only policy-allowed local-only items unless inherited image override is enabled. |
| Menu import | Show "Review needed" summary; full review surface may open separately. |
| Upload cleanup | Remove draft upload or clear unprocessed queue only while it is still browser-local. |
| Project active status | Heavy card with linked-outlet/deactivation guard and explicit menu name. |
| Outlet customization | Scope card that shows outlet-only impact and respects outlet policy. |
| Store/OBP updates | Compact before/after card; high-risk address, contact, public link, and action toggles need stronger confirmation. |
| Store profile/locale/hours/time slots | Compact before/after card; locale, timezone, business-day, and delete-preset changes need clear public impact wording. |
| Domain | Status/check card for availability and verification; connect/remove require high or destructive confirmation and existing API use only. |
| Customer app | Show current app setting/icon/link and proposed change; install-link sharing stays browser-local/native share. |
| Digital screen | Status/link/override cards stay compact; slide upload/delete requires media preview and explicit confirmation. |
| Feedback inbox | Show bounded recent feedback only; resolve/reply cards must show customer message context without unbounded history reads. |
| POS sync/integration | POS changes require guarded cards; integration status is read-only unless a real guarded integration is already present. |
| Share/export | Use browser-local or native share/download flows; do not create Firestore proposal detail unless owner explicitly asks AMM to track it. |
| Compliance pages | Show status and before/after custom override text; reset requires destructive confirmation. |
| Communication templates | Show short message preview with Copy and Share; no Firestore write by default. |
| Presence monitor | One-tap confirmation/removal card with the exact surface name and current tracked state. |
| Item share card/physical surfaces | Show preview thumbnail when available; Share/Download remain local/native actions. |
| Review reply suggestion | Disabled card or manual-task card until review flags and external-posting boundary are intentionally enabled. |
| Staff photo approval | Swipe/stack photo cards with approve/reject. |
| Publish failure | Show surface status and retry/manual task. |
| Rule suggestion | Requires clear wording and explicit owner approval. |

---

## Mobile Data And Cost

Mobile must not create separate AMM collections or mobile-only DAL.

Mobile reads:

- current compact session summary.
- selected proposal detail when opened.
- current project from existing mobile provider/cache.
- selected store/project context from existing mobile shell/providers.

Mobile writes:

- proposal action through AMM API.
- project mutation through shared existing path when card executes client-side.
- store, PWA, feedback, screen, domain, and POS mutations only through their existing DAL/API paths.
- compliance mutations only through `/api/compliance`; presence monitor changes only through `updateMenuPresence()`.
- no local Firestore history writes outside shared repository.

No real-time listener is required for the whole AMM screen. Poll only active job cards when necessary, and stop polling when the screen is backgrounded.

Browser-local mobile exports and shares should stay local (`C0 local`) unless the owner explicitly asks AMM to keep a durable task, proposal, or receipt. This applies to QR downloads, menu kits, feedback links, customer app install links, digital screen links, print assets, item share cards, customer communication templates, physical surface exports, POS setup copy, POS technical summary copy, and sample payload downloads.

---

## Mobile Copy

Use short action labels:

- Apply
- Edit
- Cancel
- Use image
- Try again
- Done
- Undo
- Change time
- Change scope

Avoid:

- technical confidence text.
- model names.
- token/cost details.
- AI-first marketing wording.
- long explanations.

---

## Mobile QA Requirements

- [ ] AMM opens inside MobileShell, not a desktop route bypass.
- [ ] Back navigation returns to the prior mobile sub-screen.
- [ ] Composer remains reachable above keyboard.
- [ ] Cards do not overlap fixed bottom composer.
- [ ] All buttons meet 44px minimum target.
- [ ] Price approval shows old/new/scope before action.
- [ ] Availability action completes with optimistic feedback.
- [ ] Image card remains usable on mid-range Android viewport.
- [ ] Failed approval returns retry/cancel without losing card.
- [ ] Screen does not load full history by default.
- [ ] Every owner mobile PWA screen family is represented in the action checklist or explicitly unsupported.
- [ ] Account, billing, platform, reseller, and Answerlattice/internal screens cannot be mutated by AMM.
- [ ] Share/export cards preserve browser-local/native-share behavior unless a durable proposal is required.
- [ ] Domain, customer app, digital screen, feedback, POS, and integration actions use existing DAL/API paths only.
- [ ] Compliance, communication, presence, item-card, physical-surface, and review-gated actions are represented in the action checklist.
