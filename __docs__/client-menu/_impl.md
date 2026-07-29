# Customer-Facing Digital Menu — Implementation Blueprint

**Feature Name:** Client Menu (Customer-Facing Digital Menu)
**Document Type:** Technical Implementation Plan
**Status:** Historical implementation evidence; not current launch certification
**Last Updated:** May 8, 2026
**Audience:** Engineers, Technical Leads

---

## Implementation Overview

This document consolidates all technical implementation details for the Customer-Facing Digital Menu feature, including architecture, file structure, database patterns, and validation reports.

---

## Architecture

### Technology Stack

| Layer         | Technology                                  |
| ------------- | ------------------------------------------- |
| **Framework** | Next.js 14 (App Router)                     |
| **Language**  | TypeScript                                  |
| **Rendering** | React Server Components + Client Components |
| **Styling**   | Tailwind CSS + CSS Modules                  |
| **State**     | React hooks, Session Storage                |
| **Database**  | Firebase Firestore                          |
| **Hosting**   | Vercel                                      |
| **Analytics** | Custom + GA4 + Facebook Pixel               |
| **PWA**       | Customer service worker with offline fallback only |

### Request Flow

```
1. Customer → joespizza.menulist.ai/drinks
2. Middleware (src/middleware.ts)
   - resolveDomain() extracts subdomain or custom domain
   - Deletes caller-supplied routing headers, then forwards middleware-owned x-tenant-subdomain, x-tenant-custom-domain, and x-tenant-type values on the rewritten request
   - Rewrites to /client/drinks
3. Page (src/app/client/[[...slug]]/page.tsx)
   - getTenantFromHeaders() derives identity from validated Host; middleware headers are integrity claims only
   - getStoreBySubdomain() or getStoreByCustomDomain()
   - getProjectBySlugOrDefault() finds correct menu
   - getPrecomputedDecisionBlocks() fetches recommendations
   - generateMetadata() creates SEO tags
   - generateSchemaOrgJsonLd() creates structured data
4. ClientMenuRenderer (client component)
   - Injects analytics trackers
   - Handles device type detection
   - Renders MainContentRenderer
5. MainContentRenderer
   - Renders HomePageNew or MenuPageNew
   - Passes precomputedBlocks to menu
```

---

## Infrastructure Hardening (Added March 2026)

The following infrastructure improvements were implemented to make the menu surface behave like infrastructure, not an application screen:

### Reliability Layer

| Feature                  | Implementation                                                                     | File               |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------ |
| **SSR Timeout**          | `withTimeout(5s)` wraps all Firestore reads — prevents infinite SSR hangs          | `page.tsx:60-67`   |
| **Transient Retry**      | `withRetry(1, 1000ms)` — one retry with 1s delay handles 90% of transient failures | `page.tsx:72-86`   |
| **Skeleton Loading**     | `MenuSkeleton` renders instantly via Suspense boundary while data streams          | `page.tsx:605-719` |
| **Graceful Degradation** | Decision Blocks, special menus, multi-outlet all fail silently to base menu        | Various            |

### Caching Layer

| Feature                    | Implementation                                                     | Cache Key / Tag                                        |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| **Cross-Request Cache**    | `unstable_cache` (Vercel Data Cache) with 60s TTL                  | `client-store-subdomain`, `client-store-custom-domain` |
| **Within-Request Dedup**   | React `cache()` prevents duplicate Firestore reads within same SSR | Wraps `unstable_cache`                                 |
| **Per-Store Invalidation** | `revalidateTag('menu-store-${sId}')` on owner save                 | `menu-store-{sId}`                                     |
| **Store Cache Tag**        | `revalidateTag('client-stores')` for domain changes                | `client-stores`                                        |

### URL Routing Enhancements

| Feature                   | Implementation                                                |
| ------------------------- | ------------------------------------------------------------- |
| **OBP Routing**           | Root `/` → OBP (when `ENABLE_OBP`), `/menu` → default project |
| **Outlet Routing**        | `brand.menulist.ai/{outletSlug}` resolves to outlet store     |
| **Custom Domain 301**     | Subdomain → custom domain redirect for SEO consolidation      |
| **Old Slug 301**          | `previousSlugs` chain redirect preserves QR codes             |
| **Reserved Slugs**        | `isReservedProjectSlug()` guard on name-based fallback        |
| **Special Menu Override** | Active special menu replaces/overlays base project            |

### Data Protection

| Feature                     | Implementation                                                   |
| --------------------------- | ---------------------------------------------------------------- |
| **Client Sanitization**     | `sanitizeForClient()` emits an explicit browser-safe project DTO; `projectPublicClientStore()` emits an explicit browser-safe store DTO |
| **MCE Publish Gate**        | 17 validation rules prevent corrupt data from reaching customers |
| **Multi-Outlet Resolution** | `resolveProjectForRender()` merges master + outlet data. Metadata outlet lookup, metadata project lookup, and runtime outlet lookup failures remain fail-open but log bounded `public_menu_resolution_*` diagnostics with tenant/store/slug presence-length context only. |

Public hostname resolution in `src/lib/firestore/clientStoreLookup.ts` queries current subdomain/custom-domain/outlet candidates with bounded duplicate detection, validates exact positive store/tenant identity, then reads the referenced canonical tenant for existence, lifecycle, and platform-block eligibility. The returned object remains the store payload only; tenant fields never cross the render boundary. A duplicate candidate, malformed identity, missing tenant, inactive/deleted store or tenant, or either platform block fails closed as not found.

Owner custom-domain writes use `platformSummary/customDomainClaim_{domain}` with request-unique reservation IDs. POST reserves before Vercel, rechecks scope when finalizing, and verifies an apparent provider conflict against the configured project only when MenuList provenance exists. Replacement/DELETE mark the old claim `releasing` before provider cleanup and `released` only after an acknowledged/404 cleanup. GET rechecks the exact current domain after provider status and requires both explicit DNS configuration and configured-project membership before setting verification true. Explicit misconfiguration/project absence clears verification; provider transport/body failures preserve last truth and remain non-success status. Duplicate/mismatched legacy ownership returns `409`; malformed legacy hostnames can be cleared locally without unsafe provider interpolation.

