# Growth Engine - Automation Workflow Blueprint

**Status:** Implementation-readiness blueprint
**Decision date:** June 1, 2026
**Audience:** Founder, growth manager, implementation owner
**Purpose:** Define the owned automation system MenuList needs so Growth Engine can replace generic lead-gen and outreach tools as the distribution operating layer.

---

## 1. Decision

Growth Engine should copy the useful operating patterns from modern GTM tools, but not their product goal.

Generic tools optimize for:

```txt
find contact
-> enrich contact
-> score lead
-> enroll in sequence
-> manage replies
-> push to CRM
```

MenuList needs:

```txt
find restaurant target
-> verify source permission
-> detect menu truth gap
-> score distribution value
-> create claim route
-> activate owner-confirmed MenuList truth
-> publish canonical surfaces
-> notify discovery systems
-> monitor freshness
-> attribute distribution coverage
```

The useful workflows are source orchestration, enrichment waterfalling, scoring, routing, sequencing, sender health, inbox triage, and automation triggers. The moat is MenuList truth activation and distribution coverage.

## 2. Market Workflow Scan

| Tool pattern | What others automate | MenuList adaptation |
| --- | --- | --- |
| Apollo workflows and sequences | Trigger/action workflows, lead prioritization, waterfall contact discovery, multichannel sequences, manual tasks, and automated emails. Sources: https://knowledge.apollo.io/hc/en-us/articles/4413804036109-Create-a-Workflow and https://knowledge.apollo.io/hc/en-us/articles/4409237165837-Sequences-Overview | Use workflows for target qualification, source policy checks, route creation, operator tasks, and feedback rollups. Do not copy generic sales pipeline state. |
| Clay waterfall enrichment | Ordered provider waterfalls, run conditions, auto-update, reusable templates/functions, and provider success tracking. Source: https://university.clay.com/docs/building-a-data-waterfall | Build source and fact waterfalls for business identity, menu URL, owner contact, website, and source confidence. Stop when valid evidence exists. Cache by target/source hash. |
| HubSpot scoring | Fit, engagement, combined scores, labels, workflows, and score-based routing. Source: https://knowledge.hubspot.com/scoring/understand-the-lead-scoring-tool | Score distribution fit, truth gap, contactability, channel risk, surface readiness, freshness risk, owner intent, and economics. Score must drive an action, not just a dashboard. |
| Instantly cold email operating flow | Email account setup, DNS tests, warm-up, unified inbox, sequence setup, lead verification, schedules, and campaign launch checks. Source: https://help.instantly.ai/en/articles/5975326-instantly-cold-email-strategy | Build sender-domain readiness, slow ramp, bounce/unsubscribe webhooks, test sends, and one Growth inbox. Email is one channel, not the core product. |
| lemlist inbox rotation and sending algorithm | Sender rotation, same sender per lead, pacing, target timezone windows, delays between steps, and sending caps. Sources: https://help.lemlist.com/en/articles/8263428-use-inbox-rotation-for-campaigns and https://help.lemlist.com/en/articles/4452763-understand-lemlist-s-sending-algorithm | Assign one sender identity per target, pace sends, avoid bursts, keep target timezone windows, and pause when reputation or complaints move outside policy. |
| Google Business Profile menu operations | Owners can edit menu URLs and choose preferred menu sources; APIs require authorization and existing business relationship. Sources: https://support.google.com/business/answer/9455840 and https://developers.google.com/my-business/content/policies | Growth Engine tracks owner handoff and authorized sync only. No GBP lead-generation use. |
| Apple Business Connect and Bing Places | Business owners or approved partners can manage place cards, business data, action links, menu URLs, and quality checks. Sources: https://www.apple.com/newsroom/2023/01/introducing-apple-business-connect/ and https://cdn.bingplaces.com/tpshared/BingPlaces_API_Latest.pdf | Treat external listing systems as owner-authorized distribution handoffs, not scraping sources or truth authorities. |
| Google menu feeds and structured data | Menu feeds need entity/menu/section/item/price correctness; LocalBusiness structured data helps expose business facts to search. Sources: https://developers.google.com/actions-center/verticals/ordering/redirect/reference/menu-feeds/overview and https://developers.google.com/search/docs/appearance/structured-data/local-business | MenuList canonical truth must be feed-ready, structured, sitemap-ready, and freshness-monitored. |
| Google Places source adapter | Places API Text Search and Place Details require field masks; field choice affects cost; Text Search returns capped pages of candidates; place IDs can be stored indefinitely while broader Places content has caching/storage limits. Sources: https://developers.google.com/maps/documentation/places/web-service/text-search, https://developers.google.com/maps/documentation/places/web-service/place-details, https://developers.google.com/maps/documentation/places/web-service/choose-fields, and https://developers.google.com/maps/documentation/places/web-service/policies | Use Google Places only as a cost-gated candidate source and place identity handle. Persist place IDs, not Google content as MenuList truth. |
| Foursquare place graph model | Foursquare Places exposes search, place fields, category taxonomy, chain membership, related-place signals, and open-source POI schemas. Its pay-as-you-go API terms prohibit using Places Data to contact listed businesses as prospective customers. Sources: https://docs.foursquare.com/developer/reference/places-api-overview, https://docs.foursquare.com/developer/reference/response-fields, https://docs.foursquare.com/data-products/docs/categories, https://docs.foursquare.com/data-products/docs/chains, https://docs.foursquare.com/data-products/docs/fsq-places-open-source, and https://foursquare.com/legal/terms/apilicenseagreement/ | Use Foursquare as an identity/category/chain graph signal only. Block PAYG outreach eligibility unless a separate contract or written permission allows prospecting. |
| WhatsApp Business Platform | WhatsApp Business Terms, Business Messaging Policy, pricing, and Flows require opt-in, opt-out handling, approved templates for business-initiated messages, customer service window awareness, quality monitoring, and structured Flow governance. Sources: https://www.whatsapp.com/legal/business-terms/, https://www.whatsapp.com/legal/business-policy/, https://whatsappbusiness.com/products/platform-pricing/, and https://whatsappbusiness.com/products/whatsapp-flows/ | Use WhatsApp as a consented owner-verification and truth-maintenance rail. Build message governance before API sending. Do not use scraped/enriched phones for cold WhatsApp outreach. |
| Google sender rules and CAN-SPAM | Authentication, spam-rate monitoring, one-click unsubscribe for large marketing/subscribed sends, sender identity, and opt-out handling. Sources: https://support.google.com/a/answer/81126 and https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business | Email cannot launch without sender-domain health, unsubscribe, bounce handling, complaint thresholds, and suppression proof. |

