# Ownership Transfer And Dormant Lifecycle

This boundary separates operational Owner-role access from legal/business
account ownership and separates stale-use communication from deactivation.

## Current contract

- The locked Owner role grants full operational permissions for an assigned
  store. It does not rewrite the tenant/store identity, subscription owner,
  billing records, notification recipients, referral history, or prior owner.
- The last active operational owner cannot be removed or demoted, and users
  cannot remove/deactivate their own access through staff controls.
- A complete business ownership transfer is support-managed and requires
  verified authority plus coordinated account, billing, notification,
  subscription, access, and audit updates.
- Low usage or old publish activity can produce bounded stale-menu detection
  and owner communication. It never automatically deactivates the store,
  account, subscription, or public menu.

See the [specification](./ownership-dormant-lifecycle_spec.md),
[implementation](./ownership-dormant-lifecycle_impl.md), and
[verification](./ownership-dormant-lifecycle_verification.md).
