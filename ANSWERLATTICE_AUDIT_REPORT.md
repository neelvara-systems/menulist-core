# Answerlattice Audit Report

Date: 2026-06-20
Scope: Answerlattice product runtime inside `menulist-core`

## 1. Executive Summary

### Current confidence level

High confidence for source-level Answerlattice runtime correctness after static audit, targeted invariant verification, TypeScript, lint, Answerlattice functions build, and full Next production build.

Medium confidence for live production behavior because this audit did not exercise real Firebase projects, Storage buckets, Vercel custom-domain provisioning, SMTP/Slack/Razorpay/Gemini/OpenAI credentials, or production data migrations.

### Major risks found

- Public/widget API key confusion: widget endpoints and MCP session issuance accepted Answerlattice-shaped credentials without strict product/purpose separation in every route.
- Hosted Help registry truth risk: public domain resolution could treat missing `pId` as Answerlattice, and removed-domain cleanup could delete a registry document without proving the document still belonged to the current workspace.
- Knowledge Intake partial publish risk: if accepted items were partially written and a later item failed, the job could be marked failed while public cache/context updates were incomplete or ambiguous.
- Predictive trigger staleness: owner-side trigger CRUD wrote trigger documents but the public runtime reads the `platformSummary/predictiveTriggers_{tId}_{sId}` summary.
- Article entity extraction tenant risk: the Admin SDK extraction route accepted an article id/content payload before proving the article belonged to the authenticated Answerlattice workspace.
- Compiled context bundle metadata risk: bundle source loading read the store profile by `sId` and could publish store metadata into bundles without an explicit tenant match check.
- Mutation proposal approval risk: approving a draft as canonical needed explicit proposal and related-entity `tId/sId` guards at the DAL boundary.
- Hosted Help article URL mismatch: stored article URLs with `/help`, `/docs`, or `/articles` prefixes did not reliably resolve to the dynamic hosted-help article route.

### Major fixes applied

- Added `npm run verify:answerlattice-runtime-truth` and a static runtime-truth verifier.
- Enforced Answerlattice public API vs widget key purpose separation across public v1 APIs, widget search/config/feedback, predictive help, and MCP sessions.
- Hardened Hosted Help registry product/scope checks and scoped removed-domain deletes.
- Made Knowledge Intake partial publish recovery retryable, cache-aware, and counter-aware.
- Rebuilt predictive-trigger public summaries after trigger create/update/activate/disable/delete.
- Scoped article entity extraction to the persisted article's `tId/sId` before using content or writing `entityIds`.
- Added tenant guard for store metadata used in compiled context bundles.
- Added mutation proposal and related entity scope checks before canonical approval.
- Normalized Hosted Help article slugs and links for prefixed stored URLs.
- Set Answerlattice public contact records to use the canonical `PRODUCT_IDS.ANSWERLATTICE` product id.

### Remaining risks

- Live Firebase rules/index deploy state was not verified against the production project.
- Real public API/widget/MCP/hosted-help behavior was not exercised with production credentials or custom domains.
- Provider-backed flows were source-verified only: Gemini/OpenAI, SMTP, Slack webhooks, Razorpay, Vercel domain provisioning, Cloud Tasks.
- The repository had many pre-existing unrelated modified/untracked files; this audit did not attempt to normalize the entire dirty worktree.

## 2. System Map

### Main entities

- Workspace identity: `tenants`, `stores`, Answerlattice `productAccounts`, `pId: "AL"`, `tId`, `sId`.
- Access control: users, staff roles, `answerlatticeRoles`, session product scope, custom claims.
- Knowledge truth: `kb_articles`, `kb_categories`, `answerlattice_faqs`, `answerlattice_entities`, `answerlattice_entityRelations`, `answerlattice_canonicalAnswers`, mutation proposals.
- Runtime context: product surfaces, compiled source versions, compiled bundle manifests, public/private context bundle storage, predictive trigger summaries.
- Public/runtime surfaces: public v1 answers/entities/signals, widget search/config/feedback, predictive help, hosted help pages, public content cache, MCP session/runtime.
- Operational records: search history, feedback signals, AI operations, support credits/subscriptions, intake jobs/sources/review items, contact enquiries, integration delivery logs, scheduler states.

### Main data flows

