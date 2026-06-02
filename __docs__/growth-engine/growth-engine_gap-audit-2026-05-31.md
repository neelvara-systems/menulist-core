# Growth Engine - Operator Gap Audit

**Status:** Second-pass planning audit after web research
**Review date:** May 31, 2026
**Audience:** Founder, growth manager, implementation owner
**Purpose:** Capture what is still missing if the internal team tried to use Growth Engine as MenuList-owned distribution infrastructure.

---

## 1. Research Inputs

This audit used current public/official sources for channel rules, cost shape, and market alternatives:

| Area | Source |
| --- | --- |
| Gmail sender requirements | https://support.google.com/a/answer/81126 |
| CAN-SPAM commercial email rules | https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business |
| WhatsApp Business policy | https://whatsappbusiness.com/policy/ |
| WhatsApp Business Terms | https://www.whatsapp.com/legal/business-terms/ |
| WhatsApp Business Platform pricing | https://whatsappbusiness.com/products/platform-pricing/ |
| WhatsApp Flows | https://whatsappbusiness.com/products/whatsapp-flows/ |
| TRAI UCC 2025 amendments | https://www.trai.gov.in/sites/default/files/2025-02/PR_No.11of2025.pdf |
| India DPDP Act 2023 | https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf |
| Firestore billing | https://firebase.google.com/docs/firestore/pricing |
| Firebase task queue functions | https://firebase.google.com/docs/functions/task-functions |
| BigQuery pricing | https://cloud.google.com/bigquery/pricing |
| Amazon SES pricing | https://aws.amazon.com/ses/pricing/ |
| Resend pricing/features | https://resend.com/pricing |
| Apify Google Maps Scraper example | https://apify.com/crustapi/google-maps-scraper |
| Foursquare Places API overview | https://docs.foursquare.com/developer/reference/places-api-overview |
| Foursquare categories and chains | https://docs.foursquare.com/data-products/docs/categories and https://docs.foursquare.com/data-products/docs/chains |
| Foursquare PAYG API terms | https://foursquare.com/legal/terms/apilicenseagreement/ |
| Apollo | https://www.apollo.io/ |
| Clay | https://www.clay.com/ |
| Instantly | https://instantly.ai/ |
| Smartlead | https://www.smartlead.ai/ |
| HubSpot lead management | https://www.hubspot.com/products/sales/sales-leads |

## 2. Executive Verdict

Growth Engine is a valid product direction, but the first-pass docs were not yet build-ready.

The product should still live in the same repo as a separate product-scoped module with separate Firebase/functions/data. The gap is not repo strategy. The gap is operating readiness, connection readiness, automation readiness, graph readiness, messaging-governance readiness, and distribution readiness: source permission, adapter activation, provider secret refs, webhook health, Business Truth Graph state, automation workflows, enrichment waterfalls, decision snapshots, AI worker evals, sender assignment, operator work queues, sender readiness, consent, suppression, WhatsApp governance, canonical surfaces, structured data, sitemaps, menu feed exports, truth packets, provider cost, legal posture, artifact QA, and incident handling need to be first-class product modules before the first send or public publish.

Implementation can start from the current docs, but no sending or public publishing is allowed until these gates are implemented:

1. Approved source policy registry.
2. Distribution target registry.
3. Business Truth Graph registry.
4. Owned automation workflow engine.
5. Enrichment waterfall registry.
6. Decision snapshot ledger.
7. AI worker registry with eval dataset and pass thresholds.
8. Sender assignment and pacing model.
9. Operator workboard and exception queues.
10. WhatsApp Message Governance Layer.
11. Connections And Activation registry.
12. Canonical MenuList surface publishing contract.
13. Structured data, sitemap, feed export, and truth-packet contracts.
14. External listing handoff contract for GBP, Apple Business Connect, and Bing Places.
15. Channel compliance matrix by country and channel.
16. Sender-domain readiness and warm-up policy.
17. Consent, unsubscribe, DNC, and complaint ledger.
18. MenuList onboarding flow inventory.
19. Artifact review and takedown workflow.
20. Provider decision matrix and vendor register.
21. Incident severity and rollback runbook.
22. Cost caps for source, email, AI, Firestore, automation, discovery publishing, and analytics.

