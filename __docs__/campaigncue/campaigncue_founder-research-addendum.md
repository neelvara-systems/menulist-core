# CampaignCue Founder Research Addendum

**Research date:** June 11, 2026
**Purpose:** Treat CampaignCue as our product from scratch and validate the product wedge against current market, platform, policy, and local-business realities.

## Executive Verdict

CampaignCue should not be built as another design tool, social scheduler, ad generator, or generic content assistant. Those categories are already crowded and strong.

The durable product wedge is:

> Source-backed campaign execution for local businesses, with trust checks, export/download delivery, owner approval, cost controls, and outcome learning.

That means CampaignCue wins only if it does what generic tools do not do well:

- Starts from local-business facts and vertical recipes, not a blank prompt.
- Tells the owner what is worth promoting now.
- Creates a multi-channel campaign pack, not one isolated asset.
- Keeps every output tied to source facts, consent, channel constraints, and owner approval.
- Preserves download/export/manual posting when direct APIs are unavailable, unapproved, rate-limited, or risky.
- Measures trust-safe campaign usage and next action, not vanity generation volume.

## Research Findings And Product Decisions

| Area | Finding | CampaignCue decision |
| --- | --- | --- |
| Generic creative tools | Canva and Adobe Express already cover social creative, templates, captions, scheduling, and broad creation workflows. | Do not compete on broad design creation. Compete on source-aware local campaign execution. |
| Social schedulers | Buffer, Hootsuite, Later, Adobe Express, Canva, and Meta Business Suite already cover scheduling and caption assistance. | CampaignCue Calendar is campaign-state and manual-task aware, not a standalone scheduler. |
| Ad/video generators | Predis and Creatify already focus on ad variants, UGC-style ads, URL-to-video, avatars, and batch creative. | CampaignCue Video/Reel and UGC Script should prioritize practical briefs, real assets, owner/staff scripts, and trust review over synthetic-volume output. |
| WhatsApp | Meta requires opt-in for business messaging; marketing messages have pricing, template, preference, quality, and enforcement constraints. | WhatsApp Sales Studio is consent-led and export-first. Direct send is optional and blocked until template, opt-in, pricing, and preference handling are configured. |
| Google Business Profile | Google supports posts/offers/events, but API access, quotas, location eligibility, and Product Post limitations make universal automation unsafe. | Google Local Studio must keep manual export as the normal path and must not promise all GBP actions can be automated. |
| Google local discovery | Google Business Profile posts, offers, events, photos, reviews, and timely updates remain valuable local surfaces. Restaurant/bar "What's Happening" signals reinforce timely local updates. | Restaurant campaign cues should include specials/events/local updates, but CampaignCue must not claim ranking gains. |
| Meta/Google ads | Google and Meta policy surfaces reject misleading claims, personal-attribute assertions, restricted health/wellness claims, and deceptive destinations. | Ads Studio is a policy preflight and handoff tool first. Direct mutate/publish stays gated. |
| Reviews/testimonials | FTC rules and endorsement guidance make fake reviews, fabricated testimonials, undisclosed endorsements, and synthetic personal experiences high risk. | UGC Script Studio and Trust Center must block fake first-person customer stories and require evidence/disclosure for testimonials and creator briefs. |
| Privacy/contact data | Commercial email, SMS, WhatsApp, and direct marketing require channel-specific consent/opt-out discipline. | CampaignCue should not add email/SMS blast tools by default. Contact import must be consent-scoped and minimization-first. |
| API access | Platform APIs have rate limits, quotas, app review, domain requirements, webhooks, and changing terms. | API Boundaries must use provider adapters, capability detection, idempotency, backoff, export fallback, and no direct privileged frontend calls. |
| Analytics | Provider metrics are partial, delayed, or unavailable; manual actions are common. | Analytics must label metric confidence as observed, imported, manual, or estimated. Copied/exported content is not a booking/order unless source proves it. |
| Multi-location/agency | Cross-client and cross-location mistakes are product-killing. | Agency and multi-location flows must scope every campaign, metric, approval, asset, and source snapshot by client/location. |
| Name/domain | `campaigncue.ai` still returned `Domain not found` in WHOIS on June 11, 2026, but registrar checkout is still required. | Keep CampaignCue.ai as working name and treat domain purchase as an immediate founder task. |

## June 19, 2026 Platform And Market Refresh

This refresh was added after reviewing the Growth Kits, KitStamp, and CampaignCue product boundaries together. It does not change CampaignCue into MenuList Growth Kits or KitStamp.