## 3. Owned Automation Workflow

Growth Engine needs one deterministic workflow engine with typed steps, evidence, blockers, and audit logs.

```txt
source intake
-> source policy gate
-> Google Places IDs-only seed discovery where approved
-> Foursquare identity/category/chain enrichment where approved
-> target identity resolution
-> business truth graph candidate edge creation
-> enrichment waterfall
-> AI evidence extraction
-> distribution score
-> action router
-> dry-run
-> approval
-> message governance check
-> channel execution or operator task
-> reply/event ingestion
-> MenuList claim route
-> truth activation
-> public surface publishing
-> discovery publishing
-> freshness monitoring
-> attribution
-> optimization recommendation
```

Every step must be resumable, idempotent, budget-gated, kill-switch-aware, and explainable.

Provider-backed steps must also require an active connection adapter from Connections And Activation.

## 4. Automation Objects

| Object | Responsibility |
| --- | --- |
| Automation workflow | Defines trigger, target set, eligibility rules, actions, caps, approvals, and stop conditions. |
| Connection adapter | Provider handle, secret refs, webhook endpoints, budget cap, kill-switch scope, validation state, and activation state. |
| Workflow run | Immutable execution record for one workflow execution. |
| Decision snapshot | Typed state used to explain why a target was contacted, held, rejected, routed, or published. |
| Evidence packet | Source facts, source URLs, confidence, extracted fields, rejected facts, and expiry. |
| Business truth graph | Candidate and confirmed nodes/edges for business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution relationships. |
| Enrichment waterfall | Ordered providers and AI extraction steps for a specific field or target decision. |
| Distribution score | Fit, truth gap, contactability, surface readiness, freshness risk, channel risk, and economics. |
| Sender assignment | One sender identity per target/campaign, daily cap, ramp state, and health state. |
| Message governance audit | Consent, suppression, template, conversation-window, sender, pacing, reputation, and blocker decision for every outbound attempt. |
| WhatsApp conversation state | Customer service window, free-entry window, latest inbound, template-required state, and suppression state for WhatsApp contacts. |
| Operator work item | Human task for artifact review, WhatsApp assisted send, reply triage, GBP handoff, or incident action. |
| AI worker run | Typed AI input/output, prompt version, source hashes, confidence, cost, eval status, and blocker outcome. |

## 5. AI Operating Model

AI should be used heavily, but only as a bounded worker.

AI workers required:

