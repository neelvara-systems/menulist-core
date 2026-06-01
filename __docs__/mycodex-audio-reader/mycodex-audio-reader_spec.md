# MyCodex Audio Reader Spec

## Goal

Let the MyCodex user listen to documentation without paying for generated audio or using third-party TTS.

## Product Boundary

- MyCodex only.
- No MenuList owner/customer surface.
- No Answerlattice dashboard, widget, hosted help, or knowledge runtime.
- No provider API route.
- No crawler/indexing behavior change beyond existing MyCodex no-index controls.

## User Needs

| Need | Behavior |
| --- | --- |
| Read full page | User can start whole-page reading directly from the document header or from settings. |
| Play favorites | User can open `/favorites` and play all starred documents one by one until playback is stopped. |
| Play queue | User can open `/queue` and play the temporary read-later list one by one until playback is stopped. |
| Control playback | User can pause, resume, or stop from settings or the mini-player. |
| Tune comfort | User can choose an India-related device/browser voice when available, speech speed, and follow-reading scroll. |
| Keep phone usable while reading | User can request screen wake lock during playback when the browser supports it. |

## Constraints

- Use the browser `speechSynthesis` API only.
- Favorites playback may fetch Markdown through the protected same-origin MyCodex document route, then still speaks through browser `speechSynthesis`.
- Treat voice availability and quality as device/browser dependent.
- Store preferences, read-later queue, and resume state locally in `localStorage`.
- Keep the primary whole-page read control visible when a document is open.
- Keep advanced audio settings in the MyCodex settings drawer so the document surface stays clean.
- Filter voice choices to India-related browser/OS voices. If no India voice is installed, fall back to the device default without listing unrelated voices.
- Do not add Firebase reads, writes, listeners, functions, indexes, or Storage operations.
- Treat screen wake lock as best-effort. It helps foreground reading but does not guarantee lock-screen or background playback.

## Non-Goals

- No AI voice generation.
- No voice cloning.
- No audio file export.
- No cloud TTS billing.
- No cross-device sync for audio preferences.
- No native iOS background audio behavior.
