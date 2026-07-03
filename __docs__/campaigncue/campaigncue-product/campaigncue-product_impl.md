# CampaignCue Product — Implementation Plan

## Architecture Decision

CampaignCue should live in the same repo with a separate product boundary. Implementation must not mutate MenuList public truth, not depend on Answerlattice runtime, and not reuse GrowthOS identity.

## Implementation Status

CampaignCue now has a repo-level public shell and a protected export/download-first runtime. The runtime adds CampaignCue workspace APIs, a dedicated Firebase Admin client, CampaignCue Firebase rules/config files, Business Brain bootstrap with Brand Playbook fields, source snapshots, source facts, evidence-backed opportunity cues, deterministic Campaign Decision Engine scoring, structured campaign packs, first-class pack reviews, canonical Campaign Pack Output ZIPs with Campaign Proof Deck briefs, manual delivery cards, local visibility cues, trust reports, asset rights metadata, manual schedule records, approval request logging, compact owner-reported result memory, launch-readiness checks, bounded analytics summaries, and a CampaignCue dashboard shell that reuses the same MenuList authenticated app foundation, theme settings, language settings, shared dashboard sidebar, shared top header, profile menu, and settings drawer.

CampaignCue workspace catch-path notices and failed API response branches use fixed product-specific fallback copy. Browser/local exceptions and route response text should not surface raw exception or provider text in owner notices. Workspace, CueLayers, campaign, business, source, location, action, asset, download, and editor-export browser callers parse route responses through a 4 MB bounded response reader and require the documented `{ data }` envelopes before updating local state. Manual handoff-field copy checks Clipboard API support, falls through from rejected Clipboard API writes to acknowledged textarea fallback, waits for browser copy acknowledgement, and logs `campaigncue_handoff_copy_failed` with bounded support and value-length metadata before fixed local copy.

CampaignCue shared API guards hash user, tenant, and store rate-limit key segments before writing provider keys, and tenant/rate-limit security logs use bounded scope metadata instead of raw workspace identifiers. This keeps the protected API limits and ordering unchanged while avoiding raw identity values in Upstash key names or security-log extras.

It still does not create direct provider calls, billing checkout, ad spend mutations, WhatsApp direct sends, rendered video provider calls, or MenuList write-back.

## Proposed Product Shape

| Layer | Contract |
| --- | --- |
| Public website | `src/app/sites/campaigncue` and local `/__campaigncue` route. |
| Workspace app | `src/app/(campaigncue)/campaigncue/app`; local `/__campaigncue/app` and product-domain `/app` rewrite to `/campaigncue/app`. |
| Dashboard shell | CampaignCue uses the same `LocalisationProvider`, Redux persisted theme state, `AntdThemeProvider`, global shortcuts, network status provider, shared dashboard header/sidebar primitives, profile menu, and App Settings drawer as MenuList. The shell applies shared dark/light, RTL, language, timezone, profile, and settings behavior. Sidebar/header chrome labels live in the shared locale files under `CampaignCue.Navigation`; the inner workspace content remains CampaignCue-specific. |
| Product identity | `CC` added as the internal product code; `campaigncue` remains the product/domain/deployment slug. |
| Firebase | Separate project ids selected: `campaigncue-qa` and `campaigncue`; config/rules files added through `firebase-campaigncue.json`. |
| Functions | No CampaignCue Cloud Function is required for the current export/download-first runtime. Scheduled/provider workers remain disabled until external credentials, consent, quotas, idempotency, and leases are configured. |
| Billing | Billing checkout remains disabled. Future product-aware billing must use the approved CampaignCue product code `CC`; current shared billing helpers fail closed for `CC` instead of falling back to MenuList. Route/domain/env namespaces stay on the `campaigncue` slug. |
| Auth | Same NextAuth login/session guard as MenuList; inactive, deleted, unverified, or platform-blocked accounts redirect before workspace render. The shell intentionally avoids MenuList store/subscription bootstrap reads just to draw CampaignCue chrome. CampaignCue APIs still require tenant/store workspace scope. |
| Data access | Server-side product APIs for source, generation, publishing, billing, and trust actions. |

## Core Services

