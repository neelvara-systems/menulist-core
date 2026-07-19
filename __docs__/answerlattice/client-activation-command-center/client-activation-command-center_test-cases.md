# Client Activation Command Center Test Cases

## API

- Authenticated Answerlattice owner receives summary.
- Non-management Answerlattice session receives 403.
- Non-onboarded user receives 400.
- Missing Answerlattice Firebase returns 503.
- Store tenant mismatch returns 403.
- Missing store returns 404.
- Store product/tenant/store/document mismatch returns 403 after the one ownership read and before compact-summary reads.
- Store with subscription summary avoids legacy subscription query.
- Store without subscription summary uses capped legacy fallback and rejects missing/conflicting product or tenant/store identity.
- Malformed or cross-scope coverage, trust, context, Answer Test, source-version, or bundle-manifest docs cannot advance launch proof.
- Every API response path carries private no-store and nosniff headers.
- Notification-test route rejects a malformed support email before attempting delivery.
- Notification-test and compiled-context rebuild responses retain private no-store and nosniff headers on permission and error paths.

## UI

- Loading skeleton renders.
- Empty/error state renders.
- Refresh reloads summary.
- Next required action routes to the correct management page.
- First-client launch proof shows complete/total proof checks, progress, next proof action, and per-group status.
- Launch proof action routes point to Settings, Knowledge Intake, Governance, Widget, Trust Metrics, and Signal Queue according to the incomplete group.
- Signal-source proof is based on compact context signal counts; proposal quality is verified in Signal Queue, not by Activation collection scans.
- Content Control workbench routes to product details, import, knowledge base, product surfaces, changelog, signal queue, widget, and tickets.
- Test-as-Customer checklist routes to help center preview, widget setup, product surfaces, support ticket form, release notes, and Signal Queue based on summary readiness.
- Test-as-Customer statuses say Ready to test and explicitly state that configuration does not prove resolution.
- Widget and page-context proof are complete at the seven-day boundary, become Needs review immediately after it, and reject implausibly future telemetry.
- `stage: live` is accepted only with complete, internally consistent launch proof; an 85% readiness score alone is insufficient.
- Readiness Metrics labels the percentage as Setup readiness and uses launch proof for success color/copy.
- A non-ready compiled-context rebuild shows fixed needs-review copy rather than a success toast.
- Malformed notification-test or compiled-context responses fail closed before success copy.
- Browser response validation rejects malformed timestamps, statuses, counts, oversized arrays/strings, contradictory proof totals, and live-stage/proof mismatch.
- Surface Readiness matrix shows Ready, Needs mapping, Needs content, and Open signals states from `summary.content.surfaceReadiness`.
- Daily Governance panel shows workspace scheduler status, support-day end time, daily check start time, last completion, and Settings/Refresh actions.
- Ticket detail operator view shows Knowledge Loop guidance without extra ticket reads.
- Mobile checklist actions remain tappable.
- Mobile Content Control actions stack without horizontal scroll.
- Mobile Surface Readiness and Test-as-Customer cards stack without horizontal scroll.
- Activation, Readiness, Surface Readiness, and Test-as-Customer command actions retain at least 44px targets.

## Cost

- Activation load reads the store plus compact activation, context, coverage, trust, and compiled-context manifest docs only.
- Daily Governance status reads one store doc, two platformSummary docs, and five capped scheduler logs.
- First-client launch proof adds no Firestore calls beyond the activation summary response.
- Content Control workbench adds no extra Firestore calls beyond the activation summary response.
- Test-as-Customer checklist and Surface Readiness matrix add no extra Firestore calls beyond the activation summary response.
- Ticket detail Knowledge Loop card adds no Firestore calls; it reads only local ticket state.
- Activation snapshot write is skipped when signature is unchanged and fresh.
- Widget runtime marker is throttled.
- Invalid store ownership stops before seven compact summary reads; valid direct Activation remains eight reads.

## Focused Gate

- `npm run test:answerlattice-activation-contracts`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
