# Growth Engine - Implementation Readiness

**Status:** Implementation readiness contract
**Decision date:** June 2, 2026
**Audience:** Founder, implementer, reviewer, QA, compliance reviewer
**Purpose:** Confirm that Growth Engine docs cover every required implementation angle before code is started.

---

## 1. Readiness Verdict

The documentation is ready for implementation if code follows this contract.

Nothing should be built as an isolated sender, scraper, CRM, or settings page. The implementation must build Growth Engine as an internal control room with:

- separate product boundary
- separate Firebase project
- internal/admin routes only
- Connections And Activation before provider execution
- source policy before imports
- channel policy before campaigns
- suppression before any send
- Business Truth Graph before public distribution
- decision snapshot before material actions
- dry-run before campaigns
- owner-confirmed or approved MenuList-verified truth before public surfaces
- incident and kill-switch controls before any provider worker can run

The only remaining non-code prerequisites are external business actions:

- secure the final product name if `MenuNexus` is used
- create Growth Engine Firebase projects
- create or approve provider accounts
- complete legal/compliance review for jurisdictions and channels
- create verified sender domains, WABA/WhatsApp number, and source-provider accounts
- prove MenuList with real production owners before enabling aggregator-style public listing outreach, broad source-provider acquisition runs, or cold WhatsApp/public-phone execution paths

Those are operational prerequisites, not missing product docs.

## 2. Implementation Entry Contract

Start from these docs in this order:

1. [README](./README.md)
2. [Product Specification](./growth-engine_spec.md)
3. [Implementation Plan](./growth-engine_impl.md)
4. [Connections And Activation Screen](./growth-engine_connections-activation-screen.md)
5. [Firebase Cost And Data Plan](./growth-engine_firebase.md)
6. [Test Cases](./growth-engine_test-cases.md)
7. [Core Doctrine](./doctrine/01-core-doctrine.md)
8. [Infrastructure Freeze](./doctrine/03-infrastructure-freeze-v1.md)

Do not start with provider APIs. Start with product boundary, data contracts, policies, summaries, and activation gates.

## 3. Product Boundary Checklist

| Area | Required implementation |
| --- | --- |
| Product ID | `GE` unless `MenuNexus` is secured before constants are created. |
| Route group | `src/app/(growth-engine)/growth-engine/` only. |
| API namespace | `src/app/api/growth-engine/` only. |
| UI components | `src/components/templates/growth-engine/`. |
| Hooks | `src/hooks/growth-engine/`. |
| DAL | `src/database/growth-engine/`. |
| Lib | `src/lib/growth-engine/`. |
| Types | `src/types/growth-engine/`. |
| Constants | `src/constants/growth-engine/`. |
| Firebase client | `src/lib/firebase/growthEngineFirebaseClient.ts`. |
| Functions | `functions-growth-engine/`. |
| Public website | None. |
| MenuList bridge | Tracked routes, feedback events, canonical surface state, discovery publish events, and attribution only. |

Growth Engine must not reuse GrowthOS code, MenuList owner UI routes, MenuList lead data collections, or MenuList public truth write paths.

## 4. Internal Route Inventory

| Route | Purpose | Required access |
| --- | --- | --- |
| `/growth-engine` | Today/control-room summary. | Viewer and above. |
| `/growth-engine/connections` | Adapter IDs, provider secret refs, email/WhatsApp pipelines, webhooks, budgets, kill switches, validation, activation. | Growth manager, admin, compliance, incident owner by action. |
| `/growth-engine/sources` | Source policies, source runs, Google Places, Foursquare, CSV imports. | Growth manager and above. |
| `/growth-engine/targets` | Distribution targets, identity, claim state, truth state, surface readiness. | Operator and above. |
| `/growth-engine/truth-graph` | Business Truth Graph nodes/edges and evidence. | Growth manager and compliance reviewer. |
| `/growth-engine/workflows` | Workflow definitions, workflow runs, step state. | Growth manager and above. |
| `/growth-engine/waterfalls` | Enrichment waterfall definitions and run health. | Growth manager and above. |
| `/growth-engine/ai-workers` | AI worker registry, eval status, typed run output. | Growth manager, admin, compliance reviewer. |
| `/growth-engine/campaigns` | Campaign drafts, dry-runs, approvals, caps, stop rules. | Growth manager and admin. |
| `/growth-engine/inbox` | Replies, DNC, wrong contact, interested leads, support handoff. | Operator and above. |
| `/growth-engine/discovery` | Sitemap, IndexNow, feed exports, truth packets, surface health. | Growth manager and above. |
| `/growth-engine/handoffs` | GBP, Apple Business Connect, Bing Places owner-authorized handoffs. | Operator and above. |
| `/growth-engine/incidents` | Complaints, provider blocks, security events, evidence export, kill switches. | Incident owner and admin. |
| `/growth-engine/costs` | Firebase, provider, AI, analytics, and queue spend summaries. | Founder/admin and growth manager. |
| `/growth-engine/evals` | Eval datasets and pass/fail records. | Admin and compliance reviewer. |

