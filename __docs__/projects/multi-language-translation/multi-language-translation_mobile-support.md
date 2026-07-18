# Multi-Language Translation — Mobile Support

**Status:** Implemented mobile owner layer
**Last updated:** July 15, 2026

## Admission decision

Mobile support is required because owners frequently add/edit menu content and respond to missing translations from the Menu tab. The flow stays inside `MobileShell`; it reuses shared project, localization, translation, accounting, and linked-outlet contracts rather than creating a mobile backend.

## Entry surfaces

| Surface | Mobile component | Behavior |
| --- | --- | --- |
| Manage languages | `src/components/mobile/sheets/ManageLanguagesSheet.tsx` | Add, remove, change display default, inspect issues, repair one/all |
| Menu display language | `src/components/mobile/screens/MobileMenuScreen.tsx` | Uses configured display default while retaining English as source |
| Item translation | `src/components/mobile/sheets/ItemEditSheet.tsx` | Refresh a non-English target and save item draft |
| Category translation | `src/components/mobile/sheets/MobileCategoryEditSheet.tsx` | Fill/regenerate target names and save category draft |
| Bulk repair | `src/components/mobile/sheets/BulkActionsSheet.tsx` | Repairs eligible menu languages and supported project-public gaps |
| Special menus | `src/components/mobile/screens/MobileSpecialMenuScreen.tsx` | Creates/repairs localized public fields with real project context |
| Business copy | `src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx` | Localizes and repairs store-public copy |
| Transactions | `src/components/mobile/screens/MobileTransactionsScreen.tsx` | Shows translation action, units, source, targets, result summary |

## Source versus display contract

`MobileMenuScreen` computes:

- `preferredLanguage` from project/store display settings;
- `primaryLang` from `getCanonicalProjectSourceLanguage()`;
- `activeProjectLanguages` from `normalizeProjectLanguages()`.

Display language changes lists, previews, and customer-first choice. English drives missing checks, item/category draft initialization, translation requests, stale clearing, extraction comparison, and review.

## Manage Languages behavior

### Add

1. Require translation permission and an available slot below six.
2. Restrict available outlet languages with existing store/master governance.
3. Add the target while keeping English present.
4. Translate each eligible file from English.
5. Translate missing project-public fields.
6. Await `persistMenuProjectImmediately()`.
7. Update project metadata summary if required.
8. Show success and close.

### Repair

Issue detection and repair receive `itemStates` and `categoryStates` for linked outlets. One/all repair persists immediately before success. When a later file/language fails after paid work completed, only the last completed project snapshot is persisted and the owner sees a partial/stopped message. The display default is preserved and never reset to English by repair.

### Remove/default

English and the current display default are protected from removal in the current mobile UI. An owner can make another active language the default. These non-provider changes retain the existing local/debounced project save behavior.

## Item behavior

- English target: no refresh control.
- Inherited/overridden linked-outlet item: no refresh control, even when a description override is allowed, because translation covers master-controlled name/attributes too.
- Local/standalone item: refresh invokes `ITEM_TRANSLATION`.
- Provider result updates `draftItem`; the owner must press Save.
- Capacity and generic failures use owner-facing toasts.

## Category behavior

- Missing-target and regenerate modes exclude English.
- Parent omits the generation callback when the user lacks permission.
- Inherited linked-outlet categories return a connected-to-main-menu message before provider work.
- Partial failures return completed target names with a partial warning; a full failure returns no draft update.
- The owner must press Save.

## Bulk repair behavior

- Description display/selection continues to use the configured display default.
- Language repair always uses English.
- Inherited item/category issues are excluded.
- Translation/project-public repairs are excluded when the user lacks generation permission.
- Result persistence remains the parent bulk `onApply` path, preserving undo and existing save behavior.

## Touch and progress behavior

- Sheets use existing mobile `Button`, `Card`, `Dialog`, `Popup`, and progress components.
- AI work disables conflicting actions and prevents sheet dismissal while saving.
- Primary actions use the existing large mobile button sizes.
- No desktop Ant Design component is introduced into the mobile layer.
- No route bypass or forced reload is added.

## Failure behavior

| Failure | Mobile result |
| --- | --- |
| No permission | Add/repair disabled or callback unavailable; no provider call |
| Six-language cap | Add selector/button disabled |
| Capacity exhausted | Enhancement-pack message; completed earlier work can remain saved |
| Provider/shape failure | Failure or partial warning; usable output from completed earlier paid requests is persisted; no full-success message |
| Project persistence failure | No success/close from Manage Languages |
| Inherited outlet target | Control hidden or connected-to-main-menu message |
| No missing content | Informational “no missing translations” result |

Project-public, special-menu, and Business Copy translation controls follow the same permission boundary. Restricted staff keep manual localized editing, but provider buttons are not shown.

## Mobile QA checklist

- Verify 44px-or-larger action targets on supported phones.
- Verify default non-English language opens first while English remains Source.
- Add and repair one language on a one-file and multi-file project.
- Interrupt/cancel where supported and confirm completed-work wording.
- Save and reopen item/category translated drafts.
- Test local-only and inherited entities on a linked outlet.
- Verify transaction source/target labels after each operation.
- Test Arabic and Hebrew direction, text wrapping, sheet layout, and public menu output.
- Test low bandwidth and provider timeout behavior without losing the shell.

## Mobile non-goals

- Offline translation queue.
- Background translation after the owner leaves the sheet.
- New owner quality/glossary settings.
- A mobile-specific database or API route.
