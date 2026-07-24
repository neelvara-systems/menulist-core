# SignalDesk Draft Control - Specification

**Status:** Implemented and locally verified
**Last Updated:** July 21, 2026

## Contract

Draft Control prepares a bounded email message for human review from current,
permissioned SignalDesk truth. It is not a freeform writer and grants no send
authority.

## Admission

A new draft requires all of the following at transaction time:

1. Active target source lifecycle and matching current source policy.
2. Policy permission for evidence, personalization, contact, and email.
3. Current evidence identity for the target truth, including suppression state.
4. Evidence use containing `draft-personalization`.
5. Clear suppression, eligible segment/action, and no prior contact or outcome.
6. Exact current contact identity permitted by policy.
7. Active email template with only supported, declared variables.
8. No deterministic prohibited-claim match in rendered subject/body.
9. Current authoritative preview CTA and ready sender domain.

## Output

One successful new action atomically creates:

- `signaldeskDraftSummaries/{draftId}`;
- `signaldeskApprovalQueue/{approvalId}`;
- `signaldeskApprovalPackets/{approvalPacketId}`;
- target progression to `approve`;
- audit, timeline, queue-summary, and daily-cost evidence.

The draft binds evidence ID, CTA ID/fingerprint, contact identity/fingerprint,
sender ID/fingerprint, template ID/fingerprint, exact subject/body, and approved
personalization evidence references. Private contact bindings are stored
server-side but excluded from projected client DTOs.

## Template Rules

- Current channel must be `email`.
- Supported variables are `businessName`, `category`, `city`, `opportunity`, and `proofCta`.
- Every used variable must be supported and declared in `approvedVariables`.
- Unresolved braces or undeclared variables fail before writes.
- Active template authority is fingerprinted; deactivation or content/variable drift blocks later approval.

## Idempotency

Identity is content-addressed from rendered content plus current evidence,
policy, contact, CTA, sender, target, and template authority. Exact and concurrent
requests return one durable triad. A partial triad fails closed as
`DRAFT_REPLAY_INCOMPLETE`; it is never silently repaired.

## Non-Goals

- AI-generated or freeform drafts.
- Template editing/version history UI.
- WhatsApp, Instagram, Messenger, or cold-DM drafts.
- Automatic approval, export, contact, or provider send.
- A new draft-detail or guardrail-event collection.
