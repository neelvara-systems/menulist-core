# Growth Engine - Product Specification

**Status:** Planning spec
**Product code:** `GE` proposed, not implemented; `MN` if `MenuNexus` is secured before implementation
**Audience:** Internal MenuList growth/admin team
**Scope:** Separate internal distribution product for MenuList target acquisition, truth activation, owned surface publishing, discovery notification, and attribution

---

## 1. Executive Summary

Growth Engine helps MenuList build its own distribution automation system without depending on generic lead-gen, CRM, enrichment, or outreach tools.

The system discovers or imports candidate businesses, normalizes and dedupes them, runs owned enrichment waterfalls, detects menu truth gaps, scores distribution value, selects safe channels, routes owners into claim/onboarding, activates canonical MenuList truth, publishes owned surfaces, emits structured data and discovery feeds, monitors freshness, and attributes distribution outcomes.

The north-star metric is:

```txt
owner-confirmed MenuList menu truth distributed on owned surfaces
```

Not:

- leads scraped
- messages sent
- reply rate alone
- demo pages generated
- AI automation rate
- third-party CRM pipeline steps
- generic enrichment volume

## 2. Product Scope

### In Scope

- lead source runs and imports
- manual CSV import
- Google Places candidate discovery through approved field-mask profiles
- Foursquare identity/category/chain enrichment through approved source policy
- lead normalization and dedupe
- distribution target registry
- Business Truth Graph registry for business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution relationships
- owned automation workflow engine
- Connections And Activation internal screen for adapter IDs, provider credentials, email pipeline readiness, WhatsApp pipeline readiness, webhooks, budgets, kill switches, and activation approvals
- enrichment waterfalls for target identity, menu gap, contactability, and source confidence
- decision snapshots explaining every route, hold, reject, send, publish, or block action
- AI worker registry with typed outputs, prompt versions, eval thresholds, budgets, and approval gates
- operator workboard and work-item queues
- menu truth gap detection
- contact identity registry
- suppression and DNC handling
- lead fit scoring
- truth activation and claim route creation
- canonical MenuList menu/business surface publishing status
- structured data validation for public pages
- sitemap and sitemap-index inventory
- IndexNow submission for meaningful public URL changes where allowed
- Google-compatible menu feed export readiness
- Google Business Profile menu-link/preferred-source owner handoff
- AI-readable public truth packets from confirmed MenuList data
- surface health and freshness monitoring
- owner website embed/widget distribution tracking
- external listing handoff tracking for Google Business Profile, Apple Business Connect, and Bing Places where owner-authorized
- campaign creation, dry-run, approval, caps, and stop rules
- email execution after compliance checks
- WhatsApp assisted-send queue
- WhatsApp Message Governance Layer for consent, templates, conversation state, webhook events, reputation, pacing, sender identity, and audit
- WhatsApp owner-verification and truth-maintenance journeys after explicit opt-in or owner-initiated conversation
- WhatsApp Flows for structured owner-confirmed business truth capture after policy approval
- inbound reply ingestion where provider support exists
- unified internal inbox
- reply classification
- tracked onboarding route creation
- onboarding feedback ingestion
- campaign/source/channel/template summaries
- distribution/source/surface/freshness summaries
- cost and safety control room
- operator/admin audit logs
- kill switches

### Out Of Scope

- MenuList owner/customer UI
- MenuList menu extraction or creation
- owner onboarding UX
- business verification
- writing MenuList truth directly
- website building for leads
- public demo websites
- direct Google Business Profile claiming
- Google Indexing API use for menu pages
- Google review ingestion for lead gen
- Google Places content as durable truth
- Google Places photos/reviews/profile/menu rehosting
- Foursquare Places API pay-as-you-go data used to contact listed businesses as prospects without separate contract or written permission
- Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content as public artifacts or MenuList truth
- Foursquare source content as durable MenuList truth
- bulk calling/SMS/WhatsApp blasting
- WhatsApp API outreach from scraped, enriched, or public phone numbers without explicit opt-in
- WhatsApp shared sender pools for unrelated tenants
- WhatsApp number rotation to bypass quality or account limits
- WhatsApp generic AI assistant distribution
- WhatsApp templates misclassified as utility when the content is marketing
- WhatsApp Flows that collect unnecessary personal data or hidden marketing consent
- aggregator-style public listing outreach before MenuList is proven with real production owners
- broad public/source-provider acquisition runs before real production owner activation, retention, and value are validated
- lead marketplace, lead resale, or buyer/seller routing product outside MenuList distribution
- generic CRM pipeline management
- generic lead database/enrichment replacement
- third-party outreach tool wrapper
- public marketplace or lead-sales product
- external customer-facing Growth Engine product

