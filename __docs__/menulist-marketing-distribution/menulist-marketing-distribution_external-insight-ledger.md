# MenuList External Insight Ledger

**Status:** Supporting evidence archive
**Created:** July 18, 2026
**Owner:** Founder with Codex review
**Scope:** External posts, articles, videos, expert feedback, market observations, AI outputs, competitor examples, and operating ideas relevant to MenuList marketing, launch, distribution, video, positioning, conversion, or growth.

## Purpose

This ledger preserves selected MenuList source evidence when provenance,
claim-by-claim validation, or a detailed product decision may matter later. The
[Marketing and Distribution Bible](../distribution-operating-system/distribution-operating-system_bible.md)
is the primary reusable doctrine.

This is not a diary of everything the founder reads or shares. Most inputs
should produce no ledger entry. If an input materially improves durable doctrine,
synthesize the lesson into the Bible; add an entry here only when the supporting
source trail will be genuinely useful later.

An entry in this file means:

- the source was captured;
- the useful idea was summarized;
- its fit with MenuList was reviewed;
- the current decision and future trigger were recorded;
- future work can retrieve it by tags.

An entry does **not** mean:

- the source is automatically correct;
- MenuList has adopted every recommendation;
- implementation or spending is approved;
- the source remains current forever.

Current repo behavior, MenuList doctrine, verified market/platform guidance, founder decisions, and current launch gates continue to outrank this ledger.

## Evidence Admission Workflow

For a MenuList-specific input that passes the Bible admission test:

1. **Decide whether evidence retention is necessary:** Add an entry only when provenance, detailed validation, a revalidation trigger, or a product-decision trail will matter later. Do not log repetition, folklore, or interesting but non-decision-useful content.
2. **Capture only useful provenance:** Record the stable source, source type, author/publisher when known, coverage limitations, and a concise summary. Do not preserve a share diary or paste an entire copyrighted article when a summary is sufficient.
3. **Validate:** Resolve the primary source when possible. Check factual or platform-dependent claims against current official documentation and current repo truth.
4. **Classify:** Assign one decision:
   - `APPLY_NOW` - useful, current, within scope, and needed by active work.
   - `DEFERRED_REFERENCE` - useful, but only when a named trigger occurs.
   - `ALREADY_COVERED` - useful confirmation of an existing MenuList rule.
   - `RESEARCH_REQUIRED` - potentially useful, but not yet evidence-backed.
   - `REJECTED` - wrong fit, unsafe, unsupported, stale, or contrary to doctrine.
5. **Synthesize:** Update the relevant Bible section with the durable lesson; do not append source chronology to the Bible.
6. **Route:** Link the existing MenuList doc, workflow, runtime surface, or future decision where the evidence belongs. Do not create implementation work merely because evidence was retained.
7. **Retrieve and revalidate:** Search this archive only when detailed evidence is needed, and recheck time-sensitive claims before applying them.

## Retrieval Rules

Read the Bible first. Search this evidence archive when work needs source-level
detail involving:

- paid acquisition;
- Google Ads, Meta Ads, or conversion measurement;
- landing-page message matching;
- launch-video retention or creative testing;
- founder-led distribution;
- short-form content systems;
- market positioning;
- customer acquisition economics;
- campaign dashboards;
- AI-era search or discovery;
- any topic named in an entry's tags.

Recommended search:

```bash
rg -n "paid-acquisition|meta-ads|google-ads|activation|video-retention" \
  __docs__/menulist-marketing-distribution/menulist-marketing-distribution_external-insight-ledger.md
```

## Entry Template

This template is only for admitted supporting evidence. Historical `Shared`
fields remain for audit continuity; future curation does not depend on tracking
when content appeared in chat.

```markdown
### ML-MKT-EXT-NNN - Short title

- **Status:** APPLY_NOW | DEFERRED_REFERENCE | ALREADY_COVERED | RESEARCH_REQUIRED | REJECTED
- **Shared:** YYYY-MM-DD
- **Source:** Source title - `https://source.example/path`
- **Source type:** X post | article | video | expert feedback | AI output | competitor example
- **Topics:** comma-separated retrieval tags
- **Use when:** explicit future trigger
- **Revalidate:** what must be checked again before use

**Source idea**

Concise summary of the useful idea.

**MenuList verdict**

What is accepted, modified, rejected, or already covered.

**Current decision**

What should happen now, including `No immediate implementation` when appropriate.

**Related MenuList truth**

- Relevant maintained document - `./relative-path.md`

**Outcome history**

