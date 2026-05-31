# Growth Engine - Implementation Plan

**Status:** Planning only
**Product code:** `GE` proposed, not implemented
**Implementation rule:** Build only after decision gates in README are confirmed.

---

## 1. Architecture Decision

Recommended implementation is same repo, separate product boundary.

Do not clone MenuList. Do not add this to MenuList owner/customer folders. Do not reuse GrowthOS/Growth Kits folders.

The repo already requires product-scoped folders for future products and shared root infrastructure only when it is intentionally cross-product. Evidence: `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md:995-1031`.

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
src/lib/firebase/growthEngineFirebaseClient.ts
src/types/growth-engine/
```

No app code has been created yet. These are implementation targets.

## 3. Product Constants And Routing Changes Needed Later

When implementation starts:

| File | Required change |
| --- | --- |
| `src/constants/product.ts` | Add `GROWTH_ENGINE: 'GE'` if `GE` is confirmed. |
| `src/constants/deploymentTargets.ts` | Add deployment target only after Firebase/domain decisions are confirmed. |
| `src/constants/productDomains.ts` | Add Growth Engine only if a host or dev prefix is approved. |
| `src/config/features.ts` | Add `ENABLE_GROWTH_ENGINE_*` flags, default off. |
| `src/constants/database.ts` | Add `GROWTH_ENGINE_*` collection constants only after schema is locked. |

Do not reuse existing `GROWTH_OS: 'GR'`; it is reserved for GrowthOS/Growth Kits.

## 4. Product Modules

Build order is dependency order, not "MVP" scope.

| Order | Module | Purpose |
| ---: | --- | --- |
| 1 | Data foundation | Canonical lead identity, summaries, dedupe, suppressions, events. |
| 2 | Source ingestion | Import raw candidates through adapters; no outreach. |
| 3 | Lead intelligence | Typed fit, need, contactability, risk, and human-review decisions. |
| 4 | Channel identity and eligibility | Email/phone/WhatsApp/social identity states and policy gates. |
| 5 | Campaign foundation | Drafts, audiences, caps, stop rules, approvals, summaries. |
| 6 | Dry-run engine | End-to-end campaign validation without sending. |
| 7 | Template and guardrails | Approved variables, banned claims, safety blocks. |
| 8 | Onboarding route bridge | Tracked MenuList onboarding links and feedback ingestion. |
| 9 | Email execution | First automated outbound channel. |
| 10 | WhatsApp assisted | Operator-reviewed send queue. |
| 11 | Unified inbox | Conversations, messages, reply composer, DNC/wrong-number actions. |
| 12 | Reply classifier | Interested, DNC, unsubscribe, wrong-number, pricing, objection, human review. |
| 13 | Follow-up/NBA | State-aware follow-up and retargeting with cooldowns. |
| 14 | Attribution and rollups | Source/campaign/channel/template/flow performance. |
| 15 | Safety/control room | Kill switches, incidents, budget caps, evals, channel health. |
| 16 | Optimizer | Daily/weekly recommendations after enough feedback exists. |

## 4A. Second-Pass Required Foundations

The first implementation must build these foundations before any send worker is enabled:

| Module | Purpose |
| --- | --- |
| Source policy registry | Defines approved sources, allowed fields, source terms, retention class, raw payload handling, and approval owner. |
| Channel compliance policy | Maps country, channel, message type, opt-in requirement, unsubscribe requirement, and launch blockers. |
| Consent/suppression ledger | Stores opt-in, unsubscribe, DNC, complaint, wrong-contact, bounce, and proof events across all campaigns. |
| Sender-domain readiness | Tracks DNS/authentication, unsubscribe endpoint, bounce handling, sender identity, ramp limits, and health thresholds. |
| Provider decision matrix | Records approved provider, cost model, webhook support, data retention, processor/vendor status, and shutdown path. |
| Onboarding flow inventory | Lists approved MenuList onboarding flows, route payloads, event names, and fallback behavior. |
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
  provider: 'manual_csv' | 'apify' | 'first_party' | 'other';
  status: 'draft' | 'approved' | 'paused' | 'blocked';
  allowedUse: 'candidate_discovery' | 'enrichment' | 'verification_only';
  allowedFields: string[];
  blockedFields: string[];
  rawPayloadRetentionDays: number;
  mayUseForOutreach: boolean;
  mayUseInArtifact: boolean;
  sourceTermsUrl?: string;
  approvalOwner: string;
  approvedAt?: string;
  updatedAt: string;
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
- `growthEngineSourcePolicies`
- `growthEngineChannelPolicies`
- `growthEngineSenderDomains`
- `growthEngineConsentLedger`
- `growthEngineArtifactReviews`
- `growthEngineOnboardingFlowInventory`
- `growthEngineProviderRegister`

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
- `growthEngineDataSubjectRequests`
- `growthEngineVendorProcessorRegister`
- `growthEngineEvalDatasets`

Dashboards read summaries, not raw event collections.

## 7. API Surface

All routes require internal/admin auth, Zod validation, secure logging, rate limits where applicable, and product-scoped Firebase access.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/growth-engine/source-runs` | POST/GET | Create/list source runs. |
| `/api/growth-engine/leads` | GET | Bounded lead summary list. |
| `/api/growth-engine/leads/[leadId]` | GET/PATCH | Detail and operator updates. |
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