| Evidence | CampaignCue addition |
| --- | --- |
| Google Business Profile supports owner posts for updates, offers, and events, and posts can include text, photos/videos, links, dates, coupon details, and terms. Source: https://support.google.com/business/answer/7342169 | Google Local Studio should keep structured manual drafts for Update, Offer, and Event style posts, with preflight fields for dates, terms, phone-number rejection risk, and source links. |
| The Google Business Profile Local Posts API can create posts through `accounts/*/locations/*/localPosts` with `LocalPost` request bodies and OAuth scopes. Source: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/create | Direct GBP publishing is technically possible but must be a separate provider layer with OAuth, location scope, idempotency, quota handling, approval, and export fallback. |
| The Business Profile Performance API exposes daily/monthly metrics, but Google notes that accounts with quota 0 after enabling must request GBP API access. Source: https://developers.google.com/my-business/reference/performance/rest | CampaignCue analytics must keep provider metrics optional and confidence-labeled. Do not promise Google performance import until access is approved and tested. |
| WhatsApp requires opt-in before business messaging, requires approved templates to initiate conversations outside the 24-hour window, and requires opt-out handling. Source: https://whatsappbusiness.com/policy/ | WhatsApp Sales Studio must stay manual/export-first until consent proof, template category, opt-out, suppression, and escalation paths exist. |
| WhatsApp Platform pricing is charged per delivered message and varies by recipient country and message category: marketing, utility, authentication, and service. Source: https://whatsappbusiness.com/products/platform-pricing/ | Direct WhatsApp send needs category-aware cost preview, delivery-charge accounting, and owner approval before any provider send job. |
| Google Pomelli and Canva AI 2.0 confirm broad SMB campaign generation and multi-channel creative tooling are active markets. Sources: https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/ and https://www.canva.com/newsroom/news/canva-create-2026-ai/ | CampaignCue must avoid generic campaign generation volume. Its wedge stays Business Brain, deterministic decision engine, trust checks, manual handoff, and compact result memory. |

## June 19, 2026 Boundary Decision

| Product | Decision |
| --- | --- |
| MenuList Growth Kits | Do not merge. Growth Kits is a paid MenuList owner add-on for one immediate action from live menu truth. |
| KitStamp | Do not merge. KitStamp is deliberate content readiness and Final Content Kit export. |
| CampaignCue | Keep as separate local-business campaign workspace with export/download-first runtime and disabled provider mutation. |

Cost impact: no Firebase cost change. This refresh changes documentation only and does not add reads, writes, Storage, Cloud Functions, provider calls, schedulers, rules, indexes, or routes.

## June 24, 2026 Creator Distribution Playbook Review

This review came from an external consumer-app influencer distribution article and a follow-up ChatGPT analysis. The useful insight is not "build influencer marketing software." The reusable CampaignCue primitive is a local creator/audience-fit brief inside the existing campaign pack workflow.

| Accepted idea | CampaignCue translation |
| --- | --- |
| Hire the audience, not the influencer. | Check baseline views, comment quality, local audience fit, customer intent, and format fit before recommending a local creator handoff. |
| Lightweight briefs perform better than scripted decks. | Generate a short creator brief from source-backed business facts, CTA, prohibited claims, disclosure, and one campaign angle. |
| Test niches 3-5 times before scaling. | Use a small 3-test plan for creators, hooks, or local audiences, then record useful/not-useful outcome in compact result memory. |
| Flat fees preserve upside. | Provide advisory flat-fee boundary plus repeat/adjust/kill guidance through the 3-test result prompt; do not broker, price-guarantee, contract, or pay creators. |
| Speed matters in distribution. | Apply speed to campaign pack preparation and result learning, not to bypassing trust checks, consent, owner approval, or source facts. |

Rejected scope:

- creator marketplace or roster management;
- influencer CRM, contract workflow, payment workflow, or deliverable-chasing operations;
- follower-count-led creator scoring;
- fake testimonials, synthetic personal experiences, undisclosed endorsements, or guaranteed reach/revenue claims;
- narrowing CampaignCue to restaurants or making it a MenuList marketing feature.

Cost impact: the active runtime uses existing output-picker, campaign-create, UGC handoff fields, Campaign Pack ZIP, and result-memory paths. No new Firestore collection, read path, write path, Storage object, Cloud Function, provider call, rule, index, scheduler, or billing surface is introduced by this research decision.

## June 24, 2026 Distribution.ai Review

