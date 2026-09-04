# MenuList Marketing Distribution - Launch Distribution Review

**Status:** Accepted with gates  
**Created:** June 23, 2026  
**Source:** June 23 ChatGPT launch-platform and international-acquisition response  
**Owner:** Codex acting as MenuList marketing consultant  

---

## Executive Summary

The response is directionally strong and should be accepted as a launch operating layer, not as an immediate code backlog.

Accepted core:

> Send the list your business already uses. MenuList makes it official.

MenuList-specific public wording should keep the existing product phrase:

> Send your current list on WhatsApp. MenuList turns it into one official customer link.

The important correction is that the launch must stay WhatsApp-first, not WhatsApp-only. International acquisition should use the local channel where SMB owners already send or display their lists: WhatsApp in India/GCC/LATAM, Instagram/Google/upload-first in the US/UK/Canada/Australia, LINE later in Japan/Taiwan/Thailand, and Kakao later in Korea.

Do not add `/global`, `/in`, `/ae`, `/us`, `/partners`, `/audit`, `/examples`, or `/launch/product-hunt` in code yet. Those routes are valid candidates, but each needs a clear content owner, proof assets, tracking, and route-specific docs before implementation.

---

## Current Repo Reality

| Area | Current truth | Verdict |
| --- | --- | --- |
| `/whatsapp` | Public campaign route exists and uses the supplied test number `+1 555 657 1424` for click-to-WhatsApp. | Keep. Replace with production number before broad traffic. |
| WhatsApp runtime flags | App and Functions env/templates are enabled for messaging onboarding. Real Meta secrets/webhook setup remains owner-side. | Keep enabled, but do not imply provider launch is complete. |
| Product Hunt assets | Asset copy, gallery frame order, maker comment, reply bank, video scripts, launch-day plan, launch-week calendar, and follow-up board exist. Final image/video files and Product Hunt draft do not. | Continue asset production before scheduling. |
| Demo proof | Demo universe and source lists exist. Public demo tenant/screenshots/videos are not created. | Demo visuals are the next blocker. |
| Partner motion | Partner brief and outreach scripts exist. Pricing/referral/support terms are not approved. | Use for conversations only, not formal partner program. |
| International acquisition | Not yet its own operating plan. Existing docs are India/WhatsApp/Product Hunt heavy. | Add controlled market-pod workstream. |

---

## Platform Source Checks

| Claim area | Source check | MenuList decision |
| --- | --- | --- |
| Product Hunt time | Product Hunt says 12:01am Pacific gives a full 24-hour homepage cycle, and scheduling is available up to one month ahead: `https://www.producthunt.com/launch/preparing-for-launch`. | Use 12:01am Pacific only if readiness gates pass. |
| Product Hunt community rules | Product Hunt says not to ask directly for upvotes, and makers can hunt their own products: `https://www.producthunt.com/launch`. | Ask for feedback/comments, not votes. Founder-led launch is fine. |
| Product Hunt content | Product Hunt asks for direct URL, concise tagline, thumbnail, gallery, video, first comment, pricing, and promo fields: `https://www.producthunt.com/launch/preparing-for-launch`. | Current asset pack is the right base, but final visuals/video/page are missing. |
| Show HN | Hacker News says Show HN must be something people can try, not a landing page, and should be easy to try without signup: `https://news.ycombinator.com/showhn.html`. | Only use HN after public demo pages exist. |
| WhatsApp compliance | WhatsApp Business policy requires opt-in, opt-out honoring, no misleading/spammy communications, and template rules outside the 24-hour service window: `https://whatsappbusiness.com/policy/`. | Keep click-to-WhatsApp inbound-first. No scraped WhatsApp blast. |
| Google Business Profile | Google Business Profile supports posts, offers, events, reviews, Q&A, and current business info: `https://business.google.com/en-all/business-profile/`. | Google Maps/GBP research is a valid lead-discovery surface, but external-platform update claims remain forbidden. |
| Apple Business Connect | Apple says Business Connect lets businesses customize place cards with images, key info, and promotions: `https://www.apple.com/newsroom/2023/01/introducing-apple-business-connect/`. | Apple is a later placement checklist surface for US/UK/Aus, not a launch integration. |
| LINE | LINE Official Account is built for companies and stores, with 3M+ official accounts in Japan: `https://www.lycbiz.jp/en/other`. | LINE-first markets are valid later, but require separate route/intake docs. |
| Kakao | KakaoTalk Channel supports one-on-one chats, reservations, and consultations: `https://www.kakaocorp.com/page/service/service/KakaoTalkChannel?lang=ENG`. | Kakao is later-market research, not current product scope. |

---

## Decision Matrix

