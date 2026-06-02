# Growth Engine - Connections And Activation Screen

**Status:** Planning screen spec
**Audience:** Founder, admin, growth manager, compliance reviewer, incident owner
**Route intent:** Internal Growth Engine admin only
**Purpose:** Define the screen where Growth Engine provider adapters, credentials, sender identities, webhooks, budgets, and activation gates are configured.

---

## 1. Verdict

Growth Engine needs one internal screen named:

```txt
Connections And Activation
```

This screen is the provider control plane. It is where an admin wires the low-level adapters that Growth Engine may use:

- source adapters such as manual CSV, Google Places, Foursquare, and approved data providers
- email delivery adapters for the email pipeline
- WhatsApp Business Platform or approved WhatsApp provider adapters
- webhook endpoints for email, WhatsApp, source providers, and discovery systems
- discovery adapters such as IndexNow or menu-feed export destinations
- AI and analytics adapters where they are approved for Growth Engine use

Before this screen is implemented, review [Implementation Readiness](./growth-engine_implementation-readiness.md). It defines the route inventory, screen states, RBAC, flags, environment keys, Firestore rules/indexes, seed config, API guards, UI guards, tests, and stop conditions for the whole Growth Engine runtime.

It must not become a normal settings page that stores keys and lets operators send immediately. A configured key is not an active pipeline.

The screen must enforce this rule:

```txt
adapter configured
-> secret stored safely
-> policy attached
-> validation run passed
-> webhook healthy where needed
-> budget cap attached
-> kill switch attached
-> activation review approved
-> pipeline active
```

No source run, email send, WhatsApp send, discovery job, or AI/provider call can run from credentials alone.

## 2. Product Boundary

Connections And Activation belongs to Growth Engine only.

It does not configure:

- MenuList owner settings
- MenuList billing
- MenuList menu output
- GrowthOS/Growth Kits
- KitStamp
- public customer channels

It configures internal Growth Engine adapters only. MenuList remains the public truth system. Growth Engine remains the internal distribution control system.

## 3. Screen Location

Recommended internal route:

```txt
/growth-engine/connections
```

This route must be:

- internal/admin only
- excluded from public website navigation
- excluded from sitemap and public discovery
- unavailable to MenuList owners and customers
- feature-flagged off until the Growth Engine product boundary is implemented

The screen reads summary and policy documents. It must not read raw webhook payload streams or expose plaintext secrets.

## 4. Primary Jobs

The screen answers seven operator questions:

| Question | Screen answer |
| --- | --- |
| Which adapters exist? | Adapter registry with IDs, provider, status, owner, and allowed pipeline use. |
| Are credentials present? | Secret reference status, fingerprint, rotation state, and validation result. |
| Is email ready? | Sender domain, DNS, unsubscribe, bounce/complaint webhook, provider, ramp, and spam-rate state. |
| Is WhatsApp ready? | WABA, phone-number ID, templates, opt-in policy, conversation state, webhook, sender quality, and governance state. |
| Are webhooks healthy? | Endpoint, signature validation, latest accepted event, replay, dead-letter, and incident status. |
| Can a pipeline activate? | Activation checks show passed, failed, held, or review-required gates. |
| Can we stop quickly? | Global, provider, channel, sender, template, and webhook kill switches are visible. |

## 5. Roles And Permissions

| Role | Allowed | Blocked |
| --- | --- | --- |
| Viewer | Read masked connection status and health. | Cannot reveal, add, rotate, activate, or pause. |
| Operator | Read status, open work items, mark operational notes. | Cannot add keys, activate pipelines, change sender identity, or approve policy. |
| Growth manager | Configure non-secret metadata, request validation, request activation, pause non-critical adapters. | Cannot view plaintext secrets or bypass compliance blockers. |
| Admin | Add secret values, rotate secret refs, activate ready connections, pause providers. | Cannot bypass source/channel policy, suppression, webhook, or governance blockers. |
| Compliance reviewer | Approve source/channel/legal readiness and activation review. | Cannot add provider secrets unless also admin. |
| Incident owner | Pause or block adapters, senders, templates, webhooks, or entire channels during incidents. | Cannot use incident power to activate a blocked connection. |

