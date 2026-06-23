# MenuList SignalDesk - Action Register

**Status:** Active tracker
**Created:** June 23, 2026
**Purpose:** Track documentation and implementation-preparation work for SignalDesk.

## Status Legend

| Status | Meaning |
| --- | --- |
| Not started | No work done yet |
| In progress | Work has started |
| Blocked | Needs founder input, access, policy review, or architecture decision |
| Done | Complete for current planning stage |
| Deferred | Intentionally later |
| Rejected | Decided not to do |

## Documentation Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| SD-D001 | Create SignalDesk docs folder | Codex | Done | `__docs__/menulist-signaldesk/` |
| SD-D002 | Create project README | Codex | Done | Internal-only doc map and source inputs |
| SD-D003 | Create feature map | Codex | Done | Maps 38 ChatGPT specs into module backlog |
| SD-D004 | Create project spec | Codex | Done | Internal product scope and requirements |
| SD-D005 | Create implementation plan | Codex | Done | Technical blueprint, no runtime code |
| SD-D006 | Create Firebase cost plan | Codex | Done | Separate Firebase posture and collection plan |
| SD-D007 | Create compliance policy | Codex | Done | Source/channel/privacy/suppression policy |
| SD-D008 | Create owner-control runbook | Codex | Done | Daily/weekly observe, monitor, approve, pause, and redirect workflow |
| SD-D009 | Create mobile support assessment | Codex | Done | Emergency/read-only mobile only |
| SD-D010 | Create test matrix | Codex | Done | Product, source, AI, compliance, cost, mobile tests |
| SD-D011 | Create architecture readiness review | Codex | Done | Firebase optimization, product separation, code splitting, and implementation gates |
| SD-D012 | Create implementation validation record | Codex | Done | `menulist-signaldesk_validation.md` captures runtime evidence and verification commands |
| SD-D013 | Create owner-control model | Codex | Done | Captures founder POV: system markets/distributes MenuList while owner observes, monitors, approves, pauses, or redirects |
| SD-D014 | Add web research addendum | Codex | Done | Current external guidance added for CAN-SPAM, Gmail sender health, Meta channel windows, Places retention, TCPA caution, and AI risk management |
| SD-D015 | Add solo-founder investment plan | Codex | Done | Web-researched plan for paid AI/provider strategy, Apollo/Hunter/verification/search/crawl/sender providers, model routing, and budget tiers |
| SD-D016 | Add market-practice cross-check | Codex | Done | Cross-checked Clay/Apollo/waterfall/no-code/sequencer/deliverability market patterns and updated the plan accordingly |
| SD-D017 | Run from-scratch docs/code parity cross-check | Codex | Done | Rebuilt docs/code inventory, fixed stale feature-map status, removed duplicate action ID, and logged fresh verification evidence |

