# MenuList Marketing Distribution - WhatsApp-First Hype Strategy

**Status:** Active priority strategy  
**Created:** June 22, 2026  
**Owner:** Founder with Codex acting as MenuList marketing consultant  
**Scope:** WhatsApp-first positioning, hype campaign, website/SEO/product requirements, and execution guardrails for MenuList.  
**Code status:** The core messaging-onboarding WhatsApp flow is already implemented and documented under `__docs__/messaging-onboarding/`. This document now governs the public campaign, website CTA, proof assets, and activation plan around that flow.

## Consultant Decision

WhatsApp-first onboarding should become MenuList's priority India wedge, but the claim must be precise.

The strongest safe line is:

> Send your current list on WhatsApp. MenuList turns it into one official customer link.

This is stronger than "QR menu" and broader than restaurants. It works for the founder's confirmed target:

- restaurants
- cafes
- bakeries
- cloud kitchens
- salons
- spas
- barbers
- service studios
- car detailing shops
- pet groomers
- photographers
- event vendors
- local service SMBs with a menu, service list, catalog, package list, price list, or rate card

The category to test is:

> WhatsApp-first official customer-link publishing.

The campaign to own is:

> Forward It. Make It Official.

The launch challenge should be:

> 100 WhatsApp Lists in 100 Hours.

Use "lists", not only "menus", because MenuList must not become restaurant-only.

## My Moat Answer

I asked the same hard question a consultant should ask:

> Is WhatsApp onboarding a real moat, or just a catchy landing-page line?

My answer: it can become a moat only if it becomes the fastest path from owner behavior to public business truth.

The moat is not "we use WhatsApp". Many tools can add a WhatsApp button.

The moat is:

1. The owner already has the latest source inside WhatsApp.
2. The owner does not need to learn a dashboard before seeing value.
3. MenuList turns that existing source into one owner-approved public customer link.
4. The same link becomes usable across WhatsApp replies, Instagram bio, Google/profile links, QR, print, packaging, staff replies, and repeat customers.
5. The published link stays attached to MenuList's public-truth system instead of becoming another static PDF.

That is defensible because it connects behavior, onboarding, proof, distribution, and retention.

## Codebase Reality Check

The repo supports the core messaging-onboarding strategy today, but not every public marketing claim.

### What Exists

- `/create-menu` exists as a public website entry page for creating an official customer link.
- The route is gated by `ENABLE_PUBLIC_MENU_ENTRY`.
- Source processing requires owner sign-in.
- The current client supports:
  - WhatsApp phone OTP sign-in.
  - Google sign-in fallback.
  - image upload through JPEG, PNG, or WebP.
  - owned public-list link import after permission confirmation.
  - redirect to a preview route.
