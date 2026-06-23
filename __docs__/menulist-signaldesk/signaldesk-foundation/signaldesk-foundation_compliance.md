# SignalDesk Foundation - Compliance Policy

**Status:** Initial planning doc
**Created:** June 23, 2026

## Access Boundary

SignalDesk is internal-only.

No access is allowed for:

- MenuList SMB owners;
- MenuList customers;
- public visitors;
- unauthenticated users;
- external contractors unless explicitly added as internal team members.

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

Audit is required for:

- login;
- failed permission check;
- contact reveal;
- role change;
- policy change;
- kill-switch activate/deactivate;
- export;
- send;
- approval;
- incident closure.

## Kill Switch Governance

Any admin may activate a kill switch if there is risk.

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
| Final role membership source | Founder |
| Contact reveal retention | Founder + compliance review |
| Contractor access policy | Founder |
| Incident severity policy | Founder + Codex before implementation |