## 3. Primary Users

| User | Job |
| --- | --- |
| Founder/admin | Approve distribution surfaces, budgets, providers, scale, and incidents. |
| Growth/distribution manager | Review source quality, approve target cohorts, validate distribution readiness, and manage channel/surface health. |
| Operator | Work claim replies, assisted WhatsApp, interested owners, DNC/wrong number, owner handoffs, and human-review items. |
| System workers | Normalize, score, publish, feed, notify, route, render, send/queue, classify, summarize, and alert. |

## 4. Core Workflows

### Distribution Target Intake

1. Growth/distribution manager creates a source run or import.
2. Provider adapter imports raw candidates.
3. Raw payloads go to Storage where appropriate.
4. Normalizer creates structured source candidates.
5. Dedupe checks identity keys.
6. Distribution targets are created, merged, held, or rejected.
7. Intelligence scores fit, menu truth gap, contactability, surface readiness, and risk.
8. Decision snapshot records evidence, rejected facts, blockers, confidence, and next action.
9. Source quality summary updates.
10. No outreach or public publishing happens from a source run directly.

### Truth Activation

1. Eligible target receives a claim route or safe private artifact.
2. Owner confirms the business/menu flow through approved MenuList onboarding.
3. MenuList creates or updates canonical truth.
4. Growth Engine records activation state and distribution eligibility.
5. Public distribution starts only after owner confirmation or approved MenuList verification.

### Owned Surface Publishing

1. Canonical MenuList menu/business page becomes eligible.
2. Structured data is generated and validated.
3. Sitemap inventory and lastmod are updated.
4. IndexNow is queued only for meaningful changed URLs where allowed.
5. Menu feed export readiness updates.
6. GBP handoff state updates when owner can set menu URL or preferred source.
7. Surface health monitor checks indexability, noindex, redirects, HTTP status, and structured data.

### Campaign Draft And Dry Run

1. Growth manager creates campaign draft.
2. Select objective, target cohort, source filters, channels, offer angle, templates, claim route, and distribution surface.
3. Configure caps, stop rules, budget, and approval policy.
4. Run dry-run.
5. Dry-run produces eligible counts, exclusions, sample messages, cost estimate, channel allocation, sender capacity, AI/evidence confidence, surface readiness, discovery actions, risks, and blockers.
6. Campaign cannot launch unless dry-run is successful.

### Outreach Execution

1. Campaign launch locks an audience snapshot.
2. Suppression and eligibility are rechecked.
3. Channel router selects send mode.
4. Template renderer fills approved variables.
5. Safety checker blocks unsupported claims.
6. Execution layer sends email or creates assisted WhatsApp tasks.
7. Sends, failures, replies, clicks, and route events update summaries.

### Reply Handling

1. Inbound message or operator note is attached to a conversation.
2. Classifier detects interest, DNC, unsubscribe, wrong number, pricing question, objection, or human-review need.
3. DNC/complaints cancel pending work immediately.
4. Interested leads get a tracked MenuList onboarding route.
5. Follow-up runs only after latest-state, distribution-state, sender-assignment, channel-health, and suppression checks.

### Feedback Loop

1. MenuList emits growth feedback events for route clicked, onboarding started, completed, dropped, or blocked.
2. MenuList emits distribution events for canonical surface published, sitemap updated, feed exported, truth packet published, freshness review due, or surface error.
3. Growth Engine stores attribution and updates campaign/source/channel/template/surface summaries.
4. Optimizer reports what to expand, pause, review, or stop.

## 5. Artifact Policy

The video/conversation's strongest idea is artifact-first outbound. For Growth Engine, the artifact can be:

