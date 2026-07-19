# First Trusted Answers Implementation

**Updated:** 2026-07-19

## Architecture

```text
Launch route
  -> bounded Knowledge Intake job selection
  -> generation-input-hash cache check
  -> one metered product-pack generation
  -> existing Intake review drafts
  -> Answer Tests summary
  -> canonical-first deterministic run
  -> Governance review for missing or wrong truth
  -> Install Center verification
  -> widget explicit outcome feedback
  -> existing bounded nightly coverage/trust aggregation
  -> Trust Metrics and Daily Brief
```

## Runtime Files

| Area | Runtime owner |
| --- | --- |
| Starter cases | `src/lib/answerlattice/answerTestStarterPack.ts` |
| Product-pack contracts | `src/lib/answerlattice/firstTrustedAnswerPackContracts.ts` |
| Product-pack generation | `src/lib/answerlattice/firstTrustedAnswerPackServer.ts` |
| Product-pack API | `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/launch-pack/route.ts` |
| Launch UI | `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx` |
| Launch route | `src/app/(answerlattice)/answerlattice/launch-answers/page.tsx` |
| Navigation | `src/constants/answerlattice/routes.ts`, `src/constants/answerlattice/navigations.ts` |
| Existing test persistence | `src/app/api/answerlattice/answer-tests/route.ts` |
| Launch identity and browser contracts | `src/lib/answerlattice/answerTestStarterPack.ts`, `src/lib/answerlattice/answerTestContracts.ts`, `src/lib/answerlattice/activationAnswerTestSummary.ts` |
| Widget outcome | `src/app/widget/[apiKey]/WidgetClient.tsx`, `src/app/api/widget/feedback/route.ts` |
| Outcome aggregation | `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` |
| Trust UI | `src/components/templates/answerlattice/governance/FounderTrustDashboard.tsx` |
| Proof registry | `src/data/answerlattice/proofEvidence.ts` |
| Builder packages | `src/lib/answerlattice/preOnboardingPrompt.ts`, public Markdown routes |
| Daily Brief handoff | `src/lib/answerlattice/ownerSupportAssistant.ts`, Support Board UI |

## Storage

No new collection is introduced.

- Test cases and runs remain in `platformSummary/answerTests_{tId}_{sId}`.
- Product-specific proposed answers remain draft review items in `answerlattice_intake_review_items` and carry bounded source, applicability, missing-evidence, and risk metadata.
- Missing-evidence text is stored only in launch metadata. It cannot satisfy the canonical-proposal answer gate or become a proposal body; an owner must add an actual supported answer before acceptance and publishing.
- Model output that contains answer text while declaring `no_answer` or `escalation` is treated as contradictory: the text is discarded, the gap remains visible, and the launch item cannot publish as a canonical proposal until approved source evidence produces a refreshed canonical candidate.
- The selected intake job stores a compact `launchPackRun` lease/cache record keyed by a hash of the exact prompt-bounded source packet and intake context.
- Paid generation uses the existing intake usage ledger and AI operation log. A failed generation is refunded through the existing settlement path.
- Widget outcomes remain on the existing tenant/store-scoped AI search-history record.
- Trust outcome counts remain in `platformSummary/trustMetrics_{tId}_{sId}`.
- Prepared review cards are written only after owner confirmation to the existing Support Board collection.

## Compatibility

- Existing `isGood` feedback remains supported.
- `resolutionOutcome` is additive and optional for legacy records.
- Existing Trust Metrics documents without `confirmedResolution` render safely.
- The standard Answer Tests route keeps its current regression-suite experience.
- The launch route reuses the same component with launch guidance enabled.
- The product-specific pack requires both Knowledge and Governance permissions because it writes Intake review drafts and then seeds Answer Tests.
- Repeated requests for unchanged prompt inputs reuse the completed pack; audience or included source/context changes create a new pack, while sources excluded by the prompt budget do not trigger needless provider work. Concurrent generation is rejected by a short job lease.
- A changed generation-input hash creates a new traceable draft pack without overwriting accepted or published history. The existing 120-review-item job cap remains the hard bound.
- Product-pack Answer Test cases carry bounded generation-input-hash and review-item provenance. Cached reuse preserves owner-edited cases; changed included sources or launch context require explicit refresh confirmation and replace only the ten product-launch slots.
- The launch-pack route applies the shared SAFE_MODE gate after strict body validation and before pack generation. The server generation boundary separately validates the bounded request ID before job, provider, or usage work.
- Cached product packs are reusable only when exact positions `1` through `10`, deterministic review-item IDs, source hash, and review state remain coherent.
- Launch identity uses exact registered generic or product IDs. Product mode requires one common generation-input hash and unique review-item provenance across the available registered slots; it never counts a mixed generic/product set.
- The launch-only action resolves the exact active First 10 IDs and sends those IDs explicitly. The run route rejects missing, changed, or inactive selections instead of silently executing a subset.
- New Answer Test runs retain a six-counter governed-source snapshot. Activation accepts launch proof only when the retained run is newer than every current First 10 case and its snapshot matches current canonical, KB/FAQ, docs-navigation, entity, relation, and release truth.
- Legacy runs without source-version evidence remain reviewable but require one fresh owner-triggered run. Source-version counters stay server-side; the Activation client receives only stale/proof state.
- First 10 creation and edit timestamps are authored in the save transaction. A client cannot submit a stale or future timestamp to keep changed launch questions covered by old proof.
- The launch screen presents server-derived **Current First 10 proof** separately from the historical **Latest run proof**. Opening, saving, or completing a run refreshes that current projection without exposing source-version counters.
- Answer Tests API responses use strict, private, no-store projections. Browser summaries exclude active reservations; browser runs exclude request fingerprints and governed-source counters; the client validates exact scope, unique IDs, bounded fields, and derived run totals before replacing state.
- Empty explicit-outcome samples render as unavailable instead of a misleading 0%.
- The bounded sample reports only observed same-session recontacts; it does not claim that the absence of a recontact proves durable resolution.
- The nightly sample is ordered newest-first and remains capped at 500 rows.

