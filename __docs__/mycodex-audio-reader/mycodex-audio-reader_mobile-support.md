# MyCodex Audio Reader Mobile Support

## Decision

Supported on mobile because MyCodex is intended for reading long docs away from the desk.

## Admission Gates

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Pass | Long documentation reading can happen often during planning and review. |
| Speed | Pass | Start/pause/stop are one-tap controls. |
| Touch | Pass | Controls use 44px-friendly buttons in the settings drawer and mini-player. |
| Value | Pass | Listening while moving between tasks is useful on phone. |

## Mobile UX Contract

- The main mobile header remains sticky and uncluttered.
- Audio controls live inside the settings drawer.
- When audio is active, a compact mini-player stays near the bottom.
- The scroll-to-top button remains separate from the mini-player.
- Follow-reading auto-scroll can be disabled.
- Keep screen awake is available as a best-effort foreground reading toggle.

## Known Platform Dependency

Mobile voice support depends on the browser and installed device TTS engine. Chrome/Safari behavior can vary by OS version and installed voices.

Screen wake lock support also varies by browser. On unsupported iOS/browser combinations, MyCodex continues reading normally but cannot prevent the screen from dimming or locking.
