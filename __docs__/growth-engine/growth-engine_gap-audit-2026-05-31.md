# Growth Engine - Operator Gap Audit

**Status:** Second-pass planning audit after web research
**Review date:** May 31, 2026
**Audience:** Founder, growth manager, implementation owner
**Purpose:** Capture what is still missing if the internal team tried to use Growth Engine tomorrow.

---

## 1. Research Inputs

This audit used current public/official sources for channel rules, cost shape, and market alternatives:

| Area | Source |
| --- | --- |
| Gmail sender requirements | https://support.google.com/a/answer/81126 |
| CAN-SPAM commercial email rules | https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business |
| WhatsApp Business policy | https://whatsappbusiness.com/policy/ |
| TRAI UCC 2025 amendments | https://www.trai.gov.in/sites/default/files/2025-02/PR_No.11of2025.pdf |
| India DPDP Act 2023 | https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf |
| Firestore billing | https://firebase.google.com/docs/firestore/pricing |
| Firebase task queue functions | https://firebase.google.com/docs/functions/task-functions |
| BigQuery pricing | https://cloud.google.com/bigquery/pricing |
| Amazon SES pricing | https://aws.amazon.com/ses/pricing/ |
| Resend pricing/features | https://resend.com/pricing |
| Apify Google Maps Scraper example | https://apify.com/crustapi/google-maps-scraper |
| Apollo | https://www.apollo.io/ |
| Clay | https://www.clay.com/ |
| Instantly | https://instantly.ai/ |
| Smartlead | https://www.smartlead.ai/ |
| HubSpot lead management | https://www.hubspot.com/products/sales/sales-leads |

## 2. Executive Verdict

Growth Engine is a valid product direction, but the first-pass docs were not yet build-ready.

The product should still live in the same repo as a separate product-scoped module with separate Firebase/functions/data. The gap is not repo strategy. The gap is operating readiness: source permission, sender readiness, consent, suppression, provider cost, legal posture, artifact QA, AI evals, and incident handling need to be first-class product modules before the first send.

Do not start implementation until these gates are locked:

1. Approved source policy registry.
2. Channel compliance matrix by country and channel.
3. Sender-domain readiness and warm-up policy.
4. Consent, unsubscribe, DNC, and complaint ledger.
5. MenuList onboarding flow inventory.
6. Artifact review and takedown workflow.
7. Provider decision matrix and vendor register.
8. AI eval dataset and pass thresholds.
9. Incident severity and rollback runbook.
10. Cost caps for source, email, AI, Firestore, and analytics.

## 3. If I Used This Tomorrow

| Operator step | Where I would get blocked | Required change |
| --- | --- | --- |
| Import leads | I would not know which source is legally approved, what fields can be retained, or whether scraping is allowed beyond experiment. | Add source policy registry with source terms, allowed fields, retention, provenance, and approval owner. |
| Pick a campaign country | I would not know whether India, US, or both are in scope and which channel rules apply. | Add jurisdiction/channel matrix before any campaign creation. |
| Send email | I would not know whether sender DNS, DMARC, unsubscribe headers, bounce handling, and spam-rate monitoring are ready. | Add sender-domain readiness module and block email until ready. |
| Use WhatsApp | I would not know whether the contact opted in, what template is allowed, or whether the first message can be sent. | Keep WhatsApp assisted-only until explicit opt-in evidence, template approval, and policy review exist. |
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
MenuList-specific lead qualification
-> rights-safe private artifact
-> safe outreach
-> tracked MenuList onboarding
-> completed onboarding attribution
```

That means the product should optimize for completed MenuList onboardings, not lead volume, message volume, or reply rate.

## 5. Product Gaps To Fill

| Gap | Risk if missing | Required doc/product decision |
| --- | --- | --- |
| Source policy registry | Lead source turns into compliance and source-rights risk. | Every source must define allowed use, allowed fields, retention, raw payload policy, and approval owner. |
| Channel compliance matrix | Campaigns may violate email, WhatsApp, India telecom, or local marketing rules. | Campaigns must choose jurisdiction before channel eligibility is calculated. |
| Sender-domain readiness | Poor deliverability or blocked email domain. | Email requires SPF/DKIM/DMARC status, unsubscribe headers, bounce handling, slow ramp, and spam-rate thresholds. |
| Consent and suppression ledger | DNC/complaint may not propagate across campaigns. | One global ledger must override all outbound decisions. |
| Artifact QA and takedown | Private audit/preview could make wrong claims or trigger owner complaint. | Artifacts need noindex, expiry, source-rights check, accuracy check, owner complaint path, and takedown status. |
| Onboarding flow inventory | Leads may be routed into wrong or stale MenuList flows. | Route bridge must list approved flow IDs, payloads, attribution events, and fallback behavior. |
| AI eval harness | Classifier or message generator may miss DNC, invent claims, or answer pricing wrongly. | Seed evals required for DNC, wrong number, pricing, claim safety, source facts, and interested intent. |
| Provider decision matrix | Costs and data processor obligations become scattered. | Lock first provider for source, email, WhatsApp, analytics, and AI with cost and data-retention notes. |
| Security/RBAC model | Operators may reveal contacts or launch campaigns beyond authority. | Roles must distinguish viewer, operator, growth manager, admin, compliance, and incident owner. |
| Incident runbook | Complaint, provider block, or data error may continue too long. | Global/channel/provider kill switches plus severity, owner, export, and resolution checklist. |

## 6. Revised First Slice

The first slice should not start with sending. It should start with readiness:

```txt
policy registry
-> approved source import
-> dedupe/suppression
-> sender readiness
-> onboarding flow inventory
-> dry-run
-> sample artifact QA
-> email-only controlled send
-> feedback attribution
```

Only after that slice works should WhatsApp assisted be enabled.

## 7. Launch Blockers

These are launch blockers, not later improvements:

- No approved source policy.
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
implement operating gates first
```

Growth Engine only becomes useful if it is safe to operate repeatedly. The product should feel like a control room for acquisition, not a tool that makes it easy to send more messages.
