# Owner Action Layer Mobile Support

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners need these actions during normal daily operations. |
| Speed | Pass | One tap routes to existing mobile screens. |
| Touch | Pass | Mobile uses large buttons and existing MobileShell screens. |
| Value | Pass | Menu changes, hours, feedback, QR, and staff handoffs are common away-from-desk work. |

## Mobile Contract

Mobile owner action layer renders inside `MobileDashboardScreen` and uses existing callbacks:

- `onOpenMenuTab`
- `onOpenShareTab`
- `onOpenMoreScreen`

It does not use `window.location`, forced reloads, or desktop route bypasses.

## Mobile Destinations

| Action | Mobile destination |
| --- | --- |
| Publish menu | Menu tab |
| Place customer link | More -> Presence Monitor |
| Open private feedback | More -> Feedback |
| Set today status | More -> Today status |
| Set hours | More -> Hours edit |
| Set customer link | More -> Domain settings |
| Staff handoff | Share tab |
| Menu changes / prices | More -> Menu Manager |

## QA

Run:

```bash
npm run verify:owner-action-layer
npm run verify:mobile-shell-route-map
```

Manual mobile QA still requires authenticated owner-shell testing on a real or emulated mobile viewport.
