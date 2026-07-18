# Account And Tenant Lifecycle Test Cases

| Case | Expected result |
| --- | --- |
| Firebase sign-out fails | NextAuth sign-out is still attempted |
| NextAuth sign-out succeeds | Authenticated browser and in-memory state clears |
| NextAuth sign-out fails | Current UI state remains available for a safe retry |
| Browser storage throws | Sign-out cleanup remains best effort and does not crash |
| New browser user after logout | Previous outlet, owner cache, processing job, logs, and identity are absent |
| Remove one of several staff mappings | Only that store mapping is removed and sessions are revoked |
| Remove final staff mapping | User is deactivated, soft-deleted, revoked, and Firebase Auth disabled |
| Concurrent onboarding | Only the transactionally eligible attempt provisions |
| Paid onboarding provider/persistence failure | Tenant/store is inactive and user mapping is compensated |
| Privacy deletion request | Identity, authority, billing/shared-access, and retention are reviewed |
