# MenuList SignalDesk - ChatGPT Share Brief

**Status:** Share-ready context brief
**Created:** June 24, 2026
**Audience:** External AI review, especially ChatGPT
**Owner:** Danny and MenuList marketing/growth team
**Confidentiality:** Internal only. Do not treat this as public product copy.

---

## How To Use This Document

Paste this entire document into ChatGPT when asking for strategic review, workflow ideas, missing guardrails, launch/distribution thinking, or operating improvements for SignalDesk.

Ask ChatGPT to reason from this project truth, not from generic SaaS, CRM, lead-generation, or marketing-automation assumptions.

## One-Line Context

MenuList SignalDesk is a private internal growth control room for MenuList, built for Danny and the MenuList marketing/growth team so the system can research, prepare, monitor, and queue distribution work while the founder mainly observes, monitors, approves, pauses, or redirects.

## What SignalDesk Is

SignalDesk is an internal operating system for MenuList distribution.

It helps the team:

- find and qualify target restaurants, local operators, agencies, and partner channels
- keep source provenance and source-use policy attached to every target
- dedupe leads before spend or outreach
- score fit, current-list gap, and contactability
- create evidence packets and decision snapshots
- draft controlled messages using approved evidence and CTAs
- require human approval before any outbound or scheduled action
- track replies, outcomes, demand signals, and attribution to real MenuList activity
- monitor costs, provider health, source quality, and safety issues
- pause scopes when anything looks risky
- repurpose owned proof into approval-gated content drafts
- test trust partners and creator-like channels without copying consumer influencer tactics blindly

## What SignalDesk Is Not

SignalDesk is not:

- a public product
- a public MenuList website feature
- a customer-facing MenuList owner feature
- a generic CRM
- a generic lead blasting tool
- a social scheduler
- a paid campaign optimizer
- an autonomous outbound machine
- a system that should send cold WhatsApp, Instagram, Messenger, or email without explicit source, consent, suppression, sender, and owner approval gates

## Primary Operating POV

The desired owner experience is:

```txt
SignalDesk works in the background.
Danny observes.
Danny monitors.
Danny approves, pauses, or redirects only when needed.
The system should reduce manual marketing burden, not create another dashboard that needs constant babysitting.
```

The system should be powerful enough for a solo technical founder to run MenuList distribution without depending on a full marketing team for daily execution.

## Current Runtime Status

Current status as of June 24, 2026:

- Internal runtime implemented for local testing.
- Product-isolated app shell exists at `/signaldesk`.
- MyCodex-host alias exists at `/sd`.
- `/sd/app` is accepted as a compatibility alias and rewrites to the same private SignalDesk app.
- Protected action API exists at `/api/signaldesk/actions`.
- Protected workspace API exists at `/api/signaldesk/workspace`.
- Kill-switch API exists at `/api/signaldesk/kill-switches`.
- Provider webhook route exists at `/api/signaldesk/webhooks/[provider]`.
- Firestore rules are default deny.
- SignalDesk client reads are internal only.
- Client writes are denied.
- Server/admin actions write product-local SignalDesk collections.

## Implemented Runtime Modules

The implemented runtime covers:

1. SignalDesk foundation, private app shell, access model, roles, audit, and kill switches.
2. Target registry and manual import.
3. Source policy, allowed-use, retention, and source provenance.
4. Dedupe and prior-contact/prior-outcome guard.
5. Rules-based scoring for fit, current-list gap, and contactability.
6. Evidence packets and decision snapshots.
7. Evidence-bound draft creation.
8. Human approval queue.
9. Export-only email rail.
10. Owned email sequencer queue.
11. Sender-domain readiness and risk state.
12. Connector settings for SMTP, Meta WhatsApp, Meta Instagram, Meta Messenger, Smartlead fallback, and Apify readiness metadata.
13. Assisted WhatsApp, Instagram, and Messenger handoff records.
14. Channel-window state for WhatsApp, Instagram, and Messenger.
15. Provider-send plumbing, currently disabled.
16. Signed provider webhook intake.
17. Google Places source-provider import.
18. FHRS/FHIS UK source-provider import as source/evidence only, not contact permission.
19. Apify Source Broker import and webhook event logging.
20. Dashboard lead batch and Origami-style Research Agent Table with prompt presets, prompt-to-provider plan, enrichment rows, pass/fail/unsure scoring, source transparency, idempotency, market-pod mapping, failed-row exclusion from daily leads, contact path, share message, and next safe action.
21. Gemini AI assist through model routes and budget checks.
22. Provider registry and budget governor.
23. AI model routes and model evaluation summaries.
24. Vendor run ledger.
25. Enrichment waterfall policies and normalized enrichment results.
26. Audience and signal segments.
27. Market pod recommender.
28. Weekly strategist memo.
27. Provider-source retention refresh records.
28. Provider evaluation shell.
29. Self-service proof CTA model.
30. Control room summaries for cost, health, queue, and incidents.
31. Inbox and manual reply classification.
32. Outcome bridge to MenuList outcomes without mutating MenuList store/menu truth.
33. Demand signal summaries from QR, links, shares, claims, referrals, and content outcomes.
34. Content Distribution Rail.
35. Trust Partner Rail.
36. Run timelines for founder-readable workflow traces.

