# Account And Tenant Data Lifecycle

This boundary covers MenuList account creation, tenant/store provisioning,
store membership, session teardown, staff deactivation, and privacy requests.

## Current contract

- Onboarding allocates tenant/store truth inside the centralized Firestore
  transaction and compensates failed paid provisioning.
- Staff removal removes one store mapping; removal from the last store
  deactivates the record, revokes sessions, and disables Firebase Auth.
- Logout attempts both Firebase and NextAuth teardown, then removes
  authenticated browser/in-memory state once the NextAuth session ends.
- Full account access, portability, correction, and deletion are verified
  support-managed requests. Menu/project downloads are not a complete account
  export and there is no unsafe one-click owner deletion path.

See the [specification](./account-tenant-lifecycle_spec.md),
[implementation](./account-tenant-lifecycle_impl.md), and
[verification](./account-tenant-lifecycle_verification.md).