## 3. If I Used This Tomorrow

| Operator step | Where I would get blocked | Required change |
| --- | --- | --- |
| Import leads | I would not know which source is legally approved, what fields can be retained, or whether scraping is allowed beyond experiment. | Add source policy registry with source terms, allowed fields, retention, provenance, and approval owner. |
| Turn a lead into distribution | I would not know the business/location/menu target identity, claim state, truth state, or surface inventory. | Add distribution target registry. |
| Build durable identity | I would not know whether a source fact is a business, location, outlet, menu, claim, surface, or handoff relationship, or whether it is candidate-only. | Add Business Truth Graph nodes and edges with provenance, confidence, truth state, and public-publish blockers. |
| Automate repeated work | I would not know which trigger ran, which step failed, or whether retry/budget/kill-switch rules were checked. | Add automation workflow engine with typed runs and step events. |
| Enrich target facts | I would not know source/provider order, cost, cache key, or when to stop. | Add enrichment waterfall registry and runner. |
| Trust AI decisions | I would not know prompt version, eval state, source evidence, rejected facts, or confidence. | Add AI worker registry and decision snapshot ledger. |
| Assign sender | I would not know which sender should keep the relationship or whether pacing/timezone is safe. | Add sender assignment and pacing model. |
| Publish a menu page | I would not know whether the page is owner-confirmed, indexable, structured, fresh, and sitemap eligible. | Add canonical surface publisher and surface health monitor. |
| Notify discovery systems | I would not know which changed URLs should enter sitemap/IndexNow/feed/truth-packet queues. | Add discovery publisher with changed-URL policy and idempotency. |
| Produce a menu feed | I would not know whether export data matches entity/menu/section/item/price requirements. | Add menu feed exporter and feed validation fixtures. |
| Guide GBP distribution | I would not know whether the owner authorized menu URL or preferred-source handoff. | Add GBP handoff manager; block lead-gen API usage. |
| Guide Apple/Bing distribution | I would not know whether the owner authorized MenuList URL/action updates. | Add external listing handoff manager; block use as lead source or truth authority. |
| Pick a campaign country | I would not know whether India, US, or both are in scope and which channel rules apply. | Add jurisdiction/channel matrix before any campaign creation. |
| Send email | I would not know whether sender DNS, DMARC, unsubscribe headers, bounce handling, and spam-rate monitoring are ready. | Add sender-domain readiness module and block email until ready. |
| Use WhatsApp | I would not know whether the contact opted in, what template is allowed, or whether the first message can be sent. | Keep WhatsApp assisted-only until explicit opt-in evidence, template approval, and policy review exist. |
| Use WhatsApp API | I would not know the conversation window, template quality, webhook health, sender quality, pacing policy, or governance audit. | Add WhatsApp Message Governance Layer before API sends. |
| Approve a private artifact | I would not know who checked source rights, noindex, accuracy, or owner complaint handling. | Add artifact QA, approval, expiry, and takedown workflow. |
| Route interested leads | I would not know which MenuList onboarding flow matches the offer and what event payload comes back. | Inventory approved MenuList onboarding routes and feedback events. |
| Read a lead score | I would not know which facts drove the score or whether AI made unsupported assumptions. | Require typed score reasons, confidence, rejected facts, and eval-tested scoring prompts. |
| Handle unsubscribe/DNC | I would need one global ledger, not per-campaign state. | Add consent/suppression ledger that overrides every campaign, channel, and follow-up. |
| Review costs | I would need provider spend next to Firebase and analytics cost, not only Firestore estimates. | Add provider usage counters and daily hard caps for source, channel, AI, and BigQuery. |
| Recover from a complaint spike | I would need one-click pause, incident owner, severity, evidence export, and follow-up rules. | Add incident runbook and complaint-rate kill switch. |

