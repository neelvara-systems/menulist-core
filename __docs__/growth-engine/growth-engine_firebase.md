# Growth Engine - Firebase Cost And Data Plan

**Status:** Planning only
**Cost impact now:** None
**Runtime posture:** Separate Firebase project recommended

---

## 1. Firebase Target Decision

Use separate Firebase projects:

| Environment | Proposed project |
| --- | --- |
| QA/local product data | `growth-engine-qa` |
| Production | `growth-engine` |

Do not store Growth Engine lead data inside MenuList's `menulist` or `menulist-qa` Firestore projects except for the explicit tracked-route feedback bridge.

## 2. Why Separate Firebase

Growth Engine stores lead PII, distribution targets, automation workflow state, enrichment waterfall state, decision snapshots, AI worker runs, surface state, discovery publish jobs, outreach state, message history, suppression evidence, campaign metrics, provider webhooks, source payload references, and compliance incidents.

Keeping this in MenuList Firestore would create unnecessary risk for owner/customer data, rules complexity, and cost attribution.

## 3. Cost Model Principles

Firestore charges for reads, writes, deletes, storage, and index-entry reads. Firebase also recommends budgets and usage monitoring for unexpected charges. Source: https://firebase.google.com/docs/firestore/pricing

BigQuery on-demand queries are charged by bytes processed, and explicit `LIMIT` does not reduce bytes scanned by itself. Source: https://cloud.google.com/bigquery/pricing

Provider costs must be modeled alongside Firebase costs. Amazon SES lists outbound email pricing per 1,000 emails, Resend plans include domain/authentication and webhook features, Apify Google Maps Scraper-style actors can charge per 1,000 results, Google Places API billing is SKU/field-mask driven, and Foursquare Places pricing separates Pro and Premium endpoints/fields. Sources: https://aws.amazon.com/ses/pricing/, https://resend.com/pricing, https://apify.com/crustapi/google-maps-scraper, https://developers.google.com/maps/documentation/places/web-service/usage-and-billing, https://foursquare.com/pricing/, and https://docs.foursquare.com/developer/reference/response-fields

Hard rules:

1. No dashboard reads raw event collections.
2. No broad real-time listeners.
3. No offset pagination.
4. No giant lead documents.
5. No message arrays inside lead documents.
6. No campaign dashboard from raw messages.
7. No raw webhook payloads in Firestore.
8. No unnecessary auto-indexes.
9. No AI flows reading full histories.
10. No repeated aggregation queries for normal UI.
11. No BigQuery dashboard without partitioning/clustering and max bytes billed.
12. No provider run without daily and per-run spend caps.
13. No provider run without an active adapter from Connections And Activation.
14. No plaintext provider credential in Firestore, browser state, logs, AI prompts, or dashboard payloads.
15. No source import without source policy and retention class.
16. No email send without sender-domain readiness and provider webhook readiness.
17. No public distribution job from candidate-only data.
18. No sitemap, IndexNow, feed, or truth-packet output for noindex/private artifacts.
19. No discovery dashboard from raw publish jobs; use summaries.
20. No automation dashboard from raw workflow step events; use workflow run summaries.
21. No enrichment waterfall without cache key, policy approval, and per-step cost cap.
22. No AI worker run without typed output schema, prompt version, budget cap, and eval status.
23. No sender rotation that breaks one sender per target conversation.
24. No Google Places source run without approved field-mask profile and per-run budget cap.
25. No Google Places wildcard field mask in production.
26. No durable storage of broader Places content as MenuList truth.
27. No Foursquare Places API pay-as-you-go data used for prospect outreach without separate contract or written permission.
28. No Foursquare Premium Signal profile without explicit approval, budget cap, and public-output blocker.
29. No public publishing from Business Truth Graph candidate or low-confidence edges.
30. No WhatsApp API send without message-governance audit, consent proof, suppression check, approved template or open service window, sender health, pacing, webhook readiness, and reputation check.
31. No WhatsApp opt-in from public phone availability, source import, Google Places data, Foursquare data, or third-party enrichment.
32. No raw WhatsApp webhook payload in Firestore beyond compact normalized event fields and Storage refs.
33. No WhatsApp Claim/Invite experiment from public listing provenance without explicit consent events.
34. No experiment dashboard reading raw phone numbers, raw reply text, or raw webhook payloads.
35. No automatic experiment winner selection while delivery, opt-out, complaint, sender-quality, template-quality, cost, or consent thresholds are breached.
36. No implementation handoff without Firestore rules and index expectations reviewed against [Implementation Readiness](./growth-engine_implementation-readiness.md).

