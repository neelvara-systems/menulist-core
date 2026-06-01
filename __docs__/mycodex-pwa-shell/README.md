# MyCodex PWA Shell

Private PWA shell handling for MyCodex on `menulist.digital` and local `/__mycodex`.

## Scope

- Product: MyCodex only
- Host: `menulist.digital`
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
