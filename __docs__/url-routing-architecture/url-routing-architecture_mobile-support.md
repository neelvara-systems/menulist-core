# URL Routing Architecture — Mobile Support Assessment

> **Last Updated:** July 2, 2026
> **Version:** 1.3
> **Local Source Gate:** `npm run verify:url-routing-boundary`

---

## Feature Admission Test (4 Gates)

| Gate          | Question                     | Answer                                                | Result  |
| ------------- | ---------------------------- | ----------------------------------------------------- | ------- |
| **Frequency** | Daily or multiple times/day? | No — URL routing is infrastructure, not a user action | ❌ FAIL |
| **Speed**     | Completes in <5 seconds?     | N/A — no user interaction                             | ❌ FAIL |
| **Touch**     | Works with thumb-only?       | N/A — no touch interface                              | ❌ FAIL |
| **Value**     | Needed away from desk?       | No — URL routing is invisible infrastructure          | ❌ FAIL |

**Decision: Desktop Only (Infrastructure)**

URL Routing Architecture is server-side infrastructure. It has no user-facing mobile surface. The feature operates entirely at the middleware, SSR, and DAL level — invisible to both desktop and mobile users.

MyCodex is the exception inside this doc set because `menulist.digital` is an installable internal reader surface. Its PWA support is still infrastructure-scoped: mobile users get the MyCodex manifest, app icon, Apple launch image, and offline fallback automatically from the product host. The service worker does not cache private documentation content.

---

## What Mobile Users Experience

Mobile users (customers visiting menus via phone) benefit from this feature automatically:

- **Permanent URLs** — QR codes scanned on phone always work even after menu rename
- **CDN caching** — Faster menu load on mobile via Vercel Edge
- **301 redirects** — Old shared links redirect correctly on mobile browsers
- **MyCodex install identity** — `menulist.digital` installs as MyCodex, not as MenuList or Answerlattice

No mobile-specific UI, components, or screens needed.

The July 2, 2026 `npm run verify:url-routing-boundary` source gate is mobile-neutral. It validates middleware/domain routing, tenant headers, current `/client` route documentation, and docs parity without adding mobile UI, browser QA, live Firestore reads, provider calls, or deploy steps.

safe outlet path segments are also mobile-neutral. Mobile customers benefit when brand OBP location cards, outlet OBP links, sitemap URLs, and canonical redirects hide invalid legacy outlet slugs instead of opening malformed public paths. This adds no mobile UI, mobile route, owner setting, Firebase write, or separate mobile data path. Source gate: `npm run verify:url-routing-boundary`.

safe project path segments are also mobile-neutral. Mobile customers benefit when menu lookups, old-slug redirects, sitemap URLs, canonical URLs, and OBP menu CTA links hide invalid legacy project slugs instead of opening malformed public paths. This adds no mobile UI, mobile route, owner setting, Firebase write, or separate mobile data path. Source gate: `npm run verify:url-routing-boundary`.

---

## Related Mobile Screens

| Screen                     | Relationship                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `MobileShareScreen`        | Uses `generateProjectUrl()` which relies on `subdomain`/`customDomain` from store data. No changes needed — slug generation is upstream in DAL. |
| `MobileDomainSettingsScreen` | Manages owner subdomain/custom-domain setup inside the mobile shell. `/api/domain` and `/api/subdomain/check` calls use the shared authenticated browser request policy before bounded response parsing, and remove requires the `{ success: true, removed: true }` delete acknowledgement before clearing local custom-domain state. |
| `MobileDesignEditorScreen` | No relationship                                                                                                                                 |

---

## Conclusion

This feature is **pure infrastructure** — no mobile admission test gates pass. Mobile users benefit passively through better URL permanence and CDN performance.
