# Native Helpdesk and Jira Connectors - Specification

> **Status:** Deliberately not implemented
> **Last Updated:** 2026-07-20

## Customer Problem

A founder may already have useful tickets, macros, conversation resolutions, or Jira issue outcomes. Repeated exports become painful only after this material changes often enough that manual intake blocks trusted-answer maintenance.

## Current Accepted Workflow

Owners import selected exports, macros, repeated replies, and resolved examples through existing bounded intake. The review system separates useful evidence from approved truth.

## Future Admission Contract

A provider-specific implementation must define:

- exact read-only OAuth scopes and selected views, inboxes, projects, spaces, or article sets;
- `pId`, `tId`, and `sId` ownership plus provider account identity;
- deterministic external object identity, version, cursor, and deletion state;
- source authority, access, effective date, privacy, retention, and citation projection;
- explicit inclusion rules for public replies, resolved text, macros, and article content, with attachments, internal notes, requester profiles, system events, and unrelated history excluded by default;
- initial import, manual refresh, reconnect, permission loss, 401/403/429/5xx, replay, and partial-failure states;
- dependent-answer review when imported evidence changes or disappears;
- bounded pagination, provider operations, Firestore operations, and support cost;
- human approval before evidence changes active canonical truth.

## Non-Goals

- a connector marketplace;
- five-provider parity;
- bidirectional ticket or Jira synchronization;
- helpdesk replacement;
- Jira issue creation or comment automation;
- unrestricted conversation history import;
- attachment ingestion or customer-profile replication in the first connector;
- automatic publication from tickets or issues;
- provider write-back or account-changing actions.

## Rejection Rule

Reject development when paying-client demand is fragmented, exports are sufficient, selected permissions cannot be preserved, deletion cannot be honored, or the connector adds more founder/provider support work than it removes.
