# MenuList SignalDesk - Multi-AI Review

**Date:** July 11, 2026  
**Status:** External feedback reviewed against current code, maintained docs, and primary policy sources  
**Scope:** SignalDesk only  
**Decision:** Keep the current product shape, make no broad runtime changes, and finish the controlled Bengaluru trial before expanding automation.

## Executive Verdict

The three AI responses are directionally useful but materially stale against the current repository.

Their shared core conclusion is correct: SignalDesk should remain a private, evidence-led, human-controlled activation system for MenuList. It should help the founder find and verify opportunities, prepare one safe action, route an interested owner into MenuList, and measure two-surface activation. It must not become a public SaaS product, generic CRM, lead blaster, or autonomous sender.

Their main implementation diagnosis is not current. SignalDesk already has:

- a five-item primary navigation;
- a Today queue capped at five decisions while retaining a larger research inventory;
- source-rights and expiry enforcement;
- cross-source suppression and automatic DNC handling;
- typed `pass` / `fail` / `unsure` research outcomes;
- activation-opportunity and seven-day watch state;
- reply classification and activation outcomes;
- a signed, idempotent outcome-bridge receiver;
- mobile observe-only enforcement and emergency pause;
- gated content, partner, provider, and revenue controls outside the primary daily workflow.

The current product is not missing another control-room redesign. It is missing operational proof. No business has yet been contacted through the maintained Bengaluru trial, and the real cloud/outreach prerequisites remain external blockers.

Across the grouped recommendations, approximately one third are fully current, one third are useful but already implemented or need narrowing, and one third are stale, unsafe, unsupported, or conflict with approved SignalDesk policy. The useful advice is mostly an operating constraint, not a request for new subsystems.

## Current Ground Truth

| Area | Repository truth | Evidence |
| --- | --- | --- |
| Product boundary | SignalDesk is private and is explicitly not public SaaS, a CRM clone, SDR bot, owner feature, customer feature, or public website surface. | `__docs__/menulist-signaldesk/menulist-signaldesk_spec.md:7-25`, `:27-48` |
| North Star | Activated businesses with a current list on at least two customer surfaces within seven days. | `__docs__/menulist-signaldesk/menulist-signaldesk_spec.md:60-76` |
| Founder workload | The primary navigation is Today, Opportunities, Conversations, Activations, and Controls. Today shows at most five decisions from the wider inventory. | `src/components/signaldesk/SignalDeskWorkspace.tsx:351-357`, `:728-740` |
| Source governance | A policy must be active, complete, within retention, unexpired, unblocked, and authorized for the requested use. | `src/lib/signaldesk/workflowServer.ts:895-967` |
| Suppression | Target suppression is modeled, export/action paths block suppressed targets, and DNC/wrong-contact replies create hashed suppression records. | `src/types/signaldesk/index.ts:257-270`, `src/lib/signaldesk/workflowServer.ts:7838`, `:7891-7895`, `:8181-8232` |
| Approval | Unsupported claims block approval, and source policy is rechecked at approval time. | `src/lib/signaldesk/workflowServer.ts:7740-7767` |
| Activation | The opportunity state machine and outcome types include owner-qualified timing, preview/upload/publish events, and two-surface activation. | `src/types/signaldesk/index.ts:1274-1334` |
| Outcome bridge | The receiver validates HMAC, a five-minute timestamp window, a hashed expiring route token, and event idempotency before recording a SignalDesk outcome. | `src/lib/signaldesk/outcomeBridgeServer.ts:55-114` |
| Provider send | Provider send is still disabled and does not become ready merely because credentials exist. | `__docs__/menulist-signaldesk/menulist-signaldesk_validation.md:8-12`, `src/components/signaldesk/SignalDeskWorkspace.tsx:2282-2287` |
| Trial status | The approved pod is Indiranagar and Koramangala, Bengaluru; candidate inventory is 25, newly reviewed work is capped at five per day, and the first five evidence-only reviews are complete. | `__docs__/menulist-signaldesk/menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md:8-25`, `:125-137` |
| Trial clearance | Local desktop and mobile observe/emergency-pause trials are cleared; real outreach and cloud production are not. | `__docs__/menulist-signaldesk/menulist-signaldesk_validation.md:8-12` |

## Decision Matrix

