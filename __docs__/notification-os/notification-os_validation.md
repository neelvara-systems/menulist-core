# NotificationOS — Final Wiring and Firing Validation

> **Status:** Source validation complete; live provider certification pending
> **Last Updated:** August 15, 2026
> **Products:** MenuList and Answerlattice

## Outcome

The source path is complete from active product event through durable event claim, one resolved product/contact context, channel planning, deterministic per-channel claim, provider adapter, finalization, and signed webhook reconciliation. Desktop and mobile owner settings use the same server-owned preference and consent projection.

This validation does not claim a live Resend or Meta delivery. Resend and WhatsApp owner-send flags remain off until provider onboarding, secrets, sender/number identity, Meta template approval, signed webhook configuration, QA deployment, and authenticated target smoke evidence are complete.

## Defects Closed in the Final Audit

| Defect | Risk | Correction |
| --- | --- | --- |
| Payment-failure webhook required `subscription.email` before enqueue | Phone-only owners never reached WhatsApp planning | Enqueue now requires the authoritative subscription only; email may be absent |
| Next.js billing and capacity producers did not await lifecycle processing | A serverless request could complete before durable event creation or delivery | Every producer now awaits the bounded, caught call |
| Answerlattice readiness checked SMTP only | A valid EmailOS/Resend cutover could still appear unavailable | Readiness now uses the effective product email adapter configuration |

## Long-Term Catalogue Implementation — August 15, 2026

- Added registry-owned `active`, `reserved`, and `alias` lifecycle status. Both app and Functions processors reject reserved events before event claim; the compatibility alias normalizes before deterministic identity.
- Wired `SUBSCRIPTION_ACTIVATED`, `PAYMENT_RECOVERED`, `SUBSCRIPTION_COMPLETED`, and `REFUND_PROCESSED` to exact Razorpay transitions.
- Wired `CREDITS_LOW` to the already-returned post-consumption balance. The pure policy proves positive low balance versus zero/exhausted without another subscription read.
- Registered 27 MenuList long-term workflow/access/digest contracts as reserved. They remain non-firing until the owning product workflow and compact read model exist.
- Recovered payments replace the normal `PAYMENT_SUCCESS` owner event for that charge; they do not send both.

## Active Producer Inventory

| Product | Active triggers | Source families |
| --- | --- | --- |
| MenuList | `STORE_PUBLISHED`, `MENU_PUBLISH_FAILED`, `PAYMENT_SUCCESS`, `PAYMENT_RECOVERED`, `PAYMENT_FAILED`, `GRACE_PERIOD_STARTED`, `RENEWAL_REMINDER`, `SUSPENSION_WARNING`, `CREDIT_PURCHASE_SUCCESS`, `CREDITS_LOW`, `CREDITS_EXHAUSTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_RESUMED`, `SUBSCRIPTION_UPGRADED`, `SUBSCRIPTION_COMPLETED`, `REFUND_PROCESSED`, `MENU_STALE` | Publish Functions, Razorpay routes/webhook, credit capacity boundary, lifecycle scheduler, staleness checker |
| Answerlattice | `ANSWERLATTICE_NOTIFICATION_TEST`, `PAYMENT_SUCCESS`, `PAYMENT_RECOVERED`, `PAYMENT_FAILED`, `GRACE_PERIOD_STARTED`, `CREDIT_PURCHASE_SUCCESS`, `CREDITS_LOW`, `CREDITS_EXHAUSTED`, `SUBSCRIPTION_ACTIVATED`, `SUBSCRIPTION_COMPLETED`, `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_RESUMED`, `SUBSCRIPTION_UPGRADED`, `REFUND_PROCESSED`, `WIDGET_CONNECTION_VERIFIED` | Protected readiness test, shared product-aware Razorpay routes/webhook, Answerlattice AI accounting settlement, first authenticated widget-runtime proof |

## Intentionally Reserved, Not Firing

- MenuList: `MENU_PUBLISHED` is a compatibility alias. The 27 workflow, security/access, export/deletion, and digest catalogue entries are reserved and rejected before event claim.
- Answerlattice: `SUPPORT_EMAIL_MISSING`, `WIDGET_CONNECTION_FAILED`, `SOURCE_SYNC_FAILED`, `CANONICAL_APPROVAL_REQUIRED`, and `HIGH_PRIORITY_ESCALATION` are registry/template reservations. They must not fire until each owning workflow defines an exact state transition, dedupe identity, recipient authority and noise policy.

## Evidence Boundary

- Pure dry firing executes all 68 registry policies with verified email and WhatsApp contacts, checks exact eligible-channel results, and renders all active templates.
- Static wiring evidence checks all 35 active producer markers, lifecycle-state admission, durable awaiting, product-aware Answerlattice billing, the phone-only webhook boundary, effective Answerlattice email readiness, settings parity, server-only Firestore rules and shared-contract byte parity.
- Provider adapters and webhooks are source-verified and locally tested. Real delivery remains an external activation gate, not missing source code.

## Required Release Evidence

1. Complete Resend and Meta onboarding with product-scoped secrets and approved identities/templates.
2. Enable provider-send flags only in the intended QA target.
3. Deploy current app and the smallest changed Firebase targets with authorized operator credentials.
4. Run authenticated email-only, WhatsApp-only and combined smoke sends, plus duplicate, revocation, provider-failure and webhook-order cases.
5. Confirm delivery/event ledgers and owner settings on desktop and mobile, then record provider IDs only in private operator evidence.

## Executed Local Evidence

Passed on the current worktree:

- `verify:notification-os`, including 68-trigger dry firing, 35 active product-trigger checks and Firestore emulator denial tests;
- `verify:email-os`, `verify:whatsapp-os`, and `verify:owner-notifications-boundary`;
- owner delivery-boundary, deterministic claim emulator, and maintenance retry/ambiguous-outcome emulator tests;
- MenuList API tenant safety, input validation, webhook validation, dependency freeze, mobile shell/settings and messaging-onboarding boundaries;
- root TypeScript, focused ESLint, MenuList Functions build, Answerlattice Functions build, shared registry/contract byte parity, and `git diff --check`;
- SecurityOS MenuList/Answerlattice registry audits plus the selected NotificationOS, EmailOS and WhatsAppOS evidence commands;
- Answerlattice runtime-truth source verifier after reconciling its EmailOS/WhatsAppOS flag inventory.
- Razorpay lifecycle source, pure policy, and Firestore emulator gates for all 10 admitted provider transitions.
- Billing entitlement, MenuList API tenant-safety, owner-notification boundary, focused zero-warning ESLint, root typecheck, and MenuList Functions TypeScript build after the catalogue expansion.
- Scoped MenuList QA deployment completed for `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler` in `us-central1` after their predeploy lint/build passed.

No production build, Vercel deploy, external security scan, provider transmission, or customer/production data operation was performed. The new Next.js Razorpay producer changes therefore remain source-verified until the normal app release; live Resend and Meta delivery remain provider-onboarding gates.
