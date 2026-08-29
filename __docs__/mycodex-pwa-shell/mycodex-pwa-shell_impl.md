# MyCodex PWA Shell Implementation

## Code Paths

| File | Change |
| --- | --- |
| `src/app/sites/mycodex/layout.tsx` | Adds `mycodex-app-shell` while keeping `viewportFit: 'cover'`. |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Adds scoped class hooks for safe-area treatment on header, sidebar, settings drawer, main content, article, mini-player, scroll-to-top, and toast. |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Loads reader preferences from browser storage before persistence effects run, so saved settings are not overwritten by defaults on app start. |
| `src/app/sites/mycodex/favorites/page.tsx` | Adds the private `/favorites` reader page backed by browser-local starred documents. |
| `src/app/sites/mycodex/queue/page.tsx` | Adds the private `/queue` read-later page backed by browser-local queued documents. |
| `src/app/sites/mycodex/api/document/route.ts` | Adds a persisted-platform-role-authenticated, private/no-store Markdown reader for favorites playback. |
| `src/app/sites/mycodex/api/session/route.ts` | Retains the historical dedicated-cookie login handler for compatibility evidence; that cookie does not authorize the current reader, Founder Console, document API, or product APIs. |
| `src/lib/mycodex/docs.ts` | Centralizes MyCodex docs tree, canonical document resolution, a 4 MiB source limit, symlink exclusion, and heading extraction for document routes, favorites, and the document API. |
| `src/lib/mycodex/auth.ts` | Keeps `MYCODEX_PRODUCT_CODE = MC` for internal metadata and `MYCODEX_PRODUCT_SLUG = mycodex` for route/session checks; requires the dedicated `MYCODEX_SESSION_SECRET` for signing and rejects external, protocol-relative, encoded-internal, control-character, and backslash return paths. |
| `src/constants/product.ts` | Reserves `PRODUCT_IDS.MYCODEX = MC` without creating any MyCodex Firebase data path. |
| `src/app/sites/mycodex/styles.css` | Defines MyCodex safe-area variables and applies mobile-only spacing with `env(safe-area-inset-*)`. |
| `src/app/sites/mycodex/login/page.tsx` | Adds `mycodex-safe-page`. |
| `src/app/sites/mycodex/offline/page.tsx` | Adds `mycodex-safe-page`. |
| `public/mycodex-icon.svg`, `public/mycodex-icon-maskable.svg`, `public/mycodex-*.png` | Keep MyCodex install icons padded inside the square canvas so iPhone home-screen icons do not appear oversized. |
| `public/mycodex.webmanifest` | Uses `id=/__mycodex`, `scope=/__mycodex/`, and `start_url=/__mycodex/operations`; exposes Founder Console and Documents shortcuts and does not lock orientation. |
| `public/mycodex-sw.js` | Network-first navigation with only `/__mycodex/offline` and MyCodex logo assets cached; never caches Markdown or operational data. |
| `src/components/ServiceWorkerRegister.tsx` | Registers the MyCodex worker at `/__mycodex/` while preserving the root MenuList owner worker on the same origin. |
| `scripts/verification/verify-mycodex-pwa-assets.js` | Verifies the padded icon dimensions, transparent corners, manifest links, service-worker privacy scope, and launch images. |
| `src/middleware.ts` | Rewrites approved MyCodex host/local routes and returns a private 404 for direct `/sites/mycodex` namespace requests. |

## CSS Contract

MyCodex owns these CSS variables:

| Variable | Source |
| --- | --- |
| `--mycodex-safe-top` | `env(safe-area-inset-top, 0px)` |
| `--mycodex-safe-right` | `env(safe-area-inset-right, 0px)` |
| `--mycodex-safe-bottom` | `env(safe-area-inset-bottom, 0px)` |
| `--mycodex-safe-left` | `env(safe-area-inset-left, 0px)` |
| `--mycodex-mobile-header-height` | `4rem + top safe area` |

The `constant(safe-area-inset-*)` fallback remains for older iOS WebKit behavior.

## Local Storage Contract

MyCodex reader state is browser-local and scoped with `mycodex:*` keys. The shell must load these values before writing updated settings:

| Setting | Storage Key |
| --- | --- |
| Reader font size | `mycodex:reader-font-size` |
| Reader width | `mycodex:reader-width` |
| Desktop sidebar pinned state | `mycodex:sidebar-pinned` |
| Expanded navigation folders | `mycodex:expanded-folders` |
| Recent docs | `mycodex:recent-docs` |
| Favorite docs | `mycodex:favorite-docs` |
| Read-later queue | `mycodex:queue-docs` |
| Per-document scroll positions | `mycodex:scroll-positions` |
| Audio voice | `mycodex:audio-voice` |
| Audio speed | `mycodex:audio-rate` |
| Audio follow-reading scroll | `mycodex:audio-autoscroll` |
| Audio keep-screen-awake preference | `mycodex:audio-wake-lock` |