- Onboarding: authenticated user -> `/api/answerlattice/onboard` -> tenant/store/user/subscription/widget/bootstrap docs -> compiled context control plane.
- Workspace profile: dashboard form -> `/api/answerlattice/workspace-profile` -> store profile -> tenant summary/context source invalidation.
- Knowledge editing: DAL/API -> Firestore scoped docs -> cache version/source invalidation -> help center/hosted help/widget/public APIs.
- Knowledge Intake: job/source/review -> owner publish -> KB/FAQ/surface/proposal writes -> public cache/context invalidation.
- Retrieval: scoped request -> canonical retrieval first -> FAQ retrieval -> RAG only with valid references -> search-history/AI accounting.
- Widget runtime: widget key -> origin/scope/purpose validation -> search/config/feedback/predictive routes -> public answer outputs and feedback rows.
- Public API: public API key -> product/purpose/scope validation -> answers/entities/signals endpoints.
- Hosted Help: host/domain -> registry -> scoped public content cache -> sanitized customer-visible pages, robots, sitemap.
- Compiled bundles/MCP: source version change -> bundle builder -> public immutable bundle + private tenant/store bundle -> public bundle route/MCP runtime.

### Source-of-truth decisions

- Answerlattice Firestore/Admin helpers are the canonical database boundary for Answerlattice runtime data.
- `pId/tId/sId` are required product and tenant boundaries; public/runtime output must be derived from AL-scoped records.
- Public APIs and widgets share key infrastructure but must remain separated by credential source, product id, purpose, and scopes.
- Public customer-visible help content comes from published/active KB, FAQ, changelog, canonical, surface, and bundle read models, not from drafts or operational logs.
- `platformSummary` remains the compact summary/read-model layer for tenant registry, predictive trigger summaries, context source versions, bundle manifests, activation/readiness, and integration health.

### Public/customer-facing outputs

- `/answerlattice-hosted-help/[[...segments]]`, hosted-help `robots.txt`, hosted-help `sitemap.xml`.
- `/api/answerlattice/public/v1/answers`, `/entities`, `/signals`.
- `/api/widget/search`, `/api/widget/config`, `/api/widget/feedback`.
- `/api/answerlattice/predictive-help`.
- Public context bundle route `/api/answerlattice/bundles/public/[...path]`.
- Widget script routes `/widget/v1/answerlattice-widget.js`, `/widget/latest/answerlattice-widget.js`.
- Answerlattice public website routes under `/sites/answerlattice`.

## 3. Flow-by-Flow Audit

### Product boundary and Firebase isolation

- Files inspected: `src/lib/firebase/answerlatticeConfig.ts`, `answerlatticeFirebaseClient.ts`, `answerlatticeFirebaseAdmin.ts`, `firebase-answerlattice.json`, `firestore-answerlattice.rules`, `functions-answerlattice/package.json`.
- Data flow traced: app/runtime -> dedicated Answerlattice Firebase helpers -> Answerlattice Firestore/Storage/Functions targets.
- Issues found: no code change needed in helpers; verifier now locks in dedicated app names, env names, database id selection, and fail-closed behavior.
- Fixes applied: added static verifier coverage.
- Tests/checks run: verifier, typecheck, lint, functions build, full Next build.
- Remaining concerns: live Firebase target access/deploy state was not verified.

### Onboarding and workspace profile

- Files inspected: `/api/answerlattice/onboard`, `/api/answerlattice/workspace-profile`, `tenantSummaryAdmin`, `compiledSourceVersionsAdmin`, product surface bootstrap.
- Data flow traced: user -> onboarding request -> tenant/store/user/subscription/widget key/product surfaces/context summaries; workspace profile -> store doc -> tenant summary/source version.
- Issues found: no material new bug in this pass.
- Fixes applied: none directly.
- Tests/checks run: static route tracing, typecheck/build.
- Remaining concerns: Razorpay/provider behavior not live-tested.

### Auth, ownership, staff, roles

- Files inspected: `sessionScope.ts`, `accessControl.ts`, `/api/answerlattice/access`, `/staff`, `/staff/roles`, `/staff/password-reset`, `/staff/force-signout`, `staffAccessServer.ts`, Firestore rules.
- Data flow traced: NextAuth session/product account -> scoped access context -> role permission -> Admin/client write -> custom claims/default auth product account sync.
- Issues found: no confirmed code change needed after exact source re-read; staff mutations check tenant/store, self-removal, last-owner, role assignment, and token revocation paths.
- Fixes applied: verifier indirectly covers role/access boundaries through route/build checks.
- Tests/checks run: static route tracing, typecheck/build.
- Remaining concerns: Firebase Auth custom claim effects were not live-tested.