| AI recommendation | Verdict | Repository assessment | Decision |
| --- | --- | --- | --- |
| Keep SignalDesk private and product-isolated | Agree | This is already the governing product contract. | Preserve. |
| Make prompt-to-table research the core operating surface | Agree | Opportunities and bounded Market Search already implement this shape. | Preserve and trial. |
| Use evidence, provenance, dedupe, and human approval | Agree | Already implemented and verified. | Preserve as hard gates. |
| Show 20-30 leads as the daily founder workload | Disagree | The current design correctly keeps 25 as trial inventory and shows only five decisions. | Keep current inventory-versus-decision split. |
| Reduce the daily table to 8-15 | Partial | Reducing candidate inventory would reduce research coverage; reducing decisions is already solved. | Keep 20-30 bounded inventory and 3-5 daily decisions. |
| Remove numeric fit score | Partial | A score is useful for sorting and internal learning, but must never be action authority. Separate evidence, reachability, and activation-feasibility dimensions already exist. | Keep advisory score; visually prioritize rationale and hard gates. Do not recalibrate before outcomes exist. |
| Drop `unsure` and force pass/fail | Disagree | `unsure` is a necessary abstention state for incomplete evidence. Removing it would convert uncertainty into false precision. | Keep `unsure`; hold or expire unresolved rows rather than actioning them. |
| Collapse route, CTA, and angle into one paragraph | Partial | The founder should see one concise action packet, but separate typed fields are required for policy, audit, and cohort learning. | Compress presentation, retain structured data. No schema removal. |
| Build a manual outreach log | Validate, narrow gap | The action API records approval, export, handoff, replies, and outcomes, but has no explicit action for a founder contact attempt that received no reply. | Candidate P0 patch before first real contact: one bounded `record-manual-contact` action and timeline projection, not a CRM. |
| Add rejection reasons | Partial gap | Rejection stores free text, but the current UI sends only `Rejected from control room.` | Candidate P1 patch: small reason enum plus optional note. Do not invent a large taxonomy before trial evidence. |
| Build an activation tracker/checklist | Disagree | Activation opportunities, activation watches, owner-qualified timestamps, outcome events, surfaces, and seven-day stalls already exist. | Use existing Activations view. Do not create a second tracker. |
| Build global suppression | Disagree | Cross-source hashed suppression and automatic DNC handling already exist. | Preserve current implementation. |
| Make suppression additions manual forever | Disagree | Explicit stop/DNC must suppress immediately; waiting for manual approval creates repeat-contact risk. | Keep automatic additions and manual/compliance-controlled removal. |
| Add source expiry | Disagree as missing | Source expiry and review-required behavior are already enforced across relevant actions. | Preserve. |
| Use a universal 90-day expiry | Disagree | Evidence freshness, contact rights, provider retention, and source terms are different policy dimensions. Current source-specific expiry is safer. | Do not replace with one global duration. |
| Build reply classification | Disagree as missing | Reply capture and classification already exist. | Use existing Conversations view during the trial. |
| Build an outcome bridge | Partial | SignalDesk has the signed idempotent receiver and route-token contract. The MenuList-owned production emitter and cloud secret provisioning are not proven. | Treat production bridge activation as an external integration blocker, not a new SignalDesk subsystem. |
| Call route tokens encrypted metadata | Disagree | The implementation uses opaque random tokens, stores only a hash, and authenticates outcome events with HMAC. It does not claim payload encryption. | Keep documentation technically precise. |
| Collapse five dashboards into one | Mostly already done | Primary navigation is already five focused surfaces; advanced controls are secondary. | Do not delete implemented safety rails. Keep them out of the normal daily trial. |
| Delete content and partner rails | Disagree | They are already implemented, gated, private, and not part of the primary trial path. Deleting them adds regression risk. | Leave disabled or unused until permissioned proof/direct-motion evidence justifies operation. |
| Start partner operations in Week 2 | Disagree for current trial | The current trial allows only a zero-fee, permissioned introduction and has no owner-approved proof yet. | Do not expand partner operations. |
| Start content after five activations | Directionally agree | Content already requires proof permission and remains manual. | Operate only after permissioned proof exists; no code expansion. |
| Create and warm a new outreach domain now | Reject | Sender identity, physical-address policy, permissioned contacts, and real-outreach approval are unresolved. | No domain purchase, warming, or sending in this pass. |
| Raise email volume to 15-50 per inbox/day | Reject | These numbers are not derived from SignalDesk outcomes or an approved sender policy. | Keep provider send disabled and manual first touch bounded by the trial. |
| Manually cold-message approved leads on WhatsApp | Reject | Manual operation does not bypass WhatsApp opt-in requirements or SignalDesk contact policy. | WhatsApp remains inbound/opt-in/permissioned only. |
| Switch the trial to Hadapsar, Pune | Reject as an implicit change | The approved current run is Bengaluru. Geography is a founder experiment variable, not an AI default. | Finish or explicitly stop Bengaluru before changing pod. |
| Build geographic route clustering now | Defer | It may help only after permissioned field visits or partner volume becomes a measured bottleneck. | Do not build before the direct activation loop has proof. |
| Keep every outbound action human-approved forever | Partial | First touch, risky outreach, proof use, source-policy changes, and partner decisions should remain human-owned. Opted-in transactional owner communication belongs in MenuList and may later be governed separately. | Keep SignalDesk first-touch approval; avoid an absolute rule that blocks legitimate opted-in lifecycle messaging elsewhere. |
| Use provider sends after 20 cycles or 30-40 messages/week | Reject as automatic threshold | Volume alone does not establish lawful contact, sender readiness, complaint handling, or a real bottleneck. | Provider send requires a separate owner, legal, sender, and operational review regardless of volume. |

