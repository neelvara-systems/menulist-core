# SignalDesk Email Rail - Specification

**Status:** Locally source-complete; provider send disabled
**Last Updated:** July 21, 2026

## Scope

Email Rail covers sender-domain authority, approved email export, assisted email
handoff, one owned sequence step, gated SMTP execution, delivery/reply webhook
normalization, suppression, incident pause, and owner-visible channel state.

It excludes bulk blasting, automatic follow-ups, mailbox warmup or rotation,
external sequencer API execution, auto-approval, and mobile mutation.

## Requirements

| ID | Requirement |
| --- | --- |
| SDEMAIL-R001 | Export, handoff, queue, and send require the current approved email draft and target lineage. |
| SDEMAIL-R002 | Contact permission, source-policy use/retention, suppression, prior contact, CTA, and sender authority are checked transaction-current. |
| SDEMAIL-R003 | The approved channel and draft channel must both be `email`; cross-channel reuse fails before provider work. |
| SDEMAIL-R004 | Sender state must be active, authenticated, unsubscribe-ready, low-risk, and in a low-volume or ready ramp state. |
| SDEMAIL-R005 | SMTP execution additionally requires configured From-domain authority, physical address, unsubscribe URL, bounded TLS settings, provider account, budget, and the provider-send flag. |
| SDEMAIL-R006 | Global, email, and campaign pauses stop the relevant export/sequence path. |
| SDEMAIL-R007 | Deterministic operation identities prevent duplicate export, handoff, queue, send, audit, and provider effects. |
| SDEMAIL-R008 | Ambiguous provider outcomes become unresolved and cannot be retried automatically. |
| SDEMAIL-R009 | Bounce, complaint, unsubscribe, DNC, privacy, and legal events use the signed webhook/suppression/incident boundary. |
| SDEMAIL-R010 | Actionable approved/queued/ready work remains reachable ahead of terminal history. |

## Acceptance

- Manual export never calls SMTP.
- Provider send is unavailable in the current product configuration.
- A changed recipient, sender, CTA, draft, policy, suppression state, or prior outcome invalidates current authority.
- Completed replay returns identifiers/status only; recipient, subject, and body are not returned.
- Permission-limited users do not see enabled controls that the API will reject.
- No client can write Email Rail ledgers directly.
