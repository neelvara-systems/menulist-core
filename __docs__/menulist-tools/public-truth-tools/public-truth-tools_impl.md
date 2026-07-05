# Public Truth Tools - Implementation Plan

**Status:** Active family; sixteen V0 tools, five public asset makers, shareable report viewer, and eighteen V1 owner readiness modules with owner fix lists implemented
**Last Updated:** July 4, 2026
**Audience:** Developers and future maintainers

---

## 1. Current Repo Truth

This is not a from-zero system. MenuList already has the core sources Public Truth Tools must reuse.

| Existing path | Current role |
| --- | --- |
| `src/lib/seo/publicTruthIndexing.ts` | Determines whether a public tenant page is useful public truth |
| `src/app/client/[[...slug]]/page.tsx` | Public menu/catalog route and JSON-LD generation |
| `src/app/client/obp/schema.ts` | Official Business Page schema generator |
| `public/llms.txt` | Agent-readable MenuList boundary and no-guessing policy |
| `src/app/api/public/v1/business/route.ts` | Existing authenticated public business pull API |
| `src/app/api/public/v1/menu/route.ts` | Existing authenticated public menu pull API |
| `src/config/features.ts` | Existing feature-flag home |
| `__docs__/growthos-addon/README.md` | Paid add-on precedent |
| `__docs__/growth-engine/README.md` | Internal acquisition/distribution boundary |

Public Truth Tools should compose these. Do not duplicate them.

## 1.1 Implementation Ladder

| Lane | Runtime form | Storage/cost posture | Code admission rule |
| --- | --- | --- | --- |
| V0 public free tool | Website route and deterministic local/server-light report | Prefer zero report-time Firebase and zero providers; lead storage only with explicit consent and a capped existing contact/setup flow | The tool must clearly say what it did and did not check |
| V1 logged-in owner check | Existing owner surfaces such as Business Health, Public Discovery, OBP readiness, mobile owner shell | Reuse loaded store/project truth and existing DAL/cache paths | Do not add a protected API route solely to re-read data the owner context already has |
| V2 paid add-on behavior | Entitled module for saved history and owner/partner reports | Capped report history, explicit cost ledger, manual refresh controls | Implemented for single-store saved history; scheduler, multi-location runtime, and external adapters remain off |

New modules can be plugin-like internally, but they must still stay inside MenuList's public truth layer.

---

## 1.1A Tools Hub

Tools Hub is the static public index at `/tools`. It groups current public checks by owner job and links to each implemented route. It does not run reports, submit leads, fetch URLs, call providers, store report state, or mutate external platforms. Its source gate is `npm run verify:tools-hub`, and the aggregate family gate includes `verify-tools-hub.js`. The gate compares the component's route/key registry as an exact set so stale cards for unimplemented tools fail.

## 1.1B Shareable Tool Reports

Shareable Tool Reports is the public report viewer at `/tools/reports`. Source tools can generate a hash-fragment report URL using `src/lib/public-truth-tools/shareableToolReport.ts`.

Current V0 rules:

- report payload lives in `/tools/reports#r=...`
- no report API route
- no Firestore report collection
- no report-time Firebase read/write
- no external fetch
- no AI/provider call
- every shared row keeps `evidenceText`
- next actions are guarded to internal MenuList hrefs

All current public tool report cards are source-tool integrations. Future public tools should adopt this shared contract when their report cards are created.

The report viewer's optional follow-up form posts only to the existing `/api/public/contact` route. Accepted submissions create one existing public contact enquiry and tag it with bounded `shareable_tool_report` metadata (`sourceKind`, `sourceToolId`, `sourceReportStatus`, `sourcePrimaryNumber`, and nested `sourceContext`) for operational triage. `/ops/report-leads` can read those existing enquiries for platform-admin manual triage. This is lead metadata, not report storage or canonical business truth.

## 1.1C Public URL Boundary

