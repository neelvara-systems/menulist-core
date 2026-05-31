# Growth Engine - Firebase Cost And Data Plan

**Status:** Planning only
**Cost impact now:** None
**Runtime posture:** Separate Firebase project recommended

---

## 1. Firebase Target Decision

Use separate Firebase projects:

| Stage | Proposed project |
| --- | --- |
| QA/local product data | `growth-engine-qa` |
| Production | `growth-engine` |

Do not store Growth Engine lead data inside MenuList's `menulist` or `ecomsai` Firestore projects except for the explicit tracked-route feedback bridge.

## 2. Why Separate Firebase

Growth Engine stores lead PII, outreach state, message history, suppression evidence, campaign metrics, provider webhooks, source payload references, and compliance incidents.

Keeping this in MenuList Firestore would create unnecessary risk for owner/customer data, rules complexity, and cost attribution.

## 3. Cost Model Principles

Firestore charges for reads, writes, deletes, storage, and index-entry reads. Firebase also recommends budgets and usage monitoring for unexpected charges. Source: https://firebase.google.com/docs/firestore/pricing

BigQuery on-demand queries are charged by bytes processed, and explicit `LIMIT` does not reduce bytes scanned by itself. Source: https://cloud.google.com/bigquery/pricing

Provider costs must be modeled alongside Firebase costs. Amazon SES lists outbound email pricing per 1,000 emails, Resend plans include domain/authentication and webhook features, and Apify Google Maps Scraper-style actors can charge per 1,000 results. Sources: https://aws.amazon.com/ses/pricing/, https://resend.com/pricing, https://apify.com/crustapi/google-maps-scraper

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
13. No source import without source policy and retention class.
14. No email send without sender-domain readiness and provider webhook readiness.

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
| `growthEngineSourcePolicies` | Approved source rules | Small policy list |
| `growthEngineChannelPolicies` | Jurisdiction/channel eligibility | Small policy list |
| `growthEngineSenderDomains` | Email DNS/readiness/health | Small list/detail |
| `growthEngineConsentLedger` | Opt-in, unsubscribe, DNC, complaint, bounce proof | Identity lookup only |
| `growthEngineOnboardingFlowInventory` | Approved MenuList route bridge flows | Small policy list |
| `growthEngineProviderRegister` | Approved providers, costs, retention, webhooks | Small policy list |

## 5. Warm/Cold Collections

| Collection | Purpose | UI rule |
| --- | --- | --- |
| `growthEngineSourceRuns` | Source execution records | List recent only |
| `growthEngineSourceCandidates` | Imported candidate staging | Not normal dashboard |
| `growthEngineMessages` | Conversation messages | Lead/conversation detail only |
| `growthEngineMessageEvents` | Delivery/reply/click events | Never dashboard scan |
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

## 6. Storage

Use Cloud Storage for:

- raw source payloads
- raw provider webhook payloads
- import CSV files
- large export reports
- eval datasets
- dry-run sample bundles if too large for Firestore

Firestore stores references, checksums, timestamps, provider/source metadata, retention class, and status.

Do not store Google Maps photos, reviews, menus, or profile content as Growth Engine assets.

## 7. Task Queues And Workers

Firebase task queue functions can handle async, resource-intensive, rate-limited work outside the main request path. Source: https://firebase.google.com/docs/functions/task-functions

Use task queues for:

- source import
- normalization/dedupe
- lead intelligence
- dry-run generation
- send jobs
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
    requireApprovalAboveUsd: number;
  };
  channels: {
    maxEmailSendsPerDay?: number;
    maxWhatsappAssistedPerDay?: number;
    maxWhatsappApiPerDay?: number;
    maxEmailProviderSpendUsdPerDay?: number;
  };
  analytics: {
    maxBigQueryBytesBilledPerQuery?: number;
    maxBigQuerySpendUsdPerDay?: number;
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
- non-critical jobs pause on critical budget threshold

## 9. Provider Cost Guardrails

| Provider area | Guardrail |
| --- | --- |
| Source providers | Require policy approval, run cap, daily cap, raw payload retention class, and source-quality review before campaign eligibility. |
| Email provider | Track per-send cost, bounce webhook health, unsubscribe webhook health, domain readiness, spam-rate threshold, and daily send cap. |
| WhatsApp provider | Assisted-only until opt-in proof and template approval exist; API costs stay disabled until policy review. |
| AI provider | Cache typed outputs by source hash and prompt version; block duplicate spend on unchanged inputs. |
| BigQuery | Partition event tables, cluster by campaign/source/channel where needed, set max bytes billed, and keep dashboards on rollups. |

## 10. Cost Simulation

For a first controlled campaign of 100 leads:

| Operation | Estimated count | Cost note |
| --- | ---: | --- |
| Import candidates | 100-300 writes | Depends on source result volume and staging retention. |
| Dedupe keys | 100-300 reads/writes | Hash lookup plus created/merged keys. |
| Lead summaries | 100 writes | One summary per accepted lead. |
| Lead intelligence | 100 AI/provider runs max | Must be budget-gated and cached by source hash. |
| Dry-run | 100-300 reads, 1 report write | Reads summaries, suppressions, templates, campaign policy. |
| Email sends | 100 send jobs + events | Provider cost outside Firebase. |
| Replies/clicks | variable writes | Webhook-driven. |
| Dashboard | bounded summary reads | No raw event scans. |
| Sender health sync | small scheduled/queued reads | Domain/provider status only. |
| Artifact QA | variable writes/storage refs | Only if artifact is used. |
| BigQuery export/query | bounded batch/export | Must use partitioning and max bytes billed. |

For 1,000 leads, use batch jobs and summary rollups. Do not open raw lead/event streams in the UI.

## 11. Retention

| Data | Retention posture |
| --- | --- |
| Raw source payload | Short TTL unless needed for audit. |
| Raw webhook payload | Short TTL after normalized event is stored. |
| Lead summary | Active while lead remains eligible. |
| DNC/suppression evidence | Long-term retention. |
| Message body | Retain only as needed for compliance/support; redact old bodies if policy requires. |
| AI debug prompt/result | Short TTL; store typed outcome instead. |
| Attribution summaries | Long-term aggregate retention. |
| Source policy approval | Long-term while source may explain prior outreach. |
| Consent, unsubscribe, DNC, complaint proof | Long-term retention for suppression and audit. |
| Artifact review/takedown | Retain review evidence after artifact expiry. |
| Vendor/data processor records | Long-term while vendor was used for any retained data. |
| Data subject request records | Long-term audit record, with personal payload minimized. |

TTL deletes are still billable. TTL is for retention hygiene, not a reason to write extra data.

## 12. No Runtime Cost From Docs

This document creates no runtime cost.