## External Distribution Assets

The public Founder Launch Kit and tool-specific Markdown packages are static. Studio recruitment and customer interviews remain owner-operated. Their results must be recorded as verified evidence before website claims change.

## Verification Evidence

Initial feature verification on 2026-07-16:

- root TypeScript check passed;
- Answerlattice Functions TypeScript build passed;
- full Answerlattice runtime-truth verifier passed, including shared/separate Firestore and Storage emulator suites;
- Knowledge Intake emulator passed product-pack generation, exact ten-draft settlement, one-credit charging, unchanged-input reuse, launch-context invalidation, tenant isolation, malformed evidence refund, mid-operation subscription-state refund, and concurrent lease rejection;
- founder support controls, widget feedback, Daily Brief, and public-content boundary verifiers passed;
- targeted Next.js lint passed for the changed application files;
- local desktop/mobile browser checks at 1280px and 390px found no horizontal overflow on the homepage or Founder Launch Kit, and no browser console error;
- all five tool-package Markdown routes returned HTTP 200;
- proof rendering remained example-only while the verified registry was empty;
- documentation link validation reported zero broken links;
- scoped `git diff --check` passed for the First Trusted Answers implementation and docs.

Fresh proof-lifecycle cross-check on 2026-07-17:

- root TypeScript and targeted ESLint passed;
- focused Founder Support Controls and First Trusted Answers contracts passed, including source-change, case-edit, legacy-run, malformed-version, and forged-timestamp invalidation;
- the full Answerlattice runtime-truth suite passed, including shared/separate Firestore and Storage rule emulators;
- Answerlattice Functions build, dependency freeze, final readiness source verifier, repository-wide `git diff --check`, and documentation link validation passed;
- documentation link validation retained 27 unrelated video filename naming warnings and zero broken links.

Final adversarial cross-check on 2026-07-17:

- fixed a launch-pack boundary where generated missing-evidence text could occupy the generic review `body` field and be mistaken for a supported canonical answer;
- contradictory model output that supplies answer text for `no_answer` or `escalation` is now discarded and blocked from canonical-proposal acceptance and publishing;
- the Knowledge Intake emulator now explicitly clears `GOOGLE_APPLICATION_CREDENTIALS`, preventing a developer-specific credential path from breaking isolated tests;
- focused contracts, Knowledge Intake Firestore emulator, full Answerlattice runtime-truth suite, root TypeScript, targeted ESLint, Answerlattice Functions build, production Next.js build, final-readiness verifier, and `git diff --check` passed.

Feature 26 flow audit on 2026-07-19:

- exact product slot membership replaced prefix-based launch identity;
- coherent-set selection now prevents generic/product mixing, mismatched generation snapshots, duplicate review provenance, and inactive cases from producing complete launch coverage;
- the launch screen now runs the exact active First 10 set, while the run API rejects a changed or inactive requested case;
- Activation rejects malformed case timestamps and future-dated runs, and derives critical failures conservatively from retained and current case evidence;
- Answer Tests management, run, release-check, and launch-pack responses use private no-store and `nosniff` headers;
- strict browser projections strip reservations, request fingerprints, and source-version counters, then validate scope and derived run consistency;
- paid pack generation now respects shared SAFE_MODE before provider work, direct server calls reject malformed request IDs, and cached packs require every exact position `1` through `10`;
- Answerlattice and root TypeScript, focused ESLint, Feature 26 contract tests, runtime-truth verification, and `git diff --check` passed.

The original First Trusted Answers implementation includes the documented scoped search-history index and Answerlattice nightly outcome aggregation changes; those Firebase assets must be deployed through the normal Answerlattice Firebase release if they are not already present in the target project. This Feature 26 audit changes no Firestore rule, index, Storage rule, or Answerlattice Cloud Function. The app/API/public-copy changes still require the normal Vercel release and an authenticated QA smoke with a configured Gemini key and active Answerlattice subscription.