| AI worker | Input | Output | Hard gate |
| --- | --- | --- | --- |
| Source cleaner | Raw source row/payload | normalized candidate fields and rejected fields | Cannot create truth. |
| Business identity resolver | Candidate facts, graph edges, existing targets, MenuList stores | match decision, candidate graph edges, merge/hold/reject reason | Low confidence goes to human review. |
| Menu truth gap auditor | Public menu URL, owner site facts, MenuList state | gap type, evidence, confidence | No scraped menu fact becomes public truth. |
| Contactability scorer | Allowed contact fields and source policy | channel eligibility and risk | Suppression ledger overrides AI. |
| Artifact drafter | Evidence packet and approved template | private claim/audit draft | Noindex, expiry, and artifact QA required. |
| Message personalizer | Approved variables and template | rendered message variables | No free-form claims. |
| Reply classifier | Inbound message | interested, DNC, opt-out, wrong contact, support, pricing, objection, human review | DNC/complaint/opt-out recall must be perfect on seed fixtures. |
| Pricing responder | Approved pricing policy and reply context | approved answer or human-review block | No pricing invention. |
| Surface validator | Public URL and expected contract | indexability, structured data, canonical, sitemap, freshness state | Discovery publishing blocks on critical failure. |
| Menu feed validator | Confirmed MenuList menu truth | entity/menu/section/item/price validation | Candidate-only facts block export. |
| Optimizer | Aggregated outcomes and costs | expand, pause, review, or stop recommendation | Recommendation only; no autonomous scale-up. |
| Incident summarizer | Complaint/provider/source/AI failure evidence | severity summary and action checklist | Cannot close incident. |

Minimum AI accuracy rule:

- DNC, unsubscribe, complaint, wrong-contact, blocked-source, private-data, pricing-invention, and unverified-truth fixtures must have zero critical misses before autonomy.
- Message and artifact generation must have zero unsupported claims in review fixtures.
- Scoring must include source evidence and rejected facts for every material decision.
- Low confidence cannot be converted into public distribution or sending.

## 6. Scoring Model

Growth Engine needs action-driving scores, not vanity scores.

| Score | Meaning | Action impact |
| --- | --- | --- |
| Distribution fit | Whether the business/location is useful for MenuList coverage. | Reject, hold, or qualify target. |
| Menu truth gap | Whether MenuList can provide a visible improvement. | Claim artifact angle and urgency. |
| Contactability | Whether a safe owner/contact route exists. | Channel eligibility. |
| Source confidence | Whether the evidence is usable under source policy. | Artifact and outreach eligibility. |
| Surface readiness | Whether canonical MenuList surfaces can publish after confirmation. | Distribution publishing readiness. |
| Freshness risk | Whether existing truth needs review soon. | Freshness monitor priority. |
| Channel risk | Email/WhatsApp/legal/deliverability risk. | Channel route or hold. |
| Economics | Expected cost to activation and distribution coverage. | Budget approval and scale recommendation. |

Each score stores:

- numeric value
- label
- source evidence
- blockers
- last calculated at
- prompt/rule version when AI is used
- next recommended action

## 7. Workflow Recipes

These recipes must exist as configurable internal workflows, not hardcoded one-off jobs.

| Recipe | Trigger | Automation |
| --- | --- | --- |
| Approved source import | Source policy approved and run requested | Import, normalize, dedupe, create targets, score, summarize. |
| Target qualification | New or changed target | Run evidence extraction, distribution score, action router. |
| Google Places seed discovery | Approved Places source policy and query plan | Run IDs-only Text Search, persist place IDs/request metadata, dedupe targets, and hold before Details enrichment. |
| Google Places details enrichment | Target passed dedupe/pre-score and field-mask profile is approved | Request only approved fields, update evidence packet, and block public truth usage. |
| Foursquare identity graph enrichment | Approved Foursquare source policy and non-outreach use | Request or import allowed identity/category/chain fields, create candidate graph edges, block PAYG outreach eligibility, and prevent public truth use. |
| Business truth graph rollup | New source evidence, owner confirmation, or surface event | Create or update business/location/menu/source/claim/surface edges, mark low-confidence edges for review, and expose only confirmed MenuList truth to public publishing. |
| Claim artifact readiness | Target eligible and artifact template approved | Draft artifact, check rights, noindex, expiry, QA, approval. |
| Campaign dry-run | Campaign draft saved | Build snapshot, exclusions, samples, sender capacity, surface readiness, cost, blockers. |
| Sender health guard | Sender-domain health changes | Pause sends, reduce ramp, create incident or warning. |
| WhatsApp owner claim verification | Owner submits phone and explicit opt-in on claim page | Create consent event, pick approved verification template, create governance audit, send or queue assisted task, update conversation state, and route reply/Flow output into claim review. |
| WhatsApp stale data confirmation | Confirmed MenuList truth reaches freshness review policy | Check consent category, template status, conversation state, sender quality, pacing, and suppression before sending a confirmation template or creating a human-review task. |
| WhatsApp template/reputation guard | Template quality, sender quality, opt-out, complaint, failure, or reply metrics change | Pause or reduce sends, create incident/work item, and block affected templates/senders until review clears. |
| WhatsApp webhook ingest | Meta webhook received | Verify signature, normalize event, update message attempt, conversation state, suppression, reputation, and attribution. |
| WhatsApp Flow truth capture | Approved Flow submitted | Validate schema, write only approved business-truth fields, update candidate graph edges, and route low confidence to operator review. |
| Inbox triage | New reply/webhook/operator note | Classify, suppress if needed, route interested owners, create human-review tasks. |
| Truth activation | MenuList feedback confirms owner/menu | Update target, publish surface state, queue structured data and sitemap checks. |
| Discovery publish | Canonical public URL changed meaningfully | Queue sitemap update, IndexNow where allowed, truth packet, feed readiness. |
| External listing handoff | Owner-confirmed target has MenuList URL | Create GBP/Apple/Bing handoff task or authorized sync check. |
| Freshness review | Menu/hours/price/outlet age exceeds policy | Create review task, pause discovery updates if stale, alert owner path where supported. |
| Optimization report | Enough outcomes exist | Recommend sources/templates/channels/surfaces to expand, pause, review, or stop. |

