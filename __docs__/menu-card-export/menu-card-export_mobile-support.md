# Menu Card Export — Mobile Support Assessment

**Status:** Production-ready route entry and responsive owner workflow
**Route:** `/use-menulist/menu-card-export`
**Last Updated:** June 2, 2026

---

## Mobile Relevance Decision

Verdict: YES.

Menu Card Export must work on mobile because owners often need a fresh printable file while standing in the restaurant, speaking with staff, sending a file over WhatsApp, or fixing a price mismatch before service.

Mobile should expose the route as `Print menu` or `Create menu PDF` in owner-facing copy. Internal feature name remains Menu Card Export.

---

## Four-Gate Admission Test

| Gate | Assessment | Result |
| --- | --- | --- |
| Frequency | Exporting is not daily for every owner, but it spikes during price changes, menu refreshes, and print-shop handoffs. | PASS |
| Speed | The mobile route must support Home Print or WhatsApp export in a few taps; print-shop and batch controls stay collapsed. | PASS |
| Touch | Style cards, toggles, page preview, and export actions can be thumb-safe. No precision editing is allowed. | PASS |
| Value | Mobile is often the fastest path when the owner is away from a desk or sending files through WhatsApp. | PASS |

---

## Existing Mobile Baseline

Mobile Share already has a PDF action:

- It reads selected project data through the mobile project cache: `src/components/mobile/screens/MobileShareScreen.tsx:341`.
- It calls `generateMenuPdf()` and `downloadPdf()`: `src/components/mobile/screens/MobileShareScreen.tsx:435`.
- It exposes the action under Print & downloads: `src/components/mobile/screens/MobileShareScreen.tsx:889`.

The new route must preserve this parity and improve it with preview, settings, and export history.

Implemented behavior:

- Mobile Share opens `/use-menulist/menu-card-export?projectId=...` when the feature flag is enabled.
- Mobile Menu command sheet exposes `Print Menu` and saves pending local edits before opening the route: `src/components/mobile/screens/MobileMenuScreen.tsx:2742`, `src/components/mobile/screens/MobileMenuScreen.tsx:2749`, `src/components/mobile/components/MobileMenuCommandSheet.tsx:185`.
- More > Modules exposes `Print Menu` beside Dashboard for owners who look for tools from More; the analytics dashboard screen stays metric-only: `src/components/mobile/screens/MobileMoreScreen.tsx:442`.
- The main owner layout treats `/use-menulist/menu-card-export` as a handheld shell-bypass route, so the responsive export workflow renders on phones instead of falling back into the generic Mobile Share tab.
- The routed workflow is responsive and uses the same shared export library as desktop.
- Multi-menu stores use the same shared project selector pattern as other owner/mobile project surfaces.
- The route gates preview/export by the loaded project id so a project switch cannot mix old menu data with the newly selected menu URL.
- Default generation remains client-side with no Firebase writes.
- Pro/Premium layout suggestion is available from the same responsive route and uses the same plan/capacity-gated API as desktop.

---

## Mobile Route Behavior

Mobile should not copy the full desktop layout. It should use the same data, APIs, and hooks with mobile-native presentation.

Required behavior:

- Full-screen route or sheet launched from Mobile Share, Mobile Menu command sheet, or More > Modules.
- Mobile Menu must save pending local edits before opening the export route.
- Project selector appears only when more than one menu exists.
- Job preset selector appears before style selection.
- Style selector is a horizontal scroller.
- Settings are switches/segmented controls.
- Preflight summary appears before page preview when there are blockers.
- Preview pages are swipeable.
- Warnings appear before download.
- Export button is sticky.
- Export history is a compact list with freshness state.
- WhatsApp PDF uses the native Web Share API where available.
- Print-shop packet can be generated on mobile, but the primary mobile action is share/download, not editing print specs.
- Multi-location batch is desktop-first unless mobile batch UX passes separate verification.

Rejected behavior:

- Drag/drop page editing.
- Tiny page thumbnails as the only preview.
- Dense print settings jargon.
- ZIP-only flow for WhatsApp PDF.
- Desktop modal inside mobile route.
- Separate mobile-only DAL.

---

## Shared Architecture

Mobile uses:

- Same API routes as desktop.
- Same `MenuCardPrintSource`.
- Same template registry.
- Same export records.
- Same artifact download flow.
- Same Pro/Premium layout suggestion API.
- Same preflight engine.
- Same print-shop packet builder.
- Same auth/session.
- Same permission checks.

Mobile does not use a separate export collection or separate renderer.

---

## Copy Rules

Use calm action copy:

- `Export menu card`
- `Print menu`
- `Home print`
- `WhatsApp PDF`
- `Send to print shop`
- `Preview`
- `Create PDF`
- `Menu changed`
- `Create again`
- `Download`
- `Suggest layout`

Avoid:

- `AI-powered`
- `Smart`
- `Dynamic`
- `Design like a pro`
- `Customize`
- `You should`

---

## Mobile Acceptance Criteria

| Area | Criteria |
| --- | --- |
| Touch | All controls are at least 44px high. |
| Preview | Owner can inspect page order and warnings before export. |
| Export | Home Print and WhatsApp export complete without requiring desktop. |
| Share | WhatsApp PDF can be shared from mobile when browser support exists. |
| Preflight | Blocking warnings appear before the owner creates the file. |
| Failure | Failed export shows retry without technical error text. |
| Freshness | Old exports show whether the menu changed. |
| Performance | Style browsing does not generate server PDFs. |
| Parity | Desktop and mobile create the same export record for the same settings. |
| Edited menu | Opening Print Menu from the mobile Menu command sheet waits for pending menu saves before route navigation. |