- YYYY-MM-DD - Captured and reviewed.
```

## Entries

### ML-MKT-EXT-001 - Simplified Paid SaaS Acquisition Playbook

- **Status:** `DEFERRED_REFERENCE`
- **Shared:** July 18, 2026
- **Source:** [Cody Schneider X post](https://x.com/codyschneider/status/2078208114554184027?s=46)
- **Source type:** X post
- **Topics:** paid-acquisition, google-ads, meta-ads, landing-page-message-match, conversion-events, creative-testing, CAC, LTV, payback-period, campaign-dashboard
- **Use when:** MenuList's upload-to-activation attribution chain is certified, baseline conversion data exists, and the founder opens a capped paid-acquisition test.
- **Revalidate:** Current Google Ads match-type and bidding guidance, Meta audience/campaign guidance, conversion-event delivery, attribution windows, privacy/consent requirements, platform terms, and MenuList funnel readiness.

**Source idea**

Keep paid acquisition operationally simple: target high-intent Google searches, align landing-page messaging with the ad promise, test multiple Meta creatives, track funnel and payment conversions, and evaluate acquisition using CAC, LTV, and payback.

**MenuList verdict**

Adopt the operating simplicity, message match, deep conversion measurement, creative iteration, and unit-economics discipline. Modify the source's absolutes:

- use controlled exact and phrase search themes first; do not treat phrase match as universally correct;
- use broad Meta delivery only within approved geography, language, age, exclusion, budget, and measurement controls;
- create many local creative variants, but place only a bounded set of materially different concepts into each live test;
- keep campaign structure consolidated unless budget, objective, geography, or evidence justifies separation;
- measure the full MenuList chain, not only signup and payment;
- evaluate gross-margin-adjusted realized value, churn, refunds, and payback rather than using a simple spend-to-LTV ratio alone.

The MenuList campaign chain remains:

`ad click -> list uploaded -> private preview prepared -> owner approved -> customer link published -> two customer surfaces activated -> verified payment`

**Current decision**

No immediate paid campaign. Preserve this playbook for the paid-acquisition readiness gate. Continue local, zero-cost creative production and organic proof gathering. Paid media spend remains a separate founder-controlled decision.

**Related MenuList truth**

- [Paid ad cutdowns and launch gates](../videos/videos_paid-ad-cutdowns.md)
- [Campaign measurement ledger](../videos/videos_campaign-measurement-ledger.md)
- [Growth and funnel strategy](../marketing/menulist-growth-and-funnel-strategy.md)
- [Marketing distribution source review](./menulist-marketing-distribution_source-review.md)
- [Distribution workflow research](./menulist-marketing-distribution_distribution-workflow-research-2026-07-11.md)

**Outcome history**

- July 18, 2026 - Captured, checked against current Google and Meta guidance, compared with MenuList runtime and measurement docs, and retained as a deferred paid-acquisition reference.

### ML-MKT-EXT-002 - Hallmark Anti-Slop Frontend Skill

- **Status:** `ALREADY_COVERED`
- **Shared:** July 18, 2026
- **Source:** [Hallmark](https://www.usehallmark.com/)
- **Source type:** Open-source frontend design skill and reference library
- **Topics:** frontend-design, anti-ai-slop, landing-pages, structural-variety, design-audit, responsive-design, honest-proof, website-assets, skill-evaluation
- **Use when:** Auditing or redesigning a MenuList or Answerlattice public website surface, especially when checking for repetitive AI-generated layouts, weak hierarchy, fabricated proof, or poor responsive behavior.
- **Revalidate:** Hallmark's current version, license, skill contract, roadmap gaps, and the repo's active brand, website, asset, and frontend-skill rules before borrowing any new pattern.

**Source idea**

Treat frontend quality as a governed design process rather than a collection of fashionable components. Hallmark combines structural variation, design-system extraction, ranked anti-pattern audits, responsive checks, honest proof requirements, and pre-emit critique across build, study, audit, and redesign workflows.

**MenuList verdict**

The useful principles are already covered by the repo's `design-taste-frontend` and `redesign-existing-projects` skills plus the Website Asset Operating System and existing image-generation and image-to-code routes. Retain these Hallmark ideas as supporting references:

- audit the existing surface before editing;
- vary page structure intentionally instead of repeating generic centered heroes and equal card grids;
- preserve honest proof and never invent customer logos, metrics, testimonials, or product evidence;
- test explicit mobile widths, reduced motion, hierarchy, overflow, and touch behavior;
- avoid fake browser, device, terminal, or code chrome when real product evidence is available.

Do not import Hallmark as a new authority or install it into this repo. Its rotating themes, macrostructure history, `.hallmark/` project memory, and portable `design.md` would duplicate or compete with maintained repo doctrine, brand tokens, website docs, and AssetOS manifests. Some generic rules, including a two-font minimum and its anti-Inter stance, must not override product-specific typography. Its own roadmap also leaves image-heavy briefs, brand-first work, data visualization, and multi-page coherence as future work, while those concerns already have governed local routes.

**Current decision**

No installation, dependency, generated `.hallmark/` files, or workflow replacement. Continue using the existing local frontend-design, redesign, Website Asset OS, image-generation, and image-to-code skills. Borrow a Hallmark pattern only when it passes current product doctrine, brand, proof, accessibility, and responsive checks.

**Related MenuList truth**

- [Website Asset Operating System usage guide](../website-asset-operating-system/website-asset-operating-system_usage-guide.md)
- [Website Asset Operating System specification](../website-asset-operating-system/website-asset-operating-system_spec.md)
- [Main website image assets](../main-website/main-website_image-assets.md)
- [Marketing distribution operating pack](./README.md)

**Outcome history**

- July 18, 2026 - Reviewed the official Hallmark site, GitHub repository, skill source, package metadata, and roadmap; compared them with the repo's current frontend and asset skills; retained Hallmark as an already-covered reference rather than an installation candidate.

### ML-MKT-EXT-003 - Agent-Readable Local Business Truth and Location Identity

- **Status:** `DEFERRED_REFERENCE`
- **Shared:** July 19, 2026
- **Source:** Founder-supplied ChatGPT weekly strategy brief, validated against [Google Maps Grounding Lite](https://developers.google.com/maps/ai/grounding-lite), [Google Maps attribution requirements](https://developers.google.com/maps/ai/grounding-lite/attribution), [Google Places fields](https://developers.google.com/maps/documentation/places/web-service/place-details), [the German media regulators' July 14 decision](https://www.die-medienanstalten.de/presse/pressemitteilungen/zak-bescheide-ki-angebote-google-perplexity/), [the European Commission's July 16 DMA guidance](https://digital-strategy.ec.europa.eu/en/news/commission-provides-guidance-google-ai-interoperability-android-and-sharing-google-search-data), [California SB 68](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB68), and [Constant Contact's 2026 consumer research](https://www.constantcontact.com/news/2026-06-10-the-rise-of-the-smb-creator-how-small-businesses-are-leveraging-social-media-and-ai-to-capture-consumer-attention)
- **Source type:** AI output with primary-source verification
- **Topics:** ai-discovery, maps-grounding-lite, place-id, location-identity, platform-pull-api, public-json, claim-provenance, allergens, multi-location, social-discovery, agent-truth-audit, schema-org
- **Use when:** Reviewing an external place-identity contract, a Maps Grounding research pilot, Platform Pull API versioning, regulated item facts, or a chain-business allergen requirement.
- **Revalidate:** Google Maps Grounding Lite and Resolution API status, eligibility, terms, pricing, storage and attribution rules; current provider certification; EU implementation milestones and eligibility; applicable allergen law and legal advice for the owner's jurisdiction; and India-specific discovery evidence.

**Source idea**

As place discovery moves into AI agents and structured tools, MenuList should own an owner-approved, location-specific public truth record and project it into pages, QR destinations, machine-readable feeds, and future adapters. The brief recommends a versioned public truth contract, external location identity, claim provenance, an internal agent-truth audit, regulated menu-data primitives, master-and-location overrides, public trust signals, and portable official links. It correctly rejects a consumer discovery engine, premature public MCP server, Google-shaped canonical model, automatic AI allergen publication, QR-only compliance, and a social marketing suite.

**MenuList verdict**

The platform boundary is correct, but most of the proposed foundation is already shipped or governed:

- MenuList doctrine already defines the owner-controlled canonical public-offer record and platform-neutral projections.
- The read-only, versioned Platform Pull API already exposes stable store, project, category, item, and variant identities with ETag and rate-limit handling. Public pages also expose schema.org JSON-LD and durable canonical URLs. Creating another anonymous JSON contract would duplicate the existing boundary and introduce a new security, cache, cost, and compatibility obligation.
- Menu versioning, publish timestamps, public freshness, item/category deep links, localized feedback, share previews, UTM attribution, and master-plus-outlet overrides already cover much of the proposed trust, portability, and multi-location work.
- Item `decisionFacts` already support source, confirmation, and update time. Provenance should be extended only for a demonstrated high-risk consumer or regulated fact, not by replacing every existing domain field with a generic `canonicalClaim` model.
- AI image extraction is explicitly prohibited from returning allergens, nutrition, or other owner-verification-only facts. The current top-level allergen model is suitable for owner-entered facts but does not yet represent ingredient-level evidence, variant overrides, `contains` versus `may contain`, effective periods, or jurisdiction-specific compliance. Those additions require a real customer/legal trigger, not speculative UI.

One meaningful gap existed around reversible external location identity.
MenuList now has a bounded, provider-neutral binding embedded on the exact store
document, same-write URI mirroring for the existing owner Maps-link flow, and a
separate attributable-source confirmation path for stable Place IDs. This does
not justify match-confidence scores, alias history, collision queues, ownership
status, or a separate registry. Those remain evidence-gated extensions.

The dated factual claims also need qualification:

- Google Maps Grounding Lite, its MCP tools, the experimental Resolution API, exact-answer warning, and Maps attribution obligation are confirmed.
- The German regulatory signal is real, but the July 14 regulator decision and the separate Munich court case concern media/news output. They do not create an immediate restaurant-listing or MenuList compliance requirement.
- The EU measures are real, but the brief compresses their timelines. Most Android AI interoperability is due with Android 18 and no later than August 1, 2027; concurrent hotword access follows later. January 2027 is a search-data pricing-offer milestone for qualifying search providers, not general availability of search-optimization data.
- California SB 68 took effect July 1, 2026 and permits QR-linked disclosure only with an alternative written method, but it applies to covered chain food facilities already subject to the federal nutrition-disclosure regime. It is not evidence for forcing a compliance workflow onto MenuList's current India-first SMB owners.
- Constant Contact's `49% social` versus `40% search` result is correctly quoted, but its sample covers the United States, United Kingdom, Canada, Australia, and New Zealand rather than India. Use it as a portability signal, not a local-market sizing fact.

**Current decision**

Do not add a public MCP server, duplicate public JSON endpoint, discovery engine, generalized claim collection, provider-specific canonical schema, allergen compliance UI, social suite, or new Firebase hot path.

Keep the existing Platform Pull API and public schema.org output as the
machine-readable contract, and keep the new embedded identity binding internal.
When provider access, terms, cost, and a concrete distribution consumer are
approved, conduct a small zero-write internal location-resolution and
agent-answer audit. Use observed collisions and disagreements to decide whether
the binding ever needs aliases, match confidence, collision review, or ownership
status. Keep all external facts proposed-only until an authorized owner confirms
them.

**Related MenuList truth**

- [Infrastructure compounding doctrine](../constitution/17-infrastructure-compounding-doctrine.md)
- [Public truth indexing policy](../discovery-infrastructure/public-truth-indexing-policy.md)
- [Platform Pull API](../platform-pull-api/README.md)
- [Canonical truth infrastructure](../canonical-truth-infrastructure/README.md)
- [Multi-outlet consistency](../multi-outlet-consistency/README.md)
- [MenuList marketing and distribution operating pack](./README.md)

**Outcome history**

- July 19, 2026 - Verified the time-sensitive platform, regulatory, legal, and survey claims against primary sources; compared every recommendation with current doctrine, APIs, public output, item truth, extraction safety, multi-outlet behavior, feedback, social metadata, and analytics; retained only the external-location identity and controlled agent-audit directions as deferred research triggers.
- July 19, 2026 - Applied the bounded internal identity foundation without enabling the provider: added an optional provider-neutral store binding, same-write mirroring for the existing owner Google Maps-link flow, explicit owner-confirmed Place-ID persistence/removal helpers, public-output exclusion, and focused source/runtime tests. Provider smoke, activation, grounded-candidate UI, and the controlled agent-answer pilot remain deferred to their named gates.
- July 19, 2026 - Cross-check against current Google documentation removed the old 160/180-character Place-ID truncation risk, bound accepted IDs without partial storage, switched top-level identity to validated grounding-source metadata only, corrected Gemini 3.5 multi-search cost wording, and added transactional store-state revalidation. The existing `confirmedAt` field is sufficient for future 12-month Place-ID freshness checks; no refresh scheduler was added.
- July 22, 2026 - Applied the validated repo-fit P0 consolidation: froze the existing Business Truth Contract, corrected generic `modifiedOn` public copy from "verified" to localized update semantics, expanded Platform Pull identity/projection fixtures, and enforced the disabled Maps flag on new Place-ID confirmation while keeping removal available. Provider smoke, cross-store collision handling, the zero-write agent-answer pilot, allergen compliance expansion, public MCP, and new adapters remain deferred to their explicit gates.

### ML-MKT-EXT-004 - Audience-Aligned Organic Distribution Across X, YouTube, And Short Form

- **Status:** `ALREADY_COVERED`
- **Shared:** July 28, 2026
- **Source:** Founder-supplied full text attributed to `@eptwts`, titled `distribution 101: how to sell your products`; no stable post URL was supplied or found during review.
- **Source type:** X article/post
- **Topics:** founder-led-distribution, audience-product-fit, X, YouTube, high-intent-search, Instagram-Reels, TikTok, proof-assets, content-packaging, creator-disclosure, platform-integrity
- **Use when:** Preparing a founder post, owner-proof walkthrough, YouTube demo, short-form derivative, or partner brief after the existing proof and permission gates are met.
- **Revalidate:** Current platform recommendation guidance, account-integrity rules, creator/affiliate disclosure requirements, approved MenuList proof, and the active Bengaluru/pilot operating envelope.

**Source idea**

Build distribution around the exact buyer, teach useful sub-problems, package
YouTube topics before production, prefer high-intent educational content over
broad vanity reach, derive native short-form assets, and measure sales or
qualified actions instead of follower count.

**MenuList verdict**

The durable principles confirm the existing MenuList strategy:

- MenuList's acquisition audience is local business owners and the trusted
  people who can introduce them, not a generic AI or builder audience.
- The first distribution asset is an owner-approved activation proof, not a
  large content calendar.
- X is for founder/partner learning and a verified operating lesson, not the
  primary restaurant-owner acquisition channel.
- YouTube becomes a durable two-to-four-minute activation walkthrough after
  real proof exists; short clips derive from the same approved source.
- Instagram/Reels can show the visible owner problem and before/after truth
  outcome after permission.
- success remains qualified owner conversations, private-preview acceptance,
  two-surface activation, referrals, and founder time—not followers or raw
  impressions.

Reject the source's numeric algorithm formulas, guaranteed growth, spam-volume
posting, aged-account logic, undisclosed affiliate amplification, engagement
manipulation, and proxy/device-reset/fake-US TikTok setup. X, TikTok, YouTube,
Meta, and ASCI primary guidance does not support those tactics as a safe
portfolio rule.

**Current decision**

No new channel, account, post, publishing action, provider connection, or spend.
Continue the current manual-first activation plan and use these principles only
when an owner-approved proof asset is eligible for distribution.

**Related MenuList truth**

- [Portfolio distribution insight ledger](../strategy/product-portfolio-distribution-insight-ledger.md)
- [Social channel research and next plan](../menulist-signaldesk/menulist-signaldesk_social-channel-market-research-and-next-plan-2026-07-10.md)
- [First proof distribution run](./menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md)
- [Pilot proof and owner learning](./menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md)

**Outcome history**

- July 28, 2026 - Checked the article against the current product matrix,
  official X/YouTube/TikTok/Meta guidance, ASCI disclosure rules, MenuList
  distribution research, SignalDesk boundaries, and the active proof gates;
  retained the useful principles as already covered.

### ML-MKT-EXT-005 - Guarded Google Ads Keyword Research Workflow

- **Status:** `DEFERRED_REFERENCE`
- **Shared:** July 31, 2026
- **Source:** Founder-supplied raw text matching Jackson Blackledge
  (`@blvckledge`); a [similar author-published LinkedIn
  version](https://www.linkedin.com/posts/jacksonblackledge_how-to-discover-keywords-with-big-scaling-activity-7404853055323705344-T5jH)
  and an [archived earlier X-thread
  variant](https://threadreaderapp.com/thread/1999042285007253976.html) were
  found, but the exact X URL and referenced images were not supplied.
- **Source type:** X post
- **Topics:** google-ads, paid-search, keyword-planner, search-intent,
  keyword-match-types, smart-bidding, negative-keywords, search-terms-report,
  campaign-forecasting, ad-group-structure, paid-acquisition
- **Use when:** MenuList's upload-to-activation attribution chain is certified,
  the founder opens a capped Google Search test, and a specific market,
  customer-list job, landing page, budget ceiling, and stop-loss rule have been
  approved.
- **Revalidate:** Current Google Ads match definitions, broad-match and AI Max
  settings, Smart Bidding guidance, negative-keyword behavior, Keyword Planner
  metrics and forecast semantics, privacy and consent requirements, MenuList
  conversion delivery, and the active paid-acquisition gate.

**Source idea**

Classify searches by intent, start with commercial and transactional demand,
discover and refine ideas in Keyword Planner, use exact, phrase, and broad match
deliberately, inspect competition and bid ranges, review forecasts and actual
search terms, maintain negative keywords, and organize closely related
keywords into themed ad groups.

**MenuList verdict**

Retain the intent-first research loop, Keyword Planner and search-term review,
careful negative-keyword maintenance, landing-page relevance, and themed ad
groups. Treat informational, navigational, commercial, and transactional intent
as a planning heuristic rather than a Google Ads platform taxonomy.

Correct the post's unsupported universal rules before future use:

- no fixed `>30` discovery filter or `1,000-2,000+` exact-match threshold
  determines profitability; local and high-intent demand can be valuable at
  much lower volume;
- do not choose a high-volume head term automatically over a lower-volume
  high-intent term; rank ideas by offer relevance, search intent, landing-page
  fit, expected activation value, likely cost, and then available volume;
- exact match can reach searches with the same meaning or intent, phrase match
  reaches that set plus broader meaning-based variations, and broad match can
  reach related searches using additional account and page signals;
- broad match has no supported three-to-five-word minimum. For MenuList, test it
  only with accurate conversion tracking, conversion-based Smart Bidding, a
  bounded budget, search-term review, and stop-loss controls. Prior conversion
  data can improve the starting foundation, but Google does not define a
  universal minimum conversion count;
- negative keywords are necessary controls, not a complete filter: they do not
  expand to close variants in the same way as positive keywords and require
  ongoing search-term review;
- Keyword Planner competition is relative advertiser activity, not conversion
  probability. Top-of-page bid ranges are historical low/high percentile bid
  signals, not promised CPCs or positions one through four;
- Planner forecasts are estimates affected by bid, budget, seasonality,
  historical ad quality, targeting, and available account data. They support
  scenario and budget planning but do not prove profitability or scaling room;
- keep one intent and landing-page promise per ad group, but do not split exact
  and phrase match into separate ad groups by default. Match types overlap, so
  separate them only when a controlled experiment or a real difference in
  budget, bid strategy, geography, message, or landing page justifies the data
  fragmentation.

The first MenuList test should therefore use a small, consolidated set of
commercial or transactional exact and phrase themes tied to one approved
owner outcome. Informational demand remains a separate funnel decision; it is
not added merely because the search campaign becomes profitable.

**Current decision**

No campaign, keyword upload, Google Ads account change, provider connection, or
spend. Preserve the corrected workflow for the existing paid-acquisition gate.
MenuList remains focused on the permissioned pilot, approved proof, and
measurable two-surface activation chain.

**Validation basis**

- [Google Ads keyword matching options](https://support.google.com/google-ads/answer/7478529)
- [Google guidance for effective keyword lists](https://support.google.com/google-ads/answer/10039665)
- [Google Keyword Planner forecasts and historical metrics](https://support.google.com/google-ads/answer/3022575)
- [Google Ads search terms report](https://support.google.com/google-ads/answer/2472708)
- [Google Ads negative keywords](https://support.google.com/google-ads/answer/2453972)
- [Google Ads ad-group organization](https://support.google.com/google-ads/answer/6372655)

**Related MenuList truth**

- [Simplified paid SaaS acquisition playbook](#ml-mkt-ext-001---simplified-paid-saas-acquisition-playbook)
- [Marketing and distribution strategy](./menulist-marketing-distribution_strategy.md)
- [Paid ad cutdowns and launch gates](../videos/videos_paid-ad-cutdowns.md)
- [Campaign measurement ledger](../videos/videos_campaign-measurement-ledger.md)
- [Growth and funnel strategy](../marketing/menulist-growth-and-funnel-strategy.md)

**Outcome history**

- July 31, 2026 - Matched the text to Jackson Blackledge's similar published
  versions and checked it against current Google Ads match, planning,
  search-term, negative-keyword, and account-organization guidance; retained
  the useful research loop, corrected the unsupported thresholds and
  structural absolutes, and deferred use to MenuList's paid-acquisition gate.

### ML-MKT-EXT-006 - HyperFrames 0.7.105 Release Train And Recent Production Articles

- **Status:** `DEFERRED_REFERENCE`
- **Shared:** August 1, 2026
- **Source:** [HyperFrames npm package](https://www.npmjs.com/package/hyperframes?activeTab=versions), [official GitHub releases](https://github.com/heygen-com/hyperframes/releases), [official HyperFrames X account](https://x.com/HyperFrames_), the Day 21-30 official articles, and the August 7 Claude Design MCP announcement linked below.
- **Source type:** Release notes and X article series
- **Topics:** hyperframes, video-production, local-rendering, prompt-guide, BRIEF.md, motion-continuity, transition-flicker, product-screenshots, audio-opening, audio-ducking, captions, native-aspect-ratios, templates, color-grading, media-effects, overlays, website-capture, media-probing, sub-compositions, registry-families, component-reuse, deterministic-blocks, parallel-capture-canary, claude-design-mcp
- **Use when:** Starting the next MenuList video project or explicitly admitting a newer HyperFrames CLI into the local production toolchain.
- **Revalidate:** Current npm latest version, release notes since `0.7.105`, Node and FFmpeg requirements, local skill state, CLI command compatibility, parallel-router defaults, Apache license, third-party media rights, encoded output parity, and the zero-cost local-only production boundary.

**Source idea**

The upstream project moved from `0.7.62` to `0.7.105` through a large patch train. The completed official series covers cloud rendering, reusable components, templates and variables, deterministic color grading, a structured Prompt Guide, media effects, deployment, catalog contribution, coherent component families, and community examples. Releases through `0.7.105` also add safer media probing, bounded long-source extraction, external-edit recovery, stronger preview/render parity, mounted-composition style fixes, software-capture ghosting fixes, query-safe composition variables, caption color states, fleet-wide parallel drawElement routing, more reliable Studio manipulation, and local meaning-based catalog search.

**MenuList verdict**

Adopt the production principles that improve truth, continuity, and repeatability:

- persist the intent interview in `BRIEF.md`;
- use the Prompt Guide's motion grammar and avoid-the-slideshow continuity contract;
- use real product screenshots and check for motion jumps at every cut;
- keep music audible from frame zero while preserving voice-reactive ducking;
- preserve deliberate automation plateaus and exclude hidden audio;
- use templates and variables only after the master scene and copy are approved;
- keep captions inside an intentional native aspect-ratio layout;
- use deterministic, restrained color correction and grading;
- use bounded website capture for real MenuList UI evidence;
- use deterministic, paused, registered timelines for MenuList-owned reusable blocks;
- select a coherent reviewed component family instead of mixing unrelated effects;
- treat Studio as an editing surface while the encoded MP4 remains the output authority;
- continue encoded frame-zero, transition, and final-frame QA.

Do not adopt cloud rendering, hosted deployment, account-backed generation, Claude Design handoff, hosted publishing, paid media, or login-gated assets. Do not use bloom, pixelation, CRT, glitch, ASCII, engraving, HUD, light leaks, hand-drawn wobble, or freeze-frame dressing as generic decoration. Media effects and overlays are admitted only when one motivated treatment improves a specific transition or supporting-footage beat without obscuring product UI, captions, claims, or owner control.

The upstream skills directory still contains 19 workflows. The registry now exposes 132 blocks and 36 components; this is catalog growth inside the existing workflow set, not a new MenuList workflow count.

**Current decision**

No installation or production upgrade in this review pass. Keep `0.7.62` as the last verified production baseline and treat `0.7.105` as the reviewed candidate. The next toolchain action is an isolated, pinned, telemetry-disabled `0.7.105` smoke test on a disposable short composition, comparing the default router with `HF_DE_PARALLEL_ROUTER=false` where the override remains supported. Frozen videos and source projects must not be migrated in place.

**Official recent articles**

- [Day 21 - Cloud Rendering](https://x.com/HyperFrames_/status/2081491370485952790) - reject for MenuList's local-only workflow.
- [Day 22 - Components Catalog](https://x.com/HyperFrames_/status/2081798071353278651) - selectively useful for reviewed local reusable blocks.
- [Day 23 - Templates and Variables](https://x.com/HyperFrames_/status/2082197435246600341) - high value for controlled campaign and aspect-ratio variants.
- [Day 24 - Color Grading](https://x.com/HyperFrames_/status/2082536413829235004) - useful only as restrained deterministic correction and brand look.
- [Day 25 - Prompt Guide](https://x.com/HyperFrames_/status/2082892893027749917) - adopt the brief, continuity, pacing, and review guidance.
- [Day 26 - Media Effects and Overlays](https://x.com/HyperFrames_/status/2083324288632045910) - selectively admit motivated treatments; reject decorative effect stacking.
- [Day 27 - Deploy](https://x.com/HyperFrames_/status/2083633492894900456) - reject Vercel, Cloudflare, and Modal rendering for the local-only asset workflow.
- [Day 28 - Contribute to the Catalog](https://x.com/HyperFrames_/status/2084070152975634743) - adopt deterministic block rules for internal MenuList components; do not publish internal brand blocks by default.
- [Day 29 - Components Update](https://x.com/HyperFrames_/status/2084338269194732003) - selectively inspect the minimal `mk` family; reject the creator-broadcast and hand-drawn families for core MenuList work.
- [Day 30 - 30 for 30](https://x.com/HyperFrames_/status/2084720409841484202) - useful community evidence and rationale-handoff pattern; not evidence of guaranteed views.
- [HyperFrames MCP in Claude Design](https://x.com/HyperFrames_/status/2085788866691416065) - skip the account-backed agent handoff; retain the editable-source and design-rationale lesson.

**Related MenuList truth**

- [HyperFrames operating guide](../videos/videos_hyperframes-operating-guide.md)
- [Founder-approved production standard](../videos/videos_founder-approved-production-standard.md)
- [Video version ledger](../videos/videos_version-ledger.md)
- [External insight ledger workflow](#intake-workflow)

**Outcome history**

- August 1, 2026 - Verified npm latest `0.7.87`, reviewed official release notes from the `0.7.62` baseline, inspected the 19-skill directory, and read the official Day 21-26 X article list plus the full Day 26 article. Recorded a selective adoption verdict and deferred the CLI change to an isolated local smoke test.
- August 8, 2026 - Verified npm latest `0.7.101` with Node `>=22` and Apache-2.0 metadata, reviewed releases `0.7.88` through `0.7.101`, confirmed the upstream skill count remains 19 and the registry now contains 132 blocks plus 36 components, read the official Day 27-30 articles, and reviewed the Claude Design MCP announcement. Kept `0.7.62` as the proven baseline, moved the reviewed candidate to `0.7.101`, rejected cloud and account-backed paths, and specified an isolated canary-disabled local smoke gate.
- August 10, 2026 - Verified npm latest `0.7.105` with Node `>=22` and Apache-2.0 metadata and reviewed official releases `0.7.102` through `0.7.105`. Retained `0.7.62` as the production baseline, advanced only the unadmitted smoke candidate to `0.7.105`, and added query/caption, parallel-router, Studio manipulation, and local semantic-catalog checks to the disposable comparison gate.
- August 10, 2026 - Ran a read-only `hyperframes@0.7.62 skills check`; it reported two current and 17 outdated workflows in the Claude skill location. No global skill update, project migration, render, login, hosted action, or dependency change was performed.

### ML-MKT-EXT-007 - Guarded Meta Ads Marketing-Agent Loop

- **Status:** `DEFERRED_REFERENCE`
- **Shared:** August 10, 2026
- **Source:** Founder-supplied full text attributed to Prajwal Tomar (`@PrajwalTomar_`), titled `This Marketing Agent Replaces Your $10K/Month Ad Agency. Here's the Full System.`; the supplied copy shows `Jul 31`, but no stable X URL was supplied or found.
- **Source type:** X article/post with a separate AI-generated review
- **Topics:** meta-ads, paid-acquisition, marketing-agent, andromeda, creative-diversification, marketing-api, ads-insights-api, ads-library, conversions-api, attribution, randomized-experiments, signaldesk, campaigncue, human-approval, stop-loss
- **Use when:** MenuList's attribution chain is certified and the founder explicitly opens a capped Meta Ads test, or when SignalDesk or CampaignCue's Meta provider boundary is formally reconsidered.
- **Revalidate:** Current Meta targeting and Advantage+ behavior, campaign-specific ad and creative limits, learning guidance, Marketing API and Ads Library permissions, automated-collection terms, Conversions API privacy and deduplication requirements, experiment and lift capabilities, app review, provider cost, and MenuList's active paid-acquisition gate.

