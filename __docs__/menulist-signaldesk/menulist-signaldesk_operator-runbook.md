# MenuList SignalDesk - Founder Start And Owner Control Runbook

**Status:** Active internal runbook; local controlled use is ready, while hosted QA and real outreach remain gated
**Created:** June 23, 2026
**Last Updated:** August 11, 2026
**Audience:** Founder, growth manager, operator, and reviewer

## Purpose

Use this as the single starting workflow when beginning to operate SignalDesk. It covers first access, one-time safety setup, the first permissioned MenuList activation, daily work, weekly decisions, and recovery.

SignalDesk is MenuList's private growth control room. It prepares and records work; it does not create contact permission, change MenuList public truth, publish on an owner's behalf, or authorize spend.

The founder posture is:

```txt
observe -> monitor -> approve -> pause or redirect
```

For the current Bengaluru trial's exact row data, scripts, experiment values, and stop thresholds, use the [Bengaluru Activation Trial Operating Pack](./menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md). That pack remains the trial authority when this general workflow and the pack differ.

## Non-Negotiable Boundary

Public business research and permissioned contact are different authorities.

```txt
public source observed
  -> evidence-only candidate
  -> hold / no contact route
  -> explicit founder introduction, owner request, referral, or approved partner handoff
  -> permission basis recorded
  -> permissioned manual introduction
  -> owner conversation and private preview
```

Never turn a website, public phone number, public Instagram account, Google/Places result, or evidence packet into contact permission.

## Current Clearance

Check the [implementation validation](./menulist-signaldesk_validation.md) before each new operating phase. As of August 11, 2026:

| Mode | Current state | What you may do |
| --- | --- | --- |
| Local desktop controlled trial | Ready after sign-in as the platform founder-admin or one exact active SignalDesk member | Test the internal workflow, seed defaults, enter held evidence, review approvals, and verify outcomes without external action. |
| Mobile | Today overview and emergency pause only after sign-in | Read the dashboard/Today overview and activate the confirmed global-outbound emergency pause. Other workspace sections and mutations remain blocked. |
| Hosted QA | Blocked pending the dedicated SignalDesk Firebase access/deploy gate and authenticated smoke proof | Do not treat the staging host as operating clearance until the gate passes. |
| Permissioned zero-spend field trial | Internally prepared, but each external contact remains separately gated | Start only after hosted QA is cleared and the founder has one explicit permissioned introduction. |
| Email/provider send, social automation, paid media, or partner spend | Held | Do not enable, send, publish, or spend from this runbook. |

This document records workflow; it is not approval for contact, provider activation, publication, deployment, or spend.

## Before First Login

Have these items ready:

- [ ] Dedicated QA access is cleared and the scoped SignalDesk Firebase rules/index deployment has passed, if using hosted QA.
- [ ] Your current MenuList user is active. Platform authority resolves to founder-admin; every other user needs one exact active SignalDesk team-member binding.
- [ ] You are on desktop for setup or mutations. Mobile is not an operating console.
- [ ] The zero-spend Bengaluru pod remains the only active first trial.
- [ ] Provider send, paid acquisition, Google Places, Apify execution, cold WhatsApp, and social publishing remain disabled.
- [ ] The current evidence rows have been rechecked against their first-party sources before runtime entry. The 12 maintained packets were rechecked on August 10, 2026 and require another recheck after their 30-day window, rather than a date-only extension.
- [ ] You have one explicit permissioned introduction before planning any real owner contact.
- [ ] If email is later admitted, sender identity, authenticated domain, physical address, unsubscribe path, and separate founder approval are complete. None of these are required for the current founder-led in-person path.

Use `http://localhost:3000/signaldesk` for the local controlled workflow. After the hosted QA gate passes, use `https://signaldesk.menulist.online` and confirm sign-in remains under `/signaldesk/signin` and writes resolve only to `menulist-signaldesk-qa`.

## First Login Safety Check

Perform this on desktop before entering trial work.

1. Sign in and open **Today** at `/signaldesk`.
2. Confirm you can see only internal SignalDesk data and the expected founder/team role.
3. Open **Controls**, then review the Control Room:
   - no unresolved critical incident is being ignored;
   - provider send is still disabled;
   - no source, channel, AI, export, content, or partner pause is cleared merely to make the dashboard look ready;
   - spend remains zero for the first trial.
