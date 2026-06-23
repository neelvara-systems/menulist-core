# ReferFlow Product Strategy

> Status: Concept strategy note  
> Date: June 23, 2026  
> Scope: Independent product concept, not related to MenuList, Answerlattice, CampaignCue, KitStamp, GrowthOS, Canonica, or any current product line  
> Source input: `Referral Program Module - Product Requirements Document.pdf`
> CEO presentation note: Use Sections 1 and 1A for the approval discussion. Later sections are supporting research, product detail, and post-approval build thinking.

---

## 1. Executive Summary

The PDF describes a referral module where existing customers refer new customers and receive a reward only after the referred customer completes a real paid transaction. That core idea is strong.

The market already has many referral products. The opportunity is not to build generic referral software. The opportunity is to build a referral engine for appointment, service, clinic, salon, spa, wellness, fitness, repair, and other local businesses where the referral should qualify only after a real completed visit and paid invoice.

The rough PRD is directionally correct on:

- Double-sided rewards for referrer and referred customer.
- Qualification only after account creation, completed appointment/order, and paid invoice.
- Configurable reward type and reward amount.
- Admin reporting and customer referral dashboard.
- Fraud rules such as duplicate mobile, existing customer, self-referral, and first-referral-wins.
- Event trigger on invoice paid.

Current CEO/prototype decision:

For approval, keep the product close to the PDF. The first prototype should use the PDF's simple form-based referral flow: the existing customer submits friend name, mobile number, and optional email; the system creates a pending referral; the referred customer later registers/books/orders; reward is issued only after first successful paid invoice.

PDF alignment rule:

Every CEO/prototype document must preserve the original PRD flow and labels:

- Admin menu: `Settings -> Referral Program`.
- Trigger service/event: `ReferralInvitationService`, recommended after `Invoice Paid`.
- Trigger options: `Order Completed`, `Appointment Completed`, `Invoice Paid`.
- Referral delivery channels: WhatsApp Message, SMS, Email, App Notification.
- Referral lifecycle: `Pending -> Contacted -> Registered -> Appointment Booked -> Appointment Completed -> Invoice Paid -> Qualified -> Rewarded`.
- Rejected states: `Pending -> Duplicate -> Invalid -> Cancelled`.
- Reward type options shown in admin: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- PDF overview also mentions cashback. Treat cashback as a visible future/disabled option until payout, tax, fraud, and reconciliation rules are approved.

The compliance-safe refinement is not to drift into a different product. It is to make outbound communication controlled: the referral record can be created from the form, but business-initiated WhatsApp/SMS/email to the referred friend should follow the available consent and messaging rules for the region/channel. Referral codes, links, QR, and WhatsApp sharing remain roadmap enhancements exactly as the PDF's future-enhancement list suggests.

Recommended product positioning:

> ReferFlow is a plug-and-play referral program module for billing, POS, and appointment SaaS platforms. Existing customers refer friends, the referred customer completes the first paid order or appointment, and rewards are issued only after real revenue is generated.

Plug-and-play requirement:

The product must work beside existing billing/POS SaaS platforms such as ReSpark for salons and Devourin for restaurants. It should not require the business to replace its billing system. The referral product should connect to the system of record, read the minimum customer/appointment/order/invoice events needed for referral qualification, and push back only the reward/coupon/wallet action that the billing system can support.

Recommended first wedge:

- Salons, spas, wellness clinics, fitness studios, dental/cosmetic clinics, pet grooming, coaching centers, repair shops, and other repeat-visit local service businesses.
- Start with one vertical first, preferably salons/spas or clinics, because referrals already happen naturally and the value of a trusted recommendation is easy for owners to understand.

Recommended MVP:

- Campaign setup.
- Admin menu at `Settings -> Referral Program`.
- Full PDF trigger options: order completed, appointment completed, invoice paid; default selected trigger is invoice paid.
- `ReferralInvitationService` automation event.
- Referral invitation channels: WhatsApp Message, SMS, Email, App Notification.
- Post-invoice referral invitation.
- Customer referral form for friend name, mobile number, and optional email.
- Referral record and status lifecycle.
- Full PDF lifecycle including Contacted, Invalid, and Cancelled states.
- Referred customer matching by mobile/email.
- Referral attribution.
- Paid-invoice qualification.
- Plug-and-play connector layer for billing/POS/appointment systems.
- First connector templates for ReSpark-style salon software and Devourin-style restaurant POS software.
- Wallet credit or coupon reward ledger.
- Fraud review.
- Admin dashboard.
- Customer referral dashboard.
- Webhooks/API, CSV import, scheduled export, and manual fallback for invoice and appointment systems.

Do not start with:

- Cash payouts.
- Influencer program.
- Staff referral program.
- Tiered ambassador logic.
- Multi-level rewards.
- Complex loyalty points.
- Marketplace-style partner program.

Those are valid later capabilities, but the first product should prove one thing: whether businesses will pay for referral-attributed paid bookings.

---

## 1A. CEO Approval Version

This is the version to present now.

### Product Name

ReferFlow

### One-Line Pitch

A plug-and-play referral program that helps businesses acquire new customers through existing customers, with rewards issued only after the referred customer completes their first paid order or appointment.

### Simple Explanation

A salon, spa, restaurant, clinic, or local business already has happy customers. After a customer pays a bill, the system invites them to refer friends. The customer submits friend details. The referred friend registers, books or orders, completes the first transaction, and pays. Only then does the system reward the referrer and the referred customer.

That is the whole product.

### What The CEO Should Approve

Ask for approval to build:

1. A 13-screen clickable prototype.
2. One salon/spa workflow.
3. One restaurant workflow.
4. MVP scope based on the PDF.
5. A small pilot with 2-3 salons/spas and 1-2 restaurants where customer identity exists.

### Product Boundary For Approval

This product is not:

- A new POS system.
- A new appointment system.
- A full loyalty platform.
- An influencer platform.
- A cashback app.
- A generic CRM campaign tool.

This product is:

> ReferFlow plugs into billing/POS/appointment software and rewards referrals only after first successful paid invoice.

### Why This Should Exist

Businesses already rely on word-of-mouth, but referral tracking is usually manual:

- Staff asks, "Who referred you?"
- Customers forget names.
- Businesses reward too early.
- Duplicate and self-referrals happen.
- Owners cannot see conversion or revenue.
- Rewards are not tied to real paid invoices.

The strongest business point:

> We are not just collecting referrals. We are qualifying referrals against real business outcomes: first order/appointment completed and invoice paid.

### Core Flow For Prototype

Use the PDF flow directly:

1. Existing customer completes order/appointment.
2. Invoice is paid.
3. Referral invitation is sent.
4. Customer submits friend name, mobile number, and optional email.
5. Referral record is created with `Pending` status.
6. Friend registers using matching mobile/email.
7. Friend books appointment or places order.
8. Appointment/order is completed.
9. Invoice is paid.
10. System checks first visit, first paid invoice, minimum amount, and fraud rules.
11. Referral becomes qualified.
12. Rewards are issued.
13. Admin dashboard and customer portal update.

### Prototype Screens

Build the CEO prototype with these 13 screens:

| Screen | Purpose | What To Show |
| --- | --- | --- |
| 1. Owner Onboarding / Setup Wizard | First-time owner setup | Choose business type, connect/select billing software, set rewards, confirm invoice-paid trigger, turn program ON |
| 2. Admin Dashboard | Business value | Total referrals, qualified referrals, conversion rate, rewards issued, revenue generated, top referrers |
| 3. Referral Program Settings | Admin control | `Settings -> Referral Program`, enable program, referrer reward, referred customer reward, minimum invoice, first visit only, first paid invoice only, max reward, reward expiry, trigger dropdown with Order Completed / Appointment Completed / Invoice Paid |
| 4. Referral Invitation | Trigger moment | `ReferralInvitationService`, channels: WhatsApp Message, SMS, Email, App Notification, message after invoice paid |
| 5. Referral Form | PDF customer flow | Friend name, mobile number, optional email, add another friend, submit referrals |
| 6. Referral Submitted Confirmation | Confidence | "2 referrals submitted successfully" and pending referral list |
| 7. Admin Referral Record | Operational tracking | Referral ID, referrer, prospect name, prospect mobile, status, created date |
| 8. New Customer Journey Tracker | Lifecycle proof | Pending, Contacted, Registered, appointment/order booked, completed, invoice paid, qualified, rewarded |
| 9. Reward Distribution | Reward moment | INR 100 issued to referrer, INR 100 issued to referred customer, expiry date, status rewarded |
| 10. My Referrals | Customer portal | Total referrals, pending, qualified, rewarded, wallet earned, referral list |
| 11. Fraud Checks | Business protection | Duplicate mobile, existing customer, self-referral, one customer referred once, first referral wins, rejected states Duplicate / Invalid / Cancelled |
| 12. Referral Report | Reporting | Date range, status filter, referrer, reward status, export report |
| 13. Integrations / Plug-And-Play | SaaS fit | ReSpark salon and Devourin restaurant connection cards with invoice/bill paid triggers |

### Demo Story: Salon