V0 tools may parse owner-entered URLs only as local readiness hints. The shared helper at `src/lib/public-truth-tools/publicUrlValidation.ts` accepts bare public domains by normalizing them to HTTPS, then requires a public HTTPS URL. It rejects explicit `http://`, localhost, `.localhost`, `.local`, private IPv4, raw IPv4, loopback IPv6, and credentialed URLs.

The parser does not fetch, open, resolve DNS, crawl, inspect, store, or mutate the target. It only decides whether an owner-entered link is suitable to count as a public customer link in a browser-local report.

Malformed URL syntax uses bounded parse diagnostics. `public_truth_tool_url_parse_failed` includes the manifest/tool source label, value kind, value string length, candidate length, explicit-protocol shape, fixed `treat_as_missing_public_url` fallback policy, and normalized source error metadata only. It does not log the owner-entered URL, hostname, path, query string, fragment, report payload, store identifiers, or exception text. Repeated shapes are capped before logging.

URL-derived evidence text in manifest-backed public reports must name the public HTTPS boundary. Generic "URL format was checked" wording is not enough because it hides the local/private/insecure rejection rule from the generated report.

---

## 1.2 Next Build Sequence

The next implementation should not start a generic registry or broad toolbox. Add the next tool only after its full doc set is created under `__docs__/menulist-tools/[tool-name]/`.

| Rank | Tool | Public route | Implementation note |
| --- | --- | --- | --- |
| 1 | Public Truth Check | `/tools/public-truth-check` | Implemented V0 and V1 owner readiness modules |
| 2 | Business Facts Copy Pack | `/tools/business-facts-copy-pack` | Implemented V0 with owner-entered facts only; V1 owner module checks MenuList business facts before reuse across public copy surfaces; does not inspect or update external profiles |
| 3 | QR Link Health Check | `/tools/qr-link-health-check` | Implemented V0 with pasted URL only; V1 owner module checks MenuList customer-link readiness |
| 4 | Menu / Service Readability Check | `/tools/menu-readability-check` | Implemented V0 with pasted source text only; V1 owner module checks selected/default MenuList menu categories, items, and prices |
| 5 | Customer Question Coverage Check | `/tools/customer-question-coverage-check` | Implemented V0 with pasted source/questions only; V1 owner module checks current MenuList facts behind common customer answers |
| 6 | Customer FAQ Reply Pack | `/tools/customer-faq-reply-pack` | Implemented V0 with owner-entered questions/facts only; V1 owner module checks MenuList facts behind reusable FAQ replies; does not create chatbots, configure automation, send messages, or call AI providers |
| 7 | Booking Inquiry Readiness Check | `/tools/booking-inquiry-readiness-check` | Implemented V0 with owner-entered action path and destination checks; V1 owner module checks MenuList OBP actions, contact, hours, location, and customer link |
| 8 | Price & Availability Gap Check | `/tools/price-availability-gap-check` | Implemented V0 with pasted source text and selected facts only; V1 owner module checks MenuList item prices, variant prices, and availability flags |
| 9 | Menu PDF Cleanup Check | `/tools/menu-pdf-cleanup-check` | Implemented V0 with owner-entered PDF reference/facts only; V1 owner module checks MenuList source and customer-link readiness |
| 10 | Google Profile Basics Checklist | `/tools/google-profile-basics-checklist` | Implemented V0 with owner-selected profile facts only; V1 maps to existing Google Profile Handoff module |
| 11 | WhatsApp Action Link Check | `/tools/whatsapp-action-link-check` | Implemented V0 with click-to-chat format and action-message clarity checks; V1 owner module checks MenuList OBP/customer action settings |
| 12 | WhatsApp Reply Pack | `/tools/whatsapp-reply-pack` | Implemented V0 with owner-entered facts only; V1 owner module checks WhatsApp/action, hours, menu/source, and customer-link facts; does not call WhatsApp APIs or send messages |
| 13 | Hours & Holiday Hours Check | `/tools/hours-check` | Implemented V0 with owner-entered regular hours, closed days, special-hours state, fallback, and current-link checks; V1 owner module checks store working hours |
| 14 | Photo / Visual Identity Gap Check | `/tools/photo-gap-check` | Implemented V0 with owner-selected logo, cover, location/team, product/service, current-photo, public-page-image, and customer-link checks; V1 owner module checks MenuList logo, OBP photos, project image, and loaded item images |
| 15 | One Customer Link Preview | `/tools/customer-link-preview` | Implemented V0 with owner-entered facts only; V1 owner module checks MenuList public-link readiness and core page facts |
| 16 | Social Bio Link Consistency Check | `/tools/social-bio-link-check` | Implemented V0 with owner-selected profile/link placement facts only; V1 owner module checks one-current-link readiness for Share/Public Discovery handoff |
| Asset cluster | Print & Share Tools | `/tools/*-maker` | Implemented public browser-local asset makers; V1 owner module checks whether customer-link, identity, and action facts are ready for printing or sharing |
| Owner-only | Menu Freshness | Business Health | Implemented V1 owner module checks selected/default MenuList menu timestamps and asks for review when freshness is unclear or stale; external sites are not scanned |
| Owner/admin prototype | Maps Place Check | Callable Function | Flag-off provider-backed check using Gemini Google Maps grounding. Returns evidence and Maps sources for owner/admin review only; no public route, no canonical writes |

