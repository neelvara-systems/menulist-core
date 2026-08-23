# WhatsAppOS — Implementation

> **Status:** Implemented in source; MenuList status-webhook runtime deployed to QA; Meta credentials/templates/subscription and live QA pending
> **Last Updated:** August 23, 2026

## Consolidated Consumers

- App owner notifications delegate through `src/lib/owner-notifications/channels/whatsapp.ts` into the root provider.
- Functions owner notifications and messaging onboarding use `functions/src/whatsappOs/provider.ts`.
- Phone OTP uses the same root provider with `authentication` classification and its existing challenge identity.
- Answerlattice owns a separate signed endpoint in `functions-answerlattice/src/whatsappOs/` and stays provider-disabled by default.

Provider activation flags remain off until the operator runbook and live Meta evidence pass.

## Target Modules

```text
src/lib/whatsapp-os/provider.ts
src/data/shared/whatsappOs.ts

functions/src/whatsappOs/provider.ts
functions/src/whatsappOs/webhook.ts
functions-answerlattice/src/whatsappOs/http.ts
functions-answerlattice/src/whatsappOs/webhook.ts
```

Use exact product environment names such as `MENULIST_*` and `ANSWERLATTICE_*`; never shorthand env prefixes. Secrets remain server-only.

## Shared Client

- Centralize admitted Graph API version in one runtime configuration.
- Encode phone-number IDs and canonicalize E.164 destinations.
- Use manual redirect handling, bounded response reads and abort timeouts.
- Validate template registry key, language and parameter schema before network work.
- Admit a document attachment only when the registered template declares a `document` header. Accept only one bounded PDF with a safe filename; upload it directly to `/{phone-number-id}/media`, then place the returned media ID in the template header.
- If the subsequent message request is definitively rejected, best-effort delete the orphaned uploaded media through Meta's media endpoint. Do not delete it when the message outcome is ambiguous or accepted because delivery may still depend on it.
- Return stable local error codes and a bounded provider message ID.
- Never expose raw Graph response or tokens to logs/callers.

Current safeguards to preserve include endpoint-ID encoding, manual redirects, 15-second timeout and a 64KB response cap (`src/lib/owner-notifications/channels/whatsapp.ts:7-11`, `src/lib/owner-notifications/channels/whatsapp.ts:95-117`).

## Idempotency And Ownership

1. Caller claims its workflow delivery before calling WhatsAppOS.
2. Caller supplies a deterministic local delivery reference.
3. WhatsAppOS prevents in-process duplicate requests and records the accepted Meta message-ID hash mapping.
4. A provider timeout is `ambiguous`; the caller does not resend automatically.
5. Webhooks resolve the provider mapping to the owning product/workflow/document.
6. WhatsAppOS calls a bounded owner-specific status updater; it never loads the business scope.

The provider mapping contains product code, workflow kind, bounded owning document ID, message-ID hash, current provider state and TTL. It contains no phone number or body.

## Webhook Boundary

- One product-specific endpoint/configuration per Meta app/business boundary.
- Implement verification challenge handling and signature verification against the raw request body.
- Cap body size before parsing.
- Validate every nested webhook shape.
- Derive a deterministic receipt identity from bounded provider message/status/timestamp fields.
- Create-once receipt; duplicate returns success without repeated writes.
- Apply monotonic provider-state updates.
- Route inbound conversational messages only to the existing messaging-onboarding intake after its existing validation/queue boundary.
- Return fast; expensive processing remains queued through existing architecture.

Meta publishes the WhatsApp Business Platform collection and webhook payload references through its official Postman workspace: https://www.postman.com/meta/whatsapp-business-platform/overview and https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference

## Consent Implementation

- Add a typed current consent projection to the authoritative owner/store settings used by NotificationOS.
- Add append-only `whatsappOsConsentEvents` only when consent changes; no read is needed on every send because the current projection arrives in the caller’s shared context.
- Write current projection and audit event atomically.
- Include `granted`, `revoked`, `denied`, source, policy version and recorded timestamp.
- Do not migrate `phoneVerifiedAt` into granted consent.
- Do not persist a pre-store opt-in as active consent. Carry the bounded choice through the onboarding operation and commit it only when the canonical owner/store recipient projection exists.

## Caller Migration

### Phone OTP

- Preserve OTP challenge claim/rate-limit behavior.
- Replace direct owner-notification adapter use with `authentication` template send.
- OTP request does not touch NotificationOS events or consent events.

### Messaging onboarding

- Preserve its session, media and delivery state machine.
- Replace duplicated Graph client internals with WhatsAppOS.
- Preserve service-window truth inside that workflow.

### Owner notifications

- NotificationOS passes final template parameters and resolved consent from its one-read context.
- WhatsAppOS revalidates channel policy without fetching store/workspace.
- Provider status is linked back to the existing owner delivery row.

## Feature Flags

- Global WhatsAppOS source admission flag.
- Product-specific provider-send flags.
- Class-specific flags for authentication, messaging onboarding and lifecycle notices where required.
- All new/changed provider flags default off until QA certification.

## Lifecycle Template Registry

- Transactional and operational owner notices must resolve through the shared, product-scoped `WHATSAPP_OS_TEMPLATE_REGISTRY`.
- The registry fixes product, Meta template name, language, parameter count, admitted message class, version and approval state.
- Arbitrary event metadata cannot select a Meta template.
- Current MenuList and Answerlattice lifecycle entries are `pending_approval`; provider calls fail closed until the exact templates are approved and the registry is updated from onboarding evidence.
- The current lifecycle templates accept one bounded semantic text parameter. Any future parameter-shape change requires a registry version change and new Meta certification.
- `menulist.billing_document_issued` additionally requires a document header. Its PDF bytes are transient provider input supplied by NotificationOS after billing-scope validation; WhatsAppOS performs no billing or product-context read and stores no PDF or media URL.
- Authentication and owner-started messaging onboarding keep their dedicated workflow contracts and are not silently reclassified as lifecycle notifications.

## Delivery-State Race Handling

- A webhook may arrive before the sender persists its provider reference. The provider-reference transaction links the existing unresolved mapping and advances the owning delivery/challenge from the already-received status.
- Same-state events advance only when their provider timestamp is newer.
- If Meta accepts a request but provider-reference persistence fails, the outcome is recorded as accepted but ambiguous. Automatic replay is prohibited until reconciliation resolves it.

## Verification

The focused `verify:whatsapp-os` package script covers config, template registry, consumer boundaries, no product DAL imports, request caps, webhook verification and collection rules. Also run owner-notification, messaging-onboarding, phone-auth, typecheck, lint and dependency-freeze gates.

## Deploy Boundary

Changed MenuList Functions logic requires a scoped Firebase QA deploy after local validation. App/API routes require an approved Vercel release. Meta onboarding, number verification, template approval, webhook subscription and live message smoke are external certification steps.
