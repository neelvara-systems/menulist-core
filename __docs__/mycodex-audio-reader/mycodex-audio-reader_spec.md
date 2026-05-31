# MyCodex Audio Reader Spec

## Goal

Let the MyCodex user listen to documentation without paying for generated audio or sending documentation through a MyCodex backend service.

## Product Boundary

- MyCodex only.
- No MenuList owner/customer surface.
- No Canonica dashboard, widget, hosted help, or knowledge runtime.
- No provider API route.
- No crawler/indexing behavior change beyond existing MyCodex no-index controls.

## User Needs

| Need | Behavior |
| --- | --- |
| Read selected text | User selects text in the document and starts audio from settings. |
| Read current section | User starts the visible section without needing to copy text. |
| Read full page | User can listen through a complete document. |
| Control playback | User can pause, resume, or stop from settings or the mini-player. |
| Tune comfort | User can choose the device/browser voice, speech speed, and follow-reading scroll. |
| Keep phone usable while reading | User can request screen wake lock during playback when the browser supports it. |

## Constraints

- Use the browser `speechSynthesis` API only.
- Treat voice availability and quality as device/browser dependent.
- Store preferences locally in `localStorage`.
- Keep controls in the MyCodex settings drawer so the document surface stays clean.
- Do not add Firebase reads, writes, listeners, functions, indexes, or Storage operations.
- Treat screen wake lock as best-effort. It helps foreground reading but does not guarantee lock-screen or background playback.

## Non-Goals

- No AI voice generation.
- No voice cloning.
- No audio file export.
- No cloud TTS billing.
- No cross-device sync for audio preferences.
- No native iOS background audio behavior.
