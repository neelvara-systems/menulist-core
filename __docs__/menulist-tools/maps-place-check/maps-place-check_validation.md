# Maps Place Check - Validation

**Status:** PASS LOCALLY - DEPLOY BLOCKED BY IAM
**Date:** July 3, 2026

## Checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Backend-only callable exists | PASS | `functions/src/triggers/shared.ts:179` exports `mapsPlaceCheck` |
| Existing GenAI gateway is used | PASS | `functions/src/logic/mapsPlaceCheck.ts:253` calls `genAIClient.models.generateContent` |
| Google Maps tool is enabled | PASS | `functions/src/logic/mapsPlaceCheck.ts:260` passes `tools: [{ googleMaps: {} }]` |
| Pinned SDK shape checked | PASS WITH ENABLEMENT GATE | `@google/genai` is pinned at `1.16.0`, exposes `Tool.googleMaps` and `RetrievalConfig`, but does not expose `ai.interactions` |
| Firebase AI Logic Web SDK not added | PASS | Dependency freeze passed; root Firebase remains pinned separately |
| Feature flag defaults off in Functions | PASS | `functions/src/constants/features.ts:291` |
| Feature flag defaults off in client config | PASS | `src/config/features.ts:3084` |
| Auth and tenant/store access enforced | PASS | `functions/src/triggers/shared.ts:188` through `functions/src/triggers/shared.ts:189` |
| SAFE_MODE checked before provider call | PASS | `functions/src/triggers/shared.ts:195` through `functions/src/triggers/shared.ts:197` |
| Rate limiting checked before provider call | PASS | `functions/src/triggers/shared.ts:199` through `functions/src/triggers/shared.ts:207` |
| Non-English language codes rejected | PASS | `functions/src/logic/mapsPlaceCheck.ts:88` through `functions/src/logic/mapsPlaceCheck.ts:97` |
| Maps sources returned for attribution UI | PASS | `functions/src/logic/mapsPlaceCheck.ts:209` through `functions/src/logic/mapsPlaceCheck.ts:228` |
| No canonical Firestore write-back | PASS | `functions/src/logic/mapsPlaceCheck.ts:245` through `functions/src/logic/mapsPlaceCheck.ts:320` contains provider call and response mapping only |
| No raw provider response in callable output | PASS | `functions/src/logic/mapsPlaceCheck.ts` omits `rawText` from `MapsPlaceCheckResult` and returns only status, attribution, model, candidate, and source fields |
| Public Truth Tools boundary updated | PASS | `__docs__/menulist-tools/public-truth-tools/README.md` references Maps Place Check as a separate provider-backed prototype |

## Verification Commands

| Command | Result |
| --- | --- |
| `npm --prefix functions run build` | PASS |
| `npm run verify:public-truth-tools` | PASS |
| `npm run verify:dependency-freeze` | PASS |
| `npm run verify:ai-accounting` | PASS |
| `git diff --check -- [touched paths]` | PASS |
| `npx tsc --noEmit --incremental false --pretty false` | PASS |
| `npm run verify:functions-deploy-preflight` | Current retry prerequisite; rerun before any scoped deploy attempt |
| `firebase deploy --project menulist-qa --config firebase.json --only functions:mapsPlaceCheck --non-interactive` | Latest July 5 raw-provider-output retry completed predeploy lint/build, then failed before upload with Cloud Resource Manager HTTP 403 caller permission |

## Runtime Notes

- The callable is deployed only when Firebase Functions deployment succeeds.
- The July 3, 2026 deploy attempt did not reach deployment because the active caller lacks permission on `menulist-qa`; preserve it as historical blocker evidence only.
- The July 5, 2026 raw-provider-output boundary retry also completed predeploy lint/build and failed before upload with Cloud Resource Manager HTTP 403 caller permission for `menulist-qa`.
- Do not reuse the older command shape from that attempt.
- Current Maps Place Check retry evidence must start with `npm run verify:functions-deploy-preflight`, use the scoped `menulist-qa` command above, and record the exact target and reason in the production-readiness audit before deploy retry.
- Production deploys require QA evidence and explicit production deploy approval.
- The feature is off by default until `PUBLIC_TRUTH_MAPS_PLACE_CHECK_ENABLED=true` is set in the Functions runtime or the code flag is intentionally changed.
- Do not enable the feature until a real provider smoke test confirms Maps grounding works through the pinned `@google/genai` `1.16.0` `generateContent` path, or until a scoped SDK migration moves this callable to the currently documented Interactions API path.
- Any UI that displays generated Maps-grounded content must show Google Maps sources immediately after the generated content or within one user interaction.
- Any future canonical update must be a separate owner/admin confirmation path with public cache invalidation.

## Final Verdict

Maps Place Check is ready as a guarded backend prototype. It is not public, not CampaignCue-owned, and not an automatic truth overwrite system.
