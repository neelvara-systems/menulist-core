# MyCodex Audio Reader Mobile Support

## Decision

Supported on mobile because MyCodex is intended for reading long docs away from the desk.

## Admission Gates

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Pass | Long documentation reading can happen often during planning and review. |
| Speed | Pass | Start/pause/stop are one-tap controls. |
| Touch | Pass | The header read-page button, settings controls, and mini-player use 44px-friendly targets. |
| Value | Pass | Listening while moving between tasks is useful on phone. |

## Mobile UX Contract

- The main mobile header remains sticky and uncluttered.
- The mobile home view prioritizes continue-reading, queue, and favorites before the full index.
- The bottom navigation keeps Home, Search, Queue, Favorites, and Settings reachable without opening the sidebar.
- Whole-page reading can start from the mobile header.
- The Favorites and Queue pages list docs in a single-column touch layout and expose Play all plus per-document Play actions.
- Advanced audio controls live inside the settings drawer.
- When audio is active, a compact mini-player stays near the bottom.
- The scroll-to-top button remains separate from the mini-player.
- Follow-reading auto-scroll can be disabled.
- Keep screen awake is available as a best-effort foreground reading toggle.

## Known Platform Dependency

Mobile voice support depends on the browser and installed device TTS engine. Chrome/Safari behavior can vary by OS version and installed voices. MyCodex lists India-related voices only; if none are installed, playback uses the device default.

Screen wake lock support also varies by browser. On unsupported iOS/browser combinations, MyCodex continues reading normally but cannot prevent the screen from dimming or locking.
