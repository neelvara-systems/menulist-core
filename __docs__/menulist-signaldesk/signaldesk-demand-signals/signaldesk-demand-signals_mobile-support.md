# SignalDesk Demand Signals - Mobile Support

**Status:** Enforced dashboard-only mobile contract
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Decision

Mobile SignalDesk serves only the shared dashboard overview. That overview may include the compact aggregate Demand Signals count already present in the control-room summary. Attribution, demand lists, raw events, and capture controls are not served on mobile.

## Enforcement

- Mobile workspace requests for Attribution return `403`.
- `capture-demand-signal` is classified as a configure mutation and is rejected on mobile before workflow execution.
- The desktop demand form is feature-flagged and requires `target.review`.
- No dedicated mobile component, listener, query, or mutation exists.

## Acceptance

Mobile passes when the existing overview remains readable and every demand-specific read or mutation is rejected without exposing raw signal or target data.
