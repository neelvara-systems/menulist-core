# Repeated Reply Import — Mobile Support Review

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06  
> **Surface:** Answerlattice owner dashboard Knowledge Intake

---

## Mobile Impact

Repeated Reply Import adds a guided form inside the existing responsive Knowledge Intake screen. It does not introduce:

- a new mobile route
- a mobile PWA shell screen
- a separate mobile data hook
- a forced reload path
- a realtime listener

---

## Requirements

- Form must stack on narrow screens.
- Text areas must remain usable for short support answers.
- Entity autocomplete must keep the selector full-width on mobile and must not trigger an entity read until the owner searches.
- Action buttons must remain reachable without horizontal scrolling.
- The owner must still see that review/publish is required.

---

## Data Parity

Desktop and mobile use the same:

- `useKnowledgeIntake` hook
- add-source API
- entity-option API only after owner search
- analyze API
- review item UI
- publish API

No mobile-only Firestore read/write path is allowed.

---

## Verification

TypeScript coverage is required. Browser proof should be repeated on a logged-in Answerlattice workspace because the owner dashboard route requires real auth and Answerlattice workspace context.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added mobile requirement for search-gated entity autocomplete. |
| 2026-06-06 | Confirmed repeated reply import uses the existing responsive Knowledge Intake screen and shared hook/API path. |
