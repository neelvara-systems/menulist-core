# Menu Readability Check - Implementation Plan

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Developers and future maintainers

---

## 1. Current State

The V0 public runtime exists at `/tools/menu-readability-check`.

Implemented files:

| Path | Purpose |
| --- | --- |
| `src/app/(website)/tools/menu-readability-check/page.tsx` | Public website route, metadata, structured data, and feature-flag gate |
| `src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx` | Browser-local form, report UI, copy/download, and consented handoff |
| `src/lib/public-truth-tools/menuReadabilityTypes.ts` | Menu Readability input/report contracts |
| `src/lib/public-truth-tools/menuReadabilityReport.ts` | Deterministic pasted-text checks |
| `scripts/verification/verify-menu-readability-check.js` | Boundary verifier for route, flags, docs, locales, discovery, and no external fetch |

V1 owner readiness is implemented through the shared Business Health/Public Truth owner card. No standalone readability dashboard, paid add-on history, file upload, PDF parser, OCR, report API route, storage path, Cloud Function, or AI/search provider call is implemented in V0.

---

## 2. Feature Flags

Implemented flags in `src/config/features.ts`:

```typescript
ENABLE_PUBLIC_TRUTH_TOOLS: true;
ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK: true;
ENABLE_PUBLIC_TRUTH_CHECK_EXTERNAL_ADAPTERS: false;
ENABLE_PUBLIC_TRUTH_CHECK_AI_READABILITY: false;
```

Use feature config, not new env vars, for ordinary product switches.

---

## 3. Type Contracts

Input:

```typescript
export interface MenuReadabilityInput {
  mode: 'self_report';
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuReadabilitySourceKind;
  sourceText: string;
  publicUrl: string;
  categoriesClear: boolean;
  pricesShown: boolean;
  pricesNotNeeded: boolean;
  descriptionsHelpful: boolean;
  notesShown: boolean;
  customerActionShown: boolean;
}
```

Report:

```typescript
export interface MenuReadabilityReport {
  generatedAt: string;
  status: 'ready' | 'missing_basics' | 'unclear' | 'not_checked' | 'manual_review_needed';
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuReadabilitySourceKind;
  checks: MenuReadabilityItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    type: 'create_customer_link' | 'clean_up_source' | 'manual_review';
    href: string;
  };
  boundaries: {
    uploadedFileParsed: false;
    externalUrlFetched: false;
    aiRewriteGenerated: false;
    aiOrSearchChecked: false;
    externalPlatformUpdated: false;
    rankingPromise: false;
  };
}
```

Every `MenuReadabilityItem` includes `evidenceText: string`.

---

## 4. Deterministic Checks

| Check | Source | Rule |
| --- | --- | --- |
| Source material | `sourceText` | Present when pasted text has enough useful characters |
| Categories or sections | owner selection plus text hints | Present when owner marks categories clear or source has section-like structure |
| Items or services | pasted text | Present when source has multiple item/service-like lines |
| Prices or rates | owner selection plus text hints | Present when prices are marked/shown; not applicable when prices are marked not needed |
| Descriptions or details | owner selection plus text shape | Present when descriptions are marked helpful or item lines include enough detail |
| Customer action | owner selection plus text/link hints | Present when source says call, WhatsApp, order, book, directions, or similar |
| Current customer link | `publicUrl` | Present when URL format is valid; unclear when invalid; missing when absent |

The code must never claim the public URL works or contains menu details.

---

## 5. Public Route Rules

V0 route rules:

- render from `(website)` route group
- use `WebsitePageStructuredData`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS`
- gate on `FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK`
- import shared website CSS
- use localized copy under `Website.MenuReadabilityCheckPage`
- run `buildMenuReadabilityReport(form)` only in the browser
- keep report copy/download browser-local
- submit optional follow-up to `/api/public/contact` only after consent and Turnstile completion
- set contact handoff request options to `cache: 'no-store'`, `credentials: 'same-origin'`, and `redirect: 'manual'`
- require the shared public-contact source/status/help-topic acknowledgement before submitted state or accepted handoff tracking

Do not add `src/app/api/menu-readability-check/report/route.ts` for V0.

---

## 6. Cost And Storage

V0 report path:

- Firestore reads: 0
- Firestore writes: 0
- Firestore deletes: 0
- Storage operations: 0
- Cloud Functions: 0
- External fetches: 0
- AI/provider calls: 0

Optional follow-up:

- reuses existing `/api/public/contact`
- creates one existing public contact enquiry write only after explicit consent and existing route validation

---

## 7. Upload And AI Boundary

Do not add file upload, PDF parsing, OCR, or AI rewrite in V0.

Reasons:

- file upload requires storage/privacy/retention decisions
- PDF/image parsing belongs to existing setup/import flows, not a free public diagnostic
- AI rewrite would shift the tool from diagnosis to content generation

If upload or AI cleanup is later approved, it must use an approved setup/manual-review or paid flow with consent, retention, cost, and verifier updates.

---

## 8. V1 Owner Implementation Direction

V1 reuses existing owner truth and project DAL:

- active project/menu/service data
- item/service categories
- item prices
- descriptions
- dietary/service notes
- public link readiness
- existing Business Health/Public Discovery/OBP readiness surfaces

Do not create a standalone readability dashboard for V1.

---

## 9. Verifier Gate

`npm run verify:menu-readability-check` must check:

- doc set exists under `__docs__/menulist-tools/menu-readability-check/`
- feature flag exists
- route and component exist
- route structured data and feature gates exist
- report type includes `evidenceText`
- report boundaries are false for file parsing, URL fetch, AI rewrite, AI/search, external updates, and ranking promises
- no report API route exists
- no source URL fetch exists
- no file upload/storage path exists
- locales exist in `en-US` and `hi-IN`
- discovery policy, sitemap, `llms.txt`, and `llms-full.txt` include the public route

---

## 10. Implementation Notes

The V0 result is deliberately conservative. It can identify obvious text patterns, but owner selections are treated as self-report evidence. A public URL is parsed locally for format only; it is not fetched or treated as proof that the linked page is current.
