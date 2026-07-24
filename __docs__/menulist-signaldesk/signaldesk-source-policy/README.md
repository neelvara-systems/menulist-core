# SignalDesk Source Policy

**Status:** Runtime-backed; source-data lifecycle is implemented locally and requires an authorized Firebase release
**Last verified:** July 21, 2026
**Parent:** [MenuList SignalDesk](../README.md)

Source Policy is the authority boundary between data availability and permitted use. Every import, provider run, evidence packet, personalized draft, export, handoff, and downstream control must recheck the current policy instead of trusting an earlier UI decision.

## Current Contract

- Policies are strict `SD` documents in `signaldeskSourcePolicies`.
- Creation records source type, provider, access basis, allowed and blocked fields, contact channels, allowed uses, prohibited uses, retention, attribution, review time, and expiry.
- Contact authority requires evidence authority plus an owner-supplied, permissioned-referral, or licensed-API basis.
- Public-business research defaults to evidence-only and cannot create contact authority.
- Renewal extends only the reviewed authority window. It cannot change policy terms, revive retained target data, renew a blocked policy, or exceed the existing retention period.
- Mobile remains read-only for policy creation, renewal, source runs, and scoped policy controls. The only mobile mutation in SignalDesk is the separately governed global emergency pause.
- Source-data expiry is handled by the consolidated hourly SignalDesk maintenance scheduler. The code, indexes, and emulator proof exist locally; deployed behavior must not be claimed until the Firebase release is verified.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-source-policy_spec.md) | Current authority and lifecycle requirements. |
| [Implementation](./signaldesk-source-policy_impl.md) | Actual schemas, actions, guards, UI, and scheduler paths. |
| [Firebase](./signaldesk-source-policy_firebase.md) | Current collections, reads, writes, indexes, and deployment boundary. |
| [Compliance](./signaldesk-source-policy_compliance.md) | Product safety rules and owner responsibilities. |
| [Mobile](./signaldesk-source-policy_mobile-support.md) | Dashboard-only mobile posture. |
| [Tests](./signaldesk-source-policy_test-cases.md) | Current source, renewal, import, and lifecycle verification. |

## Version History

| Version | Date | Change |
| --- | --- | --- |
| 0.1-0.4 | June-July 2026 | Initial policy and source-data retention design. |
| 0.5 | July 21, 2026 | Rebuilt from runtime truth; added immutable-terms renewal, corrected mobile behavior, removed nonexistent collections, and recorded current lifecycle release status. |
