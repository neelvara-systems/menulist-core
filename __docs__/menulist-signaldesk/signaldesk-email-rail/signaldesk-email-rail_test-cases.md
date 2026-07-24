# SignalDesk Email Rail - Test Cases

**Status:** Current regression matrix
**Last Updated:** July 21, 2026

## Focused Gate

```bash
npm run test:signaldesk:email-rail-boundary
```

## Required Cases

| Area | Expected |
| --- | --- |
| Cross-channel approval/draft | Export, sequencer, and direct email send fail before provider work. |
| Current recipient revoked/replaced | Export, handoff, queue, and send fail; historical replay remains redacted. |
| Sender changed after approval | New action fails with stale sender authority. |
| CTA changed after approval | New action fails; completed historical replay reports current authority false. |
| Concurrent export/handoff/queue/send | One deterministic effect; no duplicate provider call. |
| Blocked handoff unchanged | Redacted/idempotent replay with no repeated audit or cost. |
| Provider readiness changes | Same blocked handoff re-evaluates and queues in place. |
| Provider success then persistence ambiguity | Claim becomes unresolved; retry does not call provider again. |
| SMTP config | From-domain, Reply-To, port, TLS mode, physical address, unsubscribe URL, timeout, envelope, and acknowledgement validation fail closed. |
| Shared provider/budget cap | Concurrent direct and sequence sends cannot exceed the same owned-email sender authority. |
| Terminal-history pressure | Approved actions and queued/ready handoffs/steps remain visible in Channels. |
| Permissions/mobile | Export, send, sender config, and all mobile mutations are disabled unless explicitly authorized. |
| Webhook | Invalid signature is rejected; unsubscribe/bounce/complaint creates required suppression/incident/pause effects exactly once. |
| Firestore | Clients can read only with SD platform authority and cannot write any Email Rail collection. |

## Adjacent Gates

- `npm run verify:signaldesk`
- `npm run test:signaldesk:outbound-contact-contracts`
- `npm run test:signaldesk:workspace-contracts`
- `npm run test:signaldesk:workspace-client-contracts`
- `npm run test:signaldesk:action-client-contracts`
- `npm run test:signaldesk:access-boundary`
- `npm run test:signaldesk:source-data-lifecycle`
- `npm run verify:dependency-freeze`
- `npm run typecheck`