Menu Observation Layer writes in `src/database/menuChangeLog/index.ts` snapshot exact positive tenant/store scope with the sanitized event before scheduling. Collision-safe JSON tuple keys include project, item/category identity, and change type; completed `MENU_REVISION_SUMMARY` and `PUBLISH` entries receive unique queue keys, while replaceable detail events retain the bounded debounce. `pagehide` flushing drains the captured scopes instead of re-reading the active session. Internal reads validate identifiers/dates/cursor pairs, order by timestamp plus document ID, normalize stored documents, cap each result and stop after 5,000 scanned documents. `firestore.rules` separately enforces exact store membership/write role, payload/path scope agreement, project existence, canonical/legacy allowlists, bounded learning/drift/snapshot shapes, and immutable update/delete denial.

### Public UI Governance Hardening (May 2026)

The public renderer keeps the project-wise `config.design.menu` mood/layout model, but the final customer-facing structure is locked by shared components.

| Area | Implementation | File |
| ---- | -------------- | ---- |
| Owner-controlled category identity | Public menu paths render category icons through `CategoryIcon`, preserving owner-selected Lucide and `emoji:*` values while retaining fallback icons for missing/legacy values. Featured cards inherit the same category icon/emoji identity only when category icons are enabled in the menu design. | `src/components/atoms/CategoryIcon/index.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`, `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx` |
| Owner featured controls | Desktop and mobile owner controls use customer-facing Featured terminology instead of smart-recommendation wording, while retaining the existing decision-block settings path. | `src/components/templates/main-app/projects/editorView/editorActions.config.tsx`, `src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx`, `src/components/mobile/components/MobileMenuCommandSheet.tsx`, `src/components/mobile/sheets/SmartRecommendationsSheet.tsx`, `public/locales/menulist.ai/*.json` |
| Owner design preview | Mobile Menu Design keeps a persistent preview action, opens a full-screen preview-only sheet, and renders the current draft through the same `MainContentRenderer`/`MenuPageNew` path used by desktop preview. Preview mode disables customer analytics, session-state writes, feedback prompts, and URL/hash mutations. | `src/components/mobile/screens/MobileDesignEditorScreen.tsx`, `src/components/mobile/sheets/MobileMenuDesignPreviewSheet.tsx`, `src/components/templates/website/mainContentRenderer/index.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/deviceFrame.tsx` |
| Section navigator | Mobile/tablet menus place `Sections` in the sticky command row only when there are three or more visible sections, and open a portal-backed category navigator with localized fallback labels, active state, owner-selected icons, item counts, and a compact header whose close hit area does not inflate the heading row. | `src/components/templates/main-app/projects/b2cView/output/MenuFilters.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` |
| Sticky retrieval layer | Search focus keeps `Sections` and language controls reachable, the clear action exits search mode, compact suggestions come from the already-loaded menu payload, the compact top language trigger shows language initials only, and category chips remain a lightweight rail below the command row. Search focus fallback diagnostics log bounded prevent-scroll/fallback focus failures without raw search terms or backend writes. The command row avoids transform-based compositor hints and clipped sticky ancestors, scroll-spy updates are frame-throttled so normal vertical scrolling does not make the row vibrate, mobile public output switches to a measured fixed layer once it reaches `top: 0` while keeping safe-area breathing room inside row padding, stable `svh` viewport height is used for iOS PWA/Chrome stability, and active search scrolls a result anchor back under the command controls when the customer starts searching from a deep menu position. | `src/components/templates/main-app/projects/b2cView/output/MenuSearchBar.tsx`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher.tsx` |
| Card rhythm | Item titles/descriptions use line governance, price weight is restrained, item image frames render only when an item has an image instead of showing blank placeholders, and compact two-column mobile Grid output lets a single odd final card span the full row. | `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` |
| Public image normalization | Public menu output normalizes array, object-map, object-with-url, and string image values before cards, featured choices, PDP galleries, metadata, and image-quality checks read item images. | `src/lib/menu/publicMenuImages.ts`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx`, `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx`, `src/app/client/[[...slug]]/page.tsx`, `src/lib/mce/qualitySignals.ts` |
| PWA interaction stability | PDP open blurs active search input, top-of-page PDP scroll lock avoids fixed-body locking on iPhone PWAs, item-history close waits for `popstate`, modal cleanup restores scroll without dispatching synthetic scroll/resize events that can move the category rail, open PDP state syncs the client document head so browser share sheets see the item URL instead of the base menu canonical, and the PDP itself exposes a native-share/copy fallback for installed PWAs. Item-share copy first attempts Clipboard API, falls through to textarea fallback if the Clipboard API rejects, and requires `document.execCommand('copy')` acknowledgement before copied state, share analytics, or success copy advance; failed final copy fallback logs `public_menu_pdp_item_share_copy_failed` with bounded item/share URL/title/language metadata and clipboard/fallback support booleans only. | `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx` |
| Long PDP content handling | PDP modal/sheet height is capped to the viewport, scroll stays inside the detail surface, and the close control remains sticky while long item content scrolls. | `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx` |
| PDP and footer polish | Public item detail opens as a desktop modal and mobile bottom sheet, uses contain-fit gallery images with touch swiping plus fullscreen pinch-to-zoom inspection, shows category identity and owner-entered nutrition facts when present, offers quiet item sharing with current-language URLs, and the common Call / WhatsApp / Directions footer actions use centered compact chips on desktop while preserving equal-width touch targets on mobile. | `src/components/templates/main-app/projects/b2cView/output/PDPModal.tsx`, `src/components/shared/media/PublicImageViewer.tsx`, `src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx`, `src/components/templates/main-app/projects/b2cView/output/BackToTop.tsx` |
| Featured layout polish | Featured choices fill the available desktop content width as a grid and keep the horizontal scroller only for smaller touch layouts. | `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx` |
| Footer trust metadata | Bottom status keeps the exact publish timestamp from `MenuHeader`, suppresses duplicate freshness in `TrustSignals`, moves active temporary status notices into a centered bottom pill, hides expired temporary status without reserving space, resolves menu special notes from menu settings, legacy project fields, then store public presence fallback, and centers the rendered note in the footer trust zone. | `src/components/atoms/TrustSignals.tsx`, `src/components/atoms/TempStatusBanner/index.tsx`, `src/lib/menu/publicMenuSpecialNote.ts`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx`, `src/components/templates/main-app/projects/b2cView/output/ServiceChargeNote.tsx` |
| Back-to-top tap isolation | Back-to-top uses a real button, scrolls only on completed click/tap, and stops pointer/touch propagation so item cards under the floating control cannot receive the same tap. | `src/components/templates/main-app/projects/b2cView/output/BackToTop.tsx` |
| Theme preset governance | Mood presets reduce decorative heading drift and strengthen light-theme containment without adding arbitrary owner design freedom. | `src/components/templates/main-app/projects/b2cView/designSystem/index.ts` |
| Legacy QR download diagnostics | The tracked legacy project QR component keeps the existing failed-download owner copy, but failed browser-local branded QR generation/download now logs bounded `project_share_legacy_qr_download_failed` diagnostics with shape-only URL/name/logo/color metadata and no raw URL, logo URL, business name, or color value logging. | `src/components/templates/main-app/projects/b2cView/shareModal/qrCodeView.tsx` |
| Gradient parser diagnostics | Owner Menu Design gradient parsing keeps the existing fallback behavior for malformed saved gradient strings, but parser exceptions now log capped `public_menu_gradient_parse_failed` diagnostics with shape-only metadata and no raw CSS/color values. | `src/components/templates/main-app/projects/b2cView/menuPage/gradientUtils.ts` |
| Platform attribution | Default attribution is `Powered by MenuList. All rights reserved` with no customer-facing marketing CTA unless a caller opts in, matching the compact public OBP footer treatment. | `src/components/customer/PublicMenuListAttribution.tsx` |
| Public customer localization | Fixed OBP/menu/item/feedback/status/metadata/recovery/PWA chrome uses the generated 337-message public bundle across all 52 UI locale packs. The owner-selected public language sets `lang`/`dir`, is preserved across public links, and keeps RTL image/navigation behavior logical. Bounded spice levels are localized on menu and item detail. The separate 80-language content registry remains authoritative for owner content; fixed chrome falls back to `en-US` only when that content language has no UI pack. | `src/lib/localization/publicCustomerMessages.ts`, `src/lib/localization/publicHoursText.ts`, `scripts/localization/generate-public-customer-messages.js`, `scripts/verification/verify-public-customer-localization.js` |

### Retrieval, Structured Truth, and Low-Network Foundation (May 2026)

The public menu search and schema layer now use the same stored menu truth that customers see: sanitized project files, active categories/items, localized names/descriptions, attributes, tags, decision facts, `menuVersion`, and `lastPublishedAt`.

| Area | Implementation | File |
| ---- | -------------- | ---- |
| Fuzzy public search | Client-side search normalizes case, accents, punctuation, repeated characters, common phonetic variants, and bounded typo distance, then ranks exact visible item-name matches ahead of partial/fuzzy matches. One-character input does not activate filtering, two-character numeric input can prefix-match alphanumeric tokens such as `11am` without matching price tokens such as `115`, ambiguous compressed skeleton matches are rejected, aliases expand query terms rather than stored item meanings so `chai` no longer matches generic `tea` description mentions, and multi-term searches rank exact phrase first, all-term matches next, then any-term recovery for cases like `coffee chai`. Short-token matching is deliberately conservative so unrelated service menus do not surface food synonyms such as `chai` unless the word is actually present. | `src/lib/menu/publicMenuSearch.ts`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` |
| Transliteration fold | Lightweight Devanagari/Marathi and Gujarati text fold supports practical India-first Roman search without adding a search dependency. | `src/lib/menu/publicMenuSearch.ts` |
| Search scope | Search covers item names/descriptions, category names, attribute names, tags, decision facts, and optional public prices. Compact `_publicSearch.terms` may be shipped for structured payload efficiency, but the public UI does not re-read generated terms as source text for live matching. | `src/lib/menu/publicMenuSearch.ts`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` |
| Multilingual payload | Public SSR keeps enabled-language menu text available for the client language picker so category labels, item names, and item descriptions remain aligned when the customer switches language after arriving from OBP or an installed PWA launch. Compact search terms can still be attached for retrieval, but visible language data is not stripped from the public renderer. | `src/app/client/[[...slug]]/page.tsx` |
| PWA language and menu state | Customer menu page/language/scroll state is scoped to the exact rendered tenant/store/project context, public language changes update `?lang=` through router navigation so server-rendered menu names and metadata update, item URLs preserve the selected language query, and the menu language switcher ignores the retired global language key on customer output. Explicit `?lang=` remains authoritative. The destination language is restored before that session key can be written, so a client-side project or tenant transition cannot copy the prior menu's language. Persisted scroll accepts only the canonical bounded integer format produced by the writer; malformed state is evicted. Public menu session/filter/category restore, remove and save failures log bounded diagnostics and remain fail-open when browser storage is blocked. | `src/components/templates/website/clientWebsite/index.tsx`, `src/lib/localization/publicMenuSessionState.ts`, `src/components/templates/main-app/projects/b2cView/output/MenuLanguageSwitcher.tsx`, `src/lib/localization/publicMenuLanguagePreference.ts`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` |
| Structured freshness | JSON-LD uses project `lastPublishedAt`/`menuVersion` before store modified timestamps, and emits active public categories/items only. | `src/lib/menu/publicMenuStructuredData.ts`, `src/app/client/[[...slug]]/page.tsx` |
| Offline boundary | Customer service worker remains network-first and only serves `/offline` after failure or bounded navigation timeout. It does not cache menu HTML/data/images. | `public/sw-customer.js` |

