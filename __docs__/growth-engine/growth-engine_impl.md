# Growth Engine - Implementation Plan

**Status:** Planning only
**Product code:** `GE` proposed, not implemented; `MN` if `MenuNexus` is secured before implementation
**Implementation rule:** Build from the locked implementation decisions in README and spec; keep feature flags default off.

---

## 1. Architecture Decision

Recommended implementation is same repo, separate product boundary.

Do not clone MenuList. Do not add this to MenuList owner/customer folders. Do not reuse GrowthOS/Growth Kits folders.

The repo already requires product-scoped folders for additional products and shared root infrastructure only when it is intentionally cross-product. Evidence: `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md:995-1031`.

## 2. Proposed File Layout

```txt
__docs__/growth-engine/
functions-growth-engine/
src/app/(growth-engine)/growth-engine/
src/app/api/growth-engine/
src/components/templates/growth-engine/
src/constants/growth-engine/
src/data/growth-engine/
src/database/growth-engine/
src/hooks/growth-engine/
src/lib/growth-engine/
src/workflows/growth-engine/
src/lib/firebase/growthEngineFirebaseClient.ts
src/types/growth-engine/
```

No app code has been created yet. These are implementation targets.

## 3. Product Constants And Routing Changes Needed Later

When implementation starts:

| File | Required change |
| --- | --- |
| `src/constants/product.ts` | Add `GROWTH_ENGINE: 'GE'` or `MENU_NEXUS: 'MN'` after name/code lock. |
| `src/constants/deploymentTargets.ts` | Add deployment target only after Firebase/domain decisions are confirmed. |
| `src/constants/productDomains.ts` | Add Growth Engine only if a host or dev prefix is approved. |
| `src/config/features.ts` | Add `ENABLE_GROWTH_ENGINE_*` flags, default off. |
| `src/constants/database.ts` | Add `GROWTH_ENGINE_*` collection constants only after schema is locked. |

Do not reuse existing `GROWTH_OS: 'GR'`; it is reserved for GrowthOS/Growth Kits.

## 4. Product Modules

Build order is dependency order, not reduced scope.

| Order | Module | Purpose |
| ---: | --- | --- |
| 1 | Distribution data foundation | Distribution target identity, lead/contact identity, summaries, dedupe, suppressions, events. |
| 2 | Automation workflow engine | Typed workflows, workflow runs, steps, approvals, retries, idempotency, budgets, and kill-switch checks. |
| 3 | Source ingestion | Import raw candidates through approved adapters; no outreach or public publishing. |
| 4 | Enrichment waterfall engine | Ordered source/provider/AI steps for identity, menu gap, contactability, source confidence, and cost-controlled evidence. |
| 5 | AI worker registry | Typed AI workers, prompt versions, eval thresholds, cache keys, budgets, and blocked-output rules. |
| 6 | Truth gap intelligence | Typed fit, menu truth gap, contactability, distribution readiness, risk, and human-review decisions. |
| 7 | Distribution target registry | Business/location/menu target state, claim state, truth state, and surface inventory. |
| 8 | Decision snapshot ledger | Evidence, rejected facts, scores, blockers, confidence, rule/prompt version, and next action for every material decision. |
| 9 | Channel identity and eligibility | Email/phone/WhatsApp/social identity states and policy gates. |
| 10 | Sender assignment and pacing | Sender-domain readiness, one sender per target conversation, target timezone windows, ramp, and reputation limits. |
| 11 | Canonical surface publisher | MenuList menu/business page readiness, structured data, canonical URL, and freshness state. |
| 12 | Discovery publisher | Sitemaps, sitemap indexes, IndexNow submissions, changed-URL queue, and crawl health. |
| 13 | Menu feed exporter | Google-compatible and partner-compatible entity/menu/section/item feed payloads. |
| 14 | External listing handoff manager | GBP, Apple Business Connect, and Bing Places handoff/sync state for owner-authorized distribution. |
| 15 | Campaign foundation | Drafts, audiences, caps, stop rules, approvals, summaries. |
| 16 | Dry-run engine | End-to-end campaign and distribution validation without sending or publishing. |
| 17 | Template and guardrails | Approved variables, banned claims, safety blocks. |
| 18 | Onboarding route bridge | Tracked MenuList onboarding links and feedback ingestion. |
| 19 | Email execution | Automated outbound channel after readiness checks. |
| 20 | WhatsApp assisted | Operator-reviewed send queue after channel policy approval. |
| 21 | Unified inbox | Conversations, messages, reply composer, DNC/wrong-number actions. |
| 22 | Reply classifier | Interested, DNC, unsubscribe, wrong-number, pricing, objection, human review. |
| 23 | Operator workboard | Queue-first UI for safety, review, replies, handoffs, health, freshness, discovery failures, costs, evals, and incidents. |
| 24 | Follow-up/NBA | State-aware follow-up and retargeting with cooldowns. |
| 25 | Attribution and rollups | Source/campaign/channel/template/flow/surface/freshness performance. |
| 26 | Safety/control room | Kill switches, incidents, budget caps, evals, channel health, surface health. |
| 27 | Optimizer | Recommendations after enough feedback and distribution health exists. |