Distribution.ai was reviewed as a live content-distribution competitor. Its public site frames the product around turning one content source into many channel-ready assets, scheduling/approval, analytics, brand voice, and industry pages such as restaurants. The useful CampaignCue insight is not "build an AI social media manager." The useful proof is that buyers understand the workflow shape: one source, many channel-native outputs, review, distribution, and learning.

| Distribution.ai pattern | CampaignCue translation |
| --- | --- |
| One blog, podcast, video, or draft becomes many platform-ready assets. | The current source-backed business cue can become a checked Campaign Pack with WhatsApp, Google/local, social/print, calendar/manual-task, and result-memory outputs. The active code translation is the `source_to_channel_pack` output intent; video/UGC brief, staff, and ad handoff remain separate output intents or channel handoff paths. |
| Brand voice, writing style, channel selection, and approvals are visible in the workflow. | Keep Brand Playbook, protected facts, output intent, review checklist, and owner/agency approval visible beside every pack. |
| Restaurant page makes "menu, promotions, events, customer reviews" easy to understand. | Use local-business examples such as menu item, offer, event, service slot, staff prompt, and Google/local update without becoming restaurant-only. |
| Pricing is packaged by source type and channel volume. | Treat packaging as market signal only; do not change CampaignCue pricing or billing until billing runtime and cost ledgers are active. |

Rejected scope:

- autopilot publishing from connected blogs, podcasts, YouTube channels, or social accounts;
- generic blog/podcast/video repurposing as the primary product;
- optimized posting-time automation without provider metrics and consented accounts;
- real-time cross-channel analytics claims without imported/observed metric contracts;
- restaurant "AI social media manager" positioning that promises more diners, reach, engagement, traffic, reservations, or ROI;
- broad email/newsletter generation without consent, unsubscribe, suppression, and cost controls;
- public copy that says CampaignCue "distributes" content automatically.

Cost impact: existing output-picker and campaign-create runtime only. No feature flag, route, API, provider adapter, Firestore read/write beyond the normal guarded campaign-create path, Storage object, Cloud Function, scheduler, billing surface, Firebase deploy, Vercel deploy, or production build is introduced by this review.

## July 12, 2026 Yorby Review

Yorby's current public product combines short-form script remixing, creator-account monitoring, AI UGC generation, and human strategy support. The CampaignCue-fit insight is that owners benefit from seeing a useful format translated into an actionable brief. The creator-growth product center does not fit CampaignCue.

Source: https://www.yorby.ai/

| Yorby pattern | CampaignCue decision |
| --- | --- |
| Remix a successful short-form format. | Implement Pattern Cue: one owner-submitted public link plus notes becomes an abstract structural observation and original business-specific hooks. |
| Monitor accounts for viral movement. | Reject recurring monitoring, scraping, follower surveillance, and viral alerts. CampaignCue accepts explicit one-time owner input only. |
| AI UGC generation. | Keep CampaignCue brief-first: real owner/staff/creator footage, consent, disclosure, original hooks, phone-camera plan, and manual export. Do not present synthetic people as real customers. |
| Human strategic review. | Keep owner/agency approval, Trust Center, proof deck, and result memory inside the product rather than making founder consulting a runtime dependency. |

Implementation boundary:

- one current pattern is stored on the existing workspace document;
- raw transcript/notes are discarded after request processing;
- inspiration does not become Business Brain truth or decision readiness;
- video/UGC packs pin the pattern ID/hash and fail public-use recheck after replacement;
- no new collection, overview read, listener, Storage object, Cloud Function, provider call, or social integration is added;
- model-assisted classification remains disabled until CampaignCue-specific capacity accounting, SAFE_MODE, rate limits, candidate validation, and cost reporting are active.

## Required Product Principles

1. **Export-first is not a weakness.** Manual download/export/share is a core product path because local channels and APIs are inconsistent.
2. **Trust-safe usage is the north star.** The product should optimize for campaigns used after checks, not raw creative generated.
3. **Vertical rules must differ.** Restaurant risk centers on menu/price/photo/availability accuracy. Salon risk centers on claims, before/after consent, and booking promises. Retail, local-service, fitness, clinic, and generic local-business recipes need their own price, stock, consent, service-area, health/claim, and privacy posture.
4. **No fake people.** Do not create fake customer stories, fake staff endorsements, fake review cards, synthetic client transformations, or undisclosed paid/creator testimonials.
5. **No hidden spend.** Credits, provider attempts, message delivery costs, video render costs, and ad spend must be visible before action.
6. **No direct source mutation by accident.** MenuList, Google, Meta, WhatsApp, POS, booking, and ad accounts are source/provider systems, not raw writable stores.
7. **Owner mobile actions must be real.** Approve, copy WhatsApp, mark manual post done, upload asset, resolve simple trust issue, and view result summary must work on phone.