Priya visits Glow Salon and pays INR 1,200. Because the invoice is paid, the referral program is triggered. Priya receives a message: "Refer your friends and earn INR 100 wallet credit." She submits Amit's name and mobile number. The system creates a pending referral.

Amit registers with the same mobile number, books an appointment, completes the appointment, and pays a INR 900 invoice. The system checks the rules: first visit, first paid invoice, minimum invoice above INR 500. Referral becomes qualified. Priya receives INR 100 wallet credit. Amit receives INR 100 wallet credit. Admin dashboard now shows one qualified referral, INR 200 rewards issued, and INR 900 revenue generated.

For a restaurant, use the same story and replace appointment with order.

### CEO Deck Structure

Use 11 slides:

| Slide | Title | Message |
| --- | --- | --- |
| 1 | Product Title | ReferFlow: acquire new customers through existing customers, with rewards issued after first paid order/appointment |
| 2 | Problem | Referral tracking is manual, inconsistent, and creates reward leakage |
| 3 | Product Idea | Existing customer refers, new customer completes first paid transaction, both get reward |
| 4 | Users | Business admin, existing customer, referred customer, SaaS platform partner |
| 5 | Admin Setup | `Settings -> Referral Program`, reward type options, minimum invoice, first visit, reward expiry, trigger options |
| 6 | Customer Flow | Invoice paid, `ReferralInvitationService`, WhatsApp/SMS/Email/App notification, customer submits friend, referral pending |
| 7 | New Customer Flow | Pending, Contacted, Registered, books/orders, completes, pays, qualifies, rewards generated |
| 8 | Fraud Prevention | Duplicate mobile, existing customer, self-referral, first referral wins, Invalid/Cancelled rejection |
| 9 | Dashboards And Reports | Referrals, qualified referrals, conversion, rewards issued, revenue generated |
| 10 | Plug-And-Play Examples | ReSpark salon and Devourin restaurant workflows |
| 11 | Approval Ask | Approve prototype, MVP scope, and pilot |

### Plug-And-Play Explanation For CEO

Do not explain APIs in the CEO pitch. Say:

> The module can sit inside any billing or appointment SaaS. The billing software already knows when an order, appointment, or invoice is completed. We use that moment to trigger referral invitation, track the referred customer, and issue rewards only after the referred customer's first paid invoice.

Example A: ReSpark salon

1. Customer visits salon.
2. Appointment is completed.
3. Invoice is paid.
4. Referral invitation is sent.
5. Customer refers Amit.
6. Amit registers and books appointment.
7. Amit completes first appointment.
8. Amit's invoice is paid.
9. Both receive wallet credit.

Example B: Devourin restaurant

1. Customer orders at restaurant.
2. Order is completed.
3. Bill is paid.
4. Referral invitation is sent.
5. Customer refers Rahul.
6. Rahul places first order.
7. Rahul's invoice is paid.
8. Both receive wallet credit or discount.

### Owner Onboarding And Usage Journey

ReferFlow should feel like a plug-in referral module for the software the owner already uses, such as ReSpark for salons or Devourin for restaurants.

#### Owner Onboarding

1. Owner opens ReferFlow or enables it inside their billing/POS software.
2. Owner selects business type:
   - Salon / Spa
   - Restaurant
   - Clinic
   - Other
3. Owner connects or selects their billing software:
   - ReSpark-style salon software
   - Devourin-style restaurant POS
   - Manual/import mode if no direct integration exists
4. Owner sets referral rules:
   - Referrer reward: INR 100 wallet credit
   - Referred customer reward: INR 100 wallet credit
   - Minimum invoice: INR 500
   - First visit only: Yes
   - First paid invoice only: Yes
   - Reward expiry: 30 days
5. Owner turns the referral program ON.

That is onboarding.

#### How A Salon Owner Uses It

1. Priya visits the salon.
2. Salon completes her appointment in ReSpark.
3. Priya pays the invoice.
4. ReferFlow triggers a referral invitation: "Refer your friends and earn INR 100 wallet credit."
5. Priya submits her friend Amit's name and mobile number.
6. Amit later registers or books using the same mobile number.
7. Amit completes his first appointment.
8. Amit pays the invoice.
9. ReferFlow checks:
   - Is Amit new?
   - Is this his first visit?
   - Is the invoice paid?
   - Is the invoice above INR 500?
   - Is it not duplicate or self-referral?
10. If all pass, ReferFlow rewards both:
   - Priya gets INR 100 wallet credit.
   - Amit gets INR 100 wallet credit.

#### How A Restaurant Owner Uses It

1. Customer finishes an order.
2. Bill is paid in Devourin.
3. ReferFlow sends or shows the referral invitation.
4. Customer submits friend details.
5. Friend places first order using matching mobile number.
6. Friend's bill is paid.
7. ReferFlow checks the same qualification and fraud rules.
8. Both customers get reward or discount.

#### What The Owner Sees

Owner dashboard shows:

- Total referrals
- Pending referrals
- Qualified referrals
- Rewards issued
- Revenue generated
- Top referrers
- Fraud/rejected referrals

#### Simple Product Explanation

ReferFlow sits on top of billing software.

Billing software says: "Invoice paid."

ReferFlow says: "Now ask this happy customer to refer friends."

Friend comes and pays first invoice.

ReferFlow says: "This referral is real. Issue reward."

That is the product.

### Approval-Stage Product Decisions

| Decision | Recommendation | Why |
| --- | --- | --- |
| Default reward | Wallet credit | Easy to explain and keeps value inside the business |
| Default trigger | Invoice paid | Protects business from rewarding fake or incomplete referrals |
| First prototype flow | Form-based referral submission | Matches the PDF and is easiest for CEO to understand |
| First program complexity | One referral program per business | Keeps MVP focused |
| Reporting | Strong from day one | CEO and owners need revenue and reward-cost visibility |

### V1 Roadmap Boundary

Keep these out of v1 approval:

- Influencer referral program.
- Staff referral program.
- Tier-based rewards.
- Branch-specific campaigns.
- Membership referral rewards.
- Package referral rewards.
- Cashback payouts.
- Advanced referral links.
- Complex QR referral flows.
- Full loyalty platform.

They can stay as roadmap because the PDF already lists them as future enhancements.

---

## 2. What The PDF Says

The PDF describes a referral program with these core parts:

| Area | Rough PRD Direction | Assessment |
| --- | --- | --- |
| Business goal | Increase acquisition through word-of-mouth | Correct and commercially valid |
| Referrer | Existing customer who shares referral details | Correct |
| Referred customer | New customer who joins using referral | Correct |
| Qualification | Account created, first order/appointment completed, invoice paid | Strongest part of the PRD |
| Admin settings | Enable program, reward type, reward amount, qualification rules | Correct |
| Trigger | Recommended: invoice paid | Correct |
| Referral submission | Customer submits friend name, mobile, optional email | Core prototype flow; add clear consent/messaging controls before live launch |
| Status lifecycle | Pending -> Contacted -> Registered -> Appointment Booked -> Appointment Completed -> Invoice Paid -> Qualified -> Rewarded | Useful but should be event-driven |
| Fraud prevention | Duplicate mobile, existing customer, self-referral, one referral per customer | Correct baseline |
| Customer portal | My Referrals dashboard | Correct |
| Admin dashboard | Conversion, rewards issued, revenue, top referrers | Correct |
| Database | Settings, referrals, rewards | Good start, but needs event ledger, audit, fraud flags, and idempotency |
| Future enhancements | Codes, links, QR, WhatsApp, influencer, staff, tiers, branches | Keep as roadmap for CEO approval; do not overload v1 prototype |

The PDF is sufficient as a concept document, but it is not yet a build-ready product spec. The missing parts are:

- Consent-first referral flow.
- Legal/compliance boundaries.
- Attribution rules.
- Reward liability accounting.
- Refund/cancellation handling.
- Abuse controls beyond duplicate mobile.
- Event idempotency.
- Integration model.
- Pricing and unit economics.
- Market positioning.
- Operational dashboards for support and finance.

---

## 3. Market Research Summary

Referral software is an established category. The product must have a sharper wedge than "referral program."

### 3.1 Horizontal Referral Platforms