4. Open **Policies** at `/signaldesk/policies` and run **Seed Defaults** once. Do not reseed as a reset mechanism.
5. Confirm both policies exist separately:
   - **Public business research:** evidence-only, contact disabled, personalization disabled, 30-day retention.
   - **Permissioned manual introduction:** contact-enabled only for an expected introduction or referral, with the permission basis recorded.
6. Still in **Policies**, approve only **Zero-Spend Trust Test** and verify its per-run, daily, and monthly values are all zero. Leave Places, Apify, paid enrichment, and other provider budgets disabled.
7. Open **Activations** at `/signaldesk/activations`, find **Bengaluru first proof pod**, and approve it only with the maintained zero-external-spend reason. Do not approve a replacement pod during the first run.
8. In the operating layer, confirm the manual experiment uses the exact hypothesis, target count of 25, outcome, and stop rule from the Bengaluru operating pack.
9. Open **Settings** only to inspect connector metadata and readiness. Raw secrets remain in `SIGNALDESK_*` environment or secret storage, and connector readiness never enables sending.
10. Open **Targets** at `/signaldesk/targets` and use **Manual Import** to enter only rechecked candidate evidence under **Public business research**:
   - no email, phone, Instagram handle, or inferred contact person;
   - held/no-route state;
   - source URL and review date present;
   - no more than five newly reviewed candidates in a day;
   - no more than 25 candidates in the approved pod.
11. End the session by recording what changed, what remains held, and the next explicit gate.

If any safety check fails, stop. Do not work around access, policy, permission, pause, sender, budget, or source-expiry guards.

## First Working Session: Internal Preparation Only

The first session is successful when SignalDesk contains a safe, reviewable trial without contacting anyone.

Use this order:

1. **Today:** confirm there are no critical controls or stale exceptions.
2. **Policies:** seed and verify the source-policy split.
3. **Activations:** approve only the maintained zero-spend Bengaluru pod.
4. **Opportunities / Mission:** confirm one manual experiment card and no more than five focused actions.
5. **Targets:** enter rechecked evidence-only candidates as held with no contact route. Use **Imports** only to inspect source-run history.
6. **Evidence review:** keep claims source-backed and mark uncertain observations as uncertain; a current-list observation is not proof of owner pain.
7. **Controls:** confirm no provider, channel, export, publication, or spend authority was widened.
8. **Audit:** confirm governed mutations have durable audit evidence.

Do not judge the session by lead count. Judge it by whether the source, permission, policy, and next-action boundaries are unambiguous.

## First Permissioned Business Workflow

Run this only after hosted QA clearance and a real permissioned introduction.

### 1. Record Permission Before Contact

Acceptable bases are:

- founder makes an expected manual introduction;
- owner asks for follow-up;
- a known referrer introduces the owner;
- an approved partner makes an expected handoff.

Record the permission basis and expected contact path, then move the business from **Public business research** to **Permissioned manual introduction**. If the basis is missing or unclear, leave the row held.

### 2. Have One Owner Conversation

Offer only the approved no-cost current-list consistency audit and private MenuList preview. Do not claim that customers are leaving, promise ranking or sales, or ask the owner to replace paper, POS, ordering, or staff service.

Capture:

- the owner's actual words for the problem;
- what current menu/list source the owner wants used;
- whether a private preview is wanted;
- any objection or refusal;
- the next agreed action.

### 3. Prepare The Private Preview In MenuList

SignalDesk does not create or publish MenuList truth. Use the owner-confirmed source and hand the owner into MenuList through the maintained founder-pilot route:

```txt
/create-menu?utm_source=founder_pilot&utm_medium=manual_handoff&utm_campaign=bengaluru_pilot_2026
```

In the MenuList workflow:

1. receive or confirm the owner's current menu/list;
2. prepare a private/noindex preview;
3. review business identity, sections, items, prices, availability, contact details, and customer actions;
4. record owner approval before publishing.

### 4. Activate Two Useful Surfaces

The preferred primary surface is an owner-authorized Google/Profile menu link. Add one owner-selected surface:

- business website;
- Instagram bio;
- expected staff WhatsApp reply/profile;
- existing QR/table card;
- counter card or print handout.

SignalDesk records the owner-confirmed outcome. The owner or the appropriate product/platform workflow makes the actual change.