## Core Workflow

```txt
Approved source policy
  -> source run or manual import
  -> target summary
  -> dedupe and source provenance
  -> scoring
  -> evidence packet
  -> decision snapshot
  -> draft
  -> approval packet
  -> founder or growth-team approval
  -> export, handoff, queue, or manual action
  -> inbox, reply, outcome, or demand signal
  -> attribution and learning
  -> weekly strategist memo and next decisions
```

## Content Distribution Rail

The Content Distribution Rail turns MenuList-owned proof into controlled channel drafts.

It includes:

- content source registry
- content asset records
- canonical message capture
- proof level
- risk notes
- CTA attachment
- channel draft generation
- draft review and approval
- calendar queue
- manual performance capture
- demand signal summary when owner outcomes are recorded
- content-specific pause scope

Important boundaries:

- No auto-publish.
- No social scheduler adapter.
- No paid campaign automation.
- No provider send.
- Held or archived content assets cannot generate distribution drafts.
- Scheduling requires approved draft status.
- Performance capture obeys the `content-distribution` pause switch.

## Trust Partner Rail

The Trust Partner Rail adapts useful ideas from influencer marketing, but only for MenuList-fit trust channels.

It focuses on:

- restaurant consultants
- menu photographers
- local business creators
- agency/freelancer partners
- POS/payment/operator advocates
- trusted local operator communities

It includes:

- partner profiles
- trust scoring
- niche tests
- lean briefs
- flat-fee deal gates
- disclosure checks
- deliverable tracking
- compact metrics
- renewal, hold, cut, or retest decisions

Important boundaries:

- No broad consumer influencer copying.
- No follower-count buying as the default.
- No per-view default pricing.
- No automated contracts.
- No automated payments.
- No real partner spend without active budget policy and founder approval.
- Disclosure must be checked for paid or incentivized partner content.

## Source, Provider, And AI Boundaries

SignalDesk may use external providers only through approved gates.

Current posture:

- Apify Source Broker is implemented as a gated source/evidence connector.
- FHRS/FHIS UK source-provider import is implemented as official establishment seed/evidence only; no contact permission or public rating feature is inferred.
- Google Places source-provider import is implemented.
- Dashboard lead batch and Research Agent Table are implemented inside `/signaldesk` and `/signaldesk/mission`; they copy Origami's useful prompt-to-table behavior without adding Origami integration, sequencer sending, or public SignalDesk pages.
- Gemini AI assist is implemented behind model route, provider approval, and budget gates.
- Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, and similar paid adapters are intentionally skipped for now.
- External sequencer APIs such as Smartlead, Instantly, and lemlist are not sending. SignalDesk may create handoff readiness records only.
- Provider send is disabled by feature flag.

## Safety And Compliance Principles

Any advice for SignalDesk must preserve these principles:

- Source rights matter.
- Allowed use must be explicit: contact, evidence, and personalization are separate.
- Suppression and prior-contact checks must run before outreach, enrichment, export, handoff, or sequence steps.
- Evidence must be attached to claims.
- Unsupported claims must be rejected or held.
- Human approval is required before outbound action.
- Sender identity, physical address, unsubscribe, bounce, complaint, and suppression handling must be ready before provider send.
- Cold WhatsApp, Instagram, and Messenger are not default channels.
- Channel windows and opt-in state matter.
- Firestore reads and writes must stay cost-aware.
- Client writes to SignalDesk collections are denied.
- SignalDesk must not mutate MenuList store, menu, project, billing, or public output truth.

## Product And URL Separation

Runtime paths:

- Local canonical app: `http://localhost:3000/signaldesk`
- Local content rail: `http://localhost:3000/signaldesk/content`
- MyCodex-host shortcut: `https://menulist.digital/sd`
- Compatibility shortcut: `https://menulist.digital/sd/app`

Canonical private app hosts:

- QA/private preview: `signaldesk.menulist.online`
- Production private host: `signaldesk.menulist.ai`

Important:

- SignalDesk is not `/sites/signaldesk`.
- SignalDesk is not a public website.
- SignalDesk is not a MenuList tenant route.
- `menulist.digital` remains the MyCodex host, with `/sd` and `/sd/app` as internal path aliases.

## Firebase And Cost Posture

SignalDesk uses product-local collections and dedicated Firebase posture.

Current state:

- Firestore rules and indexes exist.
- Storage rules exist.
- Functions skeleton exists.
- Client reads are limited to SignalDesk access.
- Client writes are denied.
- Server/admin writes happen through protected actions.
- Firestore emulator parse passes.
- Firebase deploy was explicitly skipped.

Dedicated Firebase targets are intended to be:

- QA/local: `menulist-signaldesk-qa`
- Production: `menulist-signaldesk`

