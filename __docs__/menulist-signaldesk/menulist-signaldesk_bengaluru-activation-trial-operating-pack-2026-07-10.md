# MenuList SignalDesk - Bengaluru Activation Trial Operating Pack

**Status:** Approved for internal preparation; external contact and spend remain separately gated
**Approved:** July 10, 2026
**Approval evidence:** Founder instruction to do the needful after review of the exact social-channel research and 30-day plan
**Owner:** Founder
**Operator:** SignalDesk with founder review
**Scope:** Indiranagar and Koramangala, Bengaluru

## Outcome

Prove that MenuList can move three independent food businesses from scattered current-list information to one owner-reviewed customer link active on two useful surfaces within seven days of each owner starting.

This pack operationalizes the approved plan. It does not authorize SignalDesk to contact a business, send through a provider, spend money, publish content, change Google or Meta accounts, or write MenuList product truth.

## Approved Operating Envelope

| Control | Approved value |
| --- | --- |
| Pod | Indiranagar and Koramangala, Bengaluru |
| Categories | Independent cafes, dessert shops, QSRs, and customer-facing cloud kitchens |
| Candidate cap | 25 total; no more than five newly reviewed per day |
| Evidence target | 12 complete evidence packets |
| Owner conversations | At least five |
| Preview cap | Five private previews |
| Activation target | Three two-surface activations within seven days |
| Proof target | One owner-permitted proof asset |
| Partner test | Five menu-photographer or restaurant-consultant approaches, two conversations, one referral test |
| Offer | No-cost current-list consistency audit and private MenuList preview; owner review before publish |
| Primary path | Founder-led in-person or expected manual introduction |
| Secondary path | Permissioned referral; founder email remains held until sender readiness is complete |
| Approval mode | Prepare and approve each |
| Provider/media/partner spend | Zero |
| Trial duration | 30 days |
| Customer identity requirement | None for public menu viewing |

## Source Policy Split

Public evidence and contact permission must remain separate.

| Policy | Allowed | Blocked | Retention |
| --- | --- | --- | --- |
| Public business research | Store public business identity, category, neighborhood, official website/menu URL, public business Instagram URL, observed current-list gap, source URL, and review date for internal candidate/evidence review | Contact fields, personalization, export, send, social DM, inferred consent, provider content as durable truth | 30 days |
| Permissioned manual introduction | Store the business and expected contact path after founder introduction, explicit referral, partner handoff, or owner-requested follow-up | Public availability treated as permission, cold WhatsApp/Instagram, automated follow-up, unsupported claims | 90 days, then review |

Google Maps or Places output remains a temporary discovery signal only. Do not scrape it, store reviews/photos/menu content, use the GBP API for lead generation, or treat a public phone number as contact permission.

The separate [Bengaluru Ten-Business Learning Pilot](../menulist-marketing-distribution/menulist-marketing-distribution_bengaluru-ten-business-pilot.md) remains permissioned-only. The research board below may hold public business identities for evidence review, but a row moves into the onboarding pilot only after a founder, owner, referral, or approved partner supplies permission.

## Runtime Setup Sequence

Perform these actions only from a founder-authenticated desktop SignalDesk session after the QA Firebase access blocker is cleared:

1. Open `/signaldesk/policies` and run `Seed Defaults` once.
2. Confirm `Public business research` is active, evidence-only, contact-disabled, personalization-disabled, and 30-day retained.
3. Confirm `Permissioned manual introduction` is separate and contact-enabled only for expected introductions or referrals.
4. Open the market-pod review and approve `Bengaluru first proof pod` with the maintained zero-spend reason.
5. Keep Google Places, Apify, paid enrichment, provider send, and social publishing disabled.
6. Activate only the `Zero-spend trust partner learning test` budget; all values must be zero.
7. Create one manual experiment card using the approved target, stop, and outcome values below.
8. Import candidate rows under `Public business research` without email, phone, or Instagram handle fields.
9. Move a business to `Permissioned manual introduction` only after the permission basis is recorded.

## Experiment Card Values

| Field | Value |
| --- | --- |
| Hypothesis | One narrow Bengaluru restaurant pod will accept a private current-list preview when the founder shows a specific cross-surface inconsistency without asking the owner to replace paper, POS, ordering, or hospitality. |
| Channel | `manual` |
| Target count | `25` |
| Expected outcome | Three owner-reviewed two-surface activations within seven days, plus one permissioned proof asset. |
| Stop rule | Stop if five owner conversations produce no accepted private preview, or if fewer than two of the first five accepted previews activate on two surfaces. |

