# SignalDesk Outcome Bridge - Mobile Support

**Status:** Enforced mobile read-only contract
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

## Decision

SignalDesk mobile is dashboard-only and read-only. The mobile request header causes non-dashboard workspace sections, including Attribution, to return `403`; every action mutation is rejected independently. Outcome details and route controls remain desktop-only internal workflows.

## Allowed Mobile Views

| View | Allowed actions |
| --- | --- |
| SignalDesk dashboard overview | View only the compact overview fields already returned by the shared dashboard loader. |

## Blocked Mobile Actions

- Create route tokens.
- Record any outcome.
- Open the Attribution workspace or raw outcome details.
- Link/unlink MenuList records.
- Export outcome data.
- Override duplicate detection.

## UX Requirements

- Keep the existing dashboard-only response; do not add outcome-specific mobile reads.
- Never expose raw route token values.
- Keep MenuList references and attribution details in authorized desktop workflows.

## Mobile Acceptance

Mobile succeeds when the shared dashboard remains safely observable and every Outcome Bridge read or mutation outside that overview is rejected.