## 4A. Second-Pass Required Foundations

The first implementation must build these foundations before any send worker is enabled:

| Module | Purpose |
| --- | --- |
| Distribution target registry | Maps business/location/menu targets to source provenance, claim state, truth state, canonical URL, and surface inventory. |
| Automation workflow engine | Defines typed triggers, steps, retries, idempotency, approvals, budgets, and kill-switch behavior. |
| Enrichment waterfall registry | Defines provider/source/AI order, run conditions, cache keys, success provider, field confidence, and per-step cost. |
| Decision snapshot ledger | Stores why a target was contacted, held, rejected, routed, published, or blocked. |
| AI worker registry | Registers worker purpose, allowed input, typed output, prompt version, eval threshold, and spend cap. |
| Sender assignment and pacing | Keeps one sender per target conversation, respects daily caps, target timezone windows, ramp, and health thresholds. |
| Operator workboard | Converts human-review and incident decisions into auditable work items. |
| Source policy registry | Defines approved sources, allowed fields, source terms, retention class, raw payload handling, and approval owner. |
| Channel compliance policy | Maps country, channel, message type, opt-in requirement, unsubscribe requirement, and launch blockers. |
| Consent/suppression ledger | Stores opt-in, unsubscribe, DNC, complaint, wrong-contact, bounce, and proof events across all campaigns. |
| Sender-domain readiness | Tracks DNS/authentication, unsubscribe endpoint, bounce handling, sender identity, ramp limits, and health thresholds. |
| Provider decision matrix | Records approved provider, cost model, webhook support, data retention, processor/vendor status, and shutdown path. |
| Onboarding flow inventory | Lists approved MenuList onboarding flows, route payloads, event names, and fallback behavior. |
| Canonical surface publisher | Tracks publish eligibility, canonical URL, structured data state, sitemap state, and freshness state. |
| Discovery publisher | Owns sitemap inventory, IndexNow submissions, feed exports, truth packets, and discovery job audit logs. |
| Menu feed exporter | Produces feed-ready entity/menu/section/item data from confirmed MenuList truth. |
| GBP handoff manager | Tracks owner-authorized menu URL, preferred-source, manual handoff, and API eligibility. |
| External listing handoff manager | Tracks GBP, Apple Business Connect, and Bing Places distribution handoffs after owner confirmation. |
| Artifact review/takedown | Controls noindex artifacts, source-rights checks, accuracy review, expiry, owner complaints, and takedowns. |
| Eval dataset registry | Stores seed cases and pass thresholds for lead scoring, DNC, pricing, claim safety, and reply classification. |
| Incident runbook | Defines severity, owner, evidence export, kill-switch scope, and resolution checklist. |

These are not admin settings after launch. They are launch prerequisites.

## 5. Core Data Contracts

Use `pId/tId/sId/docId` where product-scoped identity is needed. For internal Growth Engine work, `pId` is `GE` after product code approval.

### Lead Summary

```ts
type GrowthLeadSummary = {
  pId: 'GE';
  leadId: string;
  displayName: string;
  city?: string;
  category?: string;
  segment: 'A' | 'B' | 'C' | 'REJECT' | 'HOLD';
  primaryNeed?: 'no_website' | 'stale_menu' | 'missing_menu' | 'weak_hours' | 'unmanaged_profile' | 'unknown';
  maskedEmail?: string;
  maskedPhone?: string;
  sourceQuality: 'high' | 'medium' | 'low' | 'blocked';
  contactability: 'ready' | 'limited' | 'missing' | 'blocked';
  suppressionStatus: 'clear' | 'suppressed' | 'wrong_contact' | 'complaint';
  lastTouchedAt?: string;
  nextAction?: 'contact' | 'enrich' | 'hold' | 'reject' | 'human_review';
  updatedAt: string;
};
```

### Dry Run Report

