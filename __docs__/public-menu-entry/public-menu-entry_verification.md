# Public Menu Entry — Verification Log

**Version:** 1.0
**Status:** ✅ PRODUCTION AUDIT PASSED WITH EXTERNAL CONDITIONS
**Last Updated:** June 3, 2026

---

## Scope

This log tracks the May 20, 2026 production-audit and final-review pass for the public menu entry / starter activation flow.

Covered:

- Authenticated upload/import API and unauthenticated API rejection
- AI extraction status polling
- Authenticated draft claim
- Same permanent subdomain before and after payment
- Starter expiry holding page
- Signed Razorpay subscription webhook
- Authenticated Razorpay create/cancel API smoke with the corrected test owner credentials
- Synthetic WhatsApp adapter verification/signature/parse/inbound-queue idempotency test
- Store/project/user/draft/summary Firestore integrity
- Local cleanup of disposable test data

Not covered as a live external flow:

- Real WhatsApp Cloud API webhook/media delivery
- Hosted Razorpay recurring checkout UI completion

---

## Auth-First Browser E2E — June 3, 2026

Command type:

```bash
node <playwright-disposable-first-visitor-harness>
```

Result:

```text
PASS: fresh visitor sees auth gate with no upload control
PASS: unauthenticated POST/GET API calls return 401 before draft/job creation
PASS: auth gate shows inline phone OTP with /signin fallback for Google/password
PASS: disposable owner logs in through credentials form
PASS: fresh menu image uploads and opens owner-bound preview
PASS: natural extraction completes and shows business/menu preview
PASS: preview includes business name, INR prices, veg/non-veg, keto, gluten-free, dairy-free, phone, address, and brand color
PASS: claim card renders below the preview without fixed mobile overlap
PASS: claim creates starter setup and returns concrete menuUrl plus officialPageUrl
PASS: returned digital menu URL renders through local menulist.online subdomain host routing
PASS: returned official page root renders through the same menulist.online subdomain
PASS: Firebase draft, job, AI operation, tenant, store, project, and summary data align
PASS: disposable Auth, users, drafts, jobs, Storage prefixes, projects, stores, tenants, project summaries, and storesSummary entries cleaned up
```

Notes:

- Latest disposable run: `1780503194788-4e287a`.
- Latest returned URLs:
  - `menuUrl`: `https://bay-leaf-bistro-58.menulist.online/bay-leaf-bistro-menu`
  - `officialPageUrl`: `https://bay-leaf-bistro-58.menulist.online`
- Evidence files:
  - Browser result: `/tmp/menulist-create-menu-full-e2e-1780503194788-4e287a.json`
  - Firebase snapshot: `/tmp/menulist-create-menu-full-e2e-1780503194788-4e287a-firestore.json`
  - Public menu screenshot: `/tmp/menulist-e2e-public-menu-1780503194788-4e287a.png`
  - Official page screenshot: `/tmp/menulist-e2e-official-page-1780503194788-4e287a.png`
- The success contract separates `menuUrl` from `officialPageUrl`. Local and staging URL helpers emit `menulist.online`, for example `{subdomain}.menulist.online/{projectSlug}`. `officialPageUrl` points to the tenant root / OBP surface.
- The public menu and official page routes were verified in browser using a local host-resolver mapping to `127.0.0.1`, so requests exercised the real subdomain middleware path in local dev.
- Stored project menu data remains in the editor-compatible shape `projects/{tenantId}/{storeId}/{projectId}.files[0].extractedData.data`. The latest run stored 3 categories and 5 items, including canonical `dietaryTags` (`vegetarian`, `non-vegetarian`, `gluten-free`, `keto`, `dairy-free`) and 3 Masala Chai size attributes.
- The draft/job/AI accounting path now records public entry extraction as `public_menu_extraction`. The latest AI operation was `billingMode=free`, `unitsConsumed=0`, `model=gemini-2.5-flash`, `promptVersion=parallel_v5`, `destinationType=public_menu_draft`.
- The latest run also verified extracted business profile fields: `businessName=Bay Leaf Bistro`, `businessType=Restaurant`, `businessCategory=food`, `currencyCode=INR`, `brandAccentColor=#006D77`, `imageBackgroundColor=#E76F51`, default language `en`, phone, address, and project name.
- The official page root previously exposed an RSC hydration failure in local browser testing (`Unsupported Server Component type: undefined`) because the client catch-all route used dynamic `require()` for server components. The route now uses static imports for OBP/compliance content, and the root renders the final OBP instead of the temporary unavailable page.
- Project summary writes use the existing flat summary key shape (`projects.{projectId}`) under `platformSummary/projects_{storeId}`; current summary parsers support that compatibility shape.

