# EmailOS — Implementation Blueprint

> **Status:** Source implemented; MenuList provider prepared; QA deployment and activation pending
> **Last Updated:** August 16, 2026

## Architecture

EmailOS is a shared contract with deployment-local runtimes. This avoids importing parent-repository source into Firebase deployment packages and preserves Answerlattice infrastructure separation.

```text
src/data/shared/emailOs.ts
  = canonical pure contract
  -> functions/src/sharedData/emailOs.ts exact mirror
  -> functions-answerlattice/src/sharedData/emailOs.ts exact mirror

Root Next server runtime
  -> src/lib/email-os/

MenuList Functions runtime
  -> functions/src/emailOs/

Answerlattice Functions runtime
  -> functions-answerlattice/src/emailOs/
```

Runtime implementations are small and product-aware. The focused verifier enforces contract mirror parity, dependency pins, feature flags, product prohibitions, secret naming and webhook security markers.

## Dependency Decision

| Package | Exact version | Packages | Reason |
| --- | --- | --- | --- |
| `@react-email/render` | `2.1.0` | Root, MenuList Functions, Answerlattice Functions | Server rendering and plain-text conversion without shipping the React Email preview CLI |
| `resend` | `6.20.0` | Root, MenuList Functions, Answerlattice Functions | Typed send and signed webhook verification |
| `react` | `19.2.8` | Existing root; add to Functions packages | Render runtime peer |
| `react-dom` | `19.2.8` | Existing root; add to Functions packages | Render runtime peer |

The unified `react-email` CLI package is intentionally not a production dependency because it includes preview/build tooling not required inside Firebase Functions.

## Canonical Contract

`src/data/shared/emailOs.ts` owns:

- product policies and admitted classifications;
- delivery status precedence;
- envelope, provider result and normalized provider-event types;
- identifier, tag, subject, address and payload bounds;
- deterministic validation and idempotency-key helpers;
- recipient and provider-message hashing helpers that require a runtime SHA-256 function.

It contains no React, Firebase, Resend, Next.js or Node-only import.

## Firestore Schema

All collections are Admin-only and remain denied to browser clients.

### MenuList

```text
emailOsDeliveries/{sha256(productCode:eventType:localDeliveryReference)}
emailOsWebhookReceipts/{sha256(svixId)}
emailOsSuppressions/{sha256(productCode:canonicalRecipient)}
```

### Answerlattice

```text
answerlattice_emailOsDeliveries/{sha256(productCode:eventType:localDeliveryReference)}
answerlattice_emailOsWebhookReceipts/{sha256(svixId)}
answerlattice_emailOsSuppressions/{sha256(productCode:canonicalRecipient)}
```

Delivery documents contain product code, provider, bounded provider message ID and its hash, local reference, event type, classification, current status, provider event time, created/modified timestamps and retention expiry. They do not contain subject, HTML, plain text or plaintext recipient. The pre-provider document ID comes from the deterministic local delivery identity. Every provider request reserves one Resend tag named `email_os_delivery_id` for that document ID; webhook lookup uses it first and falls back to the provider message ID hash for older or untagged messages.

Webhook receipts contain event ID hash, event type, provider message ID hash, processing result, provider event time, created timestamp and expiry.

Suppressions contain recipient hash, reason, source provider message ID hash, active state and timestamps. Suppressions have no automatic TTL because a permanent block must not silently expire.

## Provider Adapter

The adapter performs this order, with flag/config validation occurring before Firebase work:

1. Validate envelope and product policy.
2. Confirm product provider-send feature flag.
3. Read product API key and allowed sender suffix.
4. Reject absent or mismatched sender authority.
5. Read the product-scoped hashed suppression record.
6. Transactionally create the deterministic local delivery claim before any provider call.
7. Return the existing result without a provider call when the claim already exists, except for an explicit non-ambiguous retryable provider rejection.
8. Call Resend with HTML, plain text, up to seven caller tags, the reserved local-delivery tag and the deterministic idempotency key.
9. Bound the provider response and transactionally advance the compact delivery status without regressing a newer webhook state.
10. Return a normalized result to the existing product delivery processor.

