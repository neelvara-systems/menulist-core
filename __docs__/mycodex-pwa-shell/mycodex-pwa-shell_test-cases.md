# MyCodex PWA Shell Test Cases

## Static Checks

| Check | Expected |
| --- | --- |
| `npx next lint --file src/app/sites/mycodex/components/MyCodexClientContainer.tsx --file src/app/sites/mycodex/layout.tsx --file src/app/sites/mycodex/login/page.tsx --file src/app/sites/mycodex/offline/page.tsx` | Pass |
| `npx tsc --noEmit --incremental false` | Pass |
| Scoped `git diff --check` | Pass |

## Manual Checks

| Scenario | Expected |
| --- | --- |
| iPhone PWA reader | Header is below status area; content begins below header. |
| iPhone PWA navigation drawer | Drawer title/search/content are not hidden under status area. |
| iPhone PWA settings drawer | Header/body controls are not hidden by status area or home indicator. |
| Active audio mini-player | Mini-player stays above the home indicator and leaves scroll-to-top tappable. |
| Toast message | Toast stays above the home indicator. |
| Login/offline screens | Centered content stays inside safe area. |
| Desktop reader | Layout remains unchanged. |