- The API creates durable `publicMenuDrafts` and queues `menuImageProcessingJobs`.
- Claim/publish revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`.
- Messaging onboarding is implemented as a provider-backed WhatsApp flow:
  - official Meta WhatsApp Cloud API stance
  - provider webhook and HMAC validation
  - durable inbound queue
  - WhatsApp media/file intake
  - extraction/preview session flow
  - owner review before publish
  - public link delivery through the provider flow after publish
  - platform ops screen at `/ops/messaging-onboarding`
- Messaging onboarding accepts the broader file promise through its shared MIME list, including PDF, JPEG, PNG, WebP, HEIC, and HEIF.
- Feature flags exist for `ENABLE_MESSAGING_ONBOARDING`, `MESSAGING_ONBOARDING_PROVIDERS`, `ENABLE_MESSAGING_ONBOARDING_TRACKING`, and `ENABLE_MESSAGING_ONBOARDING_DASHBOARD`.
- Functions runtime still hard-stops real WhatsApp webhooks unless provider secrets and runtime env are configured.
- The broader product already has WhatsApp as:
  - customer action surface
  - share source
  - owner sharing workflow
  - contact/OBP action
  - Menu Kit/WhatsApp Status output
  - analytics attribution source

Evidence:

- `src/app/(website)/create-menu/page.tsx`
- `src/app/(website)/create-menu/CreateMenuClient.tsx`
- `src/app/api/public/create-menu/route.ts`
- `src/app/api/public/create-menu/claim/route.ts`
- `src/config/features.ts`
- `src/data/shared/menuExtractionJob.ts`
- `functions/src/messagingOnboarding/`
- `functions/src/config/secrets.ts`
- `__docs__/messaging-onboarding/README.md`
- `__docs__/messaging-onboarding/messaging-onboarding_validation.md`
- `__docs__/messaging-onboarding/messaging-onboarding_runbook.md`
- `__docs__/public-menu-entry/public-menu-entry_impl.md`

### What Still Must Not Be Claimed

These must not be claimed as shipped:

- automatic WhatsApp catalog sync
- official WhatsApp/Meta partner status
- owner approval by replying `APPROVE` inside WhatsApp
- bulk WhatsApp outbound campaign system
- full PDF upload on the visible `/create-menu` client
- production-ready public WhatsApp CTA, until the founder confirms the final public onboarding number/account, response ownership, operating hours, consent copy, and tracking

Important product gap:

- Shared authenticated owner extraction supports PDF paths, and menu-link import can acquire public PDF/image links.
- The current public `/create-menu` client upload tab accepts only JPEG, PNG, and WebP image files.
- The WhatsApp-first PDF/file promise is supported by messaging onboarding, not by the `/create-menu` fallback upload tab.
- `/whatsapp` now uses the supplied test WhatsApp onboarding number `+1 555 657 1424` for its primary and final click-to-WhatsApp CTAs. Before production launch, replace the test number with the final public account and confirm response ownership, hours, consent copy, and tracking.

## Research Findings

### WhatsApp Behavior

WhatsApp is a credible India wedge because official and market sources support the behavior:

- WhatsApp Business presents catalogs as a mobile storefront and says businesses can upload up to 500 items for customers to browse inside the app.
- WhatsApp Business advises businesses to keep catalogs up to date and share catalogs through customer conversations and status.
- Meta's catalog launch positioned catalogs as a way to avoid repeatedly sending product photos and information one by one.
- TechCrunch reported India is WhatsApp's largest market with more than 500 million accounts, and later reported WhatsApp Business growth and deep merchant reliance in India.

MenuList implication:

> Owners already use WhatsApp as a business counter. MenuList should not replace that habit. It should turn the list inside that habit into a stable public source.

### Compliance Reality

WhatsApp is also a trust-risk channel:

- Meta/WhatsApp business terms and messaging guidance require permissions and respect for opt-outs.
- TechCrunch's India coverage also shows spam risk and user annoyance when businesses misuse WhatsApp.

MenuList implication:

> Use inbound click-to-WhatsApp and consented follow-up first. Do not bulk-blast scraped SMB numbers.

### SEO Reality

Google Search guidance supports useful, people-first, crawlable content. It does not support thin keyword pages or ranking promises.

MenuList implication:

> Build WhatsApp SEO pages only when each page has real workflow proof, screenshots, copy, examples, and a clear owner outcome.

### Cluely Lesson

Cluely's public playbook shows that founder-led distribution, provocation, short videos, and repeated narrative can create attention. It also shows what MenuList should avoid:

- ethics controversy
- "cheat" framing
- rage-bait
- fake certainty
- vanity-view goals disconnected from product activation

MenuList should copy the mechanics, not the moral shape:

- founder voice
- simple enemy
- visual demos
- repeatable one-liners
- daily output
- public challenge
- high-volume testing
- direct product action in every piece

MenuList should not make SMB owners distrust the product.

## ChatGPT Response Verdict

| ChatGPT idea | Verdict | MenuList decision |
| --- | --- | --- |
| WhatsApp-first onboarding as the wedge | Agree | Make this the priority India wedge. |
| "Forward your list on WhatsApp. MenuList makes it official." | Agree with wording adjustment | Use "Send your current list on WhatsApp. MenuList turns it into one official customer link." |
| Broad beyond restaurant | Agree | Use menus, service lists, rate cards, catalogs, packages, and price lists. |
| New primary CTA: Send list on WhatsApp | In progress | Live on `/whatsapp` with supplied test number. Production traffic still needs final destination, operating owner, consent copy, and tracking. |
| `/whatsapp` landing page | Agree | Built as a campaign page with test-number click-to-WhatsApp CTA, proof visual, and trust boundaries. |
| Sticky WhatsApp CTA | Partial | Good for mobile after destination/tracking; risky before real intake capacity. |
| WhatsApp conversation mockup | Agree | Use fictional demo and represent the implemented send -> preview -> approve -> live flow. |
| "100 WhatsApp Menus in 100 Hours" | Partial | Rename to "100 WhatsApp Lists in 100 Hours" and run only after intake ops are ready. |
| Old PDF Graveyard | Agree | Strong creative, but keep tone sharp without insulting SMB owners. |
| Rate Card Roast | Partial | Use fake/demo or permissioned businesses only. |
| Street Test | Agree | Good India-native proof, but needs permission and recording plan. |
| SEO cluster around WhatsApp menu/rate-card terms | Agree | Build fewer high-quality pages first; avoid thin programmatic pages. |
| Automatic WhatsApp catalog sync | Reject/defer | Do not claim unless implemented and approved. |
| Official WhatsApp partner framing | Reject | Do not claim unless true. |
| Bulk WhatsApp outreach | Reject | High compliance and trust risk. |
| Owner approval by WhatsApp reply `APPROVE` | Defer | Needs product/security design before it is marketed as a reply-command behavior. |
| Cluely-style ethics controversy | Reject | MenuList must be owner-trust-safe. |

## Website Strategy

### Priority Website Direction

MenuList's website should make WhatsApp-first behavior visible, but it must not outrun the product.

Current staged approach:

1. `/whatsapp` campaign page exists and is registered in discovery.
2. Use the supplied test number for the `/whatsapp` click-to-WhatsApp CTA while production destination, response ownership, operating hours, consent copy, and tracking are finalized.
3. Keep "Send list on WhatsApp" only where it opens a real prefilled WhatsApp chat with consent-safe handling.
4. Add a homepage WhatsApp proof band after the production destination and response ownership are ready.
5. Keep `/create-menu` copy constrained to its actual image/link fallback path. Use messaging onboarding docs/page copy for PDF/file WhatsApp intake.

### Proposed `/whatsapp` Page

Route:

```text
/whatsapp
```

H1:

```text
Send your current list on WhatsApp. Get one official customer link.
```

Subheadline:

```text
MenuList turns a menu, service list, rate card, package list, catalog, photo, PDF, or message into an owner-approved public page, link, and QR. Start from the list you already send customers.
```

Sections:

1. WhatsApp is where the list already lives.
2. What you can send.
3. How the preview works.
4. What customers receive.
5. Where to use the public link.
6. Demo WhatsApp conversation.
7. Examples by business type.
8. Pricing after review.
9. FAQ.
10. CTA.

### Homepage Copy Backlog

Hero option after readiness:

```text
Send your current list on WhatsApp. Get one official customer link.
```

Subcopy:

```text
MenuList turns the menu, service list, rate card, package list, catalog, or price list you already share into an owner-approved public page, link, and QR.
```

Primary CTA:

```text
Send list on WhatsApp
```

Secondary CTA:

```text
Upload or paste link instead
```

Trust note:

```text
MenuList is not a WhatsApp replacement. It gives your WhatsApp conversations one current public source to point to.
```

Do not ship this hero until the CTA path is real.

### Demo Conversation

Use a fictional business.

```text
Owner:
Hi MenuList, this is my latest salon rate card.

