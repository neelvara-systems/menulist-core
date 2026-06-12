# CampaignCue Product — Runtime Validation

## Scope

This validation record covers the CampaignCue public foundation and the protected export/download-first runtime: product routing, deployment matrix, static public shell, workspace app, owner setup screens, protected APIs, dedicated CampaignCue Firebase Admin boundary, Firestore rules, Storage rules, source facts, source inputs, read-only future provider posture, location records, asset rights metadata, structured campaign pack generation, trust gates, schedule/manual actions, owner-reported outcomes, launch-readiness checks, analytics summary, docs sync, and Firebase cost posture.

Social account connection, direct provider publishing, WhatsApp direct send, ad spend mutation, paid generation, billing checkout, rendered video provider calls, and MenuList write-back are intentionally not activated.

## Static Validation

| Check | Result |
| --- | --- |
| TypeScript / lint / build | Passed: `npx tsc --noEmit --incremental false`, `npm run lint`, `git diff --check`, and `npm run build` after the route-boundary alignment pass. |
| CampaignCue verifier | Passed: `npm run verify:campaigncue` after owner screen/API expansion, owner-usability hardening, Firebase cost/input-validation hardening, optional URL clearing, campaign create cost-count verification, source-fact derivation, structured output fields, owner-reported outcome action, launch-readiness checks, atomic idempotency, export/download delivery-boundary enforcement, atomic analytics increments, direct bounded list loaders, local mutation response merges, product-scoped constants enforcement, grouped navigation, owner-safe setup copy checks, route-boundary enforcement, exact dev-prefix matching, and URL-domain comment alignment. |
| Diff cleanliness | Passed for touched CampaignCue/product-boundary files: `git diff --check`. |
| Production build | Passed: `npm run build`. Build initially failed because Next emitted route files while generated page/app manifests omitted the matching entries; `next.config.js` now repairs emitted special Pages Router and App Router manifest entries during the server build. |
| Product registry | `campaigncue` exists in deployment targets and product-domain registry. |
| Route boundary | Public website files live under `src/app/sites/campaigncue`; owner workspace files live under `src/app/(campaigncue)/campaigncue/app`; the verifier fails if `src/app/sites/campaigncue/app` exists. |
| Dev-prefix boundary | `/__campaigncue` and `/__campaigncue/app` resolve as CampaignCue local routes; `/__campaigncuex` does not match the CampaignCue prefix. |
| Build manifest | `.next/routes-manifest.json` exists after build, includes `/campaigncue/app`, and does not include `/sites/campaigncue/app`. |
| Feature flags | Public site, app shell, source inputs, deterministic pack creation, and analytics enabled; publishing and billing disabled. |
| Namespace protection | `/__campaigncue` bypass and `campaigncue` subdomain/slug reservations added. |
| Dedicated Firebase Admin | `campaigncueFirestoreAdmin` added and CampaignCue server service switched to dedicated CampaignCue writes; MenuList Admin is used only for the read-only signed-in store profile source bootstrap. |
| Firebase config | `firebase-campaigncue.json`, `firestore-campaigncue.rules`, `firestore-campaigncue.indexes.json`, and `storage-campaigncue.rules` added. |
| Protected APIs | `/api/campaigncue/workspace`, `/api/campaigncue/campaigns`, `/api/campaigncue/campaigns/[campaignId]/actions`, `/api/campaigncue/assets`, `/api/campaigncue/analytics`, `/api/campaigncue/sources`, read-only `/api/campaigncue/integrations`, and `/api/campaigncue/locations` added with auth, scope, validation, and rate limits. |
| Owner screens | Workspace app includes Home first-use checklist, saved facts, Business Details, Inputs with optional expiry, Export and Download, Settings, Campaign Ideas with evidence, Campaign Packs with structured manual handoff fields and pack download, Creative/Social, Video/Reel, UGC, WhatsApp, Google Local, Ads, Checks, Calendar, Assets with consent metadata, Results with owner-reported outcomes, Agency, Locations, and Plan/Access launch-readiness posture screens. |

## Route Validation

