# Workspace Profile Mobile Support

## Decision

Supported through the responsive Answerlattice Settings template. No separate mobile data path or mobile-only profile contract exists.

## Mobile Flow

1. Open Answerlattice Settings.
2. Load the same strict GET response and revision used on desktop.
3. Edit product fields in the single-column form.
4. Use the full-width `Save Product Details` action.
5. Receive the same success, validation, rate-limit, conflict, or failure behavior.

## Parity Requirements

- Same permission and tenant boundary.
- Same field limits and URL/timezone rules.
- Same stale-editor protection.
- Same transaction and downstream synchronization.
- Same bounded response parser.
- Save action remains unavailable until load is verified.

No desktop route bypass, forced reload, alternate Firestore write, or duplicated business logic is permitted.
