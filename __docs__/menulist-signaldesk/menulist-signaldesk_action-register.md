# MenuList SignalDesk - Action Register

**Status:** Active tracker
**Created:** June 23, 2026
**Last Updated:** July 11, 2026
**Purpose:** Track documentation and implementation-preparation work for SignalDesk.

## Status Legend

| Status | Meaning |
| --- | --- |
| Not started | No work done yet |
| In progress | Work has started |
| Blocked | Needs founder input, access, policy review, or architecture decision |
| Done | Complete for current planning stage |
| Deferred | Intentionally owner-gated or skipped in this scope |
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
| SD-D018 | Add Trust Partner Rail doc set from X article review | Codex | Done | Created `signaldesk-trust-partner-rail` internal docs for trust-channel partners, creator tests, lean briefs, flat-fee deals, disclosure gates, and renewal decisions |
| SD-D019 | Add Content Distribution Rail doc set from Distribution.ai review | Codex | Done | Created `signaldesk-content-distribution-rail` internal docs for owned proof assets, channel drafts, approval, calendar queue, and performance capture without auto-publish |
| SD-D020 | Add ChatGPT share brief | Codex | Done | Created one paste-ready SignalDesk context document for external AI review with internal-only boundaries, current runtime truth, skipped items, and recommended review prompt |
| SD-D021 | Review ChatGPT feedback and adopt operating-layer backlog | Codex | Done | Created `menulist-signaldesk_chatgpt-feedback-review-2026-06-24.md` and captured Daily Growth Mission, Offer/CTA OS, self-serve bridge, reply assistant, objection intelligence, experiment cards, source quality learning, and activation concierge as planning backlog |
| SD-D022 | Add Operating Layer doc set | Codex | Done | Created `signaldesk-operating-layer/` docs for Daily Growth Mission, experiment cards, offer CTAs, reply playbooks, source quality snapshots, compliance, Firebase, mobile, and tests |
| SD-D023 | Add growth playbook review and first-pod defaults | Codex | Done | Created `menulist-signaldesk_growth-playbook-review-2026-06-24.md`; adopted the activation-proof loop, recommended a Bengaluru restaurant pod hypothesis, kept unsafe automations rejected, and kept Activation Concierge as MenuList-side work |
| SD-D024 | Add founder distribution deep research | Codex | Done | Created `menulist-signaldesk_founder-distribution-research-2026-06-24.md`; cross-checked founder/community workflows, fast-growth startup cases, restaurant/SMB signals, and platform policies; confirmed Activation Concierge, proof assets, demand listening, and objection learning as the next automation priorities |
| SD-D025 | Add Revenue Operating Layer doc set and parent-doc parity | Codex | Done | Created the private revenue account/opportunity/offer/envelope/activation docs and aligned README, spec, implementation, Firebase, feature map, validation, action register, and decision log |
| SD-D026 | Add current social-channel market research and next trial plan | Codex | Done | Cross-checked X, Reddit, Instagram, YouTube, Google, Bengaluru/India operator signals, QR/customer friction, and five vendor categories; adopted a 30-day manual-first activation trial instead of more horizontal automation |
| SD-D027 | Create Bengaluru activation-trial operating pack | Codex | Done | Added the approved zero-spend envelope, evidence-only/public versus permissioned-contact policy split, 25-row candidate board, evidence packet, draft-only introduction scripts, preview checklist, stop rules, and external blockers |
| SD-D028 | Add current AI revenue workflow research and market brief | Codex | Done | Created the deep Markdown research and self-contained HTML brief across account research, signals, outbound, inbound, calls, proposals, content, creators, paid media, discovery, lifecycle, practitioner reality, governance, and five competitive operating models; cross-check found the immediate need is a shadow-mode proof run, not another agent or CRM layer |
| SD-D029 | Align Research Agent Table docs with AI distribution workbench output | Codex | Done | Updated operating-layer research docs and tests so each row carries evidence summary, recommended channel, CTA, message angle, source transparency, fit decision, and next action for the 20-30 lead review workflow |

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
| SD-I014 | Implement live source-provider run | Codex | Done | Google Places Text Search, FHRS/FHIS UK establishment seed, and Apify Source Broker connectors added behind source-provider flags, provider source policy, max-result cap, provider budget, and import pipeline; Foursquare remains blocked pending source approval |
| SD-I015 | Implement real AI provider assist | Codex | Done | Gemini assist action added behind AI-provider flag; writes AI worker run, decision snapshot, operation ledger, audit, and cost estimate |
| SD-I016 | Implement assisted channel and provider-send plumbing | Codex | Done | Approved drafts can create WhatsApp/Instagram/Messenger/email handoffs; provider send adapter exists but remains disabled until send readiness is approved |
| SD-I017 | Implement paid campaign automation | Founder/Codex | Deferred | Explicitly skipped by founder in this session |
| SD-I018 | Deploy SignalDesk Firebase infrastructure | Founder/Codex | Blocked | July 10 QA rules/index deploy attempt to `menulist-signaldesk-qa` failed with Firebase Rules API HTTP 403; current caller lacks permission |
| SD-I019 | Reframe dashboard and docs around owner-control operating model | Codex | Done | Docs and first-screen UI now emphasize observe, monitor, approve, pause, and redirect instead of manual CRM operation |
| SD-I020 | Add sender-health readiness object before provider send can be enabled | Codex | Done | `signaldeskSenderDomains` now tracks domain/auth/ramp/bounce/complaint/unsubscribe/brand risk; email handoff/send is blocked when sender domain is not ready |
| SD-I021 | Add channel-window state to assisted channel handoffs | Codex | Done | WhatsApp/Instagram/Messenger window state records are API-writable, workspace-readable, timeline/audit tracked, and channel health aware |
| SD-I022 | Add provider-source retention and Place ID refresh state | Codex | Done | Provider-source retention records are typed, collection-backed, read-only to clients, and refreshable through a protected server action without raw payload storage |
| SD-I023 | Add owner approval-packet summary model | Codex | Done | Drafts now create approval packets; owners can regenerate packets from approvals or targets |
| SD-I024 | Add AI quality monitoring summary | Codex | Done | Model route runs now write `signaldeskModelEvals` with confidence/pass/rejected-fact summary state |
| SD-I025 | Add provider account registry and budget governor | Codex | Done | Provider accounts, provider budget policies, per-run/daily/monthly checks, and spend increments are implemented |
| SD-I026 | Add AI model router | Codex | Done | AI assist resolves `signaldeskModelRoutes`, blocks inactive/non-Gemini routes, checks AI provider budget, and writes model timelines/evals |
| SD-I027 | Add vendor run ledger and normalized enrichment result model | Codex | Done | Source-provider and waterfall paths write `signaldeskVendorRuns` and `signaldeskEnrichmentResults` summaries without durable raw payloads |
| SD-I028 | Add enrichment broker adapters | Codex | Not started | Apollo, Hunter, ZeroBounce, Firecrawl, Tavily/Exa, and Places adapters must run only through source policy, budget policy, and audit |
| SD-I029 | Add market pod planner | Codex | Done | Rules-based market pod recommender writes confidence, recommendation, reason, owner-safe next actions, audit, cost, and run timeline without paid adapters |
| SD-I030 | Add weekly strategist memo | Codex | Done | Weekly memo action summarizes targets, approvals, replies, demand, outcomes, source runs, provider quality, spend, risks, and next owner decisions without strong-model spend |
| SD-I031 | Add provider evaluation harness | Codex | Done | Provider evaluation records compare existing vendor/enrichment evidence by blocked rate, verified-contact rate, useful results, cost, risk, and recommendation; no live adapter call |
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
| SD-I043 | Add Trust Partner Rail runtime | Codex | Done | Partner profiles, niche tests, flat-fee budget-checked deals, lean briefs, deliverables, compact metrics, renewal decisions, partner pause scope, UI, rules, indexes, audit, cost, timeline, and verifier coverage implemented; real partner spend still needs active budget approval |
| SD-I044 | Add Content Distribution Rail runtime | Codex | Done | Content route, source registry, content assets, platform draft generation, approval/reject/schedule flow, calendar queue, performance capture, content pause scope, rules, indexes, audit, cost, timeline, docs, and verifier coverage implemented; no auto-publish or social adapter added |
| SD-I045 | Add solo-founder Operating Layer runtime | Codex | Done | `/signaldesk/mission`, Daily Growth Mission records, experiment cards, offer CTAs, reply playbooks, source quality snapshots, seed defaults, rules/indexes, action API, workspace UI, cost/audit/timeline writes, and verifier coverage implemented; no provider send, paid campaign, public SignalDesk page, auto-publish, or MenuList truth write added |
| SD-I046 | Add source-policy expiry enforcement | Codex | Done | Source policies now carry `expiresAt`/retention expiry and stale policies are blocked across import, provider run, enrichment, evidence, draft, approval, handoff/export, and source-quality paths |
| SD-I047 | Add mobile read-only runtime gate | Codex | Done | Mobile requests are marked with `x-signaldesk-client-mode`, action mutations are blocked server-side, and mobile kill-switch use is pause-only |
| SD-I048 | Add local workflow and security-rules smoke harnesses | Codex | Done | Added emulator workflow smoke and Firestore/Storage rules verifier; local checks cover expired source policy, first-build workflow state, public denial, storage denial, and no MenuList truth writes |
| SD-I049 | Harden email export sender readiness | Codex | Done | Export-only email records now require a ready sender domain in addition to approval, source policy, evidence, suppression, and contactability checks |
| SD-I050 | Add internal team access management | Codex | Done | Settings now lets founder admins add/update/deactivate SignalDesk team members by login email, assign roles, audit changes, and keep mobile/public access blocked |
| SD-I051 | Add FHRS/FHIS UK source provider | Codex | Done | Official UK food-business establishment seed added behind feature flag, source policy, provider account/budget, retention, verifier, and local E2E; no contact permission, public hygiene-rating feature, or send enablement |
| SD-I052 | Add dashboard lead-batch search flow | Codex | Done | Dashboard exposes Market Search presets and Today's Lead Batch; Mission exposes Research Agent Table and Today's Lead Batch with up to 30 pass/unsure leads, evidence, contact path, share message, and next safe action; failed rows stay out of the daily batch, source-policy/provider gates remain in force, and no send automation was added |
| SD-I053 | Run first activation-proof operating trial | Founder + Codex | In progress | Founder approved the exact zero-spend Bengaluru preparation envelope; code-side defaults and operating pack are ready, while real permissioned businesses, founder-authenticated QA runtime approval, and sender identity remain external gates |
| SD-I054 | Implement bounded Revenue Operating Layer | Codex | Done | Added `/signaldesk/revenue`, deterministic account qualification, commercial opportunities, immutable offer versions, policy-referenced operating envelopes, activation watches, compact revenue/founder-attention summaries, audit/timeline/cost writes, feature gate, API/DAL/types, and private UI |
| SD-I055 | Add revenue rules, indexes, and deterministic E2E coverage | Codex | Done | Revenue collections are internal-read/server-write only; local E2E covers concurrent idempotency, suppression, currencies, immutable IDs/versions, active-pod/budget/sender gates, expiry/hold/approval history, activation-driven opportunity close, exact summaries, and no MenuList truth writes |
| SD-I056 | Close first-trial operating-loop gaps | Codex | Done | Aligned the create-only held zero-budget seed and first-run UI defaults to the Bengaluru recommendation; the exact unapproved legacy Mumbai seed migrates once while reseeding cannot overwrite founder pod approval; interested replies now create/reuse eligible revenue state; outcomes refresh activation projections automatically; expired seven-day watches read as stalled; Daily Growth Mission prioritizes revenue/activation exceptions and summarizes founder attention and spend; manual recheck remains recovery-only |
| SD-I057 | Cross-check revenue authority and long-history integrity | Codex | Done | Added founder-only market-pod approve/hold/reject, blocked unreviewed active pods from envelopes, stopped recommendation/research from self-activating or attaching spend, limited win/customer authority to two-surface activation, and replaced unordered outcome truncation with indexed earliest/latest/terminal derivation plus E2E regressions |
| SD-I058 | Run social-evidence-informed Bengaluru activation trial | Founder + Codex | In progress | Exact zero-external-spend plan approved: first daily cap of five public evidence-only candidate reviews completed (3 Pass, 1 Unsure, 1 Fail); 12 evidence packets, 5 private previews, 3 activations, 1 proof asset, and partner referral test remain pending; no business has been contacted |
| SD-I059 | Align first-trial runtime defaults with approved evidence | Codex | Done | Replaced Pune presets with Bengaluru, made public-business research evidence-only by default, separated permissioned manual introductions, set manual experiment/activation outcomes, held Google Places at zero approval/budget, and made the first trust-partner test zero-spend |
| SD-I060 | Implement measurable AI shadow review | Codex | Done | Reused provider AI run and model-evaluation records for founder accept/edit/reject/hold review, cumulative quality and attention metrics, replacement-safe transactions, audit/timeline evidence, desktop controls, hard mobile blocking, static verifier checks, and Firestore-emulator E2E; no external action or new collection added |
| SD-I061 | Implement AI Volume Mode | Codex | Done | Added founder-only bounded batches, fast generation, independent critic, same-provider escalation, maximum estimated cost, idempotent paid retries, partial-failure preservation, parent/child visibility, audit/cost/timeline evidence, mobile blocking, verifier, and emulator E2E without new collections or external-action authority |
| SD-I062 | Implement AI Distribution Workbench row outputs | Codex | Done | Research Agent Table rows now store evidence summary, recommended channel, recommended CTA, and recommended message angle; Dashboard lead cards render those fields beside share plan and next action while keeping provider send, public pages, and MenuList truth writes unchanged |
| SD-I063 | Recover expired AI Volume parents | Codex | Done | Desktop persists and reuses the bounded retry payload; expired running parents reconstruct child IDs, calls, and estimated cost; finalize completed/partial/blocked without provider calls; write stable recovery audit/timeline evidence; and release only their owned six-minute lock, with verifier and emulator coverage |
| SD-I064 | Close full activation-control cross-check defects | Codex | Done | Tightened suppression/source-use route checks, import dedupe, proof scopes, outcome fingerprinting and durable activation projection, atomic provider-scoped webhooks, mobile emergency pause usability, five-item primary navigation, Date serialization, self-only member reads, and SignalDesk-local session-provider isolation; added deterministic E2E, semantic-rules, browser, and static regressions without provider send, deployment, or MenuList runtime changes |
| SD-I065 | Separate prepared outreach from completed manual contact | Codex | Done | Export preparation now leaves the target uncontacted and requests a manual contact action; the bounded action permits only fresh unconsumed email exports or permissioned partner introductions, fingerprint-binds retries, cannot overwrite concurrent suppression, records safe projections, suppresses wrong contacts, and transactionally arbitrates structured approve/reject decisions without CRM scope, provider send, Firebase schema, or MenuList writes |

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
| SD-F013 | `signaldesk-trust-partner-rail` doc set | Done | Created internal doc set for B2B trust-channel partner tests, lean briefs, deliverables, disclosure gates, and renewal decisions |
| SD-F014 | `signaldesk-content-distribution-rail` doc set | Done | Created internal doc set for source assets, canonical messages, approval-gated channel drafts, calendar queue, performance capture, compliance, Firebase, mobile, and tests |
| SD-F015 | `signaldesk-operating-layer` doc set | Done | Consolidated doc set created for Daily Growth Mission, experiment cards, offer CTA OS, reply playbooks, source quality learning, Firebase, compliance, mobile, and tests |
| SD-F016 | `signaldesk-offer-cta-os` doc coverage | Done | Covered in consolidated Operating Layer docs and runtime through `signaldeskOfferCtas`; no public claim library exposed |
| SD-F017 | `signaldesk-self-serve-proof-funnel-bridge` doc set | Deferred | MenuList-side claim/upload/preview/approval/publish route remains separate work; SignalDesk only stores offer CTA and outcome-watcher context |
| SD-F018 | `signaldesk-reply-to-conversion-assistant` doc coverage | Done | Covered in consolidated Operating Layer docs and runtime through approved reply playbooks; replies remain approval/manual-route controlled |
| SD-F019 | `signaldesk-objection-pricing-intelligence` doc set | Deferred | Reply playbooks exist; aggregate objection frequency and pricing analytics remain future learning work after real replies exist |
| SD-F020 | `signaldesk-experiment-cards` doc coverage | Done | Covered in consolidated Operating Layer docs and runtime through `signaldeskExperimentCards` and review decisions |
| SD-F021 | `signaldesk-source-quality-learning` doc coverage | Done | Covered in consolidated Operating Layer docs and runtime through `signaldeskSourceQualitySnapshots` |
| SD-F022 | `menulist-activation-concierge` doc/runtime foundation | Done | Created separate MenuList-side docs and existing-surface runtime foundation in `../menulist-activation-concierge/`; MenuList owns activation truth and SignalDesk observes outcomes only |
| SD-F023 | Origami-style Research Agent Table | Done | Prompt-to-table workflow implemented in SignalDesk Mission with governed provider run, enrichment rows, pass/fail/unsure scoring, source transparency, idempotency, market-pod update, verifier, and local E2E; no Origami API integration or send automation |
| SD-F024 | Source-rights and allowed-route hardening | Done | Field-level rights registry, legacy review-required handling, current-policy row revalidation, research-only state, and no-contact route enforcement implemented |
| SD-F025 | Verified activation outcome contract | Done | Owner-qualified/review timestamps, distinct surfaces, evidence, idempotency, legacy-unverified rejection, activation-opportunity read model, and emulator fixtures implemented |
| SD-F026 | Signed outcome bridge receiver | Done locally | HMAC/timestamp/rate/body/route-token/idempotency receiver implemented in SignalDesk; external secret provisioning and MenuList-owned emitter remain blocked |
| SD-F027 | Proof-rights ledger | Done | Founder-controlled revocable proof permissions implemented and rechecked before customer-proof asset/draft use |
| SD-F028 | Complaint circuit breaker | Done | Complaint/privacy/legal replies suppress, open incident, pause channel, audit, and outrank new approval work |
| SD-F029 | Five-destination operator shell | Done | Today, Opportunities, Conversations, Activations, and Controls are primary Ant Design navigation; protected deep routes remain available from Controls |