| Product | Market Position | Useful Learning |
| --- | --- | --- |
| [ReferralCandy](https://www.referralcandy.com/) | E-commerce referral platform with referral links, coupon codes, sales tracking, dashboards, and public pricing | E-commerce buyers want fast setup and purchase-attributed rewards. The public pricing shows SMB appetite for self-serve referral tools. |
| [Friendbuy](https://www.friendbuy.com/referral-program-software) | Referral and loyalty software for consumer brands, focused on attribution, fraud controls, and measurable revenue | Fraud controls and CPA/LTV measurement are not optional at scale. Referral reward logic is an acquisition economics problem, not just a marketing widget. |
| [Extole](https://www.extole.com/) | Enterprise customer-led growth platform for referral, loyalty, influencer, reward, and offer programs | Large customers need multi-program management, event integrations, personalization, and deep analytics. |
| [Mention Me](https://www.mention-me.com/en-us/referral-common-questions) | Referral platform with referral links, social sharing, email, and Name Share | Validates that referral attribution can work beyond simple referral links, but it is still not the same as SMB invoice-qualified appointment/order flow. |
| [Referral Rock](https://referralrock.com/) | Referral software for customer referral, ambassador, affiliate, and partner programs | Broader than e-commerce. Good signal that service and B2B businesses need a referral system that is not tied only to online checkout. |
| [Viral Loops](https://viral-loops.com/) | Viral campaigns, giveaways, waitlists, and referral campaigns | Strong for campaign-led growth, less native for appointment completion and invoice-paid qualification. |
| [Smile.io](https://smile.io/referrals) | Shopify loyalty and referral product | Shows the standard e-commerce pattern: advocate shares, friend receives discount, advocate reward follows purchase. |
| [Yotpo Loyalty & Referrals](https://support.yotpo.com/docs/referral-program-how-it-works) | E-commerce loyalty and referral suite | Referral is often bundled with loyalty. This creates a packaging lesson: referrals can be sold alone, but they become stronger when tied to loyalty/wallet. |

### 3.2 Local-Service And Appointment Products

| Product | Market Position | Useful Learning |
| --- | --- | --- |
| [Zenoti Referral Reward Program](https://help.zenoti.com/en/loyalty/other-tasks/configure-referral-reward-program.html) | Salon/spa/wellness platform with referral reward configuration, guest referral codes, POS touchpoints, webstore/kiosk/customer app prompts, and invoice-closure rules | Closest direct validation. It proves referral programs already matter in the salon/spa/wellness category. The opening is a simpler plug-and-play module for billing/POS/appointment SaaS platforms. |
| [Zenoti Webstore Referral Program](https://help.zenoti.com/en/configuration/webstore-configurations/configure-referral-program.html) | Referral pages for existing guests, landing pages for referred guests, and promotion banners across webstore | Strong proof that referral needs customer-facing surfaces, not just admin settings. |
| [Fresha Client Loyalty](https://www.fresha.com/help-center/knowledge-base/clients/563-client-loyalty-overview) | Salon/spa/beauty platform with loyalty referrals | Very important validation. Referral rewards are relevant to salons and appointment businesses, not just e-commerce. |
| [Referrizer](https://business.referrizer.com/) | Local business marketing automation with referrals, landing pages, SMS, loyalty, and lead generation | Confirms the SMB local-service wedge. Also shows the danger of becoming too broad too early. |
| [Vagaro referrer tracking](https://support.vagaro.com/hc/en-us/articles/360007585333-Add-the-Name-of-a-Customer-s-Referrer) | Appointment business software that tracks "referred by" in customer profile/reporting | Shows a gap: many vertical tools track source/referrer but do not fully automate referral rewards end-to-end. |
| [Perkville](https://info.perkville.com/) | Loyalty and referral platform for product and service brands, including fitness/wellness use cases | Validates fitness/wellness referral demand and the need for integrated reward flows. |
| [Square referral program](https://squareup.com/help/us/en/article/5209-square-s-referral-program) | Square's own business-to-business referral program | Useful as a qualification example: Square rewards after referred businesses complete defined activation/processing milestones. |

### 3.3 India And Enterprise Loyalty Platforms

| Product | Market Position | Useful Learning |
| --- | --- | --- |
| [Capillary Loyalty](https://www.capillarytech.com/products/loyalty-program-software/) | Enterprise loyalty, CDP, engagement, partner/channel/influencer loyalty, and omnichannel loyalty platform | Powerful but enterprise-heavy. This product should avoid becoming a full loyalty/CDP suite. |
| [EasyRewardz](https://www.easyrewardz.com/loyalty/) | Omnichannel loyalty program platform | Validates the India loyalty/rewards market, but the SMB wedge should stay simpler and invoice-qualified. |
| [LoyaltyXpert](https://www.loyaltyxpert.com/) | Loyalty and referral program software with partner/dealer/referral rewards and integrations | Shows referral and reward software demand in India, especially around partner/channel use cases. Not the same as the proposed customer referral module for billing/POS SaaS. |

### 3.4 Trust And Referral Economics Evidence

Referral programs work because trust transfers from the referrer to the referred person.

Research signals:

- Nielsen's global trust research has repeatedly shown recommendations from friends and family as one of the most trusted forms of advertising. See [Nielsen Global Trust in Advertising 2015](https://www.nielsen.com/insights/2015/global-trust-in-advertising-2015/) and [Nielsen 2021 Trust in Advertising context](https://www.nielsen.com/insights/2021/beyond-martech-building-trust-with-consumers-and-engaging-where-sentiment-is-high/).
- McKinsey's word-of-mouth work is often cited for word of mouth influencing a meaningful share of purchase decisions. See the archived PDF result for ["A new way to measure word-of-mouth marketing"](https://blog.op1c.com/wp-content/uploads/2010/05/201004mckinseynewwaytomeasurewordofmouth-100420123011-phpapp022.pdf).
- Wharton/Journal of Marketing research found referred customers in one banking study had higher long-term value than comparable non-referred customers. See [Referral Programs and Customer Value](https://faculty.wharton.upenn.edu/wp-content/uploads/2013/05/Schmitt_Skiera_VandenBulte_2013_Referrral_Programs_2.pdf) and the American Marketing Association summary, [Maximizing the Benefits of Customer Referrals](https://www.ama.org/2019/11/20/maximizing-the-benefits-of-customer-referrals/).

The exact lift will vary by category. The product should not sell exaggerated universal claims. It should sell measurable attribution:

- How many customers shared?
- How many friends clicked?
- How many booked?
- How many paid?
- What was the reward cost?
- What revenue came from referrals?
- Did referred customers return?

---

## 4. Product Thesis

### 4.1 Core Thesis

Local service businesses already get referrals, but most referrals are informal, manually tracked, under-measured, and unrewarded.

The product should make referrals:

- Easy for customers to share.
- Safe for friends to accept.
- Automatic for businesses to track.
- Economically controlled by qualification rules.
- Fraud-resistant.
- Measurable by paid revenue, not vanity signups.
- Easy to connect to the billing/POS software the business already uses.

### 4.2 One-Sentence Product Definition

ReferFlow is a plug-and-play referral module for billing/POS/appointment SaaS platforms that turns happy paid customers into measurable new paid customers.

### 4.3 Product Promise

After invoice payment, the existing customer is invited to refer friends. The customer submits friend details, the referred friend registers and completes the first order/appointment, and rewards unlock only after the first qualifying paid invoice.

### 4.4 What Makes This Different

Generic referral tools are usually optimized for e-commerce checkout. This product should be optimized for real-world appointment businesses:

- Referral qualifies after appointment completion and invoice payment.
- Works with phone-first customers and WhatsApp sharing.
- Supports branch, staff, service, package, and invoice conditions.
- Uses wallet/coupon rewards instead of cash payouts by default.
- Gives owners a revenue and reward-liability view.
- Prevents common local-business abuse such as self-referral, duplicate profiles, staff gaming, and repeat existing customers claiming "new customer" rewards.

### 4.5 Platform Thesis: Plug Into The Existing Billing System

This product should not try to become the salon POS, restaurant POS, booking system, CRM, payment system, and wallet at the same time. That would make the product too heavy and would force businesses to replace software they already use.

The better thesis:

> Own referral attribution, qualification, fraud checks, and reward ledger. Integrate with whichever billing/POS SaaS owns the actual customer, appointment, order, and invoice data.

For example:

- A salon using ReSpark should keep using ReSpark for POS billing, online appointments, CRM, memberships, WhatsApp marketing, and loyalty-style operations.
- A restaurant using Devourin should keep using Devourin for POS billing, digital menu, table/takeaway/delivery orders, CRM, inventory, and owner reporting.
- The referral product should sit beside those systems and answer one job: which referred customer created verified paid revenue, and what reward should now be issued?

This makes the product more sellable because the owner does not need to migrate operations. It also makes the product more defensible because it can become a referral layer across many vertical SaaS systems.

---

## 5. ICP And Buyer

### 5.1 Best First ICP

Start with local appointment businesses that satisfy these conditions:

- Repeat visits are normal.
- Customers are socially influenced.
- Referral source already matters.
- Average ticket is high enough to fund a double-sided reward.
- Owner or manager can understand ROI without complex analytics.
- Booking and invoice/payment events exist digitally.

Best first verticals:

| Vertical | Why It Fits | Risk |
| --- | --- | --- |
| Salons and spas | High trust, repeat visits, friend recommendations are natural | Some already use Fresha/Vagaro-style tools |
| Beauty clinics and med spas | High average ticket, trust matters | Compliance and claims need care |
| Fitness/wellness studios | Community behavior, repeat plans | Membership and package logic can complicate qualification |
| Dental/cosmetic clinics | High value per customer | Longer conversion cycle and stronger privacy sensitivity |
| Pet grooming | Repeat local service, trust and word of mouth | Lower ticket in some markets |
| Coaching/education centers | Family/community referrals | Seasonal and batch-based cycles |

Recommended first vertical: salons/spas or beauty/wellness clinics.

### 5.2 Buyer Personas

| Persona | What They Want | What They Fear |
| --- | --- | --- |
| Owner | More customers without ad complexity | Giving rewards without real revenue |
| Manager | Clear tracking and less manual follow-up | Staff forgetting to apply rewards |
| Marketer/agency | Campaign proof and attribution | Poor data, fake referrals, weak integrations |
| Franchise/multi-branch operator | Branch-level referral tracking | Reward abuse across branches |

### 5.3 End Users

| User | Job |
| --- | --- |
| Existing customer/referrer | Submit friend details and see referral reward status |
| Referred friend | Register, book/order, complete the first paid transaction, and receive the configured reward |
| Business staff | See referral status and apply/redeem rewards |
| Admin/owner | Configure rules, review fraud, measure revenue |

---

## 6. Product Principles

These should govern the build from day one:

1. Reward only after verified value.
   - A referral is not successful when someone clicks or signs up.
   - It is successful when the referred customer completes a qualifying paid transaction.

2. Control communication before contact.
   - For the CEO prototype, keep the PDF's form-based friend submission flow.
   - Before live launch, make the messaging rules clear by region and channel so the business does not send unsafe or unwanted promotional messages.
   - Referral links, codes, QR, and WhatsApp sharing remain roadmap enhancements.

3. Reward ledger, not balance mutation.
   - Every reward should have a ledger entry, status, source, expiry, and reversal path.

4. Fraud controls are core product, not admin extras.
   - Self-referral, duplicate profiles, repeated device/IP/payment signals, suspicious velocity, and manual override audit should be built into the model.

5. Keep the owner workflow simple.
   - Most SMB owners should only set reward amount, min invoice amount, expiry, and eligible services/branches.

6. Integrate through events.
   - Appointment booked, appointment completed, invoice paid, and refund/cancellation events should drive status transitions.

7. Measure revenue, not just referrals.
   - Dashboard should show referred revenue, reward cost, conversion rate, and payback.

---

## 7. Recommended Product Shape

### 7.1 Business Admin Console

The admin console should have these sections:

| Section | Purpose |
| --- | --- |
| Referral Program | Enable/disable and configure the primary campaign |
| Rewards | Set referrer and friend reward rules |
| Qualification | Define minimum invoice, first visit, first paid invoice, eligible services, expiry |
| Referral Invitation | Post-invoice message, referral form, optional future share link/QR |
| Referrals | Search and track every referral |
| Rewards Ledger | Pending, issued, expired, reversed rewards |
| Fraud Review | Suspicious referrals and blocked attempts |
| Reports | Conversion, revenue, rewards issued, top referrers |
| Integrations | POS, booking, CRM, wallet, SMS, WhatsApp, email |

### 7.2 Customer/Referrer Experience

The customer experience should be extremely simple:

1. Customer completes a paid visit.
2. Customer receives a message or sees a prompt:
   - "Refer your friends and earn INR 100 wallet credit when they complete their first appointment/order."
3. Customer opens the referral form.
4. Customer submits friend name, mobile number, and optional email.
5. Customer can see:
   - Total referrals.
   - Pending referrals.
   - Qualified referrals.
   - Rewards earned.
   - Expiring rewards.

Referral links, QR, and WhatsApp sharing can be added later, but the CEO prototype should stay form-based because that is the idea in the PDF.

### 7.3 Referred Friend Experience

The referred friend experience should be simple:

- Business name and logo.
- Clear referral offer.
- Registration or booking/order step.
- Mobile/email match with the referral record.
- Required condition: first qualifying paid visit.
- Reward confirmation after qualification.
- Communication/consent text before marketing messages.

Example copy:

> Amit, you were referred to Glow Salon. Complete your first appointment and paid invoice to receive INR 100 wallet credit.

This disclosure matters. It is honest, avoids hidden incentive concerns, and reduces complaints.

### 7.4 Staff Experience

Staff should not manage the program manually. They should only need to:

- See referral status on customer profile.
- Apply valid friend reward at checkout if the integration cannot auto-apply it.
- See whether a reward is pending, redeemable, expired, or blocked.
- Escalate suspicious referral to admin review.

### 7.5 Business Owner Dashboard

Dashboard cards:

- Total referrals submitted.
- Pending referrals.
- First bookings.
- Completed appointments.
- Paid qualified referrals.
- Conversion rate.
- Referred revenue.
- Reward liability.
- Rewards issued.
- Fraud blocked.
- Top referrers.
- Branch/service performance.

The most important chart:

Pending -> Contacted -> Registered -> booked/ordered -> completed -> paid -> qualified -> rewarded.

If the business cannot see drop-off by step, it cannot improve the campaign.

---

## 8. Core Workflow

### 8.1 Recommended Happy Path

1. Existing customer completes a paid appointment/order.
2. System identifies them as eligible to refer.
3. System sends or shows referral invitation.
4. Customer submits friend name, mobile number, and optional email.
5. Referral record is created with pending status.
6. Friend registers with matching mobile/email.
7. Friend books appointment or places order.
8. Friend completes appointment/order.
9. Invoice is paid.
10. Qualification engine checks rules.
11. Rewards are created as pending or issued based on settings.
12. Refund/cancellation window passes, if configured.
13. Rewards are issued to referrer and friend.
14. Notifications are sent.
15. Dashboards update.

### 8.2 State Machine

PDF-visible lifecycle states:

| State | Meaning |
| --- | --- |
| `Pending` | Referral record created after customer submits friend details |
| `Contacted` | Referral invitation/contact attempt has been sent through an allowed channel |
| `Registered` | Friend has a customer profile/account matched by mobile/email |
| `Appointment Booked` / `Order Placed` | Friend booked first appointment or placed first order |
| `Appointment Completed` / `Order Completed` | First transaction was completed operationally |
| `Invoice Paid` | Payment confirmed |
| `Qualified` | First visit, first paid invoice, minimum amount, and fraud rules passed |
| `Rewarded` | Rewards issued to referrer and referred customer |

PDF-visible rejected states:

| State | Meaning |
| --- | --- |
| `Duplicate` | Mobile/email already exists or the prospect was submitted more than once |
| `Invalid` | Required data is missing, malformed, ineligible, or cannot be matched |
| `Cancelled` | Booking/order/invoice was cancelled before qualification |

Internal production states can be more granular, but they should map back to the PDF-visible lifecycle above. Recommended internal states:

| Internal State | Maps To |
| --- | --- |
| `created` | Pending |
| `contacted` | Contacted |
| `registered` | Registered |
| `booked` | Appointment Booked / Order Placed |
| `completed` | Appointment Completed / Order Completed |
| `invoice_paid` | Invoice Paid |
| `qualified` | Qualified |
| `reward_pending` | Qualified |
| `rewarded` | Rewarded |
| `expired` | Invalid |
| `rejected_duplicate` | Duplicate |
| `rejected_self_referral` | Invalid |
| `rejected_fraud` | Invalid |
| `cancelled` | Cancelled |
| `reversed` | Cancelled |

Rejected states should preserve evidence. Do not just delete records.

### 8.3 Qualification Rules

MVP qualification rules:

- Referred person must be new to the business.
- Referred person must not match referrer's phone/email/device/payment method beyond acceptable thresholds.
- First paid invoice only.
- Minimum invoice amount.
- Eligible service/category.
- Eligible branch.
- Invoice must not be refunded during configurable review window.
- Referral must be within campaign validity window.
- Customer can be referred only once.
- First valid referral attribution wins.

Advanced rules:

- Reward after second visit.
- Reward after subscription/membership purchase.
- Higher reward for high-value services.
- Branch-specific campaigns.
- Staff-assisted referral attribution.
- Multi-location exclusion/inclusion.

---

## 9. Reward Design

### 9.1 Reward Types

Admin screens and prototype must show the PDF reward type options:

| Reward Type | Why |
| --- | --- |
| Wallet credit | Keeps value inside the business, easy to explain, reduces cash leakage |
| Fixed discount coupon | Simple for the referred friend, easy for staff |
| Percentage coupon | Useful but should be capped |
| Loyalty points | Matches the PDF option; keep simple in prototype |

Recommended default for CEO prototype:

- Referrer reward type: Wallet Credit.
- Referrer reward amount: INR 100.
- Referred customer reward type: Wallet Credit.
- Referred customer reward amount: INR 100.

PDF cashback note:

The PDF overview says rewards can include cashback, but the detailed admin reward type list contains Wallet Credit, Fixed Discount, Percentage Discount, and Loyalty Points. For alignment, show cashback as a roadmap/disabled option, not as the active v1 default.

Avoid as active v1 behavior:

| Reward Type | Why To Avoid Initially |
| --- | --- |
| Cashback | Creates payout, tax, fraud, KYC, and reconciliation complexity |
| Gift cards | Useful later, but requires liability and redemption accounting |
| Bank/UPI payouts | High abuse risk and operational complexity |

### 9.2 Double-Sided Reward

Recommended default:

- Friend gets discount on first visit.
- Referrer gets wallet credit after the friend completes and pays.

This is better than giving the referrer reward at signup.

### 9.3 Reward Timing

Best default:

- Friend discount applies at first qualifying checkout.
- Referrer reward is issued after paid invoice and optional refund/reversal window.

Suggested default review window:

- 0 days for low-risk cashless wallet credit.
- 7 days for higher-value rewards.
- 14-30 days for categories with common refunds/cancellations.

### 9.4 Reward Liability

Every issued but unused reward is a business liability. The product should show:

- Total pending rewards.
- Total issued rewards.
- Total redeemed rewards.
- Total expired rewards.
- Total reversed rewards.
- Liability by expiry date.

This is not optional for serious businesses.

---

## 10. Fraud And Abuse Controls

### 10.1 Baseline Rules

The PDF lists important baseline rules:

- Duplicate mobile check.
- Existing customer check.
- Self-referral check.
- One customer can be referred once.
- First referral wins.

These should be implemented.

### 10.2 Additional Controls Needed

Add these from the beginning:

| Risk | Control |
| --- | --- |
| Same person creates new profile | Phone/email match, device fingerprint, payment method hash, address similarity where legally allowed |
| Referrer uses family/staff phones repeatedly | Velocity limits and manual review thresholds |
| Staff manipulates referrals | Staff/admin action audit log |
| Fake bookings | Reward only after paid invoice |
| Refund after reward | Reversal or negative ledger entry |
| Coupon abuse | One friend reward per referred customer, expiry, minimum spend |
| Campaign abuse | Per-customer cap, per-day cap, branch cap |
| Duplicate referrals | First valid attribution wins, later duplicate records rejected but retained |

### 10.3 Fraud Review Dashboard

Fraud review should show:

- Referral ID.
- Referrer.
- Referred person.
- Rule triggered.
- Evidence summary.
- Risk score.
- Suggested action.
- Admin decision.
- Decision timestamp and user.

Admin actions:

- Approve.
- Reject.
- Hold.
- Reverse reward.
- Mark false positive.

Every decision must be logged.

---

## 11. Compliance And Messaging Rules

This product will likely use WhatsApp, SMS, and email. Messaging compliance is a product requirement, not a legal afterthought.

### 11.1 WhatsApp

Meta requires businesses to obtain opt-in before messaging people on WhatsApp. See [Meta WhatsApp opt-in documentation](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in).

Product rule:

- Do not send business-initiated WhatsApp messages to a referred friend unless the friend has opted in.
- WhatsApp sharing by the referrer is safer because the customer chooses to send a personal message through their own WhatsApp.
- If the friend opens the link and opts in, the business can send allowed template messages through WhatsApp Business Platform.

Also account for WhatsApp template categories. Meta separates template categories such as marketing, utility, and authentication. See [Meta template categorization](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization) and [template fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview).

Product impact:

- Referral promotions are likely marketing messages.
- Appointment confirmations/reminders may be utility messages.
- OTP/login messages may be authentication messages.

### 11.2 SMS In India

For India, commercial SMS requires sender registration, consent/template handling, and DLT compliance. TRAI guidance says senders must register customer consent before sending commercial communication. See [TRAI advice to senders](https://trai.gov.in/advice-to-senders).

Product rule:

- SMS templates and sender IDs must be managed per business/provider.
- Friend contact capture must include clear consent.
- Referral URLs in commercial SMS may require approved template handling by the SMS provider.

### 11.3 FTC/Endorsement Disclosure

If a referrer receives something of value, the incentive can be a material connection. The FTC endorsement guides explain that material connections can include payments, discounts, free products, or other benefits. See [FTC endorsement guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) and [16 CFR Part 255](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255).

Product rule:

- Referral form, friend registration screen, or offer screen should disclose that the referrer may receive a reward.
- Referral invitation and message templates should avoid pretending the recommendation is unpaid if a reward exists.

Plain copy:

> Your friend may receive a reward if you complete your first qualifying paid visit.

### 11.4 Privacy

Recommended privacy posture:

- Collect minimum data.
- Store referral attribution and contact consent separately.
- Do not expose friend details to referrer beyond coarse status unless explicit consent exists.
- Give businesses export and deletion tools.
- Keep audit logs for reward/fraud decisions.
- Hash sensitive matching signals where possible.

---

## 12. Data Model

This is a product-level model, not implementation-specific. It can be implemented in Postgres, Firestore, or another database. For a standalone SaaS, Postgres is the better default because reporting, joins, ledgers, and analytics will matter.

### 12.1 Core Tables

#### `organizations`

Business/customer account.

Fields:

- `id`
- `name`
- `country`
- `timezone`
- `currency`
- `status`
- `created_at`
- `updated_at`

#### `locations`

Branch/location.

Fields:

- `id`
- `organization_id`
- `name`
- `address`
- `timezone`
- `status`

#### `customers`

Business customer records.

Fields:

- `id`
- `organization_id`
- `location_id`
- `external_customer_id`
- `name`
- `phone_hash`
- `email_hash`
- `phone_normalized_encrypted`
- `email_encrypted`
- `created_at`

#### `campaigns`

Referral campaign configuration.

Fields:

- `id`
- `organization_id`
- `name`
- `status`
- `starts_at`
- `ends_at`
- `eligible_location_ids`
- `eligible_service_ids`
- `min_invoice_amount`
- `first_visit_only`
- `first_paid_invoice_only`
- `reward_expiry_days`
- `max_rewards_per_referrer`
- `max_rewards_per_referred_customer`
- `created_at`
- `updated_at`

#### `reward_rules`

Reward definitions.

Fields:

- `id`
- `campaign_id`
- `recipient_type` (`referrer`, `referred_customer`)
- `reward_type` (`wallet_credit`, `fixed_discount`, `percentage_discount`, `points`)
- `amount`
- `percentage_cap`
- `currency`
- `expiry_days`
- `status`

#### `referral_codes`

Unique code/link ownership.

Fields:

- `id`
- `organization_id`
- `campaign_id`
- `customer_id`
- `code`
- `status`
- `created_at`

#### `referrals`

Main referral object.

Fields:

- `id`
- `organization_id`
- `campaign_id`
- `referral_code_id`
- `referrer_customer_id`
- `referred_customer_id`
- `prospect_phone_hash`
- `prospect_email_hash`
- `status`
- `source_channel`
- `landing_page_session_id`
- `attribution_locked_at`
- `qualified_at`
- `rewarded_at`
- `rejected_reason`
- `created_at`
- `updated_at`

#### `referral_events`

Immutable event ledger.

Fields:

- `id`
- `organization_id`
- `referral_id`
- `event_type`
- `event_source`
- `external_event_id`
- `idempotency_key`
- `payload_json`
- `created_at`

#### `reward_ledger`

Financial/reward ledger.

Fields:

- `id`
- `organization_id`
- `campaign_id`
- `referral_id`
- `customer_id`
- `recipient_type`
- `reward_type`
- `amount`
- `currency`
- `status` (`pending`, `issued`, `redeemed`, `expired`, `reversed`)
- `issued_at`
- `expires_at`
- `redeemed_at`
- `reversed_at`
- `reversal_reason`
- `external_wallet_transaction_id`

#### `fraud_flags`

Fraud review evidence.

Fields:

- `id`
- `organization_id`
- `referral_id`
- `flag_type`
- `severity`
- `evidence_json`
- `status`
- `reviewed_by`
- `reviewed_at`
- `decision_reason`

#### `notification_logs`

Messaging audit.

Fields:

- `id`
- `organization_id`
- `referral_id`
- `recipient_customer_id`
- `channel`
- `template_id`
- `status`
- `provider_message_id`
- `consent_basis`
- `sent_at`
- `failed_reason`

### 12.2 Integration Tables

Because the product must work with external billing/POS systems, the data model also needs a connector layer.

#### `integration_accounts`

One connected third-party system per organization/location.

Fields:

- `id`
- `organization_id`
- `location_id`
- `provider_key` (`respark`, `devourin`, `custom_webhook`, `csv_import`, `zapier`, `make`)
- `provider_display_name`
- `connection_mode` (`api`, `webhook`, `csv`, `middleware`, `manual`)
- `status`
- `credentials_secret_ref`
- `last_sync_at`
- `last_success_at`
- `last_error`
- `created_at`
- `updated_at`

#### `external_object_links`

Maps external platform IDs to internal referral-product IDs.

Fields:

- `id`
- `organization_id`
- `integration_account_id`
- `external_object_type` (`customer`, `appointment`, `order`, `invoice`, `payment`, `coupon`, `wallet_transaction`)
- `external_object_id`
- `internal_object_type`
- `internal_object_id`
- `last_seen_at`

#### `integration_field_mappings`

Stores mapping rules for CSV/import or semi-custom connectors.

Fields:

- `id`
- `organization_id`
- `integration_account_id`
- `source_object_type`
- `source_field`
- `target_field`
- `transform_rule`
- `required`
- `created_at`

#### `sync_runs`

Tracks every import, webhook batch, or API polling job.

Fields:

- `id`
- `organization_id`
- `integration_account_id`
- `sync_type`
- `status`
- `records_received`
- `records_created`
- `records_updated`
- `records_rejected`
- `started_at`
- `finished_at`
- `error_summary`

### 12.3 Why Integration Tables Matter

If this product is meant to plug into ReSpark, Devourin, and similar SaaS systems, internal IDs cannot be treated as the only source of identity. The product must preserve external IDs and sync history so support can answer:

- Which ReSpark/Devourin customer matched this referral?
- Which external invoice qualified the reward?
- Did a webhook retry or CSV re-upload create duplicates?
- Was a reward pushed back to the billing system?
- Which field mapping caused a rejected import?

Without these tables, every integration becomes a one-off custom project.

### 12.4 Why Event Ledger Matters

Without a referral event ledger, the system will become hard to debug:

- Why did a reward issue?
- Which invoice qualified it?
- Was the person already a customer?
- Did a webhook retry create a duplicate reward?
- Did a refund happen after reward issuance?

Event ledger plus idempotency keys solve this.

---

## 13. Event Architecture

The system should be event-driven.

### 13.1 Inbound Events

Events from booking/POS/CRM systems:

- `customer.created`
- `appointment.booked`
- `appointment.completed`
- `invoice.created`
- `invoice.paid`
- `invoice.refunded`
- `customer.merged`
- `reward.redeemed`

### 13.2 Internal Events

Events generated by the referral engine:

- `referral.link_clicked`
- `referral.lead_captured`
- `referral.attributed`
- `referral.qualified`
- `referral.rejected`
- `reward.pending_created`
- `reward.issued`
- `reward.expired`
- `reward.reversed`
- `fraud.flag_created`

### 13.3 Idempotency

Every webhook and reward action must use idempotency keys.

Example:

`invoice_paid:{organization_id}:{external_invoice_id}:{campaign_id}`

This prevents duplicate rewards when payment webhooks retry.

### 13.4 Qualification Worker

Invoice paid should trigger a qualification worker:

1. Load invoice.
2. Find referred customer.
3. Find active referral.
4. Check campaign eligibility.
5. Check first paid invoice rule.
6. Check minimum amount.
7. Run fraud checks.
8. Create pending reward ledger entries.
9. Update referral status.
10. Send notifications.

Do not credit wallet directly inside the webhook handler.

---

## 14. Integrations

### 14.1 Integration Strategy

The product should be plug-and-play at the business level.

That means the setup flow should feel like:

1. Select your billing/POS system.
2. Connect using the best available mode.
3. Map customer, appointment/order, invoice, and reward fields.
4. Send a test event or upload a sample export.
5. Confirm the first referral qualification rule.
6. Go live without replacing the existing billing software.

The product should support five connector modes:

| Mode | When To Use | Product Behavior |
| --- | --- | --- |
| Native API/webhook connector | Platform exposes official APIs/webhooks | Real-time sync for customers, appointments/orders, invoices, refunds, rewards |
| Partner connector | Platform does not publish docs but can enable partner access | Build provider-specific connector after commercial/technical agreement |
| Scheduled export/import | Platform can export CSV/Excel reports | Business uploads or schedules exports; field mapping normalizes records |
| Middleware connector | Business already uses Zapier, Make, Pabbly, Integrately, or custom middleware | Use standard webhook endpoints and templates |
| Manual fallback | Early pilots or no available integration | Dashboard lets staff mark booked/completed/paid while preserving audit trail |

The commercial product should always prefer API/webhooks, but the early product should not block if a SaaS platform does not expose public developer documentation.

### 14.2 Target Plug-And-Play Systems

The first two concrete target connector templates should be ReSpark and Devourin-style systems.

| Platform | Public Positioning Found | Referral Product Need | Integration Assumption |
| --- | --- | --- | --- |
| ReSpark | Salon/spa software with POS billing, online appointments, CRM, memberships/packages, WhatsApp marketing, feedback, loyalty, and reports | Pull client, appointment, service, stylist, invoice, package/membership, payment, and discount/wallet-like data | Public pages show strong feature fit; no public API/webhook documentation was found in the research pass, so start with partner/API discovery plus CSV/import fallback |
| Devourin | Restaurant management software with POS billing, digital menu, dine-in/delivery/takeaway order handling, CRM, owner dashboards, reports, inventory, and Swiggy/Zomato-style integrations | Pull customer, order, bill, payment, outlet, source channel, coupon, and refund/cancel data | Public pages show strong feature fit; no public API/webhook documentation was found in the research pass, so start with partner/API discovery plus CSV/import fallback |

Important: "Plug-and-play" must not mean "we magically integrate with every closed SaaS." It should mean the product has a predictable connector framework and can support each platform through the best available route.

### 14.3 ReSpark-Style Salon Connector

Required objects:

- Client/customer profile.
- Mobile/email identity.
- Appointment booked.
- Appointment completed.
- Invoice generated.
- Invoice paid.
- Service/category.
- Stylist/staff member.
- Membership/package applied.
- Discount/wallet/loyalty adjustment if available.
- Refund/cancellation.

Referral qualification for salons:

- Friend must be new or inactive according to configured rule.
- First qualifying paid invoice must exceed minimum value.
- Eligible services can include haircut, color, spa, package, consultation, or clinic service.
- Referrer reward should usually be wallet credit or service discount.
- Friend reward should be a first-visit discount or package credit.

Fallback if API is not available:

- Daily export of clients, appointments, invoices, and payments.
- CSV mapping templates for ReSpark-like columns.
- Manual "mark invoice paid" option for first pilots.
- Reward export file that staff can apply in ReSpark until direct write-back exists.

### 14.4 Devourin-Style Restaurant Connector

Required objects:

- Customer/guest profile, if available.
- Mobile/email identity.
- Order created.
- Order source: dine-in, takeaway, delivery, digital menu, aggregator.
- Bill/invoice generated.
- Bill paid.
- Outlet/branch.
- Coupon/offer applied.
- Refund/void/cancel if available.
- Customer source and repeat-visit indicators if available.

Referral qualification for restaurants:

- Friend must be new or first qualifying order according to configured rule.
- Minimum bill amount should protect margin.
- Restaurant may need separate rules for dine-in, takeaway, delivery, direct digital menu, and aggregator orders.
- Referrer reward should usually be coupon or wallet credit for next order.
- Friend reward should usually be first-order discount with minimum spend.

Fallback if API is not available:

- Daily bill/customer export.
- CSV mapping templates for Devourin-like POS reports.
- Coupon-code reconciliation by export.
- Manual reward approval for first pilots.
- Integration through middleware if Devourin or restaurant operator already pushes reports to another system.

### 14.5 Universal Ingestion Contract

Every connector should normalize external data into the same internal contract:

| Internal Event | Required Minimum Fields |
| --- | --- |
| `customer.created` | External customer ID, name or display label, phone/email hash, created date |
| `appointment.booked` | External appointment/order ID, customer ID, location, booked date, service/order type |
| `appointment.completed` or `order.completed` | External appointment/order ID, customer ID, completion date |
| `invoice.created` | External invoice ID, customer ID, amount, currency, location, source |
| `invoice.paid` | External invoice ID, paid amount, payment date, payment status |
| `invoice.refunded` | External invoice ID, refund amount, refund date |
| `reward.redeemed` | External reward/coupon/wallet transaction ID, customer ID, value, redemption date |

Provider-specific fields should be preserved in raw payload storage, but the qualification engine should only depend on normalized fields.

### 14.6 Priority Integrations

| Integration Type | Purpose |
| --- | --- |
| Booking system | Detect booked/completed appointment |
| POS/invoice/payment | Detect paid invoice and refund |
| CRM/customer DB | Match customers and prevent duplicates |
| Wallet/coupon system | Issue and redeem rewards |
| WhatsApp Business Platform | Template messages after opt-in |
| SMS provider | Consent-based SMS |
| Email provider | Lower-cost notifications |
| Analytics | Campaign funnel and revenue tracking |

### 14.7 Integration Risk

If the product depends only on deep integrations from day one, it may move slowly. The first pilot version can use:

- Manual customer import.
- Referral invitation and referral form.
- Manual booking status update or CSV import.
- Manual invoice paid import.
- Reward ledger export.

But the commercial product must move toward direct API/webhook or partner connectors for the platforms that show traction.

### 14.8 Connector Roadmap

Recommended connector sequence:

1. Build the universal ingestion contract and field mapping engine.
2. Build CSV/import templates for salon and restaurant billing exports.
3. Build custom webhook endpoints for middleware tools.
4. Run pilots with ReSpark and Devourin users using export/import if partner APIs are not available yet.
5. Approach ReSpark and Devourin for partner access once pilot demand is proven.
6. Build native connectors only after the exact event and reward write-back capabilities are confirmed.
7. Publish a lightweight integration guide so other SaaS systems can connect without custom engineering each time.

---

## 15. Analytics And Reporting

### 15.1 Business Metrics

Primary:

- Referral-attributed revenue.
- Qualified referrals.
- Referral conversion rate.
- Reward cost.
- Referral CAC.
- Payback period.
- Referred customer repeat rate.

Secondary:

- Referral invitation rate after paid invoice.
- Referral form submission rate.
- Friend registration rate.
- Booking rate.
- Appointment completion rate.
- Payment qualification rate.
- Reward redemption rate.
- Fraud/rejection rate.

### 15.2 Funnel

Dashboard funnel:

1. Eligible customers.
2. Referral invitations sent.
3. Referral forms submitted.
4. Referred friends registered.
5. New customers registered.
6. Appointments booked.
7. Appointments completed.
8. Paid invoices.
9. Qualified referrals.
10. Rewards issued.

### 15.3 Owner-Friendly Interpretation

Instead of only charts, show plain business interpretation:

- "You spent INR 8,000 in rewards and generated INR 62,000 in first-visit revenue."
- "Your best referrer brought 6 paid customers."
- "Most referred friends drop before registration or booking. Improve the referral message, staff script, or booking flow."
- "Two referrals are held for duplicate phone/device signals."

---

## 16. Economics

### 16.1 Basic Formula

Referral program is profitable if:

`Gross margin from referred customer lifetime value > reward cost + messaging cost + platform cost + operational cost`

Simple first-visit view:

`First invoice amount x gross margin % - friend discount - referrer reward - message cost`

Example:

| Item | Amount |
| --- | ---: |
| First invoice | INR 1,000 |
| Gross margin | 45% |
| Gross profit | INR 450 |
| Friend reward | INR 100 discount |
| Referrer reward | INR 100 wallet credit |
| Remaining first-visit gross value | INR 250 before platform/messaging cost |

This can work if:

- The business has repeat visits.
- The reward is redeemed later, not paid out as cash.
- Fraud is controlled.
- The average invoice is high enough.

It may not work if:

- Ticket size is too low.
- Margin is low.
- Customers do not repeat.
- Discounts train customers to wait for offers.
- Rewards are issued before payment.

### 16.2 Recommended Reward Guardrails

For SMBs:

- Keep total reward cost under 10-20% of first qualifying invoice unless LTV is high.
- Use fixed reward first, not percentage.
- Set minimum invoice amount.
- Set expiry.
- Cap rewards per customer.
- Hold reward until payment is confirmed.
- Consider issuing referrer reward only after refund window.

### 16.3 Product Pricing

Possible SaaS pricing:

| Plan | Buyer | Price Idea | Included |
| --- | --- | --- | --- |
| Starter | Single-location SMB | Low monthly fee + referral volume cap | One campaign, referral form, dashboard, manual import |
| Growth | Active local business | Higher monthly fee | Automation, WhatsApp/SMS integrations, fraud dashboard, wallet/coupon export |
| Multi-location | Chains/franchises | Per-location pricing | Branch rules, staff audit, advanced analytics |
| Platform/API | POS/booking partners | Usage/API pricing | White-label/API access, webhooks, embedded widgets |

Avoid charging only a success fee at the beginning if attribution and payment events are not yet deeply integrated. Start with subscription plus optional usage/messaging charges.

---

## 17. Go-To-Market

### 17.1 Positioning

Do not position as:

- Generic referral software.
- Viral growth platform.
- Loyalty platform.
- Influencer platform.

Position as:

> Referral automation for service businesses where rewards unlock after real paid visits.

### 17.2 First Sales Message

For salon/spa owners:

> Your best customers already recommend you. This turns those recommendations into trackable bookings and rewards them only after their friend completes a paid visit.

For clinics/wellness:

> Let happy clients invite people they trust, while your team tracks every booking, payment, and reward without spreadsheets.

For agencies:

> Add a measurable referral channel for local service clients without building referral forms, reward rules, fraud checks, and reports each time.

### 17.3 Channels

Best early channels:

- Direct outreach to salons/spas/clinics.
- Partnerships with local marketing agencies.
- Partnerships with WhatsApp/SMS marketing providers.
- Integration partnerships with booking/POS tools.
- Founder-led demos.
- Case-study-led landing pages.

Do not start with broad paid ads until one vertical converts.

### 17.4 Pilot Plan

Run 10 manual pilots.

Pilot requirements:

- Each business has 500+ customers.
- Digital booking/payment or reliable invoice export.
- Owner agrees to promote program for 30 days.
- Reward economics are pre-approved.
- Baseline customer acquisition channels are known.

Pilot success criteria:

- At least 10% of eligible customers open or respond to the referral prompt.
- At least 5% of referral forms lead to friend registration or booking.
- At least 2-5 paid referred customers per active business in first month, depending on business size.
- Reward cost remains within agreed margin.
- Owner says they would pay without heavy hand-holding.

Pilot deliverables:

- Referral invitation message.
- Referral form.
- Optional QR/poster as a future enhancement preview.
- Weekly report.
- Reward ledger.
- Manual fraud review.
- Owner interview.

---

## 18. MVP Build Plan

### 18.1 MVP Must-Haves

| Area | Requirement |
| --- | --- |
| Campaign | Enable/disable, reward rules, min invoice, expiry, cap |
| Referral record | Referrer customer, prospect name, prospect mobile, optional email, pending status |
| Referral form | Customer submits one or more friends after invoice-paid prompt |
| Attribution | Match referred customer by mobile/email to pending referral record |
| Referral tracking | Full status lifecycle |
| Qualification | Paid invoice rule and first-customer rule |
| Rewards | Wallet/coupon ledger with pending/issued/expired/reversed |
| Notifications | Post-invoice referral invitation, friend registration/update, reward issued |
| Fraud | Duplicate, existing customer, self-referral, velocity |
| Dashboard | Funnel, revenue, rewards, top referrers |
| Admin tools | Search, manual approve/reject/reverse |
| Connector framework | Integration accounts, external object links, sync runs, field mappings |
| Plug-and-play onboarding | Select POS/billing system, upload sample data or connect API, map fields, test sync |
| ReSpark-style template | Salon client, appointment, service, staff, invoice, payment, reward fields |
| Devourin-style template | Restaurant customer, order, bill, outlet, source, coupon, payment fields |
| Exports | CSV for referrals/rewards |

### 18.2 MVP Nice-To-Haves

- QR posters.
- WhatsApp share message generator.
- Email/SMS fallback.
- Manual import for paid invoice.
- Basic Zapier/Make webhook.
- ReSpark partner connector if API/partner access is confirmed.
- Devourin partner connector if API/partner access is confirmed.
- POS-specific setup checklist and test data validator.
- Campaign terms builder.

### 18.3 Not In MVP

- Cash payouts.
- Influencer marketplace.
- Staff referral program.
- Multi-level referral.
- Advanced segmentation.
- AI recommendations.
- Complex loyalty tiers.
- Native mobile app.

### 18.4 Suggested Tech Stack

For a standalone SaaS:

- Frontend: Next.js or similar.
- Backend: Node.js/TypeScript.
- Database: Postgres.
- ORM: Prisma or Drizzle.
- Queue/worker: BullMQ, Temporal, Cloud Tasks, or equivalent.
- Cache/rate limiting: Redis.
- Auth: Auth.js/Clerk/Supabase Auth depending on speed and ownership preference.
- Payments: Stripe for global, Razorpay for India if India-first.
- Messaging: WhatsApp Business Platform provider, SMS provider, email provider.
- Hosting: Vercel/Fly/Render/AWS/GCP depending on team comfort.
- Analytics: PostHog, Segment, or internal event tables first.

Do not over-optimize infrastructure until pilots prove demand.

### 18.5 Build Order

1. Campaign and reward model.
2. Customer/referrer import.
3. Post-invoice referral invitation.
4. Referral form for friend name, mobile number, and optional email.
5. Referral record and status lifecycle.
6. Mobile/email matching for referred customer registration.
7. Referral event ledger.
8. Manual status update/import.
9. Paid invoice qualification worker.
10. Reward ledger.
11. Admin dashboard.
12. Customer referral portal.
13. Fraud flags.
14. Notifications.
15. Connector framework.
16. CSV/import templates for salon and restaurant billing systems.
17. ReSpark-style mapping template.
18. Devourin-style mapping template.
19. Exports.
20. Native integrations after partner/API access is confirmed.

---

## 19. Product Screens

### 19.1 Admin: Referral Program Settings

Menu path:

- `Settings -> Referral Program`.

Fields:

- Program enabled.
- Campaign name.
- Start/end date.
- Eligible branches.
- Eligible services.
- Referrer reward type: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- Referrer reward amount.
- Referred customer reward type: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- Referred customer reward amount.
- Minimum invoice amount.
- First visit only.
- First paid invoice only.
- Maximum reward per customer.
- Reward expiry days.
- Referral trigger: Order Completed, Appointment Completed, Invoice Paid.
- Recommended selected trigger: Invoice Paid.
- Referral invitation channels: WhatsApp Message, SMS, Email, App Notification.
- Review window.
- Terms and conditions.

Visible note:

- Cashback appears in the source PDF overview. Keep it as a disabled/roadmap option until payout rules are approved.

### 19.2 Admin: Integration Setup

This is required for plug-and-play adoption.

Setup flow:

1. Choose business type: salon/spa, restaurant, clinic, fitness, custom.
2. Choose billing/POS system: ReSpark, Devourin, custom API/webhook, CSV import, middleware.
3. Select connection mode: API, webhook, CSV, middleware, manual.
4. Upload sample export or connect credentials.
5. Map fields for customer, appointment/order, invoice, payment, refund, reward.
6. Run test sync.
7. Confirm sample referral qualification.
8. Go live.

Health checks:

- Last sync time.
- Last successful event.
- Failed records.
- Unmapped fields.
- Duplicate customer warnings.
- Reward write-back status.
- API/webhook credential expiry.

### 19.3 Admin: Referral Dashboard

Cards:

- Referred revenue.
- Qualified referrals.
- Rewards issued.
- Pending reward liability.
- Conversion rate.
- Top referrer.

Charts:

- Funnel.
- Revenue by month.
- Rewards issued vs redeemed.
- Branch performance.
- Campaign source/channel.

### 19.4 Admin: Referral List

Columns:

- Referral ID.
- Referrer.
- Friend.
- Status.
- Source.
- Booking date.
- Invoice amount.
- Reward amount.
- Fraud status.
- Created date.
- Qualified date.
- Rewarded date.

Actions:

- View detail.
- Approve.
- Reject.
- Hold.
- Reverse reward.

### 19.5 Customer: My Referrals

Content:

- Referral form access.
- Referral invitation history.
- Optional referral link/QR in roadmap version.
- Rewards earned.
- Pending referrals.
- Qualified referrals.
- Expiring rewards.

### 19.6 Friend Registration / Offer Confirmation

Content:

- Business identity.
- Offer.
- Disclosure.
- Signup, booking, or order step.
- Mobile/email match to pending referral.
- Consent/communication text where required.
- Terms.
- Book now / Order now CTA.

### 19.7 Automation Event Detail

Content:

- Event: `InvoicePaid`.
- Trigger service: `ReferralInvitationService`.
- Actions:
  - Find matching referral.
  - Validate qualification rules.
  - Update referral status.
  - Create reward records.
  - Credit wallet/discount.
  - Send notification.
  - Mark referral rewarded.

---

## 20. Risks And Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Market crowded | Many referral tools already exist | Narrow to appointment/service businesses and paid-visit qualification |
| Consent violations | Messaging non-consenting prospects can create legal and platform risk | Keep the PDF form flow, but require controlled messaging rules and consent before business-initiated promotional outreach |
| Weak owner adoption | Owners may not promote the program | Provide post-invoice referral prompt, staff script, simple form, and optional QR/poster later |
| Fraud | Rewards attract abuse | Ledger, duplicate checks, review holds, velocity caps, reversal |
| Integration complexity | Booking/POS systems vary | Start with manual/import pilots, then prioritize integrations by demand |
| Closed SaaS platforms | ReSpark, Devourin, or similar systems may not expose public APIs/webhooks | Build connector modes for API, partner access, CSV/export, middleware, and manual fallback |
| "Plug-and-play" overpromise | Buyers may expect instant one-click integration with every billing system | Market as "works with your billing system through supported connector modes" and show exact support level per provider |
| Reward economics fail | Discounts can eat margin | Minimum invoice, caps, expiry, wallet-first rewards |
| Staff confusion | Manual reward handling causes errors | Auto-apply where possible, simple staff status badge |
| Privacy concerns | Referral tracking uses personal data | Minimize data, hash matching fields, consent logs, deletion/export tools |
| Too broad product | Referral, loyalty, influencer, staff, affiliate can sprawl | Keep MVP to customer referrals and paid visit qualification |

---

## 21. Open Questions

These should be answered before implementation:

1. Which vertical is first: salons/spas, clinics, fitness, or another category?
2. India-first, US-first, or global from day one?
3. Is this a standalone SaaS or plugin/API for booking/POS systems?
4. What is the first reward system: internal wallet, coupon export, or partner wallet integration?
5. Will businesses already have customer/invoice data digitally?
6. Are businesses willing to show or send referral invitations after every paid invoice?
7. What average ticket and margin makes the default reward safe?
8. Which messaging channel matters most: WhatsApp, SMS, email, app notification?
9. Should the first pilots be manual concierge pilots before building full automation?
10. Is the long-term buyer SMB owner, agency, franchise, or SaaS platform partner?
11. Does ReSpark provide official API, webhook, partner, or export access for clients, appointments, invoices, and rewards?
12. Does Devourin provide official API, webhook, partner, or export access for customers, orders, bills, coupons, and payments?
13. If APIs are not available, what exact CSV/report exports can ReSpark and Devourin users download?
14. Can rewards be written back into those systems, or should the referral product generate coupon/wallet export files for staff to apply?
15. Which platform should be the first official connector: ReSpark, Devourin, or a more open POS/booking system?

---

## 22. My Product Recommendation

I would build this, but only with a strict wedge and a consent-first design.

The rough PRD should be evolved into:

> A referral attribution and reward automation product for appointment/service businesses where rewards are issued only after a verified first paid visit.

The first version should prove:

- Existing customers will submit friend referrals.
- Referred friends will register, book/order, and complete the first paid invoice.
- Businesses can see referred revenue.
- Reward cost is controlled.
- Fraud is manageable.
- Owners will pay for the system.

The product should not start as a broad referral, loyalty, influencer, staff, and cashback suite. That will become heavy before the core loop is proven.

The sharp product is:

> Referral form submitted -> friend registers -> friend books/orders -> invoice paid -> reward issued -> revenue dashboard.

The plug-and-play version is:

> Connect billing software -> invoice paid triggers referral invitation -> friend details submitted -> friend books/orders -> invoice paid -> reward issued or exported -> revenue dashboard.

If that works in one vertical, the product can expand into loyalty, branch campaigns, staff referrals, influencer programs, and partner APIs later. But those should be built on the same event ledger, attribution model, integration connector layer, and reward ledger from day one.

---

## 23. Research Sources

Market and product references:

- ReferralCandy: https://www.referralcandy.com/
- ReferralCandy pricing: https://www.referralcandy.com/pricing
- Friendbuy referral software: https://www.friendbuy.com/referral-program-software
- Friendbuy buyer guide: https://www.friendbuy.com/blog/a-buyers-guide-to-choosing-the-right-referral-marketing-software-platform
- Extole: https://www.extole.com/
- Extole platform: https://www.extole.com/platform/
- Mention Me referral FAQ: https://www.mention-me.com/en-us/referral-common-questions
- Referral Rock: https://referralrock.com/
- Referral Rock pricing: https://referralrock.com/pricing/professional/
- Viral Loops: https://viral-loops.com/
- Smile referrals: https://smile.io/referrals
- Yotpo referral program docs: https://support.yotpo.com/docs/referral-program-how-it-works
- Fresha client loyalty overview: https://www.fresha.com/help-center/knowledge-base/clients/563-client-loyalty-overview
- Fresha referral/loyalty local business content: https://www.fresha.com/for-business/fitness-and-recovery/loyalty-tools-every-fitness-and-recovery-studio-should-be-using
- Referrizer: https://business.referrizer.com/
- Vagaro referrer tracking: https://support.vagaro.com/hc/en-us/articles/360007585333-Add-the-Name-of-a-Customer-s-Referrer
- Zenoti referral reward program: https://help.zenoti.com/en/loyalty/other-tasks/configure-referral-reward-program.html
- Zenoti webstore referral program: https://help.zenoti.com/en/configuration/webstore-configurations/configure-referral-program.html
- Perkville: https://info.perkville.com/
- Square referral program help: https://squareup.com/help/us/en/article/5209-square-s-referral-program
- Square referral program terms: https://squareup.com/us/en/legal/general/referral-program
- Capillary loyalty software: https://www.capillarytech.com/products/loyalty-program-software/
- EasyRewardz loyalty: https://www.easyrewardz.com/loyalty/
- LoyaltyXpert: https://www.loyaltyxpert.com/
- ReSpark official site: https://respark.in/
- ReSpark SaaSworthy listing: https://www.saasworthy.com/product/respark
- Devourin official site: https://devourin.com/
- Devourin products page: https://devourin.com/products/
- Devourin Capterra listing: https://www.capterra.com/p/10029898/Devourin/

Trust and economics references:

- Nielsen Global Trust in Advertising 2015: https://www.nielsen.com/insights/2015/global-trust-in-advertising-2015/
- Nielsen 2021 Trust in Advertising context: https://www.nielsen.com/insights/2021/beyond-martech-building-trust-with-consumers-and-engaging-where-sentiment-is-high/
- McKinsey word-of-mouth marketing PDF: https://blog.op1c.com/wp-content/uploads/2010/05/201004mckinseynewwaytomeasurewordofmouth-100420123011-phpapp022.pdf
- Wharton referral programs and customer value: https://faculty.wharton.upenn.edu/wp-content/uploads/2013/05/Schmitt_Skiera_VandenBulte_2013_Referrral_Programs_2.pdf
- American Marketing Association referral summary: https://www.ama.org/2019/11/20/maximizing-the-benefits-of-customer-referrals/

Compliance and messaging references:

- Meta WhatsApp opt-in: https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in
- Meta WhatsApp template categorization: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-categorization
- Meta WhatsApp template fundamentals: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
- WhatsApp Business policy: https://whatsappbusiness.com/policy/
- TRAI advice to senders: https://trai.gov.in/advice-to-senders
- FTC Endorsement Guides FAQ: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- 16 CFR Part 255: https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255