| Service | Responsibility |
| --- | --- |
| WorkspaceService | Workspace, membership, agency, multi-location scope. |
| BusinessBrainService | Profile, catalog, brand kit, Brand Playbook, source facts, missing fact list, vertical risk context. |
| SourceConnectionService | Manual/upload/website/MenuList/Google/WhatsApp/Meta/source links. |
| OpportunityService | Campaign cues with owner benefit, evidence, and safe next action labels. |
| CampaignDecisionEngine | Deterministically ranks campaign recipes from Business Brain facts, timing/readiness signals, assets, missing inputs, trust risk, owner effort, repetition, and compact result memory. It does not call AI, providers, Firebase, or Storage. |
| CampaignService | Campaign brief, structured channel fields, manual handoff steps, and pack state. |
| DailyDeskService | In-memory Daily Campaign Desk, pack review, missing input inbox, local visibility cues, and manual delivery cards derived from the existing overview. |
| CampaignPackOutputService | Derived output-pack contract with channel copy, trust report, reuse notes, mini-page/QR brief, Campaign Proof Deck brief, result memory, and browser-local ZIP bundle. |
| GenerationService | Visual/script/video/ad generation jobs. |
| AssetService | Upload, classify, rights/consent metadata. |
| TrustService | Fact, source, consent, claim, vertical, destination, asset-rights, and spend checks. |
| CreditService | Estimate, reserve, capture, refund. |
| DeliveryService | Single-output download, Campaign Pack ZIP download, schedule, approval, manual-use, and result tracking. Provider posting is a separate future layer. |
| AnalyticsService | Usage, manual execution, owner-reported outcomes, confidence labels, and provider-disabled posture. |

## Implementation Acceptance

| Area | Required before activation |
| --- | --- |
| Product routing | Local, preview, production routing matrix documented and implemented. |
| Feature flags | Public shell, app shell, source context, deterministic generation, and analytics enabled. Publishing and billing disabled. |
| Security | Server-side workspace, client, location, source, credit, trust checks. |
| Firebase rules | Default deny with explicit CampaignCue product scopes. |
| Jobs | Current runtime uses synchronous server APIs with idempotency. Async generation/render/sync/publish/report jobs remain blocked until provider mode is enabled. |
| Trust | Critical blockers and channel warnings enforced before export, handoff, and any future connected publish/direct send. |
| Cost | Deterministic generation costs zero credits; paid generation remains disabled. |
| Mobile | Owner critical actions remain within the responsive CampaignCue workspace; download/export, schedule, mark used, source input, asset metadata, and result recording use 44px touch targets. |
| Theme/i18n shell | CampaignCue route group must keep the shared MenuList dark/light, color, RTL, timezone, date/time, and language settings available through the same App Settings panel. CampaignCue dashboard chrome uses shared `next-intl` locale files. CampaignCue owner-page body copy can remain product-specific, but shell behavior must not fork from MenuList. |
| Date/time handling | Durable timestamps stay as Firestore `Timestamp` or UTC ISO strings. Owner-facing dates and times render through the shared `next-intl` formatter from `LocalisationProvider`, so selected timezone, date format, time format, language, and RTL settings apply. Native datetime inputs are converted with the workspace timezone before persistence; invalid workspace timezone values are rejected at the API schema boundary. |
| Campaign pack review | Latest campaign review is derived from already-loaded source facts, outputs, trust state, missing inputs, and visibility cues; no separate pack collection is added. |
| Campaign Pack Output | `CampaignCueOutputPack` is derived from the same overview and downloaded as a browser-local ZIP containing summary, JSON, channel files, trust notes, reuse notes, Campaign Proof Deck brief, and result prompt. |
| Campaign decision object | Created campaigns store the selected deterministic `campaign.pack.decision` plus `recipeId` so later exports can show why the pack was recommended without re-running a model. |
| Result memory | `record_outcome` accepts a structured `resultSignalId` and updates compact `campaign.resultMemory` for repeat/adjust recommendations without raw scans. |

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
| `src/app/(campaigncue)/layout.tsx` | CampaignCue protected layout. Mirrors MenuList app providers for auth, localization, Redux theme persistence, Ant Design theme, shortcuts, network status, session expiry, and app-update prompts without loading MenuList store/subscription context. |
| `src/components/templates/campaigncue/*` | Workspace UI and responsive styles. |
| `src/app/api/campaigncue/*` | Protected CampaignCue API routes. |
| `src/lib/campaigncue/*` | Runtime guards and server services. |
| `src/lib/campaigncue/apiGuards.ts` | Shared CampaignCue runtime, tenant-scope, rate-limit, and JSON body admission guard. The parser caps JSON bodies through `readBoundedJsonBody()` using the CueLayers upload/export/editor-document limits before route schemas run. |
| `src/lib/campaigncue/dailyDesk.ts` | Daily Desk builder, pack review, manual delivery cards, missing input inbox, and local visibility cues. |
| `src/lib/campaigncue/decisionEngine.ts` | Deterministic Campaign Decision Engine used by overview rendering and campaign creation. |
| `src/constants/campaigncue/dailyDesk.ts` | CampaignCue recipe constants and owner result signals. |
| `src/lib/firebase/campaigncue*` | Dedicated CampaignCue Firebase config/Admin boundary. |
| `firebase-campaigncue.json`, `firestore-campaigncue.rules`, `storage-campaigncue.rules` | CampaignCue Firebase deploy files. |
| `public/campaigncue.webmanifest` | CampaignCue-specific PWA manifest to avoid MenuList manifest leakage. |
| `public/campaigncue-icon.svg` | Transparent canonical CampaignCue logo source asset. |
| `public/campaigncue-favicon.ico`, `public/campaigncue-favicon-16.png`, `public/campaigncue-favicon-32.png` | Generated browser favicon assets from the canonical transparent logo. |
| `public/campaigncue-icon-*.png`, `public/campaigncue-icon-maskable-*.png`, `public/campaigncue-apple-touch-icon.png` | Generated CampaignCue install/PWA icon set. Regular icons preserve transparent corners; maskable icons use the CampaignCue site background. |
| `public/campaigncue-logo-mark.png`, `public/campaigncue-logo-mark-wide.png` | Generated reusable raster logo marks for website metadata and future media surfaces. |
| `public/campaigncue-og-image.png` | Generated CampaignCue social share preview image wired into Open Graph and Twitter metadata. |
| `public/campaigncue-splash/apple-splash-*.png` | Generated CampaignCue iOS startup images for installed web app launch. |
| `src/lib/campaigncue/pwaAssets.ts` | CampaignCue PWA constants and static Apple startup image metadata. |
| `scripts/website-assets/generate-campaigncue-logo-assets.js` | Deterministic generator for CampaignCue favicon, PWA icon, logo-mark, maskable, and splash assets. |
| `scripts/verification/verify-campaigncue-pwa-assets.js` | Asset contract verifier for manifest coverage, metadata wiring, transparent SVG source, PNG dimensions, and splash/icon rendering. |
| `src/components/atoms/campaignCueLoaderLogo/index.tsx` | CampaignCue loader mark. |
| `src/components/atoms/brandedPageLoader/index.tsx` and `src/app/loading.tsx` | Server loading state supports CampaignCue product branding. |
| `src/components/organisms/loader/*` | Client global loader supports CampaignCue product branding. |