Do not assume deploy has happened.

## Skipped, Deferred, Or Blocked

Skipped by explicit owner decision:

- paid campaign automation
- Firebase deploy to QA or production
- real external paid-provider adapters except the gated Apify Source Broker
- real external sequencer API sending
- content auto-publish
- public SignalDesk website
- public SignalDesk help docs

Owner/founder decisions still needed:

- Firebase project access and deployment approval
- first market pod
- first sender identity
- physical address policy before commercial email
- first approved source list
- first monthly paid-provider budget
- first strong-model budget
- first external sequencer evaluation, if any
- sender-domain risk policy
- first self-service proof CTA
- first trust partner niche and flat-fee cap
- first content proof asset and channel mix

## Local Verification Evidence

Latest checks passed:

```bash
npm run verify:signaldesk
npx tsc --noEmit --incremental false --pretty false
git diff --check
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"
```

Latest route smokes passed:

```txt
200 /signaldesk
200 /signaldesk/content
200 /signaldesk/partners
200 /signaldesk/settings
200 /signaldesk/control-room
200 menulist.digital/sd
200 menulist.digital/sd/app
200 menulist.digital/sd/app/content
200 menulist.digital/sd/content
```

`/sd/app/content` rewrites to `/signaldesk/content` and keeps headers:

```txt
x-product-id: signaldesk
x-product-name: MenuList SignalDesk
x-product-base-path: /sd
x-robots-tag: noindex, nofollow
x-middleware-rewrite: /signaldesk/content
```

## Good Questions To Ask ChatGPT

Ask ChatGPT questions like:

- What missing internal workflows would make this stronger for a solo founder?
- What approval gates are still weak?
- What should the first 30 days of operating SignalDesk look like?
- What data should the weekly strategist memo include?
- What first market pod should be tested and why?
- What source-policy checklist should be completed before first outreach?
- Which provider should be evaluated first, if any, under a small budget?
- What should be measured to decide whether Trust Partner Rail is working?
- What owned proof assets should MenuList turn into content drafts first?
- What should the system never automate?
- What would a marketing operator still need to do manually?

## Bad Suggestions To Reject

Reject or heavily modify suggestions that say:

- launch SignalDesk publicly
- sell SignalDesk as SaaS
- use SignalDesk as a generic CRM
- blast cold messages at scale
- scrape and send without source policy
- auto-publish to social channels
- auto-run paid campaigns
- bypass founder approval
- skip unsubscribe or sender identity requirements
- enrich contacts without allowed-use policy
- use follower count as the primary partner decision
- use per-view creator pricing by default
- store raw provider payloads indefinitely
- merge SignalDesk data into MenuList owner/customer collections
- expose SignalDesk in MenuList public navigation

## Suggested Prompt For ChatGPT

Use this prompt after pasting the document:

```txt
You are reviewing MenuList SignalDesk as a private internal growth control room for MenuList, not as a public SaaS product.

Think like a senior growth operator plus systems architect for a solo technical founder.

Do not suggest public launch, generic CRM features, cold blasting, auto-publish, paid campaign automation, or external provider adapters unless they fit the gates in this document.

Review the current system end to end and tell me:

1. What is strong and already well-designed?
2. What is still missing before I can rely on this as my main MenuList distribution system?
3. What should I test first in the first 7 days?
4. What should I test in the first 30 days?
5. What workflows still need tighter approval, compliance, source, cost, or quality gates?
6. What should stay manual forever?
7. What should be automated next, and why?
8. What dashboards or summaries would help me observe, monitor, approve, pause, or redirect with minimum daily effort?
9. What should my growth team do inside the system if I later hire one or two people?
10. What mistakes from generic lead-gen/influencer/marketing tools should I avoid?

Give practical recommendations only. Separate must-do, should-do, and avoid.
```

## Repo Docs To Reference Later

If ChatGPT gives feedback, validate it against these docs and code before implementing:

- `__docs__/menulist-signaldesk/README.md`
- `__docs__/menulist-signaldesk/menulist-signaldesk_impl.md`
- `__docs__/menulist-signaldesk/menulist-signaldesk_validation.md`
- `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md`
- `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md`
- `__docs__/menulist-signaldesk/menulist-signaldesk_operator-runbook.md`
- `__docs__/menulist-signaldesk/signaldesk-content-distribution-rail/README.md`
- `__docs__/menulist-signaldesk/signaldesk-trust-partner-rail/README.md`
- `src/components/signaldesk/SignalDeskWorkspace.tsx`
- `src/lib/signaldesk/workflowServer.ts`
- `src/app/api/signaldesk/actions/route.ts`
- `scripts/verification/verify-signaldesk-runtime.js`

## Final Reminder

SignalDesk exists so MenuList distribution can move faster without losing control.

The correct mental model is:

```txt
system prepares
system checks
system summarizes
founder approves
system records outcomes
system learns what to try next
```

Do not turn it into:

```txt
more dashboards
more manual CRM work
more cold blasting
more public product surface
more unchecked automation
```