### 5. Record The Outcome

In **Activations**, record the actual reached stage and evidence reference:

- `route_created`;
- `upload_started`;
- `preview_prepared`;
- `published`;
- `two_surface_activation`.

Record distinct activation surfaces, owner-qualified time, and owner-review time where available. Do not mark a business activated from a sent link, a verbal intention, or one surface.

### 6. Request Proof Permission Separately

Only after durable two-surface activation:

1. confirm the public link still works;
2. ask separately whether the owner permits a proof asset;
3. record the permitted item, surface, expiry, and use boundary;
4. keep content and partner distribution draft-only without current permission.

Proof permission is not contact permission, and activation is not permission to publish a testimonial.

## Daily Workflow

### 1. Today

Open `/signaldesk` first. Work the activation-first queue before starting discovery. The queue contains at most five focused actions.

For each action:

- complete the real action and wait for durable success before moving on;
- use **Next** only to rotate focus, not to claim completion;
- open **Journey** to inspect the opportunity-to-proof stages;
- copy a setup link only for an explicitly reviewed manual handoff;
- use the existing review surface when authority is missing.

Use **Add targets** only when the queue is empty and the current weekly decision explicitly calls for more discovery.

### 2. Seven-Day Outcomes

Review routed targets, uploads, previews, published links, two-surface activations, interested targets, and stalled targets. A stall begins only after the durable activation deadline passes; source-policy expiry is a separate evidence problem.

Optimize for real MenuList outcomes, not imported rows, sent count, impressions, or replies alone.

### 3. Conversations

Humans handle interested replies, unclear intent, policy questions, complaints, wrong-contact cases, pricing objections, and source-origin questions. Suppress DNC, unsubscribe, wrong-contact, and complaint cases immediately.

### 4. Activations

Recover the next missing stage. A published menu with no useful surface is not activated; one surface still needs a second surface; two surfaces without evidence or current permission are not proof-ready.

### 5. Controls

Review kill switches, sender/channel health, suppression or complaint signals, AI-evaluation failures, cost, incidents, and stale queues. Pause the affected scope before normal work when a critical alert exists.

### 6. Approvals And Advanced Controls

Approve only the gate in front of you: policy, pod, cohort, evidence, draft, channel readiness, budget, proof, or partner step. Do not bundle approvals or use one approval as authority for another rail.

Before any contact-capable action, confirm:

- permission and source use are explicit;
- claims are source-backed;
- suppression is clear;
- channel and sender are eligible;
- the stop/unsubscribe path exists where required;
- the budget and provider-send gates still match the approved envelope.

## Weekly Workflow

Review:

1. source quality and expired evidence;
2. owner language and top objections;
3. preview acceptance and two-surface activation;
4. stalled activation recovery;
5. founder attention minutes per activated business;
6. complaints, suppressions, and policy issues;
7. partner attribution, if a permissioned partner test ran;
8. spend, which must remain zero for the first trial.

Choose exactly one weekly decision:

- continue the current pod;
- narrow the category or neighborhood;
- change the evidence source;
- change the introduction wording;
- improve the private-preview route;
- recover stalled second-surface activation;
- pause the partner test;
- stop the experiment.

Do not add a provider, channel, campaign, or automation merely because candidate volume is low.

## Recovery And Stop Matrix

| Situation | Required action |
| --- | --- |
| Sign-in, member, project, or QA identity is wrong | Stop. Correct access/project identity and rerun the first-login check. |
| Evidence is older than its policy window | Recheck the original source and update or close the evidence. Never roll the date forward without a real recheck. |
| Public evidence exists but contact permission does not | Keep the candidate held/no route. |
| Owner is interested but has not supplied or confirmed the current list | Request the owner-controlled source; do not build from public fragments. |
| Published, but no surface is active | Recover the owner-managed Google/Profile menu placement where available, then add one useful surface. |
| Only one surface is active | Keep the activation open and recover the second owner-selected surface. |
| Permission, identity, source rights, or platform rights are unclear | Hold the item and escalate to founder/admin. |
| Complaint, DNC, unsubscribe, wrong-contact, or legal threat arrives | Suppress immediately, pause the relevant scope, preserve the audit trail, and escalate. |
| AI output invents or overstates evidence | Reject/hold the output, pause the affected AI task if repeated, and use source-backed evidence only. |
| A platform/provider warning appears | Pause the affected channel/provider and do not retry until reviewed. |
| Any action requires spend, automated send, or unauthorized account access | Stop and request a separate founder decision. |
| Five owner conversations produce no accepted preview, or fewer than two of the first five accepted previews reach two surfaces | Stop the experiment under the current trial rule and make one weekly decision. |
| Founder attention repeatedly exceeds 120 minutes per activated business | Pause scaling and fix the workflow friction first. |