Every tool should output:

- overall status
- 3-7 check rows
- explicit evidence text for each row
- what was not checked
- one MenuList fix path
- copy/download report where useful
- optional consented follow-up only through an approved bounded route

## 1.3 Owner Fix Target Contract

V1 owner modules must expose the same report contract on desktop and mobile:

- `actionLabel`: short owner-facing action text
- `fixHref`: desktop path to an existing MenuList fix surface
- `mobileFixTarget`: shell-safe mobile target enum
- `evidenceText`: what MenuList actually checked
- `setupJobList`: bounded owner fix list derived from missing, unclear, or not-checked module rows

Current mobile targets are `basic_settings`, `domain_settings`, `hours_edit`, `menu_tab`, `official_page`, `presence_monitor`, and `share_tab`. They are resolved inside `MobileBusinessHealthScreen` through `MobileShell` callbacks. Mobile cards must not open desktop URLs with `window.location`.

Current desktop focused surfaces are:

- `/business-settings?section=business-profile&focus=...`
- `/business-settings?section=search-discovery&focus=...`
- `/business-settings?section=hours&focus=working-hours`
- `/projects?...&view=editor&focus=menu-readiness&qualityAction=...`
- `/qr-code?focus=qr`
- `/qr-code?focus=share`
- `/qr-code?focus=print`

These targets are navigation only. They add no Public Truth report storage, external scans, provider calls, or new write paths.

The owner fix list is not a new dashboard or work queue. `buildOwnerPublicTruthSetupJobList(...)` derives it from already-computed readiness modules, caps it at `OWNER_PUBLIC_TRUTH_MAX_SETUP_JOBS`, and keeps every item tied to the same desktop/mobile fix target as its module.

Owner readiness menu-link generation remains best-effort. If `generateProjectUrl(...)` throws while deriving the public menu URL from the current store domain and project summary, the report keeps the existing fallback by omitting `publicLinks.menuUrl`. The failure logs bounded `public_truth_owner_menu_url_generation_failed` diagnostics with subdomain/custom-domain presence and length, project slug/name/project-id shape metadata, default-project state, fixed `omit_menu_url` fallback policy, and normalized source error metadata only. It does not log raw domains, project names, slugs, project IDs, tenant/store IDs, generated URLs, or exception text.

---

## 2. Proposed Future File Layout

