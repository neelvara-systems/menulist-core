# MyCodex Audio Reader Test Cases

## Static Checks

| Check | Expected |
| --- | --- |
| `npx next lint --file src/app/sites/mycodex/components/MyCodexClientContainer.tsx --file src/config/features.ts` | Pass |
| `npx tsc --noEmit --incremental false` | Pass |

## Manual Checks

| Scenario | Expected |
| --- | --- |
| Browser supports `speechSynthesis` | Audio section shows voice, speed, follow-reading, and playback controls. |
| Browser does not support `speechSynthesis` | Audio section shows an unavailable message. |
| Read selection without selected text | User sees a clear status message. |
| Read section | Current section starts and active block is highlighted. |
| Read page | Page chunks play sequentially. |
| Pause/resume | Playback pauses and resumes without changing route. |
| Stop | Playback stops and highlight clears. |
| Change route while reading | Playback stops. |
| Mobile drawer | Controls remain inside settings; document content remains primary. |
| Keep screen awake supported | Wake lock starts during playback and releases on pause/stop. |
| Keep screen awake unsupported | Settings show unavailable state; audio still works normally. |