| ChatGPT idea | Verdict | MenuList decision |
| --- | --- | --- |
| "WhatsApp-first, not WhatsApp-only" | Agree | Adopt as launch doctrine. WhatsApp is the strongest India/GCC/LATAM front door, not the whole product category. |
| "Forward your current list. Make it official." | Agree with wording discipline | Use as campaign line. Public product copy should continue saying official customer link. |
| Product Hunt date | Unscheduled | The expired August 11, 2026 target is retired. Select a new day only after all six gates in `launch-research-2026-09-03/report-source.md` pass. |
| "100 SMB Lists in 100 Hours" | Agree | Better than restaurant-only wording. Run only after intake capacity, permission script, tracking board, and proof workflow are ready. |
| Old PDF Graveyard / QR Reality Check / Rate Card Roast / Market Walk | Agree | Use as content pillars with demo or permissioned examples only. No insulting real businesses. |
| Public List Drift Score | Partial | Start as a manual audit worksheet, not an automated score, until inputs, risk labels, and claims are documented. No ranking promise. |
| Current on MenuList badge | Partial | Use "Official customer link" or "Current on MenuList" only if the freshness/review contract is explicit. Do not say "verified". |
| QR trust chips and WhatsApp badges on print assets | Partial | Use factual business identity, current link, short URL, and MenuList attribution in existing Assets/Menu Kit. Do not add WhatsApp badges, consent snippets, "official", "secure", "no spam", or "verified" to normal MenuList page QR assets. |
| Product Hunt as main public event | Partial | Use for credibility, feedback, and partners. Do not treat it as primary SMB acquisition. |
| LinkedIn/X/Instagram/YouTube/HN/Reddit/Directories | Agree with sequencing | Use each with platform-native intent. HN/Reddit only after proof, not launch-day spam. |
| AppSumo/review platforms | Defer | Not before onboarding cost, support load, pricing, and plan limits are stable. |
| `/global`, `/in`, `/ae`, `/us`, `/br`, `/mx`, `/line`, `/kakao` | Partial | Valid roadmap candidates. Implement only after market-pod content, localization, and intake path are approved. |
| International market pods | Agree | Start with India/GCC, then LATAM, then US/UK/Canada/Aus, then LINE/Kakao markets later. |
| Google Maps / Instagram lead mining | Agree with compliance | Use manual, specific public-list audits. No scraped bulk automation. |
| "Reply APPROVE" inside WhatsApp | Reject as public claim | Current marketing guardrail remains: do not claim reply-command approval until product/security design and implementation exist. |

---

## Launch-Date Decision

**Target date:** Unscheduled

**Target time:** Decide with the date; the normal start-of-Pacific-day schedule is a default only when response coverage fits

**Status:** No date until all six launch gates pass.

Readiness gates before scheduling:

1. Production WhatsApp destination, owner, hours, consent copy, and tracking confirmed.
2. At least 5 clean demo public pages or permissioned customer examples.
3. At least 2 approved before/after examples.
4. Product Hunt thumbnail, 2+ gallery images, video, first comment, reply bank, promo decision, and launch page ready.
5. `/launch/product-hunt` or equivalent launch URL exists only after docs/content are ready.
6. Manual follow-up board ready to tag chats, lists received, previews, approvals, public links, partner leads, and paid conversions.
7. Founder has launch-day response blocks reserved.

Use the expanded six-gate decision in
`launch-research-2026-09-03/report-source.md`. Select and schedule a date only
after the proof system, product, intake capacity, identities, compliance,
assets, measurement, and continuation plan are ready.

---

## International Client Acquisition Model

Primary workflow:

> Find a business with scattered public lists -> send a specific public-list audit -> ask for the current list -> prepare preview -> owner approves -> publish official customer link -> activate two customer surfaces.

Market pods:

| Pod | Markets | Primary front door | First use |
| --- | --- | --- | --- |
| Pod 1 | India + GCC | WhatsApp | First controlled pilot and challenge. |
| Pod 2 | LATAM | WhatsApp + Instagram | After English/Hindi/India proof, with Spanish/Portuguese copy review. |
| Pod 3 | US/Canada/Australia/UK | Google/Instagram/upload-first | Use upload/current-list audit and partner motion. |
| Pod 4 | Japan/Taiwan/Thailand | LINE + upload | Research/docs first. No code until intake route is selected. |
| Pod 5 | Korea | Kakao + upload | Research/docs first. No code until local partner/compliance is clear. |
| Pod 6 | China/WeChat | Defer | Too much ecosystem/compliance complexity for first international push. |

Do not launch every market at once. Start with one city + one vertical + one acquisition channel per weekly sprint.

---

## Immediate Actions

| Priority | Action | Owner | Status |
| --- | --- | --- | --- |
| P0 | Replace test WhatsApp CTA with production WhatsApp account before broad traffic | Founder | Blocked |
| P0 | Create final demo public pages/screenshots/videos | Codex + Founder | Not started |
| P0 | Define launch readiness checklist for August 11 target | Codex | Done in this review |
| P1 | Update Product Hunt tagline to the stronger broad-SMB line | Codex | Done in asset pack |
| P1 | Create international market-pod lead board fields | Codex | Done |
| P1 | Draft `/launch/product-hunt` page spec before route work | Codex | Done |
| P1 | Create compliance checklist for WhatsApp/DM/email outreach | Codex | Done |
| P2 | Draft `/global`, `/in`, `/ae`, `/us` content briefs | Codex | Deferred until proof assets exist |
| P2 | Research LINE/Kakao intake paths | Codex | Deferred |
| P3 | AppSumo/review platform plan | Codex + Founder | Deferred 4-6 months after launch |

---

## Rejected Or Deferred Claims

Reject now:

- "MenuList automatically syncs WhatsApp Catalog."
- "MenuList is an official WhatsApp/Meta partner."
- "Reply APPROVE in WhatsApp publishes the list."
- "MenuList updates Google, Instagram, Yelp, Apple, LINE, Kakao, or POS automatically."
- "Product Hunt is the primary SMB acquisition channel."
- "AppSumo should be a launch-month channel."
- "International pages should be created before market-specific proof and intake paths exist."

---

## Final Consultant Verdict

This ChatGPT response improves the plan by separating the deeper global idea from the WhatsApp wedge:

> MenuList is a public-list officialization system. WhatsApp is the fastest first door in the markets where owners already run the business there.

Adopt the launch-wave structure and international acquisition model, but keep implementation gated. The next real work is not another strategy page. It is production WhatsApp readiness, proof assets, and a manual market-pod lead board.