```ts
type GrowthCampaignDryRunReport = {
  campaignId: string;
  audience: {
    totalMatched: number;
    excludedSuppressed: number;
    excludedDuplicates: number;
    excludedRecentlyContacted: number;
    finalEligible: number;
    bySegment: Record<string, number>;
    byChannel: Record<string, number>;
  };
  routing: {
    email: number;
    whatsappAssisted: number;
    whatsappTemplate: number;
    instagramReply: number;
    messengerReply: number;
    hold: number;
    humanReview: number;
  };
  messages: {
    rendered: number;
    blockedBySafety: number;
    missingTemplate: number;
    sampleMessageIds: string[];
  };
  costs: {
    estimatedAiCostUsd: number;
    estimatedSourceCostUsd: number;
    estimatedChannelCostUsd: number;
    estimatedFirestoreReads: number;
    estimatedFirestoreWrites: number;
  };
  risks: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  }[];
  launchAllowed: boolean;
  blockers: string[];
  createdAt: string;
};
```

### Kill Switch

```ts
type GrowthKillSwitch = {
  id: string;
  scope: 'global_outbound' | 'channel' | 'campaign' | 'template' | 'ai_worker' | 'source_provider';
  targetId?: string;
  status: 'active' | 'inactive';
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
};
```

### Source Policy

```ts
type GrowthSourcePolicy = {
  sourcePolicyId: string;
  provider: 'manual_csv' | 'google_places' | 'foursquare_places_api' | 'fsq_os_places' | 'apify' | 'first_party' | 'other';
  status: 'draft' | 'approved' | 'paused' | 'blocked';
  allowedUse: 'candidate_discovery' | 'enrichment' | 'verification_only';
  allowedFields: string[];
  blockedFields: string[];
  fieldMaskProfiles?: string[];
  rawPayloadRetentionDays: number;
  mayUseForOutreach: boolean;
  mayUseInArtifact: boolean;
  sourceTermsUrl?: string;
  approvalOwner: string;
  approvedAt?: string;
  updatedAt: string;
};
```

### Google Places Source Run

```ts
type GrowthGooglePlacesSourceRun = {
  sourceRunId: string;
  sourcePolicyId: string;
  provider: 'google_places';
  query: string;
  includedType?: string;
  regionCode?: string;
  languageCode?: string;
  fieldMask: string;
  pageSize: number;
  maxPages: number;
  estimatedSkuTier: 'ids_only' | 'essentials' | 'pro' | 'enterprise' | 'enterprise_atmosphere';
  status: 'draft' | 'queued' | 'running' | 'succeeded' | 'blocked' | 'failed';
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};
```

### External Place Identity

```ts
type GrowthExternalPlaceIdentity = {
  targetId: string;
  provider: 'google_places' | 'foursquare_places_api' | 'fsq_os_places';
  externalPlaceId: string;
  resourceName?: string;
  externalSourceUrl?: string;
  contentLicense?: string;
  lastCheckedAt: string;
  sourceRunId: string;
  fieldMaskUsed: string;
  durableContentStored: false;
};
```

### Foursquare Source Run

```ts
type GrowthFoursquareSourceRun = {
  sourceRunId: string;
  sourcePolicyId: string;
  provider: 'foursquare_places_api' | 'fsq_os_places';
  query?: string;
  ll?: string;
  radius?: number;
  near?: string;
  fsqCategoryIds?: string[];
  fsqChainIds?: string[];
  fieldsProfile: 'pro_identity' | 'premium_signal';
  limit: number;
  estimatedTier: 'pro' | 'premium' | 'open_source';
  outreachEligibility: 'blocked_by_terms' | 'contract_approved' | 'not_applicable';
  status: 'draft' | 'queued' | 'running' | 'succeeded' | 'blocked' | 'failed';
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};
```

### Business Truth Graph

```ts
type GrowthBusinessTruthGraphNode = {
  nodeId: string;
  targetId: string;
  type: 'business' | 'location' | 'outlet' | 'menu' | 'surface' | 'source' | 'handoff' | 'claim' | 'freshness' | 'attribution';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  sourceRefs: string[];
  updatedAt: string;
};

type GrowthBusinessTruthGraphEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relation:
    | 'same_as'
    | 'located_at'
    | 'has_outlet'
    | 'has_menu'
    | 'claimed_by'
    | 'published_as'
    | 'sourced_from'
    | 'handed_off_to'
    | 'supersedes'
    | 'needs_freshness_review'
    | 'attributed_to';
  confidence: 'high' | 'medium' | 'low';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  createdAt: string;
};
```

### Channel Compliance Policy

```ts
type GrowthChannelCompliancePolicy = {
  policyId: string;
  jurisdiction: 'IN' | 'US' | 'GLOBAL_REVIEW';
  channel: 'email' | 'whatsapp_assisted' | 'whatsapp_api' | 'sms' | 'phone' | 'instagram' | 'messenger';
  status: 'approved' | 'assisted_only' | 'blocked' | 'legal_review_required';
  optInRequired: boolean;
  unsubscribeRequired: boolean;
  templateApprovalRequired: boolean;
  commercialRegistrationRequired: boolean;
  launchBlockers: string[];
  updatedAt: string;
};
```

