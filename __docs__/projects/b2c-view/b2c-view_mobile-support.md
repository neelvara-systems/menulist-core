# B2C View — Mobile Support

**Feature:** Customer-Facing Digital Menu Design Presentation
**Status:** Mobile source-boundary evidence; not current launch certification
**Last Updated:** July 16, 2026

## Current Launch Boundary

This mobile support document records source-backed mobile parity for the B2C design presentation path. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

---

## Mobile Entry Point

`src/components/mobile/screens/MobileDesignEditorScreen.tsx` is the current mobile owner design editor. It is opened inside the MobileShell project flow or embedded B2C sidebar flow. It does not introduce a separate mobile DAL or a mobile-only design contract.

---

## Shared Contracts

Mobile uses the same source helpers as desktop:

- `resolveMenuDesignConfig()` normalizes saved design config.
- `getOwnerSelectableMenuLayouts()` exposes only compatible List, Grid, and Card layouts for the active mood.
- `getPreferredMenuLayoutForMood()` resets layout when the owner changes mood.
- `publishProject()` persists the project design changes.
- `assertProjectUpdateSucceeded()` guards local success state.
- `verifyMenuPublish()` is called after publish as a fire-and-forget health check.
- `prepareMediaImage()` and `uploadFile()` prepare and persist the same `menuBackground` profile used by desktop.

When embedded, the mobile editor sends normalized project data through `onEmbeddedProjectDataChange?.(cloneProjectData(project))` so the surrounding MobileShell state stays aligned.

---

## Mobile Behavior

| Area | Current behavior |
| --- | --- |
| Mood controls | Same mood enum as desktop: Clean, Warm, Premium, Bold, Fast |
| Layout controls | Compatible List, Grid, and Card choices only |
| Recommended styles | Same small `MenuStylePresetPreview` visual strips as desktop, backed by the existing preset helpers; the mobile sheet avoids technical mood/color/toggle breakdowns |
| Category tabs | Separate display/navigation toggle, not a layout template |
| Save/publish | Uses `publishProject()` and the shared public cache invalidation path |
| Failure handling | Acknowledgement guard prevents local success when persistence fails |
| Public output | Public menu renderer still normalizes mood/layout before customer display |
| Background | Image data stays preview-only until the prepared HTTPS Storage URL is returned; fixed background attachment is not used |
| Prices | Base/range and each active priced option are visible before customer interaction when prices are enabled |
| Large menus | Search, category jumps, and direct item links address the real rendered items; no estimated-height placeholder is used |

The exact structural matrix is Clean = List/Grid, Warm = List/Card/Grid, Premium = List/Card, Bold = Card/Grid, and Fast = List. Category tabs remain a separate mobile/tablet navigation toggle.

---

## Verification

`npm run verify:menu-design-presentation-boundary` checks the mobile screen for shared helper usage, exact compatible layout filtering, visual preset preview parity, prepared background upload, publish acknowledgement, `verifyMenuPublish()`, embedded-state parity, and the shared public price/background/large-menu boundary. This is a source gate only. It does not replace browser/mobile customer-menu QA, real-device QA, public cache/deploy evidence, target production smoke, or the External Certification Runbook and Digital Menu Output Constitution checks.
