# MyCodex Audio Reader

Private MyCodex read-aloud controls for long documentation sessions.

## Status

- Product: MyCodex only
- Route surface: `src/app/sites/mycodex/`
- Flag: `ENABLE_MYCODEX_AUDIO_READER`
- Cost model: no Firebase, no OpenAI, no Google Cloud, no server route
- Storage: browser `localStorage` for voice, speed, follow-reading, and keep-awake settings

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
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Settings drawer controls, speech queue, mini-player, persistence |
| `src/app/sites/mycodex/styles.css` | Active spoken-block highlight |
| `src/config/features.ts` | `ENABLE_MYCODEX_AUDIO_READER` flag |