### Knowledge base, articles, FAQs, translations, entity extraction

- Files inspected: `src/database/knowledgeBase/articles.ts`, `src/database/answerlattice/faqs.ts`, `/api/answerlattice/faqs/generate-from-article`, `/api/answerlattice/translate`, `/api/answerlattice/articles/extract-entities`, `entityExtraction.ts`, `publicContentCache.ts`.
- Data flow traced: article/FAQ authoring -> scoped Firestore writes -> cache/version/source invalidation -> help center/hosted help/widget/search.
- Issues found: article entity extraction could update `kb_articles/{articleId}` through Admin SDK without first proving the persisted article belongs to the session workspace.
- Fixes applied: extraction route now loads the persisted article, verifies `tId/sId`, prefers persisted content/title/category, logs scope mismatch, and writes back through the scoped ref.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: Gemini/provider-backed FAQ/entity/translation calls were not live-tested.

### Entities, canonical answers, mutation proposals

- Files inspected: `canonicalAnswers.ts`, `entities.ts`, `entityCandidates.ts`, `canonicalRetrieval.ts`, `entityLookup.ts`, `mutationProposals.ts`, `/mutation-proposals/regenerate-draft`.
- Data flow traced: entity/canonical/proposal DAL -> scoped Firestore docs -> retrieval/cache/context.
- Issues found: canonical approval from mutation proposal needed explicit proposal and related-entity scope checks in the approval helper.
- Fixes applied: `approveDraftAsCanonicalAnswer` now rejects if proposal or entity `tId/sId` does not match the requested scope.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: entity candidate promotion uses client DAL and Firestore rules; no live rules test was run.

### Search, Help Center, retrieval

- Files inspected: `searchCore.ts`, `canonicalRetrieval.ts`, `faqRetrieval.ts`, `entityLookup.ts`, `/api/helpCenter/search-kb`, public content client/cache.
- Data flow traced: help center/widget query -> scoped session/key -> canonical retrieval -> FAQ retrieval -> RAG with valid references -> response/search history/accounting.
- Issues found: no new fix required; canonical-first and reference-block behavior are present.
- Fixes applied: verifier coverage for scoped search, canonical, FAQ, entity, and reference guards.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: no live vector search/provider run.

### Widget, public API, predictive help, MCP

- Files inspected: `/api/widget/search`, `/config`, `/feedback`, `/api/answerlattice/predictive-help`, `/public/v1/*`, `/mcp/session`, `/mcp`, `publicApi.ts`, `publicApi/auth.ts`, `widgetKeyManager.ts`, `mcpSession.ts`.
- Data flow traced: key -> credential source/product/purpose/scopes/origin -> route -> scoped search/config/feedback/predictive/MCP output.
- Issues found: public API, widget, and MCP credential purposes needed stricter separation.
- Fixes applied: AL public APIs now reject non-AL product ids and reject non-public-api purpose when present; widget routes and predictive help require `answerlattice_widget`; MCP session requires AL product and public API purpose with read/write scopes.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: no real key/origin browser test.

### Hosted Help and public content

- Files inspected: `hostedHelpServer.ts`, `/api/answerlattice/hosted-help-settings`, hosted help page/robots/sitemap, `HostedHelpClient`, `publicContentCache.ts`, `publicRichText.ts`.
- Data flow traced: domain settings -> registry -> custom-domain route -> cached public KB/FAQ/changelog -> sanitized render.
- Issues found: registry lookup defaulted missing product ids to AL; removed-domain deletes were not scoped tightly enough; stored article URLs with route prefixes could miss the hosted-help dynamic route.
- Fixes applied: registry now fails closed on missing/wrong `pId`; removed-domain deletes require matching `tId/sId`; article route/href normalization strips `/help`, `/docs`, `/articles` prefixes and encodes slugs.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: Vercel custom-domain provisioning and DNS were not live-tested.

### Knowledge Intake and import/publish