## Target State Reference

| State | Meaning | Allowed action |
| --- | --- | --- |
| `new` | Entered but not reviewed | Review and dedupe. |
| `review` | Needs human review | Validate evidence, then hold or reject. |
| `ready` | Evidence and an eligible action path exist | Prepare the next governed action. |
| `drafted` | A draft exists | Edit, approve, hold, or reject. |
| `approved` | The specific action is approved | Execute only after its final checks. |
| `contacted` | A permitted manual/provider action occurred | Wait, classify reply, or follow up only when eligible. |
| `replied` | A reply exists | Classify, route, or suppress. |
| `converted` | A qualifying MenuList outcome exists | Attribute and learn. |
| `held` | Evidence, permission, policy, or readiness is missing | No contact/send/export. |
| `rejected` | Not fit or not allowed | No contact/send/export. |
| `suppressed` | DNC, unsubscribe, complaint, wrong contact, or equivalent | No contact/send/export. |

## End-Of-Session Record

Record this short handoff after every working session:

```txt
Date:
Mode: local dry run / hosted QA / permissioned field work
Pod:
Rows reviewed:
Permissioned introductions:
Owner conversations:
Private previews:
Published links:
Two-surface activations:
Proof permissions:
Pauses or incidents:
Spend:
Next explicit gate:
Weekly decision, if due:
```

If a number has no durable runtime or owner-confirmed evidence, leave it at zero or mark it pending.

## Route Map

| Job | Route |
| --- | --- |
| Start and focused daily actions | `/signaldesk` |
| Opportunity/mission detail | `/signaldesk/opportunities` or `/signaldesk/mission` |
| Conversations | `/signaldesk/conversations` |
| Activation journey | `/signaldesk/activations` |
| Safety controls | `/signaldesk/controls` and `/signaldesk/control-room` |
| Evidence-only manual target entry | `/signaldesk/targets` |
| Source-run history | `/signaldesk/imports` |
| Policies | `/signaldesk/policies` |
| Approval queue | `/signaldesk/approvals` |
| Outcomes and market-pod review | `/signaldesk/activations` |
| Revenue envelope and opportunities | `/signaldesk/revenue` |
| Connector metadata | `/signaldesk/settings` |
| Audit evidence | `/signaldesk/audit` |

## Copy Rules

Use:

- "current menu" or "current service list";
- "official customer link";
- "review before publishing";
- "one link for QR, WhatsApp, Google, and repeat customers."

Avoid:

- "AI-powered";
- "automatic Google update";
- "official WhatsApp partner";
- "we found customers are leaving";
- "guaranteed sales" or "guaranteed ranking";
- "I scraped your business";
- "we already built your site."

## Do Not Do

- Do not create public SignalDesk pages.
- Do not reveal raw provider/source data in owner messages.
- Do not contact a business from public evidence alone.
- Do not contact suppressed identities.
- Do not use cold WhatsApp or automate Instagram/Messenger cold messages.
- Do not treat AI, a source score, or a market-pod recommendation as approval.
- Do not change MenuList, Google, Instagram, WhatsApp, or owner account truth from SignalDesk.
- Do not enable providers, paid media, social publishing, or spend from this workflow.

## Maintained References

- [Documentation Hub](./README.md)
- [Implementation Validation](./menulist-signaldesk_validation.md)
- [Bengaluru Activation Trial Operating Pack](./menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md)
- [Owner Control Model](./menulist-signaldesk_owner-control-model.md)
- [Foundation Access And Roles](./signaldesk-foundation/signaldesk-foundation_spec.md)
- [Operating Layer](./signaldesk-operating-layer/README.md)
- [Connector Settings](./menulist-signaldesk_connector-settings.md)
- [MenuList Activation Concierge](../menulist-activation-concierge/README.md)
- [Owner Action Items](../owner-action-items.md)
