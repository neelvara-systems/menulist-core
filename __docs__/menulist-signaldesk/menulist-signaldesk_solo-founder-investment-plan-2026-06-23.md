# MenuList SignalDesk - Solo Founder Investment Plan

**Status:** Adopted planning guidance
**Created:** June 23, 2026
**Audience:** Danny, MenuList growth team, implementers
**Scope:** How SignalDesk should use paid AI models and third-party providers so a solo technical founder can rely on the system for MenuList distribution.

## Core Verdict

SignalDesk should become the internal MenuList distribution operating system.

The investment should buy leverage in four places:

1. better source coverage;
2. better evidence and targeting judgment;
3. safer outbound preparation;
4. better monitoring, learning, and budget control.

The investment should not buy uncontrolled sending, generic lead-list blasting, raw provider dependency, or public SignalDesk product scope.

Danny's target role stays:

```txt
observe -> monitor -> approve -> pause or redirect
```

SignalDesk's target role becomes:

```txt
plan market pods
-> discover candidates
-> enrich and verify
-> inspect evidence
-> score fit and risk
-> draft grounded outreach
-> prepare approval packets
-> route replies
-> attribute MenuList outcomes
-> recommend the next market move
```

## Research Sources

| Area | Sources used | Planning impact |
| --- | --- | --- |
| Apollo | [People API Search](https://docs.apollo.io/reference/people-api-search), [People Enrichment](https://docs.apollo.io/reference/people-enrichment), [API pricing](https://docs.apollo.io/docs/api-pricing) | Apollo can help with B2B/person/company discovery, but email/phone enrichment consumes credits and must run through source-policy, verification, suppression, and budget gates. |
| Hunter | [Pricing](https://hunter.io/pricing), [Email Verifier API](https://hunter.io/api), [Hunter API help](https://help.hunter.io/en/articles/1970956-hunter-api) | Good candidate for domain/email finding and verification, but every search/verification must be budgeted and attached to a source policy. |
| ZeroBounce | [Pricing](https://www.zerobounce.net/pricing), [Email validation API](https://www.zerobounce.net/apis/email-validation-api) | Useful as a dedicated verification layer before email export/send; one email validation is one credit. |
| Google Places | [Usage and billing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing), [field masks](https://developers.google.com/maps/documentation/places/web-service/choose-fields), [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id), [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) | Useful for local candidate discovery only. Use narrow field masks, retain Place IDs carefully, refresh stale Place IDs, and avoid treating provider content as durable prospect truth. |
| Firecrawl | [Pricing](https://www.firecrawl.dev/pricing) | Useful for controlled website extraction after a candidate is found; scrape/crawl/map/monitor are credit-based per page, so crawl scope must be capped. |
| Tavily | [Pricing](https://www.tavily.com/pricing), [FAQ](https://docs.tavily.com/faq/faq) | Good low-friction search/research API for agent evidence gathering; start with capped research tasks and compare quality against Exa. |
| Exa | [Pricing update](https://exa.ai/docs/changelog/pricing-update), [Search API guide](https://exa.ai/docs/reference/search-api-guide) | Good semantic/deep-search candidate for higher-quality research, not every target. Use for market briefs and high-value accounts. |
| OpenAI | [API pricing](https://openai.com/api/pricing/), [GPT-5 mini docs](https://developers.openai.com/api/docs/models/gpt-5-mini) | Use cost-efficient models for structured packet generation and reserve flagship models for strategic decisions or difficult adjudication. |
| Google Gemini | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini models](https://ai.google.dev/gemini-api/docs/models) | Keep Gemini for high-volume extraction/classification; Flash-Lite/Flash-style models fit cheap repeated tasks, Pro-style models fit hard review. |
| Anthropic | [Claude Opus](https://www.anthropic.com/claude/opus), [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) | Strong candidate for hard weekly strategist/adjudication work, not every row. Prompt caching and batch modes should be used where repeat context exists. |
| Resend/Postmark | [Resend pricing](https://resend.com/pricing), [Postmark pricing](https://postmarkapp.com/pricing), [Postmark streams](https://postmarkapp.com/) | Sender provider choice should optimize deliverability, message streams, webhooks, retention, and operations, not only monthly price. |
| Compliance baseline | [FTC CAN-SPAM guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business), [Gmail sender guidelines](https://support.google.com/mail/answer/81126?hl=en) | Paid tools do not remove MenuList responsibility for sender identity, authentication, opt-out, suppression, and vendor monitoring. |
| Market practice cross-check | [Clay AI lead generation](https://www.clay.com/blog/ai-lead-generation), [Clay Waterfall](https://www.clay.com/waterfall-enrichment), [Clay AI outbound](https://university.clay.com/lessons/use-case-4-ai-outbound), [Smartlead API](https://helpcenter.smartlead.ai/en/articles/125-full-api-documentation), [lemlist API guide](https://help.lemlist.com/en/articles/13333479-use-lemlist-api-for-lead-gen-automation), [n8n lead generation workflows](https://n8n.io/workflows/categories/lead-generation/), [Zapier lead enrichment](https://zapier.com/blog/lead-enrichment/), [Make lead processing](https://www.make.com/en/automate/lead-generation-processing), [Gartner B2B buyer AI survey](https://www.gartner.com/en/newsroom/press-releases/2026-05-20-gartner-survey-finds-sixty-nine-percent-of-b-two-b-buyers-turn-to-sales-reps-to-validate-ai-generated-insights) | Current market stacks use data layers, waterfall enrichment, AI personalization, CRM checks, sequencer handoff, and visible automations. SignalDesk should adopt those control patterns without adopting uncontrolled scraping, auto-send, or sequencer-first architecture. |

## Recommended Provider Stack

This is the recommended stack to evaluate first. It is intentionally provider-replaceable.

| Layer | Start with | Why | Hard gate |
| --- | --- | --- | --- |
| Local business discovery | Google Places Text Search | Already implemented behind source-provider flag; strong for city/category discovery. | Narrow field mask, source policy, cap, no durable raw payload. |
| Local discovery fallback | Apify Source Broker | Useful when a controlled Actor gives better local-candidate coverage for a market pod. | Env-controlled Actor, provider approval, budget cap, source policy, no raw payload storage, no direct send. |
| Website inspection | Firecrawl | Extract official website/menu/contact clues without building our own crawler first. | Per-target page cap and retention class. |
| Web evidence research | Tavily first, Exa as challenger | Tavily is simple and cheap to start; Exa is better candidate for semantic/high-quality account research. | Provider eval score before default routing. |
| B2B/company/person enrichment | Apollo | Useful for chains, high-value restaurant groups, agencies, franchise operators, and non-local SMB partners. | Not default for every local restaurant; email/phone reveal requires budget and compliance approval. |
| Email finding/verification | Hunter plus ZeroBounce eval | Hunter can find/verify, ZeroBounce can independently validate. | No export/send without verification status and suppression check. |
| Email delivery | Postmark or Resend | Resend is cheaper and developer-friendly; Postmark has mature deliverability/message-stream posture. | Sender health, physical address, unsubscribe, bounce, complaint, suppression, domain authentication. |
| High-volume AI | Gemini Flash/Flash-Lite-class model | Cheap extraction, classification, reply triage, and field normalization. | Structured output, evals, cost cap. |
| Approval-packet AI | GPT-5 mini or Gemini Flash | Good balance for evidence summaries, draft checks, risk reasons, and next-action packets. | Must cite internal evidence IDs and rejected facts. |
| Strategic AI | GPT-5.4/5.5 or Claude Opus | Use only for weekly strategist, campaign thesis, difficult market choices, and vendor performance diagnosis. | Budget cap, batch/caching where possible, human approval before strategy changes. |
| Sequencer/execution rail | Smartlead, Instantly, or lemlist only as later evaluation candidates | Market teams often use these as the execution layer after enrichment and copy are ready. | Not before sender health, unsubscribe, suppression, bounce/complaint, domain risk, and low-volume ramp are proven. |

## Market-Practice Plan Updates

The June 23 market cross-check added these plan changes:

| Market pattern | SignalDesk update |
| --- | --- |
| Clay-style waterfall enrichment | Add enrichment waterfall policy before connecting multiple providers. |
| CRM duplicate checks before messaging | Add duplicate, prior-conversation, suppression, and prior-outcome spend guards before enrichment/export/handoff/send. |
| Audience and signal-based plays | Add dynamic audience/signal segment state on top of market pods. |
| AI-generated personalization at scale | Keep personalization evidence-bound; every custom line must cite an evidence ID or be rejected. |
| Smartlead/Instantly/lemlist sequencer handoff | Add sequencer handoff model later, but keep SignalDesk as the control layer. |
| n8n/Make/Zapier-style workflow visibility | Add run timeline/graph visibility without exposing raw logs by default. |
| Sender warmup/domain operations | Add sender-domain risk model; DNS/auth, volume ramp, bounce, complaint, unsubscribe, and brand-risk monitoring are required. |
| Self-service buyer behavior | Default CTAs should point to MenuList proof and activation, not only book-a-call. |

## Apollo Decision

Apollo should be added, but not as the default lead source for every local restaurant.

Use Apollo for:

- restaurant groups, chains, franchise operators, cloud kitchens, F&B consultants, agencies, and partner businesses;
- finding likely owner/operator/marketing contacts when the target value justifies enrichment cost;
- company enrichment when the domain/company is known but the decision-maker is unclear;
- validation of firmographic context for high-value opportunities.

Do not use Apollo for:

- blind mass imports;
- contact reveal before source policy approval;
- phone outreach without consent review;
- replacing MenuList-owned signals, referrals, public website evidence, or manual local market knowledge;
- storing raw provider payloads as durable SignalDesk truth.

Important Apollo planning facts:

- People API Search is for net-new people discovery and the official docs say that endpoint does not consume credits, but it also does not return email or phone values.
- People enrichment and waterfall enrichment can consume account credits when email or phone data is requested.
- Therefore SignalDesk needs a credit ledger before any Apollo enrichment adapter is enabled.

## AI Model Router

The current runtime has a Gemini assist path. The investment-grade version needs a model router instead of a single-provider assumption.

### Task Routing

| Task | Default model class | Escalation model class | Reason |
| --- | --- | --- | --- |
| Normalize import rows | Cheap Gemini/OpenAI mini | None unless parse failures spike | Deterministic, high volume, low judgment. |
| Classify target fit | Cheap Gemini/OpenAI mini | GPT-5 mini when confidence is low | Needs consistent labels and confidence. |
| Extract official website evidence | Gemini Flash/Flash-Lite or GPT-5 mini | Exa/Tavily plus stronger model for high-value targets | Needs grounded evidence and rejected facts. |
| Draft outreach | GPT-5 mini or Gemini Flash | GPT-5.4/5.5 or Claude Opus for high-value accounts | Needs quality, tone, no unsupported claims. |
| Reply classification | Cheap Gemini/OpenAI mini | Stronger model for ambiguous replies only | Most replies are simple labels. |
| Approval packet | GPT-5 mini | Stronger model for high-risk/high-value packets | Founder needs clear decision context. |
| Weekly strategist | Strong model | Strong model with deeper research | This is where expensive reasoning is justified. |
| Vendor performance audit | Strong model | Human review | Expensive but low frequency. |

### Router Rules

- Every AI run records provider, model, task, prompt version, input source IDs, output schema version, confidence, cost estimate, and budget policy.
- No AI run can approve source legality, infer consent, override suppression, or enable provider send.
- Strong models run only on sampled rows, high-value targets, low-confidence cases, weekly summaries, and owner-requested deep reviews.
- Batch and prompt caching should be used where provider terms and task shape allow it.
- If two providers disagree on a high-value approval packet, the packet is held for owner review instead of auto-selected.

## Powerful Operating Architecture

SignalDesk should behave like a team of bounded internal agents, not one giant workflow.

| Agent | Job | Output |
| --- | --- | --- |
| Market Pod Planner | Chooses city, category, offer angle, source mix, and budget proposal from outcomes and demand signals. | Market pod brief waiting for owner approval. |
| Source Scout | Runs approved source-provider searches and manual source imports within caps. | Candidate batch with source policy, cost, and retention. |
| Website Evidence Extractor | Visits official sites and extracts concrete MenuList-relevant clues. | Evidence packet with accepted facts and rejected facts. |
| Enrichment Broker | Decides whether Apollo, Hunter, ZeroBounce, Places, Firecrawl, Tavily, or Exa is worth spending on for this target. | Provider run plan and enrichment result. |
| Waterfall Governor | Applies provider order, max credits, verification requirement, and stop conditions for each enrichment field. | Approved enrichment waterfall run or hold reason. |
| Fit/Risk Scorer | Scores MenuList fit, current-list gap, contactability, source risk, and outreach risk. | Target score and next action. |
| Offer/Angle Planner | Matches target to a MenuList angle without unsupported claims. | Approved angle candidates. |
| Draft Generator | Builds email/WhatsApp/Instagram/Messenger handoff drafts from approved facts only. | Draft with unsupported-claim check. |
| Compliance Gate | Checks source use, suppression, sender readiness, channel window, unsubscribe, and risk state. | Pass/hold/block decision. |
| Approval Packet Builder | Compresses everything into a founder decision packet. | Approve, hold, reject, pause, redirect options. |
| Sequencer Handoff Broker | Sends approved rows to a sequencer only if execution-rail, sender, suppression, and low-volume ramp gates pass. | Export/handoff record or blocked reason. |
| Reply/Outcome Learner | Classifies replies, suppresses risk, and maps outcomes back to source/channel/pod. | Learning summary and attribution update. |
| Weekly Strategist | Reviews performance, cost, complaints, conversion, and next market pod. | Weekly founder memo. |
| Cost/Provider Governor | Stops runaway provider use and compares providers by real outcome, not only data volume. | Budget incident or provider recommendation. |

## Data Model Additions Needed

The existing SignalDesk model already has cost summaries, source policies, source runs, evidence, AI runs, approvals, conversations, outcomes, and channel health. The investment-grade version needs these additions.

| Collection/object | Purpose |
| --- | --- |
| `signaldeskProviderAccounts` | Provider account status, allowed use, credential presence, rate limits, owner approval, and disabled reason. |
| `signaldeskBudgetPolicies` | Daily/monthly caps by provider, market pod, task, and channel. |
| `signaldeskVendorRuns` | Every Apollo/Hunter/ZeroBounce/Firecrawl/Tavily/Exa/Places run with input hash, output count, cost, result quality, and retention. |
| `signaldeskEnrichmentResults` | Normalized provider output with source policy, confidence, field-level provenance, expiry, and raw-payload pointer only if allowed. |
| `signaldeskEnrichmentWaterfalls` | Provider order, requested field, max credits, stop condition, verification rule, fallback behavior, and retention policy. |
| `signaldeskModelRoutes` | Routing policy for AI tasks, fallback model, escalation trigger, max tokens, and cost ceiling. |
| `signaldeskModelEvals` | Sampled AI quality checks, edit rate, disagreement rate, hallucination/rejected-fact rate, and pass/fail. |
| `signaldeskApprovalPackets` | Founder-ready packet combining target, source, evidence, risk, draft, channel, cost, and action choices. |
| `signaldeskMarketPods` | City/category/offer/channel/source/budget plan with status and outcome metrics. |
| `signaldeskAudienceSegments` | Dynamic criteria for source, signal, fit, status, outcome, geography, category, and trigger-based plays. |
| `signaldeskSequencerHandoffs` | Execution-rail exports to Smartlead/Instantly/lemlist or similar, including sender, campaign, suppression, unsubscribe, and provider status. |
| `signaldeskSenderDomains` | Domain/inbox readiness, authentication, volume ramp, bounce, complaint, unsubscribe, reputation, and brand-risk state. |
| `signaldeskRunTimelines` | Human-readable run graph/timeline for source, enrichment, AI, approval, handoff, reply, and outcome events. |
| `signaldeskWeeklyStrategyMemos` | Strong-model weekly summary with recommendations and evidence links. |

## Budget Tiers

These are planning tiers, not account purchases.

| Tier | Monthly spend | What it buys | Use when |
| --- | ---: | --- | --- |
| Lean | $100-$250 | Cheap model calls, small Firecrawl/Tavily usage, low email provider plan, limited verification. | Prove workflow quality with one city/category and manual approvals. |
| Serious solo founder | $300-$700 | Apollo/Hunter/ZeroBounce eval, Firecrawl/Tavily/Exa mix, GPT-5 mini/Gemini routing, sender provider, better monitoring. | Recommended starting investment once first market pod is approved. |
| Aggressive internal growth | $1,000-$2,000 | More enrichment, stronger model strategist, provider comparisons, more market pods, paid verification, stronger deliverability ops. | Use only after the system proves outcome quality and complaint risk stays low. |

Do not buy annual/high-volume provider plans before SignalDesk has:

- provider account registry;
- budget policies;
- vendor run ledger;
- suppression checks;
- approval packet model;
- outcome attribution;
- provider quality evaluation.

## Build Slices

This is the safest build order from the current implementation state.

| Slice | Work | Exit criteria |
| --- | --- | --- |
| A | Provider registry and budget governor | Every paid provider has allowed use, monthly cap, per-run cap, disabled reason, and owner approval state. |
| B | Model router and AI eval ledger | AI tasks route by cost/quality, log model runs, and hold low-confidence or conflicting outputs. |
| C | Audience/signal segments and prior-outcome guard | Market pods can target dynamic signals and stop spend on converted, suppressed, contacted, or in-conversation targets. |
| D | Enrichment waterfall policy and vendor run ledger | Apollo, Hunter, ZeroBounce, Firecrawl, Tavily/Exa/Places can run only through approved waterfalls, source policies, budget policies, and stop conditions. |
| E | Approval packet runtime | Founder sees one compressed packet with evidence, rejected facts, source use, cost, channel readiness, suppression, draft, and action choices. |
| F | Evidence-bound offer and draft generator | Every personalization line cites evidence; unsupported claims are rejected; default CTAs point to MenuList proof or activation. |
| G | Sender-domain readiness and execution-rail eval | Postmark/Resend/Smartlead/Instantly/lemlist are selected only after authentication, unsubscribe, bounce, complaint, suppression, domain-risk, and low-volume ramp checks pass. |
| H | Run timeline and provider evaluation harness | Founder can inspect what happened, and providers are compared by verified contact rate, evidence quality, reply quality, cost, suppression risk, and outcomes. |
| I | Reply and outcome learner | Replies and MenuList outcomes update market pod, source, model, and provider quality metrics. |
| J | Weekly strategist | Strong model writes a weekly founder memo with clear next approval decisions. |

Paid campaign automation remains outside this plan until Danny explicitly approves spend automation. Firebase deploy remains outside this plan until Danny explicitly asks to deploy.

## Implementation Status - June 23, 2026

The internal foundation for slices A through H now exists in code:

| Slice | Current status |
| --- | --- |
| A Provider registry and budget governor | Implemented internally with provider accounts, provider budget policies, cap checks, spend increments, and workspace visibility. |
| B Model router and AI eval ledger | Implemented for the existing Gemini assist path; OpenAI/Anthropic routes are policy records held until adapter/account approval. |
| C Audience/signal segments and prior-outcome guard | Implemented as segment records plus prior-contact/outcome guards across draft, enrichment, export, handoff, and sequencer paths. |
| D Enrichment waterfall policy and vendor run ledger | Implemented as policy/ledger/result records; external Apollo/Hunter/ZeroBounce/Firecrawl/Tavily/Exa adapters are not connected. |
| E Approval packet runtime | Implemented for draft-created and regenerated approval packets. |
| F Evidence-bound offer and draft generator | Implemented with evidence IDs, source-policy refs, CTA refs, and unsupported-claim slots. |
| G Sender-domain readiness and execution-rail eval | Implemented as sender-domain risk records and blocked/ready sequencer handoff records; no provider send or sequencer API call is enabled. |
| H Run timeline and provider evaluation harness | Run timelines are implemented; provider comparison harness remains future work after real provider evals exist. |

The next work is not another internal-control foundation pass. It is authenticated smoke data, owner decisions, then one narrow external provider adapter behind the gates above.

## First 30-Day Operating Plan

| Week | System work | Founder decision |
| --- | --- | --- |
| 1 | Build provider registry, budget policies, model router, and one approval packet prototype. | Approve first market pod and max monthly provider budget. |
| 2 | Add audience/signal segment, prior-outcome guard, and enrichment waterfall policy; run 25-50 targets through Places/manual source plus website evidence extraction. | Approve whether Apollo/Hunter/ZeroBounce are allowed on high-value targets only. |
| 3 | Compare provider results by evidence quality, verified contact rate, suppression risk, packet usefulness, and duplicate/prior-contact savings. | Pick default enrichment waterfall for the next pod. |
| 4 | Produce first weekly strategist memo and outcome/cost review; decide whether to evaluate a sequencer rail without enabling send. | Approve scale, pause, redirect, or keep learning. |

## Success Metrics

The system is powerful only if it reduces founder work and improves MenuList outcomes.

| Metric | Target behavior |
| --- | --- |
| Founder review time | Founder reviews packets and weekly memos, not raw lists. |
| Approval packet quality | Packets contain enough evidence to approve/reject in under two minutes. |
| Provider ROI | Vendor spend is tied to verified contacts, replies, route starts, uploads, previews, publishes, and two-surface activations. |
| AI reliability | Low hallucination/rejected-fact rate, low human edit rate, stable confidence, clear hold behavior. |
| Source safety | No source runs without policy, retention, cap, and allowed-use state. |
| Waterfall efficiency | Stop-on-first-verified-match and max-credit rules reduce duplicate provider spend. |
| Channel safety | No provider send without sender health and suppression readiness. |
| Personalization quality | Every custom claim is evidence-bound; unsupported or fake personalization is rejected. |
| Learning | The system recommends narrower/better market pods over time. |

## Non-Negotiables

- SignalDesk remains internal-only.
- Every paid provider is behind source policy, budget policy, and audit.
- Every AI output is evidence-bound and schema-bound.
- Every enrichment waterfall has provider order, max credits, stop condition, verification rule, and retention.
- Every owner approval packet shows cost, source, risk, and channel readiness.
- Every personalization line cites evidence or is rejected.
- Every provider spend path checks prior conversation, suppression, and MenuList outcome state first.
- No cold WhatsApp/Instagram/Messenger automation.
- No phone/SMS automation without explicit consent and review.
- No sequencer-first architecture.
- No spreadsheet as production source of truth.
- No domain-rotation or warmup practice without explicit founder approval and brand-risk note.
- No public SignalDesk website/help/marketing surface.
- No provider send until sender/compliance gates pass.
- No paid campaign automation until explicitly approved.
- No Firebase deploy until explicitly requested.

## Implementation Recommendation

Proceed with Slice A, Slice B, and Slice C next.

Do not buy Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, Postmark, Resend, Smartlead, Instantly, or lemlist at scale before those slices exist. For a solo founder, the first failure mode is not lack of providers; it is uncontrolled provider spend, duplicate data, unclear source rights, fake AI personalization, and too many raw decisions reaching the founder.

After Slice A, Slice B, and Slice C, run a small paid-provider evaluation with one market pod and a fixed cap. The default cap should be low enough that a bad provider configuration cannot cause meaningful loss, but high enough to test real quality.
