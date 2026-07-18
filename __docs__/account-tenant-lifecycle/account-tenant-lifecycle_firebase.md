# Account And Tenant Lifecycle Firebase

## Existing operations

- Provisioning uses one Firestore transaction for tenant/store and related
  summary truth; source flows add their user/project/subscription writes in
  their existing transaction boundary.
- Failed paid onboarding uses one compensation transaction.
- Staff removal uses one membership transaction, then Firebase Auth refresh
  token revocation and final-account disable where needed.
- Logout uses Firebase Auth and NextAuth only; browser cleanup is local.

## Cost and scale

This pass adds no Firestore read, write, delete, listener, collection, query,
index, Storage operation, Function, scheduler, or provider call. Clearing
owner SWR cache at logout can cause the next authenticated browser user to
perform normal fresh reads; this is intentional isolation, not a recurring
cost increase.

No Firebase deployment is required.