- Files inspected: `knowledgeIntake.ts`, `knowledgeIntakeApi.ts`, `/knowledge-intake/*`, intake usage ledger, data retention docs/memory.
- Data flow traced: job/source/media/discovery -> review items -> publish accepted items -> KB/FAQ/surface/proposal writes -> cache/context/source invalidation.
- Issues found: partial publish failure could leave owner-visible job state and public cache/context updates inconsistent.
- Fixes applied: partial publish recovery refreshes counters, revalidates affected public cache segments, updates summary when any items were published, and returns the job to review for retry instead of marking all progress failed.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: media extraction/provider calls and live credit reservations were not executed.

### Predictive triggers and compiled context bundles

- Files inspected: `predictiveTriggers.ts`, `predictiveEngine.ts`, `contextBundleBuilderServer.ts`, compiled context/source version helpers, bundle public route.
- Data flow traced: owner trigger CRUD -> trigger docs/summary -> public predictive runtime; source versions -> bundle builder -> public/private storage bundles.
- Issues found: predictive summary was stale after owner-side CRUD; bundle builder read store metadata by `sId` without explicit tenant match.
- Fixes applied: trigger CRUD now rebuilds summary and marks predictive source stale; bundle builder now refuses mismatched store docs when preparing product metadata.
- Tests/checks run: verifier, typecheck, lint, build.
- Remaining concerns: Storage upload/read and CDN cache behavior were not live-tested.

### Billing, AI accounting, support credits

- Files inspected: `aiAccounting.ts`, `intakeUsageLedger.ts`, `billing.ts`, `/api/answerlattice/ai-operations`, onboarding subscription creation.
- Data flow traced: operation -> capacity check/reservation -> subscription/store summary update -> ledger/operation log -> owner billing view.
- Issues found: no new fix required in this pass; scope checks exist before consuming credits and owner route redacts platform-only cost fields.
- Fixes applied: none directly.
- Tests/checks run: static inspection, typecheck/build.
- Remaining concerns: real Razorpay/webhook/payment state not exercised.

### Integrations, notifications, operations, background jobs

- Files inspected: `/integrations`, `/integrations/test`, `/notifications/test`, `/operations/status`, `functions-answerlattice`, retention/nightly docs and scripts.
- Data flow traced: scoped owner config -> platform summary/integration events -> delivery logs/notifications; scheduler state -> owner operations status.
- Issues found: no new fix required in this pass.
- Fixes applied: none directly.
- Tests/checks run: functions build, root build.
- Remaining concerns: SMTP/Slack delivery and scheduler execution were not live-tested. No Firebase function/rule/index deploy was run because this audit did not intentionally change Firebase infrastructure files.

### Website, docs, mobile/dashboard surfaces

- Files inspected: Answerlattice dashboard route build output, public website routes, hosted help client, dashboard layout/access guards, existing Answerlattice docs.
- Data flow traced: route/access guard -> dashboard/public website render -> API/DAL reads.
- Issues found: no buyer-facing capability change requiring website copy updates.
- Fixes applied: public API doc updated for credential purpose requirement.
- Tests/checks run: full build covered Answerlattice dashboard and website routes.
- Remaining concerns: no browser visual/mobile QA was run in this pass.

## 4. Fix Log

- Added `scripts/verification/verify-answerlattice-runtime-truth.js`.
  - Why: keep high-risk runtime invariants executable.
  - Protects: Firebase separation, auth/key boundaries, public cache, hosted help, predictive summary, mutation proposal scope, bundle scope, Firestore boundary.

- Added `verify:answerlattice-runtime-truth` to `package.json`.
  - Why: make the audit verifier a repeatable project command.
  - Protects: regression detection for Answerlattice runtime truth.

- Hardened `src/lib/answerlattice/publicApi.ts`.
  - Why: public API keys must not be accepted for the wrong product or purpose.
  - Protects: public API/widget/MCP credential separation.

- Hardened widget and predictive routes.
  - Why: widget runtime must only accept AL widget-purpose credentials.
  - Protects: customer-facing widget output and feedback from key confusion.

- Hardened `src/app/api/answerlattice/mcp/session/route.ts`.
  - Why: MCP sessions should be issued only from AL public API credentials with required scopes.
  - Protects: private bundle/tool access boundary.

- Hardened Hosted Help registry reads/deletes.
  - Why: public domain registry records are customer-visible routing truth.
  - Protects: custom-domain ownership and tenant isolation.

- Fixed Hosted Help article slug normalization.
  - Why: stored article URLs and rendered links used different path assumptions.
  - Protects: customer-visible hosted-help article routing.