## 4. Hot Collections

| Collection | Purpose | Normal UI reads |
| --- | --- | --- |
| `growthEngineLeadSummaries` | Lead list rows | Bounded paginated list |
| `growthEngineInboxItems` | Operator inbox rows | Bounded paginated list |
| `growthEngineCampaignSummaries` | Campaign dashboard | Small summary docs |
| `growthEngineChannelHealthSummaries` | Channel status | Small summary docs |
| `growthEngineApprovals` | Approval queue | Bounded list |
| `growthEngineActionQueue` | Pending operator/system actions | Bounded list |
| `growthEngineKillSwitches` | Emergency controls | Small list |
| `growthEngineConnectionAdapters` | Adapter IDs, provider metadata, lifecycle, policy links, budget, and kill-switch scope | Small policy list |
| `growthEnginePipelineConnections` | Source/email/WhatsApp/webhook/discovery/AI activation state | Small policy list |
| `growthEngineEmailPipelineConnections` | Email provider, sender domain, DNS, unsubscribe, bounce/complaint webhook, and cap state | Small policy list/detail |
| `growthEngineWhatsAppPipelineConnections` | WABA, phone-number ID, token refs, webhook refs, opt-in policy, template sync, and reputation state | Small policy list/detail |
| `growthEngineWebhookEndpoints` | Provider webhook URL, expected events, signing-secret ref, latest health, and dead-letter state | Small policy list/detail |
| `growthEngineConnectionValidationRuns` | Technical and policy validation results for adapters and pipelines | Recent bounded list/detail |
| `growthEngineConnectionHealthSummaries` | Connection status rollups for dashboards | Small summary docs |
| `growthEngineConnectionSecrets` | Secret refs, fingerprints, versions, and rotation metadata only | Admin detail only |
| `growthEngineSourcePolicies` | Approved source rules | Small policy list |
| `growthEngineChannelPolicies` | Jurisdiction/channel eligibility | Small policy list |
| `growthEngineSenderDomains` | Email DNS/readiness/health | Small list/detail |
| `growthEngineConsentLedger` | Opt-in, unsubscribe, DNC, complaint, bounce proof | Identity lookup only |
| `growthEngineWhatsAppTemplates` | Template status, category, quality, variables, owner, version, and allowed use case | Small policy list |
| `growthEngineWhatsAppConversationStates` | Customer service window, free-entry window, latest inbound, template-required state | Contact/target detail only |
| `growthEngineWhatsAppSenderIdentities` | WABA/phone identity, quality, allowed use cases, and pause/block state | Small policy list |
| `growthEngineWhatsAppReputationSnapshots` | Sender/template quality, delivery, read, reply, opt-out, complaint, and decision summaries | Small summary docs |
| `growthEngineMessageGovernanceAudits` | Pre-send consent, suppression, template, conversation, sender, pacing, and reputation decision | Target/campaign detail only |
| `growthEngineMessageExperimentSummaries` | Claim/Invite variant counters, stop-rule state, winner eligibility, cost, and safety decisions | Small campaign summary docs |
| `growthEngineMessageExperimentAssignments` | Target/contact variant assignment, consent proof ref, template ref, link token, and masked contact state | Campaign/target detail only |
| `growthEngineOnboardingFlowInventory` | Approved MenuList route bridge flows | Small policy list |
| `growthEngineProviderRegister` | Approved providers, costs, retention, webhooks | Small policy list |
| `growthEngineGooglePlacesSourceRuns` | Google Places query plan, field mask, SKU estimate, and run state | Admin/source detail only |
| `growthEngineFoursquareSourceRuns` | Foursquare query/import plan, field profile, outreach eligibility, tier estimate, and run state | Admin/source detail only |
| `growthEngineExternalPlaceIdentities` | Provider place IDs mapped to distribution targets | Target/detail lookup only |
| `growthEngineBusinessTruthGraphNodes` | Business/location/outlet/menu/source/claim/surface/handoff graph nodes | Target/detail lookup only |
| `growthEngineBusinessTruthGraphEdges` | Provenance, confidence, and truth-state relationships between graph nodes | Target/detail lookup only |
| `growthEngineAutomationWorkflows` | Approved workflow definitions | Small policy list |
| `growthEngineWorkflowRuns` | Workflow run summaries and status | Bounded list/detail |
| `growthEngineEnrichmentWaterfalls` | Approved source/provider/AI waterfall definitions | Small policy list |
| `growthEngineDecisionSnapshots` | Evidence-backed decision summaries | Target/campaign detail only |
| `growthEngineAiWorkerRuns` | Typed AI worker run summaries | Admin/debug only |
| `growthEngineSenderAssignments` | One sender per target conversation, pacing, and health | Campaign/target detail only |
| `growthEngineOperatorWorkItems` | Review, handoff, safety, cost, and incident queues | Bounded paginated queues |
| `growthEngineDistributionTargets` | Business/location/menu distribution targets | Bounded paginated list |
| `growthEngineDistributionSurfaces` | Canonical pages, truth packets, feeds, embeds, artifacts | Bounded paginated list |
| `growthEngineDiscoveryPublishJobs` | Sitemap, IndexNow, feed, truth-packet, GBP handoff queue | Job detail/list only |
| `growthEngineSurfaceHealthSummaries` | Indexability, structured data, HTTP, noindex, redirect status | Small summary docs |
| `growthEngineFreshnessSummaries` | Menu, price, hours, language, outlet freshness | Small summary docs |