---

## Local E2E Result

Command type:

```bash
node <disposable-e2e-harness>
```

Result:

```text
PASS: unauthenticated upload blocked before draft/job creation
PASS: draft storage contract
WARN: AI extraction natural completion — status failed; seeded completed data
PASS: preview polling returns completed data
PASS: disposable auth user created
PASS: NextAuth credentials session
PASS: draft claim creates permanent workspace
PASS: duplicate claim idempotency guard
PASS: session refresh after claim
PASS: Firestore conversion integrity
PASS: starter public URL active before payment
PASS: starter expiry holding page
PASS: signed Razorpay subscription webhook
PASS: payment preserves same public URL
PASS: authenticated Razorpay create-subscription route
PASS: Razorpay cancel-subscription cleanup route
PASS: signed Razorpay webhook writes lean v2 audit row without raw payload
PASS: starter distribution activation helper counts 2 unique signals
PASS: synthetic WhatsApp adapter challenge/signature/parser/queue idempotency
PASS: cleanup completed
```

Notes:

- Gemini natural extraction failed locally because the configured key is quota-blocked. The harness seeded a completed draft after confirming the failure state so downstream claim/payment/public route behavior could still be verified.
- Public subdomain routing was tested locally with host-resolution to `{subdomain}.menulist.online:3000` so the request exercised the tenant middleware instead of the marketing root.
- The signed Razorpay webhook used the configured test webhook secret and verified that `subscriptions`, `stores`, and nested `platformSummary/storesSummary.stores.{storeId}.activePlanType` all synced to `starter`.
- Final parity sweep also fixed sibling `storesSummary` merge writers so public starter, WhatsApp publish, outlet create/rename/deactivate/policy, platform block, and scheduler enrichment writes all preserve the nested `stores.{storeId}` map read by Cloud Functions.
- Razorpay webhook audit storage now writes lean v2 payment transaction rows and local Razorpay route logs use summaries only, reducing Firestore document size and avoiding raw provider payloads in local log files.
- Corrected owner credentials reached a real local NextAuth session, created a Razorpay test subscription, and cancelled it through the app cleanup route.
- WhatsApp live delivery was not exercised, but adapter challenge verification, HMAC signature verification, image payload parsing, inbound queue create, duplicate idempotency, no-raw-payload storage, and cleanup were verified with synthetic payloads.
- Disposable Auth, Firestore, Storage, project summary, storesSummary, subscription, payment transaction, and AI operation test rows were cleaned up.

---

## Static Gates

```bash
npx tsc --noEmit --incremental false
npm run lint
cd functions && npx tsc --noEmit
npm run build
git diff --check
node -e "JSON.parse(...locale files...)"
```

Result:

- TypeScript app: pass
- ESLint: pass
- Cloud Functions TypeScript: pass
- Production build: pass
- Diff whitespace: pass
- Website locale JSON parse: pass

---

## Production Conditions

Before public traffic:

1. Deploy Firestore rules and indexes for `publicMenuDrafts` and starter cleanup queries.
2. Deploy the updated `menulistMaintenanceScheduler` so expired public drafts and storage files are removed.
3. Fix or replace the configured Upstash Redis endpoint; local rate-limit calls currently log DNS `ENOTFOUND` and fall open.
4. Confirm Gemini quota/key capacity for public uploads; current local key returns quota errors.
5. Confirm Razorpay merchant recurring/autopay capability for hosted checkout completion.
6. Run WhatsApp Cloud API sandbox flow with real Meta test credentials if WhatsApp onboarding is included in the launch path.

---

**Document Signature:** MenuList Public Menu Entry Verification
**Audience:** Engineering / Ops