**Source idea**

Run a persistent research, creative, publication, measurement, pause-or-scale,
and learning loop that connects each ad concept to business outcomes. The post
argues that unified data, scheduled decisions, stored creative evidence, and
continuous feedback can replace much of a paid-ad operating team.

**MenuList verdict**

Retain the durable operating principles:

- connect acquisition evidence to qualified business outcomes rather than
  optimizing cheap leads;
- preserve hypotheses, source evidence, stop rules, financial limits, and
  observed results;
- test genuinely different creative concepts instead of cosmetic variants;
- keep fresh, rights-safe evidence in the loop; and
- require human approval for brand, positioning, provider, and spend decisions.

Correct or reject the post's platform absolutes:

- Andromeda is an ad-retrieval system; it did not remove audience targeting;
- `150` is not a universal ad-set limit, and `15-25` concepts is not a
  universal operating requirement;
- 48 hours can be a spend-safety checkpoint, not proof of profitability,
  positioning, payment, or retention;
- authorized Ads Insights reads are supported, so `writes only` is not a Meta
  safety rule;
- the public Ad Library is not a blanket commercial-ad ingestion feed, and
  competitor creative must not be scraped or copied;
- Conversions API improves signal delivery and attribution but does not create
  deterministic attribution or causal proof; and
- optimizing-campaign winners are observational evidence unless a controlled
  test establishes the comparison.

