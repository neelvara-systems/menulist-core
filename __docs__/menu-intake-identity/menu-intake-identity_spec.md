# Menu Intake Identity — Product Specification

**Feature:** Menu Intake Identity  
**Status:** Implemented  
**Last Updated:** May 3, 2026

---

## Executive Summary

Menu Intake Identity is a shared preflight check for uploaded menu files. It looks at the upload before full extraction and answers:

- What business identity is visible in the upload?
- Is the upload real menu/list content?
- Is it complete enough to process?
- Does it match the store or project where the owner is uploading it?
- What is the owner probably trying to do?
- Could auto-saving this result damage existing menu truth?
- Which fields are suggestions versus confirmed truth?

The owner experience stays simple. The system only interrupts when there is a useful next action.

## Owner-Facing Outcomes

| Situation | Behavior |
| --- | --- |
| Clear menu for an empty/new project | Continue silently; use identity as suggestion metadata. |
| Some non-menu files mixed in | Continue if at least one valid menu page exists; tell the owner which pages were ignored when useful. |
| Blurry or no valid menu content | Stop before full extraction and ask for clearer menu photos/PDF. |
| Partial menu | Warn that it looks incomplete; owner can continue or upload more. |
| Existing project mismatch | Ask before adding the upload into that project; owner can add it anyway or create a new menu from the same upload. |
| Same business, existing project | Treat as an update/re-extraction path. |
| Same business, mostly different structure | Ask before merging because it may replace the current menu. |
| Same business, seasonal or limited menu | Warn that it may be a special menu; owner can add it anyway or create a separate menu. |
| Same brand, different outlet/location | Ask before adding it into the current outlet's menu. |
| Detected business details differ from current store | Ask whether to save the detected business name, phone, address, or type; save only fields selected by the owner. |

## Non-Negotiables

- AI identity is a suggestion, not truth.
- Never overwrite store name, phone, address, or business type without owner confirmation.
- Identity suggestions need explicit owner acceptance and per-field selection.
- Do not block weak or low-confidence guesses.
- Warnings must be short and useful to a non-technical SMB owner.
- The full extraction pipeline remains the source for items/categories/prices.

## Shared Questions

1. **Upload identity:** business name, phone, address, business type, languages, currency/price hints, confidence.
2. **Content validity:** valid menu/list pages, non-menu files, low-quality files.
3. **Completeness:** complete, likely complete, partial, insufficient.
4. **Context match:** current store/project name, phone, address, business type, existing menu state.
5. **Owner intent:** new menu, update existing menu, replace existing menu, add seasonal/special menu, add another outlet menu, create separate project, accidental wrong business upload, unclear.
6. **Truth risk:** whether auto-save or merge could damage existing project truth, including wrong business, wrong outlet, mostly different structure, partial upload, or empty extraction risk.
7. **Suggestion boundary:** business name, phone, address, business type, currency, and languages can be shown as suggestions, but are not confirmed truth. Store name, phone, address, and business type can be saved only through the owner acceptance UI.
8. **Extraction scope:** only valid menu/list files continue to extraction; non-menu files are deleted from temporary storage when ignored.

## Owner Copy

Use direct messages:

- "This looks like a different menu."
- "This looks like another outlet."
- "This looks like a partial menu."
- "Some files are not menu pages."
- "This looks like an update to this menu."

Avoid technical explanations such as confidence thresholds, OCR, model, or AI internals.
