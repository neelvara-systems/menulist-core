# MyCodex PWA Shell

Private PWA shell handling for MyCodex on local `/__mycodex`. No public MyCodex domain is active.

The installed app is scoped to `/__mycodex/`, launches the Founder Console at
`/__mycodex/operations`, allows phone/tablet/laptop rotation, and uses a
MyCodex-only service worker without replacing MenuList's root owner worker.
Only the offline recovery shell and reviewed logo assets are cached; private
documents and operational responses always require the live application.

## Scope

- Product: MyCodex only
- Host: none active
- Local route: `/__mycodex`
- Primary user device: desktop browser and iPhone/iPad PWA installs

## Documents

| File | Purpose |
| --- | --- |
| [mycodex-pwa-shell_spec.md](./mycodex-pwa-shell_spec.md) | Behavior and UX contract |
| [mycodex-pwa-shell_impl.md](./mycodex-pwa-shell_impl.md) | Technical implementation |
| [mycodex-pwa-shell_firebase.md](./mycodex-pwa-shell_firebase.md) | Firebase impact |
| [mycodex-pwa-shell_mobile-support.md](./mycodex-pwa-shell_mobile-support.md) | Mobile and iOS PWA handling |
| [mycodex-pwa-shell_helpdoc.md](./mycodex-pwa-shell_helpdoc.md) | Operator notes |
| [mycodex-pwa-shell_website.md](./mycodex-pwa-shell_website.md) | Public website impact |
| [mycodex-pwa-shell_marketing.md](./mycodex-pwa-shell_marketing.md) | Internal positioning |
| [mycodex-pwa-shell_test-cases.md](./mycodex-pwa-shell_test-cases.md) | Verification checklist |

## Implementation Files

| File | Responsibility |
| --- | --- |
| `src/app/sites/mycodex/layout.tsx` | MyCodex layout shell class and PWA viewport metadata |
| `src/app/sites/mycodex/components/MyCodexClientContainer.tsx` | Reader shell, mobile home, queue/favorites views, header, drawers, fixed controls |
| `src/app/sites/mycodex/queue/page.tsx` | Read-later route |
| `src/app/sites/mycodex/favorites/page.tsx` | Favorites route |
| `src/app/sites/mycodex/styles.css` | Safe-area variables and mobile PWA spacing |
| `src/app/sites/mycodex/login/page.tsx` | Safe-area login screen |
| `src/app/sites/mycodex/offline/page.tsx` | Safe-area offline screen |
| `public/mycodex.webmanifest` | Owner-path install identity, launch route, scope, and shortcuts |
| `public/mycodex-sw.js` | Network-first MyCodex navigation with a scoped offline shell only |
| `src/components/ServiceWorkerRegister.tsx` | Coexisting root MenuList and `/__mycodex/` worker registration |
