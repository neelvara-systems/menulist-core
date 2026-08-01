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
| Distributed login limiter unavailable | Login fails closed before credential validation. |
| Missing dedicated session secret | Protected requests return configuration failure and no token is signed with the NextAuth secret or access password. |
| External, backslash, encoded internal, or protocol-relative return path | Login redirects only to `/`; no cross-origin or internal API redirect is possible. |
| Direct document handler request without a valid session | Returns private/no-store `401`, or `503` when access configuration is incomplete. |
| Symlink outside `__docs__` or Markdown source over 4 MiB | The source is not resolved or returned; symbolic links are absent from the document tree. |
| Desktop reader | Layout remains unchanged. |
| Direct `/sites/mycodex` or descendant request | Fixed no-store, noindex 404; internal rewrite namespace is not addressable. |
| Save scroll progress for more than 200 documents | Only the 200 most recently updated positions persist; the next launch retains the valid record. |
| Start favorite/queue audio, then stop or navigate before fetch completion | Pending reads abort and no old document begins speaking on the replacement page. |
| Disable/stop keep-awake while a wake-lock request is pending | A late acquired lock is immediately released and does not reactivate the indicator. |
| Rapid screenshot-copy taps | Only one canvas/clipboard/share flow runs. |
| Legacy clipboard API returns `false` | The reader shows the copy failure state and never reports success. |
| Document API returns an oversized source path | The browser projector rejects the response before it enters reader state. |

## Automated Boundary

```bash
npm run verify:mycodex-pwa-assets
```

The verifier requires the direct internal namespace denial to execute before
the MyCodex product rewrite, in addition to the PWA, fail-closed login,
dedicated-secret, return-path, handler-authenticated static-reader,
canonical-path/size, three-environment-key, and zero-Firebase checks. It also
runs `scripts/verification/test-mycodex-auth-boundary.ts`.
