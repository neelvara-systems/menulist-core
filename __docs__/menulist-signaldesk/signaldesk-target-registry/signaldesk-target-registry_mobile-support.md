# SignalDesk Target Registry - Mobile Support

**Status:** Runtime-backed assessment
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Decision:** No mobile registry workspace; summary observation only.

## Current Behavior

SignalDesk mobile is dashboard-only. The Target Registry and Imports sections are rejected by the protected workspace route on mobile. Mobile actions classify `import-targets`, score, evidence, draft, contact reveal, and related mutations as blocked operations.

The mobile dashboard can show bounded system/queue counts and active emergency state. It does not load private target detail or expose contact identity.

## Blocked On Mobile

- opening Target Registry or Imports;
- CSV import;
- provider run;
- scoring or changing target state;
- evidence or draft creation;
- contact reveal;
- duplicate/rebind resolution;
- export, send, reply, or outcome mutation.

## Acceptance Criteria

- Crafted mobile API calls cannot import or mutate targets.
- Target summaries/details and raw contact identity are not loaded into a mobile registry screen.
- Current-user/session revocation applies on the next mobile request.
- Global emergency pause remains the only mobile mutation and is governed by the Foundation feature.
