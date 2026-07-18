# Description Generation - Mobile Support

**Status:** Implemented source evidence; not current launch certification
**Last cross-check:** July 15, 2026

## Admission result

Description generation passes the mobile owner gate: it is a frequent menu-maintenance action, reduces typing, fits short touch interactions, and reuses the desktop business logic. It stays inside `MobileShell`; there is no route bypass or independent mobile data model.

## Mobile entry paths

1. Menu command sheet -> Add missing descriptions.
2. Missing-description filter chip action.
3. Menu command sheet -> Repair Menu.
4. Item edit/add sheet -> first description or refresh existing generated descriptions.

`MobileMenuScreen` applies effective role permission and linked-outlet description policy before opening direct bulk actions (`src/components/mobile/screens/MobileMenuScreen.tsx:2906`). `ItemEditSheet` independently hides/guards generation when `canGenerateDescriptions` is false (`src/components/mobile/sheets/ItemEditSheet.tsx:186`). The server repeats permission and outlet-policy enforcement.

## Bulk sheet

`GenerateDescriptionsSheet` (`src/components/mobile/sheets/GenerateDescriptionsSheet.tsx:87`) reuses `runDescriptionGeneration()` and receives the same governance state and project persistence callback as desktop.

- owner selects Standard/Detailed and Professional/Friendly/Premium;
- progress is file-scoped;
- the sheet cannot be dismissed during active work;
- first-description generation is direct and free;
- refresh requires `Dialog.confirm()` (`GenerateDescriptionsSheet.tsx:128`);
- confirmation shows the exact current refresh credit count and says manual edits stay unchanged;
- for a multi-request paid refresh, the shared orchestrator sends that count on the first request so the server can refuse insufficient capacity before provider work;
- success closes only after project persistence succeeds;
- capacity failure uses operation-neutral enhancement-pack guidance and directs the owner to Billing; it does not incorrectly label description work as translation credits. Other failures remain generic.

Primary footer actions use mobile `size="large"` and the standard safe-area footer.

## Item sheet

`ItemEditSheet` carries localized description maps and `descriptionSource` into its draft. Manual typing sets `descriptionSource: 'manual'`. The behavior is:

| Current source description | Control |
| --- | --- |
| Empty | free first-description/translation preparation through `NEW_ITEM_METADATA` |
| Existing and generated/legacy | confirmed refresh through `REWRITE_DESCRIPTION` |
| Existing and manual | no refresh button; protected explanation shown |

Generated results stay in the sheet until Save. The save path preserves freshly generated translations. A later manual source edit clears stale target-language descriptions through the existing translation-drift boundary. For a linked outlet with description overrides enabled, Save compares the complete localized map rather than only source text, so target-language-only changes persist.

The free first-description route receives the localized category name and bounded item text, sanitizes instruction-like prompt text, uses request-local provider aliases for item/attribute IDs, and restores original attribute identity before returning the draft. Its prompt is generate-only and uses explicit item context rather than inventing facts from the business category.

## Repair Menu

Mobile Repair Menu first repairs configured-language gaps, then adds missing canonical source descriptions when the role has `canGenerateDescriptions`, then repairs project public copy. Without that permission, the summary and run omit description work while the other eligible repairs remain available. It uses the shared bulk orchestrator with `skipPersist: true`; the parent applies one project update after the repair scope succeeds. A description failure stops the repair success presentation.

## Parity matrix

| Contract | Desktop | Mobile |
| --- | --- | --- |
| First description free | Yes | Yes |
| Paid refresh confirmation | Popconfirm | Dialog |
| Manual protection | Yes | Yes |
| Length/tone defaults | Yes | Yes |
| Permission gate | Yes | Yes |
| Outlet governance | Yes | Yes |
| Full-batch failure propagation | Yes | Yes |
| Whole-scope paid-capacity admission | shared first request | shared first request |
| Project cache invalidation | shared DAL | shared DAL |
| Transaction label/count/credits | desktop Transactions | mobile Transactions |

## Required runtime QA

- narrow handset and tablet-width sheet layout;
- 44 px or larger primary actions;
- keyboard open/close while editing localized descriptions;
- refresh confirmation cancel/confirm;
- permission-denied and linked-outlet denied states;
- capacity-exhausted redirect copy;
- provider failure does not close with success;
- generated translations remain after Save and reload;
- linked-outlet target-language-only change remains after Save and reload;
- manual description remains protected;
- public menu reflects a successful Save after cache revalidation.

Source/type gates do not replace this authenticated device QA.
