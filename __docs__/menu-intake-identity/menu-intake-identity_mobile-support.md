# Menu Intake Identity — Mobile Support

**Status:** Mobile supported  
**Last Updated:** June 30, 2026

## Admission Gates

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners upload/update menus from phone. |
| Speed | Pass | Preflight is one server call before extraction. |
| Touch | Pass | Mobile only needs a confirm dialog with clear actions. |
| Value | Pass | Prevents owners from damaging menu truth while away from desktop. |

## Mobile Behavior

- Run the same protected API as desktop.
- Submit the preflight with same-origin credentials, `no-store` cache policy, and manual redirect handling through the shared client helper.
- Use the existing mobile upload sheet.
- Show a short confirmation for strong mismatch, high truth risk, likely replacement, special-menu, outlet, or wrong-business cases.
- For a strong existing-project mismatch, offer `Add here anyway` and `Create new menu`.
- When `Create new menu` is chosen, create the new project, refresh/select it, and attach the processing job to that project.
- After the owner continues in the current project, show detected business details as checkboxes when they differ from current store truth.
- Save only selected identity fields and keep skipped fields unchanged.
- After the acknowledged write, merge selected fields into browser context
  only when the same tenant and store are still active; a late response after
  a location/account switch must leave the new context untouched.
- Process only valid menu/list files. Ignored non-menu files are removed from temporary storage.
- Use large touch targets and simple actions.
- Keep extraction job flow unchanged after confirmation.

## Copy

Use owner-facing text:

- "This looks like a different menu."
- "This looks like another outlet."
- "This looks like a special menu."
- "This may replace this menu."
- "Add it here anyway"
- "Create new menu"
- "Save detected business details?"
- "Save selected"

No technical confidence or AI wording in mobile UI.
