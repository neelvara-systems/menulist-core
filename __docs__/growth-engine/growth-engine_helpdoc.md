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
- reviewed implementation readiness checklist before coding or configuring runtime
- an approved source
- approved source policy
- approved Google Places field-mask profile when using Places
- approved Foursquare field profile and outreach blocker when using Foursquare
- Business Truth Graph policy for node/edge confidence and truth state
- approved distribution target policy
- approved automation workflow
- approved enrichment waterfall
- approved AI worker/eval policy
- approved canonical surface contract
- approved structured data, sitemap, feed, and truth-packet contract
- approved country/channel policy
- configured Connections And Activation registry
- active adapter for any provider being used
- server-only secret references for provider credentials
- healthy webhook endpoints where the provider needs webhooks
- approved WhatsApp governance policy if WhatsApp is used
- ready sender domain if using email
- an approved campaign template
- an approved onboarding flow
- active global suppression ledger
- active unsubscribe endpoint for email
- active budget policy
- active suppression checks
- active sender assignment policy if using email
- active WhatsApp template, conversation-state, webhook, reputation, and governance checks if WhatsApp API is used
- no active kill switch for the channel

### Before Distribution

Confirm these items before any outreach or public distribution:

1. Source is approved for candidate discovery and the allowed fields are clear.
2. Required provider adapter is active in Connections And Activation.
3. Secret refs, webhooks, budgets, validation runs, and kill switches are attached.
4. Distribution target identity is complete.
5. Business Truth Graph nodes and edges have provenance, confidence, and truth state.
6. Candidate or low-confidence graph edges are blocked from public publishing.
7. Enrichment waterfall evidence is present for identity, menu gap, contactability, and source confidence.
8. Decision snapshot explains the next action and blockers.
9. Jurisdiction is selected and channel policy allows the campaign.
10. Sender domain is ready for email, including DNS/authentication, unsubscribe, and bounce handling.
11. Sender assignment exists and preserves one sender per target conversation.
12. WhatsApp is assisted-only unless opt-in proof, approved templates, conversation state, webhook verification, reputation monitor, sender identity, pacing policy, and governance audit are already reviewed.
13. Onboarding flow is from the approved inventory.
14. Canonical MenuList surface contract is ready.
15. Structured data, sitemap, feed export, and truth-packet checks are ready.
16. External listing handoff is owner-authorized before GBP, Apple Business Connect, or Bing Places work.
17. Private artifact, if used, has noindex, expiry, source-rights check, accuracy check, and takedown path.
18. Dry-run passes with costs, exclusions, samples, sender capacity, surface readiness, risks, and blockers reviewed.
19. Global/channel/campaign/surface/automation/provider kill switches are available.

### Daily Order

1. Open **Today**.
2. Check safety alerts.
3. Check connection validation and webhook failures.
4. Check DNC/complaint queue.
5. Check interested replies.
6. Check human-review items.
7. Check workflow and AI eval failures.
8. Check sender-domain and sender-assignment alerts.
9. Check surface health alerts.
10. Check freshness alerts.
11. Check discovery publish failures.
12. Check external listing handoffs.
13. Check WhatsApp assisted queue if enabled.
14. Check campaign health.
15. Check cost status.

Safety comes before growth.

## How To Run Implementation Readiness Review

1. Open [Implementation Readiness](./growth-engine_implementation-readiness.md).
2. Confirm product boundary and internal route inventory.
3. Confirm UI states and role matrix.
4. Confirm feature flags are default off.
5. Confirm non-secret environment keys and secret refs are defined.
6. Confirm Firestore rules and index expectations.
7. Confirm seed config exists for policies, providers, connections, budgets, kill switches, onboarding inventory, and evals.
8. Confirm each end-to-end use case has a matching doc, data contract, API guard, UI guard, and test.
9. Stop if a provider, route, worker, or screen is not covered.

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

## How To Configure A Provider Adapter

1. Open **Connections And Activation**.
2. Select **Add adapter**.
3. Enter a stable adapter ID such as `ge_email_ses_primary` or `ge_whatsapp_menulist_primary`.
4. Choose adapter type, provider, environment, owner role, and allowed pipeline use.
5. Attach source policy, channel policy, or provider register record where applicable.
6. Attach budget policy and kill-switch scope.
7. Add server-only secret refs through the credential submit flow.
8. Add webhook endpoint records where the provider needs events.
9. Run validation.
10. Request activation review only after validation passes.

Do not use provider dashboard IDs as Growth Engine adapter IDs. Adapter IDs should be stable internal handles.

## How To Activate The Email Pipeline

1. Open **Connections And Activation**.
2. Open **Email Pipeline**.
3. Confirm adapter ID, sender domain, from address, reply-to address, return-path domain, and provider account reference.
4. Confirm API key or SMTP credential is stored as a secret ref.
5. Confirm SPF, DKIM, DMARC, PTR, and TLS checks.
6. Confirm one-click unsubscribe endpoint and visible unsubscribe policy.
7. Confirm bounce and complaint webhooks.
8. Confirm daily send cap, ramp policy, spam-rate warning, and spam-rate block.
9. Send an internal test message only after suppression and policy checks pass.
10. Request activation review.

Email is not active just because the API key works.

## How To Activate The WhatsApp Pipeline

1. Open **Connections And Activation**.
2. Open **WhatsApp Pipeline**.
3. Confirm adapter ID, WABA ID, phone-number ID, display phone, and business display name.
4. Confirm access-token, app-secret, and webhook verify-token refs.
5. Confirm webhook callback URL and signature health.
6. Confirm opt-in policy and suppression ledger.
7. Confirm approved templates for the intended use cases.
8. Confirm conversation-state support.
9. Confirm sender identity, quality state, pacing, and daily cap.
10. Confirm approved Flow definitions if Flows are used.
11. Run validation and request activation review.

