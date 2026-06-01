# Growth Engine - Internal Help Documentation

**Status:** Internal operator guide
**Audience:** Founder, growth manager, operator
**Customer-facing:** No

---

## Quick Summary

Growth Engine helps the internal team find qualified distribution targets, route owners into MenuList claim/onboarding, activate confirmed MenuList truth, publish owned distribution surfaces, and track freshness/attribution.

It is not a place to send random messages manually. Every outbound or discovery action must go through source policy, distribution readiness, suppression, guardrail, and tracking checks.

## Getting Started

### Before You Use It

You need:

- internal admin access
- an approved source
- approved source policy
- approved distribution target policy
- approved automation workflow
- approved enrichment waterfall
- approved AI worker/eval policy
- approved canonical surface contract
- approved structured data, sitemap, feed, and truth-packet contract
- approved country/channel policy
- ready sender domain if using email
- an approved campaign template
- an approved onboarding flow
- active global suppression ledger
- active unsubscribe endpoint for email
- active budget policy
- active suppression checks
- active sender assignment policy if using email
- no active kill switch for the channel

### Before Distribution

Confirm these items before any outreach or public distribution:

1. Source is approved for candidate discovery and the allowed fields are clear.
2. Distribution target identity is complete.
3. Enrichment waterfall evidence is present for identity, menu gap, contactability, and source confidence.
4. Decision snapshot explains the next action and blockers.
5. Jurisdiction is selected and channel policy allows the campaign.
6. Sender domain is ready for email, including DNS/authentication, unsubscribe, and bounce handling.
7. Sender assignment exists and preserves one sender per target conversation.
8. WhatsApp is assisted-only unless opt-in proof and approved templates are already reviewed.
9. Onboarding flow is from the approved inventory.
10. Canonical MenuList surface contract is ready.
11. Structured data, sitemap, feed export, and truth-packet checks are ready.
12. External listing handoff is owner-authorized before GBP, Apple Business Connect, or Bing Places work.
13. Private artifact, if used, has noindex, expiry, source-rights check, accuracy check, and takedown path.
14. Dry-run passes with costs, exclusions, samples, sender capacity, surface readiness, risks, and blockers reviewed.
15. Global/channel/campaign/surface/automation kill switches are available.

### Daily Order

1. Open **Today**.
2. Check safety alerts.
3. Check DNC/complaint queue.
4. Check interested replies.
5. Check human-review items.
6. Check workflow and AI eval failures.
7. Check sender-domain and sender-assignment alerts.
8. Check surface health alerts.
9. Check freshness alerts.
10. Check discovery publish failures.
11. Check external listing handoffs.
12. Check WhatsApp assisted queue if enabled.
13. Check campaign health.
14. Check cost status.

Safety comes before growth.

## How To Review A Source Run

1. Open **Sources**.
2. Confirm the source policy is approved and not paused.
3. Select the source run.
4. Review imported count and valid target count.
5. Check rejection reasons and blocked fields.
6. Open sample leads.
7. Confirm the source is not creating junk leads.
8. Approve for distribution use only if source quality and source policy are acceptable.

## How To Review Distribution Readiness

1. Open **Distribution Targets**.
2. Confirm the target maps to the right business/location/menu identity.
3. Open the latest decision snapshot.
4. Confirm evidence, rejected facts, blockers, and confidence are understandable.
5. Confirm claim state and truth state.
6. Confirm private artifact is noindex if the owner has not confirmed.
7. Confirm public surfaces are blocked until MenuList truth is confirmed.
8. Confirm canonical URL, structured data, sitemap state, feed state, and freshness state after confirmation.
9. Hold the target if any public surface would publish candidate-only facts.

## How To Review A Workflow Run

1. Open **Automation**.
2. Select the workflow run.
3. Confirm every step has an idempotency key and status.
4. Review skipped, blocked, retried, and failed steps.
5. Check budget and kill-switch checks.
6. Open the decision snapshot before approving any send, route, or publish action.
7. Retry only after the blocker is fixed.

## How To Review An AI Worker Output

1. Open **AI Worker Runs**.
2. Confirm worker name, prompt version, input hash, and output schema.
3. Confirm eval status is current and passing.
4. Review evidence and rejected facts.
5. If confidence is low or the output includes a blocked category, mark human review.
6. Never approve DNC, pricing, private-data, or unverified-truth uncertainty.

## How To Approve A New Source

1. Open **Source Policies**.
2. Add provider, source URL/terms, allowed fields, blocked fields, retention class, and approval owner.
3. Mark whether the source may be used for outreach, artifact facts, enrichment only, or verification only.
4. Set per-run and per-day spend caps.
5. Approve only after legal/source-rights review is complete.

Do not import from a source before policy approval.

## How To Check Discovery Publishing

1. Open **Discovery**.
2. Review sitemap inventory and lastmod accuracy.
3. Review changed URLs waiting for notification.
4. Confirm IndexNow jobs include only meaningful public URL changes.
5. Confirm menu feed exports are generated from confirmed MenuList truth only.
6. Confirm truth packets contain only public, confirmed data.
7. Retry failed jobs only after the blocker is fixed.

## How To Handle External Listing Handoffs

1. Open **External Listing Handoffs**.
2. Confirm owner authorization is attached.
3. Confirm the handoff target is Google Business Profile, Apple Business Connect, or Bing Places.
4. Confirm MenuList URL/action link comes from confirmed MenuList truth.
5. Send the approved owner instruction or mark authorized sync ready.
6. Do not fetch, cache, or reuse external listing data as MenuList truth.

## How To Check Sender Readiness

1. Open **Sender Domains**.
2. Confirm SPF, DKIM, and DMARC status.
3. Confirm unsubscribe endpoint status.
4. Confirm bounce webhook status.
5. Confirm sender assignment and one-sender-per-target policy.
6. Confirm target timezone send window and pacing.
7. Confirm daily cap and ramp status.
8. Check spam-rate warning and block thresholds.
9. Pause the email channel if any readiness item is failing.

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
7. After owner confirmation, watch distribution activation, canonical surface publishing, sitemap update, truth packet publish, and freshness state.

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
- distribution target state missing
- canonical surface contract missing
- discovery publisher not ready
- channel policy missing for jurisdiction
- sender domain not ready
- sender assignment missing or sender health blocked
- workflow run failed
- AI worker eval stale or failing
- dry-run failed
- missing caps
- missing stop rules
- missing approved template
- missing unsubscribe endpoint or bounce webhook
- channel is paused
- source has low quality
- suppression exclusion is too high
- cost estimate exceeds budget

### Distribution cannot publish

Most common reasons:

- target is candidate-only
- owner has not confirmed MenuList truth
- structured data check failed
- canonical URL missing
- page is noindex or blocked
- sitemap inventory is stale
- feed export has invalid section/item/price data
- GBP handoff lacks owner authorization
- Apple or Bing handoff lacks owner authorization
- truth packet includes private or unconfirmed data

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
- No workflow execution without idempotency, budget, and kill-switch checks.
- No AI autonomy without current eval pass.
- No target action without a decision snapshot.
- No sender change midway through a target conversation unless an incident owner approves it.
- No email before sender readiness is green.
- No private artifact without expiry and takedown path.
- No public distribution from candidate-only data.
- No sitemap, IndexNow, feed, or truth-packet output for private artifacts.
- No Google Business Profile work without owner authorization.
- No Apple Business Connect or Bing Places handoff without owner authorization.
- No Google Indexing API for MenuList menu or business pages.
