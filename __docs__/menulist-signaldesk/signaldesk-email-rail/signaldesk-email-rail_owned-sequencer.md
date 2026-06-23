# SignalDesk Owned Email Sequencer

**Status:** Implemented as a gated internal queue
**Created:** June 23, 2026
**Scope:** Self-owned low-volume email execution rail for approved SignalDesk messages.

## Decision

SignalDesk should first do what can be safely owned in-house before depending on Smartlead or another sequencer.

The owned rail is feasible for MenuList's first controlled outbound loop because the requirement is not high-volume cold blasting. The requirement is:

```txt
approved target -> approved evidence-bound draft -> ready sender domain -> queued email step -> owner-visible send state -> reply/suppression/outcome tracking
```

Smartlead remains an optional future execution rail for mailbox rotation, warmup, large-volume sequencing, and deeper deliverability automation. It is not required for the first internal MenuList growth loop.

## What Is Implemented

| Area | Runtime |
| --- | --- |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER` enables owned queue creation. |
| Provider identity | `owned-email` is an internal sequencer provider, not an external account. |
| Queue ledger | `signaldeskSequencerHandoffs` stores owned queue state, sender domain, target, approval, next send, and status. |
| Step ledger | `signaldeskSequencerSteps` stores the approved email step, subject, body preview, schedule, sent status, and target link. |
| Sender readiness | Queue creation requires a ready sender domain and configured email compliance env before the owned step becomes queued. |
| Approval guard | Queue creation requires an approved draft and reuses existing suppression, contact-use, evidence, prior-contact, global pause, and email pause checks. |
| Campaign pause | `campaign` scoped pause blocks owned sequence creation and send execution. |
| Actual send | `send-owned-sequence-step` sends the ready owned step only when `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` is enabled and email env is configured. |
| Reply safety | Existing email webhook/manual reply paths update inbox and contact-scoped suppression records. |

## Guard Sequence

1. Approved email draft exists.
2. Evidence packet exists and draft is approved.
3. Target source policy allows contact use.
4. Target is not suppressed.
5. Target has no prior contact, reply, conversion, or outcome.
6. Global outbound, email, and campaign pauses are clear.
7. Sender domain is active, authenticated, unsubscribe-ready, and not high-risk.
8. Email provider env has SMTP, from address, physical address, and unsubscribe URL.
9. Owned step is queued with audit and timeline.
10. Send step runs only behind the existing provider-send gate.

## Why Not Build Full Smartlead Internally Yet

The following are not implemented in the owned rail:

- mailbox warmup;
- mailbox rotation;
- automated multi-step follow-up generation;
- deliverability network;
- inbox placement testing;
- provider-side campaign analytics;
- large-volume sending.

Those are the reasons Smartlead or a similar product can still be useful later. For the first MenuList-owned loop, the owned rail is enough because the founder needs control, evidence, and activation attribution before volume.

## Current Boundary

The owned rail is low-volume and approval-first. It is not a bulk campaign engine.

Do not increase volume until bounce, complaint, unsubscribe, sender-domain, and reply classification summaries prove the channel is safe.