## Implementation Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| SD-I001 | Add SignalDesk product identity and deployment target | Codex | Done | `PRODUCT_IDS.SIGNALDESK = "SD"`, `signaldesk` deployment target, and env validation entry added |
| SD-I002 | Add SignalDesk feature flags | Codex | Done | App shell, imports, AI, drafts, approvals, export, inbox, outcome bridge, demand signals, control room, and provider-send flags added; provider send remains false |
| SD-I003 | Add product-local constants, types, DAL, hooks, and API helpers | Codex | Done | Product-local route, Firebase, database, access, API guard, server, hook, and client DAL files created |
| SD-I004 | Add protected internal app shell and first-route workspace | Codex | Done | `/signaldesk` plus first module routes render a protected summary-first workspace |
| SD-I005 | Add overview and kill-switch APIs | Codex | Done | APIs use `withAuth()`, role permission checks, Zod validation, rate limits, audit write path, and summary reads |
| SD-I006 | Add dedicated Firebase CLI config, rules, indexes, and storage rules | Codex | Done | Rules default deny; client reads are limited to platform/admin member access; writes are server/admin only |
| SD-I007 | Add SignalDesk functions skeleton | Codex | Done | `functions-signaldesk` builds locally and exposes a disabled-safe health check skeleton |
| SD-I008 | Create Firebase projects and deploy SignalDesk infrastructure | Founder | Blocked | Needs owner-controlled Firebase projects/access for `menulist-signaldesk-qa` and `menulist-signaldesk` |
| SD-I009 | Implement target import and source-policy runtime | Codex | Done | Manual source policies, bounded target import, source run summaries, identity dedupe, contact identities, suppression checks, and audit implemented |
| SD-I010 | Implement AI scoring/evidence/draft/approval/email/inbox/outcome workflow | Codex | Done | Rules-based scoring, evidence packets, draft generation, approval review, export-only email rail, manual reply classification, outcomes, demand signals, summaries, and audit implemented |
| SD-I011 | Implement provider send/webhooks runtime | Codex | Done | Runtime plumbing exists; keep actual provider send disabled until sender identity, physical address, unsubscribe, bounce, complaint, suppression, and project access are ready |
| SD-I012 | Cross-check and harden first-build workflow | Codex | Done | Firebase config gating, security validation logs, source-policy contact enforcement, evidence/draft/export gates, public-surface isolation, and local validation completed |
| SD-I013 | Implement signed provider webhook intake | Codex | Done | Email shared-secret and Meta HMAC webhook route added; normalized provider events, inbound messages, channel health, and suppression updates are stored without raw payloads |
| SD-I014 | Implement live source-provider run | Codex | Done | Google Places Text Search and Apify Source Broker connectors added behind source-provider flags, provider source policy, max-result cap, provider budget, and import pipeline; Foursquare remains blocked pending source approval |
| SD-I015 | Implement real AI provider assist | Codex | Done | Gemini assist action added behind AI-provider flag; writes AI worker run, decision snapshot, operation ledger, audit, and cost estimate |
| SD-I016 | Implement assisted channel and provider-send plumbing | Codex | Done | Approved drafts can create WhatsApp/Instagram/Messenger/email handoffs; provider send adapter exists but remains disabled until send readiness is approved |
| SD-I017 | Implement paid campaign automation | Founder/Codex | Deferred | Explicitly skipped by founder in this session |
| SD-I018 | Deploy SignalDesk Firebase infrastructure | Founder/Codex | Deferred | Explicitly skipped by founder in this session |
| SD-I019 | Reframe dashboard and docs around owner-control operating model | Codex | Done | Docs and first-screen UI now emphasize observe, monitor, approve, pause, and redirect instead of manual CRM operation |
| SD-I020 | Add sender-health readiness object before provider send can be enabled | Codex | Done | `signaldeskSenderDomains` now tracks domain/auth/ramp/bounce/complaint/unsubscribe/brand risk; email handoff/send is blocked when sender domain is not ready |
| SD-I021 | Add channel-window state to assisted channel handoffs | Codex | Not started | WhatsApp/Instagram/Messenger handoffs need inbound/opt-in/ad-click/template/window state before assisted send |
| SD-I022 | Add provider-source retention and Place ID refresh state | Codex | Not started | Places-like providers must store provider IDs/source policy, avoid raw payload storage, keep non-exempt content short-lived, and refresh Google Place IDs after 12 months |
| SD-I023 | Add owner approval-packet summary model | Codex | Done | Drafts now create approval packets; owners can regenerate packets from approvals or targets |
| SD-I024 | Add AI quality monitoring summary | Codex | Done | Model route runs now write `signaldeskModelEvals` with confidence/pass/rejected-fact summary state |
| SD-I025 | Add provider account registry and budget governor | Codex | Done | Provider accounts, provider budget policies, per-run/daily/monthly checks, and spend increments are implemented |
| SD-I026 | Add AI model router | Codex | Done | AI assist resolves `signaldeskModelRoutes`, blocks inactive/non-Gemini routes, checks AI provider budget, and writes model timelines/evals |
| SD-I027 | Add vendor run ledger and normalized enrichment result model | Codex | Done | Source-provider and waterfall paths write `signaldeskVendorRuns` and `signaldeskEnrichmentResults` summaries without durable raw payloads |
| SD-I028 | Add enrichment broker adapters | Codex | Not started | Apollo, Hunter, ZeroBounce, Firecrawl, Tavily/Exa, and Places adapters must run only through source policy, budget policy, and audit |
| SD-I029 | Add market pod planner | Codex | In progress | Default market pod summary is seeded and visible; planner/recommender logic is not implemented |
| SD-I030 | Add weekly strategist memo | Codex | Not started | Strong-model weekly review of outcomes, cost, complaints, provider quality, and next approval decisions |
| SD-I031 | Add provider evaluation harness | Codex | Not started | Compare providers by verified contact rate, evidence quality, reply/outcome quality, suppression risk, cost, and founder edit rate |
| SD-I032 | Add enrichment waterfall policies | Codex | Done | Waterfalls define provider order, requested field, max credits, stop condition, verification, source policy, retention, and active/hold state |
| SD-I033 | Add audience/signal segment model | Codex | Done | Audience segments are typed, seeded, writable by API, readable in attribution/control room, and visible in the workspace |
| SD-I034 | Add Apify Source Broker | Codex | Done | Apify connector readiness, env-controlled Actor run, provider/budget approval, normalized target imports, webhook status event logging, and no-raw-payload storage implemented |
| SD-I035 | Add sequencer handoff model | Codex | Done | Smartlead/Instantly/lemlist handoff records are created as ready/blocked records; no external sequencer send is enabled |
| SD-I036 | Add sender-domain risk model | Codex | Done | Sender domains track auth, volume ramp, bounce, complaint, unsubscribe, provider, and brand risk; email handoff/send requires readiness |
| SD-I037 | Add evidence-bound personalization guard | Codex | Done | Drafts carry evidence packet IDs, source-policy/CTA evidence refs, and unsupported claim slots |
| SD-I038 | Add run timeline/graph | Codex | Done | Provider, model, enrichment, approval, defaults, and sequencer flows write founder-visible run timelines |
| SD-I039 | Add self-service proof CTA model | Codex | Done | Self-service CTA summaries are typed, seeded, API-writable, used in drafts, and visible in control room |
| SD-I040 | Wire investment-control actions into workspace UI | Codex | Done | Policies, Sources, AI, Approvals, Channels, Attribution, and Control Room now expose the new control records and actions |
| SD-I041 | Add prior-contact/prior-outcome spend guard | Codex | Done | Draft, enrichment, export, handoff, and sequencer flows check suppression, contacted/replied/converted state, outcomes, and non-new conversations |
| SD-I042 | Align settings workspace API section | Codex | Done | `settings` is now accepted by the protected workspace API section allowlist, matching the route, UI nav, and typed section union |

