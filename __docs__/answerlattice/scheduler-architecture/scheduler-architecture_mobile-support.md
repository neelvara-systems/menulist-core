# Answerlattice Scheduler Architecture Mobile Support

## Admission Decision

No separate mobile surface is needed.

The only owner-facing scheduler control added here is workspace timezone and support-day end time in Answerlattice Settings. The existing settings page is responsive and exposes the same form fields on mobile and desktop.

## Mobile Requirements

- Mobile owners can edit the same `Workspace timezone` and `Support day ends` fields.
- Save uses the same `/api/answerlattice/workspace-profile` endpoint.
- No mobile-only scheduler toggle is introduced.
- Scheduler state remains automatic; owners do not manage jobs manually.

