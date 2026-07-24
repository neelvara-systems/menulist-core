# MenuList External Insight Ledger

**Status:** Active maintained ledger
**Created:** July 18, 2026
**Owner:** Founder with Codex review
**Scope:** External posts, articles, videos, expert feedback, market observations, AI outputs, competitor examples, and operating ideas relevant to MenuList marketing, launch, distribution, video, positioning, conversion, or growth.

## Purpose

This ledger preserves useful external inputs that may matter later without turning them into immediate work.

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

## Intake Workflow

Whenever the founder shares a potentially useful external input in a MenuList strategy, marketing, launch, distribution, video, or growth conversation:

1. **Capture:** Record the source URL, source type, author or publisher when known, date shared, and a concise summary. Do not paste an entire copyrighted article when a summary is sufficient.
2. **Validate:** Resolve the primary source when possible. Check factual or platform-dependent claims against current official documentation and current repo truth.
3. **Classify:** Assign one decision:
   - `APPLY_NOW` - useful, current, within scope, and needed by active work.
   - `DEFERRED_REFERENCE` - useful, but only when a named trigger occurs.
   - `ALREADY_COVERED` - useful confirmation of an existing MenuList rule.
   - `RESEARCH_REQUIRED` - potentially useful, but not yet evidence-backed.
   - `REJECTED` - wrong fit, unsafe, unsupported, stale, or contrary to doctrine.
4. **Route:** Link the existing MenuList doc, workflow, runtime surface, or future decision where the entry belongs. Do not create implementation work merely because the source was logged.
5. **Retrieve:** Before related strategy or execution, search this ledger using the topic, channel, funnel stage, or tags.
6. **Revalidate:** Recheck platform rules, pricing, laws, market facts, APIs, and other time-sensitive claims before applying a deferred entry.
7. **Close the loop:** If an entry is later adopted, rejected, or superseded, update its status, decision date, linked evidence, and outcome.

## Retrieval Rules

Search this ledger before work involving:

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

## Maintenance

- Add entries sequentially as `ML-MKT-EXT-001`, `ML-MKT-EXT-002`, and so on.
- Keep entries concise and decision-oriented.
- Prefer one ledger entry over creating one file per social post.
- Create a dedicated research document only when an input develops into a substantial, actively used workstream.
- Never silently convert `DEFERRED_REFERENCE` or `RESEARCH_REQUIRED` into implementation.
- Preserve rejected entries when they explain an important boundary; do not repeatedly reconsider the same unsuitable advice without new evidence.
- Review deferred entries when their named trigger occurs, not on an arbitrary calendar.