## Real Gaps Worth Considering

### 1. Manual Contact Attempt Record

This is the only clear workflow gap surfaced by the reviews.

The current protected action list includes approval, export, reply capture, outcome recording, and channel handoff, but no action that says a founder actually called, visited, used a permitted business form, or sent a manually approved message and received no immediate reply (`src/app/api/signaldesk/actions/route.ts:93-113`). Without that event, SignalDesk cannot reliably distinguish:

- approved but never acted;
- prepared handoff but not completed;
- contacted and awaiting reply;
- contacted with a non-reply outcome;
- contacted through a permissioned in-person or partner route.

A minimal implementation should add one product-local, audited action with:

- `targetId`;
- allowed route;
- `occurredAt`;
- result: `contacted`, `no-answer`, `wrong-contact`, `requested-later`, `declined`, or `introduced`;
- optional bounded note;
- source/contact-policy snapshot ID;
- no automatic follow-up and no external side effect.

It should update the existing target/opportunity projection and run timeline. It should not add deals, tasks, owners, forecasts, sequences, or generic CRM fields.

### 2. Structured Rejection Reason

The server already stores `reviewReason`, but the approval UI currently submits only a generic fixed value (`src/components/signaldesk/SignalDeskWorkspace.tsx:1310-1315`, `:2713-2729`; `src/lib/signaldesk/workflowServer.ts:7770-7778`). A short reason vocabulary would make the first trial more learnable:

- evidence weak or stale;
- identity uncertain;
- no customer-truth gap;
- contact route not allowed;
- already solved;
- wrong segment;
- duplicate;
- other, with note.

This should remain small and revisable from real trial evidence. It is not a reason to build a campaign or CRM taxonomy.

## Advice That Is Operationally Valid But Needs No Code

1. Treat 20-30 rows as bounded candidate inventory, never as a daily contact target.
2. Process safety exceptions, replies, and stalled activations before new research.
3. Keep provider send, social auto-action, cold WhatsApp, and paid-provider discovery disabled.
4. Do not use content or partner rails until there is permissioned proof or a permissioned introduction.
5. Read every acted evidence packet during the first cohort and audit a sample of rejected rows.
6. Run one pod, one truth-gap hypothesis, one CTA, and no more than two message structures.
7. Measure owner-qualified conversations, activation starts, two-surface completion, founder minutes, and safety failures. Do not optimize scraped rows, messages, opens, or raw replies.
8. Do not respond to a failed trial by increasing volume.

## Legal And Platform Corrections

These are operational safeguards, not legal advice. A qualified lawyer should approve any real outreach policy.