Runtime files now exist for Public Truth Check V0/V1, Business Facts Copy Pack V0/V1, WhatsApp Reply Pack V0/V1, Customer FAQ Reply Pack V0/V1, QR Link Health Check V0/V1, Menu Readability Check V0/V1, Customer Question Coverage Check V0/V1, Booking Inquiry Readiness Check V0/V1, Price Availability Gap Check V0/V1, Menu PDF Cleanup Check V0/V1, Google Profile Basics Checklist V0/V1, One Customer Link Preview V0/V1, Social Bio Link Consistency Check V0/V1, WhatsApp Action Link Check V0/V1, Hours Check V0/V1, Photo Gap Check V0/V1, and Print & Share Tools V0/V1 owner readiness coverage. Eighteen V1 owner readiness modules live in `ownerPublicTruthReadiness.ts` and render inside desktop/mobile Business Health. Future tools should follow this shape without adding report APIs or persistence until their lane requires it:

```txt
src/lib/public-truth-tools/
  publicTruthCheckTypes.ts
  publicTruthCheckReport.ts
  businessFactsCopyPackTypes.ts
  businessFactsCopyPackReport.ts
  whatsappReplyPackTypes.ts
  whatsappReplyPackReport.ts
  customerFaqReplyPackTypes.ts
  customerFaqReplyPackReport.ts
  ownerPublicTruthReadiness.ts
  qrLinkHealthTypes.ts
  qrLinkHealthReport.ts
  menuReadabilityTypes.ts
  menuReadabilityReport.ts
  customerQuestionCoverageTypes.ts
  customerQuestionCoverageReport.ts
  bookingInquiryReadinessTypes.ts
  bookingInquiryReadinessReport.ts
  priceAvailabilityGapTypes.ts
  priceAvailabilityGapReport.ts
  menuPdfCleanupTypes.ts
  menuPdfCleanupReport.ts
  googleProfileBasicsTypes.ts
  googleProfileBasicsReport.ts
  customerLinkPreviewTypes.ts
  customerLinkPreviewReport.ts
  socialBioLinkCheckTypes.ts
  socialBioLinkCheckReport.ts
  shareableToolReport.ts
  whatsappActionLinkTypes.ts
  whatsappActionLinkReport.ts
  hoursCheckTypes.ts
  hoursCheckReport.ts
  photoGapCheckTypes.ts
  photoGapCheckReport.ts
  registry.ts
  types.ts
  reportStatus.ts
  sourcePolicy.ts
  checks/
    publicTruthCheck.ts
    qrLinkHealthCheck.ts
    menuReadabilityCheck.ts
    whatsappActionLinkCheck.ts
    hoursCheck.ts
    photoGapCheck.ts
    profilePhotoGapCheck.ts

src/app/(website)/tools/
  public-truth-check/page.tsx
  public-truth-check/PublicTruthCheckClient.tsx
  qr-link-health-check/page.tsx
  menu-readability-check/page.tsx
  customer-question-coverage-check/page.tsx
  booking-inquiry-readiness-check/page.tsx
  price-availability-gap-check/page.tsx
  menu-pdf-cleanup-check/page.tsx
  google-profile-basics-checklist/page.tsx
  customer-link-preview/page.tsx
  social-bio-link-check/page.tsx
  reports/page.tsx
  whatsapp-action-link-check/page.tsx
  hours-check/page.tsx
  photo-gap-check/page.tsx

src/app/api/public-truth-tools/
  report/route.ts
  lead/route.ts

src/components/templates/main-app/businessHealth/
  publicTruthToolCards/

src/hooks/publicTruthTools/
  useOwnerPublicTruthReadiness.ts

src/components/mobile/screens/
  MobilePublicTruthStatusScreen.tsx

scripts/verification/
  verify-public-truth-tools.js
```

The first implementation created only the files needed for `public-truth-check`. The API route shape above is future-only and must not be added for V0/V1.

---

## 3. Feature Flags

