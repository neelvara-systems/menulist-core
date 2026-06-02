# Growth Engine - Distribution Architecture

**Status:** Direction lock for Growth Engine planning
**Decision date:** June 1, 2026
**Product decision:** Growth Engine becomes MenuList-owned distribution infrastructure, not a generic lead-gen stack.
**Rule:** No roadmap split. The architecture must include the full distribution baseline from the start, with runtime exposure controlled by feature flags and approvals.

---

## 1. Core Decision

Growth Engine should not be only:

```txt
find leads -> send outreach -> route to onboarding
```

It should become:

```txt
find distribution target
-> detect menu truth gap
-> route owner to claim or verify
-> activate canonical MenuList truth
-> publish owned surfaces
-> notify discovery systems
-> hand off authorized external listing updates
-> distribute through owned channels
-> monitor freshness and drift
-> attribute completed onboarding and truth coverage
```

Lead generation remains one input. Distribution activation becomes the product.

## 2. Research Inputs

| Area | Source | Product impact |
| --- | --- | --- |
| LocalBusiness structured data | https://developers.google.com/search/docs/appearance/structured-data/local-business | MenuList public pages should expose restaurant/business facts with specific LocalBusiness subtypes and menu URLs. |
| Schema.org menu model | https://schema.org/MenuItem and https://schema.org/Restaurant | Canonical menu pages need machine-readable Restaurant, Menu, MenuSection, MenuItem, Offer, price, currency, language, and availability data. |
| Sitemaps | https://www.sitemaps.org/protocol.html | MenuList needs sitemap inventory, accurate lastmod values, sitemap indexes, host-correct URLs, and robots.txt sitemap pointers. |
| IndexNow | https://www.indexnow.org/faq | Changed public URLs can be pushed to participating search engines, but submissions do not guarantee indexing and should be limited to meaningful changes. |
| Google Indexing API | https://developers.google.com/search/apis/indexing-api/v3/using-api | Do not use the Indexing API for menu pages; official scope is job posting and livestream pages. |
| Google menu feeds | https://developers.google.com/actions-center/verticals/ordering/redirect/reference/menu-feeds/overview | MenuList can design feed-ready data for partner eligibility: full refreshes, restaurant entity mapping, menu sections, items, prices, language, and freshness. |
| Google Business Profile API policy | https://developers.google.com/my-business/content/policies | GBP APIs are only for owned/authorized locations and existing business relationships; GoogleLocations lead-gen use is prohibited. |
| Google Business Profile menu editor | https://support.google.com/business/answer/9455840 | Claimed owners can set menu URLs, choose preferred menu sources, and manage menu data on Search/Maps. Growth Engine should produce owner handoff and authorized sync paths only. |
| Apple Business Connect | https://www.apple.com/newsroom/2023/01/introducing-apple-business-connect/ | Business owners can manage Apple Maps place cards and action links; Growth Engine should track owner-authorized handoffs where MenuList URL improves distribution. |
| Bing Places API | https://cdn.bingplaces.com/tpshared/BingPlaces_API_Latest.pdf | Bing Places supports restaurant categories, menu URLs, status checks, and quality issues; Growth Engine should track authorized handoffs without treating Bing as canonical truth. |
| Foursquare Places API and data products | https://docs.foursquare.com/developer/reference/places-api-overview, https://docs.foursquare.com/data-products/docs/categories, and https://docs.foursquare.com/data-products/docs/chains | Foursquare validates the place-graph model: place identity, category taxonomy, chain membership, related places, and quality flags are valuable for target identity. Use as source-policy-gated identity/category/chain signal, not as MenuList truth. |
| Foursquare PAYG API terms | https://foursquare.com/legal/terms/apilicenseagreement/ | Standard pay-as-you-go terms prohibit using Places Data to contact listed businesses as prospective customers. Growth Engine must block outreach eligibility for Foursquare PAYG data unless a separate contract or written permission allows it. |
| FSQ OS Places | https://docs.foursquare.com/data-products/docs/fsq-places-open-source and https://docs.foursquare.com/data-products/docs/places-os-data-schema | Open-source POI data can be evaluated separately for identity graph enrichment, with license/source review, field allowlist, retention policy, and no public truth use until verified. |
| Gmail sender rules | https://support.google.com/a/answer/81126 | Owned email distribution still needs SPF, DKIM, DMARC, one-click unsubscribe, visible unsubscribe, and spam-rate monitoring. |
| CAN-SPAM | https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business | Commercial email requires sender identity, postal address, opt-out handling, and prompt suppression. |
| WhatsApp Business Terms | https://www.whatsapp.com/legal/business-terms/ | WhatsApp requires necessary rights, consents, and permissions, and businesses must honor stop and opt-out requests. Growth Engine must treat phone number availability as insufficient for WhatsApp eligibility. |
| WhatsApp Business Messaging Policy | https://www.whatsapp.com/legal/business-policy/ | Business-initiated WhatsApp messages require opt-in and approved templates outside the customer service window. Growth Engine must block cold API outreach from scraped, enriched, Google Places, or Foursquare numbers. |
| WhatsApp Platform Pricing | https://whatsappbusiness.com/products/platform-pricing/ | Pricing and service windows make conversation state, message category, and cost attribution first-class distribution controls. |
| WhatsApp Flows | https://whatsappbusiness.com/products/whatsapp-flows/ | Flows are useful for structured owner-confirmed business truth capture, not for generic chat, hidden consent, or lead resale intake. |