Feature flag: `FEATURE_FLAGS.ENABLE_PUBLIC_MENU_RETRIEVAL_FOUNDATION`.

---

## File Structure

### Core Files

```
src/app/client/
├── [[...slug]]/
│   └── page.tsx              # Main entry point
├── error.tsx                 # Branded customer error boundary with bounded secure diagnostics
├── obp/
│   ├── OBPContent.tsx        # Official Business Page (server component)
│   ├── OBPSkeleton.tsx       # OBP loading skeleton
│   ├── OBPAnalytics.tsx      # OBP analytics tracking
│   ├── OBPActions.tsx        # OBP action buttons
│   └── schema.ts             # OBP Schema.org generator
├── layout.tsx                # Minimal HTML wrapper
├── sitemap.ts                # Per-client sitemap.xml
└── robots.ts                 # Per-client robots.txt

src/components/templates/website/
├── clientWebsite/
│   ├── index.tsx                    # ClientMenuRenderer (76 lines)
│   ├── AnalyticsContext.tsx         # Analytics state management
│   ├── GoogleAnalytics.tsx          # GA4 integration
│   ├── FacebookPixel.tsx            # Meta Pixel integration
│   ├── GoogleSearchConsole.tsx      # Search Console verification
│   ├── EnhancedEcommerce.tsx        # E-commerce tracking
│   └── UnifiedAnalyticsTracking.tsx # Internal analytics
│
└── mainContentRenderer/
    └── index.tsx                    # Home/Menu page router (71 lines)

src/components/templates/main-app/projects/b2cView/
├── homePage/
│   └── homePageNew.tsx              # Home screen
├── menuPage/
│   ├── menuPageNew.tsx              # Menu screen
│   ├── layouts/
│   │   ├── verticalMenuLayout.tsx   # Standard layout
│   │   └── horizontalMenuLayout.tsx # Tab-based layout
│   └── components/
│       ├── MenuItem.tsx             # Item display
│       ├── MenuCategory.tsx         # Category wrapper
│       ├── MenuSearchBar.tsx        # Search functionality
│       ├── MenuFilterChips.tsx      # Filter controls
│       └── BackToTop.tsx            # Scroll-to-top FAB
└── output/
    └── DecisionBlocks.tsx           # Decision Blocks component (572 lines)

src/config/
├── decisionBlocks.ts                # Block labels and config (~100 lines)
├── businessLabels.ts                # Business-type specific labels
└── defaultTimeSlotPresets.ts        # Time slot defaults by business
```

