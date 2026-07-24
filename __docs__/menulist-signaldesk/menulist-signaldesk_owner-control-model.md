# MenuList SignalDesk - Owner Control Model

**Status:** Active doctrine
**Created:** June 23, 2026
**Audience:** Founder, growth team, implementers
**Scope:** How SignalDesk should behave when the owner wants to observe, monitor, and approve instead of manually running marketing work.

## Core Point Of View

SignalDesk exists so MenuList distribution work can run as an internal system.

Danny's role should be:

```txt
observe -> monitor -> approve -> pause or redirect when needed
```

The system's role should be:

```txt
research -> dedupe -> score -> gather evidence -> draft -> queue approvals -> route replies -> suppress risk -> attribute outcomes -> improve the next run
```

SignalDesk should not become another tool where the founder has to manually manage every target, message, reply, and report.

## Operating Contract

| Layer | System responsibility | Founder responsibility |
| --- | --- | --- |
| Observe | Keep summaries current: targets, approvals, source health, channel health, outcomes, cost, incidents. | Read the control room and understand whether growth is moving safely. |
| Monitor | Detect stale queues, source risk, channel risk, suppression spikes, cost movement, and weak conversion. | Pause, narrow, or redirect when the system shows risk. |
| Approve | Prepare evidence-backed approvals with source, risk, channel, draft, and expected outcome context. | Approve, reject, or hold source policies, cohorts, risky drafts, channel readiness, and scale decisions. |
| Learn | Attribute MenuList outcomes back to source, message, city, category, and channel. | Decide which market pod or channel deserves more effort. |

## Automation Ladder

SignalDesk should move work upward only when the previous level is safe.

| Level | Name | Allowed behavior |
| ---: | --- | --- |
| 0 | Record | Store source provenance, target summaries, audit events, replies, outcomes, and demand signals. |
| 1 | Recommend | Score targets, show gaps, explain rejected facts, and suggest the next action. |
| 2 | Prepare | Build evidence packets, safe drafts, reply classifications, and approval packets. |
| 3 | Assist | Prepare a channel handoff only from a human-approved draft for that exact channel. Current draft/approval creation is email-only; WhatsApp/Instagram remain gated and Messenger outbound is unsupported. |
| 4 | Send | Provider send only after sender identity, physical address, unsubscribe, suppression, bounce, complaint, source policy, and channel readiness are complete. Currently disabled. |
| 5 | Spend | Paid campaign automation. Explicitly skipped for now. |

## Research-Backed Control Gates

The June 23, 2026 web research addendum adds these required gates:

| Gate | Why it exists | Owner view |
| --- | --- | --- |
| Sender health | Email needs authentication, identity, unsubscribe, suppression, bounce, complaint, and physical-address readiness before provider send. | "Email send is ready / not ready" with missing items. |
| Channel window | WhatsApp, Instagram, and Messenger need inbound, opt-in, ad-click, template, or response-window context before assisted send. | "Channel window open / template required / blocked". |
| Source retention | Places-like providers are candidate signals, not durable prospect truth by default. | "Source content expires / Place ID retained / verification needed". |
| AI risk | AI must be governed, mapped, measured, and managed across confidence, rejected facts, edits, eval failures, and cost. | "AI healthy / needs review / paused". |
| Consent caution | Automated phone/text outreach is blocked unless explicit consent and review exist. | "Phone/SMS blocked unless consent exists". |

## Investment Posture

Paid AI models and third-party data providers are allowed when they increase founder leverage without weakening control.

SignalDesk may use stronger model APIs, Apollo-like enrichment, email verification, website crawling, search/research providers, and sender providers only when each run is attached to:

- source policy;
- budget policy;
- provider account status;
- retention policy;
- evidence/provenance;
- suppression state;
- owner approval where risk or spend changes.

The solo-founder investment plan is the source of truth for provider selection, Apollo boundaries, model routing, budget tiers, and build order: `menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md`.

## What The System Should Do Without Founder Work

- Keep source runs bounded and attached to approved source policies.
- Dedupe targets and contact identities.
- Mark targets as review, hold, ready, contacted, replied, converted, or suppressed.
- Produce evidence packets with rejected facts.
- Score fit, current-list gap, contactability, and risk.
- Draft only from approved templates and approved facts.
- Classify replies and immediately suppress DNC, wrong-contact, complaint, bounce, and unsubscribe cases.
- Track outcomes such as route created, upload started, preview prepared, published, and two-surface activation.
- Maintain cost, source health, channel health, approval backlog, inbox backlog, and incident summaries.

## What Must Stay Human-Approved

- New source policies and source-provider use.
- First market pod selection.
- Sender identity and physical address policy.
- Sender-health go-live.
- Channel-window/template policy.
- Any outbound message before provider send is enabled.
- Any provider-send enablement.
- Any channel scale-up.
- Any paid campaign automation.
- Any Firebase deploy.
- Any rule that writes into MenuList customer/owner truth.

## Dashboard Shape

The first screen should answer only four questions:

| Question | Signal |
| --- | --- |
| Is the system working? | Runtime, source health, channel health, cost status. |
| What needs approval? | Approval backlog, human review count, risky drafts, source/channel policy waits. |
| What needs intervention? | Kill switches, incidents, suppression spikes, provider readiness gaps. |
| Is MenuList distribution improving? | Outcomes, two-surface activations, demand signals, cost per activated business. |

If a screen does not help observe, monitor, approve, pause, or learn, it should be demoted behind detail views.

## Daily Growth Mission

The June 24, 2026 ChatGPT feedback review adds one operating-layer rule: the dashboard should compress into a daily mission before it expands into more screens.

Daily Growth Mission should show at most five ranked actions:

- approve;
- hold;
- pause;
- redirect;
- manual publish or manual send.

Each action should include the reason, linked source/evidence/proof, risk state, expected MenuList outcome, and stop rule. If more than five actions appear, the system has failed the solo-founder posture and should group lower-priority work behind exception summaries.

## Operating Proof Gate

Before widening automation, SignalDesk must prove one narrow acquisition loop:

```txt
one market pod
one approved source list
one CTA
one sender identity
one export-only rail
one outcome report
```

This gate is operational, not architectural. The runtime may contain broader primitives, but the system should not enable provider send, paid campaigns, social auto-publish, or new paid-provider adapters until one pod proves that SignalDesk can reduce founder workload and move real businesses toward MenuList activation.

## Approval Packet Shape

Every approval packet should show:

- source policy and allowed use;
- source/provider age, retention, and refresh state;
- evidence summary and rejected facts;
- target risk and suppression state;
- channel readiness and channel-window state;
- draft body and unsupported-claim check;
- expected MenuList outcome;
- cost, incident, and AI-health impact;
- clear actions: approve, hold, reject, pause, or redirect.

## Product Boundary

This model does not change the existing boundaries:

- SignalDesk remains private and internal.
- SignalDesk remains separate from MenuList owner/customer runtime.
- SignalDesk does not create public website/help/marketing surfaces.
- SignalDesk does not write MenuList `stores`, `projects`, billing, menu publish state, or customer output.
- Provider send remains disabled.
- Paid campaign automation remains skipped.
- Firebase deploy remains skipped until explicitly requested.