## 4A. Firestore Rules And Index Readiness

The implementation must create Growth Engine-specific Firestore rules and indexes for the separate Firebase target.

Minimum rules posture:

- default deny
- internal/admin access only
- role checks by collection group
- no public read
- no MenuList owner/customer read
- no client write to secret refs, audit events, webhook events, or message-governance audits
- contact reveal only through audited server route

Minimum index posture:

- summary list indexes by status and updated timestamp
- queue indexes by status, severity, and due timestamp
- connection indexes by adapter ID and lifecycle
- webhook health indexes by endpoint ID and latest event timestamp
- suppression lookup indexes by hashed identity
- incident indexes by status and severity

Do not index raw payload fields, message bodies, AI prompt payloads, source raw fields, or webhook raw payload refs.

## 5. Warm/Cold Collections

| Collection | Purpose | UI rule |
| --- | --- | --- |
| `growthEngineSourceRuns` | Source execution records | List recent only |
| `growthEngineConnectionAuditEvents` | Adapter, secret-ref, validation, activation, pause, and kill-switch audit trail | Bounded audit list only |
| `growthEngineConnectionValidationEvents` | Detailed validation check events | Admin/debug only |
| `growthEngineConnectionIncidentLinks` | Links from adapters/webhooks/senders to incidents | Incident detail only |
| `growthEngineSourceCandidates` | Imported candidate staging | Not normal dashboard |
| `growthEngineMessages` | Conversation messages | Lead/conversation detail only |
| `growthEngineMessageEvents` | Delivery/reply/click events | Never dashboard scan |
| `growthEngineWhatsAppWebhookEvents` | Normalized WhatsApp status, reply, button, Flow, template, and quality events | Never dashboard scan |
| `growthEngineWhatsAppFlowDefinitions` | Approved structured truth-capture Flow definitions | Admin/policy only |
| `growthEngineWhatsAppTemplateEvents` | Template status/quality sync history | Admin/debug only |
| `growthEngineSendJobs` | Execution queue/history | Job detail only |
| `growthEngineFeedbackEvents` | MenuList route feedback | Rollup source only |
| `growthEngineAttributionTouches` | Attribution history | Analytics/export only |
| `growthEngineEvalRuns` | AI eval runs | Admin QA only |
| `growthEngineEvalDatasets` | Seed cases and thresholds | Admin QA only |
| `growthEngineOptimizationReports` | Daily/weekly recommendations | Latest summaries only |
| `growthEngineIncidents` | Safety/compliance incidents | Admin list/detail only |
| `growthEngineArtifactReviews` | Artifact QA, expiry, complaints, takedowns | Artifact detail only |
| `growthEngineVendorProcessorRegister` | Data processor/vendor records | Admin/compliance only |
| `growthEngineDataSubjectRequests` | Access, correction, deletion, restriction requests | Admin/compliance only |
| `growthEngineSitemapSnapshots` | Generated sitemap inventories and hashes | Admin/debug only |
| `growthEngineIndexNowSubmissions` | Changed-URL submission attempts and responses | Admin/debug only |
| `growthEngineMenuFeedExports` | Feed-ready entity/menu export metadata | Admin/export only |
| `growthEngineGbpHandoffs` | Owner-authorized GBP menu URL/preferred-source handoff state | Admin/operator only |
| `growthEngineExternalListingHandoffs` | GBP, Apple Business Connect, and Bing Places owner-authorized handoff state | Admin/operator only |
| `growthEngineTruthPackets` | Public truth-packet references and checksums | Surface detail only |
| `growthEngineStructuredDataChecks` | Schema validation results | Surface detail/debug only |
| `growthEngineEvidencePackets` | Source facts, rejected facts, confidence, and expiry refs | Target detail/debug only |
| `growthEngineWorkflowStepEvents` | Raw step execution history | Never dashboard scan |
| `growthEngineOptimizationRecommendations` | Expand/pause/review/stop recommendations | Latest summaries only |