Owner sends:
Photo, PDF, screenshot, or public list link.

MenuList:
Received. Please confirm business name, city, and list type.

MenuList:
Preview ready: menulist.ai/urban-glow

Owner:
Looks correct.

MenuList:
Your official customer link and QR are ready.
```

If the real system still requires authenticated web review, the demo must show:

```text
MenuList:
Preview ready. Open this link to review and publish.
```

Do not imply WhatsApp-only publishing until implemented.

## SEO Strategy

### Core Pages

Build these first, in this order:

| Page | Purpose | Readiness gate |
| --- | --- | --- |
| `/whatsapp` | main campaign page | WhatsApp intake path defined |
| `/solutions/whatsapp-menu-link` | restaurant/cafe intent | menu demo proof |
| `/solutions/whatsapp-service-list` | salon/spa/local service intent | service-list demo proof |
| `/solutions/whatsapp-rate-card` | rate-card intent | rate-card demo proof |
| `/solutions/whatsapp-price-list` | broad price-list intent | price-list demo proof |
| `/compare/whatsapp-catalog-vs-official-public-list` | comparison page | careful WhatsApp comparison and no anti-WhatsApp tone |
| `/compare/whatsapp-pdf-vs-public-link` | PDF replacement intent | public PDF/file intake or honest workaround |
| `/resources/how-to-create-menu-link-for-whatsapp-business` | how-to intent | screenshots and step-by-step copy |
| `/resources/whatsapp-rate-card-checklist` | service SMB lead magnet | checklist asset |

### Vertical Pages

Add after proof assets exist:

- `/for/restaurants/whatsapp-menu-link`
- `/for/cafes/whatsapp-menu`
- `/for/bakeries/whatsapp-catalog`
- `/for/salons/whatsapp-service-menu`
- `/for/spas/whatsapp-service-list`
- `/for/barbers/whatsapp-rate-card`
- `/for/car-detailing/whatsapp-price-list`
- `/for/pet-groomers/whatsapp-service-list`
- `/for/photographers/whatsapp-package-list`
- `/for/event-vendors/whatsapp-package-list`

### Keyword Clusters

Primary:

- WhatsApp menu link
- menu link for WhatsApp
- WhatsApp service list
- WhatsApp rate card
- WhatsApp price list
- WhatsApp catalog alternative
- public menu link for WhatsApp
- salon price list WhatsApp
- restaurant menu link WhatsApp

Secondary:

- QR menu WhatsApp
- online price list for WhatsApp
- how to send menu on WhatsApp
- WhatsApp Business menu
- PDF menu link
- rate card link

### SEO Rules

- No thin city/category page generator.
- No ranking promises.
- No AI-search guarantee.
- Use screenshots, workflow steps, and real product proof.
- Each page must answer an owner job, not just contain keywords.
- Every comparison page must be fair to WhatsApp. MenuList complements WhatsApp; it does not replace it.

## Product And Ops Requirements

### Must-Have Before Big Hype

| Requirement | Why | Status |
| --- | --- | --- |
| Public WhatsApp destination number or Click-to-WhatsApp URL | CTA needs a real endpoint | Founder/product input needed |
| Prefilled WhatsApp message | Reduces owner friction | Not implemented as campaign CTA |
| Intake script | Keeps manual flow consistent | Needs doc/playbook |
| File acceptance decision | WhatsApp sources include PDFs/screenshots/photos/text | Current public client accepts image upload and owned public link; PDF direct upload missing |
| Preview handoff | Owner needs to see prepared source | Existing web preview exists; WhatsApp handoff needs playbook |
| Publish/claim guard | Prevents accidental public writes | Existing authenticated claim path exists |
| Staff reply template | Turns output into distribution loop | Template needed |
| Consent and suppression tracking | Prevents channel abuse | Manual first |
| Source attribution | Measures WhatsApp funnel | Use existing attribution where possible; campaign-specific tracking needed |
| Cache invalidation | Public output must not go stale | Claim route already revalidates tags; any new write path must match this |

### WhatsApp Intake Statuses

Use these in manual tracking before building automation:

1. Received
2. Needs business details
3. Needs clearer source
4. Preparing preview
5. Preview ready
6. Corrections needed
7. Owner approved in web review
8. Public link live
9. QR/link sent
10. Two surfaces activated

Do not use "Approved by WhatsApp reply" as a production state until the product supports it securely.

### Staff Reply Template

```text
Here is our current menu/service list: [MenuList link]
```

For restaurants:

```text
Here is our current menu: [MenuList link]
```

For salons/spas:

```text
Here is our current service list and prices: [MenuList link]
```

For package businesses:

```text
Here are our current packages: [MenuList link]
```

## Hype Campaign

### Campaign Name

```text
Forward It. Make It Official.
```

### Core Enemy

Old PDFs, screenshots, rate cards, and catalog files still moving through WhatsApp after the business has changed.

### Core Insight

The owner knows the current list. Customers see old versions. WhatsApp is where both sides already meet.

### Core Claim

```text
Send the list you already share. MenuList turns it into one official customer link.
```

### One-Liners

Use these repeatedly:

- Your business already runs on WhatsApp. Your public list should be easy to send there.
- The file is not the source. The current customer link is.
- Stop sending old rate cards.
- One current link for WhatsApp, Instagram, Google, QR, and staff replies.
- The fastest onboarding is not a dashboard. It is the list the owner already has.
- If a customer asks "latest menu?", your public list system is broken.
- A QR code is not the product. The current list behind it is.
- MenuList starts where the owner already works.

## Launch Challenge

### Name

```text
100 WhatsApp Lists in 100 Hours
```

### Public Promise

```text
We are turning 100 SMB WhatsApp menus, service lists, catalogs, packages, and rate cards into official customer links in 100 hours.
```

### Rules

1. Business sends its current list through the approved WhatsApp/contact path.
2. MenuList prepares a public preview.
3. Owner reviews through the safe review path.
4. MenuList publishes only after approval.
5. Before/after content is posted only with permission.
6. Demo/fake businesses are labeled internally and are not presented as real customers.
7. No fake logos, fake owner quotes, or unapproved business names.
8. If intake quality drops, pause the counter instead of publishing weak examples.

### Preconditions

- WhatsApp test destination ready; production destination pending.
- Intake script ready.
- Manual tracking board ready.
- Demo examples ready.
- Founder permission script ready.
- Consent/opt-out language ready.
- Clear capacity limit.
- Public `/whatsapp` campaign page ready.
- Messaging onboarding file intake is the WhatsApp PDF/file path; `/create-menu` remains the secondary image/link fallback while `/whatsapp` uses the test click-to-WhatsApp CTA.

### Content Outputs

- live counter on website or manual campaign page
- daily founder updates
- 2 short videos per day
- before/after screenshots
- partner outreach update
- WhatsApp Status update
- LinkedIn/X daily thread
- final "what we learned" post

## Video System

### Main Format

```text
I turned this WhatsApp list into one official customer link.
```

Structure:

1. Show messy WhatsApp source.
2. Show the business problem.
3. Show MenuList preview.
4. Show published customer link.
5. Show WhatsApp/QR/Instagram/Google placement.
6. CTA: Send your current list.

### Series

| Series | Use | Guardrail |
| --- | --- | --- |
| Old PDF Graveyard | Show stale files that keep circulating | Use fake/demo or permissioned examples |
| Rate Card Fix | Convert service/rate-card examples | Do not shame real SMBs |
| Street Test | Ask owners where the latest list lives | Require permission |
| 30-Second Setup | Show source -> preview -> link | Use actual supported flow |
| Surface Check | WhatsApp/Instagram/Google/QR placement | No ranking or revenue claims |

### Hooks

- This salon had three rate cards.
- This cafe was still sending last month's menu.
- Your customer does not know which screenshot is current.
- The old rate card in WhatsApp is costing trust.
- Before you print another QR, check what it opens.
- WhatsApp is your front desk. Make the list easy to trust.
- From screenshot to official customer link.
- One link for WhatsApp, Instagram, Google, QR, and staff replies.

## Founder Voice

Tone:

- anti-dashboard-first
- pro-owner
- India-SMB native
- direct
- not arrogant
- not anti-WhatsApp
- not anti-owner

Founder lines:

- Indian SMB owners do not wake up wanting another dashboard.
- They already run the business on WhatsApp.
- The menu is in WhatsApp. The customer is in WhatsApp. The confusion is also in WhatsApp.
- MenuList starts where the owner already works.
- The fastest onboarding is not a form. It is the current list.
- A QR code is not the product. The current list behind it is.
- Old PDFs are the silent enemy of SMB trust.
- India's SMB internet is not website-first. It is WhatsApp-first.
- MenuList is not trying to change owner behavior. It turns existing behavior into an official customer link.

## 30-Day Execution Plan

### Week 1 - Product-Truth Setup

1. Replace the test WhatsApp destination with the production account and confirm ownership, hours, and response SLA.
2. Keep `/create-menu` as the secondary image/link fallback while `/whatsapp` carries the WhatsApp-first CTA.
3. Use the completed WhatsApp intake playbook.
4. Use the completed `/whatsapp` page as the campaign base.
5. Prepare conversation demo copy.
6. Prepare first 10 fake/demo before sources.
7. Create tracking board columns.
8. Add consent/permission scripts.
9. Prepare staff reply templates.
10. Decide challenge capacity.

### Week 2 - Website And Proof

1. Review `/whatsapp` page on desktop and mobile.
2. Add click-to-WhatsApp CTA only after public destination is confirmed.
3. Turn the WhatsApp conversation demo into screenshot/video assets.
4. Add fair comparison block.
5. Build first demo screenshots.
6. Create first 10 short videos.
7. Prepare lead magnet: WhatsApp List Audit.
8. Prepare founder announcement.
9. Run internal dry run on demo source.
10. Verify no unsupported claims.

### Week 3 - Pilot

1. Invite 20-30 businesses or partner leads.
2. Process only high-fit current lists.
3. Publish only owner-approved links.
4. Record drop-off reasons.
5. Create permissioned before/after posts.
6. Test salon/spa and restaurant/cafe side by side.
7. Collect objections.
8. Tighten intake language.
9. Update docs/action register.
10. Decide whether challenge is ready.

### Week 4 - Public Challenge

1. Launch 100 WhatsApp Lists in 100 Hours only if capacity is ready.
2. Daily founder update.
3. Daily before/after video.
4. Daily partner outreach.
5. Daily status/counter update.
6. Publish first SEO article.
7. Publish comparison page draft if proof exists.
8. Convert previewed leads.
9. Request case-study permission.
10. Publish "what we learned" recap.

## Lead Magnets

### WhatsApp List Audit

Promise:

```text
Send the list you currently share on WhatsApp. We will show whether it is ready to become one official customer link.
```

### Rate Card Cleanup

For:

- salons
- spas
- barbers
- pet groomers
- car detailing
- laundry
- clinics

### PDF To Public Link

For:

- restaurants
- cafes
- bakeries
- photographers
- event vendors
- caterers

Only use this language after the PDF path is truly supported or the flow clearly says "send it to us and we prepare it manually".

### WhatsApp Catalog Review

Positioning:

```text
Keep your WhatsApp catalog. MenuList gives you one public customer link to place in WhatsApp, QR, Instagram, Google, and staff replies.
```

Do not position MenuList as anti-WhatsApp.

## Partner Strategy

Partner pitch:

```text
Turn every client's WhatsApp menu, service list, catalog, or package PDF into one official customer link.
```

Target partners:

- WhatsApp marketing agencies
- Instagram managers
- local SEO agencies
- menu/rate-card designers
- website designers
- food photographers
- salon photographers
- POS/booking consultants
- printing and QR vendors
- packaging vendors

Partner workflow:

1. Partner sends permissioned client source.
2. MenuList prepares public preview.
3. Client approves.
4. Partner helps place link on WhatsApp, Instagram, Google/profile link, QR, website, and print.
5. Partner earns setup/subscription share only after approved rules exist.

## Paid Marketing

Paid should not start until:

- click-to-WhatsApp CTA is live
- upload/preview/approval/publish path is verified
- two-surface activation is tracked
- intake cost is controlled
- founder approves budget ceiling
- compliance checklist is in place

First paid tests:

1. Meta click-to-WhatsApp ads using demo conversion creative.
2. Google Search for high-intent WhatsApp menu/rate-card terms.
3. Retarget `/whatsapp` visitors.
4. Partner LinkedIn test only for agencies/freelancers.

Stop-loss:

> Pause any paid test that generates chats without previews, approvals, published links, or partner calls.

## Compliance Guardrails

Do:

- Use owner-initiated click-to-WhatsApp.
- Ask permission before follow-ups.
- Keep identity clear.
- Respect opt-outs.
- Keep messages short.
- Track consent and source.
- Use permissioned examples.

Do not:

- bulk-blast scraped SMB numbers
- pretend to be WhatsApp or Meta
- use WhatsApp logo as a partnership badge
- claim official WhatsApp integration unless approved
- claim automatic catalog sync unless implemented
- post real business before/after without permission
- keep messaging after stop/no-response signals

## Immediate Action Register

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-W001 | Confirm WhatsApp destination and ownership | Founder | In progress | Test number `+1 555 657 1424` is configured; production still needs final phone/account, response owner, and operating hours. |
| MLD-W002 | Decide PDF/file intake path for public WhatsApp campaign | Founder + Codex | Done | Messaging onboarding supports WhatsApp file intake; `/create-menu` remains image/link fallback. |
| MLD-W003 | Write WhatsApp intake playbook | Codex | Done | `menulist-marketing-distribution_whatsapp-intake-playbook.md`. |
| MLD-W004 | Create `/whatsapp` page spec | Codex | Done | Public `/whatsapp` route shipped with capability guardrails and discovery coverage. |
| MLD-W005 | Implement click-to-WhatsApp CTA | Codex | In progress | Test-number click-to-WhatsApp CTA is wired; consent copy, tracking, and production destination remain pending. |
| MLD-W006 | Create WhatsApp conversation demo asset | Codex | In progress | On-page demo exists; external screenshot/video assets still pending. |
| MLD-W007 | Prepare 100 WhatsApp Lists ops playbook | Codex | Not started | Run only after intake capacity exists. |
| MLD-W008 | Build WhatsApp SEO content briefs | Codex | Not started | Start with `/whatsapp`, menu link, service list, rate card. |
| MLD-W009 | Add WhatsApp compliance checklist | Codex | Not started | Must cover opt-in, opt-out, identity, examples, and data retention. |
| MLD-W010 | Run pilot and log objections | Founder + Codex | Blocked | Needs founder-approved pilot businesses or partner leads. |

## Final Strategy

Make WhatsApp-first the moat, but execute in this order:

1. Product truth: use implemented messaging onboarding and keep `/create-menu` as the secondary upload/import fallback.
2. Campaign page: `/whatsapp` is live with test-number click-to-WhatsApp CTA, safe claims, and proof.
3. Pilot: process real or permissioned demo sources through the approved flow.
4. Proof: before/after public customer links across restaurant/cafe and salon/spa examples.
5. Launch challenge: 100 WhatsApp Lists in 100 Hours.
6. SEO: build WhatsApp-intent pages with real product proof.
7. Paid: scale only after activation and cost are measured.

The right hype is not noise. It is a public proof engine around one behavior:

> Indian SMB owners already send their current list on WhatsApp. MenuList makes that list official.

## Sources

- WhatsApp Business catalog resource: https://whatsappbusiness.com/resources/resource-library/whatsapp-business-app-resources-whatsapp-business-catalog/
- WhatsApp Help - About catalog: https://faq.whatsapp.com/405903568419894
- Meta catalog launch: https://about.fb.com/news/2019/11/introducing-catalogs-for-small-businesses/
- WhatsApp Business Terms: https://www.whatsapp.com/legal/business-terms
- Meta WhatsApp opt-in developer guidance: https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/
- TechCrunch India WhatsApp spam/market context: https://techcrunch.com/2022/10/10/in-india-businesses-are-increasingly-spamming-users-on-whatsapp/
- TechCrunch WhatsApp India market context: https://techcrunch.com/2025/12/14/whatsapps-biggest-market-is-becoming-its-toughest-test/
- TechCrunch WhatsApp Business MAU context: https://techcrunch.com/2023/06/27/whatsapp-business-crosses-200m-maus-introduces-personlized-messages-feature/
- Cluely virality thesis: https://cluely.com/blog/virality
- TechCrunch Cluely funding/controversial launch context: https://techcrunch.com/2025/06/20/cluely-a-startup-that-helps-cheat-on-everything-raises-15m-from-a16z/
- Business Insider Cluely distribution context: https://www.businessinsider.com/cluely-viral-ai-cheating-startup-15-million-a16z-2025-6
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
