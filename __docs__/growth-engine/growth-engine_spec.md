# Growth Engine - Product Specification

**Status:** Planning spec
**Product code:** `GE` proposed, not implemented
**Audience:** Internal MenuList growth/admin team
**Scope:** Separate internal acquisition product for MenuList lead generation and onboarding attribution

---

## 1. Executive Summary

Growth Engine helps MenuList acquire qualified SMB leads without turning MenuList into a CRM, agency funnel, or generic outreach tool.

The system discovers or imports candidate businesses, normalizes and dedupes them, scores fit, selects safe channels, runs campaign dry-runs, prepares guarded messages, sends or queues outreach through approved modes, classifies replies, and routes interested leads into existing MenuList onboarding flows through tracked links.

The north-star metric is:

```txt
growth-sourced completed MenuList onboardings
```

Not:

- leads scraped
- messages sent
- reply rate alone
- demo pages generated
- AI automation rate

## 2. Product Scope

### In Scope

- lead source runs and imports
- manual CSV import
- lead normalization and dedupe
- contact identity registry
- suppression and DNC handling
- lead fit scoring
- campaign creation, dry-run, approval, caps, and stop rules
- email execution after compliance checks
- WhatsApp assisted-send queue
- inbound reply ingestion where provider support exists
- unified internal inbox
- reply classification
- tracked onboarding route creation
- onboarding feedback ingestion
- campaign/source/channel/template summaries
- cost and safety control room
- operator/admin audit logs
- kill switches

### Out Of Scope

- MenuList owner/customer UI
- MenuList menu extraction or creation
- owner onboarding UX
- business verification
- QR/menu/page publishing
- website building for leads
- public demo websites
- direct Google Business Profile claiming
- Google review ingestion for lead gen
- bulk calling/SMS/WhatsApp blasting
- generic CRM pipeline management
- public marketplace or lead-sales product
- external customer-facing Growth Engine product

## 3. Primary Users

| User | Job |
| --- | --- |
| Founder/admin | Approve campaigns, budgets, providers, scale, and incidents. |
| Growth manager | Build campaigns, review source quality, approve safe tests, manage channel health. |
| Operator | Work inbox, assisted WhatsApp, interested replies, DNC/wrong number, and human-review items. |
| System workers | Normalize, score, route, render, send/queue, classify, summarize, and alert. |

## 4. Core Workflows

### Lead Source Run

1. Growth manager creates a source run.
2. Provider adapter imports raw candidates.
3. Raw payloads go to Storage where appropriate.
4. Normalizer creates structured source candidates.
5. Dedupe checks identity keys.
6. Leads are created, merged, held, or rejected.
7. Lead intelligence scores fit, need, contactability, and risk.
8. Source quality summary updates.
9. No outreach happens from a source run directly.

### Campaign Draft And Dry Run

1. Growth manager creates campaign draft.
2. Select objective, audience, source filters, channels, offer angle, templates, and onboarding flow.
3. Configure caps, stop rules, budget, and approval policy.
4. Run dry-run.
5. Dry-run produces eligible counts, exclusions, sample messages, cost estimate, channel allocation, risks, and blockers.
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
5. Follow-up runs only after latest-state and suppression checks.

### Feedback Loop

1. MenuList emits growth feedback events for route clicked, onboarding started, completed, dropped, or blocked.
2. Growth Engine stores attribution and updates campaign/source/channel/template summaries.
3. Optimizer reports what to scale, pause, review, or stop.

## 5. Artifact Policy

The video/conversation's strongest idea is artifact-first outbound. For Growth Engine, the artifact can be:

- noindex MenuList claim preview
- public-info audit
- menu/hours freshness report
- "what customers can verify today" report
- onboarding prefill preview

Hard rules:

- Artifact is private or noindex by default.
- Artifact must say "unclaimed preview" or equivalent when not owner-confirmed.
- Artifact must not rehost Google photos, reviews, menus, or profile content.
- Artifact must not invent menu items, prices, phone numbers, offers, hours, ratings, or customer claims.
- Artifact must not become MenuList truth until owner-confirmed through approved MenuList flows.

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
- no raw sensitive payloads in AI prompts
- no scraped reviews/photos/menu content stored as durable lead facts

Email must have opt-out and sender identity. WhatsApp starts assisted only unless explicit opt-in, approved templates, and legal/channel review are complete.

## 7. Required Operating Foundations

Second-pass web research turned these from "good to have" into product gates:

| Foundation | Requirement |
| --- | --- |
| Source policy registry | Every source must record allowed use, allowed fields, source terms, retention class, raw payload policy, and approval owner before import. |
| Jurisdiction/channel matrix | Campaigns must choose jurisdiction before email, WhatsApp, SMS/calling, or social eligibility is calculated. |
| Consent and suppression ledger | Unsubscribe, DNC, complaint, wrong-contact, bounce, and opt-in evidence must live in one global ledger that overrides every campaign. |
| Sender-domain readiness | Email launch requires SPF/DKIM/DMARC status, sender identity, unsubscribe endpoint, bounce handling, slow-ramp policy, and spam-rate thresholds. |
| WhatsApp proof model | WhatsApp remains assisted-only until explicit opt-in proof, approved templates, provider readiness, and local policy review exist. |
| Onboarding flow inventory | Growth Engine must know the approved MenuList onboarding flows, accepted payloads, tracked route event names, and fallback behavior. |
| Artifact QA and takedown | Private/noindex artifacts need source-rights check, accuracy check, expiry, owner complaint path, and takedown state. |
| Provider/vendor register | Source, email, WhatsApp, analytics, AI, and storage providers need cost, retention, data processor, webhook, and shutdown notes. |
| AI evals | Scoring, reply classification, pricing answers, DNC handling, and message safety need seed datasets and pass thresholds before autonomy. |
| Incident runbook | Complaint spikes, provider blocks, source-policy failures, bad artifacts, and data deletion requests need severity, owner, kill-switch, and evidence export steps. |

These foundations are part of the first production slice, not a future phase.

## 8. First Production Slice

First production-shaped slice:

```txt
source policy registry
-> channel policy matrix
-> sender readiness
-> manual CSV or approved source import
-> normalization/dedupe/suppression
-> lead intelligence
-> onboarding flow inventory
-> campaign draft
-> dry-run
-> private artifact QA where artifacts are used
-> email execution
-> tracked onboarding route
-> feedback event
-> attribution summary
-> inbox/reply classification
-> DNC handling
```

WhatsApp assisted comes after the acquisition spine works.

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

## 10. Non-Functional Requirements

- All campaigns must be idempotent.
- All sends must have suppression checks.
- All background jobs must be queue/rate-limit aware.
- All dashboards must read summary docs, not raw event streams.
- All provider calls must have budgets and logs.
- All AI decisions must be typed and evaluable.
- All campaign launches must have dry-run evidence.
- All critical channels must have kill switches.
- All PII list views must be masked.
- All cross-product MenuList integration must be explicit.
- All source, channel, artifact, and vendor decisions must be policy-backed.
- All email sends must pass sender-domain readiness and unsubscribe checks.
- All artifacts must have expiry and takedown state.

## 11. Open Questions

| Question | Required before code? |
| --- | --- |
| Final product code: `GE` or another 2-character ID? | Yes |
| Final Firebase project IDs? | Yes |
| First email provider? | Yes |
| First sender domain/subdomain and DNS ownership path? | Yes |
| First legal/compliance jurisdiction set: India only, US only, or both? | Yes |
| Is Apify allowed beyond manual experiment? | Yes |
| Which source fields may be retained and for how long? | Yes |
| What is the exact global suppression identity model across email, phone, WhatsApp, and business? | Yes |
| Which unsubscribe endpoint and one-click unsubscribe behavior will be used? | Yes |
| Which WhatsApp opt-in evidence is accepted before API/template sends? | Yes |
| Which exact MenuList onboarding flows can receive tracked growth routes? | Yes |
| Who owns artifact takedown and owner complaint review? | Yes |
| What AI eval pass thresholds are required before classifier/message autonomy? | Yes |
| Which providers are approved data processors/vendors? | Yes |
| Do we need a private internal host or only admin route at first? | Before routing |

## 12. Acceptance Criteria

Growth Engine is ready for first controlled use only when:

- source policy and channel policy are configured
- sender domain readiness is green for email
- source candidates can be imported without outreach
- dedupe and suppression work before campaigns
- campaign dry-run blocks unsafe launches
- email sends include unsubscribe and suppression handling
- WhatsApp is assisted/manual only
- DNC/complaint detection cancels pending actions
- tracked routes connect to real MenuList onboarding flows
- feedback events update attribution summaries
- cost dashboard estimates Firestore, provider, and AI costs
- private artifacts have noindex, expiry, QA, and takedown state
- AI scoring/classification passes the required eval thresholds
- incident runbook and evidence export exist
- global/channel/campaign/template kill switches work
- no public artifact claims owner verification without owner confirmation
