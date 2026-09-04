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
- The primary setup path contains exactly four owner-goal groups: Add product knowledge, Approve your first answers, Connect customer support, and Verify and go live.
- The first incomplete group is expanded by default, completed groups are collapsed, and only one group can be open at a time.
- When refreshed evidence changes the first incomplete group, the accordion remounts on that group without persisting owner UI state.
- Group status and the group CTA come from existing activation steps or launch-proof items; no manual completion control or parallel recommendation state exists.
- A next action whose maintained route is Activation opens technical details and focuses the Ticket Notifications control instead of issuing a no-op push to the current route.
- The embedded unresolved-fallback action uses the same same-page handler, so Review Notifications focuses the maintained control after deferred children mount.
- The primary path shows one factual launch-proof complete/total count and does not show the separate setup-readiness percentage until technical details are opened.
- Technical evidence and setup details is collapsed initially and preserves the exact launch proof, full launch checklist, Content Control workbench, runtime/compiled-context/notification/license/profile/evidence panels, and Daily Governance.
- Daily Governance does not mount or issue its separate bounded request until technical details are opened once; closing and reopening the disclosure in the same page session does not refetch it.
- Switching Answerlattice workspace scope resets deferred technical content before the next workspace summary can render.
- First-client launch proof shows complete/total proof checks, progress, next proof action, and per-group status.
- Launch proof action routes point to Settings, Knowledge Intake, Answer Quality, Widget, Trust Metrics, and Suggested Updates according to the incomplete group.
- Signal-source proof is based on compact context signal counts; proposal quality is verified in Suggested Updates, not by Activation collection scans.
- Content Control workbench routes to product details, import, knowledge base, Product Pages & Flows, changelog, Suggested Updates, widget, and tickets.
- Test-as-Customer checklist routes through the three launch-critical paths: approved help preview, contextual widget setup, and support ticket fallback.
- Test-as-Customer statuses say Ready to test and explicitly state that configuration does not prove resolution.
- Widget and page-context proof are complete at the seven-day boundary, become Needs review immediately after it, and reject implausibly future telemetry.
- `stage: live` is accepted only with complete, internally consistent launch proof; an 85% readiness score alone is insufficient.
- Setup Status labels the percentage as Setup readiness and uses launch proof for success color/copy.
- A non-ready compiled-context rebuild shows fixed needs-review copy rather than a success toast.
- Malformed notification-test or compiled-context responses fail closed before success copy.
- Browser response validation rejects malformed timestamps, statuses, counts, oversized arrays/strings, contradictory proof totals, and live-stage/proof mismatch.
- First-value evidence accepts only its five exact nullable canonical ISO timestamps; malformed, future, extra, or object-coercible values fail closed.
- Historical first-value evidence is preserved only from an exact `AL` tenant/store activation snapshot; foreign or malformed parent scope contributes no timestamp.
- A newly reached threshold stores the current computed timestamp once, a later refresh preserves it, and a regression does not erase it or keep the current launch state green.
- Milestone-changing writes transactionally reread the latest activation snapshot; ordinary writes omit the unchanged evidence map so concurrent refreshes cannot erase an earlier observation.
- Transactional repair replaces the five-field evidence map exactly; unknown nested fields cannot survive a successful repair write.
- Legacy activation summaries without first-value evidence are lazily observed on the next normal refresh without a migration scan.
- Technical details show the five first-observed milestones without adding another primary progress indicator.
- Surface Readiness matrix shows Ready, Needs mapping, Needs content, and Open signals states from `summary.content.surfaceReadiness`.
- Daily Governance panel shows workspace scheduler status, support-day end time, daily check start time, last completion, and Settings/Refresh actions.
- Ticket detail operator view shows Knowledge Loop guidance without extra ticket reads.
- Mobile checklist actions remain tappable.
- Mobile Content Control actions stack without horizontal scroll.
- Mobile Surface Readiness and Test-as-Customer cards stack without horizontal scroll.
- Activation, Readiness, Surface Readiness, and Test-as-Customer command actions retain at least 44px targets.
- The sidebar presents direct links in this owner sequence: Get Live, Improve answers, Run Support, Customer help, Workspace, then Advanced.
- Get Live shows Activation, First 10 Answers, Install Support, and Setup Status without a parent accordion.
- Improve answers shows Trusted Answers, Suggested Updates, and Answers to Recheck; Run Support shows Daily Brief, Support Board, and Ticket Inbox.
- Customer help shows Widget & Hosted Help; Workspace shows Team & Access and Billing.
- The in-page Answer Quality All tools menu retains its existing tab behavior, while the sidebar's single Advanced reveal retains access to every other authorized route.
- All tools is built after permission and feature-flag filtering, reveals no unauthorized destination, and never changes entitlements.
- Opening All tools does not navigate or close the mobile drawer; choosing a real destination follows the existing route and drawer-close behavior.
- A bookmarked or directly opened advanced route remains visible and active without requiring a saved reveal preference.
- Show fewer tools restores the compact list after the operator leaves an active advanced route.
- Install Support exposes the existing coding-agent packet and acceptance tests without changing widget credentials or install contracts.

## Cost

- Activation load reads the store plus compact activation, context, coverage, trust, and compiled-context manifest docs only.
- Daily Governance status performs zero reads on the normal Activation first paint; after technical details are opened, it reads one store doc, two platformSummary docs, and five capped scheduler logs.
- Daily Governance browser parsing rejects numeric-string/fractional metrics, impossible local dates, unknown nested statuses and read-model/run-count disagreement.
- Persisted scheduler durations and counts accept exact nonnegative safe integers only; malformed scalar evidence projects to zero and cannot become plausible owner status.
- Foreign/malformed embedded subscription summaries cannot complete License readiness and do not suppress the bounded exact-scope legacy fallback.
- Case-mutated subscription status, numeric-string subscription amount, and numeric-string widget seen count do not become owner readiness or billing/runtime truth.
- Object-coerced activation/operations/bundle statuses fail closed; manual rebuild acknowledgements reject unknown top-level, manifest, and stats fields and contain throwing object inspection.
- First-client launch proof adds no Firestore calls beyond the activation summary response.
- Content Control workbench adds no extra Firestore calls beyond the activation summary response.
- Test-as-Customer checklist and Surface Readiness matrix add no extra Firestore calls beyond the activation summary response.
- Four-group projection, accordion state, and technical-details disclosure add no Firestore reads, writes, listeners, model calls, or persisted UI state.
- Compact navigation and All tools add no Firestore reads, writes, listeners, browser-storage state, model calls, or persisted workspace preference.
- Ticket detail Knowledge Loop card adds no Firestore calls; it reads only local ticket state.
- Activation snapshot write is skipped when signature is unchanged and fresh.
- First-value evidence adds no document. Ordinary loads remain eight reads; establishing, repairing, or advancing evidence normally uses one additional transaction read and the existing conditional activation snapshot write. The read model counts each retry, up to the SDK's five-attempt default.
- Widget runtime marker is throttled.
- Invalid store ownership stops before seven compact summary reads; valid direct Activation remains eight reads.

## Focused Gate

- `npm run test:answerlattice-activation-contracts`
- `npm run test:answerlattice-sidebar-navigation`
- `npm run test:answerlattice-sidebar-interaction`
- `npm run test:dashboard-sidebar-shell`
- `npm run verify:answerlattice-customer-language`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
