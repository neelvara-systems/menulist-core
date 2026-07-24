# SignalDesk Draft Control - Test Cases

**Status:** Implemented regression matrix
**Last Updated:** July 21, 2026

## Focused Gate

`npm run test:signaldesk:draft-control-boundary`

| Case | Expected |
| --- | --- |
| Current valid target/evidence/template/CTA/sender | One queued draft, pending approval, and approval packet. |
| Exact or concurrent retry | Same three IDs; no repeated queue, audit, timeline, or cost effect. |
| Partial durable triad | `DRAFT_REPLAY_INCOMPLETE`. |
| Non-email template | `DRAFT_TEMPLATE_CHANNEL_INVALID`; no draft effects. |
| Unsupported or undeclared variable | `DRAFT_TEMPLATE_VARIABLE_INVALID`; no draft effects. |
| Prohibited rendered claim | `DRAFT_UNSUPPORTED_CLAIMS`; no draft effects. |
| Target truth changes after evidence | `DRAFT_EVIDENCE_LINEAGE_STALE`. |
| Evidence lacks personalization use | Draft rejected. |
| Policy expired/review-required or disallows contact/personalization/email | Draft rejected before effects. |
| Suppression, held/rejected segment, prior contact, or prior outcome | Draft rejected. |
| Contact identity or permission binding changed | Draft rejected. |
| CTA or sender changed during settlement | Transaction retries and rejects stale authority. |
| Template changed or deactivated before approval | `DRAFT_TEMPLATE_AUTHORITY_STALE`. |
| Unsupported claim injected into stored draft | Approval remains pending and records a block audit. |
| Newer draft supersedes pending draft | Older approval cannot advance. |
| Mobile action | Rejected by UI and API guard. |

## Cross-Feature Gates

- `npm run verify:signaldesk`
- `npm run test:signaldesk:workspace-contracts`
- `npm run test:signaldesk:workspace-client-contracts`
- `npm run test:signaldesk:action-client-contracts`
- `npm run test:signaldesk:source-data-lifecycle`
- `npm run typecheck`
- focused ESLint and `git diff --check`

Provider sending is not part of this feature's success path and must remain off.
