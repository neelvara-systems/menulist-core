# Auth and Onboarding Implementation

**Status:** Current source map
**Last updated:** July 16, 2026

## Runtime map

| Concern | Primary source |
| --- | --- |
| NextAuth providers, callbacks, session projection | `src/lib/auth/index.ts` |
| Current account lifecycle/revocation admission | `src/lib/auth/currentPlatformUser.ts` |
| Unique email/phone/staff identity lookup | `src/lib/auth/serverUserContext.ts` |
| Browser login and three-mode claim handoff | `src/components/templates/loginPage/index.tsx` |
| Phone OTP routes and durable challenge/token helper | `src/app/api/auth/phone-otp/*`, `src/lib/auth/phoneOtp.ts` |
| Claim preview, mutation, concurrency | `src/app/api/auth/validate-claim/route.ts`, `src/app/api/auth/claim-account/route.ts`, `src/lib/auth/claimAccountConcurrency.ts` |
| Firebase custom claims | `src/app/api/auth/set-claims/route.ts`, `src/lib/auth/setClaimsWorkspace.ts` |
| First tenant/store transaction | `src/lib/onboarding/createTenantStore.ts` |
| Onboarding plus Razorpay coordination | `src/app/api/onboarding/create-subscription/route.ts` |
| Provider/local failure compensation | `src/lib/onboarding/compensateFailedOnboarding.ts` |
| Browser checkout/session handoff | `src/hooks/usePaymentHandler.ts` |
| Pricing return/pending recovery | `src/components/website/pricing/PricingWrapper.tsx`, `src/components/website/pricing-pages/SubscriptionManagement.tsx` |
| Active session parsing and store/product projection | `src/lib/auth/getActiveSession.ts`, `src/lib/auth/loginSessionBoundary.ts` |

## Login and session

The Google provider resolves the normalized email and creates a deterministic unscoped owner profile when no user exists. Credentials resolve email, phone, or staff aliases, apply lockout and lifecycle checks, and verify the password through Firebase Auth. Phone OTP produces a one-time token which the same credentials provider consumes transactionally.

Google user creation sanitizes its allowlisted write through the canonical `src/lib/firestore/sanitizeForFirestore.ts` boundary. Auth does not maintain a private recursive sanitizer: SDK values retain their prototypes, undefined values retain the established null semantics, and cycles, accessors, unsupported values, or dangerous object keys fail before the user transaction.

The JWT callback re-reads the current user, using a bounded 15-second process-local cache only for already scoped sessions. `useSession().update()` forces a fresh read, so onboarding and store-switch changes are projected from Firestore rather than trusted from the browser update payload.

The session contains both top-level shortcuts and the compact `session.user` projection. `platformRole` is account level; `role` is derived from the mapping for the active store.

## Google claim handoff

The login page stores a pending claim token across OAuth. After NextAuth returns, one synchronous `claimProcessingRef` guard prevents session rerenders from starting Firebase sync or redirect while the claim request is still committing. On success it refreshes the session, syncs Firebase Auth, and hard-navigates into the refreshed scope. On failure it clears the local pending token and continues with normal login behavior.

## Phone OTP

Start and verify routes apply fail-closed shared rate limits before paid WhatsApp work or challenge verification. The helper stores only HMAC forms of OTP/login secrets, commits invalid-attempt and expiry state, reserves valid verification with a lease, atomically creates the one-time login token, and consumes it only after reading the exact bound user.

## First workspace transaction

`assertCurrentUserAvailableForOnboardingInTransaction()` runs before allocation. `createTenantStoreInTransaction()` creates the tenant, master store, canonical business type/category fields, time settings, subdomain reservation, default roles, `storesSummary`, and counters. `updateUserWithTenantStore()` adds the owner mapping in the same transaction.

This website-specific admission is not applied blindly to reseller, messaging, public-create-menu, or Answerlattice sources; those callers retain their own identity contract while sharing tenant/store creation.

## Identity and compensation scope boundary

### Onboarding user-ID boundary

