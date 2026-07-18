# Reseller Dashboard End-to-End Verification — July 16, 2026

## Verdict

The reseller-assisted onboarding, billing, client-list, payment-confirmation, manual-renewal, add-location, expiry, desktop, and MobileShell source boundaries are locally complete. Code is the primary authority. No Firestore rule, index, Storage rule, or Cloud Function source changed in this feature pass, so no Firebase deployment is required for these changes.

Production certification remains pending on owner/provider evidence: Razorpay test-mode online onboarding and webhook activation, authenticated desktop/PWA role and mutation smoke, physical-device payment-link handoff, approved app release, and production-host observation.

## End-to-End Scope Cross-Checked

- Platform creation, update, activation/deactivation, Auth claims, user/profile persistence, and create-failure cleanup
- Active reseller identity across Auth UID, legacy generated profile ID, session claim, and normalized email
- Owner email/phone login preparation, single-claim transaction, account/store/summary creation, cache refresh, and compensation
- Online Razorpay plan/subscription creation, HTTPS `rzp.io` handoff, provider cancellation, ambiguous local-commit recovery, and activation convergence
- Offline prepaid onboarding, concurrent cap admission, deterministic subscription identity, entitlement sync, and referral repair
- Required onboarding/renewal/add-location operation UUIDs, changed-intent refusal, exact replay, and bounded acknowledgements
- Current-client list, pending checkout recovery, manual renewal, add-location capacity, profile/monthly summaries, and explicit partial-result UI
- Daily leased expiry, cap release/reacquisition, stored-tier authority, renewal anchor, and billing state-machine reuse
- Desktop and MobileShell navigation, touch targets, copy/open/share diagnostics, and owner-safe failure copy
- Firebase operation shapes, security-rule boundary, indexes, docs, changelog, and production-audit parity

## Material Fixes

1. Subscription, onboarding ledger, profile counters, and offline-cap reservation now commit in one Firestore transaction. A response-loss retry returns the exact existing result without another write.
2. Online expected revenue is not counted as collected revenue. New online ledgers carry an explicit deferred marker and activation recognizes revenue exactly once; legacy rows are not guessed or double-counted.
3. Provider failure handling cancels a created Razorpay subscription before local account compensation. An uncertain local commit is re-read before destructive compensation.
4. Reseller authority now supports both current Auth-UID profiles and legacy generated profile IDs without accepting a mismatched session/profile/email.
5. Platform reseller creation cleans up the newly created Firebase Auth/user identity when profile persistence fails, and claims store the actual reseller profile ID.
6. Desktop and MobileShell expose the existing manual-renewal API. The client retains its stored tier, an expired renewal re-acquires one cap slot atomically, and success requires an exact store/tenant/subscription/operation acknowledgement.
7. The client list uses one bounded current-subscription query instead of a reseller-ledger query plus one exact subscription read per row. Desktop/mobile disclose partial lists; monthly reporting retains its independent partial flag.
8. Returned Razorpay links are normalized before copy/open. The unused client Firestore reseller DAL was removed because server APIs and client-denied writes are authoritative.

## Firebase Cost Boundary

- Onboarding account creation keeps its existing tenant/store/user/summary transaction.
- Billing adds one operation read, one subscription read, and optionally one profile read, followed by two or three atomic writes. Exact replay performs bounded reads and zero writes.
- A reseller client load reads at most 101 subscription rows; a platform load reads at most 201. The overflow row determines `isPartial`.
- Monthly reporting reads at most 2,000 ledger rows plus bounded profile rows and reports its own partial state.
- Renewal/add-location read operation + current subscription + optional profile and write only on first application.
- No new collection, listener, scheduler, rule, index, dependency, or owner-facing setting was added.

## Verification Evidence

Passed on the current worktree:

- `npm run verify:reseller-dashboard-boundary`
- `npm run test:reseller-onboarding-boundary`
- `npm run test:reseller-onboarding-billing:emulator`
- `npm run test:reseller-confirm-payment-boundary`
- `npm run test:reseller-confirm-payment:emulator`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:billing-entitlement-boundary`
- `npm run verify:multi-location-boundary`
- `npm run verify:owner-referral`
- `npm run verify:dependency-freeze`
- `npx tsc --noEmit`
- Focused ESLint over every changed reseller route, server helper, hook, desktop/mobile component, schema, and regression test
- `npm run docs:check-links` — 0 broken links; 27 pre-existing video-artifact naming warnings
- `git diff --check`

The two Firestore emulator suites must run serially because they share the default local Firestore emulator port. Both pass independently.

## Owner/Provider Tasks — Pending

- Run Razorpay test-mode onboarding, checkout, successful webhook activation, invalid-signature refusal, recovered checkout URL, and local/provider state comparison with no real charge.
- Run authenticated platform/reseller/owner desktop smoke for reseller creation, offline/online onboarding, renewal, add-location, payment confirmation/replay, and deactivation.
- Run the matching MobileShell/PWA flow on a physical device, including native share, copy fallback, popup-blocked link behavior, and low-bandwidth retry.
- Schedule the approved app release and then capture production-host/cache/metrics evidence. No Vercel action was authorized or performed here.