Flags live in `src/config/features.ts`.

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_SHAREABLE_REPORTS: true;
ENABLE_PUBLIC_TRUTH_CHECK: true;
ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK: true;
ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK: true;
ENABLE_PUBLIC_TRUTH_GOOGLE_PROFILE_BASICS_CHECKLIST: true;
ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW: true;
ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK: true;
ENABLE_PUBLIC_TRUTH_OWNER_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Recommended rules:

- use normal feature flags, not new env vars
- keep public website route hidden until `ENABLE_PUBLIC_TRUTH_CHECK` is true
- keep owner app cards hidden until `ENABLE_PUBLIC_TRUTH_TOOLS` is true
- keep provider/model adapters behind separate capability flags if added
- keep Maps grounding behind `ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK` because grounded prompts carry provider cost and source-display obligations

---

## 4. Module Registry Contract

Future module type:

```typescript
export type PublicTruthToolSurface =
  | 'public_website'
  | 'owner_app'
  | 'mobile_owner'
  | 'internal_ops'
  | 'paid_addon';

export type PublicTruthToolCostClass =
  | 'static'
  | 'firestore_low'
  | 'external_fetch'
  | 'ai_provider'
  | 'manual_review';

export interface PublicTruthToolDefinition {
  id: string;
  label: string;
  surfaces: PublicTruthToolSurface[];
  costClass: PublicTruthToolCostClass;
  riskClass: 'low' | 'medium' | 'high';
  entitlement: 'free' | 'included' | 'paid' | 'internal';
  inputSchemaKey: string;
  reportSchemaKey: string;
  fixPath: string;
  enabled: boolean;
}
```

This registry should be internal. Do not expose "plugins" in public copy.

---

## 5. Report Status Contract

Reports should avoid vague scores as the first owner-facing output.

Allowed status values:

```typescript
export type PublicTruthReportStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';
```

Allowed check result values:

```typescript
export type PublicTruthCheckResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';
```

Do not show confidence percentages to owners unless a future internal ops screen needs them.

---

## 6. Source Policy

Source access is the main risk. The default rule:

```txt
User-provided facts can be checked.
MenuList-owned truth can be checked.
External sources cannot become MenuList truth without owner confirmation.
```

Allowed source modes:

| Mode | Allowed use |
| --- | --- |
| `menulist_store` | Owner-authenticated reads from existing store/project truth |
| `user_entered_url` | Store URL as reference only after the shared public HTTPS URL boundary; no server fetch unless adapter is approved |
| `user_uploaded_source` | Future setup or manual-review menu/service-list upload via existing safe upload pipeline; not part of Public Truth Check V0 |
| `user_pasted_text` | Owner-pasted public facts |
| `manual_review` | Founder/operator reviews source and records report |
| `approved_external_adapter` | Only after source policy, SSRF guards, robots policy, body caps, and retention rules |

Disallowed by default:

- login-only pages
- private groups
- scraped social content as durable truth
- third-party facts written to MenuList store/project data without owner confirmation
- broad web crawling
- external platform posting

---

## 7. API Admission Rules

Any future API route must follow current MenuList route patterns:

- bounded request body before expensive work
- Zod schema validation
- rate limiting before provider calls
- generic public errors
- bounded diagnostics
- no raw secrets or sensitive payloads in logs
- `withAuth()` for owner-authenticated routes
- public routes require public rate limits and no tenant leaks
- server-side external fetches require current network-target guards

Suggested public route:

```txt
POST /api/public-truth-tools/report
```

Use only when a static/client-only report is insufficient. Do not add it just to re-read data the client already has.

---

## 8. Firebase Model

Documentation-only pass adds no Firebase state.

Future storage options:

| Need | Preferred storage |
| --- | --- |
| Public lead request | Reuse existing contact/public entry flow if possible |
| Owner report snapshot | `platformSummary/publicTruthTools_{sId}` capped summary |
| Paid report history | `platformSummary/publicTruthMonitor_{storeId}` capped latest/history summary |
| Internal acquisition report | Growth Engine boundary, not MenuList owner app |

