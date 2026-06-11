# CampaignCue Product — Implementation Plan

## Architecture Decision

CampaignCue should live in the same repo with a separate product boundary. Implementation must not mutate MenuList public truth, not depend on Answerlattice runtime, and not reuse GrowthOS identity.

## Implementation Status

CampaignCue now has a repo-level public shell and a protected manual/export-first runtime. The runtime adds CampaignCue workspace APIs, a dedicated Firebase Admin client, CampaignCue Firebase rules/config files, Business Brain bootstrap, source snapshots, deterministic opportunity cues, campaign packs, trust reports, asset metadata, manual schedule records, approval request logging, and bounded analytics summaries.

It still does not create direct provider calls, billing checkout, ad spend mutations, WhatsApp direct sends, rendered video provider calls, or MenuList write-back.

## Proposed Product Shape

| Layer | Contract |
| --- | --- |
| Public website | `src/app/sites/campaigncue` and local `/__campaigncue` route. |
| Workspace app | `src/app/(campaigncue)/campaigncue/app`; local `/__campaigncue/app` and product-domain `/app` rewrite to `/campaigncue/app`. |
| Product id | `campaigncue` added to product/domain/deployment registries. |
| Firebase | Separate project ids selected: `campaigncue-qa` and `campaigncue`; config/rules files added through `firebase-campaigncue.json`. |
| Functions | No CampaignCue Cloud Function is required for the current manual/export-first runtime. Scheduled/provider workers remain disabled until external credentials and leases are configured. |
| Billing | Product-aware billing with `productId: "campaigncue"` or approved short code. |
| Auth | Shared account bridge allowed; CampaignCue workspace scope required. |
| Data access | Server-side product APIs for source, generation, publishing, billing, and trust actions. |

## Core Services

| Service | Responsibility |
| --- | --- |
| WorkspaceService | Workspace, membership, agency, multi-location scope. |
| BusinessBrainService | Profile, catalog, brand kit, source confidence. |
| SourceConnectionService | Manual/upload/website/MenuList/Google/WhatsApp/Meta/source links. |
| OpportunityService | Campaign cues. |
| CampaignService | Campaign brief and pack state. |
| GenerationService | Visual/script/video/ad generation jobs. |
| AssetService | Upload, classify, rights/consent metadata. |
| TrustService | Fact, source, consent, claim, synthetic-content checks. |
| CreditService | Estimate, reserve, capture, refund. |
| PublishService | Direct publish or manual fallback. |
| AnalyticsService | Usage/execution/performance/outcome separation. |

## Implementation Acceptance

| Area | Required before activation |
| --- | --- |
| Product routing | Local, preview, production routing matrix documented and implemented. |
| Feature flags | Public shell, app shell, source context, deterministic generation, and analytics enabled. Publishing and billing disabled. |
| Security | Server-side workspace, client, location, source, credit, trust checks. |
| Firebase rules | Default deny with explicit CampaignCue product scopes. |
| Jobs | Current runtime uses synchronous server APIs with idempotency. Async generation/render/sync/publish/report jobs remain blocked until provider mode is enabled. |
| Trust | Critical blockers enforced before export, handoff, and any future connected publish/direct send. |
| Cost | Deterministic generation costs zero credits; paid generation remains disabled. |
| Mobile | Owner critical actions tested in mobile shell. |

## Validation Checklist

| Check | Status |
| --- | --- |
| Docs package created | Complete in this pass. |
| Code changes | Foundation shell, protected workspace, APIs, Firebase Admin boundary, rules, storage rules, and UI implemented. |
| Firebase deploy | Required for CampaignCue Firebase via `firebase-campaigncue.json`; external credentials/project access needed. |
| Type check | `npx tsc --noEmit --incremental false` passed for the current implementation. |
| Runtime smoke | Required for `/__campaigncue`, `/__campaigncue/app`, `/__campaigncue/robots.txt`, and `/__campaigncue/sitemap.xml`. |

## Foundation Files

| File | Role |
| --- | --- |
| `src/config/features.ts` | CampaignCue shell and disabled runtime flags. |
| `src/constants/deploymentTargets.ts` | Local, preview, and production host matrix. |
| `src/constants/productDomains.ts` | Product-site registry and internal route mapping. |
| `src/lib/multiTenant/domainResolver.ts` | Internal dev-prefix bypass. |
| `src/constants/reservedSlugs.ts` | Product namespace reservation. |
| `src/constants/urls.ts` | Product preview subdomain reservation. |
| `src/middleware.ts` | Product-routing documentation comments. |
| `src/app/sites/campaigncue/*` | Static public CampaignCue shell, styles, robots, and sitemap. Public website only; do not add owner dashboard pages here. |
| `src/app/(campaigncue)/campaigncue/app/page.tsx` | Protected CampaignCue workspace app route. |
| `src/components/templates/campaigncue/*` | Workspace UI and responsive styles. |
| `src/app/api/campaigncue/*` | Protected CampaignCue API routes. |
| `src/lib/campaigncue/*` | Runtime guards and server services. |
| `src/lib/firebase/campaigncue*` | Dedicated CampaignCue Firebase config/Admin boundary. |
| `firebase-campaigncue.json`, `firestore-campaigncue.rules`, `storage-campaigncue.rules` | CampaignCue Firebase deploy files. |
| `public/campaigncue.webmanifest` | CampaignCue-specific PWA manifest to avoid MenuList manifest leakage. |
| `public/campaigncue-icon.svg` | CampaignCue-specific icon metadata asset. |
| `src/components/atoms/campaignCueLoaderLogo/index.tsx` | CampaignCue loader mark. |
| `src/components/atoms/brandedPageLoader/index.tsx` and `src/app/loading.tsx` | Server loading state supports CampaignCue product branding. |
| `src/components/organisms/loader/*` | Client global loader supports CampaignCue product branding. |

## Disagreements With ChatGPT

- Do not frame the product as "Local Business Campaign Engine" publicly. It is descriptive but not brandable.
- Do not treat avatar/AI UGC as the first video primitive. Use uploaded assets, scripts, voiceover, subtitles, and end cards first.
- Do not claim Google ranking, ad ROI, bookings, or sales without measured source data.
- Do not allow direct MenuList writes from CampaignCue unless MenuList later exposes an explicit owner-approved write-back API.

## Running Audit

See [campaigncue-production-implementation-audit.md](../campaigncue-production-implementation-audit.md) for the feature-by-feature implementation audit and current production-readiness status.