### Database Layer

```
src/database/
├── analytics/
│   └── index.ts                     # Analytics DAL
├── stores/
│   └── index.ts                     # Store operations
└── projects/
    └── index.ts                     # Project operations
```

### Library Files

```
src/lib/
├── analytics/
│   └── unified.ts                   # Tracking logic (MENU_VIEW, ITEM_VIEW, etc.)
├── schema/
│   └── index.ts                     # Schema.org utilities (buildAddress, buildBreadcrumbList, buildFaqSchema utility for visible FAQ content, etc.)
├── mce/
│   ├── index.ts                     # MCE entry point (mceValidate, toMCEMetadata)
│   ├── correctnessResolver.ts       # 17 validation rules
│   ├── types.ts                     # MCE types
│   └── utils.ts                     # sanitizeForClient
├── menu/
│   ├── publicMenuSearch.ts          # Public fuzzy/transliteration search
│   └── publicMenuStructuredData.ts  # Public freshness helpers
├── multiOutlet/
│   └── index.ts                     # resolveProjectForRender (master + outlet merge)
├── multiTenant/
│   └── domainResolver.ts            # Domain type detection (Edge-safe)
├── utils/
│   └── slugify.ts                   # URL slug generation
└── colorEnforcement.ts              # WCAG contrast validation
```

---

## Database Schema

### Collections Used

| Collection         | Document Pattern                       | Purpose                          |
| ------------------ | -------------------------------------- | -------------------------------- |
| `stores`           | `{storeId}`                            | Store lookup by subdomain/domain |
| `projectsMetadata` | `{tId}/{sId}/metadata/{projectId}`     | Lightweight project listing      |
| `projectsData`     | `{tId}/{sId}/{projectId}`              | Full project data                |
| `decisionBlocks`   | `{tId}_{sId}_{projectId}`              | Precomputed recommendations      |
| `analytics`        | `{tId}_{sId}_{projectId}_daily_{date}` | Daily analytics                  |

### Store Document Fields (Relevant)

```typescript
interface StoreDocument {
  storeId: number;
  tenantId: number;
  name: string;
  subdomain: string; // For subdomain routing
  customDomain?: string; // For custom domain routing
  domainVerified?: boolean; // Must be true for custom domain
  active: boolean; // Must be true to serve

  // SEO
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;

  // Analytics
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  googleSearchConsoleId?: string;

  // Business
  businessType?: string;
  currencyCode?: string;
  workingHours?: Record<string, string>;
}
```

### Project Document Fields (Relevant)

```typescript
interface ProjectDocument {
  projectId: string;
  name: string;
  isDefault?: boolean;
  active: boolean;
  deleted: boolean;

  // Menu data
  files: Array<{
    extractedData: {
      data: {
        categories: Category[];
        items: Item[];
        languages: Language[];
      };
    };
  }>;

  // Design config
  config: {
    design: {
      home: { style: string; backgroundImage?: string };
      menu: { mood: string; layout: string; showImages: boolean };
      brand: { accentColor?: string };
    };
  };

  // Timestamps
  modifiedOn: Timestamp;
}
```

### Decision Blocks Document

```typescript
interface DecisionBlocksDocument {
  tId: number;
  sId: number;
  projectId: string;

  popular: {
    candidates: CandidateItem[];
    computedAt: Timestamp;
  };
  quickPick: {
    candidates: CandidateItem[];
    computedAt: Timestamp;
  };
  bestValue: {
    candidates: CandidateItem[];
    computedAt: Timestamp;
  };

  lastUpdated: Timestamp;
}

interface CandidateItem {
  itemId: string;
  score: number;
  reason: string;
}
```

---

## Key Functions

### 1. Domain Resolution (Middleware)

```typescript
// src/lib/utils/domainResolver.ts
export function resolveDomain(hostname: string): DomainInfo {
  // Check if it's a menulist.ai subdomain
  if (hostname.endsWith(".menulist.ai")) {
    const subdomain = hostname.replace(".menulist.ai", "");
    return { type: "subdomain", subdomain, customDomain: null };
  }

  // Otherwise it's a custom domain
  return { type: "custom", subdomain: null, customDomain: hostname };
}
```

### 2. Store Lookup

```typescript
// src/app/client/[[...slug]]/page.tsx
async function getStoreBySubdomain(subdomain: string) {
  const q = query(
    collection(firebaseClient, DB_COLLECTIONS.STORES),
    where("subdomain", "==", subdomain.toLowerCase()),
    where("active", "==", true),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return snapshot.empty
    ? null
    : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

async function getStoreByCustomDomain(domain: string) {
  const q = query(
    collection(firebaseClient, DB_COLLECTIONS.STORES),
    where("customDomain", "==", domain.toLowerCase()),
    where("domainVerified", "==", true),
    where("active", "==", true),
    limit(1),
  );
  const snapshot = await getDocs(q);
  return snapshot.empty
    ? null
    : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}
```

### 3. Project Resolution

```typescript
// Priority order:
// 1. Exact slug match: slugify(project.name) === slug
// 2. Default project: project.isDefault === true
// 3. First available: projects[0]

async function getProjectBySlugOrDefault(
  tenantId: number,
  storeId: number,
  slug?: string,
): Promise<{ projectData: any; projectMetadata: any } | null> {
  // Get all active projects for store
  const metadataRef = collection(
    firebaseClient,
    `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${storeId}/metadata`,
  );
  const q = query(
    metadataRef,
    where("deleted", "==", false),
    where("active", "==", true),
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Find by slug, default, or first
  let targetProject = slug
    ? projects.find((p) => slugify(p.name) === slug.toLowerCase())
    : null;

  if (!targetProject) {
    targetProject = projects.find((p) => p.isDefault === true) || projects[0];
  }

  if (!targetProject) return null;

  // Fetch full project data
  const projectData = await getProjectData(
    targetProject.projectId || targetProject.id,
  );
  return projectData ? { projectData, projectMetadata: targetProject } : null;
}
```

