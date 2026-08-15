# EmailOS — Operator Guide

> **Audience:** Founder and production operators
> **Customer-facing:** No
> **Last Updated:** August 15, 2026

## Quick Summary

EmailOS prepares MenuList and Answerlattice for Resend without enabling live delivery. Rendering can be tested locally while product send flags remain off.

## Before Provider Onboarding

1. Confirm `npm run verify:email-os` passes.
2. Confirm root, MenuList Functions and Answerlattice Functions type checks pass.
3. Leave every EmailOS provider-send flag set to `false`.
4. Do not add generic `RESEND_*` secrets.
5. Do not connect SignalDesk, CampaignCue, MyCodex or Neelvara.

## MenuList Onboarding Inputs

1. Create the approved Resend team or account.
2. Add the approved MenuList sending subdomain.
3. Configure SPF, DKIM and DMARC.
4. Create a sending-only API key restricted to the MenuList domain.
5. Create the MenuList webhook and retain its signing secret.
6. Store values using the `MENULIST_*` secret names from the implementation guide.
7. Deploy the scoped MenuList webhook and sending targets to QA.
8. Run controlled delivered, delayed, hard-bounce and suppression tests.
9. Enable the MenuList provider-send flag only after every test passes.

## Answerlattice Onboarding Inputs

Repeat the process with an independent Answerlattice team or account boundary, domain, API key, webhook secret, Firebase project and flags. Never reuse MenuList secret values.

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