## 6. Storage

Use Cloud Storage for:

- raw source payloads
- raw provider webhook payloads
- raw WhatsApp webhook payloads when needed for short-lived audit
- import CSV files
- large export reports
- eval datasets
- evidence packets and AI review bundles when too large for Firestore
- dry-run sample bundles if too large for Firestore
- sitemap XML snapshots when too large for Firestore
- menu feed export files
- public truth packet artifacts
- structured data validation reports

Do not store plaintext provider keys, SMTP passwords, WhatsApp tokens, app secrets, webhook verify tokens, or signing secrets in Firestore or Storage. Store these in Secret Manager or an approved server-only vault. Firestore stores secret refs, fingerprints, versions, status, rotation metadata, and audit links only.

Firestore stores references, checksums, timestamps, provider/source metadata, retention class, and status.

Do not store Google Maps photos, reviews, menus, profile content, or broader Places API content as Growth Engine assets or durable truth. Google place IDs, request metadata, field masks, response hashes, and internal decision state may be stored.

Do not store Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content as Growth Engine assets, public artifact content, or durable MenuList truth. Foursquare place IDs, category IDs, chain IDs, source run metadata, response hashes, and candidate graph edges may be stored when source policy allows it.

Do not store full WhatsApp webhook payloads in Firestore. Store normalized event type, message/provider IDs, validation state, outcome timestamps, error code where needed, compact hashes, and Storage refs. Message bodies are retained only where compliance/support policy requires and should be redacted or minimized.

## 7. Task Queues And Workers

Firebase task queue functions can handle async, resource-intensive, rate-limited work outside the main request path. Source: https://firebase.google.com/docs/functions/task-functions

Use task queues for:

- source import
- connection validation
- secret rotation reminders
- connection health summary rollups
- Google Places seed runs
- Google Places selective details enrichment
- Foursquare identity/category/chain enrichment
- Business Truth Graph rollups
- workflow run dispatch
- workflow step execution
- enrichment waterfall execution
- AI worker execution
- decision snapshot build
- operator work-item routing
- normalization/dedupe
- lead intelligence
- distribution target rollups
- surface health checks
- freshness checks
- sitemap inventory rebuild
- IndexNow submissions
- menu feed export
- truth packet publish
- GBP handoff reminders
- dry-run generation
- send jobs
- email DNS/readiness checks
- WhatsApp governance checks
- WhatsApp template sync
- WhatsApp conversation-state updates
- WhatsApp webhook verification and normalization
- WhatsApp reputation rollups
- WhatsApp Flow submission processing
- webhook normalization
- reply classification
- follow-up detection
- rollups
- cost reports

