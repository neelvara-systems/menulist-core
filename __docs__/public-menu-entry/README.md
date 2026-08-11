# Public Menu Entry

**Status:** Local source complete; external release evidence pending
**Feature flags:** `ENABLE_PUBLIC_MENU_ENTRY`; PDF intake also requires `ENABLE_PUBLIC_MENU_PDF_UPLOAD`; link intake also requires `ENABLE_MENU_LINK_IMPORT`
**Last reviewed:** August 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Preview polling runs every 5 seconds for at most 36 status reads before owner-visible retry. An expired claimed draft receipt is removed while its promoted source file is preserved. Approved app release, the scoped Firebase QA Function deployment, and hosted evidence remain pending.

## Current purpose

`/create-menu` is a publicly reachable owner-app entry point for a business owner to sign in, submit one current menu photo, bounded PDF, or permission-confirmed public link, review the structured result, and create or add an owner-controlled menu. Marketing CTAs use `app.menulist.digital/create-menu` in QA and `app.menulist.ai/create-menu` in production. It is not an anonymous extraction endpoint.

## End-to-end flow

1. The visitor opens the public page. Upload or link submission redirects an unauthenticated visitor to sign in.
2. The signed-in client admits one submission at a time and submits a JPEG, PNG, WebP, a PDF of at most 15 pages, or a permission-confirmed public link. PDFs remain in the browser and are converted through the existing bounded PDF-to-JPEG utility before upload. The returned draft identifier must pass the same exact UUID projector used by polling, claim, and preview routing.
3. The protected private/no-store route applies feature flags, a fail-closed 30-per-5-minute admission limit, account-scope integrity, current extraction permission for existing stores, SAFE_MODE, bounded strict parsing, source validation, active-draft reuse, and the 5-new-sources-per-24-hours quota. Limiter outages do not expose quota timing.
4. The route validates every uploaded image signature, the per-file and aggregate byte caps, and the ordered page count. It creates one owner-bound 24-hour draft and deterministic extraction job atomically. The draft owns a versioned source-file envelope while retaining the first-source compatibility fields. Link acquisition keeps its existing SSRF, redirect, MIME, size, and confidence boundaries.
5. The preview checks status every 5 seconds, up to 36 times, and fetches the full extracted DTO once completion is reported. The server revalidates the exact temporary Storage source envelope and projects every persisted field through the canonical browser-safe menu/profile contract; the browser repeats that projection. Preview text uses the language explicitly marked primary, the shared localized-text fallback order, and that menu language's writing direction independently of the website interface locale. Prices are bidi-isolated. Malformed source or completed truth fails closed, and cleanup aborts an obsolete in-flight poll.
6. One browser claim can be in flight at a time. Claim validates ownership, TTL, source envelope, prices, phone, account scope, and transaction-locked current user and publish authority for an existing store. New accounts receive the existing starter tenant/store setup only after the same transaction locks and confirms the user is still eligible and empty-scope.
7. One transaction creates the canonical project, one standard project file per validated PDF page or one file for a legacy source, the summary projection, new account records when needed, and the complete idempotency receipt. Combined extraction output is redistributed by the worker-provided source index before the project is written. Project identity, unique non-reserved slug, public price truth, and optional Menu Correctness metadata are committed together.
8. Public menu, OBP, client-store, screen, and assistant caches are refreshed after commit. A refresh failure does not roll back committed truth.
9. The success page admits only the active MenuList platform/tenant host family
   for displayed/copied/shared URLs and scopes starter signals to the exact
   current tenant/store handoff. A new-account starter also sees one direct
   **Keep this menu online** action. Both Billing and workspace actions reuse the
   same single-flight, cleanup-owned, bounded session refresh before navigation.
   Success URLs stay left-to-right isolated in RTL locales. Starter banners,
   expired Billing states, and the mobile subscription gate use one 52-locale
   owner namespace with ICU plural and localized-number handling.
   The upload, preview, and success journey has exact key and placeholder parity
   across all eight languages advertised by the public website switcher; it no
   longer falls back to English in Tamil, Telugu, Marathi, Bengali, Arabic, or
   Spanish. The route's mounted shared chrome is part of the same boundary:
   Header (61 labels), Footer (56), Theme switcher (7), Language switcher (1),
   accessibility skip link (1), and analytics consent (11) are complete in all
   eight packs. Desktop labels stay on one line inside the widened header at
   supported desktop widths; constrained widths switch to the drawer before
   labels collide, and the drawer enters from the logical end edge in RTL. A
   no-link success state uses an honest pending heading and does not show QR or
   placement guidance for a link that was rejected or absent.
   The seven-day starter duration and the dedicated QR Code and Assets modules
   remain unchanged.
10. Daily maintenance removes expired draft documents even when new intake is disabled. Every validated unclaimed source file is deleted before the draft; any deletion failure preserves the draft for retry. A claimed draft document is deleted but all sources now referenced by the project are retained. Legacy one-source drafts keep the same behavior.

## Owner and account boundaries

- A complete existing tenant/store session is treated as an existing account; a partial session fails with recovery guidance.
- Existing accounts need current `USE_MENU_EXTRACTION` admission before source work. Claim locks the current user record, requires its exact tenant/store/role mapping, and then evaluates `PUBLISH_MENU` from that current role inside the write transaction.
- New accounts do not have a store permission document yet; claim locks current identity, lifecycle, revocation and empty-scope truth before creating the existing starter account path.
- City is required only for a new account/subdomain. Existing accounts reuse store identity and are not asked for city.
- A valid optional phone is normalized before public presence is written.
- Extraction and claim do not charge Razorpay. Subscription conversion remains the separate existing Billing flow.

## Maintained documents

- [Specification](./public-menu-entry_spec.md)
- [Implementation](./public-menu-entry_impl.md)
- [Firebase and scale](./public-menu-entry_firebase.md)
- [Mobile support](./public-menu-entry_mobile-support.md)
- [Website copy](./public-menu-entry_website.md)
- [Help article](./public-menu-entry_helpdoc.md)
- [Marketing boundary](./public-menu-entry_marketing.md)
- [Verification](./public-menu-entry_verification.md)

Previous narratives are preserved in [`_archive/pre-2026-07-16/`](./_archive/pre-2026-07-16/).
