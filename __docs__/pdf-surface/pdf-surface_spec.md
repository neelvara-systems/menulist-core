# PDF Surface — Compatibility Specification

**Status:** Implemented compatibility bridge
**Last Updated:** July 16, 2026
**Feature Flag:** `ENABLE_PDF_SURFACE`

---

## Purpose

PDF Surface preserves older and flag-off “Menu PDF” actions while Menu Card Export is the canonical owner workflow. It is not a second print product and does not own an independent visual renderer.

## Owner Behavior

- When `ENABLE_MENU_CARD_EXPORT` is on, supported desktop and MobileShell entry points open `/use-menulist/menu-card-export`.
- A remaining legacy caller may invoke `generateMenuPdf()` and `downloadPdf()`.
- The compatibility helper converts the supplied project/store data into the Menu Card Export print source and renderer.
- Output is generated from current project data at download time in the browser; the owner must review the file and replace old printed/shared copies after changes.
- Current output carries generated-file metadata plus a source reference derived from the current print source, serving the older version ID and generation timestamp support need without restoring a second renderer.

## Invariants

- No second PDF layout implementation.
- No freeform editor, font upload, custom CSS, or separate PDF setting.
- Active items/categories and stored ordering remain authoritative.
- Store logo, accent color, business profile, currency, live menu URL, metadata, and source hash pass through when supplied by the caller.
- Non-Premium output keeps MenuList attribution through the shared branding policy.
- No export Firestore document, Storage artifact, API route, Cloud Function, rule, or index.

## Canonical Successor

[Menu Card Export](../menu-card-export/README.md) owns presets, preflight, controlled styles, print-shop packets, tenant/store/project-scoped device history, native file sharing, and freshness display. All new print workflow decisions belong there.

The archived v2.2 standalone-renderer specification is historical evidence only and does not describe current runtime ownership.

## Verification

```bash
npm run verify:menu-export
npm run verify:menu-card-export
npm run test:print-export-browser-boundaries
```
