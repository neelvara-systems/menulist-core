# Public Menu Entry - Verification

**Status:** HISTORICAL SOURCE/LOCAL/QA EVIDENCE — not current launch or deploy certification
**Current local result:** PDF intake source implementation passed on August 7, 2026; starter-success Billing handoff, final-three-day warning presentation, localization, typecheck, lint, docs, and local route smoke passed on August 10, 2026. QA deploy and external evidence remain pending.

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

It does not certify the current worktree, target environment, external providers, deploy state, or production host.

The August 7 current-worktree audit additionally source-gates browser-only PDF conversion, bounded multi-page multipart admission, versioned source ownership, exact worker binding, complete private page attribution, per-page project promotion, and retry-safe multi-source cleanup. Preview polling remains 5 seconds apart with a maximum of 36 status reads, and expired claimed draft receipts preserve every promoted project source. The July 28 audit source-gated one in-flight intake submission and the shared exact draft UUID projector across browser response, preview route, poll, and claim boundaries. Local source complete status is supported by the current-worktree gates below; approved app release remains pending.

## Required current-worktree gates

```bash
npm run verify:public-menu-entry-boundary
npm run verify:menu-extraction-pipeline
npm run verify:public-business-truth
npm run verify:public-customer-delivery
npm run verify:auth-security-failure-matrix
npm run verify:menulist-api-tenant-safety
npm run verify:menu-project-editor-boundary
npm run verify:pricing-integrity-boundary
npm run verify:menu-correctness-quality-boundary
npm run verify:dependency-freeze
npx tsc --noEmit --pretty false
npm --prefix functions run build
npm --prefix functions run lint
npm run verify:functions-deploy-preflight
npm run docs:check-links
git diff --check
```

## Pending evidence

- Scoped QA deploys were attempted for `functions:processMenuImagesJob,functions:menulistMaintenanceScheduler` and `firestore:indexes` with project `menulist-qa`. Both stopped before remote mutation because the Firebase CLI was not authenticated: `Failed to authenticate, have you run firebase login?` Local Functions deploy preflight passed.
- Approved app release; no Vercel deploy is authorized by this audit.
- Signed-in new/existing/partial-session browser matrix.
- Real iOS/Android browser and installed-PWA camera/saved-photo/link/poll/retry/claim/session handoff.
- Real one-page/15-page/rotated/scanned/password-protected/corrupt PDF conversion and low-memory browser behavior.
- Gemini extraction provider smoke and Razorpay sandbox evidence only where conversion is being certified.
- Hosted cache, menu, OBP, screen, and production-host observation.

Historical evidence before July 16 remains archived and must not be read as current certification.

## August 10, 2026 starter-success conversion verification

The seven-day starter lifecycle remains authoritative. A new-account success
screen now shows one **Keep this menu online** Billing action only after its
versioned browser claim handoff matches the current tenant/store session. The
Billing and workspace actions share one bounded session refresh and fixed-route
navigation. The existing starter banner uses warning presentation during the
final three days; QR Code and Assets remain dedicated modules.

The language cross-check covers the public success page, desktop banner,
desktop no-subscription state, and mobile expired-starter gate. All owner
labels resolve through the 52-pack `StarterActivation` namespace; remaining
days and sharing counts preserve ICU plural/number signatures. English-only
string assembly was removed, actions retain 44px minimum targets with wrapping,
and both displayed customer URLs are LTR-isolated inside RTL page direction.

The public create-menu journey now has complete `Website.CreateMenu` (115),
`Website.CreateMenuPreview` (32), and `Website.CreateMenuSuccess` (23) coverage
in all eight configured website languages. The maintained gate rejects missing
or extra keys, changed interpolation names, provider markers/newlines, and any
headline highlight that is not contained in its full localized heading. It also
requires the complete live/pending success heading, direction-aware alignment,
and suppression of QR/placement guidance when no validated menu URL exists.
The preview read path is also source-gated to select the language marked
primary, resolve names/descriptions/attributes through the shared localized
text fallback, assign menu-language `lang`/`dir` independently of the interface,
and bidi-isolate prices. Upload and preview styles use logical start/end
properties rather than physical left/right alignment.
The shared `Website.AnalyticsConsent` panel has the same exact 11-key boundary
in all eight website languages; non-English packs may not retain an exact
English consent value.
The mounted shared route chrome is also exact in all eight packs: `Header` (61),
`Footer` (56), `ThemeSwitcher` (7), `LanguageSwitcher` (1), and
`Accessibility` (1). The source gate rejects missing/extra keys, placeholder or
protected-token drift, translation-workflow residue, unintended exact-English
fallback, an unlocalized website skip link, removal of the translated-header
fit classes, or regression from logical RTL drawer positioning.

Verified on the final local source:

- `npm run verify:public-menu-entry-boundary`
- `npm run verify:menu-setup-progress-boundary`
- `npm run verify:website-public-copy-boundary`
- `npm run verify:website-resource-locales`
- The MenuList-relevant stages inside `npm run verify:global-localization-boundary`:
  global source boundary, 3,468 owner strings/52 packs, 337 public-customer
  messages/52 locales, global behavior tests, and Ant Design theme tests
- `npm run typecheck`
- `npm run lint`
- `npm run docs:check-links` with zero broken links and 62 existing video
  filename warnings
- `git diff --check`

The aggregate `npm run verify:global-localization-boundary` currently exits
nonzero only at its final repository-wide mobile-UI test because the already
modified CampaignCue workspace infers browser-open acknowledgement from a
no-opener `window.open` handle. The assertion is
`scripts/verification/test-mobile-ui-locale-boundary.ts:177` against
`src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`. That
separate-product worktree failure was not changed as part of MenuList
localization.

The local Next 16.3 server rendered `/create-menu` in Arabic and Spanish at
390x844 and 1440x1000. Arabic resolved `lang=ar-SA`/`dir=rtl`; Spanish resolved
`lang=es-ES`/`dir=ltr`. Both mobile documents stayed exactly 390px wide with no
horizontal overflow, missing-message/provider marker, or English command-label
match. Both mobile drawers stayed inside the viewport without internal
horizontal overflow. At desktop width the translated Header stayed on one line,
and both Features and Resources panels stayed inside the viewport with no
clipped text or content overflow. Existing Sass `@import` deprecation warnings
remained.
The Billing panel intentionally requires an exact
authenticated starter handoff, so unauthenticated HTML cannot certify its final
rendered appearance or click-through. Signed-in desktop/mobile visual QA and
Razorpay sandbox navigation remain pending external evidence. No production
build, Firebase change/deploy, Vercel deploy, dependency change, schema change,
or starter-duration change was made.