## Feature Doc Backlog

| ID | Module | Status | Notes |
| --- | --- | --- | --- |
| SD-F001 | `signaldesk-foundation` doc set | Done | Created initial spec, impl, firebase, compliance, mobile, and test-case docs for access, roles, audit, and kill switches |
| SD-F002 | `signaldesk-target-registry` doc set | Done | Created initial internal doc set for target/source/contact/conversation/outcome objects |
| SD-F003 | `signaldesk-source-policy` doc set | Done | Created initial internal doc set for source rights, allowed fields, expiry, and retention |
| SD-F004 | `signaldesk-ai-intelligence` doc set | Done | Created initial internal doc set for fit/gap/contactability scoring and evals |
| SD-F005 | `signaldesk-evidence-packets` doc set | Done | Created initial internal doc set for evidence and decision snapshots |
| SD-F006 | `signaldesk-draft-control` doc set | Done | Created initial internal doc set for templates, AI drafts, and guardrails |
| SD-F007 | `signaldesk-approval-queue` doc set | Done | Created initial internal doc set for human review, approval states, and audit |
| SD-F008 | `signaldesk-email-rail` doc set | Done | Created initial internal doc set for email/export, sender readiness, unsubscribe, bounce, and complaint |
| SD-F009 | `signaldesk-inbox` doc set | Done | Created initial internal doc set for conversations, reply classifier, suppression, and operator work items |
| SD-F010 | `signaldesk-outcome-bridge` doc set | Done | Created initial internal doc set for MenuList route tokens, outcomes, attribution, and boundary rules |
| SD-F011 | `signaldesk-demand-signals` doc set | Done | Created initial internal doc set for QR/link/share/claim/referral demand signal capture |
| SD-F012 | `signaldesk-control-room` doc set | Done | Created initial internal doc set for channel health, cost, incidents, summaries, and kill switches |

## Founder Decisions Needed

| ID | Decision | Status | Default |
| --- | --- | --- | --- |
| SD-Q001 | Runtime repo location | Done | Implement as product-isolated module inside this monorepo first; keep extraction-ready boundaries |
| SD-Q002 | Firebase project IDs | Blocked | `menulist-signaldesk-qa` and `menulist-signaldesk` |
| SD-Q003 | First market pod | Blocked | One India city + one vertical + one contact path |
| SD-Q004 | First sender identity | Blocked | Founder identity, low-volume email/export first |
| SD-Q005 | Physical address policy | Blocked | Needed before commercial email |
| SD-Q006 | First approved source list | Blocked | Manual curated list before source providers |
| SD-Q007 | Product code | Done | `PRODUCT_IDS.SIGNALDESK = "SD"` added in the foundation runtime implementation |
| SD-Q008 | First monthly paid-provider budget | Blocked | Registry/budget governor exists; owner still needs to approve the first real monthly provider cap |
| SD-Q009 | First paid-provider eval set | Blocked | Choose whether first eval uses Apollo, Hunter, ZeroBounce, Firecrawl, Tavily/Exa, Postmark/Resend, or a smaller subset |
| SD-Q010 | First strong-model budget | Blocked | Choose weekly strategist/adjudication cap before GPT-5.4/5.5 or Claude Opus style calls are enabled |
| SD-Q011 | Sequencer rail evaluation | Blocked | Decide whether Smartlead, Instantly, lemlist, or no sequencer should be evaluated after sender health is ready |
| SD-Q012 | Sender-domain risk policy | Blocked | Decide whether cold outreach uses primary domain, subdomain, separate domain, or no automated sender; no domain-rotation default |
| SD-Q013 | First self-service proof CTA | Blocked | Choose first default CTA: preview, route draft, menu health snapshot, QR/public menu, claim/start, or two-surface activation proof |

## Boundaries

- Foundation runtime code created.
- No Firebase project created or deployed.
- No provider configured.
- No provider send executed.
- No paid provider account purchased or connected; only the internal provider registry and budget controls were implemented.
- No AI model provider beyond the existing gated Gemini assist path was implemented; model routes for stronger providers remain held until adapter/account approval.
- No public page created.
- No MenuList owner/customer surface changed.