### Sender Domain Readiness

```ts
type GrowthSenderDomainHealth = {
  senderDomainId: string;
  domain: string;
  provider: 'ses' | 'resend' | 'other';
  status: 'setup' | 'ready' | 'warming' | 'paused' | 'blocked';
  spfStatus: 'missing' | 'valid' | 'invalid';
  dkimStatus: 'missing' | 'valid' | 'invalid';
  dmarcStatus: 'missing' | 'valid' | 'invalid';
  unsubscribeEndpointStatus: 'missing' | 'valid' | 'failing';
  bounceWebhookStatus: 'missing' | 'valid' | 'failing';
  maxSendsPerDay: number;
  spamRateWarningAtPercent: number;
  spamRateBlockAtPercent: number;
  updatedAt: string;
};
```

### Artifact Review

```ts
type GrowthArtifactReview = {
  artifactId: string;
  leadId: string;
  status: 'draft' | 'approved' | 'rejected' | 'expired' | 'taken_down';
  noindex: true;
  sourceRightsChecked: boolean;
  accuracyChecked: boolean;
  expiresAt: string;
  takedownReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  updatedAt: string;
};
```

### Automation Workflow

```ts
type GrowthAutomationWorkflow = {
  workflowId: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'blocked';
  trigger:
    | 'source_run_created'
    | 'target_created'
    | 'campaign_draft_saved'
    | 'reply_received'
    | 'truth_activated'
    | 'public_url_changed'
    | 'freshness_due'
    | 'sender_health_changed'
    | 'scheduled_rollup';
  requiredPolicies: string[];
  steps: {
    stepId: string;
    type:
      | 'policy_gate'
      | 'google_places_seed'
      | 'google_places_details'
      | 'foursquare_identity_graph'
      | 'business_truth_graph_rollup'
      | 'enrichment_waterfall'
      | 'ai_worker'
      | 'decision_snapshot'
      | 'operator_task'
      | 'queue_job'
      | 'route_create'
      | 'send_or_assist'
      | 'surface_publish'
      | 'discovery_publish'
      | 'rollup';
    retryPolicyId?: string;
    budgetPolicyId?: string;
    killSwitchScopes: string[];
  }[];
  approvalRequired: boolean;
  updatedAt: string;
};
```

### Enrichment Waterfall

```ts
type GrowthEnrichmentWaterfall = {
  waterfallId: string;
  purpose: 'business_identity' | 'menu_gap' | 'contactability' | 'source_confidence' | 'surface_readiness';
  status: 'draft' | 'approved' | 'paused' | 'blocked';
  runWhen: string;
  cacheKeyFields: string[];
  steps: {
    stepId: string;
    provider: 'first_party' | 'manual_csv' | 'owner_site' | 'google_places' | 'foursquare_places_api' | 'fsq_os_places' | 'apify' | 'ai_extractor' | 'other';
    allowedFields: string[];
    maxCostUsd?: number;
    stopWhenValid: boolean;
  }[];
  approvalOwner: string;
  updatedAt: string;
};
```

### AI Worker Run

```ts
type GrowthAiWorkerRun = {
  runId: string;
  worker:
    | 'source_cleaner'
    | 'business_identity_resolver'
    | 'menu_truth_gap_auditor'
    | 'contactability_scorer'
    | 'artifact_drafter'
    | 'message_personalizer'
    | 'reply_classifier'
    | 'pricing_responder'
    | 'surface_validator'
    | 'menu_feed_validator'
    | 'optimizer'
    | 'incident_summarizer';
  inputHash: string;
  promptVersion: string;
  outputSchemaVersion: string;
  status: 'queued' | 'running' | 'succeeded' | 'blocked' | 'failed';
  confidence: 'high' | 'medium' | 'low';
  blockers: string[];
  estimatedCostUsd: number;
  evalStatus: 'not_required' | 'passed' | 'failed' | 'stale';
  createdAt: string;
  completedAt?: string;
};
```

### Decision Snapshot

```ts
type GrowthDecisionSnapshot = {
  snapshotId: string;
  targetId: string;
  campaignId?: string;
  decision: 'reject' | 'hold' | 'review' | 'route' | 'send' | 'assist' | 'publish' | 'notify' | 'pause';
  scores: {
    distributionFit: number;
    menuTruthGap: number;
    contactability: number;
    sourceConfidence: number;
    surfaceReadiness: number;
    freshnessRisk: number;
    channelRisk: number;
    economics: number;
  };
  evidenceRefs: string[];
  rejectedFacts: string[];
  blockers: string[];
  nextAction?: string;
  ruleVersion: string;
  promptVersion?: string;
  createdAt: string;
};
```