Every mutation writes an audit event with actor, role, before state, after state, reason, and linked work item or incident.

## 6. Connection Lifecycle

Use these lifecycle states:

| State | Meaning |
| --- | --- |
| `draft` | Metadata exists, but connection is not usable. |
| `needs_validation` | Required fields or validation checks are missing. |
| `ready_for_review` | Technical checks passed, but approval is pending. |
| `active` | Connection can be used by approved workers through policy and budget gates. |
| `paused` | Temporarily unavailable; existing jobs must hold or retry by policy. |
| `blocked` | Unavailable due to policy, incident, provider, webhook, or security issue. |
| `retired` | Kept for audit; cannot be used again. |

Only `active` connections can be selected by workflows, send jobs, source runs, discovery jobs, or AI workers.

## 7. Screen Layout

### Header

Shows:

- product name: Growth Engine
- screen name: Connections And Activation
- current environment: `dev`, `qa`, or `prod`
- global outbound status
- active incident count
- provider spend status
- latest validation time

Primary actions:

- Add adapter
- Add email pipeline
- Add WhatsApp pipeline
- Add webhook
- Run validation
- Pause all providers

Destructive actions require confirmation and reason.

### Overview Tab

Cards:

- active adapters
- blocked adapters
- email readiness
- WhatsApp readiness
- webhook health
- secret rotation due
- provider spend risk
- kill switches active

Tables:

- Connections needing review
- Failed validations
- Webhooks failing signature or delivery checks
- Senders/templates/providers paused by reputation

### Adapter Registry Tab

This is the source of adapter IDs.

Required columns:

- adapter ID
- adapter type
- provider
- environment
- lifecycle state
- connected pipeline
- policy record
- secret state
- webhook state
- budget policy
- kill-switch scope
- owner role
- latest validation

Example adapter IDs:

```txt
ge_source_manual_csv_primary
ge_source_google_places_candidate
ge_source_foursquare_identity
ge_email_ses_primary
ge_email_resend_test
ge_whatsapp_menulist_primary
ge_discovery_indexnow_primary
ge_ai_openai_primary
```

Adapter IDs must be stable and human-readable. Do not use random provider IDs as Growth Engine adapter IDs.

### Email Pipeline Tab

Configures the email pipeline.

Required fields:

| Field | Purpose |
| --- | --- |
| Email pipeline ID | Stable Growth Engine pipeline handle. |
| Adapter ID | Links to provider adapter such as SES or Resend. |
| Provider account reference | Provider account or account alias, not secret. |
| Sender domain | Dedicated Growth Engine domain or subdomain. |
| From address | Approved sender address. |
| Display name | Clear sender identity. |
| Reply-to address | Inbox or route for owner replies. |
| Return-path domain | Bounce domain when provider supports it. |
| API key secret ref | Secret Manager or approved vault reference. |
| Region | Provider region when relevant. |
| SPF status | Valid, invalid, missing, or not applicable. |
| DKIM status | Valid, invalid, missing, or not applicable. |
| DMARC status | Valid, invalid, missing, or not applicable. |
| PTR/TLS status | Valid, invalid, missing, or not applicable. |
| One-click unsubscribe endpoint | Required for subscribed or marketing sends where policy requires it. |
| Visible unsubscribe policy | Message footer/body unsubscribe requirement. |
| Bounce webhook | Provider bounce endpoint and signature status. |
| Complaint webhook | Provider complaint endpoint and signature status. |
| Physical address profile | Required where commercial email policy requires business address. |
| Daily send cap | Hard cap for the sender domain. |
| Ramp policy | Controlled increase plan based on reputation and engagement. |
| Spam-rate warning | Threshold that creates alert or throttle. |
| Spam-rate block | Threshold that blocks sends. |
| Allowed use cases | Claim route, public-info correction, onboarding recovery, support, freshness, or internal test. |

Email cannot activate unless:

- sender domain is dedicated to Growth Engine or explicitly approved
- SPF or DKIM meets all-sender requirements
- SPF, DKIM, and DMARC meet bulk-sender requirements before higher-volume sends
- unsubscribe endpoint works where required
- bounce and complaint webhooks are verified
- suppression ledger is attached
- sender assignment policy is attached
- budget policy is attached
- email kill switch exists
- at least one internal test send succeeds
- compliance reviewer approves the channel policy

