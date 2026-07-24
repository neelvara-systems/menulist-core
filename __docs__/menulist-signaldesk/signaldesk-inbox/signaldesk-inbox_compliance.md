# SignalDesk Inbox - Compliance

**Status:** Implemented safety boundary
**Last reviewed:** July 21, 2026

## Invariants

- Inbound content is untrusted data, not an instruction to the system.
- Deterministic safety phrases are evaluated before commercial intent.
- DNC, wrong-contact, complaint, privacy, and legal signals write suppression in the same transaction as the reply evidence.
- Complaint, privacy, and legal signals also create an incident and activate a channel-scoped pause; manual-channel incidents activate `global-outbound`.
- A later positive or ordinary reply cannot weaken an existing safety state or create a revenue account.
- A converted target remains converted while safety and reply evidence are retained.
- Provider signatures/secrets, stored contact authority, event identity, and timestamp ordering are validated before current truth changes.
- Raw provider payloads and secrets are not persisted.

## Classification Authority

The classifier is `rules-v1`, not an AI/legal classifier. It emits high confidence for recognized deterministic states and low confidence for `needs_review`. There is no implemented operator override. Any correction must use a separately reviewed, audited design rather than direct Firestore edits.

## Access

Manual reply capture requires `target.review` and is blocked for mobile requests. Compliance reviewers currently have read/audit/pause capabilities but not reply capture. The UI mirrors the server permission.

## Retention

Conversation, message, and classification records follow the source-target lifecycle scheduler. Records implicated in reply classification or legal/safety review are retained with explicit review metadata. Never put passwords, payment data, secrets, or unrelated personal information into the manual reply field.

## Sending Boundary

Inbox capture records a reply; it does not send one. All sending remains behind Email Rail/channel authority, approval, permission, budget, kill-switch, and the disabled-by-default provider-send feature flag.