### Sender Assignment

```ts
type GrowthSenderAssignment = {
  assignmentId: string;
  targetId: string;
  campaignId?: string;
  senderDomainId: string;
  senderIdentityId: string;
  channel: 'email' | 'whatsapp_assisted' | 'whatsapp_api';
  status: 'assigned' | 'paused' | 'blocked' | 'completed';
  targetTimezone?: string;
  maxSendsPerDay: number;
  preserveSenderForConversation: true;
  healthState: 'healthy' | 'warning' | 'blocked';
  updatedAt: string;
};
```

### Operator Work Item

```ts
type GrowthOperatorWorkItem = {
  itemId: string;
  type:
    | 'safety_alert'
    | 'source_approval'
    | 'target_hold'
    | 'artifact_review'
    | 'interested_reply'
    | 'whatsapp_assisted'
    | 'external_listing_handoff'
    | 'surface_health_failure'
    | 'freshness_due'
    | 'discovery_failure'
    | 'cost_warning'
    | 'ai_eval_failure'
    | 'incident_action';
  targetId?: string;
  campaignId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_review' | 'done' | 'blocked';
  assignedRole: 'operator' | 'growth_manager' | 'admin' | 'compliance_reviewer' | 'incident_owner';
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Distribution Target

```ts
type GrowthDistributionTarget = {
  pId: 'GE';
  targetId: string;
  leadId?: string;
  businessName: string;
  locationKey?: string;
  city?: string;
  country?: string;
  category?: string;
  claimState: 'unclaimed' | 'claim_started' | 'owner_confirmed' | 'menu_published' | 'blocked';
  truthState: 'candidate_only' | 'prefill_ready' | 'owner_confirmed' | 'menu_live' | 'stale' | 'blocked';
  surfaceReadiness: 'none' | 'private_artifact' | 'canonical_ready' | 'published' | 'distribution_active';
  primaryCanonicalUrl?: string;
  sourcePolicyId: string;
  updatedAt: string;
};
```

### Distribution Surface

```ts
type GrowthDistributionSurface = {
  surfaceId: string;
  targetId: string;
  type: 'canonical_menu' | 'official_business_page' | 'city_category_page' | 'claim_artifact' | 'truth_packet' | 'menu_feed' | 'widget_embed';
  url?: string;
  indexability: 'indexable' | 'noindex' | 'blocked' | 'not_public';
  truthRequirement: 'candidate_safe' | 'owner_confirmed' | 'menulist_verified';
  structuredDataStatus: 'not_applicable' | 'missing' | 'valid' | 'invalid';
  freshnessStatus: 'fresh' | 'review_due' | 'stale' | 'blocked';
  sitemapStatus: 'not_applicable' | 'queued' | 'included' | 'blocked';
  lastPublishedAt?: string;
  lastCheckedAt?: string;
};
```

### Discovery Publish Job

```ts
type GrowthDiscoveryPublishJob = {
  jobId: string;
  surfaceId: string;
  targetId: string;
  action: 'sitemap_update' | 'indexnow_submit' | 'menu_feed_export' | 'truth_packet_publish' | 'gbp_handoff';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';
  changedUrls: string[];
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};
```

## 6. Proposed Firestore Collections

Hot operational:

- `growthEngineLeads`
- `growthEngineLeadSummaries`
- `growthEngineLeadIdentities`
- `growthEngineDedupeKeys`
- `growthEngineSuppressions`
- `growthEngineCampaigns`
- `growthEngineCampaignSummaries`
- `growthEngineConversations`
- `growthEngineMessages`
- `growthEngineInboxItems`
- `growthEngineActionQueue`
- `growthEngineApprovals`
- `growthEngineLeadRoutes`
- `growthEngineChannelHealthSummaries`
- `growthEngineDistributionTargets`
- `growthEngineDistributionSurfaces`
- `growthEngineDiscoveryPublishJobs`
- `growthEngineSurfaceHealthSummaries`
- `growthEngineFreshnessSummaries`
- `growthEngineMenuFeedExports`
- `growthEngineGbpHandoffs`
- `growthEngineExternalListingHandoffs`
- `growthEngineTruthPackets`
- `growthEngineSourcePolicies`
- `growthEngineChannelPolicies`
- `growthEngineSenderDomains`
- `growthEngineConsentLedger`
- `growthEngineArtifactReviews`
- `growthEngineOnboardingFlowInventory`
- `growthEngineProviderRegister`
- `growthEngineGooglePlacesSourceRuns`
- `growthEngineFoursquareSourceRuns`
- `growthEngineExternalPlaceIdentities`
- `growthEngineBusinessTruthGraphNodes`
- `growthEngineBusinessTruthGraphEdges`
- `growthEngineAutomationWorkflows`
- `growthEngineWorkflowRuns`
- `growthEngineEnrichmentWaterfalls`
- `growthEngineDecisionSnapshots`
- `growthEngineAiWorkerRuns`
- `growthEngineSenderAssignments`
- `growthEngineOperatorWorkItems`

Warm/cold:

- `growthEngineSourceRuns`
- `growthEngineSourceCandidates`
- `growthEngineSendJobs`
- `growthEngineMessageEvents`
- `growthEngineFeedbackEvents`
- `growthEngineAttributionTouches`
- `growthEngineExperiments`
- `growthEngineEvalRuns`
- `growthEngineOptimizationReports`
- `growthEngineCostAttributions`
- `growthEngineIncidents`
- `growthEngineSitemapSnapshots`
- `growthEngineIndexNowSubmissions`
- `growthEngineStructuredDataChecks`
- `growthEngineDataSubjectRequests`
- `growthEngineVendorProcessorRegister`
- `growthEngineEvalDatasets`
- `growthEngineEvidencePackets`
- `growthEngineWorkflowStepEvents`
- `growthEngineOptimizationRecommendations`

Dashboards read summaries, not raw event collections.

## 7. API Surface

All routes require internal/admin auth, Zod validation, secure logging, rate limits where applicable, and product-scoped Firebase access.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/growth-engine/source-runs` | POST/GET | Create/list source runs. |
| `/api/growth-engine/source-runs/google-places` | POST | Create approved Google Places Text Search seed runs with field-mask and budget validation. |
| `/api/growth-engine/source-runs/google-places/[sourceRunId]/details` | POST | Run approved Place Details enrichment for filtered targets only. |
| `/api/growth-engine/source-runs/foursquare` | POST | Create approved Foursquare identity/category/chain source runs with PAYG outreach blocking and field-profile validation. |
| `/api/growth-engine/business-truth-graph` | GET/POST | Inspect or update candidate graph nodes and edges with provenance, confidence, and truth state. |
| `/api/growth-engine/leads` | GET | Bounded lead summary list. |
| `/api/growth-engine/leads/[leadId]` | GET/PATCH | Detail and operator updates. |
| `/api/growth-engine/distribution-targets` | POST/GET | Create/list distribution targets. |
| `/api/growth-engine/distribution-targets/[targetId]` | GET/PATCH | Target detail, claim state, truth state, surface inventory. |
| `/api/growth-engine/distribution-surfaces` | GET | Bounded surface readiness list. |
| `/api/growth-engine/distribution-surfaces/[surfaceId]/check` | POST | Recheck indexability, structured data, freshness, and HTTP state. |
| `/api/growth-engine/workflows` | GET/POST | Create/list automation workflows. |
| `/api/growth-engine/workflows/[workflowId]/run` | POST | Start an approved workflow run with idempotency key and budget checks. |
| `/api/growth-engine/workflow-runs` | GET | Inspect bounded workflow run summaries. |
| `/api/growth-engine/enrichment-waterfalls` | GET/POST/PATCH | Manage approved enrichment waterfall definitions. |
| `/api/growth-engine/decision-snapshots` | GET | Inspect decision evidence for targets/campaigns. |
| `/api/growth-engine/ai-workers` | GET/POST | Register worker definitions and request eval/run actions. |
| `/api/growth-engine/operator-work-items` | GET/PATCH | Workboard queues for review, handoff, safety, cost, and incident actions. |
| `/api/growth-engine/sender-assignments` | GET/POST/PATCH | Assign sender identity, pacing, and conversation continuity. |
| `/api/growth-engine/discovery/publish` | POST | Queue sitemap, IndexNow, feed, truth-packet, or GBP handoff job. |
| `/api/growth-engine/discovery/sitemaps` | GET/POST | Inspect or rebuild sitemap inventory. |
| `/api/growth-engine/discovery/indexnow` | POST | Submit meaningful changed URLs where allowed. |
| `/api/growth-engine/discovery/menu-feed` | GET/POST | Build feed-ready menu/entity export from confirmed MenuList truth. |
| `/api/growth-engine/discovery/truth-packets` | GET/POST | Publish AI-readable public truth packets. |
| `/api/growth-engine/gbp-handoffs` | GET/POST/PATCH | Owner-authorized menu URL/preferred-source handoff state. |
| `/api/growth-engine/external-listing-handoffs` | GET/POST/PATCH | GBP, Apple Business Connect, and Bing Places handoff state. |
| `/api/growth-engine/campaigns` | POST/GET | Create/list campaigns. |
| `/api/growth-engine/campaigns/[campaignId]/dry-run` | POST | Generate dry-run report. |
| `/api/growth-engine/campaigns/[campaignId]/launch` | POST | Launch only after dry-run and approval. |
| `/api/growth-engine/inbox` | GET | Bounded inbox summary. |
| `/api/growth-engine/inbox/[itemId]/action` | POST | Reply, suppress, route, mark done. |
| `/api/growth-engine/whatsapp-assisted` | GET/POST | Assisted send queue and confirmations. |
| `/api/growth-engine/feedback` | POST | MenuList route feedback endpoint. |
| `/api/growth-engine/kill-switches` | GET/POST/PATCH | Emergency controls. |
| `/api/growth-engine/webhooks/email` | POST | Email reply/bounce/unsubscribe webhooks. |
| `/api/growth-engine/policies/sources` | GET/POST/PATCH | Source policy registry. |
| `/api/growth-engine/policies/channels` | GET/POST/PATCH | Jurisdiction/channel policy registry. |
| `/api/growth-engine/sender-domains` | GET/POST/PATCH | Sender-domain readiness and health state. |
| `/api/growth-engine/onboarding-flows` | GET/POST/PATCH | Approved MenuList onboarding flow inventory. |
| `/api/growth-engine/artifacts/[artifactId]/review` | POST | Artifact approval/rejection. |
| `/api/growth-engine/artifacts/[artifactId]/takedown` | POST | Artifact expiry/takedown/owner complaint handling. |
| `/api/growth-engine/evals` | GET/POST | Eval datasets and run requests. |
| `/api/growth-engine/data-requests` | POST/GET | Data access/correction/deletion request workflow. |

