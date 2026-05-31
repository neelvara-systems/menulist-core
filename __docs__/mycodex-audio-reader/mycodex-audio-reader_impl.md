# MyCodex Audio Reader Implementation

## Code Paths

| File | Change |
| --- | --- |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Adds speech queue state, settings controls, selected/section/page reading, pause/resume/stop, local preference persistence, screen wake lock, and active mini-player. |
| `src/app/sites/mycodex/styles.css` | Adds `.mycodex-speaking-block` highlight for the currently spoken document block. |
| `src/config/features.ts` | Adds `ENABLE_MYCODEX_AUDIO_READER`. |

## Runtime Flow

1. On mount, MyCodex checks whether `window.speechSynthesis` and `SpeechSynthesisUtterance` are available.
2. Available voices are loaded from the browser/OS and shown in settings.
3. The user starts one of three flows: selection, current section, or page.
4. MyCodex extracts readable rendered document blocks from `.prose-custom`.
5. Text is normalized and split into bounded chunks.
6. Each chunk is spoken through `SpeechSynthesisUtterance`.
7. The active document block is highlighted and optionally scrolled into view.
8. If Keep screen awake is enabled and supported, MyCodex requests `navigator.wakeLock.request('screen')` while playback is active.
9. Pause, resume, and stop controls are available in settings and the mini-player.
10. Wake lock is released on pause, stop, route change, unmount, and page-hidden transitions.

## Settings

| Setting | Storage Key | Default |
| --- | --- | --- |
| Voice | `mycodex:audio-voice` | Browser default voice |
| Speed | `mycodex:audio-rate` | `1x` |
| Follow while reading | `mycodex:audio-autoscroll` | `true` |
| Keep screen awake | `mycodex:audio-wake-lock` | `true` |

Audio settings share the MyCodex reader hydration guard, so stored values are loaded before persistence effects can write defaults back to `localStorage`.

## Safety Notes

- The app does not call OpenAI, Google Cloud, Firebase, or any MyCodex API route for audio.
- The actual synthesis engine is controlled by the browser/OS. Some installed voices may be local; some browser-managed voices may behave differently by platform.
- MyCodex does not persist the spoken document content outside the rendered page.
- Wake lock is feature-detected and best-effort. Unsupported browsers show an unavailable state and continue normal reading.
