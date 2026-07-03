# MyCodex PWA Shell Implementation

## Code Paths

| File | Change |
| --- | --- |
| `src/app/sites/mycodex/layout.tsx` | Adds `mycodex-app-shell` while keeping `viewportFit: 'cover'`. |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Adds scoped class hooks for safe-area treatment on header, sidebar, settings drawer, main content, article, mini-player, scroll-to-top, and toast. |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Loads reader preferences from browser storage before persistence effects run, so saved settings are not overwritten by defaults on app start. |
| `src/app/sites/mycodex/favorites/page.tsx` | Adds the private `/favorites` reader page backed by browser-local starred documents. |
| `src/app/sites/mycodex/queue/page.tsx` | Adds the private `/queue` read-later page backed by browser-local queued documents. |
| `src/app/sites/mycodex/api/document/route.ts` | Adds a protected no-store Markdown reader for favorites playback. |
| `src/app/sites/mycodex/api/session/route.ts` | Handles private reader login with IP rate limiting before form parsing and an 8 KB bounded form-data body cap. |
| `src/lib/mycodex/docs.ts` | Centralizes MyCodex docs tree, document resolution, and heading extraction for document routes, favorites, and the document API. |
| `src/lib/mycodex/auth.ts` | Keeps `MYCODEX_PRODUCT_CODE = MC` for internal metadata and `MYCODEX_PRODUCT_SLUG = mycodex` for route/session checks. |
| `src/constants/product.ts` | Reserves `PRODUCT_IDS.MYCODEX = MC` without creating any MyCodex Firebase data path. |
| `src/app/sites/mycodex/styles.css` | Defines MyCodex safe-area variables and applies mobile-only spacing with `env(safe-area-inset-*)`. |
| `src/app/sites/mycodex/login/page.tsx` | Adds `mycodex-safe-page`. |
| `src/app/sites/mycodex/offline/page.tsx` | Adds `mycodex-safe-page`. |
| `public/mycodex-icon.svg`, `public/mycodex-icon-maskable.svg`, `public/mycodex-*.png` | Keep MyCodex install icons padded inside the square canvas so iPhone home-screen icons do not appear oversized. |
| `scripts/verification/verify-mycodex-pwa-assets.js` | Verifies the padded icon dimensions, transparent corners, manifest links, service-worker privacy scope, and launch images. |

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

The hydration guard in `MyCodexClientContainer` prevents first-render defaults from resetting stored values during PWA relaunches or mobile browser refreshes.

## Favorites Route

`/favorites` is a MyCodex-only reader route. It reads `mycodex:favorite-docs` from browser `localStorage`, lists every starred document on the current device, and can play the list through the browser speech engine. Local development reaches the same page at `/__mycodex/favorites`.

## Mobile Session Flow

On mobile, `/` acts as a continue-reading home instead of immediately showing the full master index. The master index remains available from the home action and desktop still shows the index. The mobile bottom nav exposes Home, Search, Queue, Favorites, and Settings. `/queue` lists `mycodex:queue-docs` and is intended for temporary read-later sessions.

## Install Icon Contract

The approved `public/mycodex-logo.svg` mark remains the source logo. Square PWA icon variants render that mark at roughly 51% visible width and 70% visible height of the icon canvas. The icon render must use uniform scaling only: padding can change, but the visible aspect ratio must stay within `0.02` of the source logo so the mark never feels compressed. This keeps the iPhone installed icon visually balanced while preserving transparent corners and the original MyCodex colors.

## Boundaries

All safe-area styles are MyCodex-scoped with `mycodex-*` classes. They do not modify global MenuList or Answerlattice shells.

MyCodex is static/private documentation. It has no Firebase project, no Firestore collections, no Storage bucket, no product `pId` writes, and no billing plans or credit packs. The only Vercel-specific env vars are `MYCODEX_BASIC_AUTH_USER`, `MYCODEX_BASIC_AUTH_PASSWORD`, and `MYCODEX_SESSION_SECRET`.

The login form posts only `username`, `password`, and `returnTo`. `src/app/sites/mycodex/api/session/route.ts` applies the `AUTH_LOGIN` rate limit before reading form data, then parses the form through `readBoundedFormDataBody()` with `MYCODEX_LOGIN_FORM_MAX_BODY_BYTES = 8 * 1024`. Oversized or malformed submissions redirect back to login with the fixed `input` error state.
