# SignalDesk Owned Email Sequencer

**Status:** One-step queue implemented; provider send disabled
**Last Updated:** July 21, 2026

## Decision

The owned rail is one low-volume execution step over the already approved email.
It reuses the current SMTP, approval, permission, suppression, sender, CTA,
budget, audit, and webhook boundaries. It is not a campaign automation system.

## Queue Contract

1. Approval and draft are both email and remain current.
2. Contact permission and source policy permit sequencing.
3. Suppression, prior-contact, global, email, and campaign checks are clear.
4. CTA and sender fingerprints match the approved draft.
5. `owned-email` account and email environment are ready.
6. One deterministic handoff and one step are written; approval and draft become queued.

If provider/account/env readiness is missing, the deterministic handoff is
stored as blocked with a bounded reason. An unchanged retry replays without
effects. A readiness change alters the request fingerprint, allowing that same
document to recover to queued state without creating a second handoff.

## Send Contract

`send-owned-sequence-step` requires `message.send`, both feature flags, a due
ready step, current approval/draft/target/contact/CTA/sender authority, provider
account approval, shared owned-email budget capacity, and valid SMTP compliance
configuration. It creates a claim before provider work.

- completed claim: redacted replay, no provider call;
- running or unresolved claim: founder review required;
- provider acknowledgement: exact SMTP provider/message ID required;
- persistence ambiguity: unresolved, never blind retry.

## External Sequencers

Smartlead, Instantly, and Lemlist remain optional handoff identities only. Their
default provider accounts are disabled and no external sequencer API call,
campaign creation, lead upload, warmup, mailbox rotation, or follow-up automation
is implemented.