Provider HTTP/network ambiguity is stored as `outcome_unknown` and returns `accepted: false`, `retryable: false`, `ambiguous: true`. It can advance to `sent`, `delivered` or another verified webhook result, but it cannot be resent automatically. Explicit `429` and `5xx` responses known not to have been accepted remain retryable and may reacquire the local claim. Resend's provider idempotency window is 24 hours; the durable local claim is the long-term duplicate-send boundary.

## Webhook Processor

Each product endpoint:

1. Rejects non-POST methods.
2. Reads the raw body with a fixed maximum size.
3. Requires all three Svix headers.
4. Verifies through `resend.webhooks.verify` and the product webhook secret.
5. Normalizes only admitted event types.
6. Creates a hashed receipt in a Firestore transaction.
7. Resolves the delivery directly through the signed provider payload's reserved local-delivery tag, with provider-ID-hash fallback.
8. Applies monotonic delivery-state changes and stores the provider identity even if the webhook arrives before the send response is persisted.
9. Creates or updates a product-scoped hashed suppression for permanent bounce, complaint and suppression events.
10. Returns `200` for newly processed and duplicate verified events.
11. Returns generic `400` validation errors without exposing verification details.

## Feature Flags

| Runtime | Flag | Default |
| --- | --- | --- |
| Root | `ENABLE_EMAIL_OS` | `true` for rendering and contract use |
| Root | `ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND` | `false` |
| Root | `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND` | `false` |
| Root | `ENABLE_CAMPAIGNCUE_EMAIL_OS_PROVIDER_SEND` | `false` and verifier-enforced |
| MenuList Functions | `ENABLE_EMAIL_OS` | `true` |
| MenuList Functions | `ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND` | `false` |
| Answerlattice Functions | `ENABLE_ANSWERLATTICE_EMAIL_OS` | `true` |
| Answerlattice Functions | `ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND` | `false` |

## Environment and Secret Names

### MenuList

- `MENULIST_RESEND_API_KEY`
- `MENULIST_RESEND_WEBHOOK_SECRET`
- `MENULIST_EMAIL_OS_FROM`
- `MENULIST_EMAIL_OS_REPLY_TO`
- `MENULIST_EMAIL_OS_FROM_DOMAIN`

### Answerlattice

- `ANSWERLATTICE_RESEND_API_KEY`
- `ANSWERLATTICE_RESEND_WEBHOOK_SECRET`
- `ANSWERLATTICE_EMAIL_OS_FROM`
- `ANSWERLATTICE_EMAIL_OS_REPLY_TO`
- `ANSWERLATTICE_EMAIL_OS_FROM_DOMAIN`

No `RESEND_*`, `ML_*` or `AL_*` alias is admitted.

MenuList outbound callers bind `MENULIST_RESEND_API_KEY` through their existing platform-delivery secret group; the MenuList webhook binds only `MENULIST_RESEND_WEBHOOK_SECRET`. Answerlattice workflow delivery binds `ANSWERLATTICE_RESEND_API_KEY`; its webhook binds only `ANSWERLATTICE_RESEND_WEBHOOK_SECRET`. These declarations deliberately prevent Function deployment until onboarding has created the product-specific secrets.

## File Inventory

### Documentation

- `__docs__/email-os/README.md`
- `__docs__/email-os/email-os_spec.md`
- `__docs__/email-os/email-os_impl.md`
- `__docs__/email-os/email-os_marketing.md`
- `__docs__/email-os/email-os_website.md`
- `__docs__/email-os/email-os_helpdoc.md`
- `__docs__/email-os/email-os_firebase.md`
- `__docs__/email-os/email-os_mobile-support.md`
- `__docs__/email-os/email-os_test-cases.md`
- `__docs__/email-os/email-os_validation.md`

