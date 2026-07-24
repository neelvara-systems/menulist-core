# SignalDesk Evidence Packets

**Status:** Implemented and locally hardened
**Last Updated:** July 21, 2026
**Parent project:** [MenuList SignalDesk](../README.md)

Evidence Packets turn current, policy-approved target facts into a deterministic
internal review record. They do not discover new facts, call an AI provider,
approve outreach, reveal contact data, or publish anything.

## Current Flow

```text
current target + active source policy
  -> deterministic evidence identity
  -> private detail + owner-safe summary
  -> truthful target next action
  -> draft, approval, AI, route, and outcome revalidation
  -> bounded source-data retention
```

The summary is visible in the protected desktop workspace. The detail retains
the bounded source facts needed for internal lineage. Both are server-written;
mobile remains read-only and cannot create or edit evidence.

## Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-evidence-packets_spec.md) | Current behavior and owner contract. |
| [Implementation](./signaldesk-evidence-packets_impl.md) | Runtime, identity, and downstream boundaries. |
| [Firebase](./signaldesk-evidence-packets_firebase.md) | Collections, reads, writes, indexes, retention, and deployment state. |
| [Compliance](./signaldesk-evidence-packets_compliance.md) | Allowed facts, rejected claims, privacy, and source authority. |
| [Mobile](./signaldesk-evidence-packets_mobile-support.md) | Observe-only mobile posture. |
| [Tests](./signaldesk-evidence-packets_test-cases.md) | Executable and release-controlled verification. |

## Release State

App and Functions source gates pass locally. The new historical-evidence expiry
index and scheduler logic still require an authenticated SignalDesk QA Firebase
deployment. Provider sending remains disabled. No Vercel deployment was run.

## Version History

| Version | Date | Change |
| --- | --- | --- |
| 1.0 | 2026-07-21 | Rebuilt all active docs from current code and hardened identity, lifecycle, owner action state, UI admission, and historical retention. |
| 0.1 | 2026-06-23 | Initial planning documents. |
