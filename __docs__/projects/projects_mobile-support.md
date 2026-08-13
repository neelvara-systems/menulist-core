# Projects — Mobile Support

**Last Updated:** August 13, 2026
**Decision:** ✅ MOBILE SUPPORTED — Core operational features on mobile, advanced editor desktop-only

**Source gate:** `npm run verify:menu-project-editor-boundary` checks mobile menu persistence, project-list/detail recovery, first-use Menu/Share behavior, `MobileProjectSelectorSheet` project mutations, `BulkActionsSheet` handoff, `updateProjectWithoutLoader` acknowledgement guards, and the same public-cache path used by desktop editor writes. This is source/docs verification only; manual phone QA and browser/mobile editor QA remain required before release certification.

---

## Feature Admission Test

| Gate          | Result  | Reasoning                                                              |
| ------------- | ------- | ---------------------------------------------------------------------- |
| **Frequency** | ✅ PASS | Menu edits, availability toggles — multiple times daily during service |
| **Speed**     | ✅ PASS | Item toggle <1s, edit <2s, add <2s (optimistic updates)                |
| **Touch**     | ✅ PASS | All targets 44px+, thumb-friendly                                      |
| **Value**     | ✅ PASS | Owner on floor during service — needs phone-based menu control         |

---

## Desktop → Mobile Feature Map

### Implemented on Mobile ✅

| Desktop Feature             | Mobile Component                            | Notes                                                        |
| --------------------------- | ------------------------------------------- | ------------------------------------------------------------ |
| Upload menu photo           | `MenuUploadSheet`                           | Camera/gallery → optimize → upload → AI extraction           |
| View/search items           | `MobileMenuScreen` (SearchBar)              | Pull-to-refresh                                              |
| Toggle availability         | `MobileMenuScreen` (Switch per item)        | Optimistic update                                            |
| Edit item (name/price/desc) | `ItemEditSheet`                             | Bottom sheet                                                 |
| Add new item                | `AddItemSheet`                              | Persists to Firestore                                        |
| Delete item                 | `ItemEditSheet` (onDelete)                  | Confirmation dialog + optimistic delete                      |
| Project metadata/delete     | `MobileProjectSelectorSheet`                | Same project DAL/cache path as desktop, bounded mutation diagnostics |
| Share/QR                    | `MobileShareScreen`                         | Copy link, QR display                                        |
| B2C theme customization     | `MobileDesignEditorScreen`                  | Home style, mood, layout, brand color, toggles, service note, acknowledged public-link copy, bounded output diagnostics |
| Brand color picker          | `ColorPickerSheet`                          | 8 presets + custom hex                                       |
| Publish design changes      | `MobileDesignEditorScreen` (Publish button) | Same `publishProject()` DAL, loaded-`modifiedOn` stale-write rejection, and bounded non-blocking post-publish verification diagnostics |
| Quick Start presets         | `MobileDesignEditorScreen` (mobile-only!)   | 3 one-tap preset bundles                                     |
| Bulk availability/show-hide | `BulkActionsSheet`                          | Simplified Command Center                                    |

### First-Use And Recovery States

`MobileProjectsProvider` must settle the exact tenant/store scope after a
project-list or selected-project read failure. It exposes `hasLoadError`, logs
only bounded store context, and allows an explicit retry; it must not leave the
Menu or Share tab in a permanent loading state.

- Menu and Share render a recovery state with **Try again** when project truth
  could not be loaded.
- A successfully loaded empty project list is different from an error. Share
  renders **No menu yet** with **Create Menu**, which returns the owner to the
  Menu tab.
- Menu Design withholds public-link actions when a fresh business has neither
  a subdomain nor a custom domain. It does not call the strict public URL
  builder until tenant host context exists.
- These states add no Firestore reads beyond an owner-initiated retry and add
  no writes, listeners, collections, or server routes.

### Desktop-Only (Fails 4-gate) ❌

| Desktop Feature                     | Fails Gate       | Reasoning                                |
| ----------------------------------- | ---------------- | ---------------------------------------- |
| Advanced View (side-by-side)        | Touch, Speed     | Split panels, precision editing          |
| Traditional View (2-column)         | Touch            | Multi-panel precision                    |
| Focus View (file tabs)              | Touch            | Multi-tab navigation                     |
| Keyboard shortcuts                  | Touch            | Desktop input method                     |
| Image zoom/preview                  | Touch            | Pinch/zoom precision                     |
| Reorder items/categories            | Touch            | Drag-and-drop precision                  |
| AI description generation           | Frequency, Speed | Setup/polish phase                       |
| AI image generation                 | Frequency, Speed | Setup/polish phase                       |
| Language management                 | Frequency        | One-time setup                           |
| Per-item image upload               | Frequency        | Setup/polish phase                       |
| Add/edit/delete category            | Frequency        | Rare structure changes                   |
| Background image upload (home/menu) | Frequency        | Rare advanced feature, heavy upload flow |
| Custom CSS injection                | Touch            | Technical power-user feature             |
| Bulk pricing / category moves       | Touch, Speed     | Complex multi-step UX                    |

### Key Insight

Data changes (availability, price, add/delete) are **immediately live** to customers through `updateProjectWithoutLoader` / `updateProject()` and the shared project DAL/cache path. The desktop "Publish" button only applies to DESIGN changes (theme/layout). Mobile now supports both.

---

## Key Files

| Purpose       | Path                                                         |
| ------------- | ------------------------------------------------------------ |
| Menu screen   | `src/components/mobile/screens/MobileMenuScreen.tsx`         |
| Item edit     | `src/components/mobile/sheets/ItemEditSheet.tsx`             |
| Add item      | `src/components/mobile/sheets/AddItemSheet.tsx`              |
| Menu upload   | `src/components/mobile/sheets/MenuUploadSheet.tsx`           |
| Share         | `src/components/mobile/screens/MobileShareScreen.tsx`        |
| Project sheet | `src/components/mobile/components/MobileProjectSelectorSheet.tsx` |
| Project provider | `src/components/mobile/providers/MobileProjectsProvider.tsx` |
| Project diagnostics | `src/components/mobile/utils/mobileProjectDiagnostics.ts` |
| Owner diagnostics | `src/components/mobile/utils/mobileOwnerDiagnostics.ts` |
| Design editor | `src/components/mobile/screens/MobileDesignEditorScreen.tsx` |
| Color picker  | `src/components/mobile/sheets/ColorPickerSheet.tsx`          |
| Bulk actions  | `src/components/mobile/sheets/BulkActionsSheet.tsx`          |

---

## Sub-Feature Docs

- B2C View audit: See `__docs__/mobile-operational-support/mobile-operational-support_mobile-support.md` §B2C View
- Editor audit: See same doc §Editor Features
- Menu Editor Constitution: Design spec only, no mobile UI needed