- noindex MenuList claim preview
- public-info audit
- menu/hours freshness report
- "what customers can verify today" report
- onboarding prefill preview
- claim-readiness report
- distribution-readiness report

Hard rules:

- Artifact is private or noindex by default.
- Artifact must say "unclaimed preview" or equivalent when not owner-confirmed.
- Artifact must not rehost Google photos, reviews, menus, or profile content.
- Artifact must not rehost Foursquare photos, tips, ratings, descriptions, popularity, menus, or profile content.
- Artifact must not invent menu items, prices, phone numbers, offers, hours, ratings, or customer claims.
- Artifact must not become MenuList truth until owner-confirmed through approved MenuList flows.
- Artifact must not be submitted to sitemaps, IndexNow, feeds, or search surfaces.

## 6. Compliance And Data Policy

Growth Engine handles personal and business contact data. It must have:

- lawful purpose documented per source/channel
- source provenance
- masking in list views
- full contact reveal only for authorized users
- DNC and suppression evidence
- retention policy
- correction and deletion workflow where applicable
- provider token isolation
- provider credentials stored as server-only secret references, never plaintext Firestore fields or browser-readable values
- no raw sensitive payloads in AI prompts
- no scraped reviews/photos/menu content stored as durable lead facts

Email must have opt-out and sender identity. WhatsApp starts assisted only unless explicit opt-in, approved templates, legal/channel review, conversation-window state, webhook ingestion, reputation monitoring, and message-governance audit are complete.

Phone number is not WhatsApp consent. WhatsApp opt-in must store the consent source, text shown, category, timestamp, source URL where available, privacy policy version, and proof hash. Opt-out, STOP, unsubscribe, wrong-contact, complaint, invalid number, and revoked consent must suppress or quarantine sends automatically.

## 7. Required Operating Foundations

Web research and the distribution decision make these product gates:

| Foundation | Requirement |
| --- | --- |
| Distribution target registry | Every lead-like record must map to a business/location/menu target, claim state, truth state, and surface inventory. |
| Business Truth Graph registry | Every business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution relationship must have source provenance, confidence, and truth state. Candidate or low-confidence edges cannot publish. |
| Automation workflow engine | Every recurring action must run through typed triggers, steps, retries, idempotency keys, approvals, budgets, and kill-switch checks. |
| Enrichment waterfall registry | Business identity, menu gap, contactability, and source confidence must use ordered source/provider/AI steps with run conditions, cache keys, costs, and success-provider evidence. |
| Decision snapshot ledger | Every target action must store the evidence, scores, rejected facts, blockers, confidence, rule/prompt version, and next action. |
| AI worker registry | Source cleaning, identity resolution, gap auditing, contactability, artifact drafting, personalization, reply classification, surface validation, feed validation, optimization, and incident summaries need typed outputs and eval thresholds. |
| Operator workboard | Human-review decisions must be queue-based with owner, severity, due state, and audit trail. |
| Source policy registry | Every source must record allowed use, allowed fields, source terms, retention class, raw payload policy, and approval owner before import. |
| Connections And Activation registry | Every provider adapter, email pipeline, WhatsApp pipeline, webhook, secret reference, budget cap, kill-switch scope, validation run, and activation decision must be configured before provider execution. |
| Implementation readiness contract | Route inventory, screen states, RBAC, flags, env keys, Firestore rules/indexes, seed config, API guards, UI guards, and tests must be covered before code starts. |
| Jurisdiction/channel matrix | Campaigns must choose jurisdiction before email, WhatsApp, SMS/calling, or social eligibility is calculated. |
| Consent and suppression ledger | Unsubscribe, DNC, complaint, wrong-contact, bounce, and opt-in evidence must live in one global ledger that overrides every campaign. |
| Sender-domain readiness | Email launch requires SPF/DKIM/DMARC status, sender identity, unsubscribe endpoint, bounce handling, slow-ramp policy, and spam-rate thresholds. |
| WhatsApp Message Governance Layer | WhatsApp API sending requires consent ledger, suppression ledger, template registry, conversation state, governance audit, webhook event store, reputation monitor, sender identity policy, pacing policy, and kill switches. |
| WhatsApp proof model | WhatsApp remains assisted-only until explicit opt-in proof, approved templates, provider readiness, conversation-window handling, webhook verification, reputation monitoring, and local policy review exist. |
| Onboarding flow inventory | Growth Engine must know the approved MenuList onboarding flows, accepted payloads, tracked route event names, and fallback behavior. |
| Canonical surface publisher | MenuList-owned public menu/business surfaces need publish state, structured data state, sitemap state, and freshness state. |
| Discovery publisher | Sitemaps, IndexNow, feed exports, and truth packets need queueing, idempotency, retries, and audit logs. |
| Menu feed exporter | MenuList needs feed-ready entity/menu/section/item/export payloads even when external submission is disabled. |
| GBP handoff manager | Owner-authorized menu URL/preferred-source work must be tracked without using GBP APIs for lead generation. |
| External listing handoff manager | Google Business Profile, Apple Business Connect, and Bing Places are tracked as owner-authorized distribution handoffs, not lead sources or truth authorities. |
| Artifact QA and takedown | Private/noindex artifacts need source-rights check, accuracy check, expiry, owner complaint path, and takedown state. |
| Provider/vendor register | Source, email, WhatsApp, analytics, AI, and storage providers need cost, retention, data processor, webhook, and shutdown notes. |
| AI evals | Scoring, reply classification, pricing answers, DNC handling, and message safety need seed datasets and pass thresholds before autonomy. |
| Incident runbook | Complaint spikes, provider blocks, source-policy failures, bad artifacts, and data deletion requests need severity, owner, kill-switch, and evidence export steps. |