## Candidate Admission Rules

### Pass

- independent or small owner-led food business;
- located in Indiranagar or Koramangala;
- official source shows no current menu link, conflicting menu versions, PDF-only menu, Instagram-only list, or difficult mobile access;
- business identity is unambiguous;
- evidence is recent and source-linked;
- no chain, franchise, enterprise, complaint, suppression, or rights concern.

### Unsure

- current list may exist but cannot be verified;
- ownership or multi-location relationship is unclear;
- business is near the pod boundary;
- evidence is stale or from an unofficial source;
- the gap is operational rather than customer-facing.

### Fail or hold

- no visible current-list problem;
- business is closed, duplicate, chain-controlled, or outside the pod;
- source rights are unclear;
- contact would rely on scraped, enriched, or restricted data;
- the request requires POS, ordering, payment, inventory, loyalty, custom contract, or unauthorized platform access.

## Twenty-Five Candidate Research Board

Do not enter personal contact details. Business identities and source URLs expire after 30 days unless re-reviewed or moved through a permissioned introduction.

| Slot | Business | Category | Neighborhood | Official source | Current-list gap | Evidence date | Fit | Permission basis | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | Nuha Patisserie & Cafe | Patisserie/cafe | Indiranagar | https://cafenuha.com/ | Official Menu link resolves to the same page section showing three selection items without prices while the page states 12+ pastry varieties daily; owner has not confirmed completeness | 2026-07-10 | Pass | None | Hold for founder or partner introduction; no contact |
| 02 | Grumpy Girl Coffee | Cafe | Indiranagar | https://grumpygirlcoffee.in/ | Official page exposes named menu cards and some prices, but the fetched page did not provide a complete independently reviewable current list and some indexed items had no visible price | 2026-07-10 | Unsure | None | Re-review the official menu experience before admission; no contact |
| 03 | Eddy's Cafe | Cafe | Indiranagar | https://www.eddyscafe.com/menu | Official menu route presents a 14-image menu; item names, prices, and availability were not machine-readable in the reviewed page | 2026-07-10 | Pass | None | Hold for founder or partner introduction; no contact |
| 04 | Nanav Cafe | Cafe | Indiranagar | https://www.nanavcafe.com/ | Official first-party page exposes a broad menu with item names and prices in readable page content; no clear current-list gap was established | 2026-07-10 | Fail | None | Close unless later owner evidence shows a different problem |
| 05 | Give Me 5 Cafe | Cafe | Indiranagar | https://www.greenenterprise.co.in/giveme5cafe/ | Official first-party page makes the current menu dependent on a downloadable Adobe PDF rather than a directly reviewable customer list | 2026-07-15 | Pass | None | Hold for founder or partner introduction; no contact |
| 06 | Vanamo | Cafe/restaurant | Indiranagar | https://vanamo.in/ | Official page requires a menu download or QR scan; the current item and price list was not exposed in the reviewed page content | 2026-07-15 | Pass | None | Hold for founder or partner introduction; no contact |
| 07 | Casa Fresco | Cafe/restaurant | Indiranagar | https://casafresco.in/ | Official page confirms the Indiranagar location and discusses the menu, but the reviewed page did not expose a complete current item and price list | 2026-07-15 | Unsure | None | Re-review the first-party menu destination; no contact |
| 08 | Clean & Green Cafe | Cafe | Indiranagar | https://www.eatcleanandgreen.com/ | Official page confirms the Indiranagar cafe and describes menu curation, but the reviewed page did not expose a complete current item and price list | 2026-07-15 | Unsure | None | Re-review the first-party menu destination; no contact |
| 09 | Meld | Bakery/restaurant | Indiranagar | https://www.meldfoods.com/ | Official page says the 100 Feet Road venue opens in July 2026 and currently routes a limited online menu through Airmenus; live operating and menu state is not yet established | 2026-07-15 | Unsure | None | Re-review only after the venue is confirmed open; no contact |
| 10 | Lavonne Cafe | Patisserie/cafe group | Indiranagar | https://www.lavonnecafe.com/locations/indiranagar-cafe/ | Official site exposes an Indiranagar location and menu route across a multi-location group; no first-pod current-list gap was established | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 11 | Magnolia Bakery | Bakery chain | Indiranagar | https://magnoliabakery.in/l/2 | Official location page supplies a downloadable menu, but the business is an established multi-location international chain outside the first-pod profile | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 12 | Brik Oven | Restaurant group | Indiranagar | https://www.brikoven.com/landingpage | Official site presents location selection and multiple Bengaluru outlets; the business is outside the independent first-pod profile | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 13 | Vienna Bakehouse & Kitchen | Bakery/cafe | Koramangala | https://www.viennabakehouse.com/media/menu.pdf | Official site links the full menu as a PDF while the main page shows category-level descriptions; current item details depend on the PDF | 2026-07-10 | Pass | None | Hold for founder or partner introduction; no contact |
| 14 | Bao To Me | Restaurant | Koramangala | https://www.baotome.co.in/ | Official page offers a menu action and identifies the Koramangala venue, but the reviewed page did not expose a complete current item and price list | 2026-07-15 | Unsure | None | Re-review the first-party menu destination; no contact |
| 15 | Dulce Patisserie | Patisserie/cafe | Koramangala | https://www.dulcepatisserie.in/ | Official page confirms Koramangala and says the menu is highly customizable, but the reviewed page did not establish a stable complete current list | 2026-07-15 | Unsure | None | Re-review the first-party menu destination; no contact |
| 16 | Maffei Kitchen | Restaurant | Koramangala | https://www.maffei.in/ | Official first-party site provides a dedicated menu path and extensive cuisine information; no clear current-list gap was established | 2026-07-15 | Fail | None | Close unless later owner evidence shows a different problem |
| 17 | Avoke | Cafe group | Koramangala | https://avoke.in/cafes | Official page lists four cafe locations and direct menu actions; the business is outside the independent first-pod profile | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 18 | Toca Koramangala | Restaurant/nightlife venue | Koramangala | https://toca.club/wp-content/uploads/2024/11/Toca-Koramangala-food-Menu_compressed.pdf | Official site links customer menu information through a PDF stored under a `/2024/11/` URL path; that path does not prove publication date or currentness, and the owner has not confirmed either | 2026-07-15 | Pass | None | Hold for founder or partner introduction; no contact |
| 19 | Kori | Cafe | Koramangala | https://kori.cafe/wp-content/uploads/2025/09/Kori-Food-Menu.pdf | Official menu is a PDF asset whose reviewed food version omits prices; owner has not confirmed completeness or currentness | 2026-07-15 | Pass | None | Hold for founder or partner introduction; no contact |
| 20 | The Bier Library | Brewery/restaurant | Koramangala | https://www.thebierlibrary.in/ | Official site showcases a beer list and promotes an app, but the reviewed public page did not expose a complete current food and price list | 2026-07-15 | Pass | None | Hold for founder or partner introduction; no contact |
| 21 | Brik Oven | Restaurant group | Koramangala | https://www.brikoven.com/ | Official site identifies multiple Bengaluru outlets including Koramangala; the business is outside the independent first-pod profile | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 22 | The Craftery by Subko | Cafe/bakehouse group | Koramangala | https://www.subko.coffee/pages/sopi | Official site exposes the Koramangala venue and menu route within a multi-city brand; the business is outside the independent first-pod profile | 2026-07-15 | Fail | None | Exclude from the independent first pod |
| 23 | Dyu Art Cafe | Cafe | Koramangala | https://dyuartcafe.com/gallery | Official site confirms the Koramangala business, but the reviewed first-party page did not provide enough current menu evidence to establish the gap safely | 2026-07-15 | Unsure | None | Locate and review a first-party menu destination; no contact |
| 24 | The Hole in the Wall Cafe | Cafe group | Koramangala | https://theholeinthewallcafe.org/ | Official page exposes a broad readable menu and identifies multiple outlets; no clear first-pod current-list gap was established | 2026-07-15 | Fail | None | Close unless later owner evidence shows a different problem |
| 25 | Cafe Medley | Cafe | Koramangala | No approved first-party source established | Search results established the business identity only through third-party ordering/listing pages, which are excluded from this evidence policy | 2026-07-15 | Hold | None | Do not score or contact until a first-party source is established |

