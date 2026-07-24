# SignalDesk Control Room - Safety And Compliance

**Status:** Current policy
**Revalidated:** July 21, 2026

## Safety Invariants

- A pause is stronger than throughput, approval, budget, or provider readiness.
- Activating and clearing a pause requires the exact permission and explicit UI
  confirmation. Mobile may activate only the global outbound pause.
- Pause documents retain a bounded operational reason and actor/timestamp state.
  Audit history stores the stable event classification rather than free-form text.
- Exact retries cannot duplicate pause, audit or cost effects.
- Suppression, source rights, contact permission and approval remain independent
  mandatory gates. Clearing a pause does not weaken them.
- Complaint/privacy/legal intake may create incidents and pauses synchronously;
  later ordinary replies cannot silently clear those safety states.

## Incident Boundary

`open` and `acknowledged` are unresolved. `resolved` is terminal for overview
counting. Incident payloads are created and reconciled by their owning producer
flows, such as webhook safety, source-data lifecycle and proof/content authority.
Control Room currently has no generic acknowledge/resolve mutation, threshold
override, or bulk-clear action.

## Data Exposure

The overview exposes only incident ID, title, severity, status and update time;
kill-switch DTOs expose current state/reason/actor timestamps. Raw provider
payloads, message bodies, contact identity, secrets, legal request content and
private incident metadata do not enter the browser DTO.

## Cost And Freshness Truth

Cost cards are estimates from strict daily accounting, not invoices. The page
shows summary timestamps. Health statuses are written by their owning producer;
there is no universal automatic cost-incident or per-domain stale timer today.
Documentation and UI must not imply those planned systems exist.