No route is public, indexable, owner-facing, or customer-facing.

## 5. Screen State Requirements

Every Growth Engine screen must support these states:

| State | Required behavior |
| --- | --- |
| Loading | Skeleton or compact loader; no empty-data action shown until data load resolves. |
| Empty | Clear empty state with the next allowed internal action. |
| Blocked | Show blocker reason, policy link, and responsible role. |
| Validation failed | Show failed checks, evidence refs, and retry action if role permits. |
| Paused | Show pause scope, actor, reason, and resume eligibility. |
| Incident active | Show incident banner and disable unsafe actions. |
| Read-only role | Hide mutation controls, do not only disable them. |
| Stale summary | Show last updated timestamp and stale warning. |
| Cost cap warning | Show cap, current usage, and pause policy. |
| Provider unavailable | Hold dependent jobs and route to incident/work item. |

No screen should require reading raw event collections for normal display.

## 6. Role Matrix

| Capability | Viewer | Operator | Growth manager | Admin | Compliance reviewer | Incident owner |
| --- | --- | --- | --- | --- | --- | --- |
| View summaries | Yes | Yes | Yes | Yes | Yes | Yes |
| Reveal full contact | No | Limited with audit | Yes with audit | Yes with audit | Yes with audit | Yes with audit |
| Create source run | No | No | Yes | Yes | No | No |
| Configure adapter metadata | No | No | Request only | Yes | Review only | Pause only |
| Add or rotate secret ref | No | No | No | Yes | No | No |
| Activate provider connection | No | No | Request only | Yes after approvals | Approve policy | No |
| Pause provider/channel/sender | No | Limited queue hold | Yes | Yes | Yes for compliance | Yes |
| Launch campaign | No | No | Request only | Yes after dry-run | Review compliance | No |
| Approve public distribution | No | No | Request only | Yes after truth checks | Review policy | No |
| Close DNC/complaint | No | Yes with audit | Yes | Yes | Yes | Yes |
| Close incident | No | No | No | Admin review | Compliance review | Yes |

Every mutation must write actor, role, timestamp, reason, before state, after state, and related work item or incident.

## 7. Feature Flags

Add feature flags with default `false`.

Recommended flags:

```ts
ENABLE_GROWTH_ENGINE
ENABLE_GROWTH_ENGINE_CONNECTIONS
ENABLE_GROWTH_ENGINE_SOURCE_IMPORT
ENABLE_GROWTH_ENGINE_GOOGLE_PLACES
ENABLE_GROWTH_ENGINE_FOURSQUARE
ENABLE_GROWTH_ENGINE_TRUTH_GRAPH
ENABLE_GROWTH_ENGINE_WORKFLOWS
ENABLE_GROWTH_ENGINE_AI_WORKERS
ENABLE_GROWTH_ENGINE_CAMPAIGNS
ENABLE_GROWTH_ENGINE_EMAIL_SEND
ENABLE_GROWTH_ENGINE_WHATSAPP_ASSISTED
ENABLE_GROWTH_ENGINE_WHATSAPP_API
ENABLE_GROWTH_ENGINE_DISCOVERY_PUBLISH
ENABLE_GROWTH_ENGINE_EXTERNAL_HANDOFFS
ENABLE_GROWTH_ENGINE_MOBILE_STATUS
```

