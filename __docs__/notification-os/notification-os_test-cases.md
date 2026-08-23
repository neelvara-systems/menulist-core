# NotificationOS — Test Cases

> **Status:** Source and Firestore emulator gates passed; browser/provider certification and remaining deploy evidence are pending
> **Last Updated:** August 23, 2026

## Firing integrity

| Case | Expected result |
| --- | --- |
| Every registry entry is dry-planned with both verified contacts | Eligible channels equal the entry's approved default channels |
| An active producer loses its event marker | `verify:notification-os` fails |
| A Next.js lifecycle producer does not await `sendLifecycleMessage()` | `verify:notification-os` fails |
| Payment failure has a subscription but no legacy email | Event still reaches NotificationOS; channel eligibility is resolved centrally |
| Answerlattice uses Resend after cutover with no SMTP credentials | Readiness reports the effective email sender as configured |
| A reserved trigger has only a registry/template entry | It is documented as reserved and is not claimed as firing |
| A caller attempts to enqueue a reserved trigger | Rejected before event claim and provider call |
| A recovered charge follows persisted `past_due` state or `pastDueSinceAt` evidence | `PAYMENT_RECOVERED` fires instead of a duplicate `PAYMENT_SUCCESS` notice |
| Credits cross the low threshold without reaching zero | One `CREDITS_LOW` notice per billing period, with no extra subscription read |
| Credits reach zero | `CREDITS_EXHAUSTED` fires; `CREDITS_LOW` does not also fire |
| `refund.processed` webhook is replayed | Deterministic refund reference prevents a duplicate owner notice; broader payment-refunded accounting does not send a second message |

## Routing Matrix

| Case                                            | Expected                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Real email only + `email_only`                  | One email plan; no WhatsApp claim/call                            |
| Verified/consented phone only + `whatsapp_only` | One WhatsApp plan; no email claim/call                            |
| Both contacts + `email_and_whatsapp`            | Two child plans from one context                                  |
| New store + verified email only                 | Combined default persists; email is eligible and WhatsApp skips   |
| New store + verified phone without consent      | Combined default persists; WhatsApp skips for missing consent     |
| New store + both verified + WhatsApp consent    | Email and WhatsApp are both eligible                              |
| Internal `msg.menulist.*` onboarding identity   | Email is excluded from initial notification settings              |
| Internal generated auth email + phone           | Email ineligible; no send to generated address                    |
| WhatsApp number without consent                 | WhatsApp skipped with stable reason; email may proceed            |
| Revoked consent with legacy boolean true        | Revocation wins                                                   |
| Preferred WhatsApp unavailable                  | Apply registry fallback policy only; never silently bypass        |
| Critical all-eligible                           | Both eligible channels planned; critical policy bypasses preference |

## Firebase Cost Assertions

- Email-only MenuList attempt: one canonical store read.
- WhatsApp-only MenuList attempt: one canonical store read.
- Combined MenuList attempt: one canonical store read, not two.
- Answerlattice combined attempt: one workspace read.
- Canonical MenuList miss may add exactly one legacy read, never one per channel.
- Pure planner and channel rendering perform zero product-context reads/writes.
- Combined delivery keeps one product-scope read while each child claim/final write independently proves ownership.
- Duplicate terminal event makes zero provider calls.

## Reliability

- Independent channel success/failure produces `partial`.
- Both fail produces `failed`.
- Provider timeout produces `ambiguous` and no automatic replay.
- Crash after claims but before provider call is recoverable without unsafe duplication.
- Crash after one provider acceptance does not replay the accepted channel.
- Later retry re-resolves context once and honors newly revoked consent.
- Originating business action succeeds even when notification processing fails.

## Security

- Invalid product/scope/document ID fails before product reads.
- Cross-tenant store/workspace mismatch makes zero provider calls.
- Raw recipient, content, provider payload and secrets are absent from logs.
- Browser cannot write event/delivery/provider collections.
- Oversized event, metadata, response or webhook fails closed.
- CampaignCue, MyCodex and Neelvara direct sends are rejected.

## UX

- OTP consent and notification consent are distinct controls.
- Phone-only, email-only and dual-contact onboarding complete successfully.
- Desktop/mobile settings parity.
- Consent withdrawal is immediate and understandable.

## Verification Evidence Required

- Focused unit tests for pure planner and aggregate outcomes.
- Firestore emulator operation counters.
- EmailOS verifier and Resend QA certification.
- WhatsAppOS template, webhook and opt-in certification.
- Typecheck, lint and dependency-freeze gates.
- Authenticated desktop/mobile/browser smoke for settings and onboarding.

## Evidence — August 15, 2026

- Passed `verify:notification-os`, including the dedicated Firestore emulator consent-boundary test.
- Passed `verify:whatsapp-os`, `verify:email-os`, owner-notification and messaging-onboarding boundary suites.
- Passed the complete MenuList Firebase predeploy matrix: 42 rules/storage scripts.
- Passed explicit email-only, WhatsApp-only, combined, phone-only, missing-contact, disabled-channel and consent-revocation dry-run cases.
- Passed desktop/mobile readiness, masked-contact, invalid-selection, unchanged-save and preferred-channel fallback checks.
- Passed browser-denial emulator cases for both MenuList and Answerlattice EmailOS/WhatsAppOS collections.
- Passed SecurityOS registry verification with NotificationOS, EmailOS and WhatsAppOS registered as internal evidence.
- Passed MenuList Functions build, Answerlattice Functions build, root typecheck, zero-warning root lint and dependency freeze.
- Deployed the scoped `messagingOnboarding` update to MenuList QA in `us-central1`.
- Firestore rules remain locally certified but remote release is pending because the Firebase Rules API repeatedly returned HTTP 503.
- Answerlattice QA rules are locally certified but remote release is pending project IAM; the scoped rules deploy returned HTTP 403.
- New MenuList/Answerlattice Resend secrets and Answerlattice WhatsApp webhook secrets are absent in QA, so their new webhook targets remain intentionally undeployed until provider onboarding creates the bindings.
- TTL field configuration remains pending because the QA project has pre-existing composite-index drift; deployment returned HTTP 409 for an already-existing `users` index. Do not use destructive `--force` cleanup for this feature.
- Vercel, Resend activation, Meta template activation and live provider sends remain intentionally pending.