## Disagreements With ChatGPT

- Do not frame the product as "Local Business Campaign Engine" publicly. It is descriptive but not brandable.
- Do not treat avatar/AI UGC as the first video primitive. Use uploaded assets, creator-safe scripts, dialogue/action beat sheets, phone-camera plans, B-roll checklists, voiceover/subtitle briefs, and end cards first.
- Do not claim Google ranking, ad ROI, bookings, or sales without measured source data.
- Do not allow direct MenuList writes from CampaignCue unless MenuList later exposes an explicit owner-approved write-back API.

## Running Audit

See [campaigncue-production-implementation-audit.md](../campaigncue-production-implementation-audit.md) for the feature-by-feature implementation audit and current production-readiness status.

## June 29 Runtime Hardening

- `parseCampaignCueJsonBody()` now rejects oversized CampaignCue JSON bodies before parsing while preserving existing malformed-JSON security logging and route-level Zod validation.
- The cap is derived from current CueLayers source upload, rendered export, and editor-document limits so valid creative-editor autosave/upload/export flows remain admitted.
- `scripts/verification/verify-campaigncue-runtime.js` now guards the shared parser cap, bounded reader usage, generic malformed-body response, and absence of raw shared `params.request.json()` parsing.

## June 30 Browser Response Hardening

- `CampaignCueWorkspaceApp` now reads workspace, CueLayers, campaign, business, source, location, action, asset, download, and editor-export route responses through `readCampaignCueWorkspaceData()`, backed by `readJsonResponseWithLimit()`.
- Successful responses must include a valid `{ data }` envelope matching the expected local shape before the browser updates overview, CueLayers, campaign, source, location, asset, or editor-export state.
- Rejected, malformed, oversized, or wrong-shape responses keep fixed product copy and log `campaigncue_workspace_response_parse_failed`, `campaigncue_workspace_response_rejected`, or `campaigncue_workspace_response_invalid`.
- `scripts/verification/verify-campaigncue-runtime.js` now guards the response cap, parser, response guards, diagnostics, and absence of direct browser JSON parsing.
- This changes only browser response acknowledgement and diagnostics; no API route behavior, Firestore rules/indexes, Cloud Functions, Firebase deploy target, or Vercel deploy action changed.
