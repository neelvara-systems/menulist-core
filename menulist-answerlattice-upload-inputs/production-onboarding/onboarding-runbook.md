# MenuList On Answerlattice Production Onboarding Runbook

## Operating Principle

MenuList should be onboarded into Answerlattice as a real production client, not as fake seed data. The resulting dashboard state can then be used for Answerlattice website and marketing assets only after approval and privacy review.

## Phase 0: Approval And Scope Lock

- Confirm MenuList founder approval to onboard MenuList as an Answerlattice production client.
- Confirm the legal basis for using MenuList product data inside Answerlattice.
- Confirm whether Answerlattice marketing can publicly show MenuList name, screenshots, and dashboard state.
- Record screenshot approval separately from product onboarding approval.
- Define one approved MenuList production business/workspace for public-facing captures.
- Exclude private tenant IDs, store IDs, owner emails, payment records, raw support messages, and secrets from all upload and asset workflows.

Exit criteria:

- Production onboarding approved.
- Marketing/demo usage approved or explicitly marked pending.
- Private-data exclusions accepted.

## Phase 1: Answerlattice Production Workspace

- Create or select the Answerlattice production workspace for MenuList.
- Confirm production Answerlattice environment points to `https://answerlattice.com` and the `answerlattice` Firebase project.
- Confirm MenuList production remains `https://menulist.ai` and the `menulist` Firebase project.
- Confirm whether the public website content source remains `https://www.menulist.online` or has moved to the canonical production host before final Answerlattice source review.
- Activate license/subscription for the MenuList Answerlattice workspace.
- Add required admin users only.
- Generate an Answerlattice widget key for MenuList production.
- Lock allowed origins to the approved MenuList production hosts.
- Keep preview/local origins out of the production key unless a separate temporary key is issued.

Exit criteria:

- `/answerlattice/activation` shows workspace and license readiness.
- Widget key exists but is not pasted into MenuList production until origin rules are correct.

## Phase 2: Knowledge Intake

- Create the Answerlattice intake job:

```text
MenuList production client onboarding and asset proof
```

- Upload or paste `source-inputs/01-*` through `source-inputs/26-*`.
- Upload `source-inputs/08-support-faq-seed.csv` as CSV.
- Add selected public MenuList website URLs through Answerlattice discovery after the prepared source files are imported.
- Keep each source under Answerlattice's runtime source-size constraints.
- Do not publish canonical answers directly from intake.

Exit criteria:

- Knowledge intake job exists with MenuList source material.
- Source review items are generated.
- Draft KB/FAQ/canonical/entity outputs are visible for review.

## Phase 3: Review And Publish Controlled Knowledge

- Review generated KB articles for implemented MenuList truth only.
- Review FAQ drafts and remove unsupported pricing, refund, privacy, POS, or integration claims.
- Import and review live owner support and website/docs reconciliation source files `11` through `26`.
- Use `live-smb-support-coverage-checklist.md` as the production support gate.
- Review entity candidates such as menu, project, store, outlet, Official Business Page, QR, Digital Screen, Menu Kit, staff, and public menu.
- Promote only high-confidence entities.
- Approve canonical answers only after checking them against current MenuList docs and runtime behavior.
- Keep changelog/release notes owner-managed, not intake-auto-published.

Exit criteria:

- Help center has approved MenuList content.
- Canonical answers exist for stable support questions.
- Entity and trust/governance surfaces have meaningful reviewed state.
- Live support coverage exists for account access, menu editing, public menu, QR/OBP, settings, Menu Kit, screens, billing, staff, locations, dashboard, feedback, and escalation.

## Phase 4: Product Surface Mapping

- Create Answerlattice Product Surfaces from `product-surface-map.csv`.
- Map owner routes first because the MenuList Answerlattice widget embed is mounted on owner routes.
- Add public surfaces as knowledge examples even if the widget is not mounted there.
- Use safe route patterns and semantic feature/workflow names.
- Do not store actual tenant/store/project identifiers in surface definitions.

Exit criteria:

- `/answerlattice/product-surfaces` shows MenuList route coverage.
- Product surfaces link to related KB, FAQ, and canonical answers.

## Phase 5: MenuList Production Widget Connection

- Set `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY` in the MenuList production environment to the Answerlattice-issued `al_` key.
- Do not hardcode the key in source.
- Use `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` only for an approved temporary override.
- Verify the default production script host resolves to `https://answerlattice.com/widget/v1/answerlattice-widget.js`.
- Confirm blocked routes stay blocked:

```text
/help-center
/help-center/*
/answerlattice
/answerlattice/*
/__answerlattice
/__answerlattice/*
```

- Verify page context is received for owner routes such as dashboard, projects, users, feedback, business settings, transactions, locations, and billing.
- Confirm the widget is hidden on mobile until a separate mobile UX decision is approved.

Exit criteria:

- `/answerlattice/widget` shows a production runtime last-seen event from MenuList.
- `/answerlattice/activation` marks widget seen in product and page context received.

## Phase 6: Support Signal Loop

- Ask a small set of approved MenuList support questions through the widget.
- Ask every owner-style question in `live-owner-support-test-questions.csv` before live enablement.
- Submit one safe thumbs-up feedback event.
- Submit one safe thumbs-down or "missing answer" event using non-private content.
- Confirm the signal reaches Answerlattice feedback/support surfaces.
- Create or verify support board cards for missing or weak knowledge areas.

Exit criteria:

- Support signal loop tested.
- `/answerlattice/support-board`, `/answerlattice/feedback`, and governance queues show meaningful MenuList-derived activity.

## Phase 7: Dashboard And Website Asset Capture

- Confirm dashboard demo requirements in `dashboard-demo-data-requirements.md`.
- Capture the Answerlattice dashboard only after activation, knowledge, surfaces, widget runtime, and support signals are present.
- Capture MenuList public/product surfaces from the same approved production client story.
- Save captures under `asset-inputs/future-routed-captures/`.
- Record every capture in `asset-inputs/screenshot-capture-register.csv`.
- Run a final privacy scrub before using screenshots in Answerlattice website or marketing assets.

Exit criteria:

- Screenshots are real, meaningful, approved, and scrubbed.
- Generated placeholder assets are no longer used as proof where real routed captures exist.
