# SignalDesk Foundation - Compliance Policy

**Status:** Runtime-backed policy
**Created:** June 23, 2026
**Last Updated:** July 21, 2026

## Access Boundary

SignalDesk is internal-only.

No access is allowed for:

- MenuList SMB owners;
- MenuList customers;
- public visitors;
- unauthenticated users;
- external contractors unless explicitly added as internal team members.

Internal team membership changes must be made through the private Settings flow or an equivalent server-admin maintenance script. Client Firestore writes remain denied. Every add, role change, activation, or deactivation must write an audit event, and self-deactivation is blocked in the runtime action.

Every request also requires a current MenuList user record that remains active, unblocked, undeleted, auth-enabled, email-consistent, and newer than any session-revocation boundary. Cached session platform role is not authority. Human membership admits only founder admin, growth manager, operator, compliance reviewer, and read-only analyst; `system-worker` is reserved for server worker identity and cannot be created through the human team flow.

Member identity changes are transactional. Ambiguous user-ID/email matches, attempts to rebind an existing user ID, missing explicit records, and concurrent duplicate claims fail closed. Self-deactivation compares the stored member identity with the current actor so changing submitted email cannot bypass the guard.

## Contact Reveal

Raw contact reveal is a sensitive action.

Required:

- actor role permits reveal;
- reason is entered;
- target/contact ID is linked;
- audit event is written;
- mobile reveal is blocked;
- export/send checks suppression separately.

## Audit Requirements

Durable Firestore audit is required for committed governed actions including:

- contact reveal;
- role change;
- policy change;
- kill-switch activate/deactivate;
- export;
- send;
- approval;
- incident closure.

Raw target names, contact values, messages, evidence text, provider payloads, and free-form operator notes must not be persisted in audit rows. The durable reason field stores only a stable event classification. Rejected sign-in, permission, validation, and malformed-request attempts are recorded through bounded security/runtime diagnostics where applicable; they must not create one permanent Firestore row per attacker-controlled request.

Audit history is desktop-only, requires `audit.view`, remains private/no-store, and is loaded in stable newest-first pages. Direct browser writes are denied. Ordinary internal members read it through the protected server API; platform direct-read authority does not grant client write authority.

## Kill Switch Governance

Any admin may activate a kill switch if there is risk.

The mobile emergency boundary is narrower than desktop administration: mobile may activate only the global outbound pause with the explicit confirmation marker. Scoped activation and all deactivation require desktop review. The switch document retains the review reason; the durable audit row stores only the stable activate/deactivate event classification.

Deactivation requires:

- reason;
- actor permission;
- incident or review note if switch was activated due to complaint, provider warning, cost spike, or policy issue.

## Public Exposure Rules

- No public route.
- No public sitemap.
- No public robots inclusion.
- No marketing website.
- No public help doc.
- No public route that reveals target, contact, message, source, or evidence data.

## Open Compliance Items

| Item | Owner |
| --- | --- |
| Contact reveal retention | Founder + compliance review |
| Contractor access policy | Founder |
| Incident severity policy | Founder + Codex before implementation |