Each queue needs:

- max concurrent dispatches
- retry policy
- idempotency key
- budget check
- kill-switch check
- secure log context

## 8. Budget Policy

```ts
type GrowthBudgetPolicy = {
  firestore: {
    maxReadsPerDay?: number;
    maxWritesPerDay?: number;
    maxDeletesPerDay?: number;
    alertAtPercent: number;
    pauseNonCriticalAtPercent: number;
  };
  ai: {
    maxSpendUsdPerDay: number;
    maxSpendUsdPerCampaign?: number;
    maxRunsPerWorkerPerDay?: Record<string, number>;
  };
  sources: {
    maxApifySpendUsdPerRun: number;
    maxApifySpendUsdPerDay: number;
    maxGooglePlacesSpendUsdPerRun?: number;
    maxGooglePlacesSpendUsdPerDay?: number;
    maxGooglePlacesTextSearchRequestsPerRun?: number;
    maxGooglePlacesDetailsRequestsPerRun?: number;
    maxFoursquareSpendUsdPerRun?: number;
    maxFoursquareSpendUsdPerDay?: number;
    maxFoursquareRequestsPerRun?: number;
    maxFoursquarePremiumRequestsPerRun?: number;
    requireApprovalAboveUsd: number;
  };
  channels: {
    maxEmailSendsPerDay?: number;
    maxWhatsappAssistedPerDay?: number;
    maxWhatsappApiPerDay?: number;
    maxWhatsappTemplateSendsPerDay?: number;
    maxWhatsappRecipientsPerBatch?: number;
    maxWhatsappFlowSubmissionsPerDay?: number;
    maxEmailProviderSpendUsdPerDay?: number;
    maxWhatsappProviderSpendUsdPerDay?: number;
  };
  analytics: {
    maxBigQueryBytesBilledPerQuery?: number;
    maxBigQuerySpendUsdPerDay?: number;
  };
  distribution: {
    maxSurfacePublishesPerDay?: number;
    maxIndexNowUrlsPerDay?: number;
    maxMenuFeedExportsPerDay?: number;
    maxStructuredDataChecksPerDay?: number;
    maxTruthPacketPublishesPerDay?: number;
  };
  automation: {
    maxWorkflowRunsPerDay?: number;
    maxWorkflowStepRetriesPerDay?: number;
    maxEnrichmentWaterfallRunsPerDay?: number;
    maxAiWorkerRunsPerDay?: number;
    maxOperatorWorkItemsOpen?: number;
  };
  actions: {
    onWarning: 'alert' | 'throttle';
    onCritical: 'pause_noncritical_jobs' | 'admin_review';
  };
  updatedAt: string;
};
```

Default first-run posture:

- small lead batches
- dry-run cost estimate required
- campaign approval required
- no automatic scale-up
- provider spend cap per day
- discovery publish cap per day
- public distribution only from confirmed truth
- non-critical jobs pause on critical budget threshold

## 9. Provider Cost Guardrails

