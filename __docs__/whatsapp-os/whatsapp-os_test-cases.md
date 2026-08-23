# WhatsAppOS — Test Cases

> **Status:** Source and emulator certification passed; Meta/provider and remaining deploy evidence required before activation
> **Last Updated:** August 23, 2026

- Billing-document templates declare a required document header; the sender rejects a missing or mismatched header contract, unsafe filename, non-PDF content type, or decoded attachment above 8MB before sending the customer message.
- A successful bounded media upload supplies only its media ID to the approved template header. MenuList does not persist PDF bytes or a provider media URL.
- A media-upload failure is an explicit failed attempt with no customer message request. An ambiguous `/messages` outcome remains non-retryable until reconciliation, preserving the existing duplicate-send boundary.
- A confirmed `/messages` rejection triggers best-effort orphan-media deletion. A timeout or other ambiguous result does not delete the uploaded document because Meta may have accepted the message.

## Configuration And Templates

- Product send flag off: zero Firebase/provider operations.
- Missing token, phone-number ID or allowed product identity fails closed.
- Unknown template key/language/parameter shape fails before provider call.
- Free-form message without validated service window fails.
- Product A credentials/template cannot serve product B.
- CampaignCue, MyCodex and Neelvara requests are rejected.

## Authentication

- OTP uses authentication-class template and existing challenge idempotency.
- Replayed OTP request obeys existing resend/rate limits.
- OTP success does not write granted notification consent.
- Generated phone-login email is irrelevant to WhatsApp delivery.

## Consent And Routing

- Verified phone without opt-in cannot receive lifecycle notice.
- Explicit revocation overrides old boolean consent.
- Owner-started service window permits only workflow-relevant conversational replies.
- NotificationOS email succeeds while WhatsApp is skipped for no consent, producing partial/appropriate aggregate state.
- Later retry rechecks current consent supplied by NotificationOS.

## Provider And Webhooks

- Accepted response persists one hashed message reference.
- Non-2xx response returns sanitized stable code.
- Redirect, timeout, malformed/oversized response and control-character provider ID fail safely.
- Timeout is ambiguous and not replayed automatically.
- Webhook verification challenge and raw-body signature checks pass/fail correctly.
- Oversized/malformed/unknown-product webhook makes no unsafe write.
- Duplicate receipt performs no repeated mutation.
- Out-of-order sent/delivered/read statuses remain monotonic.
- Failed status records bounded code without raw provider payload.
- Unknown provider message ID uses direct lookup only and remains bounded.

## Firebase Cost

- Send module performs zero product-context reads.
- Accepted send creates one provider mapping write.
- Combined NotificationOS delivery still performs one store/workspace read total.
- Consent change fetches the store and verified user once together, then performs one projection write plus one consent-event write.
- No polling, listener, collection scan or new scheduler.

## Security

- Secrets remain server-only and never enter logs/browser bundles.
- Raw phone, message body and webhook body are not persisted.
- Template parameters and URLs are bounded/validated.
- Cross-tenant and cross-product owning references fail closed.
- Endpoint rate limits and body caps run before expensive processing.

## Certification Evidence

- Focused unit/emulator tests and `verify:whatsapp-os`.
- Existing phone-auth, messaging-onboarding and owner-notification gates.
- QA Meta number/template approval evidence.
- Live test to opted-in QA recipients for each admitted class.
- Webhook sent/delivered/read/failed evidence.
- Authenticated desktop/mobile consent UX smoke.
- Scoped Firebase deploy and approved Vercel release evidence where applicable.

## Evidence — August 15, 2026

- Passed the WhatsAppOS contract/provider/webhook/OTP/onboarding verifier and tests.
- Passed the NotificationOS routing and dedicated Firestore consent-boundary emulator suite.
- Passed all 42 MenuList Firebase predeploy rule/storage scripts plus Functions builds, root typecheck and zero-warning lint.
- Passed pending-template fail-closed, workflow/message-class mismatch, invalid recipient, webhook-before-reference, same-state timestamp and ambiguous-acceptance dry-run boundaries.
- The decoupled MenuList WhatsApp status webhook path was deployed through `messagingOnboarding` to QA in `us-central1`.
- Firestore rule release is pending a Firebase Rules API recovery after repeated HTTP 503 responses.
- Answerlattice QA rule release is separately blocked by project IAM HTTP 403.
- Answerlattice WhatsApp webhook secrets are not present in QA; the new webhook target must not be deployed before onboarding creates those secret bindings.
- TTL release is pending non-destructive reconciliation of pre-existing QA composite-index drift after HTTP 409; no live index was deleted.
- Answerlattice remains source-ready with provider send disabled until its product-scoped secrets, Meta templates and webhook subscription exist.
- Resend, Meta templates, live opted-in-recipient sends and Vercel surfaces remain gated for their respective onboarding sessions.