## 8. Worker Surface

Use `functions-growth-engine/` with task queues for long-running or rate-limited work.

Workers:

- workflow run dispatcher
- workflow step executor
- enrichment waterfall runner
- AI worker executor
- decision snapshot builder
- operator work-item router
- source import
- Google Places Text Search seed discovery
- Google Places Details selective enrichment
- Foursquare identity/category/chain enrichment
- business truth graph rollup
- normalization/dedupe
- lead intelligence
- distribution target rollup
- surface publish readiness
- structured data validation
- sitemap inventory rebuild
- IndexNow changed-URL submission
- menu feed export
- GBP handoff reminders
- Apple Business Connect handoff reminders
- Bing Places handoff reminders
- truth packet publish
- surface health monitor
- freshness monitor
- dry-run generation
- email send jobs
- webhook normalization
- reply classification
- follow-up due detection
- route and distribution feedback rollup
- campaign summary rollup
- daily cost report
- eval run execution
- sender-domain health sync
- sender assignment and pacing sync
- consent/suppression rollup
- artifact expiry
- incident evidence export

No new MenuList scheduled function should be added for Growth Engine work.

## 9. Security Requirements

- Admin/internal access only.
- Role gates for viewer, operator, growth manager, admin, compliance reviewer, and incident owner.
- No public lead list routes.
- Provider tokens stored in Secret Manager or approved server-only secret store.
- No provider tokens in browser.
- Full emails/phones hidden from list views.
- Contact reveal logged.
- Raw source/webhook payloads stored outside Firestore where appropriate.
- DNC/suppression evidence retained.
- AI prompts receive masked/minimal context.
- All outbound sends re-check suppression immediately before execution.
- All webhook handlers validate source/provider signatures where available.
- All provider webhooks must be idempotent and reject unsigned or replayed payloads where provider support exists.
- Artifact review/takedown actions must be audit logged.
- Data access, correction, and deletion requests must be tracked separately from campaign workflow.
- Public distribution jobs must read confirmed MenuList truth only.
- Private artifacts must never be included in sitemaps, IndexNow, feed exports, or truth packets.
- Foursquare PAYG Places Data must not be used to contact listed businesses as prospects unless a separate contract or written permission explicitly allows it.
- Foursquare photos, tips, ratings, descriptions, popularity, menus, or profile content must not appear in public artifacts, sitemaps, feeds, truth packets, or MenuList truth.
- Google Business Profile API or GoogleLocations usage must be blocked unless owner authorization and existing relationship evidence are present.
- Google Indexing API must not be used for MenuList menu/business pages.