## 3. What Was Missing

The lead-gen model was missing the parts that create distribution power:

| Missing piece | Why it matters |
| --- | --- |
| Distribution target registry | A lead is a person/contact. Distribution needs a business/location/menu target with surfaces, claim state, and public URL inventory. |
| Business Truth Graph registry | MenuList becomes global menu truth only if businesses, locations, outlets, menus, surfaces, sources, claims, and handoffs are durable identities with relationships. Pages alone do not compound. |
| Canonical truth activation | Outreach does not matter unless it creates a MenuList-owned canonical menu/business surface. |
| Public surface publisher | MenuList needs its own menu pages, business pages, city/category pages where legitimate, structured data, and freshness metadata. |
| Discovery publisher | Sitemaps, robots.txt references, IndexNow, feed exports, and crawl health must be owned internally. |
| Menu feed exporter | To become menu truth, MenuList needs feed-ready menu data, even before a partner approves ingestion. |
| GBP handoff and authorized sync | Owner-claimed locations need menu URL/preferred-source guidance and only authorized API paths. |
| AI-readable truth packets | Search and AI agents need stable, crawlable, machine-readable summaries based only on confirmed public truth. |
| Surface health monitor | The system needs to know whether pages are indexable, noindex, stale, broken, redirected, or missing structured data. |
| Freshness and drift monitor | Distribution decays when menus, prices, hours, or availability become stale. |
| Owned channel composer | Email, WhatsApp, and share links should be internal rails, not outsourced to generic outreach tools. |
| WhatsApp Message Governance Layer | WhatsApp API sends need consent proof, suppression checks, approved templates, conversation-window state, sender identity health, webhooks, reputation monitoring, Flow review, and kill switches before provider execution. |
| Automation workflow engine | Distribution requires repeatable triggers, enrichment waterfalls, AI workers, decision snapshots, sender assignment, operator queues, and optimization reports. |

## 4. Owned Distribution Principle

Do not depend on third-party growth tools as the system of record.

Growth Engine owns:

- target identity graph
- business truth graph candidate edges
- source policy
- connection adapter registry
- provider secret refs and validation state
- consent and suppression
- WhatsApp consent, suppression, templates, conversation state, sender identity, webhooks, Flow definitions, and reputation health
- distribution queue
- templates and message guards
- public URL inventory
- sitemap and feed jobs
- structured-data validation
- IndexNow submissions
- GBP owner handoff state
- canonical claim routes
- workflow runs and decision snapshots
- AI worker registry and eval gates
- enrichment waterfalls and evidence packets
- sender assignment and pacing
- operator work queues
- attribution and freshness health
- inbox and reply handling

Low-level infrastructure adapters are allowed:

- email delivery API or SMTP provider
- WhatsApp Business Platform only behind Growth Engine's Message Governance Layer, or assisted WhatsApp handoff where API eligibility is not yet approved
- IndexNow endpoint
- Google Business Profile APIs after owner authorization and policy approval
- Google Actions Center feeds only after eligibility and partner setup
- storage, task queues, analytics, and monitoring providers

The product value must live in MenuList-owned logic, not in Clay, Apollo, HubSpot, Instantly, Smartlead, Apify, or a similar growth workflow as the core system.