### July 15 Evidence Review Note

The bounded 25-candidate public evidence board is complete: eight `Pass`, seven `Unsure`, nine `Fail`, and one policy `Hold`. Reviews used official first-party websites/menu destinations only; the held row records that an approved first-party source was not established and does not use the third-party result as evidence. No phone, email, social handle, personal identity, customer data, outreach permission, or inferred consent was copied into the board. A `Pass` is an internal fit signal only; it does not authorize contact.

All July 15 evidence expires after August 14, 2026 unless re-reviewed. July 10 evidence retains its original August 9, 2026 expiry. Expiry does not convert evidence into contact permission.

## Evidence Packet

Create no more than 12 complete packets. Every packet must answer:

1. What is the exact business and location?
2. Which official or owner-controlled sources were checked?
3. What customer-facing current-list inconsistency was observed?
4. What was not verified?
5. Which source policy controls the evidence?
6. Is contact permission absent, pending, or recorded?
7. What one private preview would resolve?
8. Which two surfaces would be useful if the owner approves?
9. Which claims are prohibited?
10. What is the next safe action?

The runtime packet must also show:

- `current-menu-presence-v1` diagnostic version;
- observed format and source references;
- owner-control and mobile-access verification state;
- contradiction state;
- exact proposed route, subject, body, CTA, expected outcome, and unsupported-claim result;
- source-policy state and expiry;
- action fingerprint.