These foundations are launch-baseline requirements.

## 8. Launch Baseline

Production-shaped baseline:

```txt
source policy registry
-> Connections And Activation registry
-> implementation readiness contract
-> source identity handles
-> distribution target registry
-> Business Truth Graph registry
-> automation workflow engine
-> enrichment waterfall registry
-> AI worker registry
-> channel policy matrix
-> WhatsApp Message Governance Layer
-> sender readiness
-> manual CSV or approved source import
-> normalization/dedupe/suppression
-> truth gap intelligence
-> onboarding flow inventory
-> canonical surface publisher
-> discovery publisher
-> menu feed exporter
-> GBP handoff manager
-> campaign draft
-> dry-run
-> decision snapshot
-> private artifact QA where artifacts are used
-> email execution
-> tracked onboarding route
-> owner-confirmed MenuList truth activation
-> structured data validation
-> sitemap inventory
-> changed-URL notification where allowed
-> public truth packet
-> external listing handoff where owner-authorized
-> freshness and surface health monitoring
-> feedback event
-> attribution summary
-> inbox/reply classification
-> DNC handling
```

WhatsApp assisted remains available only when the channel policy, opt-in model, and suppression checks pass.

## 9. Success Metrics

| Metric | Meaning |
| --- | --- |
| Qualified lead validity rate | Source quality. |
| Contactability rate | Channel quality. |
| Dry-run pass rate | Campaign readiness. |
| DNC/complaint rate | Safety and fit. |
| Interested reply rate | Message/channel fit. |
| Onboarding start rate | Route and offer fit. |
| Completed onboarding rate | Actual growth value. |
| Cost per completed onboarding | Economic viability. |
| Manual decisions per completion | Operator leverage. |
| Automation decision accuracy | Critical DNC, pricing, private-data, unverified-truth, and wrong-contact misses. |
| Evidence completeness rate | Decisions with source evidence, rejected facts, prompt/rule version, and confidence recorded. |
| Enrichment cost per qualified target | Cost efficiency of owned source/fact waterfalls. |
| Human-review escape rate | How often low-confidence targets reach sending or publishing incorrectly. |
| Canonical menu surfaces published | Distribution coverage. |
| Structured data validity rate | Machine-readable truth quality. |
| Sitemap freshness accuracy | Crawl inventory quality. |
| Meaningful changed URLs notified | Discovery timeliness. |
| Menu feed export readiness | Partner/discovery readiness. |
| GBP menu-link/preferred-source completions | Owner-authorized external distribution. |
| External listing handoff completions | GBP, Apple Business Connect, and Bing Places owner-authorized handoffs completed. |
| Freshness review overdue rate | Truth decay risk. |
| WhatsApp opt-in proof coverage | WhatsApp-eligible contacts with auditable opt-in proof. |
| WhatsApp template health | Approved templates with acceptable quality and no paused/disabled state. |
| WhatsApp verified-owner conversations | Consented WhatsApp conversations that result in owner verification, correction, or support outcome. |
| WhatsApp Claim/Invite experiment health | Consented experiments with safe delivery, opt-out, complaint, quality, and cost signals. |
| WhatsApp opt-out and complaint rate | Channel trust and account-health risk. |
| WhatsApp Flow completion rate | Structured truth capture success. |