## 5. Distribution Surfaces

| Surface | Growth Engine responsibility | Hard rule |
| --- | --- | --- |
| Canonical MenuList menu page | Track publish readiness, sitemap eligibility, structured data, freshness, and attribution. | Public and indexable only after owner confirmation or approved MenuList verification. |
| Official Business Page | Track business truth completeness, menu URL, hours, phone, address, and language coverage. | Do not publish scraped facts as verified business truth. |
| City/category discovery pages | Publish only if pages are useful, indexable, and based on confirmed public truth. | No thin pages made from scraped leads. |
| Private claim artifact | Show a safe preview or audit to help the owner understand the gap. | Must be noindex, expiring, and clearly unclaimed. |
| Sitemap and sitemap index | Emit changed public URLs with accurate lastmod and host-correct URLs. | Sitemaps are inventory, not a guarantee of indexing. |
| IndexNow | Submit meaningful changed URLs to participating engines. | Do not submit unchanged pages or use it as a spam lever. |
| Google-compatible menu feed | Export feed-ready restaurant/menu/entity data. | Only submit through approved partner/eligible channels. |
| GBP handoff | Guide owner to set MenuList menu URL or preferred source. | GBP APIs require authorization and existing relationship; no lead-gen use. |
| Apple Business Connect handoff | Guide owner or approved partner to connect MenuList URL/action where eligible. | Owner authorization required; not a source of MenuList truth. |
| Bing Places handoff | Track MenuList menu URL and listing quality handoff where owner-authorized. | Do not use listing APIs for scraping or unverified truth. |
| AI-readable truth packet | Publish a concise JSON/Markdown packet for confirmed public truth. | No private PII, scraped facts, or unverified menu data. |
| QR/PDF/share links | Generate owned distribution links from canonical truth. | Links must resolve to current MenuList truth. |
| Owner website widget/embed | Let owners put MenuList truth on their own site. | Widget must not create a separate truth source. |
| Email/WhatsApp distribution | Contact eligible owners and route them to claim/onboarding. | Suppression, sender readiness, opt-in, template/window eligibility, governance audit, and channel policy must pass. |
| WhatsApp Flow truth capture | Collect structured owner-confirmed hours, menu URL, category, outlet, contact, or support data. | Flow fields must be approved, minimal, consent-safe, and cannot publish public truth without verification. |

## 6. Required System Modules

| Module | Responsibility |
| --- | --- |
| Distribution Target Registry | Business/location/menu target identity, source provenance, claim state, and surface inventory. |
| Connections And Activation | Internal control screen and registry for adapter IDs, provider secret refs, email pipeline readiness, WhatsApp pipeline readiness, webhook health, budgets, kill switches, validation, and activation state. |
| Business Truth Graph Registry | Candidate and confirmed identity nodes/edges across business, location, outlet, menu, source, claim, surface, handoff, freshness, and attribution relationships. |
| Automation Workflow Engine | Typed triggers, steps, retries, idempotency, budget gates, approvals, and kill-switch checks. |
| Enrichment Waterfall Engine | Ordered source/provider/AI evidence runs for identity, menu gap, contactability, and source confidence. |
| AI Worker Registry | Typed AI worker inputs/outputs, prompt versions, eval thresholds, budget caps, and blocked-output behavior. |
| Decision Snapshot Ledger | Evidence-backed reason for every hold, reject, route, send, publish, notify, or pause decision. |
| Truth Activation Engine | Converts interested targets into claim routes and canonical MenuList truth activation. |
| Public Surface Publisher | Coordinates canonical menu pages, business pages, structured data, and publish status. |
| Discovery Publisher | Owns sitemaps, robots.txt sitemap pointers, IndexNow submissions, crawl health, and changed-URL queue. |
| Menu Feed Exporter | Produces feed-ready menu/entity payloads for Google-compatible and partner-compatible distribution. |
| External Listing Handoff Manager | Tracks owner-authorized GBP, Apple Business Connect, and Bing Places menu URL/action handoffs. |
| AI Truth Packet Publisher | Emits machine-readable public truth packets from confirmed MenuList data only. |
| Surface Health Monitor | Checks indexability, canonical tags, noindex, redirects, structured data, HTTP status, and stale pages. |
| Freshness Monitor | Tracks menu, price, availability, hours, language, and outlet freshness. |
| Owned Channel Engine | Sends or queues email/WhatsApp/share distribution with internal templates, caps, suppression, and attribution. |
| WhatsApp Message Governance Layer | Controls WhatsApp consent proof, suppression, template eligibility, conversation windows, sender identity, pacing, webhooks, Flow submissions, reputation, and audit before any WhatsApp API send. |
| Sender Assignment Engine | Assigns sender identity per target, preserves conversation continuity, applies pacing, timezone, and sender-health rules. |
| Operator Workboard | Turns review, reply, handoff, discovery, freshness, cost, eval, and incident exceptions into auditable work items. |
| Attribution Graph | Connects source, artifact, channel, public URL, claim route, onboarding, publication, and freshness outcomes. |

