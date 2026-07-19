# Ticket-to-Knowledge Loop - Implementation

> **Status:** Implemented; local source and emulator gates pass as of 2026-07-18

## 1. Ticket Transition

`TicketDetailView.tsx` waits for `updateTicket()` to return the persisted ticket. When the status changed to Resolved or Closed it derives:

- exact numeric tenant/store scope, or zero so the emitter rejects invalid scope;
- the latest persisted status timestamp;
- a lifecycle ID: `<status>_<timestampMillis>`;
- the first matched canonical retrieval entity, when available.

Signal emission remains non-blocking relative to the ticket update.

## 2. Evidence Signal

`emitTicketResolutionSignal()`:

- requires the ticket-knowledge flag;
- takes the last five non-system messages;
- applies the shared support-evidence redactor;
- requires at least 50 characters;
- emits `signalPurpose: ticket_resolution`, ticket ID, lifecycle event ID, subject, message evidence, category, conversation length, and timestamp;
- does not store `resolvedBy`.

The persistent dedup key includes ticket ID plus resolution event ID. The signal payload fingerprint prevents a reused identity from silently accepting changed evidence.

## 3. Cluster Admission

`gatherTicketResolutionClusters()` queries ticket signals from the last 14 days with a 501-row sentinel limit. It fails closed above 500. It admits only:

- `pId: AL`;
- resolved entity IDs;
- unique ticket IDs;
- non-empty sanitized message arrays;
- substantive resolution text;
- clusters with at least three tickets.

At most 50 clusters are returned.

## 4. Target and Pending Proposal Resolution

The extractor queries at most two active canonical answers for the entity:

- none -> new answer;
- one -> content refinement;
- multiple -> skip for owner triage.

It then reads at most 11 pending proposals with a 10-row bound. A compatible proposal must match product, exact scope, entity, status, mutation type, and target answer. A saturated lookup fails closed. An unrelated pending proposal blocks automatic creation.

## 5. Evidence Merge

A compatible merge runs in a Firestore transaction. It:

- rereads and revalidates the proposal;
- adds only new ticket IDs up to 100;
- makes source and signal counts equal the admitted ID list;
- sets draft state back to pending;
- deletes generated title/content/procedure/confidence fields;
- resets top-level extractor score to zero;
- records `ticket_knowledge_evidence_merged` in the same transaction.

This prevents old generated content from remaining approveable after its evidence changes.

## 6. Extraction and Procedure Validation

The prompt wraps product context, ticket evidence, and existing titles in explicit delimiters and tells the model to treat the values as untrusted evidence. The parser validates required strings and bounds. Procedure output is accepted only when it has 1-12 sequential steps, approved action names, bounded text, valid semantic target/event IDs, and bounded warnings/prerequisites.

Invalid procedure output becomes `null`; invalid answer output does not create a proposal.

## 7. Proposal Create

New proposal IDs are deterministic over tenant, store, entity, and sorted ticket IDs. Proposal plus `ticket_knowledge_extracted` audit are batch-created. At most five new ticket-derived proposals are created per tenant run.

Tracked ticket lineage is capped at 100 and counts reflect only the stored IDs.

## 8. Review and Application

The governance UI shows an `Extractor score`, not answer confidence. The founder reviews and edits the proposed answer. Canonical application remains in `governanceServer.ts`; ticket extraction never writes canonical truth directly.

## Privacy Boundary

The shared redactor removes obvious emails, labeled phone numbers, bearer/JWT/prefixed/labeled credentials, control characters, and excess text. It is not complete PII detection. Provider use must remain feature gated and governed by approved retention/data-use policy.

## Tests

See [README.md](./README.md) for the focused contract, rule-emulator, runtime, type, and Functions build gates.