Default: avoid new collections; keep Public Truth Monitor history capped in the single summary document.

---

## 9. Public Truth Tools And Business Health

Owner app results should first integrate into Business Health/public discovery status, not a new dashboard.

Preferred owner path:

```txt
Business Health -> Public source status -> exact fix action
```

Examples:

- Missing hours -> open existing hours/settings flow
- Missing menu link -> open publish/share flow
- Missing photos -> open Official Business Page photo flow
- Weak public facts -> open OBP settings

Current V1 modules in `ownerPublicTruthReadiness.ts`:

- `public_truth_basics`
- `qr_link_health`
- `menu_service_readability`
- `price_availability_gap`
- `menu_pdf_cleanup`
- `whatsapp_action_link`
- `hours_readiness`
- `photo_visual_identity`
- `customer_question_coverage`
- `booking_inquiry_readiness`
- `google_profile_handoff`
- `menu_freshness`

These modules are read-only summaries over existing store/project data. They do not write report state, fetch external pages, inspect Google/Instagram/WhatsApp, call AI/search providers, or create Business Health actions.

Do not create owner settings for every check.

---

## 10. MCP/API Boundary

MCP is not part of first implementation.

Before MenuList exposes an MCP server:

1. Public Truth Tools must have stable report contracts.
2. Read-only scope must be defined.
3. Existing public API auth/rate-limit/ETag patterns must be reused where applicable.
4. Firebase read cost must be documented.
5. Mutations must remain pending suggestions with owner confirmation.
6. Tool calls must have abuse logging and scoped credentials.

No direct MCP write tool may publish menu, hours, prices, or business identity.

---

## 11. Verification Plan

The current verifier asserts:

- every tool has a registry entry
- every registry entry has a docs file
- every public tool has a Firebase cost section
- every report/type module in `src/lib/public-truth-tools/` is either a manifest-backed public tool module or an explicitly shared helper (`shareableToolReport.ts`, `ownerPublicTruthReadiness.ts`, `publicUrlValidation.ts`)
- no tool copy includes ranking/citation guarantees
- public routes are rate-limited and body-bounded
- external fetch adapters are absent unless explicitly approved
- owner app cards link to existing fix flows
- mobile routes stay inside `MobileShell` if owner-facing

Suggested command:

```bash
npm run verify:public-truth-tools
```

The command is an aggregate wrapper for the current public tool family verifiers, including Tools Hub, Shareable Tool Reports, and sixteen public tool checks:

- `npm run verify:tools-hub`
- `npm run verify:shareable-tool-reports`
- `npm run verify:public-truth-check`
- `npm run verify:business-facts-copy-pack`
- `npm run verify:whatsapp-reply-pack`
- `npm run verify:customer-faq-reply-pack`
- `npm run verify:qr-link-health-check`
- `npm run verify:menu-readability-check`
- `npm run verify:customer-question-coverage-check`
- `npm run verify:booking-inquiry-readiness-check`
- `npm run verify:price-availability-gap-check`
- `npm run verify:menu-pdf-cleanup-check`
- `npm run verify:google-profile-basics-checklist`
- `npm run verify:customer-link-preview`
- `npm run verify:social-bio-link-check`
- `npm run verify:whatsapp-action-link-check`
- `npm run verify:hours-check`
- `npm run verify:photo-gap-check`

---

## 12. Implementation Entry Checklist

Before code work starts:

- [ ] Confirm the first tool remains `public-truth-check`
- [ ] Confirm public route placement under the MenuList website
- [ ] Confirm whether the first activation is client-only, manual-review, or server-report
- [ ] Confirm source policy for URLs and uploads
- [ ] Confirm lead capture destination
- [ ] Confirm owner-app placement
- [ ] Confirm no public ranking/citation claims
- [ ] Create/update feature flags in `src/config/features.ts`
- [ ] Add focused verifier before final handoff
