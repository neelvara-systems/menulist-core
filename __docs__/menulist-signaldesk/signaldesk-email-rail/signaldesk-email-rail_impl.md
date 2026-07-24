# SignalDesk Email Rail - Implementation

**Status:** Implemented locally
**Last Updated:** July 21, 2026

## Runtime

| Boundary | Current implementation |
| --- | --- |
| API | `src/app/api/signaldesk/actions/route.ts` validates action payloads and maps export/send/configure permissions. |
| Workflow | `src/lib/signaldesk/workflowServer.ts` owns current-authority reads and atomic state changes. |
| Provider | `src/lib/signaldesk/providerAdapters.ts` validates SMTP configuration, appends compliance footer, uses bounded timeouts, and validates acknowledgement. |
| Contact | `src/lib/signaldesk/outboundContactContracts.ts` binds recipient to source run, source policy, permission evidence, expiry, and target. |
| UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` exposes desktop controls under matching permissions and an observe-only mobile state. |
| Inbound | `src/app/api/signaldesk/webhooks/[provider]/route.ts` and `src/lib/signaldesk/webhookServer.ts` validate and normalize signed provider events. |

## State Paths

### Manual export

`approved email -> current authority -> deterministic message export -> conversation exported -> approval/draft exported`

The response includes export metadata and approved content for the authorized
operator. Exact replay returns a redacted historical acknowledgement.

### Assisted handoff

`approved channel draft -> current authority -> deterministic message export -> masked recipient preview`

Email uses sender authority. WhatsApp and Instagram additionally require a
current channel window. Messenger is blocked because recipient authority is not
safe for assisted handoff.

### Owned queue and send

`approved email -> provider/account/env checks -> handoff queued -> one ready step -> gated SMTP send`

Queue creation uses a deterministic provider/approval document. A blocked row
replays unchanged, but is re-evaluated when provider readiness changes. Live send
uses a separate pre-provider claim and records `unresolved` after any ambiguous
provider or persistence outcome.

## Sender Contract

The real sender summary contains status, domain, provider, authentication state,
volume-ramp state, bounce rate, complaint rate, unsubscribe readiness, brand
risk, and update time. It does not store the obsolete per-protocol SPF/DKIM/DMARC
fields described by the initial planning document.

A ready sender is bound into the draft by ID and a SHA-256 fingerprint. Any
sender-state change invalidates downstream current authority and requires a new
draft/approval before new execution.

## Workspace Reachability

Channels performs bounded prioritized reads:

- up to 30 approved actions plus recent approval history;
- up to 30 queued/ready handoffs plus recent handoff history;
- up to 30 ready/queued steps plus recent step history.

All rows pass the strict workspace projector. Automatic single-field `status`
indexes support the priority queries.

## Runtime Flags

- `ENABLE_MENULIST_SIGNALDESK_EMAIL_RAIL`: feature surface.
- `ENABLE_MENULIST_SIGNALDESK_ASSISTED_CHANNELS`: assisted handoff.
- `ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER`: owned queue creation.
- `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND`: actual provider execution; currently `false`.
