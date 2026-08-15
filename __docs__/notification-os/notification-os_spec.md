# NotificationOS — Product Specification

> **Status:** Approved for implementation; no runtime activation implied
> **Last Updated:** August 15, 2026
> **Decision Horizon:** Three years

## Decision

Build one NotificationOS orchestration layer over two independent delivery systems: EmailOS and WhatsAppOS. Do not merge provider concerns into one large sender, and do not maintain two independent product-event systems.

NotificationOS owns **why, who, when and which channels**. A channel OS owns **how that channel is delivered and observed**.

## Goals

1. Support `email_only`, `whatsapp_only`, and `email_and_whatsapp` for the same product event.
2. Fetch tenant/store/workspace/contact/preferences once per processing attempt and reuse the result across every planned channel.
3. Treat verified email, verified phone, WhatsApp opt-in and channel preference as distinct facts.
4. Preserve independent channel idempotency and outcomes without duplicating business context or message bodies.
5. Evolve existing Owner Notifications collections and trigger registry instead of adding a parallel queue.
6. Keep product data, Firebase projects, provider credentials and reputation isolated.
7. Keep notification failure non-blocking for the originating business operation.

## Non-Goals

- Marketing campaigns, newsletters, broadcasts or CRM journeys.
- Internal platform alerts, Telegram alerts or workflow integrations.
- A generic activity feed or dashboard toast system.
- Automatic cross-channel retry after an ambiguous provider outcome.
- Treating phone authentication as WhatsApp marketing or lifecycle consent.
- Persisting full email HTML, WhatsApp bodies or raw provider payloads in NotificationOS.

## Channel Modes

| Mode                    | Planning rule                                                                                                    | Valid outcome examples                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `email_only`            | Admit email only if a real deliverable email exists and policy permits it                                        | delivered, skipped_missing_email, suppressed, failed       |
| `whatsapp_only`         | Admit WhatsApp only if a verified number, required opt-in and valid template/session path exist                  | accepted, delivered, skipped_no_consent, failed            |
| `email_and_whatsapp`    | Plan both independently from one shared context                                                                  | delivered on both, partial, skipped on one, failed on both |
| `preferred_available`   | Use the owner’s permitted preferred channel, then another eligible channel only when policy explicitly allows it | one planned channel                                        |
| `all_eligible_critical` | For approved critical triggers, plan every eligible required channel                                             | one or two planned channels                                |

The requested mode is policy input, not a command to bypass consent, suppression, recipient validity, product activation or provider configuration.

## Recipient Capability Model

NotificationOS derives this transient capability view from one product-scope fetch:

```ts
type NotificationDeliveryContext = {
  productId: "ML" | "AL" | "SD" | "CC";
  tenantId: string;
  scopeId: string;
  recipientRole: string;
  locale: string;
  timeZone: string;
  currencyCode?: string;
  recipientName?: string;
  realEmail?: string;
  emailVerified: boolean;
  whatsappNumber?: string;
  phoneVerified: boolean;
  whatsappConsent: {
    status: "granted" | "denied" | "revoked" | "unknown";
    source?: string;
    policyVersion?: string;
    recordedAt?: string;
  };
  preferences: {
    preferredChannels: Array<"email" | "whatsapp">;
    quietHoursEnabled: boolean;
  };
};
```

The context is immutable and in memory for one attempt. A later retry resolves it once again so a consent revocation, changed address or changed phone is respected.

### Phone onboarding boundary

MenuList phone users receive an internal generated email identity while `displayEmail` remains empty (`src/lib/auth/phoneOtp.ts:448-458`, `src/lib/auth/phoneOtp.ts:534-543`). That internal address is authentication plumbing, not a deliverable email. Therefore:

- phone-auth-only owner: WhatsApp may be eligible after separate opt-in; email is unavailable;
- Google/email owner: email may be eligible; WhatsApp is unavailable until a verified number and opt-in exist;
- owner with both: email, WhatsApp or both may be eligible;
- OTP verification proves number possession only and never grants notification consent.

## Routing Order

1. Validate product, event registry entry and deterministic event identity.
2. Claim the event once.
3. Resolve product scope and contacts once.
4. Build one semantic notification model and formatting context.
5. Evaluate event policy, classification, preference, contact capability, consent and channel activation in memory. Each channel OS performs its final provider-specific admission, including EmailOS suppression, without re-reading product scope. Existing quiet-hours registry metadata is not exposed as a new owner control until a durable defer-and-resume runtime is separately certified.
6. Claim all planned child deliveries atomically before provider calls.
7. Call EmailOS and/or WhatsAppOS outside Firestore transactions.
8. Finalize all channel results and aggregate event state together.

## Aggregate Status