The cited 31-day experiment demonstrated that a bounded agent loop could keep
running. It spent `$1,493`, generated `243` leads at `$6.14` each against a
`$2.50` target, did not establish monetization, and therefore did not prove
agency replacement.

Most of the proposed product architecture is already covered. SignalDesk owns
internal evidence, experiment cards, readback windows, approvals, attribution,
cost controls, and kill switches. CampaignCue owns source-backed campaign
outputs, manual ad handoff, result receipts, and one-variable learning.
MenuList's Outcome Bridge owns the current bounded activation events. Do not
create parallel experiment, concept, attribution, or warehouse systems.

Potential future deltas remain evidence-gated:

- one compact read-only Meta performance summary mapped into existing
  SignalDesk experiments;
- bounded provider campaign, ad-set, ad, and creative identifiers linked to
  the existing Outcome Bridge;
- a CampaignCue-owned concept identity or diversity check after a real manual
  test produces multiple same-channel concepts and per-concept results; and
- payment and retention correlation after privacy, attribution, and
  cross-product ownership are approved.

**Current decision**

No immediate implementation, campaign, spend, provider connection, warehouse,
Conversions API change, new attribution fields, SignalDesk expansion, or
CampaignCue mutation path. Continue the existing zero-spend, manual Bengaluru
activation-proof trial. Preserve this corrected pattern for the named paid
acquisition and provider trigger.