- source import
- normalization/dedupe
- lead intelligence
- dry-run generation
- email send jobs
- webhook normalization
- reply classification
- follow-up due detection
- route feedback rollup
- campaign summary rollup
- daily cost report
- eval run execution
- sender-domain health sync
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

## 10. First Build Slice

1. Product constants and feature flags default off.
2. Growth Engine Firebase client/admin helpers.
3. Firestore schema constants and Zod types.
4. Source policy registry.
5. Channel compliance policy registry.
6. Sender-domain readiness registry.
7. Consent/suppression ledger.
8. Provider/vendor decision register.
9. Onboarding flow inventory.
10. Manual CSV import and one approved source adapter.
11. Dedupe and suppression services.
12. Lead summary list.
13. Campaign draft and dry-run.
14. Artifact review/takedown if artifacts are used.
15. Email template renderer and safety checker.
16. Email execution adapter.
17. Tracked route bridge to MenuList onboarding.
18. Feedback ingestion and campaign summary.
19. DNC/unsubscribe/bounce handling.
20. Global/channel/campaign/provider kill switches.
21. Cost summary dashboard.
22. Eval fixtures and pass/fail thresholds.
23. Incident runbook and evidence export.

WhatsApp assisted is the second slice.

## 11. Implementation Non-Negotiables

- No campaign launch without dry-run.
- No source import without approved source policy.
- No campaign creation without jurisdiction/channel policy.
- No send without suppression check.
- No email send without sender-domain readiness, unsubscribe endpoint, and bounce handling.
- No WhatsApp API outbound without explicit consent proof and approved templates.
- No artifact without noindex, source-rights check, expiry, and takedown path.
- No public demo sites.
- No Google Maps photos/reviews/menu/profile rehosting.
- No raw event dashboard reads.
- No AI free-form campaign writing.
- No AI classifier autonomy without eval pass thresholds.
- No provider without budget cap and vendor/register entry.
- No MenuList public truth writes.
- No Vercel deploy without explicit user instruction.

## 12. Validation

Before any implementation handoff:

- `npx tsc --noEmit --incremental false`
- route smoke tests for product-host/dev-prefix routing if routing is added
- Firestore rules tests for Growth Engine project
- function emulator tests for source/send/webhook workers
- dry-run fixture tests
- DNC/unsubscribe/wrong-number classifier tests
- cost estimate tests
- kill-switch blocking tests
- MenuList onboarding feedback contract tests