The hydration guard in `MyCodexClientContainer` prevents first-render defaults from resetting stored values during PWA relaunches or mobile browser refreshes. Storage access is failure-contained so browsers that block `localStorage` or `sessionStorage` keep the in-memory defaults and remain readable. Missing numeric values are not coerced to zero. Persisted document strings/timestamps and scroll-position keys/numbers are bounded before they enter state. Scroll-position writes retain only the 200 most recently updated documents, so the runtime cannot grow beyond the same admission cap and invalidate the complete record on the next launch.

Audio preparation owns an abort controller and generation. Replacing playback,
stopping, changing documents, or unmounting cancels outstanding favorite/queue
document reads and rejects late completions before they can start speech on a
different page. Wake-lock acquisition has the same release generation and
single in-flight boundary; a lock that resolves after stop/disable is released
without becoming active.

Screenshot export claims an immediate ref-backed single-flight lock before
canvas work. Clipboard copy reports success only after the modern API resolves
or the legacy `execCommand('copy')` returns `true`; a false legacy result uses
the existing visible error path.

The document API response projector bounds optional source paths to the same
4,096-character reader contract. ReactMarkdown render transforms use the
library `Components` and React-node contracts rather than broad `any` values.

MyCodex client navigation path boundary: `MyCodexClientContainer.buildUrl()` trims browser-local reader targets, requires an absolute same-origin path, and collapses empty, external, protocol-relative, control-character, raw-backslash, and encoded-backslash targets to `/`, then applies only the exact proxy-controlled `/__mycodex` base path when present. This keeps favorite, queue, recent, continue-reading, previous/next, and document-tree navigation on the MyCodex origin even if browser-local reader state is malformed.

## Favorites Route

`/favorites` is a MyCodex-only reader route. It reads `mycodex:favorite-docs` from browser `localStorage`, lists every starred document on the current device, and can play the list through the browser speech engine. Local development reaches the same page at `/__mycodex/favorites`.

## Mobile Session Flow

On mobile, `/` acts as a continue-reading home instead of immediately showing the full master index. The master index remains available from the home action and desktop still shows the index. The mobile bottom nav exposes Home, Search, Queue, Favorites, and Settings. `/queue` lists `mycodex:queue-docs` and is intended for temporary read-later sessions.

## Install Icon Contract

The approved `public/mycodex-logo.svg` mark remains the source logo. Square PWA icon variants render that mark at roughly 51% visible width and 70% visible height of the icon canvas. The icon render must use uniform scaling only: padding can change, but the visible aspect ratio must stay within `0.02` of the source logo so the mark never feels compressed. This keeps the iPhone installed icon visually balanced while preserving transparent corners and the original MyCodex colors.

## Boundaries

All safe-area styles are MyCodex-scoped with `mycodex-*` classes. They do not modify global MenuList or Answerlattice shells.

## Install and offline contract

MyCodex is installed from the canonical owner-app route, not from a separate
product host. Its manifest launches `/__mycodex/operations` and its worker uses
the narrower `/__mycodex/` scope, so it can coexist with
MenuList's root owner worker. Navigation remains network-first. The worker
caches only the generic MyCodex offline page and immutable MyCodex logo assets;
private documents, API responses, and operational screens are never cached.
The manifest omits an orientation lock so phone, tablet, and laptop window
rotation remain supported.

MyCodex owns no Firebase project, Firestore collections, Storage bucket, product `pId` writes, billing plans, or credit packs. The reader is filesystem-backed. The Founder Console only presents existing MenuList and Answerlattice operations through those products' governed boundaries.

`/sites/mycodex` is an internal rewrite destination, not a public route. The
middleware rejects that path and all descendants with a no-store, noindex 404
before product-host rewriting. This keeps the private namespace closed on
non-Vercel/self-hosted deployments as well as the intended host setup, while
`/__mycodex` local development and the exact canonical MenuList owner-app host continue through the persisted `PLATFORM` role boundary.

The login form posts only `username`, `password`, and `returnTo`. `src/app/sites/mycodex/api/session/route.ts` applies the `AUTH_LOGIN` rate limit before reading form data and fails closed if the distributed limiter is unavailable, then parses the form through `readBoundedFormDataBody()` with `MYCODEX_LOGIN_FORM_MAX_BODY_BYTES = 8 * 1024`. Oversized or malformed submissions redirect back to login with the fixed `input` error state. Access is configured only when the username, password, and dedicated session secret are all present; MenuList's NextAuth secret and the access password are never signing-secret fallbacks.

The document route repeats exact-session and current persisted-platform-user authentication inside the route handler instead of relying on proxy routing or the historical `mycodex_session` cookie. Rejections remain private and no-store. The filesystem loader resolves both the docs root and target to canonical paths, rejects symlinks that escape `__docs__`, omits symbolic links from generated navigation, and refuses Markdown sources larger than 4 MiB.