Phone number availability is not WhatsApp opt-in.

## How To Review Webhook Health

1. Open **Connections And Activation**.
2. Open **Webhooks**.
3. Confirm endpoint ID, adapter ID, provider, expected events, and signing-secret ref.
4. Confirm latest accepted event and latest rejected event.
5. Confirm signature status is valid.
6. Review dead-letter count and replay availability.
7. Keep the connection paused if signatures fail, event shape is invalid, or raw payload retention is missing.

## How To Rotate Provider Credentials

1. Open **Connections And Activation**.
2. Select the adapter.
3. Choose **Rotate secret**.
4. Submit the new credential through the secure credential flow.
5. Run validation.
6. Keep the old secret ref audit-visible but retired.
7. Resume only after validation passes and provider workers use the new secret version.

Never paste credentials into notes, work items, AI prompts, or support tickets.

## How To Review A Google Places Run

1. Open **Sources**.
2. Select the Google Places source run.
3. Confirm the source policy is approved for candidate discovery.
4. Confirm the field mask profile is approved.
5. Confirm the run starts with IDs-only Text Search unless a higher-cost profile is approved.
6. Confirm the query, category/type, city, result cap, and budget cap.
7. Confirm only place IDs, request metadata, field mask, and decision state are durable.
8. Block the run if it requests photos, reviews, profile summaries, menus, wildcard field masks, or public artifact use.

## How To Review A Foursquare Run

1. Open **Sources**.
2. Select the Foursquare source run.
3. Confirm the source policy is approved for identity/category/chain enrichment.
4. Confirm PAYG outreach eligibility is blocked unless separate contract or written permission is attached.
5. Confirm the field profile is Pro Identity unless Premium Signal approval is attached.
6. Confirm place IDs, category IDs, chain IDs, source metadata, response hashes, and candidate graph edges are the only durable outputs by default.
7. Block the run if it requests photos, tips, ratings, descriptions, popularity, menu, profile content, or public artifact use.

## How To Review The Business Truth Graph

1. Open **Business Truth Graph** from a distribution target.
2. Confirm business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution nodes have clear source references.
3. Confirm each edge has confidence and truth state.
4. Hold low-confidence identity, menu, claim, or surface edges for human review.
5. Confirm candidate edges are internal only.
6. Approve public publishing only when the public fact comes from owner-confirmed or approved MenuList-verified truth.

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

## How To Review WhatsApp Governance

1. Open **WhatsApp Governance**.
2. Confirm the contact has explicit WhatsApp opt-in for the message category.
3. Confirm phone number came from claim page, owner inbound, click-to-WhatsApp, approved form, or another approved first-party consent path.
4. Confirm the source did not come only from public phone availability, Google Places, Foursquare, scraping, or enrichment.
5. Confirm suppression is clear.
6. Confirm the conversation state allows a service reply or requires an approved template.
7. Confirm the template is approved, correct category, correct use case, not paused, not disabled, and not low quality.
8. Confirm sender identity belongs to MenuList for MenuList claim, verification, support, or truth-maintenance messages.
9. Confirm webhook signature verification is healthy.
10. Confirm reputation and pacing checks pass.
11. Confirm a governance audit exists before send.

## How To Review WhatsApp Templates

1. Open **WhatsApp Templates**.
2. Check template status, category, language, variables, version, owner, quality, and approved use case.
3. Block pending, rejected, paused, disabled, wrong-category, or low-quality templates from unattended sends.
4. Confirm utility templates are not hiding marketing content.
5. Confirm each template asks for a useful owner action tied to MenuList truth.

## How To Review WhatsApp Flows

1. Open **WhatsApp Flows**.
2. Confirm the Flow is approved for owner claim, verification, public-info correction, stale-data confirmation, or support handoff.
3. Confirm allowed fields are business-truth fields only.
4. Confirm no hidden marketing consent or unnecessary personal data is collected.
5. Confirm Flow submissions validate against the output schema.
6. Confirm Flow output updates candidate graph state for review before public truth changes.
7. Confirm daily cap and ramp status.
8. Check WhatsApp sender, template, and Flow health.
9. Pause the WhatsApp pipeline if any readiness item is failing.

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
- provider adapter inactive
- provider secret ref missing or validation failed
- webhook endpoint unhealthy
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
- No provider execution without active connection.
- No plaintext provider credentials in Firestore, browser state, logs, AI prompts, or notes.
- No campaign without dry-run.
- No full contact reveal unless needed.
- No public demo websites.
- No Google Maps content rehosting.
- No invented facts.
- No WhatsApp bulk behavior.
- No WhatsApp API send from scraped, enriched, public, Google Places, or Foursquare phone numbers without explicit opt-in.
- No WhatsApp API send without governance audit.
- No WhatsApp template send outside category/use-case approval.
- No WhatsApp generic AI assistant.
- No WhatsApp Flow with hidden consent or unapproved fields.
- No manual lead messages outside the system.
- No source import before policy approval.
- No Google Places run without approved field-mask profile and budget cap.
- No Google Places wildcard field mask in production.
- No durable Google Places content as MenuList truth.
- No Foursquare PAYG outreach use without separate contract or written permission.
- No Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content in artifacts, public pages, sitemaps, feeds, truth packets, or MenuList truth.
- No Business Truth Graph candidate or low-confidence edge in public publishing.
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