This follows the current Gmail sender guidance: authentication, spam-rate discipline, easy unsubscribe, accurate sender identity, and slow volume increase are operational requirements, not optional polish.

### WhatsApp Pipeline Tab

Configures WhatsApp as a governed owner-verification and truth-maintenance rail.

Required fields:

| Field | Purpose |
| --- | --- |
| WhatsApp pipeline ID | Stable Growth Engine pipeline handle. |
| Adapter ID | Links to `ge_whatsapp_*` adapter. |
| Provider mode | `meta_cloud_api` or approved provider adapter. |
| WABA ID | WhatsApp Business Account identifier. |
| Phone-number ID | Meta phone-number ID used by Cloud API. |
| Display phone number | Masked display number. |
| Business display name | WhatsApp business sender name. |
| Access-token secret ref | Server-only secret reference. |
| App-secret ref | Used for webhook/signature verification where applicable. |
| Webhook verify-token ref | Server-only verification secret. |
| API version | Current configured Meta API version. |
| Callback URL | Growth Engine webhook endpoint. |
| Sender identity ID | Internal sender identity used for assignment and reputation. |
| Allowed use cases | Owner claim, verification, correction, claim recovery, stale-data confirmation, support, owner referral. |
| Opt-in policy ID | Consent policy attached to this sender. |
| Template sync state | Approved, pending, paused, disabled, rejected, or out of sync. |
| Conversation-state support | Required before API outbound. |
| Reputation snapshot | Sender/template quality and action decision. |
| Flow definitions | Approved structured truth-capture Flows. |
| Daily send cap | Internal cap below provider capacity. |
| Provider spend cap | WhatsApp provider cost cap. |

WhatsApp cannot activate for API outbound unless:

- opt-in model is approved
- public/enriched/source phone numbers are blocked from WhatsApp eligibility
- suppression ledger is attached
- approved templates exist for intended use cases
- conversation-state engine is enabled
- webhook endpoint is signature-verified and healthy
- sender identity is MenuList-owned for MenuList truth workflows
- sender/template quality is not low, paused, or disabled
- pacing policy is attached
- budget policy is attached
- WhatsApp kill switches exist
- governance audit route is available
- compliance reviewer approves the channel policy

The WhatsApp tab must show a hard warning:

```txt
Phone number availability is not WhatsApp opt-in.
```

### Webhooks Tab

Configures inbound events.

Webhook records must show:

- webhook endpoint ID
- provider
- adapter ID
- endpoint URL
- signing secret ref
- expected event types
- latest accepted event
- latest rejected event
- signature validation status
- retry policy
- dead-letter count
- replay availability
- raw payload retention
- linked incident, if any

Supported webhook groups:

- email bounce
- email complaint
- email unsubscribe
- email reply
- WhatsApp message status
- WhatsApp inbound reply
- WhatsApp template status
- WhatsApp Flow submission
- source provider completion
- discovery provider completion

Raw webhook payloads must not be normal dashboard data. Store compact normalized events in Firestore and use short-retention Storage refs for raw payloads where audit requires them.

### Budgets And Kill Switches Tab

Shows all spend and emergency controls tied to connections:

- source provider budget
- email provider budget
- WhatsApp provider budget
- AI provider budget
- per-run request cap
- per-day provider cap
- per-sender cap
- per-template cap
- per-webhook replay cap
- global outbound kill switch
- provider kill switch
- channel kill switch
- sender kill switch
- template kill switch
- webhook kill switch

No active connection can exist without a kill-switch scope.

### Audit Tab

Shows:

- credential added
- secret rotated
- validation requested
- validation passed
- validation failed
- activation requested
- activation approved
- activation blocked
- connection paused
- connection resumed
- connection retired
- webhook rejected
- budget cap changed
- kill switch changed

Audit rows must include actor, role, timestamp, reason, target connection, before state, after state, and linked incident or work item.

## 8. Secret Handling

Secrets are never stored as plaintext in Firestore.

