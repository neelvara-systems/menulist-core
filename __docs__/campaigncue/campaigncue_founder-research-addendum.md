# CampaignCue Founder Research Addendum

**Research date:** June 11, 2026
**Purpose:** Treat CampaignCue as our product from scratch and validate the product wedge against current market, platform, policy, and local-business realities.

## Executive Verdict

CampaignCue should not be built as another design tool, social scheduler, ad generator, or generic content assistant. Those categories are already crowded and strong.

The durable product wedge is:

> Source-backed campaign execution for local businesses, with trust checks, export/download delivery, owner approval, cost controls, and outcome learning.

That means CampaignCue wins only if it does what generic tools do not do well:

- Starts from restaurant/salon business facts, not a blank prompt.
- Tells the owner what is worth promoting now.
- Creates a multi-channel campaign pack, not one isolated asset.
- Keeps every output tied to source facts, consent, channel constraints, and owner approval.
- Preserves copy/download/manual posting when direct APIs are unavailable, unapproved, rate-limited, or risky.
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

## Required Product Principles

1. **Export-first is not a weakness.** Manual copy/download/share is a core product path because local channels and APIs are inconsistent.
2. **Trust-safe usage is the north star.** The product should optimize for campaigns used after checks, not raw creative generated.
3. **Restaurant and salon rules must differ.** Restaurant risk centers on menu/price/photo/availability accuracy. Salon risk centers on claims, before/after consent, and booking promises.
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
| WhatsApp Sales Studio + Google Local Studio | These are local conversion/discovery channels, especially for restaurants and salons. |
| Manual Fallback + Calendar Scheduler | Local businesses still need reliable copy/share/mark-done flows even without connected APIs. |
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
