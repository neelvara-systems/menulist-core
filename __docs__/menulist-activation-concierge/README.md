# MenuList Activation Concierge - Documentation Hub

**Project:** MenuList Activation Concierge
**Status:** Runtime foundation implemented on existing MenuList activation/discovery surfaces
**Created:** June 24, 2026
**Owner:** Danny / MenuList
**Audience:** Internal product, engineering, growth, and support

---

## What This Is

Activation Concierge is the MenuList-side workflow that turns interest into a published customer link and two active customer surfaces.

It is the product-side answer to the SignalDesk distribution research:

```txt
source received
-> preview prepared
-> owner approves
-> customer link published
-> QR / WhatsApp / Google/Profile / Instagram / staff surface activated
-> proof and outcome recorded
```

SignalDesk may route targets into this flow and observe outcomes. SignalDesk must not write MenuList store, project, billing, or public truth.

## Current Codebase Truth

Activation Concierge should reuse current MenuList systems:

| Existing system | Current truth |
| --- | --- |
| Menu extraction pipeline | Public create-menu, owner upload, mobile upload, menu-link import, and messaging onboarding already share `menuImageProcessingJobs` and the shared extraction destination contract. See `__docs__/menu-extraction-pipeline/README.md:6`. |
| Public create-menu | `POST /api/public/create-menu` creates `publicMenuDrafts/{draftId}` and queues a durable extraction job. See `src/app/api/public/create-menu/route.ts:6`. |
| Claim/publish | `POST /api/public/create-menu/claim` converts a completed draft into tenant, store, project, summary, and URLs through an authenticated transaction. See `src/app/api/public/create-menu/claim/route.ts:134`. |
| Starter activation | Claimed public drafts already enter a 7-day starter activation with two-action distribution target. See `src/lib/onboarding/starterActivation.ts:3` and `src/lib/onboarding/starterActivation.ts:20`. |
| Success/share surfaces | The create-menu success page already copies the live link and starts WhatsApp share tracking. See `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx:57`. |
| Presence confirmations | Existing activation signals include QR, Menu Kit, WhatsApp, Google Business, Instagram Bio, and WhatsApp Profile. See `src/lib/onboarding/starterActivation.ts:22`. |

## Document Map

| Document | Purpose |
| --- | --- |
| [Specification](./menulist-activation-concierge_spec.md) | Product requirements, owner flow, boundaries, and activation definition. |
| [Implementation Plan](./menulist-activation-concierge_impl.md) | Codebase-fit technical blueprint for the runtime implementation. |
| [Marketing Notes](./menulist-activation-concierge_marketing.md) | Internal positioning and approved language for MenuList distribution. |
| [Website Copy](./menulist-activation-concierge_website.md) | Copy contract for existing public/funnel surfaces; no new standalone page by default. |
| [Help Doc](./menulist-activation-concierge_helpdoc.md) | Owner-readable setup guide. |
| [Firebase Cost Plan](./menulist-activation-concierge_firebase.md) | Read/write/storage impact and cost guardrails. |
| [Mobile Support](./menulist-activation-concierge_mobile-support.md) | Mobile admission, expected screens, and touch constraints. |
| [Test Cases](./menulist-activation-concierge_test-cases.md) | QA matrix for activation, safety, cost, and SignalDesk boundary coverage. |

## Core Rule

Do not add a new onboarding engine. Activation Concierge should orchestrate existing create-menu, messaging onboarding, starter activation, share, and presence surfaces.

## Runtime Decision

Decision implemented on June 24, 2026:

- extend the existing `/create-menu/success`, starter workspace, Use MenuList, mobile Share, and Search & Discovery / Presence Monitor surfaces first;
- do not create a new public Activation Concierge route;
- do not create a new Firestore collection;
- do not let SignalDesk write MenuList store, project, menu, billing, or public truth;
- add a shared activation summary helper so the UI can explain whether a completed action was MenuList-recorded or owner-confirmed.

## Current Runtime Contract

| Decision | Default |
| --- | --- |
| First route | Existing `/create-menu/success`, starter workspace, Use MenuList, mobile Share, and Search & Discovery / Presence Monitor. |
| First pod | Bengaluru, Indiranagar + Koramangala, cafes/dessert/QSR/cloud-kitchen-facing storefronts. |
| First CTA | One current official menu link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers. |
| First proof | Before/after current-menu-link proof with owner permission. |

## How MenuList Knows An Action Is Done

| Signal class | Runtime source | Confidence |
| --- | --- | --- |
| MenuList-recorded owner action | `starterActivationSignals.actions.*` from copy, WhatsApp share, QR download, Menu Kit download, or native share. | Strong for owner action. |
| Owner-confirmed external placement | `menuPresence.*` from the Presence Monitor; matching starter signal is written for starter stores. | Medium; external platform is not automatically verified. |
| Customer usage proof | Future traffic/scan/source attribution, if added. | Strong outcome support, but not required for P0 activation. |

The shared runtime helper is `buildStarterActivationSummary()` in `src/lib/onboarding/starterActivation.ts`. It keeps the two-surface activation calculation in one place and separates MenuList-recorded actions from owner-confirmed external placements.

## Boundaries

- No public SignalDesk route.
- No SignalDesk write to stores, menus, projects, billing, or public truth.
- No cold WhatsApp, Instagram, Messenger, X, Reddit, or LinkedIn automation.
- No provider send.
- No paid campaign automation.
- No QR/Google/Instagram placement claim unless the owner performs or confirms the placement.
- No fake proof, fake activation, fake screenshots, or unsupported growth claims.

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.2 | 2026-06-24 | Implemented existing-route activation summary foundation: shared action-done evidence helper, desktop/mobile activation proof UI, docs parity, and verifier. |
| 0.1 | 2026-06-24 | Created docs-first feature set from SignalDesk founder-distribution research before the existing-surface runtime decision. |