The UI may accept a secret value only inside a secure submit flow. After submit:

1. Server validates role and CSRF/session state.
2. Secret is stored in Secret Manager or an approved server-only vault.
3. Firestore stores only a reference, fingerprint, last four characters where safe, version, and rotation metadata.
4. Secret value is not returned to the browser.
5. Secret reveal is not supported.
6. Rotation creates a new secret version and validation run.
7. Retired secrets remain audit-visible by reference only.

Required secret reference fields:

```ts
type GrowthConnectionSecretRef = {
  secretRefId: string;
  adapterId: string;
  provider: string;
  purpose:
    | 'api_key'
    | 'smtp_password'
    | 'access_token'
    | 'app_secret'
    | 'webhook_verify_token'
    | 'signing_secret';
  vault: 'secret_manager' | 'approved_server_vault';
  secretPath: string;
  fingerprint: string;
  lastFour?: string;
  version: string;
  status: 'active' | 'rotating' | 'retired' | 'blocked';
  createdBy: string;
  createdAt: string;
  rotatesAt?: string;
  retiredAt?: string;
};
```

## 9. Data Contracts

### Connection Adapter

```ts
type GrowthConnectionAdapter = {
  adapterId: string;
  productCode: 'GE';
  environment: 'dev' | 'qa' | 'prod';
  adapterType:
    | 'source'
    | 'email'
    | 'whatsapp'
    | 'discovery'
    | 'ai'
    | 'analytics'
    | 'storage';
  provider:
    | 'manual_csv'
    | 'google_places'
    | 'foursquare'
    | 'ses'
    | 'resend'
    | 'meta_whatsapp_cloud_api'
    | 'indexnow'
    | 'openai'
    | 'bigquery'
    | 'firebase'
    | 'other';
  displayName: string;
  lifecycle: 'draft' | 'needs_validation' | 'ready_for_review' | 'active' | 'paused' | 'blocked' | 'retired';
  policyIds: string[];
  secretRefIds: string[];
  webhookEndpointIds: string[];
  budgetPolicyId: string;
  killSwitchScopeId: string;
  ownerRole: 'growth_manager' | 'admin' | 'compliance_reviewer' | 'incident_owner';
  allowedPipelineIds: string[];
  blockers: string[];
  lastValidatedAt?: string;
  updatedAt: string;
};
```

### Pipeline Connection

```ts
type GrowthPipelineConnection = {
  pipelineConnectionId: string;
  adapterId: string;
  pipelineType: 'source_import' | 'email_send' | 'whatsapp_send' | 'webhook_ingest' | 'discovery_publish' | 'ai_worker';
  lifecycle: GrowthConnectionAdapter['lifecycle'];
  activationChecks: GrowthConnectionActivationCheck[];
  activatedBy?: string;
  activatedAt?: string;
  pausedBy?: string;
  pausedAt?: string;
  updatedAt: string;
};
```

### Activation Check

```ts
type GrowthConnectionActivationCheck = {
  checkId: string;
  connectionId: string;
  checkType:
    | 'policy'
    | 'secret'
    | 'dns'
    | 'webhook'
    | 'suppression'
    | 'template'
    | 'conversation_state'
    | 'reputation'
    | 'budget'
    | 'kill_switch'
    | 'test_send'
    | 'compliance_review';
  status: 'passed' | 'failed' | 'held' | 'not_applicable';
  evidenceRef?: string;
  message: string;
  checkedAt: string;
};
```

### Email Pipeline Connection

```ts
type GrowthEmailPipelineConnection = {
  pipelineConnectionId: string;
  adapterId: string;
  provider: 'ses' | 'resend' | 'other';
  senderDomainId: string;
  senderDomain: string;
  fromAddress: string;
  displayName: string;
  replyToAddress: string;
  returnPathDomain?: string;
  apiSecretRefId: string;
  region?: string;
  spfStatus: 'missing' | 'valid' | 'invalid' | 'not_applicable';
  dkimStatus: 'missing' | 'valid' | 'invalid' | 'not_applicable';
  dmarcStatus: 'missing' | 'valid' | 'invalid' | 'not_applicable';
  ptrStatus: 'missing' | 'valid' | 'invalid' | 'not_applicable';
  tlsStatus: 'missing' | 'valid' | 'invalid' | 'not_applicable';
  unsubscribeEndpointId: string;
  bounceWebhookEndpointId: string;
  complaintWebhookEndpointId: string;
  dailySendCap: number;
  spamRateWarningAtPercent: number;
  spamRateBlockAtPercent: number;
  allowedUseCases: string[];
  lifecycle: GrowthConnectionAdapter['lifecycle'];
  updatedAt: string;
};
```

