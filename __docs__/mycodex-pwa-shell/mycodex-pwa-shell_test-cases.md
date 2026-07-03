# MyCodex PWA Shell Test Cases

## Static Checks

| Check | Expected |
| --- | --- |
| `npx next lint --file src/app/sites/mycodex/components/MyCodexClientContainer.tsx --file src/app/sites/mycodex/layout.tsx --file src/app/sites/mycodex/login/page.tsx --file src/app/sites/mycodex/offline/page.tsx --file src/app/sites/mycodex/queue/page.tsx --file src/app/sites/mycodex/favorites/page.tsx` | Pass |
| `npx tsc --noEmit --incremental false` | Pass |
| Scoped `git diff --check` | Pass |

## Manual Checks

| Scenario | Expected |
| --- | --- |
| iPhone PWA reader | Header is below status area; content begins below header. |
| iPhone PWA navigation drawer | Drawer title/search/content are not hidden under status area. |
| iPhone PWA settings drawer | Header/body controls are not hidden by status area or home indicator. |
| iPhone PWA bottom navigation | Home, Search, Queue, Saved, and Settings stay above the home indicator. |
| Mobile root route | Continue-reading home appears before the full master index. |
| Queue route | Read-later docs list from local storage and remain touch friendly. |
| Active audio mini-player | Mini-player stays above the home indicator and leaves scroll-to-top tappable. |
| Toast message | Toast stays above the home indicator. |
| Login/offline screens | Centered content stays inside safe area. |
| Oversized login form POST | The session route rejects the submission through the fixed `input` login error without parsing unbounded form data. |
| Repeated login attempts | The session route applies `AUTH_LOGIN` rate limiting before form parsing or credential validation. |
| Desktop reader | Layout remains unchanged. |