Provider flags must not override policy, suppression, budget, validation, or kill-switch checks.

## 8. Environment And Secret References

Use environment variables for non-secret project wiring only.

Recommended non-secret environment keys:

```txt
GROWTH_ENGINE_FIREBASE_PROJECT_ID
GROWTH_ENGINE_FIREBASE_DATABASE_ID
GROWTH_ENGINE_STORAGE_BUCKET
GROWTH_ENGINE_FUNCTION_REGION
GROWTH_ENGINE_PUBLIC_BASE_URL_INTERNAL
GROWTH_ENGINE_MENU_LIST_BRIDGE_BASE_URL
GROWTH_ENGINE_ENVIRONMENT
```

Use Secret Manager or an approved server-only vault for:

- Google Places API key
- Foursquare API key or token
- SES credentials
- Resend API key where approved
- WhatsApp access token
- WhatsApp app secret
- WhatsApp webhook verify token
- webhook signing secrets
- OpenAI/API provider credentials
- BigQuery/export service credentials where needed

Firestore stores only secret refs, fingerprints, versions, status, rotation metadata, and audit links.

## 9. Firestore Rules And Index Expectations

Growth Engine needs its own Firestore rules and index files when the separate Firebase target is created.

Rules expectations:

- default deny
- internal/admin access only
- role checks for every collection group
- contact reveal through audited route only
- no client write to secret refs except through server route
- no client write to audit events
- no client write to message-governance audits
- no client write to provider webhook normalized events
- no public read of any Growth Engine collection
- no MenuList owner/customer read of Growth Engine collections

Index expectations:

- bounded list indexes for summary collections
- status plus updated-at indexes for queues
- target ID plus updated-at indexes for target detail
- campaign ID plus status indexes for campaign summaries
- adapter ID plus lifecycle indexes for connections
- webhook endpoint plus received-at indexes for webhook health
- incident status plus severity indexes
- suppression identity-hash lookup indexes

Do not add broad indexes on raw payload fields, message bodies, source raw fields, or AI prompt payloads.

## 10. Seed Config Required Before Provider Execution

These seed records must exist before workers can run:

| Seed record | Required before |
| --- | --- |
| Source policies | Any source import. |
| Channel policies | Any campaign or send. |
| Provider register | Any provider call. |
| Connection adapters | Any source/provider/channel/discovery/AI execution. |
| Budget policy | Any provider call or worker. |
| Kill switches | Any provider call or worker. |
| Suppression ledger root config | Any send or assisted send. |
| Sender-domain health record | Any email send. |
| WhatsApp sender identity | Any WhatsApp assisted/API action. |
| WhatsApp template registry | Any WhatsApp API template send. |
| WhatsApp Claim/Invite experiment policy | Any Claim/Invite variant assignment, send, follow-up, or winner selection. |
| Onboarding flow inventory | Any tracked route. |
| Canonical surface contract | Any public distribution. |
| AI eval datasets | Any autonomous AI worker. |
| Incident severity policy | Any campaign or provider execution. |

Missing seed config means the workflow is blocked, not partially allowed.

## 11. End-To-End Use Cases Covered

The docs now cover these implementation use cases:

| Use case | Required docs |
| --- | --- |
| Configure source adapter | Connections, source policy, provider register, budget, kill switch. |
| Import manual CSV | Source policy, dedupe, suppression, target registry, decision snapshot. |
| Run Google Places seed discovery | Google Places policy, connection adapter, field-mask profile, budget cap. |
| Run Foursquare identity signal | Foursquare policy, connection adapter, field profile, outreach block. |
| Create distribution target | Target registry, Business Truth Graph, source provenance. |
| Score menu truth gap | Enrichment waterfall, AI worker, evidence packet, decision snapshot. |
| Create private claim artifact | Artifact QA, noindex, expiry, takedown path. |
| Configure email pipeline | Connections, sender domain, DNS, unsubscribe, bounce/complaint webhook. |
| Configure WhatsApp pipeline | Connections, WABA/phone-number ID, opt-in policy, templates, conversation state, webhook, reputation. |
| Run WhatsApp Claim/Invite experiment | Consent ledger, channel policy, experiment policy, dry-run, template registry, sender assignment, reputation monitor, and masked summaries. |
| Launch controlled campaign | Campaign draft, dry-run, caps, stop rules, suppression, sender assignment. |
| Handle interested reply | Inbox, classifier, onboarding flow inventory, tracked route. |
| Handle DNC/complaint | Suppression ledger, incident policy, pending action cancellation. |
| Publish canonical surface | Owner-confirmed truth, structured data, sitemap state, surface health. |
| Submit changed URL | Discovery publisher, meaningful change, idempotency, cap. |
| Export menu feed | Confirmed MenuList truth, feed schema, validation. |
| Create truth packet | Confirmed public truth only, no private data. |
| Track GBP/Apple/Bing handoff | Owner authorization and external listing handoff records. |
| Rotate provider secret | Connections, Secret Manager ref, validation run, audit. |
| Provider outage | Incident, pause scope, work item, retry/dead-letter behavior. |
| Cost cap hit | Budget policy, non-critical pause, admin review. |
| AI eval fail | Worker autonomy blocked and work item created. |
| Mobile emergency check | Summary-only mobile status and pause controls. |
| Data deletion/correction | Data request workflow with suppression evidence retained by policy. |

## 12. API Readiness Checklist

Every API route must include:

- internal/admin auth
- role check
- product scope check
- Zod request validation
- idempotency key where mutation can repeat
- rate limit for expensive routes
- secure log context
- no secret value in logs
- no raw PII in error response
- generic user-facing error message
- audit write for mutations
- budget check for provider work
- kill-switch check for provider/channel/workflow work
- Firestore writes sanitized for undefined values

Webhook routes must also include:

- signature verification where provider supports it
- replay/idempotency guard
- event allowlist
- normalized event write
- dead-letter route for malformed events
- short-retention raw payload ref where needed

## 13. UI Readiness Checklist

Every UI action must answer:

- Who can perform this action?
- What policy allows it?
- What evidence is shown?
- What can block it?
- What audit event is written?
- What worker or API route runs?
- What summary updates after it completes?
- What kill switch can stop it?

The UI must not expose:

- plaintext secrets
- full contact data in lists
- raw source payloads in dashboards
- raw webhook payloads in dashboards
- AI prompt payloads in dashboards
- send buttons on configuration screens
- public publishing controls for candidate-only truth

## 14. Test Readiness Checklist

Implementation is not ready for controlled use until tests cover:

- product boundary
- feature flags default off
- route access and role matrix
- Firestore rules and indexes
- source policy
- connection activation
- secret ref handling
- webhook signature handling
- provider budget caps
- suppression and DNC
- sender-domain readiness
- WhatsApp governance
- Business Truth Graph publish blockers
- decision snapshots
- workflow idempotency
- enrichment waterfall stop conditions
- AI eval gating
- dry-run blockers
- artifact QA/takedown
- MenuList tracked route bridge
- canonical surface and discovery publishing
- feed/truth-packet validation
- external listing handoff authorization
- incident and kill-switch behavior
- mobile read-only/emergency behavior

## 15. Implementation Stop Conditions

Stop implementation and update docs before coding around any of these:

- a provider needs credentials outside the connection registry
- a route needs MenuList owner/customer visibility
- a workflow needs direct MenuList truth writes
- a source term allows less than the source policy assumes
- a channel rule differs by jurisdiction and no policy record exists
- a provider webhook has no signature or replay model
- a collection needs broad raw-event dashboard reads
- a required index would expose raw payload fields
- a screen needs an action not covered by RBAC
- a campaign can launch without dry-run evidence
- a public surface can publish candidate-only facts
- WhatsApp API send is useful only by weakening consent/template rules
- email send is useful only by weakening unsubscribe or sender-domain readiness
- AI worker output is useful only as free-form untyped text

## 16. Final Readiness Decision

The Growth Engine documentation is implementation-ready after this contract is linked into the doc hub, implementation plan, Firebase plan, helpdoc, and tests.

Implementation should proceed only as a governed internal product, with provider execution blocked until Connections And Activation, policies, budgets, suppression, and kill switches are active.