Public menu project document-ID boundary: `src/app/client/[[...slug]]/page.tsx` resolves the public menu project through `normalizePublicMenuProjectDocumentScope` before reading `projects/{tId}/{sId}/{projectId}`. The guard keeps valid immutable project IDs, reads tenant scope from the first segment and store scope from the final segment, and requires both scope segments to be exact positive numeric Firestore document IDs. Whitespace-mutated, path-shaped, reserved, malformed, zero, negative, unsafe, or nonnumeric project scope fails closed as menu not found before Admin SDK project refs are built.

Public browser projection boundary: canonical project and store documents remain server-side. Before `ClientMenuRenderer` receives props, `sanitizeForClient()` allowlists customer render fields and removes source-upload metadata, extraction diagnostics/business suggestions, owner ranking/review state, inactive items/categories/attributes, and non-value decision-fact provenance. Item/category images are reduced to public URL/variant references. `projectPublicClientStore()` separately allowlists identity, locale, currency, public contact/actions, public analytics IDs/toggles, PWA, hours, feedback, and temporary-status fields. Roles, licence/billing data, contact-person fields, API/widget credentials, POS secrets, notification settings, integration state, and future unknown store fields remain excluded by default.

Supplied-slug resolution boundary: a current slug, legacy name slug, or `previousSlugs[]` match resolves normally. A miss returns the not-available recovery surface. Literal `/menu` alone may use the explicit `isDefault: true` Layer 2 alias; it does not fall through to the first active project. The no-slug first-project compatibility path remains only behind the OBP emergency rollback branch.

### 4. Decision Blocks Fetch

```typescript
async function getPrecomputedDecisionBlocks(
  tId: string | number,
  sId: string | number,
  projectId: string,
): Promise<any | null> {
  try {
    const docId = `${tId}_${sId}_${projectId}`;
    const docRef = doc(firebaseClient, DB_COLLECTIONS.DECISION_BLOCKS, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    // Fail silently - Decision Blocks are optional
    console.warn("Failed to fetch precomputed Decision Blocks:", error);
    return null;
  }
}
```

---

## Responsive Layout Architecture (Added March 11, 2026)

### Breakpoints

| Screen Width | Device Type | Layout                        | Navigation                                       | Item Grid                     | Item Detail |
| ------------ | ----------- | ----------------------------- | ------------------------------------------------ | ----------------------------- | ----------- |
| < 768px      | Mobile      | Single column, 768px max      | Sticky search + `Sections` row with category tabs when enabled | 1 column (2 for grid layout)  | Bottom-sheet PDP |
| 768–1024px   | Tablet      | 2-column, 960px max           | Sticky search + `Sections` row and category tabs | 2 columns                     | Modal PDP   |
| ≥ 1024px     | Desktop     | Sidebar + content, 1200px max | Left sidebar (220px, sticky)                     | 2 columns (3 for grid layout) | Modal PDP   |

### Desktop Sidebar Navigation

```typescript
// Desktop (≥1024px): Sticky left sidebar replaces horizontal category tabs
// Width: 220px, sticky at top: 16px
// Active category: left accent bar (3px) + accent color text + light background
// Hover: subtle background tint (accentColor 8% opacity)
// Scroll spy: IntersectionObserver updates active category on scroll
```

### Device Detection

```typescript
// src/components/templates/website/clientWebsite/index.tsx
const width = window.innerWidth;
if (width < 768) setActiveDeviceType("mobile");
else if (width < 1024) setActiveDeviceType("tablet");
else setActiveDeviceType("desktop");
```

### Responsive Grid Columns

```typescript
// menuPageNew.tsx — grid columns based on device + layout config
const gridColumns = isGridLayout
  ? (isMobile ? 2 : isTablet ? 2 : Math.max(1, layoutConfig.itemsPerRow))
  : (isDesktop ? Math.max(1, layoutConfig.itemsPerRow) : 1);
```

### DeviceFrame (Live Site vs Editor Preview)

```typescript
// deviceFrame.tsx — live site gets full width, editor preview gets simulated device widths
maxWidth: fromPage === "b2c"
    ? (mobile: 400, tablet: 768, desktop: '100%')  // Editor preview
    : '100%'                                         // Live site — responsive content handles width
```

### Desktop Hover States

```
Item cards: hover:shadow-md hover:-translate-y-px (Tailwind)
Sidebar categories: onMouseEnter/onMouseLeave with accentColor 8% background
Transition: 150ms for all interactive elements
```

### Key Files Modified

| File              | Change                                                                              |
| ----------------- | ----------------------------------------------------------------------------------- |
| `menuPageNew.tsx` | Added isDesktop/isTablet, responsive container, sidebar, grid columns, hover states, and device-capped public shell padding |
| `deviceFrame.tsx` | Live site no longer constrains tablet/desktop width                                 |

---

## Analytics Implementation

### Event Types

| Event                  | Trigger          | Data                                 |
| ---------------------- | ---------------- | ------------------------------------ |
| `MENU_VIEW`            | Page load        | storeId, projectId, device, location |
| `ITEM_VIEW`            | Item modal open  | itemId, itemName, categoryId         |
| `ITEM_CLICK`           | Item action      | itemId, itemName, categoryId         |
| `DECISION_BLOCK_CLICK` | Block item click | blockType, itemId                    |
| `SEARCH`               | Search submit    | searchTerm                           |

### Tracking Flow

```
AnalyticsContext.trackMenuView()
    ↓
unified.ts → trackEvent()
    ↓
unified.ts → trackFirebaseEvent()
    ↓
database/analytics → trackAnalyticsEvent()
    ↓
Local analytics queue (client-side, persisted, 15s / 20-event flush)
    ↓
Firestore: analytics/{tId}_{sId}_{projectId}_daily_{date}
```

### Rate Limiting

```typescript
const RATE_LIMIT = {
  MAX_EVENTS_PER_MINUTE: 30, // Max events per session
  DEBOUNCE_MS: 1000, // Same event debounce
  MENU_VIEW_COOLDOWN_MS: 30000, // Menu view cooldown
};
```

---

## Auto-Sell Features Implementation

### Feature 1: Live Indicator

**Component:** `LiveIndicator.tsx`

