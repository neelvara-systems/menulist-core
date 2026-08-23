# NotificationOS — Implementation

> **Status:** Implemented in source; MenuList owner-channel selection is enabled; provider calls remain fail-closed when credentials, templates, verified contacts, consent, or certification are absent
> **Last Updated:** August 23, 2026

## Reuse Decision

Refactor the current Owner Notifications implementation in place. Keep:

- `ownerNotificationEvents`, `ownerNotificationDeliveries`, and `ownerNotificationRateLimits`;
- the product-scoped trigger registry;
- deterministic event and channel delivery IDs;
- platform recovery tooling and retention model;
- current MenuList and Answerlattice separation.

Do not introduce `notificationEvents`, `notificationContexts`, or another provider-neutral ledger.

## Target Runtime

```text
enqueueNotification(event)
  -> claimEvent(eventId)
  -> resolveDeliveryContext(event)       // 0-1 AL read; 0-2 ML reads during legacy fallback
  -> buildSemanticNotification(context)  // pure
  -> planChannels(context, policy)        // pure
  -> deterministic channel claims         // channel-local safety transactions
  -> channel sends                        // provider calls, no product-context reads
  -> deterministic channel finalization   // claim ownership re-proved before final write
```

## Core Types

- `NotificationChannelMode`
- `NotificationDeliveryContext`
- `NotificationSemanticModel`
- `NotificationChannelPlan`
- `NotificationChannelEligibility`
- `NotificationProviderReference`
- `NotificationAggregateOutcome`

The semantic model contains bounded values such as title, explanation, action label/link and formatted facts. EmailOS and WhatsAppOS render that same meaning to channel-specific content; they do not re-read the store/workspace.

## Work Packages

### 1. Registry and compatibility

- Extend `src/data/shared/ownerNotificationRegistry.ts` with explicit mode/policy fields while preserving existing trigger keys.
- Mirror shared data byte-for-byte into MenuList Functions.
- Keep legacy `requestedChannels` compatibility, but normalize it immediately to a typed channel mode.
- Add a feature flag for NotificationOS orchestration changes and retain per-channel/product send flags.

### 2. Single-read context resolver

- Consolidate recipient, formatting, preferences and consent into one immutable result.
- Reject internal generated phone-login emails by checking the canonical real/display-email contract.
- Prefer canonical top-level MenuList store documents; retain the current one-read legacy fallback only during compatibility.
- Keep Answerlattice resolution inside its Firebase project.
- Add read counters to verification/ops evidence, never to user-facing content.

Current evidence: `resolveOwnerNotificationScope()` performs the product-scope read (`src/lib/owner-notifications/recipientResolver.ts:85-115`), and the processor reuses its output for recipient, formatting and templates (`src/lib/owner-notifications/index.ts:571-601`).

### 3. Pure channel planner

- Evaluate channel policy without Firebase or provider calls.
- Produce an explicit reason for every admitted or rejected channel.
- Plan all channels before sending; do not start email and later decide to fall back to WhatsApp.
- Evaluate WhatsApp consent and email suppression through the correct channel authority.

### 4. Multi-channel claim

- Keep deterministic per-channel claims so one channel can be independently terminal, ambiguous or safely retryable.
- This does not change billable claim reads/writes relative to a combined transaction and preserves the existing proven ownership boundary.
- If one prior channel outcome is ambiguous, never replay it automatically; other independently unattempted channels follow the frozen event policy.
- Keep recipient hash/mask only; do not persist the delivery context.

### 5. Channel adapters

- Replace direct SMTP calls with EmailOS.
- Replace duplicated owner WhatsApp Graph calls with WhatsAppOS.
- Pass a bounded provider-neutral request with the semantic model and deterministic child delivery identity.
- Store only aggregate child references in NotificationOS.

### 6. Aggregate finalization

- Execute provider calls outside transactions.
- Re-prove each child claim before finalization; then derive and write the bounded parent aggregate.
- Derive `delivered`, `partial`, `failed`, `skipped`, or `ambiguous` deterministically.

### 7. Onboarding and settings

- Phone OTP remains an authentication call directly to WhatsAppOS.
- Default new MenuList stores to the combined routing mode so every eligible owner channel is used. The MenuList owner-channel gates are enabled in the Next.js source. Keep the WhatsApp notification opt-in separate and unselected: a provided or OTP-verified phone establishes contact capability, not notification consent. If the UX asks earlier, keep the choice in the bounded onboarding operation and commit consent only when the authoritative recipient/scope exists. Provider configuration and approved-template checks remain fail-closed.
- Google/email onboarding may invite the owner to add and verify WhatsApp later.
- MenuList desktop and mobile owner settings expose the same contact capability, preference and consent state. Answerlattice's responsive Settings surface owns the workspace support delivery address; lifecycle routing falls back to that address when no dedicated notification or billing address exists. Its governed workflow-notification settings remain separate from account lifecycle delivery.

### 8. Migration

