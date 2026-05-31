# Growth Engine - Internal Help Documentation

**Status:** Internal operator guide
**Audience:** Founder, growth manager, operator
**Customer-facing:** No

---

## Quick Summary

Growth Engine helps the internal team find qualified leads, run safe outreach, and route interested businesses into MenuList onboarding with tracking.

It is not a place to send random messages manually. Every outbound action must go through campaign, suppression, guardrail, and tracking checks.

## Getting Started

### Before You Use It

You need:

- internal admin access
- an approved source
- approved source policy
- approved country/channel policy
- ready sender domain if using email
- an approved campaign template
- an approved onboarding flow
- active global suppression ledger
- active unsubscribe endpoint for email
- active budget policy
- active suppression checks
- no active kill switch for the channel

### Before The First Campaign

Confirm these items before any outreach:

1. Source is approved for candidate discovery and the allowed fields are clear.
2. Jurisdiction is selected and channel policy allows the campaign.
3. Sender domain is ready for email, including DNS/authentication, unsubscribe, and bounce handling.
4. WhatsApp is assisted-only unless opt-in proof and approved templates are already reviewed.
5. Onboarding flow is from the approved inventory.
6. Private artifact, if used, has noindex, expiry, source-rights check, accuracy check, and takedown path.
7. Dry-run passes with costs, exclusions, samples, risks, and blockers reviewed.
8. Global/channel/campaign kill switches are available.

### Daily Order

1. Open **Today**.
2. Check safety alerts.
3. Check DNC/complaint queue.
4. Check interested replies.
5. Check human-review items.
6. Check WhatsApp assisted queue if enabled.
7. Check campaign health.
8. Check cost status.

Safety comes before growth.

## How To Review A Source Run

1. Open **Sources**.
2. Confirm the source policy is approved and not paused.
3. Select the source run.
4. Review imported count and valid count.
5. Check rejection reasons and blocked fields.
6. Open sample leads.
7. Confirm the source is not creating junk leads.
8. Approve for campaign use only if source quality and source policy are acceptable.

## How To Approve A New Source

1. Open **Source Policies**.
2. Add provider, source URL/terms, allowed fields, blocked fields, retention class, and approval owner.
3. Mark whether the source may be used for outreach, artifact facts, enrichment only, or verification only.
4. Set per-run and per-day spend caps.
5. Approve only after legal/source-rights review is complete.

Do not import from a source first and decide policy later.

## How To Check Sender Readiness

1. Open **Sender Domains**.
2. Confirm SPF, DKIM, and DMARC status.
3. Confirm unsubscribe endpoint status.
4. Confirm bounce webhook status.
5. Confirm daily cap and ramp status.
6. Check spam-rate warning and block thresholds.
7. Pause the email channel if any readiness item is failing.

## How To Launch A Campaign

1. Open **Campaigns**.
2. Create a draft.
3. Select audience, channel, offer angle, template, onboarding flow, caps, and stop rules.
4. Run dry-run.
5. Review exclusions, samples, costs, and risks.
6. Fix blockers.
7. Request approval.
8. Launch only after approval.

Never launch a campaign without a passing dry-run.

## How To Handle DNC Or Complaint

1. Open the DNC/complaint item.
2. Confirm the detected signal.
3. Apply suppression if not already applied.
4. Cancel pending actions.
5. Send only the approved DNC confirmation if policy allows.
6. Close the conversation.
7. Escalate if complaints spike.

Approved DNC confirmation:

```txt
Understood. We will not contact you again.
```

No pitch. No link. No follow-up.

## How To Handle Interested Replies

1. Open the interested inbox item.
2. Check lead context.
3. Confirm the recommended onboarding flow is in the approved inventory.
4. Send the tracked MenuList onboarding link through the eligible channel.
5. Mark the item routed.
6. Watch for onboarding feedback.

Do not paste raw MenuList onboarding URLs. Use tracked growth routes only.

## How To Use WhatsApp Assisted

1. Open **WhatsApp Assisted**.
2. Review lead context.
3. Review the prepared message.
4. Click **Open WhatsApp** or **Copy Message**.
5. Send manually only if the contact is eligible.
6. Return and mark **Sent** only after sending.

Opening WhatsApp does not count as sent.

## How To Handle Artifact Issues

1. Open the artifact review or complaint item.
2. Check source facts, noindex status, expiry, and approval notes.
3. If any fact is wrong or source rights are unclear, take the artifact down.
4. Cancel any pending campaign use of that artifact.
5. Log the reason and escalate if multiple artifacts fail from the same source or template.

## Troubleshooting

### Campaign cannot launch

Most common reasons:

- source policy missing or paused
- channel policy missing for jurisdiction
- sender domain not ready
- dry-run failed
- missing caps
- missing stop rules
- missing approved template
- missing unsubscribe endpoint or bounce webhook
- channel is paused
- source has low quality
- suppression exclusion is too high
- cost estimate exceeds budget

### Lead has wrong phone number

Mark the phone or WhatsApp identity as wrong contact. Do not suppress the whole business unless the reply also says not to contact again.

### AI draft looks risky

Do not edit around the guardrail. Mark human review or block the message. Add a template or policy fix after review.

### Costs look high

Pause non-critical jobs. Review source run size, lead intelligence runs, dashboard reads, and provider send volume.

## Rules To Remember

- No send without suppression check.
- No campaign without dry-run.
- No full contact reveal unless needed.
- No public demo websites.
- No Google Maps content rehosting.
- No invented facts.
- No WhatsApp bulk behavior.
- No manual lead messages outside the system.
- No source import before policy approval.
- No email before sender readiness is green.
- No private artifact without expiry and takedown path.
