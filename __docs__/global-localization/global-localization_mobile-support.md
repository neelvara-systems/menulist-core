# Global Localization Mobile Support

**Status:** Required and implemented
**Last updated:** July 17, 2026

## Four-gate Admission

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Language and time display affect every MobileShell session. |
| Speed | Pass | Cookie/static formatting requires no network or Firebase read. |
| Touch | Pass | Existing App Settings and Business Locale screens already provide mobile controls. |
| Owner value | Pass | Correct local time, number grouping, and direction prevent owner mistakes. |

## Mobile Contract

- `AppSettingsSheet` edits owner UI cookies.
- `MobileLocaleSettingsScreen` edits store/business locale truth through the same `updateStore` DAL as desktop.
- Mobile dashboard, AI transaction, special-menu, public-truth, customer-app, OBP, and export-history displays use shared formatting helpers.
- MobileShell inherits next-intl locale, timezone, root document direction, and provider messages.
- Bottom navigation labels, its accessibility label, loading labels, and the subscription gate use the shared MobileShell locale contract.
- No mobile-only persistence, route, Firestore listener, or duplicate formatter exists.

## Manual QA Pending

After an approved app release, check one LTR and one RTL locale on iOS and Android PWA:

1. Change language, timezone, date format, and time format.
2. Confirm dashboard counts and transaction dates update after the existing refresh.
3. Confirm Arabic/Urdu direction and Ant Design overlays are RTL.
4. Confirm business locale changes still affect store/public truth only.