### WhatsApp Pipeline Connection

```ts
type GrowthWhatsAppPipelineConnection = {
  pipelineConnectionId: string;
  adapterId: string;
  providerMode: 'meta_cloud_api' | 'approved_provider_adapter';
  wabaId: string;
  phoneNumberId: string;
  displayPhoneMasked: string;
  businessDisplayName: string;
  accessTokenSecretRefId: string;
  appSecretRefId?: string;
  webhookVerifyTokenSecretRefId: string;
  apiVersion: string;
  callbackUrl: string;
  senderIdentityId: string;
  optInPolicyId: string;
  allowedUseCases:
    | 'owner_claim'
    | 'business_verification'
    | 'public_info_correction'
    | 'claim_recovery'
    | 'stale_data_confirmation'
    | 'support_handoff'
    | 'owner_referral';
  templateSyncStatus: 'not_synced' | 'synced' | 'out_of_sync' | 'blocked';
  conversationStateEnabled: boolean;
  webhookEndpointId: string;
  flowDefinitionIds: string[];
  dailySendCap: number;
  lifecycle: GrowthConnectionAdapter['lifecycle'];
  updatedAt: string;
};
```

### Webhook Endpoint

```ts
type GrowthWebhookEndpoint = {
  webhookEndpointId: string;
  adapterId: string;
  provider: string;
  endpointPath: string;
  signingSecretRefId?: string;
  expectedEvents: string[];
  signatureStatus: 'not_configured' | 'valid' | 'invalid' | 'failing';
  latestAcceptedAt?: string;
  latestRejectedAt?: string;
  deadLetterCount: number;
  rawPayloadRetentionDays: number;
  lifecycle: GrowthConnectionAdapter['lifecycle'];
  updatedAt: string;
};
```

### Validation Run

```ts
type GrowthConnectionValidationRun = {
  validationRunId: string;
  adapterId: string;
  requestedBy: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'held';
  checks: GrowthConnectionActivationCheck[];
  blockers: string[];
  startedAt: string;
  completedAt?: string;
};
```

### Audit Event

```ts
type GrowthConnectionAuditEvent = {
  auditEventId: string;
  adapterId: string;
  actorId: string;
  actorRole: string;
  action:
    | 'adapter_created'
    | 'metadata_updated'
    | 'secret_added'
    | 'secret_rotated'
    | 'validation_requested'
    | 'validation_passed'
    | 'validation_failed'
    | 'activation_requested'
    | 'activation_approved'
    | 'activation_blocked'
    | 'connection_paused'
    | 'connection_resumed'
    | 'connection_retired'
    | 'kill_switch_changed';
  reason: string;
  beforeState?: string;
  afterState?: string;
  incidentId?: string;
  workItemId?: string;
  createdAt: string;
};
```

## 10. Firestore Collections

Hot operational:

- `growthEngineConnectionAdapters`
- `growthEnginePipelineConnections`
- `growthEngineEmailPipelineConnections`
- `growthEngineWhatsAppPipelineConnections`
- `growthEngineWebhookEndpoints`
- `growthEngineConnectionValidationRuns`
- `growthEngineConnectionHealthSummaries`
- `growthEngineConnectionSecrets`

Warm/cold:

- `growthEngineConnectionAuditEvents`
- `growthEngineConnectionValidationEvents`
- `growthEngineConnectionIncidentLinks`

`growthEngineConnectionSecrets` stores references only. It must not store plaintext credential values.

## 11. API Surface