1. Add types, pure planners and verifiers with all provider flags off.
2. Route Owner Notifications through the new context/planner behind a compatibility flag.
3. Connect EmailOS while preserving existing event identities.
4. Connect WhatsAppOS only after Meta template, webhook and consent certification.
5. Compare old/new plans in shadow mode without duplicate provider calls.
6. Remove duplicated SMTP/Graph adapters after QA parity.
7. Update Owner Notifications docs to an implementation-history/substrate role.

This is one complete architecture with activation gates, not deferred architecture work.

### 9. Trigger lifecycle governance

- `producerStatus` is stored on the registry entry so active/reserved/alias truth cannot drift into a separate catalogue.
- Source verification must map every active trigger to at least one authoritative producer marker.
- Enqueue rejects reserved triggers before an event claim or provider call.
- Alias triggers normalize to the canonical active trigger before deterministic identity is calculated.
- A reserved trigger may include a renderable template for review and dry-run evidence, but that never makes it active.

### 10. Firebase-cost-safe derived notifications

- Low-credit detection reuses the subscription and post-consumption balance already returned by the capacity transaction. It performs no additional balance read.
- Recovery classification reuses `paymentApplication.previousSubscription` from the Razorpay settlement transaction.
- Refund, activation, and completion reuse the subscription already resolved by the webhook.
- Digests may activate only from an existing compact summary/read model. They may not re-query raw feedback, menu, location, or analytics collections per channel.

## Security Requirements

- Server/Admin-only processing; no browser write access to event or delivery collections.
- Validate all event metadata and document IDs before Firestore reads.
- Never log raw addresses, phone numbers, bodies, tokens or provider payloads.
- Use product-specific secrets and allowed sender/number identities.
- Cap event, semantic-model, provider-response and webhook sizes.
- Fail closed on missing consent, invalid scope, missing template, unknown event, configuration error or limiter outage.

## Verification Commands

Focused implementation verifiers are registered as `verify:notification-os`, `verify:email-os` and `verify:whatsapp-os`. Run, at minimum:

```bash
npm run verify:owner-notifications-boundary
npm run verify:notification-os
npm run verify:email-os
npm run verify:whatsapp-os
npm run verify:dependency-freeze
npx tsc --noEmit
npm run lint
```

The three OS verifiers are also registered in SecurityOS as internal, non-production evidence. Do not run a production build by default.

## Hardening Decisions — August 15, 2026

- Preference save performs one `getAll` for the store and user, then reuses that resolved context for both channels.
- Verified email comes from the persisted verified notification projection or the authenticated provider identity; owner-editable display email is not treated as verified.
- Consent withdrawal is always allowed, including while the WhatsApp provider flag is off or the selected mode is temporarily ineligible.
- Consent audit events use create-only writes. Current projection and append-only audit are committed in one batch.
- `whatsapp_only`, `email_only`, and `email_and_whatsapp` remain explicit modes. The preferred channel records the first selected channel instead of silently forcing email.
- `preferred_available` requires neither channel individually; it uses the first eligible preferred channel and falls back, so an email-only owner is not blocked by missing WhatsApp consent.
- `buildOnboardingOwnerNotificationSettings()` writes the verified contact projection and `email_and_whatsapp` default inside the existing tenant/store transaction. It excludes generated `msg.menulist.*` identities and never writes granted WhatsApp consent.
- Messaging onboarding records provider-verified number possession on the owner and store, but the channel remains ineligible until the owner grants notification consent.
- A stale legacy consent boolean cannot override an explicit revoked status.

## Deploy Boundary

Cloud Function changes require the scoped Firebase QA deploy after validation under repository rules. App/API changes require an approved Vercel release; no Vercel deploy is implied by this plan.

## Final Firing Audit — August 15, 2026

- Every Next.js lifecycle producer now awaits `sendLifecycleMessage()` so the server runtime cannot finish before the durable event and inline delivery processing complete.
- Payment-failure and grace-period webhook events enqueue from an authoritative subscription even when its legacy email field is empty. NotificationOS, not the producer, decides whether verified email, verified WhatsApp, both, or neither is eligible.
- Answerlattice readiness now recognizes the effective sender boundary: EmailOS/Resend after provider cutover, or SMTP during the bounded migration. The retained `smtpConfigured` response field is compatibility-only and carries the same effective value.
- The focused verifier maps all 35 active product-trigger producers and rejects an un-awaited Next.js lifecycle call, a pre-routing email guard, a cross-product legacy fallback, or a non-active producer claim.
- The executable dry-firing test runs every one of the 54 registry entries through the channel planner with verified contacts, asserts its complete registry-approved channel set, and renders every active template.

Registry presence is not producer evidence. `MENU_PUBLISHED` is a compatibility alias. Answerlattice now fires its protected test, exact shared Razorpay billing transitions, already-loaded post-consumption support-credit state, and first authenticated widget-runtime proof. Five speculative workflow entries remain reserved. The MenuList catalogue keeps 27 workflow/access/digest entries reserved until their owning flows define exact transition, dedupe, recipient, read-model, and noise semantics.
