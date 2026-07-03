# MyCodex Audio Reader Implementation

## Code Paths

| File | Change |
| --- | --- |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Adds speech queue state, header page-read controls, settings controls, India voice filtering, full-page reading, favorites and read-later queue playback, bounded document response validation, pause/resume/stop, local preference persistence, screen wake lock, and active mini-player. |
| `src/app/sites/mycodex/api/document/route.ts` | Protected same-origin Markdown reader used by the favorites queue. |
| `src/app/sites/mycodex/styles.css` | Adds `.mycodex-speaking-block` highlight for the currently spoken document block. |
| `src/config/features.ts` | Adds `ENABLE_MYCODEX_AUDIO_READER`. |

## Runtime Flow

1. On mount, MyCodex checks whether `window.speechSynthesis` and `SpeechSynthesisUtterance` are available.
2. Available voices are loaded from the browser/OS and filtered to India-related languages/names before they are shown in settings.
3. The user starts whole-page reading from the document header or settings.
4. MyCodex extracts readable rendered document blocks from `.prose-custom`.
5. Text is normalized and split into bounded chunks.
6. Each chunk is spoken through `SpeechSynthesisUtterance`.
7. The active document block is highlighted and optionally scrolled into view.
8. If Keep screen awake is enabled and supported, MyCodex requests `navigator.wakeLock.request('screen')` while playback is active.
9. Pause, resume, and stop controls are available in settings and the mini-player.
10. Wake lock is released on pause, stop, route change, unmount, and page-hidden transitions.
11. On `/favorites` and `/queue`, Play all loads saved Markdown files from the protected same-origin MyCodex document route with `no-store`, same-origin credentials, manual redirect handling, a 4 MB JSON cap, and a typed `{ markdown, sourcePath? }` response guard before speaking them as one browser speech queue.

## Settings

| Setting | Storage Key | Default |
| --- | --- | --- |
| India voice | `mycodex:audio-voice` | Indian English, Hindi, or another India-related browser/OS voice when available; otherwise device default |
| Speed | `mycodex:audio-rate` | `1x` |
| Follow while reading | `mycodex:audio-autoscroll` | `true` |
| Keep screen awake | `mycodex:audio-wake-lock` | `true` |

Audio settings share the MyCodex reader hydration guard, so stored values are loaded before persistence effects can write defaults back to `localStorage`.

## Safety Notes

- The app does not call OpenAI, Google Cloud, or Firebase for audio.
- Favorites playback uses only the protected MyCodex static document route to read Markdown already available under `__docs__`; malformed, oversized, redirected, or non-OK responses fail closed to the fixed favorite-load error state instead of rendering unvalidated Markdown.
- The response guard logs only bounded favorite path/title metadata and response status. It does not log Markdown content or raw private source paths.
- The actual synthesis engine is controlled by the browser/OS. Some installed voices may be local; some browser-managed voices may behave differently by platform.
- The voice picker intentionally hides unrelated browser voices. Install Indian English, Hindi, or another India voice at the OS/browser level to make it selectable.
- MyCodex does not persist spoken document content outside the current browser session.
- Wake lock is feature-detected and best-effort. Unsupported browsers show an unavailable state and continue normal reading.