```typescript
// Decay rule for timestamp display
| Time Since Update | Display |
|-------------------|---------|
| < 1 minute        | "🟢 Live · updated just now" |
| 1-59 minutes      | "🟢 Live · updated X minutes ago" |
| Same day          | "🟢 Live · updated today at 3:40 PM" |
| 1-3 days          | "🟢 Live · updated 2 days ago" |
| > 3 days          | "🟢 Live" (no time) |
```

### Feature 2: Availability State

**Data Field:** `item.available: boolean`

```typescript
// Customer experience
if (!item.available) {
  // Fade to 40% opacity
  // Show "Sold out" label (business-type aware)
  // Disable click (no PDP modal)
}
```

### Feature 3: Time-Based Categories

**Data Field:** `category.timeSlots: CategoryTimeSlot[]`

```typescript
interface CategoryTimeSlot {
  presetId: string;
  label: string;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

// Hook: useTimedCategories.ts
function isWithinTimeSlot(category): boolean;
function getNextSlotStart(category): string | null;
```

---

## PWA & Offline Fallback

### Service Worker Configuration

```javascript
// public/sw-customer.js
// Customer tenant origins use a hand-rolled, network-first service worker.
// It precaches /offline only and never caches menu HTML, menu data, Firestore
// responses, or item images.
```

### State Persistence

```typescript
// menuPageNew.tsx
const storageKey = `menuState_${projectId}`;

// Save state (debounced)
sessionStorage.setItem(
  storageKey,
  JSON.stringify({
    scrollY,
    filter: activeFilter,
    category: savedCategoryId,
  }),
);

// Restore state on mount
useEffect(() => {
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    const { scrollY, filter, category } = JSON.parse(saved);
    if (filter) setActiveFilter(filter);
    const restoredCategory = allCategories.find((cat) => cat.id === category);
    if (restoredCategory) setActiveCategory(restoredCategory);
    restoreScrollPosition(scrollY);
  }
}, []);

// Browser storage failures are non-blocking:
// - restore failures log public_menu_state_restore_failed
// - save failures log public_menu_state_save_failed
// Diagnostics include bounded storage-key, filter, category, scroll, and context metadata only.
```

---

## Validation Report

### Logic Flows Verified

| Flow                     | Test Case                               | Status  |
| ------------------------ | --------------------------------------- | ------- |
| Subdomain routing        | `joespizza.menulist.ai` → correct store | ✅ PASS |
| Custom domain routing    | `joespizza.com` → correct store         | ✅ PASS |
| Slug routing             | `/drinks` → correct project             | ✅ PASS |
| Default project          | No slug → isDefault project             | ✅ PASS |
| Decision Blocks fetch    | Precomputed data loads                  | ✅ PASS |
| Decision Blocks fallback | Missing data → silent fail              | ✅ PASS |
| SEO metadata             | Title, description, OG tags             | ✅ PASS |
| Schema.org               | JSON-LD in page source                  | ✅ PASS |
| Live Indicator           | Timestamp decay rule                    | ✅ PASS |
| Availability             | Sold out items fade                     | ✅ PASS |
| Time-Based               | Categories show/hide by time            | ✅ PASS |
| Analytics                | Events tracked correctly                | ✅ PASS |
| Offline                  | Clear reconnect screen; no stale menu cache | Source gate only |
| State persistence        | Scroll/filter restored                  | ✅ PASS |
| Back button              | Modal closes, doesn't exit              | ✅ PASS |

### Performance Metrics

| Metric                   | Target  | Current status |
| ------------------------ | ------- | -------------- |
| First Contentful Paint   | Target release evidence required | Not certified by this historical implementation note |
| Largest Contentful Paint | Target release evidence required | Not certified by this historical implementation note |
| Time to Interactive      | Target release evidence required | Not certified by this historical implementation note |
| Total Blocking Time      | Target release evidence required | Not certified by this historical implementation note |
| Cumulative Layout Shift  | Target release evidence required | Not certified by this historical implementation note |

### Firestore Reads Per Page Load

| Operation               | Reads       |
| ----------------------- | ----------- |
| Store lookup + canonical tenant eligibility | 2 |
| Project summary packet | 1 |
| Selected project data | 1 |
| Embedded Decision Blocks | 0 extra |
| Store details reuse | 0 extra |
| **Normal single-store total** | **4 cold reads** |
| Linked master or active special project | **+1 each when applicable** |

---

## Testing Guide

### Local Testing Setup

1. Edit `/etc/hosts`:

   ```
   127.0.0.1 joespizza.menulist.local
   ```

2. Update `domainResolver.ts` for `.menulist.local`

3. Visit: `http://joespizza.menulist.local:3000`

### Production Testing Checklist

| Test          | Action                           | Expected          |
| ------------- | -------------------------------- | ----------------- |
| Subdomain     | Visit `{subdomain}.menulist.ai`  | Menu loads        |
| Custom Domain | Visit verified custom domain     | Menu loads        |
| Slug          | Visit `{domain}/drinks`          | Correct project   |
| Root          | Visit domain without slug        | Official Business Page |
| Menu alias    | Visit `/menu` with explicit default | Default project with canonical slug metadata |
| Unknown slug  | Visit an unclaimed project slug  | Menu-not-available recovery; never another menu |
| 404           | Visit non-existent store         | 404 page          |
| SEO           | View page source                 | Metadata present  |
| Schema        | Search for "application/ld+json" | JSON-LD present   |
| Mobile        | Test on phone                    | Responsive layout |
| Offline       | Enable airplane mode             | No stale menu-content cache is invented; installed-app recovery follows Customer App policy |
| Refresh       | Scroll + refresh                 | Position restored |
| Back          | Open item + press back           | Modal closes      |

---

## Troubleshooting

| Issue                   | Cause                       | Solution                                 |
| ----------------------- | --------------------------- | ---------------------------------------- |
| 404 on subdomain        | Store not found or inactive | Check `subdomain` field, `active: true`  |
| 404 on custom domain    | `domainVerified: false`     | Verify DNS, set flag true                |
| Wrong menu shown        | Wrong default project       | Set `isDefault: true` on correct project |
| Decision Blocks missing | Not computed yet            | Wait for nightly job or trigger manually |
| Analytics not tracking  | Missing IDs                 | Add GA/FB IDs to store                   |
| Slow load               | Large images                | Check performance budget                 |

---

## Firestore Indexes Required

```
Collection: stores
Index 1: subdomain ASC, active ASC
Index 2: customDomain ASC, domainVerified ASC, active ASC

Project routing uses a direct `platformSummary/projects_{sId}` document read and a direct immutable project document read; it does not require a `projectsMetadata` collection index.
```