### Shared and root runtime

- `src/data/shared/emailOs.ts`
- `src/lib/email-os/render.ts`
- `src/lib/email-os/provider.ts`
- `src/config/features.ts`
- `src/constants/database.ts`
- `.env.production.example`

### MenuList Functions

- `functions/src/sharedData/emailOs.ts`
- `functions/src/emailOs/render.ts`
- `functions/src/emailOs/provider.ts`
- `functions/src/emailOs/http.ts`
- `functions/src/emailOs/webhook.ts`
- `functions/src/messaging/providers/resend.ts`
- `functions/src/index.ts`
- `functions/src/config/secrets.ts`
- `functions/src/constants/database.ts`
- `functions/src/constants/features.ts`
- `functions/src/envSetup.md`

### Answerlattice Functions

- `functions-answerlattice/src/sharedData/emailOs.ts`
- `functions-answerlattice/src/emailOs/render.ts`
- `functions-answerlattice/src/emailOs/provider.ts`
- `functions-answerlattice/src/emailOs/http.ts`
- `functions-answerlattice/src/emailOs/webhook.ts`
- `functions-answerlattice/src/integrations/adapters/emailAdapter.ts`
- `functions-answerlattice/src/config/secrets.ts`
- `functions-answerlattice/src/constants/database.ts`
- `functions-answerlattice/src/constants/features.ts`
- `functions-answerlattice/src/index.ts`

### Verification and governance

- `scripts/verification/verify-email-os.js`
- `scripts/verification/test-email-os.ts`
- `scripts/verification/verify-dependency-freeze.js`
- `package.json` and all three lockfiles

## Existing Send-Path Migration

- MenuList Functions keeps the existing `sendEmailViaSMTP` export as a source-compatible migration adapter. While the EmailOS provider flag is off it preserves the current SMTP path; after onboarding and flag activation it delegates to EmailOS with the existing claim identity.
- Root MenuList notification senders use the same controlled cutover branch and preserve existing durable claims.
- Answerlattice workflow email retains its isolated SMTP path while disabled and switches to its product-local EmailOS adapter only after Answerlattice onboarding.
- The temporary SMTP branches are removed only after QA delivery, webhook, suppression and rollback certification. Long-term production operation has one provider path per product and no automatic SMTP fallback.
- CampaignCue receives no provider adapter or credential path.
- SignalDesk remains unchanged and provider-disabled until its separate approval and reputation certification.

## Security Checklist

- [x] Product-prefixed secrets only
- [x] Sender-domain allowlist checked before provider call
- [x] Recipient and message IDs hashed for lookup documents
- [x] Raw body used for webhook verification
- [x] Svix headers required
- [x] Payload size bounded before parsing
- [x] Webhook receipt created once
- [x] No secrets, full recipient, subject or body logged
- [x] Firestore values contract-validated/bounded and Admin-only
- [x] Out-of-order status regression prevented
- [x] Provider event timestamps bounded against stale and implausibly future values
- [x] Webhook reconciliation remains available while outbound provider sending is disabled
- [x] CampaignCue and MyCodex provider prohibition verifier-enforced

## Webhook And Cutover Boundary

Outbound send flags and inbound reconciliation are intentionally separate. Turning provider sending off prevents new Resend requests but does not discard valid signed delivery events for already-accepted messages. Event timestamps before 2020 or more than 24 hours in the future fail closed. Browser clients are explicitly denied access to delivery, receipt and suppression collections in both product rulesets.

## Validation Commands

```bash
npm run verify:email-os
npm run verify:dependency-freeze
npx tsc --noEmit
npm --prefix functions run build
npm --prefix functions-answerlattice run build
npm run lint
```

No production build or Vercel deploy is required. MenuList's product-specific QA and production Resend secrets now exist as enabled version-1 Secret Manager values. The smallest QA Firebase deployment and provider certification remain separately gated; Answerlattice provider onboarding remains pending.