| Route | Evidence |
| --- | --- |
| `http://localhost:3000/__campaigncue` | Returned `200` on the built server with `X-Forwarded-Proto: https`. |
| `http://localhost:3000/__campaigncue/app` | rewrites to `/campaigncue/app` and returned `200`, `noindex,nofollow` metadata, and the CampaignCue workspace bundle on the built server with `X-Forwarded-Proto: https`. |
| `http://localhost:3000/campaigncue/app` | Direct internal workspace route for the product route group; used only for local/internal verification, not public site placement. |
| `http://localhost:3000/__campaigncuex` | Returned `404`; it did not match the CampaignCue local dev prefix. |
| `http://localhost:3000/sites/campaigncue/app` | Returned `404` on the local built server after the old public-site owner route was removed. |
| `http://localhost:3000/__campaigncue/robots.txt` | Returned `200` with `Disallow: /app`, `Disallow: /__campaigncue/app`, and `https://campaigncue.ai/sitemap.xml`. |
| `http://localhost:3000/__campaigncue/sitemap.xml` | Returned `200` with the `https://campaigncue.ai/` sitemap URL. |
| `Host: campaigncue.ai` with production env | Product-domain `/app` returned `200`, `x-product-id: campaigncue`, `noindex`, and CampaignCue workspace HTML; direct `/sites/campaigncue/app` returned `301` to `/`. |
| `Host: campaigncue.menulist.online` with preview env | Public paths rewrite to `/sites/campaigncue`; product-domain `/app` returned `200`, `x-product-id: campaigncue`, `noindex`, and CampaignCue workspace HTML, matching the Answerlattice-style site/app separation. |
| Preview-host robots/sitemap | Returned `200` with `x-product-id: campaigncue`, CampaignCue content, and rewrites to `/sites/campaigncue/robots.txt` and `/sites/campaigncue/sitemap.xml`. |

## Browser Runtime Validation

| Surface | Result |
| --- | --- |
| Public page | Static route renders CampaignCue product shell and remains indexable. |
| Workspace app | Signed-out direct API request returns `401`; local browser session reaches `/api/campaigncue/workspace` and returns the external setup blocker because the CampaignCue Firebase project is not reachable from this environment. |
| Workspace error UX | The app maps `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` to an owner-safe setup-not-ready screen with no Firebase instructions. Desktop and `390x844` mobile checks had no horizontal overflow; fresh browser logs had no warnings or errors. |
| Metadata | Workspace page is `noindex,nofollow`; public page remains `index,follow`. |
| Owner-usability and route-boundary smoke | Built-server HTTP smoke with `X-Forwarded-Proto: https` returned `200` for `/__campaigncue`, `/__campaigncue/app`, `/campaigncue/app`, `campaigncue.ai/app`, `www.campaigncue.ai/app`, and `campaigncue.menulist.online/app`, set `x-product-id: campaigncue` on product-routed requests, loaded the app bundle, preserved workspace `noindex`, and did not include the old Firebase setup instruction. False prefixes `/__campaigncuex` and product-domain `/appx` returned `404`. Direct unauthenticated API smoke returned `401`. In-app Browser plugin attempts to open `localhost` and `127.0.0.1` were blocked by the client before the app loaded, so this pass used HTTP route evidence instead of a fresh visual screenshot. |

## Cost And Deploy

Firebase deploy is now required because CampaignCue Firestore rules, indexes, Storage rules, and a dedicated Firebase deploy config were added. The deploy target is CampaignCue, not the default MenuList Firebase target:

```bash
firebase deploy --config firebase-campaigncue.json --project campaigncue-qa --only firestore:rules,firestore:indexes,storage
```

Deploy attempts in this session failed with HTTP 403: Project `campaigncue-qa` not found or permission denied. A local authenticated workspace API smoke hit the same class of blocker and now returns safe `503` code `CAMPAIGNCUE_FIREBASE_UNAVAILABLE`. This is an external Firebase project/provisioning/access blocker, not a TypeScript/build failure.

No Cloud Function deploy is required for the current runtime because no CampaignCue Cloud Functions were added.

No Vercel deploy was run. Production readiness still requires external DNS/domain/Vercel setup for `campaigncue.ai`, preview host mapping for `campaigncue.menulist.online`, actual Firebase project provisioning for `campaigncue-qa` and `campaigncue`, and CampaignCue Firebase env vars.

## Running Audit

See [campaigncue-production-implementation-audit.md](../campaigncue-production-implementation-audit.md).