---

## Progress Tracking

| Phase                           | Tasks                                    | Status      |
| ------------------------------- | ---------------------------------------- | ----------- |
| **Core Infrastructure**         | Domain routing, page rendering           | ✅ Complete |
| **SEO**                         | Metadata, Schema.org, sitemap, robots    | ✅ Complete |
| **Decision Blocks**             | Fetch, display, fallback                 | ✅ Complete |
| **Analytics**                   | Internal + third-party tracking          | ✅ Complete |
| **Auto-Sell Features**          | Live indicator, availability, time-based | ✅ Complete |
| **PWA**                         | Service worker, offline fallback only    | ✅ Complete |
| **State Persistence**           | Scroll, filter, category                 | ✅ Complete |
| **UI Constitution**             | P0/P1/P2/P3 compliance                   | ✅ Complete |
| **Infrastructure Hardening**    | Timeout, retry, skeleton, caching        | ✅ Complete |
| **OBP Integration**             | Root → OBP, /menu → default project      | ✅ Complete |
| **Special Menu Switching**      | Replace + overlay modes                  | ✅ Complete |
| **Multi-Outlet Resolution**     | Master/outlet merge for chains           | ✅ Complete |
| **URL Routing Architecture**    | Slug chain redirects, outlet routing     | ✅ Complete |
| **Infrastructure Improvements** | All 8 ChatGPT review items               | ✅ Complete |
| **Production Verification**     | Real device testing                      | ✅ Complete |

---

## Infrastructure Improvements (Implemented March 15, 2026)

All 8 items from the ChatGPT infrastructure review have been implemented or verified as already done.

### Implemented in This Session

| #   | Item                         | Implementation                                                                                       | File(s)                                            |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| #30 | **Lazy Language Loading**    | `optimizeLanguagePayload()` strips non-primary language descriptions from SSR payload (3+ languages) | `page.tsx:619-645`                                 |
| #31 | **Progressive Rendering**    | IntersectionObserver-based category rendering for menus with 150+ items; 500px pre-load margin       | `menuPageNew.tsx:101-108, 266-302, 742-748`        |
| #32 | **Structured Dish Metadata** | Added optional metadata fields to `ExtractedDataItem`; AI no longer invents high-liability or easily stale fields | `extractedData.types.ts:66-76`, `page.tsx:570-607` |
| #33 | **Project-scoped State Key** | Public menu filter/category/scroll state uses `menuState_${projectId}` and logs bounded restore/save diagnostics when browser storage is unavailable. | `menuPageNew.tsx`                                  |
| #34 | **Analytics Lazy Loading**   | GA4, Facebook Pixel, Enhanced Ecommerce converted to `dynamic()` imports with `ssr: false`           | `clientWebsite/index.tsx:17-20`                    |
| #35 | **Text-First Fallback**      | "Loading menu..." message fades in after 3s delay via CSS animation in MenuSkeleton                  | `page.tsx:731-753`                                 |

### Verified as Already Done

| #   | Item                                    | Existing Implementation                                                             |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| #29 | **Deep Linking**                        | `/menu/item/{slug}-{shortId}` URL pattern with history pushState + direct link load |
| #36 | **Decision Blocks Availability Filter** | `selectAvailableCandidate()` checks active + available + time-slot at runtime       |

---

## SMB-Compatible Item Metadata (AI-Tightened May 2, 2026)

Structured item metadata adapts per business category. Owners can manually add known item details, while AI generation and extraction are restricted from inventing high-liability or easily stale fields. New long-term SMB-specific facts belong in generic `decisionFacts`; older top-level metadata fields remain compatibility mirrors.

### Architecture

```
itemMetadataConfig.ts (SSOT for field definitions + category mapping)
        ↓
ExtractedDataItem.decisionFacts (generic fact store; legacy top-level mirrors retained)
        ↓
AI Extraction Prompt (safe metadata suggestions only; risky fields stripped)
        ↓
aiResponseUtils → redistributeUtils (spread operator passes through all metadata)
        ↓
EditItemModal (collapsible "Item Details" — writes owner facts into decisionFacts)
        ↓
Fact resolver helpers (prefer decisionFacts, fall back to legacy fields)
        ↓
Schema.org and filters (price, availability, name, description, owner-provided metadata)
        ↓
PDP Modal (owner-provided metadata badges)
```

### Files Created

| File                               | Purpose                                     |
| ---------------------------------- | ------------------------------------------- |
| `src/config/itemMetadataConfig.ts` | Business-category-aware field config (SSOT) |

### Files Modified

| File                          | Change                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `extractedData.types.ts`      | Added generic `decisionFacts`; legacy metadata fields remain for compatibility        |
| `itemDecisionFacts.ts`        | Resolves, writes, and mirrors owner-entered decision facts                            |
| `parallelProcessingPrompt.ts` | Structured metadata extraction tightened so AI does not invent risky fields          |
| `editItemModal.tsx`           | "Item Details" collapsible section renders business-category owner controls         |
| `page.tsx` (client menu)      | Schema.org reads owner-provided facts, including retail warranty, when present       |
| `PDPModal.tsx`                | Metadata badges render owner-provided facts, including retail warranty               |

### Business Category → Field Mapping

| Category          | Fields Shown                                         |
| ----------------- | ---------------------------------------------------- |
| Food & Beverage   | Allergens, Dietary Tags, Spice Level, Nutrition Info |
| Service           | Duration, Target Audience                            |
| Retail            | Materials, Warranty                                  |
| Health & Wellness | Duration, Skill Level, Target Audience               |
| Creative          | Duration, Materials                                  |
| Professional      | Duration                                             |
| Specialty         | Duration, Target Audience                            |

Exact business-type overrides may narrow or adjust the category default when the broad category would expose misleading fields. Examples: `Bookstore` shows no extra item facts, `Electronics Store` shows Warranty, `Dental Clinic` shows Duration only, and fitness/yoga/training businesses show Duration, Skill Level, and Target Audience. The override layer must stay small and obvious; do not use image-generation presets as the metadata source of truth.

### Metadata Safety Policy

Allergens, nutrition, materials, warranty, skill level, and target audience are owner-entered fields only. AI generation and extraction must not infer them from weak context, and `/api/new-item-metadata` strips those fields if the model returns them anyway.

### Long-Term Fact Model