## 8. Sender And Channel Automation

Owned email automation should include:

- sender-domain readiness checker
- DNS authentication status
- one-click unsubscribe endpoint health
- visible unsubscribe link policy
- bounce webhook health
- spam-rate warning and block threshold
- sender assignment per target
- sender rotation only for new target assignments
- same sender through a target conversation
- target timezone send windows
- gradual ramp and no burst sending
- open/click tracking policy by sender health
- plain-text fallback
- automatic pause on bounce, complaint, blocklist, DNS, unsubscribe, or webhook failure

WhatsApp remains assisted unless opt-in proof, approved templates, provider readiness, and policy review exist.

WhatsApp API sending requires a Message Governance Layer:

- consent proof with category, source, text shown, timestamp, privacy version, and proof hash
- suppression check immediately before send
- approved template or open customer service window
- conversation state with service-window and free-entry expiry
- sender identity health and allowed use case
- pacing policy below provider throughput
- webhook signature verification and event ingestion
- template quality and sender quality monitoring
- automatic pause on opt-out, complaint, quality drop, template pause/disable, webhook failure, or abnormal failure rate

WhatsApp allowed journeys are owner claim, business verification, public-info correction, incomplete claim recovery, stale data confirmation, support handoff, and owner referral. Scraped or enriched phone numbers must not be used for WhatsApp API outreach without explicit opt-in.

## 9. Operator Workboard

The first UI should behave like a distribution control room.

Primary queues:

1. Safety alerts
2. DNC/complaints
3. Source approval
4. Target holds
5. Artifact review
6. Interested replies
7. WhatsApp assisted
8. GBP/Apple/Bing handoffs
9. Surface health failures
10. Freshness due
11. Discovery publish failures
12. Cost and provider warnings
13. AI eval failures
14. Incidents

Normal work should start from queues and summaries, not raw lead lists.

## 10. Implementation Readiness Verdict

The docs are implementation-ready only if these contracts are present:

| Contract | Required state |
| --- | --- |
| Workflow engine | Typed workflow, run, step, retry, idempotency, budget, approval, and kill-switch model. |
| Connections and activation | Adapter registry, secret refs, email pipeline readiness, WhatsApp pipeline readiness, webhook health, budget caps, kill switches, validation runs, and activation audit. |
| Enrichment waterfall | Provider order, run conditions, cache key, success provider, cost, source-policy approval. |
| Business truth graph | Node/edge schema, source provenance, confidence, truth state, owner confirmation path, and public publish blocker for candidate or low-confidence edges. |
| AI worker registry | Worker purpose, allowed inputs, typed output, prompt version, eval threshold, budget cap. |
| Decision snapshot | Stored explanation for every action and blocker. |
| Sender assignment | One sender per target conversation and sender health gating. |
| WhatsApp governance | Consent ledger, suppression ledger, template registry, conversation state, governance audit, webhook verification, reputation monitor, sender identity policy, pacing policy, Flow definition registry, and kill switches. |
| Operator queue | Every human decision is a work item with owner, severity, SLA, and audit trail. |
| External listing handoff | GBP, Apple Business Connect, and Bing Places tracked as authorized distribution handoffs. |
| Optimization report | Recommendations are generated from outcomes but do not auto-scale without approval. |

These contracts are required before implementation starts.