| Provider area | Guardrail |
| --- | --- |
| Source providers | Require policy approval, run cap, daily cap, raw payload retention class, and source-quality review before campaign eligibility. |
| Connection adapters | Require active lifecycle, secret refs, policy links, validation run, budget cap, kill switch, and owner before provider execution. |
| Google Places | Require approved source policy, named field-mask profile, per-run request cap, SKU estimate, quota alert, place-ID-only durable storage, and block photos/reviews/profile/menu content. |
| Foursquare | Require approved source policy, field profile, per-run request cap, tier estimate, outreach-eligibility flag, and PAYG prospecting block unless contract/written permission exists. |
| Business Truth Graph | Store nodes/edges as compact summary records with provenance, confidence, and truth state. Public publishing reads confirmed MenuList truth only, not candidate graph edges. |
| Email provider | Track per-send cost, bounce webhook health, unsubscribe webhook health, domain readiness, spam-rate threshold, and daily send cap. |
| WhatsApp provider | Assisted-only until opt-in proof, approved templates, conversation-state engine, webhook signature verification, sender identity health, reputation monitor, pacing policy, and governance audit exist. API costs stay disabled until policy review. |
| WhatsApp templates | Block pending, rejected, paused, disabled, wrong-category, or low-quality templates from unattended sends. |
| WhatsApp reputation | Pause or reduce sends when delivery, read, reply, opt-out, complaint, template quality, or sender quality moves outside policy. |
| WhatsApp Claim/Invite experiments | Use summary counters, masked assignment detail, hard stop rules, and consent proof refs. Do not scan raw message events to choose a winner. |
| WhatsApp Flows | Store Flow definitions as policy objects; write Flow submissions only after schema validation and approved field filtering. |
| AI provider | Cache typed outputs by source hash and prompt version; block duplicate spend on unchanged inputs. |
| Enrichment waterfall | Require approved provider order, stop condition, source-policy match, and per-step cost cap before running. |
| Workflow engine | Require idempotency key, retry cap, budget check, and kill-switch check before each step execution. |
| Sender assignment | Preserve one sender per target conversation and block send when sender health is warning/blocking. |
| BigQuery | Partition event tables, cluster by campaign/source/channel where needed, set max bytes billed, and keep dashboards on rollups. |
| IndexNow | Submit only meaningful changed public URLs; cap daily URL count and dedupe repeated submissions. |
| Google/GBP | Use only after owner authorization and policy approval; no GoogleLocations lead-gen use. |
| Apple/Bing listing handoff | Treat as owner-authorized distribution handoff only; do not ingest listing data as MenuList truth. |
| Menu feeds | Export from confirmed MenuList truth, store files in Storage, and keep submission disabled until eligibility is approved. |

## 10. Cost Simulation

For a first controlled campaign of 100 leads:

| Operation | Estimated count | Cost note |
| --- | ---: | --- |
| Import candidates | 100-300 writes | Depends on source result volume and staging retention. |
| Google Places Text Search seed | capped external calls + source run metadata | IDs-only field mask by default; store place IDs and request metadata only. |
| Google Places Details enrichment | only filtered candidates | Approved field mask only; no wildcard, photos, reviews, or durable Places content. |
| Foursquare identity enrichment | capped external calls/import rows + source run metadata | Pro identity profile only by default; block PAYG outreach eligibility and Premium fields unless approved. |
| Business Truth Graph rollup | 100-300 compact edge writes | Candidate edges stay internal; public publishing requires confirmed truth state. |
| Dedupe keys | 100-300 reads/writes | Hash lookup plus created/merged keys. |
| Lead summaries | 100 writes | One summary per accepted lead. |
| Lead intelligence | 100 AI/provider runs max | Must be budget-gated and cached by source hash. |
| Workflow runs | 1-5 summary writes per workflow | Step events are warm/cold; dashboards read run summaries only. |
| Enrichment waterfalls | 100 runs max | Cache by target/source hash; stop when valid evidence exists. |
| Decision snapshots | 100 writes | One snapshot per accepted/held/rejected target action. |
| AI worker runs | bounded by worker budget | Typed output only; no duplicate spend on unchanged input hash. |
| Sender assignments | up to 100 writes | One sender assignment per target conversation. |
| Operator work items | variable writes | Created only for human-review and exception queues. |
| Dry-run | 100-300 reads, 1 report write | Reads summaries, suppressions, templates, campaign policy. |
| Email sends | 100 send jobs + events | Provider cost outside Firebase. |
| WhatsApp assisted tasks | only opted-in or owner-initiated contacts | No provider API send counted until operator marks sent. |
| WhatsApp API template sends | disabled until governance passes | Requires consent proof, template approval, conversation state, reputation check, and provider cost cap. |
| WhatsApp webhooks | variable normalized events | Signature-verified, idempotent, compact events only; raw payloads use short TTL Storage refs. |
| WhatsApp Flow submissions | only approved Flow definitions | Validated structured truth fields can update candidate graph state for review. |
| Replies/clicks | variable writes | Webhook-driven. |
| Dashboard | bounded summary reads | No raw event scans. |
| Sender health sync | small scheduled/queued reads | Domain/provider status only. |
| Artifact QA | variable writes/storage refs | Only if artifact is used. |
| BigQuery export/query | bounded batch/export | Must use partitioning and max bytes billed. |
| Distribution targets | 100 writes | One target per accepted business/location/menu candidate. |
| Surface readiness | 100-300 reads/writes | Canonical page, artifact, truth packet, feed, and handoff status. |
| Sitemap update | 1-3 Storage writes + summary write | Only changed public URL inventory. |
| IndexNow submit | bounded external calls + event writes | Only meaningful changed URLs. |
| Menu feed export | Storage write + export metadata | Feed-ready output, external submission disabled until approved. |
| Truth packet publish | Storage write + surface write | Confirmed public truth only. |