All first-workspace helpers normalize user IDs through `src/lib/onboarding/onboardingUserId.ts` before creating a `users/{userId}` reference. Empty, whitespace-mutated, oversized, slash-containing, or reserved Firestore document IDs fail before a transaction reads or writes identity state.

`createTenantStoreInTransaction()` and `updateUserWithTenantStore()` use that same guard. Reseller onboarding normalizes Firebase Auth-generated UIDs through `requireOnboardingUserId()` before owner-document creation or compensation.

### Onboarding compensation scope boundary

`compensateFailedTenantStoreOnboarding()` revalidates the user ID and requires exact positive numeric tenant/store document IDs before constructing any tenant, store, summary, or user reference. It also removes only mappings whose persisted tenant/store identity exactly matches the failed workspace. This keeps provider-failure cleanup from crossing scopes or deleting a different onboarding attempt.

## Razorpay convergence

After the Firestore transaction, the route creates the provider plan/subscription using server plan data and an `onboardingAttemptId`. If provider create throws ambiguously, a bounded list scan accepts only the exact attempt identity. The route then persists a pending subscription. If that write throws after a possible commit, the exact-document recovery requires both ML product aliases, both user aliases, both numeric tenant aliases, both numeric store aliases, and exact provider/plan identity before acknowledging success; incomplete or conflicting rows enter the existing provider/local compensation path.

If persistence reports failure, the route re-reads `subscriptions/{providerSubscriptionId}`. It accepts the record only when document/provider ID, provider, user, tenant, store, and plan identity match the attempted onboarding; status may already have advanced through a fast webhook. Otherwise it cancels the provider subscription, and only successful cancellation proceeds to local tenant/store/user/referral compensation. This avoids deactivating a workspace while a live provider subscription may still exist.

The browser updates the session from current user truth, opens Razorpay, and verifies the signed checkout response through the existing subscription verification route. A dismissed checkout leaves the pending record and allowlisted short URL available. Pricing, desktop Billing, and Mobile Billing normalize the stored checkout URL through the same HTTPS `rzp.io` allowlist before exposing recovery.

## Firebase claims

`/api/auth/set-claims` validates an optional UID, product, and target store; resolves the product user; verifies target membership; reads the canonical target store; derives tenant scope from that store; and resolves the active store role. Missing normal-user roles and non-platform `PLATFORM` role values fail with 403 instead of defaulting to owner.

The browser signs in with the returned custom token or forces an existing Firebase token refresh. Store switching additionally checks the refreshed claim acknowledgement before changing browser-local active-store context.

## Focused verification

```bash
npm run verify:auth-onboarding-flow
npm run test:phone-otp-transaction:emulator
npm run test:claim-account-concurrency:emulator
npm run test:onboarding-user-concurrency:emulator
```

Do not replace provider, device, or deployed-host smoke with these source gates.

## Exact subscription relinking scope (July 22, 2026)

Account claim relinks billing owner identity only for subscriptions whose `pId/productId` are both `ML` and whose numeric `tId/tenantId` and `sId/storeId` are present and agreeing with the canonical claim workspace. The transaction query constrains all aliases and each result is reprojected before any subscription `userId/email/name` update. Conflicting or incomplete billing rows remain unchanged and cannot be adopted by a new owner claim.

## Access-status request settlement (July 23, 2026)

`SessionExpiryMonitor` binds every `/api/auth/access-status` poll to the exact browser session identity: user, tenant, store, product, role, and session expiry. A newer session or request invalidates the prior response, and effect cleanup invalidates in-flight work before route/session transitions. Only the current request may show the access-ended modal or call the shared sign-out flow.

This prevents a delayed access-ended response for a prior account/workspace from signing out the newly selected session. The monitor retains the existing five-second startup check, thirty-second visible-page poll, same-origin/no-store/manual-redirect policy, 8 KiB response cap, fixed reason mapping, and transient-network retry behavior.

Focused regression and source evidence:

```bash
npm run test:latest-request-guard
npm run verify:auth-security-failure-matrix
```
