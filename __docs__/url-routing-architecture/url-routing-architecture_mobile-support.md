# URL Routing Architecture — Mobile Support Assessment

> **Last Updated:** July 16, 2026
> **Version:** 1.6
> **Local Source Gate:** `npm run verify:url-routing-boundary`

Owner public-link assignment is shared by mobile and desktop settings. Once the protected claim/store/summary transaction commits, derived cache/screen/assistant failures return pending metadata instead of a false save failure; there is no mobile-only persistence path.

---

## Feature Admission Test (4 Gates)

| Gate          | Question                     | Answer                                                | Result  |
| ------------- | ---------------------------- | ----------------------------------------------------- | ------- |
| **Frequency** | Daily or multiple times/day? | No — URL routing is infrastructure, not a user action | ❌ FAIL |
| **Speed**     | Completes in <5 seconds?     | N/A — no user interaction                             | ❌ FAIL |
| **Touch**     | Works with thumb-only?       | N/A — no touch interface                              | ❌ FAIL |
| **Value**     | Needed away from desk?       | No — URL routing is invisible infrastructure          | ❌ FAIL |

**Decision: Shared Infrastructure With Existing Owner Settings Parity**

URL resolution remains server-side infrastructure. Subdomain and custom-domain setup are already exposed through the existing desktop and mobile Domain Settings screens; both surfaces use the same authenticated server boundaries and store state.

MyCodex is the exception inside this doc set because `menulist.digital` is an installable internal reader surface. Its PWA support is still infrastructure-scoped: mobile users get the MyCodex manifest, app icon, Apple launch image, and offline fallback automatically from the product host. The service worker does not cache private documentation content.

---

## What Mobile Users Experience

Mobile users (customers visiting menus via phone) benefit from this feature automatically:

- **Permanent URLs** — QR codes scanned on phone always work even after menu rename
- **CDN caching** — Faster menu load on mobile via Vercel Edge
- **301 redirects** — Old shared links redirect correctly on mobile browsers
- **MyCodex install identity** — `menulist.digital` installs as MyCodex, not as MenuList or Answerlattice

No new mobile component or separate mobile data path is needed.

The July 2, 2026 `npm run verify:url-routing-boundary` source gate is mobile-neutral. It validates middleware/domain routing, tenant headers, current `/client` route documentation, and docs parity without adding mobile UI, browser QA, live Firestore reads, provider calls, or deploy steps.

safe outlet path segments are also mobile-neutral. Mobile customers benefit when brand OBP location cards, outlet OBP links, sitemap URLs, and canonical redirects hide invalid legacy outlet slugs instead of opening malformed public paths. This adds no mobile UI, mobile route, owner setting, Firebase write, or separate mobile data path. Source gate: `npm run verify:url-routing-boundary`.

safe project path segments are also mobile-neutral. Mobile customers benefit when menu lookups, old-slug redirects, sitemap URLs, canonical URLs, and OBP menu CTA links hide invalid legacy project slugs instead of opening malformed public paths. This adds no mobile UI, mobile route, owner setting, Firebase write, or separate mobile data path. Source gate: `npm run verify:url-routing-boundary`.

The July 11, 2026 brand subdomain master-store admission boundary keeps the existing desktop and mobile Domain Settings screens aligned with server authority. Both screens already replace assignment controls with `outletSubdomainInfo` and `outletSubdomainDesc` when `storeDetails.isMaster === false`; both authenticated GET and POST API paths now independently reject an explicit outlet. Legacy stores without an `isMaster` marker are admitted only when bounded canonical topology reads prove the current store is the tenant's sole store. This adds no mobile route, provider call, write for rejected outlets, or separate mobile state.

The July 13, 2026 custom-domain claim hardening is shared server infrastructure for both owner surfaces. Mobile keeps the same `/api/domain` add/status/remove calls and `{ success: true, removed: true }` removal acknowledgement. The route now serializes same-store and cross-store requests, rejects duplicate/mismatched legacy ownership with `409`, rechecks canonical tenant/store eligibility around provider reads, and returns truthful `refreshPending`, `providerCleanupPending`, or `claimReleasePending` metadata when authoritative work committed but a derived effect remains. No mobile-only Firestore/provider path or new owner decision was added; fixed failure copy remains appropriate for conflict responses.

The July 16 parity pass moves mobile custom-domain availability to the authenticated `GET /api/domain?candidate=` advisory boundary, so mobile no longer depends on a browser Firestore query for cross-store uniqueness. Mobile add now requires `success: true` plus a returned domain, applies the returned verified boolean, and prefers explicit status booleans over stale store context. Explicit provider downgrade clears the verified badge. Successful add/remove responses with pending derived effects show fixed background refresh/cleanup copy. No mobile-only DAL, provider path, or persistence contract was added.

Mobile and desktop also share `normalizeVercelDomainDnsRecords()`: apex instructions use Vercel's preferred IPv4/A response, subdomain instructions use the project-specific preferred CNAME, and TXT challenges preserve provider name/value. If the provider response has no unambiguous guidance, mobile shows a retry message and never fabricates a generic CNAME.

---

## Related Mobile Screens

| Screen                     | Relationship                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `MobileShareScreen`        | Uses `generateProjectUrl()` which relies on `subdomain`/`customDomain` from store data. No changes needed — slug generation is upstream in DAL. |
| `MobileDomainSettingsScreen` | Manages owner subdomain/custom-domain setup inside the mobile shell. Custom-domain advisory/add/status/remove and subdomain checks use authenticated server boundaries before bounded response parsing; add requires `success: true` plus domain, and remove requires `{ success: true, removed: true }`. |
| `MobileDesignEditorScreen` | No relationship                                                                                                                                 |

---

## Conclusion

Routing remains shared infrastructure, while the existing mobile owner settings inherit the same master-store admission rule as desktop. Customer mobile users continue to benefit passively through URL permanence and CDN performance.