| Claim in AI responses | Primary-source correction | SignalDesk decision |
| --- | --- | --- |
| DPDP Section 6 creates the erasure right | Section 6 concerns consent and withdrawal. The correction/erasure right is Section 12. The Act and Rules also have a staged commencement timeline; India Code currently records the main Sections 3-17 as commencing eighteen months after November 13, 2025. | Keep suppression, minimization, erasure handling, and source rights as policy now, but do not cite the wrong section or pretend all provisions are already in force. Sources: [India Code Act index](https://www.indiacode.nic.in/handle/123456789/22037?view_type=browse), [Section 3](https://www.indiacode.nic.in/show-data?abv=CEN&actid=AC_CEN_45_0_00003_2023-22_1763464807080&orderno=3&orgactid=AC_CEN_45_0_00003_2023-22_1763464807080&sectionId=101269&sectionno=3&statehandle=123456789%2F1362), [Act PDF](https://www.indiacode.nic.in/bitstream/123456789/22037/2/a2023-22.pdf), [MeitY DPDP Rules page](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa). |
| Publicly available data authorizes prospecting or outreach | Section 3(c)(ii) describes when the Act does not apply to certain publicly available data. It does not grant platform rights, contact permission, or a general marketing license. | Keep public evidence separate from contact rights. A `Pass` remains research-only unless a separately approved route exists. |
| TRAI rules govern all commercial email | TCCCPR is a telecom-commercial-communications framework centered on telecom resources, SMS, and voice. It should not be used as the sole legal basis for email. | Maintain a separate channel/jurisdiction policy. Source: [TRAI TCCCPR](https://trai.gov.in/tcccpr), [TRAI consolidated regulations](https://trai.gov.in/release-publication/consolidated-regulations/telecom). |
| A public phone number allows manual or automated WhatsApp outreach | WhatsApp says a business may contact a person only when it has the number and opt-in permission; business-initiated platform conversations use approved templates, and non-template replies are limited to the 24-hour window after the last user message. | Cold WhatsApp remains prohibited. Source: [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/). |
| Google Maps data may seed a durable lead database if outreach is manual | Current Google Maps Platform terms prohibit export/extraction/scraping for use outside the service, including copying and saving business names, addresses, or reviews, subject to service-specific permissions. | Google-derived data stays restricted and transient under its dedicated source policy. Prefer first-party sites, licensed/open data, owner input, and permissioned referrals. Source: [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms). |
| Bounce above 3%/5%, complaint above 0.08%/0.15%, WhatsApp block above 1.5%/2%, or 35/50 messages per inbox are universal official thresholds | Gmail and Yahoo publish sender requirements, including authentication and spam complaint rates below 0.3% for applicable sending. The other pasted thresholds are not established as universal official limits by the cited sources. | Do not encode copied thresholds. Provider send remains disabled until an approved sender policy sets conservative evidence-based pause rules. Sources: [Gmail sender guidelines](https://support.google.com/mail/answer/81126), [Yahoo sender requirements](https://senders.yahooinc.com/best-practices/). |
| Scraping public data is generally legal | This is an unsafe overgeneralization. Legality, contract terms, platform terms, data category, jurisdiction, storage, and downstream use differ. | Never use that sentence as policy. Every source class requires its own reviewed rights record. |

## Product-Shape Decision

Do not remove implemented safety and attribution capabilities merely because the first cohort is small. The correct simplification is operational:

- Today is the daily surface.
- Opportunities is candidate inventory and evidence review.
- Conversations is reply triage.
- Activations is the North Star workflow.
- Controls is for exceptions and founder policy.
- Content, partner, provider, AI volume, and commercial controls stay gated and out of the daily trial unless explicitly needed.

One concern remains worth watching: the secondary Revenue Operating Layer contains stage, probability, value, and forecast-like fields (`src/components/signaldesk/SignalDeskWorkspace.tsx:2430-2463`). These must remain secondary and must not turn the core daily workflow into pipeline administration. Do not delete them in this review pass; judge their usefulness only after real activation data exists.

## Approved Trial Decision

The pasted AI plans must not silently replace the maintained trial.

Current approved run:

- Indiranagar and Koramangala, Bengaluru;
- 25 evidence candidates;
- no more than five newly reviewed per day;
- official first-party evidence only for the current research board;
- no contact inferred from a research `Pass`;
- no Google Places, Apify, paid enrichment, provider send, or social publishing;
- stop after five owner conversations with no accepted private preview;
- target three owner-reviewed two-surface activations within seven days;
- no content proof without explicit permission.

The next operational step is to obtain the first permissioned owner or partner introduction, record the founder action, and observe the MenuList activation handoff. Do not add another geography, raise volume, buy an outreach domain, or automate sending before that evidence exists.

## Final Recommendation

**Keep the current architecture. Do not implement the broad AI backlogs.**

Before the first real contact, the only code change worth approving is a small manual-contact action, ideally paired with a bounded rejection-reason selector. Everything else should wait for the current Bengaluru trial to reveal an actual bottleneck.

Current clearance remains:

- safe for local desktop trial;
- safe for local mobile observe/emergency-pause trial;
- not cleared for real outreach;
- not cleared for provider send;
- not cleared for production Firebase use;
- not cleared for public SignalDesk exposure.

No runtime or product-boundary change is authorized by this review.

## Authorized Implementation Follow-up

**Status: Done on July 11, 2026.** After this review, the founder explicitly authorized the bounded follow-up it recommended. This does not authorize any broader AI backlog, channel expansion, provider send, public surface, deployment, or MenuList runtime change.

Implemented:

- export preparation no longer counts as completed outreach;
- `record-manual-contact` records one founder-completed fresh email export or permissioned partner introduction with policy, suppression, route, kill-switch, timestamp, and idempotency checks;
- wrong-contact results immediately use the existing hashed suppression ledger;
- rejected approvals require one bounded reason, with a note required for `other`, and project into the existing evidence/enrichment/hold/reject lifecycle;
- desktop exposes these controls while mobile remains server-enforced observe-only;
- deterministic local E2E and static verification cover prepared-versus-contacted state, duplicate retries, expired policy, wrong-contact suppression, structured rejection, and mobile blocking.

No provider was called, no message was sent, no Firebase rules/indexes/collections were added, no deployment occurred, and no MenuList runtime or truth collection was touched.

The implementation cross-check intentionally does not expose a generic `manual-form` completion route. Existing `limited` contactability can mean only a phone number, Instagram handle, or generic website, none of which proves a permitted business contact form. Those rows remain `contact-route-unverified` until a future explicit route-evidence contract is approved.
