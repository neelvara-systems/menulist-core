# MenuList current-source asset review — 2026-08-30

## Audit scope

Combined UX and accessibility review of the seven MenuList AssetOS slots that became stale after their watched owner/public source files changed. The review used the isolated local reseller fixture and connected Chrome. It did not publish, download, save an editor design, call a provider, or change Firebase data.

## User goal and accessibility target

Confirm that the approved website proof assets remain truthful representations of the current public page, owner Today/dashboard, Share/QR, and print-ready asset flows, and that the live counterparts expose understandable structure and named controls.

## Steps and health

1. `01-mobile-today.jpg` — **Healthy.** The current Today surface keeps status, owner action, expiry, customer preview, and bottom-navigation state visible. It is denser than the simplified owner-phone proof asset but does not contradict it.
2. `02-public-location-chooser.jpg` — **Healthy.** The canonical public origin truthfully asks the customer to choose a location when multiple active locations exist.
3. `03-public-branch-obp.jpg` — **Healthy.** The zero-menu branch Official Business Page shows its exact location, unavailable-hours state, directions, policy links, and `Menu coming soon`; it does not imply published menu content.
4. `04-mobile-share.jpg` — **Healthy.** The current Share surface retains the official business link, direct menu link, customer-app link, QR actions, and explicit owner-controlled sharing. A follow-up current-source browser pass also opened the Single Table Card action sheet and verified named previous/next style controls, the `1 of 9` → `2 of 9` transition, and the updated preview/title. The approved share-kit/public-surfaces assets remain accurate and do not imply automatic third-party placement.
5. `05-owner-dashboard.jpg` — **Healthy.** Current dashboard analytics render measured fixture values and an actionable missing-hours state. The approved static analytics proof deliberately uses categorical `Available`/`Visible` wording and therefore remains truthful without invented counts.
6. `06-print-assets-dashboard.jpg` — **Healthy with non-blocking visual age.** Current source retains the same file-type → style → download flow represented by the approved dashboard asset and adds more asset types. The older light-theme capture is not a pixel-current screenshot, but its product claim and workflow remain accurate.
7. `07-print-assets-editor.jpg` — **Healthy with non-blocking visual age.** Current source retains the QR destination, live preview, image/PDF export, and editing controls represented by the approved editor asset. The current editor is more capable and visually different; the older proof remains an honest bounded example rather than a claim of exact present layout.

## Strengths

- Owner, public, and print-ready screens all retain one-store/one-public-truth context.
- Public empty and partial states are calm and do not manufacture menu, hours, or activity claims.
- Current browser structure exposes named primary actions, navigation, editor dialog, and close/discard recovery.
- Existing proof assets use fictional demo data or categorical availability rather than presenting QA fixture values as customer outcomes.

## UX and accessibility risks

- The approved print dashboard/editor images are visually older than the current dark-theme UI. This is a low-severity marketing-proof freshness issue, not a functional or truthfulness defect; refresh them in a future asset-production pass when exact visual parity is required.
- Screenshot inspection cannot establish contrast ratios, full keyboard traversal, focus order, or assistive-technology output. Those remain covered only by the separate source/browser accessibility gates.

## Decision

The seven approved assets remain truthful for their documented product claims after current-source visual inspection, including the later printable-style navigation change in `MobileShareScreen.tsx`. Re-lock their watched-source fingerprints to the reviewed current files; do not change their approval decision, fictional-data boundary, or published media in this certification pass.