## 10. Non-Functional Requirements

- All campaigns must be idempotent.
- All sends must have suppression checks.
- All background jobs must be queue/rate-limit aware.
- All dashboards must read summary docs, not raw event streams.
- All provider calls must have budgets and logs.
- All AI decisions must be typed and evaluable.
- All workflow runs must be idempotent, resumable, budget-gated, and kill-switch-aware.
- All enrichment waterfalls must cache by source hash and stop after valid evidence.
- All target actions must store a decision snapshot.
- All outbound conversations must preserve one sender assignment per target.
- All campaign launches must have dry-run evidence.
- All critical channels must have kill switches.
- All PII list views must be masked.
- All cross-product MenuList integration must be explicit.
- All source, channel, artifact, and vendor decisions must be policy-backed.
- All email sends must pass sender-domain readiness and unsubscribe checks.
- All WhatsApp API sends must pass consent, suppression, template, conversation-window, reputation, sender identity, pacing, and governance-audit checks.
- All WhatsApp Claim/Invite experiments must use consented audiences only; public source provenance is context, not opt-in.
- All WhatsApp webhooks must be signature-verified, idempotent, and mapped to message outcomes.
- All WhatsApp Flows must collect only approved business-truth fields and attach proof to the target.
- All artifacts must have expiry and takedown state.
- All public distribution must come from owner-confirmed or approved MenuList-verified truth.
- All public pages must have indexability, structured data, sitemap, canonical URL, and freshness state.
- All search/discovery notifications must be tied to meaningful content changes.
- All GBP work must be owner-authorized and policy-compliant.
- All external listing handoffs must be owner-authorized and tracked as distribution handoffs only.

## 11. Implementation Decisions

These decisions are locked for implementation unless an explicit owner override changes them.