## 10. Launch Baseline

1. Product constants and feature flags default off.
2. Growth Engine Firebase client/admin helpers.
3. Firestore schema constants and Zod types.
4. Source policy registry.
5. Distribution target registry.
6. Business Truth Graph registry.
7. Automation workflow engine.
8. Enrichment waterfall registry and runner.
9. AI worker registry and eval-gated run executor.
10. Decision snapshot ledger.
11. Operator workboard and work-item queues.
12. Channel compliance policy registry.
13. Sender-domain readiness registry.
14. Sender assignment and pacing registry.
15. Consent/suppression ledger.
16. Provider/vendor decision register.
17. Onboarding flow inventory.
18. Canonical surface publisher.
19. Discovery publisher.
20. Menu feed exporter.
21. External listing handoff manager for GBP, Apple Business Connect, and Bing Places.
22. Truth packet publisher.
23. Surface health and freshness monitor.
24. Manual CSV import, Google Places source adapter, and Foursquare identity/category/chain adapter.
25. Dedupe and suppression services.
26. Lead and distribution target summary lists.
27. Campaign draft and dry-run.
28. Artifact review/takedown if artifacts are used.
29. Email template renderer and safety checker.
30. Email execution adapter.
31. WhatsApp assisted queue guarded by policy.
32. Tracked route bridge to MenuList onboarding.
33. Feedback ingestion and campaign/distribution summaries.
34. DNC/unsubscribe/bounce handling.
35. Global/channel/campaign/provider/surface/automation kill switches.
36. Cost summary dashboard.
37. Eval fixtures and pass/fail thresholds.
38. Incident runbook and evidence export.

