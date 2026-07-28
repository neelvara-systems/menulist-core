# MyCodex Audio Reader Test Cases

## Static Checks

| Check | Expected |
| --- | --- |
| `npx next lint --file src/app/sites/mycodex/components/MyCodexClientContainer.tsx --file src/app/sites/mycodex/favorites/page.tsx --file src/app/sites/mycodex/queue/page.tsx --file src/app/sites/mycodex/api/document/route.ts --file src/app/sites/mycodex/[[...slug]]/page.tsx --file src/lib/mycodex/docs.ts --file src/config/features.ts` | Pass |
| `npm run verify:mycodex-pwa-assets` | Pass; includes executable return-path, dedicated-secret, canonical-path, symlink, and source-size boundary tests. |
| `npm run verify:auth-security-failure-matrix` | Broader security gate; MyCodex assertions require fail-closed login and bounded favorite-document playback. |
| `npx tsc --noEmit --incremental false` | Pass |

## Manual Checks

| Scenario | Expected |
| --- | --- |
| Browser supports `speechSynthesis` | Audio section shows voice, speed, follow-reading, and playback controls. |
| Browser does not support `speechSynthesis` | Audio section shows an unavailable message. |
| Header read-page button | Page chunks play sequentially without opening settings first. |
| Settings read-page button | Page chunks play sequentially. |
| Favorites page Play all | Starred docs load one by one and play as one queue until stopped or completed. |
| Favorites page per-doc Play | Only the selected favorite plays. |
| Favorite document route returns malformed, oversized, redirected, or non-OK JSON | Playback fails closed with `Could not load favorite`; no Markdown content or raw source path is logged. |
| Favorite document handler receives no/invalid session outside local development | Private/no-store `401`; incomplete access configuration returns `503`. |
| Saved path resolves through a symlink outside `__docs__` | Server refuses the source and returns no private file content. |
| Markdown source exceeds 4 MiB or response JSON exceeds 5 MiB | Server or browser rejects it before playback. |
| Favorites/read-later list exceeds 12 documents or 250,000 retained speech characters | Playback preparation stops at the bounded queue and reports skipped documents instead of retaining an unbounded speech workload. |
| Browser storage access throws or numeric preference is absent | Reader remains available with in-memory/default settings; missing values do not become the minimum font size or speech rate. |
| Queue page Play queue | Queued docs load one by one and play as one queue until stopped or completed. |
| Mobile home | Root route shows continue-reading, queue, favorites, and recent docs before the master index. |
| Scroll resume | Reopening a document can restore the saved scroll position. |
| India voice filter | Voice selector shows India-related voices only when available. |
| No India voice installed | Voice selector does not list unrelated voices and playback uses device default. |
| Pause/resume | Playback pauses and resumes without changing route. |
| Stop | Playback stops and highlight clears. |
| Change route while reading | Playback stops. |
| Mobile header | Read-page button remains reachable without hiding the navigation or settings buttons. |
| Keep screen awake supported | Wake lock starts during playback and releases on pause/stop. |
| Keep screen awake unsupported | Settings show unavailable state; audio still works normally. |