| Area | Decision |
| --- | --- |
| Product name | Keep `Growth Engine` in code/docs until `MenuNexus` domain purchase and company-name checks are complete. |
| Product code | Use `GE` for first implementation. Reserve `MN` only if `MenuNexus` is secured before product constants are added. |
| Firebase projects | Use `growth-engine-qa` and `growth-engine` as separate Firebase projects. |
| Runtime boundary | Same repo, separate product folders, separate Firebase, separate Cloud Functions package. |
| Host/routing | Use internal/admin route first. No public Growth Engine website or public host. |
| Connections screen | Add internal `/growth-engine/connections` control screen before provider execution. It stores adapter metadata and secret references, validates email/WhatsApp/source/discovery/AI connections, and blocks activation when policy, webhook, budget, or kill-switch checks fail. |
| First email provider | Use Amazon SES as the primary low-level email delivery adapter because it supports production sender control, bounce/complaint handling, and low per-send cost. Keep provider abstraction so Resend can be used for controlled testing if explicitly approved. |
| First sender domain | Use a dedicated subdomain such as `reach.menulist.ai`; do not send from the root MenuList domain. Require SPF, DKIM, DMARC, one-click unsubscribe, bounce/complaint webhooks, and slow ramp before sends. |
| Jurisdictions | Support India, US, and `GLOBAL_REVIEW` policy records from the start. A campaign must choose one jurisdiction policy before eligibility is calculated. |
| Source adapters | Manual CSV is mandatory. Google Places is allowed as a controlled candidate-discovery and place identity adapter. Apify or similar adapters are allowed only as approved candidate-discovery sources with source policy, field allowlist, raw payload TTL, spend cap, and no rehosting of restricted content. |
| Google Places usage | Use Text Search (New) IDs-only field masks for seed discovery, persist place IDs only as durable Google handles, and run Place Details only for filtered candidates using approved field-mask profiles. No wildcard field masks, durable Places content, photos, reviews, profile content, or public output from Google data. |
| Foursquare usage | Use Foursquare only as a source-policy-gated identity/category/chain graph signal by default. Standard pay-as-you-go API data cannot be used to contact listed businesses as prospective customers unless a separate contract or written permission explicitly allows it. |
| FSQ OS Places usage | Evaluate FSQ OS Places separately with license review, field allowlist, retention policy, source attribution, and no public truth use until confirmed through MenuList. |
| Business Truth Graph | Growth Engine creates candidate graph edges from source evidence. MenuList creates confirmed truth edges through owner confirmation or approved MenuList verification. Public publishing blocks on candidate-only or low-confidence graph state. |
| Distribution target identity | Resolve by normalized business name, country, city, address/location key, phone/domain/menu URL evidence, MenuList store/outlet match, and source provenance. Low confidence goes to human review. |
| Eligible public surfaces | Canonical MenuList menu page and official business page are eligible after owner confirmation or approved MenuList verification. City/category pages require confirmed public truth and usefulness; no thin pages from candidate data. |
| Canonical URL contract | Growth Engine must consume MenuList's canonical surface resolver or bridge output. It must not hardcode public URL patterns. |
| Structured data contract | Use Restaurant/LocalBusiness, Menu, MenuSection, MenuItem, Offer, price, currency, language, availability, canonical URL, and freshness metadata where supported by confirmed MenuList truth. |
| Sitemap ownership | MenuList owns public sitemap inventory. Growth Engine queues sitemap update requests with host-correct URLs and content-based `lastmod` only. |
| Changed-URL notifications | IndexNow and similar jobs run only for meaningful public URL additions, updates, or removals after the integration is enabled. No private artifacts, unchanged URLs, or candidate-only pages. |
| Menu feed schema | Use internal schema `menulist-menu-feed-2026-06` for restaurant entity, menu, section, item, option, offer, price, currency, language, and freshness validation. External submission remains disabled until partner eligibility is approved. |
| GBP handoff | Owner instruction and tracked handoff first. API usage only after owner OAuth/authorization, existing relationship proof, policy approval, and no GoogleLocations lead-generation use. |
| Apple/Bing handoff | Track owner-authorized handoff tasks only. Do not treat Apple Business Connect or Bing Places data as MenuList truth. |
| Truth packet schema | Use `menulist-truth-packet-2026-06` with public confirmed business/menu facts, canonical URLs, freshness metadata, and no private contact data. |
| Source field retention | Retain normalized allowed fields while target is active. Raw source payloads use short TTL. Block photos, reviews, unlicensed menu content, and unsupported profile content from durable facts. |
| Suppression identity | Suppression keys include normalized email hash, E.164 phone hash, WhatsApp identity hash, business/location target key, source identity, and complaint evidence. |
| Unsubscribe endpoint | Use `/api/growth-engine/unsubscribe` with one-click List-Unsubscribe handling for email and global suppression write-through. |
| WhatsApp opt-in | Accept only timestamped explicit opt-in, owner-initiated WhatsApp conversation, click-to-WhatsApp entry, or approved first-party form consent. Store consent text, category, source, source URL where available, privacy version, timestamp, and proof hash. Assisted send remains default. |
| WhatsApp API posture | API outbound is disabled until the Message Governance Layer, approved templates, conversation-state engine, webhook verification, reputation monitor, sender identity policy, pacing policy, and kill switches are implemented. |
| WhatsApp use cases | Allow owner claim, business verification, public-info correction, incomplete claim recovery, stale data confirmation, support handoff, and owner referral. Block generic cold prospecting from scraped/enriched phone numbers. |
| WhatsApp sender identity | Use a MenuList-owned verified identity only for MenuList claim, verification, support, and truth-maintenance messages. Do not use shared sender pools or number rotation. |
| WhatsApp Flows | Use only for structured owner-confirmed business truth capture after policy approval. Do not use Flows for generic AI chat, hidden consent, or lead resale intake. |
| Onboarding routes | Use an explicit MenuList onboarding flow inventory table. Growth Engine creates tracked growth routes only from inventory records, never raw URLs. |
| Artifact ownership | Compliance reviewer owns approval/takedown; admin owns incident escalation. Expiry, noindex, source-rights check, and owner complaint path are mandatory. |
| AI thresholds | DNC, unsubscribe, complaint, wrong-contact, private-data, blocked-source, pricing-invention, and unverified-truth fixtures need zero critical misses before autonomy. Non-critical classification should meet the documented eval threshold before unattended use. |
| Workflow schema | Use typed workflow, workflow run, step, retry, budget, approval, idempotency, and kill-switch models from the implementation plan. |
| Enrichment waterfall order | Default order is first-party/MenuList data, owner-provided data, allowed owner website/public URL facts, Google Places place-ID seed when approved, Foursquare identity/category/chain signal when approved, approved source adapter, AI extractor. Stop after valid evidence. |
| Sender assignment | One sender identity per target conversation, target timezone windows, gradual ramp, spam-rate thresholds, bounce thresholds, and pause on sender health warning/block. |
| Provider register | Approved provider records required for SES, OpenAI, Firebase, BigQuery export if enabled, source adapters, and any WhatsApp provider. |

