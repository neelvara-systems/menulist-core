# SignalDesk Email Rail - Firebase

**Status:** Implemented; no Feature 11 Firebase deployment required
**Last Updated:** July 21, 2026

## Existing Collections

| Collection | Purpose |
| --- | --- |
| `signaldeskSenderDomains` | Compact sender readiness and reputation authority. |
| `signaldeskApprovalQueue` / `signaldeskDraftSummaries` | Human-approved email unit and current state. |
| `signaldeskMessageExports` | Deterministic export, handoff, and sent delivery evidence. |
| `signaldeskSequencerHandoffs` / `signaldeskSequencerSteps` | One-step owned queue and optional external handoff state. |
| `signaldeskConversations` / `signaldeskMessages` | Private inbound/outbound detail. |
| `signaldeskConversationSummaries` | Bounded owner inbox projection. |
| `signaldeskContactIdentities` / `signaldeskSuppressionLedger` | Permissioned recipient authority and hashed suppression. |
| `signaldeskWebhookEvents` | Compact normalized provider event evidence. |
| `signaldeskProviderAccounts` / `signaldeskBudgetPolicies` | Send authority, cap, and spend reservation. |
| `signaldeskAuditEvents` / `signaldeskRunTimelines` / `signaldeskCostDailySummaries` | Audit, operator timeline, and cost estimates. |

There are no `signaldeskEmailActions`, `signaldeskEmailEvents`,
`signaldeskEmailDailySummaries`, or `signaldeskUnsubscribeEvents` collections.
Provider payloads are not moved to Storage by this feature.

## Bounded Operations

| Flow | Current behavior |
| --- | --- |
| Channels read | Parallel bounded recent and actionable status queries; no listener. |
| Manual export | Transaction-current authority reads and a bounded export/conversation/approval/draft/target/audit/cost write set. |
| Owned queue | Current authority reads; one deterministic handoff, optional one step, timeline, audit, and cost effects. |
| Live send | Transactional provider/budget reservation, one external call, then atomic delivery settlement. |
| Webhook | One bounded body, signature check, deterministic event, and only the required conversation/suppression/incident/control effects. |

## Isolation And Retention

- SignalDesk uses its dedicated Firebase project and Admin boundary.
- Firestore rules permit platform-authorized reads and deny all client writes to Email Rail collections.
- Source-derived message exports, handoffs, and steps participate in the consolidated SignalDesk source-data lifecycle scrubber.
- Actionable status queries use automatic single-field indexes; Feature 11 adds no index.

## Deployment

Feature 11 changes the Next.js runtime, docs, and local verifier only. It changes
no SignalDesk Function, Firestore rule/index, or Storage rule, so no Firebase
deployment is required. App/Vercel release remains owner-controlled.
