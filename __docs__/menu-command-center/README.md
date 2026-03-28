# Menu Command Center

> Multi-action bulk operations control surface for MenuList editor.

**Feature Flag:** `FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER`
**Location:** `src/components/templates/main-app/projects/editorView/`
**Status:** ✅ Implementation Complete
**Last Updated:** February 14, 2026

---

## Quick Navigation

| Audience               | Document                                                               | Purpose                                           |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| CEO / PM / Clients     | [menu-command-center_spec.md](./menu-command-center_spec.md)           | Business requirements, user stories, scope        |
| Developers             | [menu-command-center_impl.md](./menu-command-center_impl.md)           | Technical blueprint, architecture, file structure |
| Sales / Marketing      | [menu-command-center_marketing.md](./menu-command-center_marketing.md) | Pitch deck, messaging, go-to-market               |
| Potential Customers    | [menu-command-center_website.md](./menu-command-center_website.md)     | Landing page content, SEO                         |
| Existing Customers     | [menu-command-center_helpdoc.md](./menu-command-center_helpdoc.md)     | Help article, how-tos, troubleshooting            |
| Founder / Cost Control | [menu-command-center_firebase.md](./menu-command-center_firebase.md)   | Firebase operations, cost tracking                |

---

## One-Liner

A multi-action command center modal that lets owners perform bulk menu operations (pricing, availability, show/hide, category moves) in a single, safe, preview-first session.

## Problem Solved

SMB owners need to update many menu items at once (price increases, stock changes, category reorganization). Without bulk tools, they edit items one-by-one — slow, error-prone, and stressful. This feature makes mass menu changes safe, fast, and predictable.

## Solution

A three-panel command center modal (Selection Context | Action Engine | Impact Preview) that supports sequential bulk actions with live preview, safety guardrails, undo, and single-batch Firebase save.

---

## Architecture Overview (60-second summary)

```
EditorActionsPopover → "Menu Command Center" action
    ↓
CommandCenterModal (3-panel layout)
    ├── LEFT:  SelectionContext (items/categories selected, outlet info)
    ├── CENTER: ActionEngine (pricing / availability / move category / show-hide)
    └── RIGHT:  ImpactPreview (live preview of changes before apply)
    ↓
On Apply → returns updatedProject: Project
    ↓
Editor.tsx → syncChanges() → single updateProject() to Firebase
```

---

## Key Files in Codebase (planned)

| Purpose                  | Path                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Entry point (trigger)    | `src/components/templates/main-app/projects/editorView/EditorActionsPopover.tsx`                          |
| Command Center Modal     | `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx`                      |
| Selection Context Panel  | `src/components/templates/main-app/projects/editorView/CommandCenterModal/SelectionContext.tsx`           |
| Action Engine Panel      | `src/components/templates/main-app/projects/editorView/CommandCenterModal/ActionEngine.tsx`               |
| Pricing Action           | `src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/PricingAction.tsx`      |
| Availability Action      | `src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/AvailabilityAction.tsx` |
| Move Category Action     | `src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/MoveCategoryAction.tsx` |
| Impact Preview Panel     | `src/components/templates/main-app/projects/editorView/CommandCenterModal/ImpactPreview.tsx`              |
| Bulk operations utils    | `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts`        |
| Types                    | `src/components/templates/main-app/projects/types/commandCenter.types.ts`                                 |
| Feature flag             | `src/config/features.ts`                                                                                  |
| Action handler in Editor | `src/components/templates/main-app/projects/editorView/Editor.tsx`                                        |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_MENU_COMMAND_CENTER: true;
```

---

## Existing Bulk Actions (Coexistence)

The following existing actions in `EditorActionsPopover` will **coexist** with the Command Center during a transition period. Some overlap intentionally:

| Existing Action                            | Overlap with Command Center            | Plan                                                      |
| ------------------------------------------ | -------------------------------------- | --------------------------------------------------------- |
| Show or Hide Items (`BulkStatusMenuModal`) | Availability action in Command Center  | Keep both; review after adoption                          |
| Rearrange Menu (`ReorderMenuModal`)        | Move Category action in Command Center | Keep both; reorder is drag-based, move is selection-based |
| Manage Languages                           | No overlap                             | Keep as-is                                                |
| Generate Descriptions                      | No overlap                             | Keep as-is                                                |
| Add Images                                 | No overlap                             | Keep as-is                                                |
| Smart Recommendations                      | No overlap                             | Keep as-is                                                |
| Store Customization                        | Partial overlap (outlet pricing)       | Keep as-is                                                |

---

## Strategic Context (from ChatGPT conversation)

This feature directly supports MenuList becoming **menu authority infrastructure**:

- Owners who update prices in MenuList first → MenuList becomes source of truth
- Bulk control → makes MenuList faster than POS for operational changes
- Safe + reversible → builds trust in the system
- Multi-action session → establishes "command center" behavior pattern

---

## Version History

| Version | Date         | Changes                                                              |
| ------- | ------------ | -------------------------------------------------------------------- |
| 1.2     | Feb 14, 2026 | Added Show/Hide Items (4th action), removed standalone popover entry |
| 1.1     | Feb 13, 2026 | Implementation complete — all files created, type check passed       |
| 1.0     | Feb 13, 2026 | Initial documentation from ChatGPT conversation analysis             |
