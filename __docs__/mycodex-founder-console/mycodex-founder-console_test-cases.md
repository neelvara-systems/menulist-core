# MyCodex Founder Console Test Cases

## Authorization

| Scenario | Expected |
| --- | --- |
| Signed out | Redirect to sign-in with a bounded MyCodex callback path. |
| Normal owner/store role only | Denied; store role never grants platform access. |
| Stale session claims after persisted role revocation | Denied by the current-user platform guard. |
| Exact current `PLATFORM` account | Console and platform APIs are admitted. |
| Historical `mycodex_session` cookie only | No founder-console or platform API authority. |
| Unknown console slug | Not found; no dynamic arbitrary import. |

## Routing

| Scenario | Expected |
| --- | --- |
| Local `/__mycodex/operations` | Rewrites to MyCodex and preserves visible base path. |
| Owner-app `/__mycodex/operations` | Same-origin private rewrite with noindex/no-store headers. |
| Direct `/sites/mycodex/*` | Private 404. |
| Existing `/platform/*` | Remains usable. |
| Existing `/ops/*` | Remains usable during compatibility window. |
| CampaignCue route attempt | No catalog entry and no surface. |

## Responsive behavior

| Viewport | Expected |
| --- | --- |
| 390x844 | Safe-area bottom navigation, single column, 44px controls, no page overflow. |
| 768x1024 | Collapsible navigation and usable operational content. |
| 1280x800 | Persistent navigation and full platform components. |
| 1440x900 | Bounded home content and wide data surfaces. |

## Appearance

| Scenario | Expected |
| --- | --- |
| Every catalogued operational surface in light mode | MyCodex shell and embedded Ant Design content are light; no dark cards remain. |
| Every catalogued operational surface in dark mode | MyCodex shell and embedded Ant Design content are dark; no bright card remains. |
| Laptop theme control | Visible in persistent navigation, keyboard focused, and announces the next action. |
| Phone theme control | Visible in the header, at least 44x44px, and remains usable with the navigation drawer open or closed. |
| Reader dark → Operations | The same dark preference remains active after navigation. |
| Operations light → Reader, queue, or favorites | The same light preference remains active and Reader settings offers Dark mode. |
| Reload after either choice | Pre-paint script applies the persisted application theme before the client hydrates. |
| Mobile navigation drawer | Drawer, shortcuts, and overlay match the active theme with no page-level overflow. |

## Runtime states

| Scenario | Expected |
| --- | --- |
| Home load succeeds | Status and bounded Ops summary render with last-updated time. |
| Home load fails | Explicit unavailable state and Retry; no healthy-looking zeros. |
| One product unavailable | Its surface shows unavailable/configuration state without breaking the other product. |
| Offline | The branded recovery shell appears; documents, operational reads, writes, and refreshes are not served from worker cache. |
| Rapid refresh | One current result wins; late results do not overwrite it. |
| Route change during load | Unmounted screen does not update or toast. |

## Static gates

```bash
npx tsc --noEmit --incremental false
npm run lint
npm run verify:mycodex-pwa-assets
npm run security-os:audit -- --product mycodex
npm run security-os:plan -- --product mycodex
```

Focused verification must additionally prove the catalog, feature flag, owner-app rewrite, exact platform guard, zero-MyCodex-Firebase boundary, responsive shell, shared reader/console theme store, pre-paint theme projection, and legacy Basic Auth non-authority.