## 7. Data Model Additions

```ts
type GrowthDistributionTarget = {
  pId: 'GE';
  targetId: string;
  businessName: string;
  locationKey?: string;
  city?: string;
  country?: string;
  category?: string;
  claimState: 'unclaimed' | 'claim_started' | 'owner_confirmed' | 'menu_published' | 'blocked';
  truthState: 'candidate_only' | 'prefill_ready' | 'owner_confirmed' | 'menu_live' | 'stale' | 'blocked';
  surfaceReadiness: 'none' | 'private_artifact' | 'canonical_ready' | 'published' | 'distribution_active';
  primaryCanonicalUrl?: string;
  sourcePolicyId: string;
  updatedAt: string;
};

type GrowthBusinessTruthGraphNode = {
  nodeId: string;
  targetId: string;
  type: 'business' | 'location' | 'outlet' | 'menu' | 'surface' | 'source' | 'handoff' | 'claim' | 'freshness' | 'attribution';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  sourceRefs: string[];
  updatedAt: string;
};

type GrowthBusinessTruthGraphEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relation:
    | 'same_as'
    | 'located_at'
    | 'has_outlet'
    | 'has_menu'
    | 'claimed_by'
    | 'published_as'
    | 'sourced_from'
    | 'handed_off_to'
    | 'supersedes'
    | 'needs_freshness_review'
    | 'attributed_to';
  confidence: 'high' | 'medium' | 'low';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  createdAt: string;
};

type GrowthDistributionSurface = {
  surfaceId: string;
  targetId: string;
  type: 'canonical_menu' | 'official_business_page' | 'city_category_page' | 'claim_artifact' | 'truth_packet' | 'menu_feed' | 'widget_embed';
  url?: string;
  indexability: 'indexable' | 'noindex' | 'blocked' | 'not_public';
  truthRequirement: 'candidate_safe' | 'owner_confirmed' | 'menulist_verified';
  structuredDataStatus: 'not_applicable' | 'missing' | 'valid' | 'invalid';
  freshnessStatus: 'fresh' | 'review_due' | 'stale' | 'blocked';
  lastPublishedAt?: string;
  lastCheckedAt?: string;
};

type GrowthDiscoveryPublishJob = {
  jobId: string;
  surfaceId: string;
  targetId: string;
  action: 'sitemap_update' | 'indexnow_submit' | 'menu_feed_export' | 'truth_packet_publish' | 'gbp_handoff';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked';
  changedUrls: string[];
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};
```

## 8. Launch Baseline

The launch baseline must include the complete distribution loop:

```txt
source policy
-> connection activation
-> source identity handles
-> business truth graph candidate edges
-> distribution target registry
-> truth gap detection
-> private claim artifact
-> enrichment waterfall
-> AI worker gated decision
-> decision snapshot
-> owned channel eligibility
-> WhatsApp governance audit where WhatsApp is selected
-> claim route
-> owner-confirmed MenuList truth
-> canonical menu/business page
-> structured data validation
-> sitemap inventory
-> changed-URL notification where allowed
-> menu feed export readiness
-> GBP handoff where owner-authorized
-> Apple/Bing handoff where owner-authorized
-> freshness and surface health monitor
-> attribution graph
```

Feature flags can disable external submissions or specific surfaces, but the data model and contracts must not assume lead generation is the final job.

## 9. Final Decision

Growth Engine should be renamed in behavior, not necessarily in folder name:

```txt
Growth Engine = MenuList Distribution Engine
```

The system's job is to create and maintain MenuList distribution coverage. Outreach is only one rail inside that system.