## 4. Market Scan

The market already has strong generic tools:

- Apollo covers B2B lead data, enrichment, outbound, automation, and sales workflow.
- Clay covers data enrichment, provider waterfalling, audiences, sequencing, and workflow automation.
- Instantly and Smartlead focus heavily on cold email outreach, warm-up, mailbox management, deliverability, and lead finding.
- HubSpot covers lead management, lead scoring, routing, CRM activity history, prospecting workspaces, and sales automation.
- Apify actors can produce Google Maps-like lead datasets cheaply, but this does not solve source rights, consent, suppression, or MenuList onboarding attribution.

Growth Engine should not compete as a generic outbound platform. Its defensible job is narrower:

```txt
MenuList-specific target qualification
-> rights-safe private artifact
-> safe outreach
-> tracked MenuList onboarding
-> owner-confirmed truth activation
-> canonical surface publishing
-> discovery publishing
-> freshness monitoring
```

That means the product should optimize for owner-confirmed MenuList truth coverage and freshness, not lead volume, message volume, or reply rate.

## 5. Product Gaps To Fill

| Gap | Risk if missing | Required doc/product decision |
| --- | --- | --- |
| Source policy registry | Lead source turns into compliance and source-rights risk. | Every source must define allowed use, allowed fields, retention, raw payload policy, and approval owner. |
| Distribution target registry | Leads do not become owned distribution coverage. | Every target needs business/location/menu identity, claim state, truth state, canonical URL, and surface inventory. |
| Business Truth Graph registry | Pages and lead rows do not compound into public business truth. | Model business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution relationships with provenance, confidence, truth state, and publish blockers. |
| Automation workflow engine | The system becomes scattered scripts and manual checks. | Define workflow, run, step, retry, idempotency, approval, budget, and kill-switch contracts. |
| Enrichment waterfall engine | Data quality and cost become uncontrolled. | Ordered source/provider/AI steps with cache keys, stop conditions, and cost caps. |
| Decision snapshot ledger | Operators cannot explain why a target was sent, held, published, or blocked. | Store evidence, rejected facts, scores, blockers, confidence, and next action. |
| AI worker registry | Heavy AI use becomes unsafe and hard to measure. | Typed output schemas, prompt versions, eval thresholds, budgets, and blocked-output rules. |
| Sender assignment and pacing | Deliverability and conversation continuity can break. | Preserve one sender per target conversation, target timezone windows, ramp, and sender-health blocks. |
| Connections And Activation | Provider keys, adapter IDs, webhooks, and activation state can become scattered and unsafe. | Add one internal screen and registry for adapter IDs, server-only secret refs, email pipeline, WhatsApp pipeline, webhooks, budgets, kill switches, validation, and activation audit. |
| WhatsApp Message Governance Layer | WhatsApp can become account-risky cold outreach infrastructure. | Require consent ledger, suppression ledger, template registry, conversation state, webhook verification, reputation monitor, sender identity policy, pacing policy, Flow definitions, governance audit, and kill switches. |
| Operator workboard | Human review becomes hidden in ad hoc chats/spreadsheets. | Queue every review, handoff, reply, health, freshness, cost, eval, and incident exception. |
| Canonical surface publisher | MenuList cannot become distribution truth if it does not own public surfaces. | Public menu/business surfaces need indexability, canonical URL, structured data, sitemap state, and freshness state. |
| Discovery publisher | Search and AI crawlers may not discover or refresh MenuList truth efficiently. | Own sitemaps, changed-URL queue, IndexNow, feed exports, and truth packets. |
| Menu feed exporter | MenuList cannot participate in menu distribution ecosystems. | Create feed-ready entity/menu/section/item/price exports from confirmed MenuList truth. |
| GBP handoff manager | Owners may not connect MenuList truth to their Google Business Profile. | Track owner-authorized menu URL/preferred-source handoff and block lead-gen API usage. |
| External listing handoff manager | MenuList misses Apple Maps and Bing Places distribution opportunities. | Track owner-authorized GBP, Apple Business Connect, and Bing Places handoffs without treating them as source truth. |
| Channel compliance matrix | Campaigns may violate email, WhatsApp, India telecom, or local marketing rules. | Campaigns must choose jurisdiction before channel eligibility is calculated. |
| Sender-domain readiness | Poor deliverability or blocked email domain. | Email requires SPF/DKIM/DMARC status, unsubscribe headers, bounce handling, slow ramp, and spam-rate thresholds. |
| Consent and suppression ledger | DNC/complaint may not propagate across campaigns. | One global ledger must override all outbound decisions. |
| Artifact QA and takedown | Private audit/preview could make wrong claims or trigger owner complaint. | Artifacts need noindex, expiry, source-rights check, accuracy check, owner complaint path, and takedown status. |
| Onboarding flow inventory | Leads may be routed into wrong or stale MenuList flows. | Route bridge must list approved flow IDs, payloads, attribution events, and fallback behavior. |
| AI eval harness | Classifier or message generator may miss DNC, invent claims, or answer pricing wrongly. | Seed evals required for DNC, wrong number, pricing, claim safety, source facts, and interested intent. |
| Provider decision matrix | Costs and data processor obligations become scattered. | Lock first provider for source, email, WhatsApp, analytics, and AI with cost and data-retention notes. |
| Security/RBAC model | Operators may reveal contacts or launch campaigns beyond authority. | Roles must distinguish viewer, operator, growth manager, admin, compliance, and incident owner. |
| Incident runbook | Complaint, provider block, or data error may continue too long. | Global/channel/provider kill switches plus severity, owner, export, and resolution checklist. |