| Status      | Meaning                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| `delivered` | Every required planned channel reached the NotificationOS success threshold      |
| `partial`   | At least one planned channel succeeded and at least one failed or was ineligible |
| `failed`    | No planned channel succeeded and at least one attempted channel failed           |
| `skipped`   | No provider call was permitted or required                                       |
| `ambiguous` | A provider may have accepted a request but the local outcome is not safely known |

Provider-specific delivery/read states remain in EmailOS or WhatsAppOS. NotificationOS stores only the orchestration outcome and references.

## Consent And Preferences

- Transactional email follows product/legal policy and email suppression rules.
- WhatsApp delivery requires explicit opt-in whenever Meta or product policy requires it.
- Revoked, denied, inactive or withdrawn consent wins over legacy booleans.
- Consent records must include source, timestamp and policy version.
- The current consent projection belongs beside the designated notification recipient in the canonical product scope used by the resolver. Audit history may remain separate, but it is not read on the send hot path.
- A preference never overrides missing contact capability, consent or suppression.
- Quiet-hour bypass is registry-controlled and limited to explicitly critical events.
- The same settings and consent contract must be available in desktop and the owner mobile shell.

## Product Boundaries

| Product       | NotificationOS                    | EmailOS                   | WhatsAppOS                                                                  |
| ------------- | --------------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| MenuList      | Owner/account lifecycle           | Transactional             | OTP, messaging onboarding, consented owner notices                          |
| Answerlattice | Owner/support-readiness lifecycle | Transactional             | Disabled until separate credentials, templates and consent UX are certified |
| CampaignCue   | Preview/export policy only        | No direct send            | No direct send                                                              |
| SignalDesk    | Separate approved outreach policy | Disabled pending approval | Disabled pending legal/reputation approval                                  |
| MyCodex       | No runtime                        | No runtime                | No runtime                                                                  |
| Neelvara      | No product-notification runtime   | No runtime                | No runtime                                                                  |

## Success Criteria

- One product-scope fetch per processing attempt, including combined delivery.
- No internal generated phone-login email is ever used as a recipient.
- Every channel has an independent deterministic delivery identity.
- Same-event combined delivery uses one semantic model and channel-specific rendering.
- No provider call occurs when the corresponding flag, consent or contact capability is absent.
- No duplicate NotificationOS collections are introduced.
- Retries never automatically replay an ambiguous channel.

## Owner Notification Admission Policy

An owner notification is admitted only when it records money movement, public availability, account access/security, completion or failure of a long-running operation, a material degradation that requires action, or a legal/account record. Routine saves, views, QR scans, individual feedback entries, successful background checks, and engagement nudges are prohibited.

Every trigger has one lifecycle state:

- `active`: a named, verifier-covered producer fires from an authoritative state transition;
- `reserved`: registry policy and template-identifier reservation only; no delivery claim is allowed and renderable copy is not required until its owning workflow, metadata, dedupe identity, recipient authority, and noise policy are verified;
- `alias`: compatibility input normalized to an active canonical trigger.

Provider bounce, complaint, suppression, delivery-delay, and webhook disorder are channel-health facts. They update EmailOS/WhatsAppOS health and may make another already-consented channel eligible for a later notification; they must never create a loop that retries or notifies through the same broken channel.

## Three-Year Trigger Catalogue

### Active now

- Billing: subscription activated, payment received, payment recovered, payment failed, grace period started, renewal reminder, suspension warning, subscription paused/resumed/upgraded/cancelled/completed, refund processed, credit purchase, credits low, credits exhausted.
- Menu/public truth: store published, publish failed, menu stale.
- Answerlattice: protected notification readiness test only.

### Reserved until an authoritative workflow is present

- Payment method action required.
- Menu import ready/failed, public menu unavailable/recovered, multi-location propagation failed, temporary status expiring, account claim completed, background image job failed.
- Staff invitation sent/accepted, staff access changed, staff removed, owner email changed, verified phone changed, WhatsApp consent changed, account recovery completed, account deletion scheduled/cancelled/completed, data export ready/failed.
- Weekly feedback summary, unresolved negative-feedback threshold, menu freshness review, multi-location issues digest, and Business Health action digest.

Reserved catalogue entries are not product claims and must not be shown as available in owner help or marketing.

The active low-credit threshold is `max(5 credits, 10% of the monthly allowance)`. It is evaluated after a successful capacity consumption using the transaction-returned balance. A positive balance at or below the threshold emits `CREDITS_LOW` once per billing period; a zero balance emits only `CREDITS_EXHAUSTED`.

## Doctrine Preservation

This is a reusable infrastructure policy, not a change to MenuList or Answerlattice product doctrine. Shared capability does not merge data, credentials, consent, reputation or activation.