Do not add new business-type-specific facts as top-level `ExtractedDataItem` fields. Add them to the decision-facts registry/helper layer, define whether they are owner-editable, public-facing, filterable, AI-suggestible, confirmation-gated, and schema-mapped, then render through the shared resolver. Public filters may use normalized facts only when the fact has a controlled value set; free-text facts such as warranty, care notes, or materials should display as item details rather than becoming filter chips.

Registry policy fields:

| Policy | Purpose |
| ------ | ------- |
| `ownerEditable` | Whether owners can manually maintain this fact |
| `publicVisible` | Whether the public menu may show it when filled |
| `filterable` | Whether it may become a public filter chip |
| `aiSuggestible` | Whether AI may return it from generation/extraction |
| `requiresOwnerConfirmation` | Whether UI must remind owners to add only confirmed values |
| `schemaOrgMapping` | Whether/how it maps into public structured data |

### Infrastructure Readiness Signals (Track When at Scale)

| Signal                 | Target       | Current                  |
| ---------------------- | ------------ | ------------------------ |
| CDN cache hit ratio    | >90%         | ~85% (Vercel Data Cache) |
| p95 menu load time     | <800ms       | ~1.2s (with SSR)         |
| Menu error rate        | <0.01%       | Low (Sentry monitoring)  |
| DB reads per menu view | <1% uncached | ~0% (60s cache)          |

---

## The 3 Questions That Matter (Execution Focus)

> These are P0 manual/device verification criteria before client-menu launch approval; they do not replace the active production-readiness audit or External Certification Runbook evidence.

### Q1: Can the menu survive a flaky Indian internet connection?

| Aspect               | Current State                 | Verification                                |
| -------------------- | ----------------------------- | ------------------------------------------- |
| Offline Resilience   | ✅ Service worker + `/offline` fallback | Test on cheap Android, 2G/3G, airplane mode |
| Graceful Degradation | ✅ Network-first + bounded timeout | Offline state must show reconnect screen, not stale menu content |

**If NO → nothing else matters.**

### Q2: Can a customer refresh / go back / reopen without losing context?

| Aspect            | Current State     | Verification                              |
| ----------------- | ----------------- | ----------------------------------------- |
| State Persistence | ✅ sessionStorage | Scroll → Refresh → Position restored      |
| Back Button       | ✅ handlePopState | Open item → Back → Modal closes, not exit |
| Deep Links        | ✅ URL parsing    | Share link → Opens correct item           |

**If NO → trust is broken.**

### Q3: Can an owner accidentally destroy the experience?

| Aspect              | Current State          | Verification                       |
| ------------------- | ---------------------- | ---------------------------------- |
| Contrast Validation | ✅ WCAG AA enforcement | Owner can't pick unreadable colors |
| Performance Budget  | ✅ Image size limits   | Owner can't upload 10MB images     |
| Image Quality       | ✅ Resolution check    | Low-quality images hidden          |

**If YES → Constitution is unenforced.**

---

## P0 Production Verification Scripts

### Required Equipment

- Cheap Android phone (₹7,000-10,000 range)
- iOS device (iPhone or iPad)
- Unstable network (or network throttling)
- Production URL (not localhost)

### TEST 1: Offline Fallback

| Step | Action                      | Expected                                      | Pass |
| ---- | --------------------------- | --------------------------------------------- | ---- |
| 1    | Open menu via QR on Android | Page loads fully                              | [ ]  |
| 2    | Scroll through entire menu  | Current online menu renders                   | [ ]  |
| 3    | Enable airplane mode        | Next navigation shows branded offline screen  | [ ]  |
| 4    | Try to reload while offline | `/offline` fallback appears, not cached menu  | [ ]  |
| 5    | Disable airplane mode       | Live menu reloads after reconnect             | [ ]  |
| 6    | Repeat steps 1-5 on iOS     | Same behavior                                 | [ ]  |

**Kill test:** Toggle airplane mode mid-scroll → should not crash

### TEST 2: State Persistence

| Step | Action                      | Expected                   | Pass |
| ---- | --------------------------- | -------------------------- | ---- |
| 1    | Scroll to 3rd category      | Category visible           | [ ]  |
| 2    | Select a filter (e.g., Veg) | Filter applied             | [ ]  |
| 3    | Hard refresh page           | Position + filter restored | [ ]  |
| 4    | Close browser completely    | —                          | [ ]  |
| 5    | Reopen same URL             | State restored             | [ ]  |
| 6    | Navigate back → forward     | State preserved            | [ ]  |

**Kill test:** Refresh during momentum scroll → should not lose position

### TEST 3: Back Button Safety

| Step | Action                           | Expected                 | Pass |
| ---- | -------------------------------- | ------------------------ | ---- |
| 1    | Open menu                        | Menu visible             | [ ]  |
| 2    | Tap item to open detail modal    | Modal opens              | [ ]  |
| 3    | Press browser back               | Modal closes, menu stays | [ ]  |
| 4    | Press back again                 | Exits menu (correct)     | [ ]  |
| 5    | Open shared item link directly   | Item modal opens         | [ ]  |
| 6    | Press back from shared link      | Returns to referrer      | [ ]  |
| 7    | Test in WhatsApp in-app browser  | Same behavior            | [ ]  |
| 8    | Test in Instagram in-app browser | Same behavior            | [ ]  |

**Kill test:** Back → forward → back → refresh → back → should not break

### Verification Log

| Test | Device | Browser | Result | Notes | Date |
| ---- | ------ | ------- | ------ | ----- | ---- |
| P0.1 |        |         |        |       |      |
| P0.2 |        |         |        |       |      |
| P0.3 |        |         |        |       |      |

---

## Current Launch Boundary

This implementation note is customer-facing menu-output implementation evidence; it is not current production certification. Client-menu launch approval requires the active production-readiness audit, External Certification Runbook evidence, Digital Menu Output Constitution checks, physical/mobile browser QA, low-bandwidth/offline/back-button tests, public cache and deploy evidence, and target production smoke.

---

## Related Documents

| Document                                         | Purpose                          |
| ------------------------------------------------ | -------------------------------- |
| `analytics-tracking/_spec.md`                    | Analytics tracking specification |
| `analytics-tracking/_impl.md`                    | Analytics implementation details |
| `autosell-features/_spec.md`                     | Auto-Sell features specification |
| `autosell-features/_impl.md`                     | Auto-Sell implementation details |
| `__docs__/decision-intelligence/decision-intelligence_firebase.md` | Decision Blocks nightly job      |
| `__docs__/continuous-menu-intelligence/`         | CMI system documentation         |

---

_Document Status: Historical implementation evidence - not current launch certification_
_Last Updated: May 7, 2026_