## 6. Revised Launch Baseline

The baseline should not start with sending. It should start with distribution readiness:

```txt
policy registry
-> distribution target registry
-> Business Truth Graph registry
-> automation workflow engine
-> enrichment waterfall
-> AI worker and decision snapshot
-> approved source import
-> dedupe/suppression
-> canonical surface contract
-> discovery publisher
-> menu feed exporter
-> GBP handoff manager
-> Apple/Bing handoff manager
-> sender readiness
-> WhatsApp governance
-> onboarding flow inventory
-> dry-run
-> sample artifact QA
-> email-only controlled send
-> owner-confirmed truth activation
-> public surface publish
-> sitemap/feed/truth-packet readiness
-> feedback attribution
```

WhatsApp assisted should remain disabled until the channel policy, opt-in model, and suppression checks pass.

## 7. Runtime Blockers If Code Omits Them

These are runtime blockers, not remaining documentation gaps. The implementation must block controlled use if code omits any item:

- No implementation readiness checklist acceptance.
- No approved source policy.
- No Connections And Activation registry.
- No distribution target registry.
- No Business Truth Graph registry.
- No automation workflow engine.
- No enrichment waterfall registry.
- No decision snapshot ledger.
- No AI worker eval gate.
- No sender assignment and pacing model.
- No WhatsApp Message Governance Layer.
- No canonical surface publisher.
- No structured data validation.
- No sitemap inventory and changed-URL policy.
- No menu feed export readiness.
- No GBP owner handoff policy.
- No Apple/Bing owner handoff policy.
- No sender domain with DNS/authentication verified.
- No unsubscribe endpoint and one-click unsubscribe support where required.
- No global suppression ledger.
- No complaint-rate stop rule.
- No onboarding flow inventory.
- No artifact noindex/expiry/takedown workflow.
- No AI eval thresholds.
- No provider budget caps.
- No incident owner and global outbound kill switch.

## 8. Updated Recommendation

Keep the repo decision unchanged:

```txt
same repo
separate product boundary
separate Firebase/functions/data
explicit MenuList onboarding bridge only
```

But update the build decision:

```txt
do not implement sending first
implement distribution gates first
```

Growth Engine only becomes useful if it is safe to operate repeatedly. The product should feel like a control room for acquisition, not a tool that makes it easy to send more messages.