All routes require internal/admin auth, role gates, Zod validation, secure logging, rate limits, and product-scoped Growth Engine Firebase access.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/growth-engine/connections/adapters` | GET/POST/PATCH | Manage adapter metadata and lifecycle. |
| `/api/growth-engine/connections/secrets` | POST | Store or rotate server-only secret refs. Never returns plaintext. |
| `/api/growth-engine/connections/validate` | POST | Run technical and policy validation for an adapter or pipeline. |
| `/api/growth-engine/connections/activate` | POST | Activate only after all checks pass and approval exists. |
| `/api/growth-engine/connections/pause` | POST | Pause adapter, pipeline, provider, sender, or webhook. |
| `/api/growth-engine/connections/email` | GET/POST/PATCH | Manage email pipeline metadata and readiness. |
| `/api/growth-engine/connections/whatsapp` | GET/POST/PATCH | Manage WhatsApp pipeline metadata and readiness. |
| `/api/growth-engine/connections/webhooks` | GET/POST/PATCH | Manage webhook endpoint metadata, signatures, and health. |
| `/api/growth-engine/connections/audit` | GET | Read bounded audit events. |

## 12. Worker Requirements

Workers needed:

- connection validation runner
- secret rotation reminder
- email DNS/readiness checker
- email bounce/complaint webhook checker
- WhatsApp template sync checker
- WhatsApp sender/reputation checker
- WhatsApp webhook health checker
- webhook dead-letter router
- connection health summary rollup
- activation blocker router

Workers must not pull plaintext secrets into logs. Secret access must happen inside provider call boundaries only.

## 13. Activation Gate Matrix

| Pipeline | Required checks before active |
| --- | --- |
| Source import | Source policy, provider register, field allowlist, budget cap, raw payload retention, kill switch, validation run. |
| Email send | Sender domain, SPF/DKIM/DMARC readiness, unsubscribe, bounce/complaint webhooks, suppression, sender assignment, budget, kill switch, internal test send, approval. |
| WhatsApp send | Opt-in policy, suppression, approved templates, conversation-state engine, webhook signature health, sender identity, reputation, pacing, budget, kill switch, governance audit, approval. |
| Webhook ingest | Endpoint route, signing secret where provider supports it, event allowlist, replay policy, raw payload retention, dead-letter queue, validation run. |
| Discovery publish | Confirmed public truth source, discovery policy, provider adapter, budget, kill switch, idempotency key, validation run. |
| AI worker | Provider register, model policy, prompt/version registry, eval status, budget, input minimization, kill switch, validation run. |

## 14. UI Guardrails

- No send button appears on this screen.
- No source-run launch button appears until source policy and adapter activation pass.
- No plaintext key is visible after submit.
- No WhatsApp phone number is considered opt-in.
- No email pipeline can activate with missing unsubscribe or bounce handling.
- No WhatsApp pipeline can activate without templates, opt-in, conversation state, webhook health, and governance audit.
- No provider can activate without budget cap and kill switch.
- No operator can bypass failed validation by editing the lifecycle state manually.
- No mobile view can add, rotate, reveal, or activate connections.

## 15. Acceptance Criteria

The screen is implementation-ready when docs and code support these conditions:

- Adapter registry can create stable adapter IDs.
- Secret entry writes server-only secret refs and never returns plaintext.
- Email pipeline records sender domain, DNS readiness, unsubscribe, bounce, complaint, budget, and sender identity state.
- WhatsApp pipeline records WABA ID, phone-number ID, sender identity, token refs, webhook refs, opt-in policy, template state, conversation-state support, Flow definitions, and reputation state.
- Webhook panel rejects unsigned or invalid provider events where provider signatures are supported.
- Activation cannot happen with missing policy, secret, budget, kill switch, validation, webhook, suppression, or compliance review.
- Activation cannot happen from key presence alone.
- All activation, pause, rotation, and validation events are audited.
- Dashboards read connection summaries, not raw webhook/event streams.
- Mobile can view emergency summaries only and cannot mutate connection state.

## 16. Final Decision

Connections And Activation is mandatory before Growth Engine provider execution.

Growth Engine should not start source imports, email sends, WhatsApp API sends, discovery jobs, or AI provider calls until this screen and its underlying registry exist.

The product should feel like an activation control room, not a place to paste API keys and start sending.
