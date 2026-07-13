# Aidbase Competitor Response — Cross-Surface Validation

> **Status:** LOCAL SOURCE VALIDATION PASSED — QA deploy blocked; not production certification
> **Last Updated:** 2026-07-11
> **Product:** Answerlattice (`AL`)
> **Scope:** Aidbase market fit, governed retrieval, cache freshness, onboarding, public website, mobile behavior, KB publishing, docs, and deployment evidence

---

## Verdict

Aidbase is a broad, low-friction support suite. Answerlattice should not copy its unified inbox, chatbot-count packaging, agent-routing breadth, model-choice positioning, or helpdesk center of gravity. The validated response is to make Answerlattice easier to understand and buy while strengthening the category difference: approved, scoped product truth is authoritative; unsafe or stale truth fails closed; fallback remains visibly subordinate and reviewable.

The point-in-time competitor study used Aidbase's public [homepage](https://www.aidbase.ai/), [pricing](https://www.aidbase.ai/pricing), [security page](https://www.aidbase.ai/security), [DPA](https://www.aidbase.ai/dpa), and [documentation](https://docs.aidbase.ai/). Competitor prices, packaging, and claims can change and must be rechecked before future sales use.

## Requirement-to-Source Matrix

| Requirement | Implemented source | Cross-check result |
| --- | --- | --- |
| Preserve the governed-answer category | `__docs__/answerlattice/doctrine/01-core-doctrine.md`, `02-non-goals-charter.md`, `self-sellable-product-strategy.md` | No unified inbox/helpdesk expansion was added. |
| Make the difference visible without sign-in | `src/app/sites/answerlattice/demo/AnswerlatticePublicDemo.tsx` | Six deterministic stages show conflict, proposal, approval, release drift, safe fallback, correction, and audit evidence without Firebase or AI calls. |
| Publish buyer-readable trust facts | `src/app/sites/answerlattice/trust/page.tsx` | Provider/retention/runtime facts are separated from pending certifications, DPA/residency commitments, deletion claims, and production deployment evidence. |
| Carry public pricing into paid setup | `pricing/page.tsx`, `get-started/page.tsx`, `OnboardingForm.tsx`, `/api/answerlattice/onboard` | Starter/Growth/Studio and INR/USD survive the URL, browser, request, server validation, and returned billing acknowledgement. The API accepts monthly setup only. |
| Make setup retries safe | `onboardingProvisioning.ts`, `onboardingProvisioningServer.ts`, `/api/answerlattice/onboard` | Fingerprinted attempts, bounded provider recovery, atomic finalization, payment-pending recovery, and exact Answerlattice ownership checks prevent cross-attempt/product cleanup. |
| Prevent checkout-link injection | `src/lib/razorpay/checkoutUrl.ts`, onboarding API and browser form | Only credential-free HTTPS URLs on the exact `rzp.io` host and standard port are admitted; unsafe links become unavailable. |
| Enforce canonical scope | `src/lib/answerlattice/canonicalRetrieval.ts` | Plan, role, and product state are eligibility filters, not score bonuses. Missing and mismatched scope fail closed. |
| Stop unsafe fallthrough | `src/lib/search/searchCore.ts`, `answerTestServer.ts`, public answers API | Review-required, missing-scope, and out-of-scope canonical outcomes return fixed governed responses before FAQ, embeddings, or RAG. |
| Keep direct truth authoritative | `src/lib/answerlattice/canonicalRetrieval.ts` | A directly matched drifted/review answer cannot be bypassed by a weaker graph-neighbor answer. Product and tenant/store ownership are rechecked. |
| Prevent old fallback cache from bypassing truth | `instantCache.ts`, `cacheFreshness.ts`, `searchCore.ts` | `canon:v2` partitions plan/role/state; `rag-v4` includes canonical source version; non-canonical rows yield when canonical truth changes. |
| Keep proposal retries idempotent | `src/database/answerlattice/canonicalAnswers.ts` | Ambiguous browser retries reuse one request ID for the same stable payload until acknowledged success. |
| Harden publish/embed lifecycle | `functions-answerlattice/src/logic/*`, `functions-answerlattice/src/index.ts` | Start/retry/finalize triggers, deterministic tasks, typed embedding leases, final-attempt settlement, and article-scoped FAQ IDs are source-gated. |
| Maintain narrow-screen usability | public Demo, Pricing, Get Started, Header, Trust components | The 390px demo min-content overflow is removed and primary public actions meet the 44px target. |