An evidence-only source may produce a packet for internal review, but its route remains `none` and its recommendation remains `hold`. If the message, evidence, sender, CTA, source rights, suppression state, or route changes after packet preparation, refresh the packet before any approval.

### Prepared Evidence Packet Register

These 12 documentation-level packets are prepared for founder-authenticated runtime entry after QA access is restored. Every packet remains held with route `none`, source policy `Public business research`, contact and personalization disallowed, permission absent, and zero budget. Runtime entry must recheck the source and preserve the evidence date and expiry below.

| Packet | Business | Evidence basis | Not verified / rejected facts | Expiry | Status |
| --- | --- | --- | --- | --- | --- |
| BEP-01 | Nuha Patisserie & Cafe | First-party page exposes only a small selection while stating 12+ daily pastry varieties | Completeness, current prices, owner intent, customer impact | 2026-08-09 | Hold; no route |
| BEP-02 | Grumpy Girl Coffee | First-party page exposes some named items and prices but not a complete independently reviewable list | Completeness, missing-price cause, owner intent | 2026-08-09 | Hold for evidence recheck |
| BEP-03 | Eddy's Cafe | First-party menu destination is image-based | Currentness, machine readability as owner priority, customer impact | 2026-08-09 | Hold; no route |
| BEP-04 | Give Me 5 Cafe | First-party menu depends on an Adobe PDF download | PDF currentness, owner priority, customer impact | 2026-08-14 | Hold; no route |
| BEP-05 | Vanamo | First-party menu depends on download or QR scan | Download content currentness, owner priority, customer impact | 2026-08-14 | Hold; no route |
| BEP-06 | Casa Fresco | First-party page confirms the venue but did not expose a complete current item and price list | Whether another first-party route is complete, owner priority | 2026-08-14 | Hold for evidence recheck |
| BEP-07 | Clean & Green Cafe | First-party page confirms the venue but did not expose a complete current item and price list | Whether another first-party route is complete, owner priority | 2026-08-14 | Hold for evidence recheck |
| BEP-08 | Vienna Bakehouse & Kitchen | First-party site links the complete menu as a PDF | PDF currentness, owner priority, customer impact | 2026-08-09 | Hold; no route |
| BEP-09 | Bao To Me | First-party page offers a menu action but reviewed content did not expose a complete list | Destination content, currentness, owner priority | 2026-08-14 | Hold for evidence recheck |
| BEP-10 | Toca Koramangala | First-party food-menu PDF is stored under a `/2024/11/` URL path | Publication date, whether the asset remains current, owner priority, customer impact | 2026-08-14 | Hold; no route |
| BEP-11 | Kori | First-party PDF menu omits prices in the reviewed version | Whether a separate current price list exists, owner priority | 2026-08-14 | Hold; no route |
| BEP-12 | The Bier Library | First-party page exposes beer information and an app but no complete public food and price list | App contents, whether omission is intentional, owner priority | 2026-08-14 | Hold; no route |

No packet asserts stale information, lost sales, poor ranking, owner need, contact permission, or platform affiliation. Those facts were not established.

Allowed evidence wording:

> We found more than one customer-facing version of the menu, or no clear current-menu link, across the business-controlled sources checked on [date]. The owner has not yet verified which version is current.

