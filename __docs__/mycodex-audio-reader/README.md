# MyCodex Audio Reader

Private MyCodex read-aloud controls for long documentation sessions.

## Status

- Product: MyCodex only
- Route surface: `src/app/sites/mycodex/`
- Flag: `ENABLE_MYCODEX_AUDIO_READER`
- Cost model: no Firebase, no OpenAI, no Google Cloud, no paid TTS; favorites use a protected same-origin Markdown route
- Storage: browser `localStorage` for India voice, speed, follow-reading, keep-awake settings, favorite docs, read-later queue, and scroll positions

## Documents

| File | Purpose |
| --- | --- |
| [mycodex-audio-reader_spec.md](./mycodex-audio-reader_spec.md) | User behavior and boundaries |
| [mycodex-audio-reader_impl.md](./mycodex-audio-reader_impl.md) | Technical implementation |
| [mycodex-audio-reader_firebase.md](./mycodex-audio-reader_firebase.md) | Firebase and provider cost impact |
| [mycodex-audio-reader_mobile-support.md](./mycodex-audio-reader_mobile-support.md) | Mobile admission and UX contract |
| [mycodex-audio-reader_helpdoc.md](./mycodex-audio-reader_helpdoc.md) | Operator usage notes |
| [mycodex-audio-reader_website.md](./mycodex-audio-reader_website.md) | Public website impact |
| [mycodex-audio-reader_marketing.md](./mycodex-audio-reader_marketing.md) | Internal positioning |
| [mycodex-audio-reader_test-cases.md](./mycodex-audio-reader_test-cases.md) | Verification checklist |

## Implementation Files

| File | Responsibility |
| --- | --- |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Header page-read control, settings drawer controls, favorites/read-later queue playback, India voice filter, speech queue, mini-player, persistence |
| `src/app/sites/mycodex/api/document/route.ts` | Protected same-origin Markdown reader for favorite playback |
| `src/app/sites/mycodex/styles.css` | Active spoken-block highlight |
| `src/config/features.ts` | `ENABLE_MYCODEX_AUDIO_READER` flag |