## Security, Isolation, Cost, and Failure Modes

- Canonical reads remain `AL` product and tenant/store scoped; restricted scope is evaluated after version eligibility and before answer ranking.
- Governed safe responses are non-cacheable and use fixed user copy. They do not expose internal mismatch details or invoke an AI provider.
- Onboarding admission remains authenticated, byte-capped, Zod-validated, and rate-limited before provider work. Compensation is limited to the same product, attempt, fingerprint, tenant, and store.
- The public governance demo and Trust page are static/server-rendered website surfaces. They add no Firestore read, write, listener, Functions call, or AI operation.
- Cache/source-version changes reuse existing Redis and compact manifest contracts; no new Firestore collection, scheduled function, or dependency was added.
- The separate KB lifecycle reuses the current `kb_generation_jobs`, `kb_articles`, `kb_categories`, FAQ, Cloud Task, and embedding accounting paths.

## Cross-Surface Evidence

### Public desktop and mobile

- `/demo`: all six stages were exercised in sequence; reset and stage controls worked; the 390×844 viewport had no document-level horizontal overflow after the `min-w-0` fix.
- `/pricing`: current plan cards carry plan/currency selection into Get Started; secondary actions use 44px minimum targets.
- `/get-started`: unauthenticated selection state, Google sign-in, preparation fields, and product return action were checked at mobile width.
- `/trust`: current QA/production boundary, security review CTA, privacy/security links, narrow-screen layout, and primary touch targets were checked.
- Header logo actions are 44px on desktop and drawer variants. Ordinary inline/footer text links remain text links rather than primary controls.

### Runtime and infrastructure

- Public API context now accepts sanitized product `state` in addition to plan/role context.
- Search-history and instant-cache contracts include the canonical source version needed to invalidate fallback answers when governed truth changes.
- The KB worker distinguishes a live embedding lease through a typed error, avoids raw provider/error payload persistence, and settles terminal failure only on permanent/final attempts.
- Generated FAQ document identity is derived from the article and index, not model output.

## Verification Ledger

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit --incremental false --pretty false` | Passed on the current root worktree. |
| Targeted ESLint for the changed Answerlattice retrieval, onboarding, public UI, DAL, and verifier files | Passed with no findings. |
| `npm run verify:answerlattice-runtime-truth` | Passed, including KB article-ID, onboarding provisioning, canonical-scope, governance, founder-control, daily-brief, and recently-viewed contracts. |
| `npm --prefix functions-answerlattice run build` | Passed. The package does not define a separate lint script; its strict TypeScript build is the maintained package gate. |
| `npm run test:answerlattice-governance:rules` | Passed against `firestore-answerlattice.rules`; expected denial logs prove browser canonical/proposal-decision writes remain blocked. |
| `npm run test:answerlattice-governance:shared-rules` | Passed against the shared `firestore.rules` recovery target. |
| `npm run docs:check-links` | Passed: 2,363 files, 4,229 internal links, zero broken links, zero naming violations. |
| `npm run verify:dependency-freeze` | Passed; no dependency version changed. |
| In-app browser QA | Passed at 390×844 and 1280×720. All six demo transitions worked, document width matched viewport, primary actions met their final rendered target, Trust facts matched source, and the console had no runtime errors. Development Fast Refresh warnings reflected the live edit loop only. |
| Scoped Answerlattice QA Functions deploy | Predeploy build passed, then Cloud Resource Manager returned HTTP 403 `The caller does not have permission` for `answerlattice-qa` before upload. No Function changed in QA. |

A local pass is source evidence only; it does not replace provider smoke, authenticated target testing, target deploy evidence, or production-host certification.

## Release Boundary

- No Vercel build or deployment is authorized by this cross-check.
- Retry the exact scoped Functions deployment only after the active identity receives `answerlattice-qa` project access. The failed command targeted `startGeneration`, `retryGeneration`, `finalizePublish`, `embedArticleWorker`, `regenerateEmbedding`, and `publishApprovedJobFn` in the `answerlattice` codebase; its predeploy build passed and no upload occurred.
- Production Firebase/Vercel deployment, provider-backed paid-onboarding smoke, authenticated workspace proof, and production-host smoke remain release gates.