## Build Priority From Research

This is not a phased roadmap. These are product-weight decisions for launch-complete architecture:

| Highest leverage | Why it matters |
| --- | --- |
| Business Brain + Source Integrations | Without source truth, CampaignCue becomes a generic generator. |
| Opportunity Engine | Owners need "what to promote now" more than blank tools. |
| Campaign Studio + Creative Trust Center | Multi-output packs and trust checks are the core product loop. |
| WhatsApp Sales Studio + Google Local Studio | These are local conversion/discovery channels, especially for local businesses with current offers, appointments, products, events, or service reminders. |
| Manual Fallback + Calendar Scheduler | Local businesses still need reliable download/share/mark-done flows even without connected APIs. |
| Analytics Learning | The product must learn which cues become used campaigns. |
| Agency and Multi-location boundaries | These expand buyer value but must never compromise client/location isolation. |

## Research Sources

| Source | Product relevance |
| --- | --- |
| Canva AI Social Media Post Generator: https://www.canva.com/features/ai-social-media-post-generator/ | Confirms generic social post generation is already mainstream. |
| Adobe Express Content Scheduler: https://helpx.adobe.com/express/web/publish-and-share/schedule-manage-posts/content-scheduler-overview.html | Confirms broad scheduler/caption workflows are already available. |
| Buffer: https://buffer.com/ | Confirms small-team social scheduling and AI assistant coverage. |
| Hootsuite OwlyWriter: https://www.hootsuite.com/platform/owly-writer-ai | Confirms caption/content idea tooling is mature. |
| Meta Business Suite post management: https://www.facebook.com/business/help/942827662903020 | Confirms native Facebook/Instagram scheduling exists. |
| Predis: https://predis.ai/ | Confirms ad/video/UGC-style creative generation is crowded. |
| Creatify: https://creatify.ai/ | Confirms URL-to-video, ad flow, and UGC-style creative workflows are a crowded wedge. |
| WhatsApp Business Platform pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing | Confirms delivered template-message pricing moved to per-message basis. |
| WhatsApp opt-in: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in | Confirms opt-in must be treated as a product gate. |
| WhatsApp user preferences webhook: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/user_preferences/ | Confirms marketing preference changes can be captured. |
| Google Business Profile Posts API: https://developers.google.com/my-business/content/posts-data | Confirms post types and Product Post API limitation. |
| Google Business Profile quota limits: https://developers.google.com/my-business/content/limits | Confirms GBP API access/quota gating and 429 behavior. |
| Google Business Profile Performance API: https://developers.google.com/my-business/reference/performance/rest | Confirms authorized daily/monthly performance metrics. |
| Google Business Profile posts help: https://support.google.com/business/answer/7342169 | Confirms posts/offers/events are customer-facing GBP updates. |
| Google Ads API quota docs: https://developers.google.com/google-ads/api/docs/best-practices/quotas | Confirms daily operation and mutate limits. |
| Google Ads misrepresentation policy: https://support.google.com/adspolicy/answer/6020955 | Confirms clear/honest ad requirements and misleading-claim risk. |
| Meta Advertising Standards: https://transparency.meta.com/policies/ad-standards/ | Confirms ads must meet Meta policy surfaces. |
| Meta personal attributes policy: https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/ | Confirms ads must not assert or imply personal attributes. |
| Meta health and wellness policy: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/ | Confirms health/wellness and cosmetic category constraints. |
| Meta unacceptable business practices: https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/ | Confirms misleading/deceptive business practice risk. |
| FTC fake reviews final rule: https://www.ftc.gov/news-events/news/press-releases/2024/08/federal-trade-commission-announces-final-rule-banning-fake-reviews-testimonials | Confirms fake reviews/testimonials are a hard trust risk. |
| FTC endorsement guides FAQ: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking | Confirms endorsement/disclosure context matters. |
| FTC CAN-SPAM guide: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business | Supports keeping email campaign tools out unless compliance is designed. |
| TikTok Content Posting API: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post | Confirms direct post requires app/API workflow and export UI constraints. |
| YouTube Data API quota costs: https://developers.google.com/youtube/v3/determine_quota_cost | Confirms video upload APIs are quota-expensive. |
