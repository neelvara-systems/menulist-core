# Account And Tenant Lifecycle Implementation

## Provisioning

- `src/lib/onboarding/createTenantStore.ts` owns transactional tenant/store ID
  allocation, subdomain claims, default roles, summary truth, and current-user
  revalidation.
- `src/lib/onboarding/compensateFailedOnboarding.ts` marks failed website or
  reseller provisioning inactive and removes compensated user mappings and
  referral attribution.
- Claim-account and reseller flows separately compensate Firebase Auth users
  they created when their durable transaction fails.

## Membership

`src/lib/staffManagement/server.ts` transactionally removes the selected store
mapping. The last mapping sets `active:false`, `deleted:true`, and
`authDisabled:true`, advances session revocation, revokes refresh tokens, and
disables the Firebase Auth account.

## Browser teardown

`src/lib/auth/client.ts` attempts Firebase sign-out and then NextAuth sign-out
independently. When NextAuth ends, `clientSessionCleanup.ts` clears:

- active outlet context;
- owner SWR local caches;
- deployment identity and active/dismissed processing-job session state;
- legacy unscoped project selection and session-expiry acknowledgement;
- captured owner-session logs and monitoring identity.

`src/providers/sessionProvider.tsx` also clears tenant, store, permissions,
subscription, support caches, platform summary, and other authenticated
in-memory state when the signed session disappears.