**Validation basis**

- [Meta Andromeda engineering note](https://engineering.fb.com/2024/12/02/production-engineering/meta-andromeda-advantage-automation-next-gen-personalized-ads-retrieval-engine/)
- [Meta Advantage+ audience controls](https://www.facebook.com/business/ads/meta-advantage-plus/audience)
- [Meta Ads Insights API](https://www.postman.com/meta/facebook-marketing-api/request/u07tack/get-ad-insights-l1)
- [Meta Ad Library scope](https://www.facebook.com/help/259468828226154)
- [Meta Conversions API](https://www.facebook.com/business/help/AboutConversionsAPI)
- [Original 31-day experiment](https://technically.dev/posts/claude-code-autonomous-ad-campaign)

**Related MenuList truth**

- [Existing paid acquisition reference](#ml-mkt-ext-001---simplified-paid-saas-acquisition-playbook)
- [SignalDesk Operating Layer](../menulist-signaldesk/signaldesk-operating-layer/README.md)
- [SignalDesk owner-control gate](../menulist-signaldesk/menulist-signaldesk_owner-control-model.md)
- [SignalDesk Outcome Bridge](../menulist-signaldesk/signaldesk-outcome-bridge/README.md)
- [CampaignCue delivery boundary](../campaigncue/campaigncue-delivery-boundary.md)
- [CampaignCue Ads Studio validation](../campaigncue/ads-studio/ads-studio_validation.md)
- [Paid-ad launch gates](../videos/videos_paid-ad-cutdowns.md)

**Outcome history**

- August 10, 2026 - Checked the article and cited experiment against current Meta engineering, targeting, Marketing API, Ad Library, experiment, and Conversions API sources; retained the guarded operating pattern as deferred reference and rejected the unsupported platform absolutes and autonomous-spend conclusion.
- August 10, 2026 - Cross-checked the proposed build against current SignalDesk, CampaignCue, and MenuList contracts; confirmed that no new code, schema, provider, campaign, or warehouse work is currently admitted.

### ML-MKT-EXT-008 - 2026 Launch-Video Market And HyperFrames Production Study

- **Status:** `APPLY_NOW`
- **Shared:** August 10, 2026
- **Source:** Current official HyperFrames launch examples and source projects, Wistia 2026 State of Video, LinkedIn 2026 B2B video guidance, Gartner consumer GenAI trust research, and public SaaS launch examples
- **Source type:** Market study, source-repository audit, platform research, and competitor-example review
- **Topics:** launch-video, product-video, hyperframes, real-ui, modular-compositions, native-aspect-ratios, founder-video, human-trust, ai-fatigue, audio-design, short-form, product-demo, conversion-measurement, local-production
- **Use when:** Briefing, storyboarding, building, reviewing, distributing, or measuring any MenuList launch, product, feature, demo, founder, social, website, sales, or paid video.
- **Revalidate:** Current HyperFrames source-project patterns and license status, platform format rules, video-distribution behavior, research methodology, AI-content trust findings, MenuList product truth, and campaign attribution readiness.

**Source idea**

Current launch-video practice is moving from one polished hero film to a reusable
system of product proof: real UI, one workflow per cut, modular source, deliberate
audio, platform-native versions, human expertise, and measurement tied to the
next product action. AI is increasingly used in production and repurposing, but
generic synthetic polish and unsupported claims can weaken trust.

**MenuList verdict**

Adopt:

- a recognizable owner problem or relief in the opening rather than a long
  logo-only slate;
- existing menu source to private preview as the default first proof;
- one job-to-be-done and one belief change per cut;
- real MenuList UI or an internally disclosed exact mock;
- beat-level HyperFrames compositions with a conversion brief, frame system,
  storyboard, handoff, and immutable approved render;
- native `16:9` and `9:16` compositions built from shared scene logic;
- approved MenuList BGM, voice-reactive ducking, and motivated SFX;
- founder or human-reviewed Indian-English delivery where trust matters; and
- a plain encoded end slate with logo, name, tagline, and readable
  `menulist.ai`, while interactive CTAs live beside the video.

Adapt:

- the official open HyperFrames launch repository's modular project pattern,
  not its visual styles or media;
- SaaS feature-reel pace to non-technical owner comprehension;
- LinkedIn's people-led B2B guidance to founder, partner, investor, and
  multi-location contexts rather than assuming it is the only SMB-owner
  channel; and
- AI-assisted production into a local, founder-reviewed, product-truth
  workflow rather than consumer-facing AI spectacle.

Reject:

- paid prompt-to-video, avatar, hosted-render, stock-catalog, and cloud paths;
- generic glass, neon, dark technical, robot, or AI-magic aesthetics;
- fake social posts, testimonials, ratings, customer logos, external-platform
  sync, and vendor conversion claims;
- fixed cut cadences, constant motion, universal retention targets, and
  automatic speed-ups; and
- copying code, assets, fonts, music, or design systems from reference
  projects without explicit rights.

The August 10 source audit found 17 projects in the official HyperFrames launch
repository: 15 landscape, two square, and no native vertical project. Source
duration ranged from approximately `16.47s` to `64.05s`, with a median near
`39.5s`; the median project used nine scene compositions. Eight projects had a
storyboard, eight had a handoff, and one had a brief. This is a curated vendor
sample, not a market-performance benchmark. The repository had no observed
root license file, so it is a pattern reference only.

**Current decision**

Apply the production and distribution rules to all new MenuList video work now.
Keep HyperFrames as the only video composition system and retain the zero-cost,
local-only media boundary. No new paid tool, hosted generation path, external
asset, campaign spend, product claim, runtime feature, or tracking
implementation is authorized by this market study.

**Validation basis**

- [Official HyperFrames examples](https://hyperframes.heygen.com/launch-videos)
- [Open HyperFrames launch-project repository](https://github.com/heygen-com/hyperframes-launches)
- [Wistia 2026 State of Video](https://wistia.com/blog/video-marketing-statistics)
- [YouTube Shorts ads guidance](https://support.google.com/google-ads/answer/16040527?hl=en)
- [YouTube Shorts asset specifications](https://support.google.com/google-ads/answer/16041697?hl=en)
- [TikTok creative best practices](https://ads.tiktok.com/help/article/creative-best-practices?redirected=1)
- [TikTok commercial-content quality standard](https://ads.tiktok.com/help/article/about-tiktoks-content-quality-standard-for-creator-commercial-content)
- [LinkedIn 2026 people-powered B2B guidance](https://www.linkedin.com/business/marketing/blog/trends-tips/b2b-marketing-insights-creators-thought-leadership)
- [Gartner 2026 consumer GenAI trust survey](https://www.gartner.com/en/newsroom/press-releases/2026-03-16-gartner-marketing-survey-finds-50-percent-of-consumers-prefer-brands-that-avoid-using-genai-in-consumer-facing-content0)
- [Toast digital-menu setup](https://support.toasttab.com/en/article/Setting-up-mobile-payments-and-digital-menus)
- [Owner.com current positioning](https://www.owner.com/)
- [PureMenu current positioning](https://www.getpuremenu.com/)
- [Arcade 2026 public launch-example index](https://www.arcade.software/post/product-launch-video-examples) - directional competitor source only; vendor performance claims were not adopted

**Related MenuList truth**

- [Launch-video conversion research](../videos/videos_launch-video-conversion-research.md#august-2026-market-study-what-teams-are-actually-shipping)
- [HyperFrames operating guide](../videos/videos_hyperframes-operating-guide.md#market-derived-hyperframes-decisions)
- [Founder-approved production standard](../videos/videos_founder-approved-production-standard.md)
- [Market, format, and script system](../videos/videos_market-format-and-script-system.md)
- [Video asset intake and readiness](../videos/videos_asset-intake-and-readiness.md)
- [Campaign measurement ledger](../videos/videos_campaign-measurement-ledger.md)

**Outcome history**

- August 10, 2026 - Audited current market research, official platform guidance, the official HyperFrames examples gallery, and the source structure of 17 open HyperFrames launch projects.
- August 10, 2026 - Added the accepted patterns and explicit rejections to the maintained launch-video conversion research and HyperFrames operating guide without changing the local-only production boundary.
- August 10, 2026 - Mapped official YouTube Shorts, TikTok, LinkedIn, Wistia, Toast, Owner.com, and PureMenu evidence into native-format roles, current category contrast, a canonical 12-video script system, and a real-asset intake gate.
- August 10, 2026 - Revised all 12 individual handoffs to remove unmeasured `in minutes` and absolute `no typing` claims, front-load product proof, preserve owner approval, require native aspect-ratio composition, and separate encoded identity from clickable CTA.

### ML-MKT-EXT-009 - Signal-Led GTM Plays For Permissioned MenuList Distribution

- **Status:** `ALREADY_COVERED`
- **Shared:** August 10, 2026
- **Source:** [Clay buying-signal guide](https://www.clay.com/guides/how-to-identify-buying-signals), [Common Room signals](https://www.commonroom.io/resources/signals/), [HubSpot lead scoring](https://knowledge.hubspot.com/scoring/build-lead-scores), [Pocus playbook reporting](https://www.pocus.com/blog/introducing-playbook-reporting), [Customer.io lifecycle automations](https://docs.customer.io/messaging/send/types-of-automations-and-broadcasts/), [Google Business Profile menu editor](https://support.google.com/business/answer/9455840?hl=en), [Google business-representation guidelines](https://support.google.com/business/answer/3038177?hl=en-en), [WhatsApp Business policy](https://whatsappbusiness.com/policy/), [Owner.com website grader](https://grader.owner.com/), [Toast referral flow](https://pos.toasttab.com/uk/events/referral), and [Petpooja reseller programme](https://www.petpooja.com/poss/reseller-program)
- **Source type:** Current vendor-product, lifecycle-workflow, restaurant-distribution, and platform-policy review
- **Topics:** signal-led-gtm, signal-stacking, matched-plays, first-party-lifecycle, permissioned-introduction, current-list-consistency, private-preview, google-profile, trust-partner, proof-reuse, outcome-receipts
- **Use when:** Selecting the first permissioned MenuList field play, reviewing SignalDesk recommendation quality, or deciding whether a repeated field gap justifies later automation.
- **Revalidate:** Current vendor features and terms, Google and WhatsApp policies, SignalDesk permissions and provider flags, and real MenuList pilot outcomes. Vendor examples are directional operating evidence, not proof of MenuList results.

**Source idea**

The useful market pattern is not an autonomous marketing agent. It is a bounded loop:

```text
fresh signals
-> corroborated fit
-> one matched play
-> human and permission gate
-> executed action
-> outcome receipt
-> keep, change, or stop
```

Stronger systems combine current signals, keep fit and contact permission separate, start with human-assisted plays, use first-party lifecycle events after opt-in, and connect activity to downstream outcomes instead of treating message volume as success.

**MenuList verdict**

The pattern confirms the existing MenuList and SignalDesk architecture:

- keep business fit, current-list gap, evidence freshness, contactability, permission, risk, and downstream outcome separate;
- never treat one public fact, public contact value, or high fit score as permission to contact;
- when multiple permissioned businesses are available, prioritize two corroborating current-source facts or one owner-confirmed problem without changing the current runtime score;
- use the existing no-cost current-list consistency audit plus private MenuList preview as the first matched play;
- progress only through a real permissioned business or approved partner introduction, owner review, owner-approved publication, Google/Profile plus one additional customer surface, and an outcome receipt;
- use consented first-party lifecycle recovery only after an owner enters the funnel;
- use new-opening, relaunch, or seasonal-change evidence only when it is current, corroborated, and connected to a permissioned route;
- turn owner questions into existing MenuList tools or proof-led resources instead of creating another generic content or free-tool system; and
- turn one eligible activation into the existing proof, partner, referral, and channel-derivative workflow.

Reject anonymous visitor identification, purchased or scraped signal-to-send automation, cold WhatsApp or social outreach, opaque composite lead scores, a new CRM, another partner portal, more generic free tools, auto-publishing, autonomous spend, and vendor pipeline statistics as MenuList forecasts.

**Current decision**

No new code, collection, score, provider, integration, channel, or public surface. Align the maintained operating wording and execute one existing field unit first:

```text
permissioned business or partner
-> current-list consistency audit
-> private preview
-> owner approval
-> Google/Profile plus one additional surface
-> outcome receipt
-> separate proof permission
```

Add runtime only if repeated real runs expose a decision or evidence gap that current SignalDesk records cannot represent. Paid click-to-WhatsApp, partner rewards, and provider-managed profile changes remain evidence-gated.

**Related MenuList truth**

- [SignalDesk AI sales, marketing, and distribution research](../menulist-signaldesk/menulist-signaldesk_ai-sales-marketing-distribution-research-2026-07-11.md)
- [Distribution workflow research](./menulist-marketing-distribution_distribution-workflow-research-2026-07-11.md)
- [Bengaluru activation-trial operating pack](../menulist-signaldesk/menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md)
- [Activation Concierge](../menulist-activation-concierge/README.md)
- [Activation and follow-up](./menulist-marketing-distribution_activation-follow-up.md)
- [Physical partner pilot](./menulist-marketing-distribution_physical-partner-pilot.md)
- [Pilot proof and owner learning pack](./menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md)
- [First proof distribution run](./menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md)
- [Public Truth Tools](../menulist-tools/public-truth-tools/README.md)

**Outcome history**

- August 10, 2026 - Compared current signal-led GTM, lifecycle, restaurant-partner, Google Business Profile, and messaging-policy patterns with current MenuList and SignalDesk contracts.
- August 10, 2026 - Confirmed that the useful architecture is already covered; aligned the maintained field wording, lifecycle recovery, referral timing, and derivative count without adding runtime scope.

### ML-MKT-EXT-010 - Evidence-Backed Organic Product Distribution

- **Status:** `ALREADY_COVERED`
- **Shared:** August 10, 2026
- **Source:** Founder-supplied full text attributed to Chris (`@everestchris6`), titled `how to actually sell a product (full guide)`; no stable X URL was supplied.
- **Source type:** X article/post
- **Topics:** founder-led-distribution, audience-research, voice-of-customer, customer-language, organic-marketing, content-packaging, hooks, retention, native-repurposing, community-listening, reddit, instagram, youtube, tiktok, apify-mcp, manual-first-automation
- **Use when:** Refreshing the MenuList audience-language hypothesis or briefing a proof-led asset after three permissioned owner interviews or the first approved proof run.
- **Revalidate:** Current platform recommendation guidance, Reddit and Meta data-access terms, Apify Actor permissions and telemetry, owner consent and proof rights, actual cross-format audience behavior, and current MenuList pilot outcomes.

**Source idea**

Define one concrete buyer and problem before creating content, validate assumed
needs against real language, choose channels by where that buyer already seeks
help, package the promise before production, test bounded variants, read
attention alongside delivery, adapt one useful idea to each channel, and
automate only repetitive collection or drafting after manual judgment is
reliable.

**MenuList verdict**

The useful spine confirms the existing MenuList distribution system:

- use one evidence-backed campaign audience, problem, promise, proof, and next
  action rather than addressing a generic SMB category in each asset;
- learn from permissioned owner interviews, observed update workflows,
  first-party questions, and consented owner wording;
- use the existing current-list consistency audit plus private preview as the
  small first offer rather than creating another guide, course, template pack,
  or product;
- choose each channel by its job, with permissioned founder or trust-partner
  introduction first and public content only after approved proof;
- align title, thumbnail or first frame, opening, proof, and CTA so the asset
  delivers the promise it packages;
- turn one approved proof packet into channel-native derivatives instead of
  copying one post unchanged; and
- measure qualified conversation, preview acceptance, owner approval,
  two-surface activation, first owner update, day-30 continuity, proof
  permission, and referral instead of treating reach as the outcome.

Adapt or reject the unsafe and unsupported instructions:

- an AI-generated persona is a hypothesis with stated confidence and unknowns,
  not evidence of income, fears, identity, or an hour-by-hour life;
- do not infer demographics or psychographics from profile photos or retain
  identifiable follower dossiers;
- do not use an unrestricted Apify MCP or another actor to bulk-scrape Reddit,
  Instagram, YouTube, or follower data; Actor availability does not grant
  platform or commercial-use permission;
- do not treat age-to-platform stereotypes, a two-platform count, a fixed
  two-second or three-word opening, or thumbnail-text trends as universal laws;
- do not post the same commercial body under different titles in separate
  subreddits as an A/B test; community, audience, timing, and rules differ;
- do not treat click and retention as one disclosed algorithm number, infer one
  certain cause from a retention curve, or treat retention as the only honest
  feedback; and
- do not automate community monitoring, posting, replies, or product-scope
  decisions from repeated anonymous complaints.

**Current decision**

No code, schema, collection, provider connection, scraper, scheduler, audience
profile document, SignalDesk expansion, CampaignCue expansion, publishing
action, or spend. The next evidence unit remains three permissioned owner
conversations and one completed two-surface activation. Only then should the
audience-language hypothesis be refreshed from observed deltas.

**Validation basis**

- [YouTube appeal, engagement, and satisfaction guidance](https://support.google.com/youtube/answer/16559650)
- [YouTube audience-retention interpretation](https://support.google.com/youtube/answer/9314415)
- [YouTube native title and thumbnail testing](https://support.google.com/youtube/answer/16391400)
- [TikTok creative best practices](https://ads.tiktok.com/help/article/creative-best-practices)
- [Reddit developer access and commercial-use rules](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data)
- [Reddit spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam)
- [Instagram Terms of Use](https://www.facebook.com/help/instagram/581066165581870)
- [Meta Automated Data Collection Terms](https://www.facebook.com/legal/automated_data_collection_terms)
- [Apify MCP documentation](https://docs.apify.com/integrations/mcp)
- [Apify general terms](https://docs.apify.com/legal/general-terms-and-conditions)

**Related MenuList truth**

- [Existing organic-distribution decision](#ml-mkt-ext-004---audience-aligned-organic-distribution-across-x-youtube-and-short-form)
- [Portfolio distribution insight ledger](../strategy/product-portfolio-distribution-insight-ledger.md)
- [Distribution workflow research](./menulist-marketing-distribution_distribution-workflow-research-2026-07-11.md)
- [Pilot proof and owner learning](./menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md)
- [First proof distribution run](./menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md)
- [Video conversion brief](../videos/videos_conversion-brief-template.md)
- [SignalDesk Apify source broker](../menulist-signaldesk/menulist-signaldesk_apify-source-broker.md)
- [SignalDesk Content Distribution Rail](../menulist-signaldesk/signaldesk-content-distribution-rail/README.md)

**Outcome history**

- August 10, 2026 - Checked the founder-supplied article against current YouTube, TikTok, Reddit, Meta, Instagram, and Apify guidance plus MenuList, SignalDesk, CampaignCue, video, owner-learning, and proof-distribution contracts. Retained the evidence-backed manual-first framework, rejected profiling, bulk scraping, duplicate-community testing, and universal algorithm rules, and confirmed that no runtime change is needed.

### ML-MKT-EXT-011 - Gamma AI Discovery And Dark Attribution Claims

- **Status:** `APPLY_NOW` for optional self-reported discovery measurement; `DEFERRED_REFERENCE`, `RESEARCH_REQUIRED`, or `REJECTED` for the remaining claims as described below.
- **Shared:** August 13, 2026
- **Source:** Founder-supplied 23-point summary titled `Watched 1 hour of Gamma's insane $100M growth hacks so you don't have to`; no original video URL, speaker identity, transcript, test design, or source spreadsheet was supplied.
- **Source type:** Founder-supplied article/conversation summary
- **Topics:** ai-discovery, answer-engine-optimization, dark-attribution, self-reported-attribution, comparisons, citations, ChatGPT, Claude, Gemini, Copilot, Bing, Reddit, YouTube, LinkedIn, Instagram, agent-install, agent-signup, brand-impersonation
- **Use when:** Planning signup attribution, factual comparison pages, AI-readable product surfaces, agent-install boundaries, branded-search protection, or a quarterly discovery review for MenuList.
- **Revalidate:** The original Gamma source and methodology; current OpenAI, Anthropic, Google, Microsoft, Bing, Reddit, YouTube, LinkedIn, and Instagram indexing or citation behavior; MenuList referral data; current public claims; and privacy disclosures. Never reuse the supplied percentages, multipliers, indexing delays, citation lifetimes, or platform absolutes as facts without current evidence.

**Source idea**

The summary argues that discovery is shifting from click-based search toward AI
answers, comparison-shaped content is more citable than praise, visible web
analytics undercount AI-assisted discovery, open and machine-readable content
has an advantage, and products should eventually expose safe install or action
paths for AI clients. It also describes agent-only urgency copy and aggressive
competitor framing as growth tactics.

**MenuList verdict**

Apply the smallest evidence-safe measurement change now:

- ask one optional closed-list question during paid workspace onboarding:
  `Where did you first hear about MenuList?`;
- distinguish ChatGPT, Claude, Gemini, Microsoft Copilot, Perplexity, search,
  social/community, friend/colleague, and other;
- store only `method`, `channel`, and broad `category` on the existing tenant
  creation write;
- collect no free text, personal profile, prompt text, conversation content, or
  new analytics identifier;
- add no collection, index, listener, scheduler, provider call, or extra
  Firestore operation; and
- use the result as directional cohort evidence, not last-click truth.

Retain as useful operating guidance:

- publish factual, evidence-backed comparison material only when it helps an
  owner choose, and never invent competitor weaknesses;
- keep public product truth crawlable, stable, clearly titled, and accessible
  without unnecessary gates;
- package eligible YouTube material around the real owner question it answers,
  while treating title, content, authority, freshness, and user value as a
  combined system rather than a title hack;
- monitor branded search and public impersonation risk through existing
  security/distribution review; and
- treat AI referral reporting as incomplete unless click analytics and optional
  self-report evidence are reviewed together.

Defer pending evidence:

- model-specific citation rates, source preferences, citation latency or
  expiry, memory compounding, subreddit-size thresholds, and claims that one
  platform categorically reads or ignores Reddit, X, LinkedIn, Instagram,
  Substack, Medium, Quora, YouTube, Bing, or the live web;
- the `60/40`, `8x`, `30-45 day`, `three month`, `24 hour`, and `6-12 month`
  figures;
- an official Claude/ChatGPT/Copilot app or read-only agent action layer until
  a concrete owner job, authentication model, support owner, terms, cost, and
  security review justify it; and
- automated attribution summaries until enough real signups exist to show that
  manual tenant-cohort review is insufficient.

Reject:

- hidden files or agent-only instructions designed to manipulate an AI into
  choosing MenuList;
- fake urgency, fabricated discounts, prompt injection, citation gaming,
  undisclosed influence, or content written to mislead an agent;
- uncontrolled competitor claims on MenuList-owned pages; and
- allowing an agent to create an account, accept billing, install tools, spend,
  publish, or change business truth without explicit authenticated owner
  authority and confirmation.

**Current decision**

Enable the optional self-reported discovery field in MenuList and the separate
Answerlattice onboarding flow through product-specific flags. Persist it on the
existing tenant write and disclose the purpose in each privacy page. Keep
manual cohort review as the first reporting path. Do not create a dashboard or
summary write until actual volume demonstrates a repeated decision need.

No connector, AI app, MCP expansion, agent signup, automated install, comparison
page, Reddit campaign, fake urgency, ad purchase, account action, or publication
is authorized by this entry.

**Related MenuList truth**

- [Marketing distribution operating system](./README.md)
- [Portfolio distribution insight ledger](../strategy/product-portfolio-distribution-insight-ledger.md)
- [Publisher and AI distribution readiness](./menulist-marketing-distribution_publisher-ai-distribution-readiness.md)
- [Public truth indexing policy](../discovery-infrastructure/public-truth-indexing-policy.md)
- [Growth and funnel strategy](../marketing/menulist-growth-and-funnel-strategy.md)
- [Auth and onboarding](../auth-onboarding/README.md)

**Outcome history**

- August 13, 2026 - Preserved the founder-supplied claim order and reviewed the 23 claims as candidate evidence rather than authority.
- August 13, 2026 - Adopted only the privacy-safe dark-attribution measurement gap: one optional closed-list field on the existing MenuList and Answerlattice tenant writes.
- August 13, 2026 - Extended the existing external-insight intake system and added a verifier for sequential IDs, required decision fields, cross-product routing, and the self-reported discovery source contract.

### ML-MKT-EXT-012 - Internal Category Versus Owner-Facing Launch Language

- **Status:** `APPLY_NOW` for the language boundary; `REJECTED` for unqualified `always current`, `customers always see`, and `update once everywhere` claims.
- **Shared:** August 27, 2026
- **Source:** Founder-supplied expert review of MenuList launch-video positioning; no author, URL, research method, or performance evidence was supplied.
- **Source type:** Founder-supplied expert feedback
- **Topics:** positioning, owner-language, launch-video, website-copy, category-language, claim-safety
- **Use when:** Writing MenuList website, product, sales, support, onboarding, video, partner, or ecosystem copy.
- **Revalidate:** Current product publication behavior, supported MenuList outputs, cache windows, external integrations, and owner language from permissioned sales or onboarding evidence.

**Source idea**

The expert recommended keeping `public-business truth infrastructure` out of non-technical SMB acquisition and translating it into immediate owner language such as old menus, conflicting prices, and one link the owner can keep updated. The expert also proposed absolute shorthand such as `customers always see the current version` and `update once`.

**MenuList verdict**

Keep `public-business truth infrastructure` as internal category language for doctrine, architecture, partners, investors, and ecosystem explanation. Do not lead non-technical SMB acquisition with it. Translate the same strategy into the owner's immediate problem and visible outcome: old menus, conflicting prices, scattered PDFs or links, and one owner-approved customer link for the latest published version.

The supplied alternatives were directionally useful but too absolute where they said customers `always` see the current version or implied one update reaches every destination. MenuList copy must name owner review and publishing, scope propagation to supported MenuList outputs, and treat external platforms as owner-placed destinations unless a verified integration proves more.

**Current decision**

Apply the internal-category versus owner-promise distinction across current language governance, marketing operations, product copy, and video authority. Preserve the existing owner-native website copy where it already follows this rule. Reject unqualified freshness and universal propagation wording.

**Related MenuList truth**

- [Language governance](../constitution/02-language-governance.md)
- [Founder-approved video production standard](../videos/videos_founder-approved-production-standard.md)
- [Marketing and Distribution Bible](../distribution-operating-system/distribution-operating-system_bible.md)
- [MenuList marketing distribution](./README.md)

**Outcome history**

- August 27, 2026 - Updated language governance, video production authority and handoffs, internal project memory, marketing doctrine, owner-facing link copy, staff-share copy, and the active HyperFrames truth-loop source.
- August 27, 2026 - Extended the website public-copy verifier to block the internal category phrase on public website surfaces and preserve the latest-published-version wording in owner-facing link surfaces.

## Maintenance

- Add entries sequentially as `ML-MKT-EXT-001`, `ML-MKT-EXT-002`, and so on.
- Keep entries concise and decision-oriented.
- Prefer one ledger entry over creating one file per social post.
- Create a dedicated research document only when an input develops into a substantial, actively used workstream.
- Never silently convert `DEFERRED_REFERENCE` or `RESEARCH_REQUIRED` into implementation.
- Preserve rejected entries when they explain an important boundary; do not repeatedly reconsider the same unsuitable advice without new evidence.
- Review deferred entries when their named trigger occurs, not on an arbitrary calendar.
