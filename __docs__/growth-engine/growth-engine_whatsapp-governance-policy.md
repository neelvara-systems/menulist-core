# Growth Engine - WhatsApp Governance Policy

**Status:** Implementation policy
**Decision date:** June 2, 2026
**Purpose:** Decide how Growth Engine may use WhatsApp Cloud API without becoming bulk outreach infrastructure.

---

## 1. Verdict

The WhatsApp guidance is useful, but the product decision is stricter:

```txt
WhatsApp = consented owner verification and truth-maintenance rail
Growth Engine = message governance, eligibility, routing, audit, and reputation control
MenuList = confirmed public business truth
```

WhatsApp must not be treated as the channel for cold lead blasts. For MenuList, it is strongest when the owner expects the message:

- owner claim verification
- business-hours or menu correction
- incomplete claim recovery
- owner-confirmed stale-data refresh
- support or human escalation
- opted-in update workflow
- structured WhatsApp Flow for business truth collection

Do not use WhatsApp for:

- scraped or enriched phone-number outreach without opt-in
- generic prospect blasting
- shared sender pools across unrelated customers
- fake utility templates for marketing
- keeping the 24-hour window alive with meaningless messages
- generic AI assistant distribution
- bypassing opt-out, quality, or template rules

## 2. Current Official Constraints

| Area | Source | Product impact |
| --- | --- | --- |
| WhatsApp Business Terms | https://www.whatsapp.com/legal/business-terms/ | Businesses must secure rights, consents, and permissions to share customer contact data with WhatsApp and communicate via WhatsApp. They must honor stop/opt-out requests. |
| WhatsApp Business Messaging Policy | https://www.whatsapp.com/legal/business-policy/ | Businesses may contact a person only when the person gave the phone number and opted in; they must respect opt-outs; they may initiate only with approved templates; free-form replies are limited to the 24-hour customer service window. |
| Opt-in best practices | https://www.whatsapp.com/legal/business-policy/ | Users should expect messages. Opt-in should be clear, category-aware, and include opt-out instructions. |
| Quality enforcement | https://www.whatsapp.com/legal/business-policy/ | Users can block/report businesses. WhatsApp can limit or remove access when quality is low or messaging happens at scale in an unauthorized way. |
| Pricing and windows | https://whatsappbusiness.com/products/platform-pricing/ | WhatsApp charges by delivered message and category; service messages operate inside the 24-hour customer service window; ads that click to WhatsApp and Facebook Page CTA free entry points can create a 72-hour no-charge window. |
| WhatsApp Flows | https://whatsappbusiness.com/products/whatsapp-flows/ | Flows can collect structured information and support lead generation and customer actions. For MenuList, use Flows for owner-confirmed business truth, not generic chat. |
| Cloud API overview | https://developers.facebook.com/docs/whatsapp/cloud-api/overview | Implementation must read current Meta throughput, business use case limits, template limits, and pair-rate limits before enabling API sends. Safe Growth Engine capacity must be lower than platform throughput. |
| Webhooks | https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks | Webhook ingestion must be durable, idempotent, signature-verified, and mapped to message outcomes. |

## 3. Product Boundary

WhatsApp should not define Growth Engine.

Growth Engine should decide:

- whether WhatsApp is allowed
- whether consent exists
- whether a template is approved
- whether the customer service window is open
- whether the message is expected
- whether the recipient, template, sender, country, and campaign are healthy
- whether the conversation outcome improves MenuList truth

The WhatsApp provider only sends or receives messages after Growth Engine creates a governance audit.

WhatsApp provider setup belongs in [Connections And Activation Screen](./growth-engine_connections-activation-screen.md). That screen owns the adapter ID, WABA ID, phone-number ID, token secret refs, webhook secret refs, sender identity, budget caps, kill switches, validation runs, and activation state. This policy owns the message eligibility rules after the WhatsApp pipeline is configured.

## 4. Required Components

### Consent Ledger

Phone number is not consent.

Every WhatsApp send needs a consent event:

```ts
type GrowthWhatsAppConsentEvent = {
  consentEventId: string;
  contactId: string;
  targetId?: string;
  channel: 'whatsapp';
  consentCategory: 'utility' | 'marketing' | 'verification' | 'support';
  consentSource: 'claim_page' | 'qr' | 'ad_click_to_whatsapp' | 'form' | 'owner_inbound' | 'manual_import';
  sourceUrl?: string;
  consentTextShown: string;
  privacyPolicyVersion: string;
  capturedAt: string;
  ipHash?: string;
  userAgentHash?: string;
  proofHash: string;
  revokedAt?: string;
};
```

Rules:

- no WhatsApp API send without matching consent category
- no consent from third-party phone enrichment
- no hidden or implied opt-in from public phone availability
- consent revocation immediately blocks sends

### Suppression Ledger

Suppression overrides everything.

```ts
type GrowthWhatsAppSuppressionEvent = {
  suppressionEventId: string;
  contactId: string;
  targetId?: string;
  channel: 'whatsapp';
  reason: 'opt_out' | 'complaint' | 'invalid_number' | 'wrong_contact' | 'legal_request' | 'manual_block' | 'quality_block';
  categoryScope: 'all' | 'marketing' | 'utility' | 'verification' | 'support';
  source: 'reply' | 'webhook' | 'operator' | 'provider' | 'data_request';
  createdAt: string;
};
```

Rules:

- STOP, unsubscribe, do not contact, complaint, and wrong-number replies create automatic suppression or quarantine
- suppression is checked immediately before send
- no operator or workflow can bypass suppression

### Template Registry

Templates are production objects.

```ts
type GrowthWhatsAppTemplate = {
  templateId: string;
  metaTemplateId: string;
  name: string;
  language: string;
  category: 'marketing' | 'utility' | 'authentication';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled';
  quality: 'pending' | 'high' | 'medium' | 'low' | 'unknown';
  allowedUseCase:
    | 'owner_claim'
    | 'business_verification'
    | 'public_info_correction'
    | 'claim_recovery'
    | 'stale_data_confirmation'
    | 'support_handoff';
  variables: string[];
  version: string;
  approvedAt?: string;
  lastSyncedAt: string;
  owner: string;
};
```

Rules:

- no API send with unapproved, paused, disabled, rejected, or wrong-category templates
- no fake utility templates for marketing
- low-quality templates require review before more sends

### Conversation State

Growth Engine must know whether a free-form response is allowed.

```ts
type GrowthWhatsAppConversationState = {
  conversationStateId: string;
  contactId: string;
  targetId?: string;
  senderIdentityId: string;
  lastInboundAt?: string;
  customerServiceWindowExpiresAt?: string;
  freeEntryPointExpiresAt?: string;
  lastTemplateSentAt?: string;
  lastUserReplyAt?: string;
  state: 'no_window' | 'service_window_open' | 'free_entry_open' | 'template_required' | 'suppressed' | 'blocked';
  updatedAt: string;
};
```

Rules:

- inside the customer service window, service replies may be free-form where policy allows
- outside the customer service window, only approved templates may initiate or re-engage
- free entry point windows are tracked for cost and routing, not abused for irrelevant sends

### Message Governance Audit

Every outbound attempt gets an audit record before provider send.

```ts
type GrowthMessageGovernanceAudit = {
  auditId: string;
  contactId: string;
  targetId?: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'messenger';
  senderIdentityId: string;
  templateId?: string;
  consentEventId?: string;
  suppressionCheckedAt: string;
  conversationStateId?: string;
  eligibility:
    | 'eligible'
    | 'needs_opt_in'
    | 'suppressed'
    | 'template_required'
    | 'template_blocked'
    | 'window_closed'
    | 'sender_blocked'
    | 'quality_blocked'
    | 'human_review';
  sendReason:
    | 'owner_claim'
    | 'business_verification'
    | 'public_info_correction'
    | 'claim_recovery'
    | 'stale_data_confirmation'
    | 'support_handoff';
  blockers: string[];
  createdAt: string;
};
```

### Webhook Event Store

Do not trust the API response alone.

Webhook events must update:

- sent
- delivered
- read
- failed
- user replied
- button clicked
- Flow submitted
- template status changed
- sender quality changed
- opt-out or complaint

Webhook handlers must verify signatures, be idempotent, and never write raw large payloads into Firestore.

### Reputation Monitor

WhatsApp sends should be measured as reputation transactions.

Track:

- delivery failure rate
- read rate
- reply rate
- button click rate
- Flow completion rate
- opt-out rate
- complaint/report signal where available
- template quality
- phone-number quality
- WABA/account health
- cost per verified business
- cost per activated business

Do not optimize for messages sent.

## 5. MenuList WhatsApp Journeys

Allowed journeys:

| Journey | Trigger | Message type | Purpose |
| --- | --- | --- | --- |
| Owner claim | Owner submits phone and opt-in on claim page | Verification or utility template | Verify ownership and route to claim review. |
| Public-info correction | Owner starts correction flow | Utility template or service reply | Confirm hours, phone, menu link, address, or outlet truth. |
| Incomplete claim recovery | Owner starts claim but does not finish | Utility or marketing template based on consent and content | Recover activation without over-messaging. |
| Stale data confirmation | Confirmed truth becomes stale by policy | Utility template if eligible | Refresh business truth. |
| Support handoff | Owner asks for help or reply classifier detects help intent | Service reply inside window or approved template outside window | Give human escalation and support path. |
| Owner referral | Recipient is not the owner but provides owner path | Service reply or approved template | Move to the correct owner without repeated wrong-contact sends. |

Blocked journeys:

- scraped phone number outreach
- third-party enriched number outreach
- generic "we found your restaurant" cold WhatsApp
- marketing templates to contacts with only verification consent
- repeated reminders without reply or action
- AI free-form persuasion outside approved templates

## 6. Sender Identity Policy

Use sender identity based on who is speaking.

Allowed:

- MenuList-owned verified WhatsApp identity for MenuList claim, verification, support, and truth-maintenance messages
- customer-owned WABA/number only if Growth Engine ever sends on behalf of a customer through a separate approved tenant contract

Blocked:

- shared sender pool for unrelated tenants
- number rotation to bypass quality limits
- sending from a hidden MenuList number when the message appears to be from another business
- changing sender identity during one target conversation except incident-owner recovery

## 7. WhatsApp Flows

Flows are useful for structured truth capture.

Allowed Flow use:

- owner verification
- hours confirmation
- menu URL submission
- category correction
- outlet confirmation
- public contact confirmation
- owner support intake

Blocked Flow use:

- generic AI chat
- open-ended sales persuasion
- collecting unnecessary personal data
- hidden marketing consent
- lead resale intake outside Growth Engine's MenuList boundary

## 8. AI Boundary

AI can work behind the scenes:

- classify replies
- detect DNC, wrong contact, support, and owner intent
- summarize support context
- suggest next action
- validate template variables
- route low-confidence cases to human review

AI must not:

- act as a general WhatsApp AI assistant
- write unrestricted WhatsApp copy
- invent claims, offers, pricing, verification status, or urgency
- override consent, suppression, template, or window rules

## 9. Progressive Send Ladder

Growth Engine may use a progressive send ladder only after consent and template eligibility are proven.

Each rung requires:

- opt-in proof
- approved template or open service window
- sender identity health
- template quality not low/paused/disabled
- low failure rate
- low opt-out and complaint signal
- reply or action signal above threshold
- cost and capacity within policy

If any quality signal degrades, pause or reduce sends and create an incident or operator work item.

Do not use provider throughput as safe capacity.

## 10. Final Decision

WhatsApp helps Growth Engine only when it strengthens MenuList truth:

```txt
owner expected the message
-> consent exists
-> template/window is valid
-> sender reputation is healthy
-> message asks for a useful truth action
-> outcome updates Business Truth Graph
```

The implementation should build a WhatsApp Message Governance Layer before any WhatsApp API outbound capability. Assisted WhatsApp stays the default until governance, templates, webhooks, consent, suppression, reputation, and kill switches are implemented and verified.