Do not say customers are leaving, sales are being lost, Google ranking will improve, or MenuList has verified information the owner has not reviewed.

## Draft-Only Introduction Scripts

### Founder in-person introduction

> I noticed customers can reach different versions of your current menu online. MenuList can prepare one private customer-facing version for you to review before anything changes publicly. If it is useful, the same link can be placed where customers already ask for the menu. Paper menus and your existing systems can stay.

### Warm referral request

> If the owner is open to it, please introduce us rather than sharing their contact details without permission. I will offer a no-cost current-list check and private preview. Nothing is published until the owner reviews it.

### Menu-photographer or restaurant-consultant approach

> When a client updates a menu, customers can still find older versions elsewhere. We are testing a no-fee Bengaluru learning partnership: with the owner's permission, MenuList prepares one private current customer link for review and helps place it on two useful surfaces. There is no bulk outreach, paid promotion, reseller promise, or recurring commission in this test.

### Interested-owner response

> Thanks. The useful next step is a private MenuList preview, not a sales call. You can share the current menu or service list, review the result, and decide whether anything should go live.

No message was sent and no external draft was created by preparing this pack.

## Intake And Tracking Links

Founder-led handoff:

`/create-menu?utm_source=founder_pilot&utm_medium=manual_handoff&utm_campaign=bengaluru_pilot_2026`

Permissioned partner handoff:

`/create-menu?utm_source=physical_partner&utm_medium=partner_handoff&utm_campaign=bengaluru_pilot_2026`

Do not append business names, contacts, owner IDs, store IDs, or other identifiers to these links.

## Private Preview Checklist

- current menu/list source supplied or confirmed by the owner;
- business name and location confirmed;
- sections, items/services, names, prices, and availability reviewed;
- contact details and customer actions reviewed;
- preview remains private/noindex until approval;
- owner approval recorded before publish;
- paper and staff-service option preserved;
- no customer login, phone, email, or WhatsApp submission required to view;
- first surface recorded;
- second surface recorded;
- seven-day deadline and recovery action recorded.

## Preferred Surface Pair

Primary:

- owner-authorized Google/Profile menu link.

One additional useful surface:

- business website;
- business Instagram bio;
- expected staff WhatsApp reply/profile;
- existing QR/table card;
- counter card or print handout.

SignalDesk records the owner-confirmed outcome. It does not directly modify Google, Instagram, WhatsApp, MenuList store/menu/project, billing, publishing, or customer truth.

## Weekly Decision

Choose exactly one:

- continue the current pod;
- narrow category or neighborhood;
- change the evidence source;
- change the introduction wording;
- improve the private-preview route;
- recover stalled second-surface activation;
- pause the partner test;
- stop the experiment.

Do not approve paid providers, sending, or additional automation merely because the candidate count is low.

## Stop Conditions

Pause the relevant scope immediately when:

- source or contact rights are unclear;
- a business, owner, or customer complains;
- identity is required merely to view the menu;
- five owner conversations produce no accepted preview;
- fewer than two of the first five accepted previews activate on two surfaces;
- founder attention exceeds 120 minutes per activated business because of repeated setup friction;
- a partner makes unsupported sales, ranking, exclusivity, or relationship claims;
- a platform or provider account warning appears;
- the work requires spend, automated send, or unauthorized platform access.

## Current External Blockers

| Blocker | Impact | Resolution |
| --- | --- | --- |
| QA Firebase Rules API permission remains HTTP 403 | Founder approval cannot yet be stored in the intended QA runtime | Grant the current caller the required Firebase project/rules permissions, then run the scoped QA deploy |
| No real permissioned business list | No owner may be contacted or moved into the onboarding pilot | Founder, owner referral, or approved partner supplies the first expected introduction |
| Sender identity and physical address remain unset | Commercial email/export remains blocked | Founder chooses the sender identity and compliant physical-address policy |
| No owner-approved activation proof exists yet | Content and creator distribution must remain draft-only | Complete the first two-surface activation and obtain proof permission |

## Completion Definition

The trial is complete only when SignalDesk can show:

- 25 bounded candidate reviews;
- 12 source-linked evidence packets;
- five owner conversations;
- five accepted private previews or structured objection outcomes;
- three two-surface activations within seven days;
- one permissioned proof asset;
- partner attribution for any referral;
- founder attention minutes per activated business;
- zero complaints, source-policy breaches, and external spend.
