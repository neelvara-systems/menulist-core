# Native Knowledge Intake Connectors - Specification

> **Status:** Deliberately not implemented
> **Last Updated:** 2026-08-05

## Problem

Native connectors can reduce repeated exports, but they also introduce broad source permissions, private content, credentials, provider drift, rate limits, background cost, deletion obligations, and ongoing support. Those costs are unjustified before Answerlattice proves that the existing intake-to-approved-answer loop sells and retains solo-founder SaaS customers.

## Current Accepted Workflow

Owners may use selected public URLs, supported files and exports, pasted notes, repeated replies, screenshots/images, and short media. Each input becomes bounded review evidence and remains human-governed.

GitHub Release exports and pasted release notes may use the existing release-evidence handoff into the Changelog editor. This is manual evidence intake, not a native connector, and it does not satisfy or weaken the future admission contract.

## Future Admission Contract

A future connector must be one provider only and must define:

- exact OAuth scopes and why each is required;
- source-owner identity and selected container IDs;
- per-source access, authority, status, version, effective date, and last-sync metadata;
- initial import, manual refresh, permission loss, rate limit, partial failure, disconnect, revocation, deletion, and recovery states;
- provider payload redaction and private citation rules;
- deterministic source identity and duplicate/change behavior;
- dependent-answer review when a source changes or disappears;
- per-workspace operation caps and measured cost;
- human approval before imported evidence changes active truth.

## Non-Goals

- multiple providers in one launch;
- bidirectional sync;
- writing into external systems;
- whole-workspace search by default;
- importing every historical ticket as truth;
- automatic canonical-answer publication;
- connector marketplace or generic integration platform.

## Rejection Rule

Reject implementation if the same provider is not repeatedly requested by paying customers, exports remain adequate, selected-scope permissions cannot be preserved, deletion cannot be honored, or the connector adds more maintenance than verified support work it removes.
