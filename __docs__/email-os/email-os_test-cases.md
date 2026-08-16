# EmailOS — Test Cases

> **Status:** Required before provider activation
> **Last Updated:** August 15, 2026

## Source and Contract Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| EO-001 | Shared contract mirrors | Root, MenuList Functions and Answerlattice Functions files are byte-identical |
| EO-002 | CampaignCue provider request | Validation rejects direct send |
| EO-003 | MyCodex or unknown product request | Validation rejects direct send |
| EO-004 | Missing provider flag | Zero Firebase reads and zero provider calls |
| EO-005 | Missing API key or sender domain | Generic configuration failure and zero provider call |
| EO-006 | Sender outside allowlist | Request rejected before suppression read |
| EO-007 | Invalid recipient, subject, tag or local reference | Contract validation rejects request |
| EO-008 | Same event and local reference | Same deterministic provider idempotency key |
| EO-009 | React Email render | Non-empty HTML, plain text and preview text |
| EO-010 | Unsafe URL in template input | Renderer rejects it |
| EO-011 | Same recipient in MenuList and Answerlattice | Product-scoped recipient hashes differ |
| EO-012 | More than seven caller tags | Rejected because the eighth provider slot is reserved for local delivery identity |
| EO-013 | Caller supplies `email_os_delivery_id` | Rejected; only the provider adapter may set the reserved lookup tag |

## Provider Adapter Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| EO-101 | Recipient locally suppressed | No Resend request; normalized suppressed result |
| EO-102 | Resend success | Bounded provider ID returned and compact delivery mapping written |
| EO-103 | Resend explicit 4xx | Non-retryable normalized failure |
| EO-104 | Resend explicit 429 or 5xx before acceptance | Retryability classified; a later caller may transactionally reacquire the same claim |
| EO-105 | Timeout or network ambiguity | `outcome_unknown`; no retry or fallback provider call |
| EO-106 | Duplicate local delivery identity | Existing result returned with no provider call, including after Resend's 24-hour idempotency window |
| EO-107 | Webhook arrives before send response write | Reserved delivery tag resolves the queued record and persists provider identity/status |
| EO-108 | Concurrent retry of retryable rejection | Exactly one caller reacquires `queued`; other caller observes the claim |

## Webhook Security Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| EO-201 | Missing Svix header | `400` generic response; zero Firestore work |
| EO-202 | Invalid signature | `400` generic response; zero Firestore work |
| EO-203 | Oversized raw body | `413`; no parse or write |
| EO-204 | Valid delivered event | Receipt and monotonic delivery update |
| EO-205 | Same `svix-id` replay | `200`; no repeated state mutation |
| EO-206 | Delivered after bounced | Terminal bounced state does not regress |
| EO-207 | Delayed after delivered | Delivered state does not regress |
| EO-208 | Permanent bounce | Product suppression becomes active |
| EO-209 | Complaint | Product suppression becomes active |
| EO-210 | Suppression removal | Matching provider-derived suppression becomes inactive |
| EO-211 | Message from another product | No cross-project lookup or write |

## Product Boundary Tests

| ID | Product | Expected result |
| --- | --- | --- |
| EO-301 | MenuList | Adapter and webhook compile; send flag remains off |
| EO-302 | Answerlattice | Independent adapter, webhook, secret group and collections compile; send flag remains off |
| EO-303 | SignalDesk | Existing provider-send flag remains off and no transactional credential reuse appears |
| EO-304 | CampaignCue | `export_download_only` and disabled provider actions remain unchanged |
| EO-305 | MyCodex | No Resend key, Firebase collection, Function or runtime dependency |
| EO-306 | Neelvara | No Resend key, Function or send route |

## Provider Certification Matrix

These tests run only after onboarding:

| Scenario | Gmail | Outlook | Yahoo | Provider dashboard | Local webhook state |
| --- | --- | --- | --- | --- | --- |
| Delivered transactional email | Required | Required | Required | Delivered | Delivered |
| Plain-text fallback | Required | Required | Required | Sent | Sent/delivered |
| Hard bounce test address | Required | Required | Required | Bounced | Bounced + suppressed |
| Suppressed repeat | Required | Required | Required | Suppressed | No paid request where local suppression exists |
| Webhook replay | Not applicable | Not applicable | Not applicable | Replay succeeds | No duplicate mutation |

## Completion Gate

Source implementation is complete only when focused verification, dependency freeze, root typecheck, both Functions builds and lint pass. Production activation additionally requires the provider certification matrix, DNS evidence, secret creation, scoped QA deployments and owner approval.

## Evidence — August 15, 2026

- Passed EmailOS contract parity, idempotency, suppression, webhook-signature, stale/future timestamp and provider-disabled dry runs.
- Passed explicit browser-denial emulator cases for MenuList and Answerlattice delivery, receipt and suppression collections.
- Passed both Functions builds, root typecheck, zero-warning lint, dependency freeze and SecurityOS evidence registration.
- MenuList outbound DNS, isolated API keys, webhook registrations and QA/production Secret Manager bindings were prepared on August 16, 2026. Live delivery and inbox certification remain intentionally pending scoped QA deployment.
- MenuList QA and production each have enabled version-1 `MENULIST_RESEND_API_KEY` and `MENULIST_RESEND_WEBHOOK_SECRET` values. Answerlattice secrets remain absent and pending its separate onboarding; no placeholder value was created.