## 12. Acceptance Criteria

Growth Engine is ready for first controlled use only when:

- distribution target registry is configured
- Connections And Activation registry is configured with adapter IDs, secret refs, webhook endpoints, budgets, kill switches, and validation state
- implementation readiness checklist is reviewed and all route, RBAC, flag, environment, Firestore rules/index, seed config, API, UI, and test contracts are accepted
- source policy and channel policy are configured
- sender domain readiness is green for email
- email pipeline is active only after sender domain, DNS/authentication, unsubscribe, bounce/complaint webhook, suppression, budget, kill switch, and internal test checks pass
- WhatsApp pipeline is active only after WABA/phone-number ID, token refs, webhook signature health, opt-in policy, template sync, conversation-state support, sender reputation, budget, kill switch, and governance audit checks pass
- source candidates can be imported without outreach
- Google Places source runs use approved field masks, budget caps, and place-ID-only durable storage
- Foursquare PAYG source runs block outreach eligibility unless separate contract or written permission allows prospecting
- Business Truth Graph nodes and edges store provenance, confidence, truth state, and public-publishing blockers
- dedupe and suppression work before campaigns
- workflow runs are idempotent, resumable, budget-gated, and kill-switch-aware
- enrichment waterfalls cache by source hash and stop after valid evidence
- every action stores a decision snapshot
- sender assignment keeps one sender per target conversation
- campaign dry-run blocks unsafe launches
- email sends include unsubscribe and suppression handling
- WhatsApp is assisted/manual only
- WhatsApp API sends are blocked unless governance audit, opt-in proof, approved template or open service window, sender health, pacing, and webhook readiness pass
- WhatsApp templates have approved status, category match, quality status, owner, variables, and version records
- WhatsApp conversation state tracks customer service window, free entry point window where applicable, last inbound, and template-required state
- WhatsApp webhooks are signature-verified and update message outcome, reply, suppression, template, and reputation state
- WhatsApp Flows attach structured owner-confirmed truth to the Business Truth Graph only after validation
- DNC/complaint detection cancels pending actions
- tracked routes connect to real MenuList onboarding flows
- feedback events update attribution summaries
- owner-confirmed MenuList truth can activate distribution state
- canonical public surfaces have structured data, canonical URL, sitemap state, and freshness state
- changed public URLs can be queued for discovery notification where allowed
- menu feed export readiness is measurable
- GBP menu-link/preferred-source handoff is owner-authorized
- AI-readable truth packets contain only confirmed public truth
- cost dashboard estimates Firestore, provider, and AI costs
- private artifacts have noindex, expiry, QA, and takedown state
- AI scoring/classification passes the required eval thresholds
- DNC, unsubscribe, complaint, wrong-contact, private-data, blocked-source, and pricing-invention fixtures have zero critical misses before autonomy
- external listing handoffs are owner-authorized and never used as lead-gen API access
- incident runbook and evidence export exist
- global/channel/campaign/template kill switches work
- no public artifact claims owner verification without owner confirmation