## 11. Implementation Non-Negotiables

- No campaign launch without dry-run.
- No source import without approved source policy.
- No Google Places call without approved source policy, field-mask profile, budget cap, and provider register entry.
- No Google Places wildcard field mask in production.
- No Google Places Details enrichment before dedupe and pre-score.
- No Foursquare Places API PAYG outreach use without separate contract or written permission.
- No Foursquare Premium Signal profile without explicit approval, budget cap, and public-output blocker.
- No Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content in public artifacts, public pages, sitemaps, feeds, truth packets, or MenuList truth.
- No Business Truth Graph candidate or low-confidence edge reaching public publishing.
- No distribution target without source provenance.
- No public surface publish without owner-confirmed or approved MenuList-verified truth.
- No automation workflow execution without idempotency key, budget check, and kill-switch check.
- No AI worker autonomy without current eval pass and typed output schema.
- No target action without decision snapshot.
- No low-confidence AI decision reaching send or public publish without human review.
- No outbound conversation without sender assignment and pacing checks.
- No sitemap, IndexNow, feed, or truth-packet output for private claim artifacts.
- No Google Indexing API use for menu/business pages.
- No GBP API or GoogleLocations use for lead generation.
- No external listing handoff without owner authorization.
- No campaign creation without jurisdiction/channel policy.
- No send without suppression check.
- No email send without sender-domain readiness, unsubscribe endpoint, and bounce handling.
- No WhatsApp API outbound without explicit consent proof and approved templates.
- No artifact without noindex, source-rights check, expiry, and takedown path.
- No public demo sites.
- No Google Maps photos/reviews/menu/profile rehosting.
- No durable storage of broader Places content as MenuList truth; persist place IDs and request metadata only.
- No raw event dashboard reads.
- No AI free-form campaign writing.
- No AI classifier autonomy without eval pass thresholds.
- No provider without budget cap and vendor/register entry.
- No Growth Engine direct writes to MenuList public truth outside approved bridge contracts.
- No Vercel deploy without explicit user instruction.

## 12. Validation

Before any implementation handoff:

- `npx tsc --noEmit --incremental false`
- route smoke tests for product-host/dev-prefix routing if routing is added
- Firestore rules tests for Growth Engine project
- function emulator tests for source/send/webhook workers
- workflow engine idempotency/retry/kill-switch tests
- enrichment waterfall cache/cost/stop-condition tests
- Google Places field-mask, quota, and retention tests
- Foursquare source-policy, PAYG outreach-blocking, field-profile, and retention tests
- Business Truth Graph node/edge provenance, confidence, truth-state, and public-publish blocking tests
- AI worker schema/eval/budget tests
- decision snapshot evidence tests
- sender assignment and pacing tests
- operator workboard queue tests
- dry-run fixture tests
- DNC/unsubscribe/wrong-number classifier tests
- cost estimate tests
- kill-switch blocking tests
- MenuList onboarding feedback contract tests
- distribution target state tests
- structured data validation tests
- sitemap and IndexNow queue tests
- menu feed export fixture tests
- GBP handoff policy tests
- Apple Business Connect and Bing Places handoff policy tests
- truth packet public-data tests
- surface health and freshness tests