- Hardened Knowledge Intake partial publish recovery.
  - Why: partial writes must not silently misrepresent what was published.
  - Protects: public KB/FAQ/surface cache truth and owner retry state.

- Added predictive trigger summary rebuilds after CRUD.
  - Why: public predictive help reads the summary, not individual trigger docs.
  - Protects: latest intended predictive help behavior.

- Added mutation proposal/entity scope guards before canonical approval.
  - Why: canonical answers must not be created from another workspace's proposal/entity.
  - Protects: canonical answer tenant isolation.

- Added persisted article `tId/sId` guard to entity extraction.
  - Why: Admin SDK route bypasses Firestore rules and must prove article ownership itself.
  - Protects: KB article/entity metadata tenant isolation.

- Added store tenant guard in context bundle source loading.
  - Why: public/private bundles expose product metadata from the store doc.
  - Protects: customer-visible bundle metadata correctness.

- Updated public API docs.
  - Why: documented credential purpose expectations must match runtime.
  - Protects: integrator contract clarity.

## 5. Verification Log

- `npm run verify:answerlattice-runtime-truth`
  - Result: passed.
  - Notes: checks Answerlattice runtime invariants across Firebase helpers, public APIs, widget/MCP auth, retrieval scoping, hosted help, Knowledge Intake recovery, predictive summaries, bundle scope, mutation proposal scope, and Firestore rules.

- `npx tsc --noEmit --incremental false`
  - Result: passed.

- `npm run lint`
  - Result: passed with no ESLint warnings or errors.

- `npm --prefix functions-answerlattice run build`
  - Result: passed.
  - Notes: this only built the dedicated Answerlattice functions package locally; no deploy was run.

- `npm run build`
  - Result: passed.
  - Notes: build generated 367 static pages and listed all Answerlattice app/API routes. A Cloud Tasks warning appeared for existing batch image generation environment config (`hasWorkerSecret: false`), not an Answerlattice build failure.

- Root test suite
  - Result: not run.
  - Reason: `package.json` does not define a root `test` script. Targeted runtime verifier, TypeScript, lint, functions build, and production build were run instead.

### Manual/static checks performed

- Inspected route protection for `/api/answerlattice/*`, `/api/widget/*`, `/api/helpCenter/search-kb`, hosted-help routes, and public v1 endpoints.
- Inspected Firestore rules for default deny and AL-scoped client read/write helpers.
- Traced Admin SDK write paths for hosted help, intake, article extraction, translation, FAQ generation, onboarding, workspace profile, staff access, billing/accounting, and context bundles.
- Traced public customer-visible output sources: hosted help, public content cache, public API, widget, predictive help, context bundles.
- Re-audited patched flows after fixes through the new verifier and production build.

## 6. Final Status

### Now verified

- Answerlattice source-level product isolation through dedicated Firebase helpers and `pId/tId/sId` scope patterns.
- Public API, widget, predictive help, and MCP key separation by source/product/purpose/scope.
- Hosted Help registry routing and article URL normalization.
- Public content cache filters for published/active customer-visible content.
- Knowledge Intake publish failure recovery and cache invalidation.
- Predictive trigger public summary freshness after owner CRUD.
- Mutation proposal approval and article entity extraction tenant guards.
- Compiled context bundle store metadata tenant guard.
- Local typecheck, lint, Answerlattice functions build, and full Next build.

### Could not be verified locally

- Production Firebase rules/indexes/functions deployment state and permissions.
- Live Firestore/Storage data shape against production documents.
- Vercel custom-domain provisioning and DNS.
- SMTP, Slack, Razorpay, Gemini/OpenAI, Cloud Tasks, and real email/notification/provider behavior.
- Browser-level visual QA for dashboard/mobile/hosted-help pages.

### Highest-risk production monitoring

- Public API/widget auth failures by reason: wrong product, wrong purpose, missing scope, bad origin.
- Hosted Help registry conflicts, mismatched-domain delete skips, and domain resolution misses.
- Knowledge Intake publish failures after partial success.
- Predictive trigger summary rebuild failures or stale compiled source versions.
- Context bundle build failures, stale manifests, and storage upload/read errors.
- Support credit reservation/refund mismatches and low-credit denial rates.
- Search responses blocked for missing valid references.
- Provider rate limits/fail-closed paths for FAQ generation, translation, entity extraction, and intake media processing.
