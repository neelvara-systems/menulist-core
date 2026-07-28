# Public Truth Check - Implementation Plan

**Status:** Implemented - public self-report route and logged-in owner check
**Last Updated:** July 16, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The first public runtime implementation exists at `/tools/public-truth-check`. The logged-in owner check is implemented inside Business Health on desktop and mobile.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/public-truth-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx` | Browser-local form and report UI |
| `src/lib/public-truth-tools/publicTruthCheckTypes.ts` | Public Truth Check input/report contracts |
| `src/lib/public-truth-tools/publicTruthCheckReport.ts` | Deterministic self-report checks |
| `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` | Deterministic owner check from MenuList store/project truth |
| `src/hooks/publicTruthTools/useOwnerPublicTruthReadiness.ts` | Owner hook using existing project summary and selected/default project DAL reads |
| `src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx` | Desktop Business Health owner card |
| `src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx` | Mobile Business Health owner card |
| `scripts/verification/verify-public-truth-check.js` | Boundary verifier for no external source fetch, consented contact handoff, feature flags, discovery, and locale keys |

The implemented activation modes are `self_report` with an optional contact handoff and `menulist_owner` inside Business Health. Standalone saved lead, manual review, external adapter, recurring history, and AI/search readability modes remain unimplemented.

Existing reusable sources:

| Path | Reuse |
| --- | --- |
| `src/lib/seo/publicTruthIndexing.ts` | Public truth eligibility logic |
| `src/app/client/[[...slug]]/page.tsx` | Public menu/catalog fields and schema |
| `src/app/client/obp/schema.ts` | Official Business Page fields and schema |
| `src/app/api/public/v1/business/route.ts` | Existing business read contract |
| `src/app/api/public/v1/menu/route.ts` | Existing menu read contract |
| `src/lib/security/boundedRequestBody.ts` | Body cap pattern |
| `src/lib/rateLimit` | Public route rate limiting |
| `src/lib/security/securityDiagnostics.ts` | Bounded diagnostics |
| `src/components/website/` | Website UI patterns |

### 1.1 Implementation Ladder

| Version | Runtime shape | Current/planned files | Data behavior | Implementation rule |
| --- | --- | --- | --- | --- |
| V0 public free tool | `/tools/public-truth-check` browser-local report | Current website route, component, report builder, types, verifier | No report-time Firebase reads/writes, no external fetch, no provider/model calls; optional contact handoff writes through existing `/api/public/contact` after consent | Treat business URL/menu link/Google profile as user-provided references unless an approved adapter is explicitly enabled |
| V1 logged-in owner check | Business Health/Public Discovery/OBP readiness card | `ownerPublicTruthReadiness.ts`, `useOwnerPublicTruthReadiness.ts`, Business Health desktop/mobile cards | Existing MenuList truth reads only; no writes | Reuse loaded owner context/client DAL; no API route that re-reads tenant data |
| V2 paid add-on behavior | Recurring reports, saved history, multi-location and agency output | Future paid add-on module plus capped report storage | Capped report history and explicit cost ledger | Require entitlement, schedule controls, rate limits, audit logs, and source policy before writing code |

Every future Public Truth Check enhancement should declare which ladder level it belongs to before implementation.

---

## 2. Implementation Modes

The implementation should support modes through flags/config, not separate products.

| Mode | Purpose | External fetch? | Firebase? |
| --- | --- | --- | --- |
| `self_report` | Client/server checks owner-entered fields | No | Optional lead only |
| `menulist_owner` | Owner-authenticated check from store/project truth | No external fetch | Existing reads |
| `manual_review` | Store submission for team/manual report | No automated fetch | Capped request/write |
| `approved_adapter` | Fetch approved external source types | Yes, guarded | Capped |
| `ai_search_readability` | Internal or paid sampled model check | Provider calls | Cost logged |

Current code activates `self_report` and `menulist_owner`. Owner mode reuses `storeDetails`, `getExistingProjectsListWithoutLoader(true)`, optional selected/default `getProjectDataWithoutLoader(projectId)`, and the mobile project cache when present. It does not add an API route that re-reads owner data unnecessarily.

Current V0 completion adds:

- copy report action using browser clipboard fallback utilities
- download report action using browser-local text export
- consented follow-up form that posts to existing `/api/public/contact`
- shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking
- consent-aware marketing events through `trackWebsiteMarketingEvent`
- no source URL fetch, no AI/search check, no new API route, and no new collection

Current V1 completion adds:

- owner-side deterministic report from MenuList store/project truth
- desktop Business Health card with focused fix links to existing Business Settings, Projects, and QR surfaces
- mobile Business Health card with module action buttons that stay inside `MobileShell`
- bounded owner-side `setupJobList` derived from missing, unclear, and not-checked readiness modules
- public truth index reuse through `evaluatePublicTruthIndexability`
- no report API route, no external scan, no AI/search check, no report history, and no write path

### 2.1 V1 Exact Fix Targets

The owner readiness report is still read-only: it does not write report state and it does not mutate store/project truth. Each module now carries an action label, desktop `fixHref`, and mobile `mobileFixTarget` so the owner can reach the existing fix surface directly.

The report also exposes `setupJobList`, capped by `OWNER_PUBLIC_TRUTH_MAX_SETUP_JOBS`. The list is derived from the same module rows and ordered with missing items first, then check/not-checked items. Desktop renders it as a fix list with existing `fixHref` links. Mobile renders the same list through `mobileFixTarget` shell callbacks. It is not an action queue, saved history, paid report, or canonical truth write.

| Module | Desktop target | Mobile target |
| --- | --- | --- |
| Public truth basics | Business Settings profile/search-discovery or Projects editor, depending on the first missing fact | Basic settings, domain settings, or Menu tab |
| QR link health | `/qr-code?focus=qr` when ready, otherwise customer-link settings | Share tab or domain settings |
| Menu or service clarity | Projects editor with `focus=menu-readiness` and a quality action such as `prices` or `descriptions` | Menu tab |
| Price and availability clarity | Projects editor with price or availability focus | Menu tab |
| PDF cleanup readiness | Projects editor or customer-link settings, depending on missing source/link state | Menu tab or domain settings |
| WhatsApp action link | Official Business Page action settings | Official Page sub-screen |
| Hours readiness | Business Settings hours | Hours sub-screen |
| Photo and visual identity | Business profile logo or Official Business Page photos | Basic settings or Official Page sub-screen |
| Customer question coverage | Menu, hours, Official Business Page actions, customer-link settings, or Projects editor depending on the missing fact | Menu tab, hours, Official Page, or domain settings |
| Booking and inquiry readiness | Official Business Page actions, hours, location, or customer-link settings depending on the missing action path | Official Page, hours, basic settings, or domain settings |
| Google profile handoff | Presence Monitor when a live link exists, otherwise customer-link settings | Presence Monitor or domain settings |
| Menu freshness | Projects editor with menu-readiness focus | Menu tab |

Business Settings accepts `section` and `focus` query parameters, Projects accepts `view=editor`, `focus=menu-readiness`, and `qualityAction`, and Use MenuList accepts `focus=qr`. Mobile does not open these desktop URLs; it maps `mobileFixTarget` to shell tabs or More sub-screens.

---

## 3. Proposed File Layout

```txt
src/lib/public-truth-tools/checks/publicTruthCheck.ts
src/lib/public-truth-tools/publicTruthCheckTypes.ts
src/lib/public-truth-tools/publicTruthCheckReport.ts
src/lib/public-truth-tools/ownerPublicTruthReadiness.ts
src/hooks/publicTruthTools/useOwnerPublicTruthReadiness.ts
src/app/(website)/tools/public-truth-check/page.tsx
src/app/(website)/tools/public-truth-check/PublicTruthCheckClient.tsx
src/app/api/public-truth-check/report/route.ts
src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx
src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx
scripts/verification/verify-public-truth-check.js
```

Add only the files required by the chosen activation mode.

---

## 4. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_CHECK: true;
ENABLE_PUBLIC_TRUTH_OWNER_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 5. Type Contracts

Suggested input:

```typescript
export interface PublicTruthCheckInput {
  mode: 'self_report' | 'menulist_owner' | 'manual_review';
  businessName: string;
  cityOrArea: string;
  businessType?: string;
  publicUrl?: string;
  menuOrServiceText?: string;
  contactEmail?: string;
  contactPhone?: string;
  sourceConsent: boolean;
}
```

Suggested report:

```typescript
export interface PublicTruthCheckReport {
  reportId?: string;
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  checks: PublicTruthCheckItem[];
  nextAction: {
    label: string;
    href: string;
    type: 'create_customer_link' | 'complete_business_facts' | 'manual_review';
  };
  boundaries: {
    externalSourcesFetched: boolean;
    aiOrSearchChecked: boolean;
    rankingPromise: false;
  };
}
```

Suggested check item:

```typescript
export interface PublicTruthCheckItem {
  id:
    | 'business_identity'
    | 'menu_or_service_source'
    | 'prices'
    | 'hours'
    | 'location'
    | 'contact'
    | 'customer_actions'
    | 'public_link'
    | 'photos'
    | 'machine_readable_source';
  label: string;
  result: 'present' | 'missing' | 'unclear' | 'not_applicable' | 'not_checked';
  evidenceText: string;
  fixHref?: string;
}
```

---

## 6. Deterministic Checks

The first implementation should perform deterministic checks before any AI/provider call.

| Check | Self-report source | Owner source |
| --- | --- | --- |
| Business identity | businessName + city | store name, city/area |
| Menu/service source | pasted text or link-present only; V0 has no persisted upload | active project summary/full project |
| Prices | text hints or user selected present | project item prices |
| Hours | user field or link-present | store workingHours/tempStatus |
| Location | city/address field | store address/geo/maps URL |
| Contact | phone/email/WhatsApp field | store phone/email/publicPresence |
| Customer actions | action links provided | order/reservation/WhatsApp/call/map links |
| Public link | provided URL or not | OBP/menu canonical URL |
| Photos | not checked by default | logo/businessCover/photos |
| Machine-readable source | not checked by default | schema/llms/public route availability |

The V0 builder performs fact hint matching only against `menuOrServiceText`. It must not append `publicUrl` before price, hours, location, contact, or action regex checks, because path words are not evidence that the destination page contains those facts.

If a fact cannot be checked safely, return `not_checked`, not a guessed result.

V0 does not store uploaded files. The public route accepts pasted source text and URL references only. Any persisted menu/service upload must belong to an approved setup or manual-review flow with consent, retention, Firebase cost, and cleanup rules documented before implementation.

---

## 7. Public Route Rules

If `POST /api/public-truth-check/report` is added:

- parse body with `readBoundedJsonBody`
- validate with Zod
- rate limit before expensive work
- reject oversized input
- do not fetch arbitrary URLs in default mode
- log only bounded metadata
- return generic errors
- do not store lead/contact without consent

The first activation runs client-only, so no API route was added.

---

## 8. Owner-App Rules

Owner-authenticated mode reuses loaded store/project context where possible.

The hook admits that context only when its tenant and store exactly match the
current authenticated owner session. A session/workspace transition clears the
report and suppresses reads until the provider has hydrated matching context.
Menu freshness projection contains legacy `Date`, Firestore timestamp, epoch,
and ISO inputs; malformed, coercive, out-of-range, or throwing timestamp values
remain unavailable instead of crashing the owner surface or inventing an age.

Build order:

```txt
DAL/helper -> hook -> desktop card -> mobile card if admitted -> verifier
```

Do not add an API route just to re-read store/project data already available in owner context.

Implemented V1 sources:

| Source | Use |
| --- | --- |
| `PlatformGlobalDataContext.storeDetails` | Business identity, hours, location, contact, action links, domain, OBP photos |
| `getExistingProjectsListWithoutLoader(true)` | Active/default project summary without creating a default project; shares the Business Health scope selector SWR key |
| `getProjectDataWithoutLoader(projectId)` | Selected/default project item, price, and image checks when not already cached |
| `useMobileProjects()` | Mobile project summaries and cached project data |
| `evaluatePublicTruthIndexability()` | Menu/OBP search-readable gate |

---

## 9. Fix Paths

| Missing item | Preferred fix path |
| --- | --- |
| menu/service source | `/create-menu` for public, existing project/menu flow for owner |
| hours | business settings / OBP settings |
| location | OBP/business settings |
| contact | OBP/business settings |
| public link | publish/share flow |
| photos | OBP photo flow |
| prices | menu editor |
| customer actions | OBP action links |

Avoid generic "learn more" actions when a direct MenuList fix path exists.

---

## 10. Security And Abuse Controls

Required controls:

- public rate limiting
- body-size cap
- input normalization
- no sensitive logs
- generic errors
- no external fetch by default
- server-network-target validation before any approved fetch adapter
- no third-party source stored as truth without owner confirmation
- no public PII display in report URLs

---

## 11. Verification

Suggested verifier should check:

- route exists only when feature flag docs are updated
- public copy contains no ranking/citation promises
- API route, if present, uses bounded body read
- API route, if present, rate limits before expensive work
- no arbitrary `fetch(input.publicUrl)` path exists
- no uploaded-file storage exists in V0
- every report check includes explicit `evidenceText`
- report uses allowed status enums
- owner mobile path stays in `MobileShell`
- Firebase doc has operation counts

Implemented verifier:

```bash
npm run verify:public-truth-check
```

It checks route existence, feature flags, localized copy keys, discovery files, explicit report evidence text, V0 upload-storage boundaries, report boundaries, absence of external source fetches, and the existing `/api/public/contact` handoff boundary.
