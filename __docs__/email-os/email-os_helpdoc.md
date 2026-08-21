# EmailOS — Operator Guide

> **Audience:** Founder and production operators
> **Customer-facing:** No
> **Last Updated:** August 21, 2026

## Quick Summary

EmailOS prepares MenuList and Answerlattice for Resend without enabling live delivery. Rendering can be tested locally while product send flags remain off.

## Before Provider Onboarding

1. Confirm `npm run verify:email-os` passes.
2. Confirm root, MenuList Functions and Answerlattice Functions type checks pass.
3. Leave every EmailOS provider-send flag set to `false`.
4. Do not add generic `RESEND_*` secrets.
5. Do not connect SignalDesk, CampaignCue, MyCodex or Neelvara.

## MenuList Onboarding Inputs

1. [x] Create the approved, MFA-protected `MenuList` Resend team boundary.
2. [x] Add and verify `menulist.ai` for the canonical `MenuList <system@menulist.ai>` sender.
3. [x] Configure outbound DKIM plus the isolated `send.menulist.ai` SPF/MX Return-Path without changing Google Workspace apex MX records or enabling Resend inbound mail.
4. [x] Create distinct QA and production sending-only API keys restricted to `menulist.ai`.
5. [x] Create distinct QA and production webhooks for the nine admitted EmailOS event types.
6. [x] Store separate version-1 `MENULIST_RESEND_API_KEY` and `MENULIST_RESEND_WEBHOOK_SECRET` values in `menulist-qa` and `menulist-prod` Secret Manager.
7. [ ] Deploy the scoped MenuList webhook and sending targets to QA under a separate deployment approval.
8. [ ] Run controlled delivered, delayed, hard-bounce and suppression tests.
9. [ ] Enable the MenuList provider-send flag only after every test passes and owner approval is recorded.

The two registered webhook URLs intentionally precede their scoped Firebase deployments so the provider-generated signing secrets can exist before Functions bind them. Provider sending remains off, so the undeployed endpoints receive no legitimate EmailOS delivery traffic during this bootstrap state.

## Answerlattice Onboarding Inputs

1. [x] Use the existing MFA-protected `MenuList` Resend team under the sole
   human provider account. Do not create another paid team or human login.
   Provider suppression, reputation and quotas are therefore shared, while all
   product credentials and application state below remain isolated.
2. [x] Add and verify `answerlattice.com` in that team for the canonical
   `Answerlattice <system@answerlattice.com>` sender.
3. [x] Configure outbound DKIM plus an isolated `send.answerlattice.com`
   SPF/MX Return-Path. Preserve the Google Workspace apex MX records and do not
   enable Resend inbound mail.
4. [x] As the owner, create a dedicated QA sending-only API key restricted to
   `answerlattice.com`. Never display, log, or reuse the MenuList key.
   The owner-created value was transferred through standard input to Vercel
   custom `qa` and Answerlattice QA Secret Manager without display, logging or
   repository persistence.
5. [x] Create a separate Answerlattice QA webhook registration and signing
   secret in the shared team at
   `https://us-central1-neelvara-answerlattice-qa.cloudfunctions.net/answerlatticeEmailOsWebhook`
   for only the nine admitted events: `email.sent`, `email.delivered`,
   `email.delivery_delayed`, `email.failed`, `email.bounced`,
   `email.complained`, `email.suppressed`, `suppression.added`, and
   `suppression.removed`.
6. [x] Store independent enabled Answerlattice QA values for
   `ANSWERLATTICE_RESEND_API_KEY` and
   `ANSWERLATTICE_RESEND_WEBHOOK_SECRET` in project
   `neelvara-answerlattice-qa`. Put only the sending key and the non-secret From
   configuration in Vercel custom environment `qa`; the webhook signing secret
   belongs only to Firebase Functions.
   Both project-local secrets are stored as enabled version 1. Vercel custom
   `qa` contains only the sending key as a sensitive variable; it does not
   contain the webhook signing secret.
7. [x] Set the Vercel QA non-secret sender values to
   `ANSWERLATTICE_EMAIL_OS_FROM_DOMAIN=answerlattice.com`,
   `ANSWERLATTICE_EMAIL_OS_FROM=Answerlattice <system@answerlattice.com>`, and
   `ANSWERLATTICE_EMAIL_OS_REPLY_TO=support@neelvara.com`.
8. [x] Deploy only the Answerlattice EmailOS webhook with its required signing
   secret binding. Revision `answerlatticeemailoswebhook-00006-zer` is ACTIVE,
   binds signing-secret version 1, and rejects unsigned traffic with HTTP 400.
   Keep provider sending disabled.
9. [ ] Run the controlled provider certification matrix below before enabling
   the independent Answerlattice provider-send flag.

Never reuse MenuList secret values, webhook registrations, or Firebase
collections. Shared-team webhooks receive provider events for both products;
the runtime admits an event only when its reserved product tag and local
delivery evidence bind it to that endpoint. Production repeats the same process
with a separate production key, webhook, Firebase secret versions, and
deployment evidence. Split the provider team only when measured volume,
reputation, quota or SLA risk justifies the additional paid boundary.

## Troubleshooting

### Provider send is disabled

This is the expected source-complete state before onboarding. Confirm the product-specific flag remains off.

### Sender domain is rejected

The configured From address does not match the exact product allowlist. Correct the sender configuration; do not broaden the allowlist.

### Webhook signature is rejected

Confirm the endpoint uses the matching product webhook secret and that no proxy or framework changed the raw body before verification.

### A verified webhook is delivered twice

This is expected provider behavior. The second delivery should return success without repeating state mutations because the `svix-id` receipt already exists.

### An email remains in an ambiguous state

Do not manually resend through another provider. The local state is `outcome_unknown` and intentionally blocks automatic retry. Check the Resend dashboard using the local reference and event time; a later verified webhook can reconcile the delivery automatically.

### A recipient is suppressed

Confirm whether the cause was a permanent bounce, complaint or provider suppression. Do not remove the suppression until the address and owner intent are verified.

## Incident Rule

Before cutover, disabling the provider flag preserves the temporary existing SMTP migration path. After QA certification and SMTP removal, disabling the affected product’s provider-send flag stops transmission; do not recreate Gmail SMTP as an automatic fallback. Existing product queues and recovery records remain authoritative.