For 1,000 leads, use batch jobs and summary rollups. Do not open raw lead/event streams in the UI.

## 11. Retention

| Data | Retention posture |
| --- | --- |
| Raw source payload | Short TTL unless needed for audit. |
| Google Places place ID | Long-term allowed as provider identity handle. |
| Google Places response content | Do not persist by default; if legally approved for operational evidence, use short TTL Storage only and never public output. |
| Foursquare place ID, category ID, and chain ID | Long-term allowed as provider identity handles when source policy allows it. |
| Foursquare PAYG response content | Do not persist by default; if legally approved for operational evidence, use short TTL Storage only, block prospect outreach use, and never use as public output. |
| Business Truth Graph candidate node/edge | Retain while target remains eligible; candidate and low-confidence edges cannot publish. |
| Business Truth Graph confirmed node/edge | Retain while MenuList truth, surface, attribution, or handoff remains active. |
| Raw webhook payload | Short TTL after normalized event is stored. |
| Lead summary | Active while lead remains eligible. |
| DNC/suppression evidence | Long-term retention. |
| Message body | Retain only as needed for compliance/support; redact old bodies if policy requires. |
| AI debug prompt/result | Short TTL; store typed outcome instead. |
| Workflow step events | Short TTL unless needed for incident evidence. |
| Enrichment evidence packet | Retain while target remains eligible; expire source-limited fields by policy. |
| AI worker run summaries | Retain enough for eval, cost, and incident review; remove prompt payloads by policy. |
| Decision snapshot | Retain while target/campaign attribution remains active. |
| Sender assignment | Retain while conversation/campaign attribution remains active. |
| Operator work item | Retain status and audit summary; minimize personal payload. |
| Attribution summaries | Long-term aggregate retention. |
| Distribution target | Active while target remains eligible or activated. |
| Public surface state | Long-term while public URL or feed entry exists. |
| Sitemap snapshots | Retain recent snapshots and hashes, archive only when useful for incident review. |
| IndexNow submissions | Retain enough for retry/audit and crawl-health analysis. |
| Menu feed export metadata | Retain long-term; raw feed files can rotate by policy. |
| External listing handoff | Retain while authorized handoff or attribution remains relevant. |
| Truth packet checksum/state | Retain while packet is public. |
| Source policy approval | Long-term while source may explain prior outreach. |
| Consent, unsubscribe, DNC, complaint proof | Long-term retention for suppression and audit. |
| WhatsApp consent proof | Long-term while any WhatsApp message history or suppression state can be audited. |
| WhatsApp conversation state | Retain while target/contact remains eligible; archive compact state after inactivity. |
| WhatsApp template records | Long-term while template can explain prior sends. |
| WhatsApp raw webhook payload | Short TTL Storage only, unless required for incident evidence. |
| WhatsApp normalized webhook event | Retain while message/conversation attribution remains active. |
| WhatsApp reputation snapshot | Retain enough for quality, cost, and incident trend analysis. |
| Artifact review/takedown | Retain review evidence after artifact expiry. |
| Vendor/data processor records | Long-term while vendor was used for any retained data. |
| Data subject request records | Long-term audit record, with personal payload minimized. |

TTL deletes are still billable. TTL is for retention hygiene, not a reason to write extra data.

## 12. No Runtime Cost From Docs

This document creates no runtime cost.
