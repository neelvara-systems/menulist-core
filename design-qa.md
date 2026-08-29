# Neelvara Signal Constellation Design QA

## Comparison setup

- Source visual truth: `/tmp/codex-remote-attachments/01a04db6-f14b-7c62-9fee-87daeeedce25/4646B19C-20C5-4C8A-AAC6-73037B797618/1-Photo-1.jpg`
- Browser-rendered implementation: `/tmp/neelvara-signal-qa/implementation-desktop-1280x910-v2.jpg`
- Combined full-view evidence: `/tmp/neelvara-signal-qa/reference-vs-implementation-desktop.jpg`
- Mobile evidence: `/tmp/neelvara-signal-qa/implementation-mobile-390x844-closed.jpg`
- Mobile navigation evidence: `/tmp/neelvara-signal-qa/implementation-mobile-390x844-menu-open.jpg`
- Desktop 3D interaction evidence: `/tmp/neelvara-signal-qa/implementation-desktop-3d-tilt.jpg`
- Mobile stable-state evidence after the 3D enhancement: `/tmp/neelvara-signal-qa/implementation-mobile-3d-stable.jpg`
- Route: `http://localhost:3000/__neelvara`
- Desktop viewport: 1280 x 910 CSS px at device scale factor 1
- Source pixels: 1280 x 910
- Desktop implementation pixels: 1280 x 910
- Mobile viewport and implementation pixels: 390 x 844
- Density normalization: none required; source and desktop implementation were compared at identical pixel and CSS dimensions.
- State: light theme, homepage hero at initial load; mobile menu checked closed and open.

## Full-view comparison evidence

The 2560 x 910 combined image places the selected reference and the implementation together at matching scale. The implementation preserves the reference's asymmetric editorial hero, oversized Neelvara wordmark, restrained blue-violet palette, floating 3D source mark, two product signals, compact actions, and product/company context immediately below the hero. Existing product-truth copy and the compact company ledger intentionally replace conceptual mock copy and cards.

## Required fidelity surfaces

- Fonts and typography: the existing condensed display family and body family preserve the mock's strong editorial hierarchy. Heading weight, line height, wrapping, label tracking, and small product-node copy remain readable at desktop and mobile widths.
- Spacing and layout rhythm: the desktop hero uses a balanced two-column composition with the text and mark aligned around a shared center. Mobile collapses to one column with stacked CTAs and no horizontal overflow.
- Colors and visual tokens: the implementation stays within the existing Neelvara ivory, ink, cobalt, and violet tokens. The atmospheric field is lighter behind body copy and more active around the signal mark.
- Image quality and asset fidelity: the hero uses generated raster assets sized for their rendered slots. The 1254 x 1254 transparent mark has no rectangular background edge or masking halo; the 1920 x 1200 field remains sharp at the tested desktop viewport.
- Copy and content: public wording remains bound to the existing Neelvara and product constants. No conceptual claims, metrics, or additional products from the visual reference were introduced.
- Icons and interaction: existing Neelvara and product logo assets are used. Products, About, Contact, View Products, email actions, and the mobile menu remain functional.
- Accessibility and responsiveness: the decorative constellation is `aria-hidden`; focusable navigation remains semantic; reduced-motion CSS disables constellation movement; the 390 px viewport measured `scrollWidth === innerWidth`.

## Focused region comparison

A separate crop was not needed because both reference and implementation were captured at 1280 x 910 and the combined full-view image keeps the hero typography, product nodes, assets, buttons, and section boundary legible at original scale. Mobile closed/open states were inspected separately at 390 x 844.

## Findings

No actionable P0, P1, or P2 findings remain.

## Comparison history

### Iteration 1

- Earlier finding: P2 image-quality and layout drift. The first 3D mark asset retained a pale square field, so the visual read as a large image panel instead of the reference's floating mark. The mark was also oversized and pushed the lower product node close to the viewport edge.
- Fix: generated a true transparent-background version of the mark, removed the blend treatment, reduced the desktop mark width, and adjusted both product-node anchors.
- Post-fix evidence: `/tmp/neelvara-signal-qa/implementation-desktop-1280x910-v2.jpg` and `/tmp/neelvara-signal-qa/reference-vs-implementation-desktop.jpg` show the isolated mark floating cleanly in the atmospheric field with both product nodes fully visible.

### Iteration 2

- Requested enhancement: make the hero feel alive and three-dimensional under mouse movement without weakening the trust-first presentation.
- Implementation: added pointer-directed X/Y rotation, a small depth scale, directional shadow movement, a responsive light field, and separate inverse-depth transforms for both product nodes. Continuous values stay in CSS custom properties and update through one animation frame rather than React state.
- Post-change evidence: `/tmp/neelvara-signal-qa/implementation-desktop-3d-tilt.jpg` shows the active depth state. Browser-computed transforms changed to `matrix3d(...)`, opposite pointer positions produced opposite signed rotations, leaving the constellation reset rotation to `0deg` and scale to `1`, and no console errors occurred.

## Primary interactions tested

- Opened and closed the mobile navigation menu.
- Navigated from the mobile header to `/__neelvara/products` and returned to the homepage.
- Confirmed desktop and mobile CTA/link semantics from the rendered accessibility tree.
- Checked browser logs after the final desktop and mobile renders; no console errors were present.
- Verified pointer tilt in both directions, separate node depth, changing shadow/light position, and reset-on-leave.

## Follow-up polish

No blocking polish remains. The spatial response is intentionally restrained, ignores touch pointers, and resolves to a static transform under reduced-motion preferences.

final result: passed
