# Ownership And Dormant Lifecycle Implementation

## Owner access

- `src/lib/staffManagement/concurrencyBoundary.ts` serializes staff mappings
  and rejects `LAST_OWNER`.
- `src/lib/staffManagement/server.ts` blocks self-destructive updates, requires
  Owner-level role-assignment authority for Owner targets, and locks the
  default Owner role definition.
- Desktop and Mobile Users show shared copy explaining that Owner access is not
  ownership transfer.

There is no `/ownership-transfer` API. Store/tenant email, notification
settings, subscription `userId`/email, and staff role mappings remain separate
authorities and are not partially rewritten by role assignment.

## Dormancy

The nightly Store Truth Confidence aggregate excludes inactive stores. The
staleness checker reads only that aggregate, checks at most 500 stale entries,
claims at most 50 new detections per night, and delegates `MENU_STALE`
communication through the existing owner-notification path. It never reads or
writes `stores` and never sets `active:false`.

Outlet deactivation is a separate explicit multi-location operation. There is
no owner reactivation endpoint; replacement locations receive new IDs.