## Founder Decisions Needed

| ID | Decision | Status | Default |
| --- | --- | --- | --- |
| SD-Q001 | Runtime repo location | Done | Implement as product-isolated module inside this monorepo first; keep extraction-ready boundaries |
| SD-Q002 | Firebase project IDs | Blocked | `menulist-signaldesk-qa` and `menulist-signaldesk` |
| SD-Q003 | First market pod | Done | Founder approved Bengaluru, Indiranagar + Koramangala, independent cafes/dessert shops/QSR/customer-facing cloud kitchens, manual/in-person first, zero external spend |
| SD-Q004 | First sender identity | Blocked | Founder identity, low-volume email/export first |
| SD-Q005 | Physical address policy | Blocked | Needed before commercial email |
| SD-Q006 | First approved source list | In progress | Public business research is approved for 30-day candidate/evidence review only with contact and personalization blocked; the first real permissioned business list is still required before contact |
| SD-Q007 | Product code | Done | `PRODUCT_IDS.SIGNALDESK = "SD"` added in the foundation runtime implementation |
| SD-Q008 | First monthly paid-provider budget | Blocked | Registry/budget governor exists; owner still needs to approve the first real monthly provider cap |
| SD-Q009 | First paid-provider eval set | Blocked | Choose whether first eval uses Apollo, Hunter, ZeroBounce, Firecrawl, Tavily/Exa, Postmark/Resend, or a smaller subset |
| SD-Q010 | First strong-model budget | Blocked | Choose weekly strategist/adjudication cap before GPT-5.4/5.5 or Claude Opus style calls are enabled |
| SD-Q011 | Sequencer rail evaluation | Blocked | Decide whether Smartlead, Instantly, lemlist, or no sequencer should be evaluated after sender health is ready |
| SD-Q012 | Sender-domain risk policy | Blocked | Decide whether cold outreach uses primary domain, subdomain, separate domain, or no automated sender; no domain-rotation default |
| SD-Q013 | First self-service proof CTA | Done | No-cost current-list consistency audit plus private MenuList preview; owner reviews before publish and customer viewing requires no identity |
| SD-Q014 | First trust partner niche and budget | In progress | Menu photographers and restaurant consultants approved for a zero-fee learning test; one real permissioned partner still needs to be selected |
| SD-Q015 | First content proof asset and channel mix | In progress | Exact existing-field run contract is prepared in `../menulist-marketing-distribution/menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md`; one permissioned before/after proof can feed LinkedIn, X, short-video, full-case, and partner-brief jobs, while creation/publication still waits for a real activation, item-level owner permission, and founder approval |

## Boundaries

- Foundation runtime code created.
- No Firebase project created or deployed.
- No provider configured.
- No provider send executed.
- No paid provider account purchased or connected; only the internal provider registry and budget controls were implemented.
- No AI model provider beyond the existing gated Gemini assist path was implemented; model routes for stronger providers remain held until adapter/account approval.
- No public page created.
- No MenuList owner/customer surface changed.
- No content auto-publish adapter added.
