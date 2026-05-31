# MyCodex PWA Shell Spec

## Goal

MyCodex must remain readable and usable when installed as an iOS PWA, including iPhone devices with a status bar, notch, and home indicator.

## Requirements

| Requirement | Expected Behavior |
| --- | --- |
| Top safe area | Mobile header, progress bar, drawers, login, and offline screens do not sit under the iOS status area. |
| Bottom safe area | Fixed controls, toast, drawer footer, settings drawer body, login, and offline screens do not sit under the home indicator. |
| Left/right safe area | Landscape and notched devices keep primary controls inside horizontal safe areas. |
| Product separation | Safe-area handling stays in MyCodex files only. |
| No runtime cost | No API, Firebase, or provider work is needed. |

## Non-Goals

- No MenuList customer menu changes.
- No Answerlattice dashboard/website changes.
- No native iOS wrapper.
- No separate mobile app shell outside MyCodex.
