# ReferFlow CEO Product Approval Plan

> Share this as optional supporting context for Google Stitch when PDF upload is not supported.  
> Primary Stitch input should remain: `referflow-google-stitch-prototype-brief.md`.

## 1. CEO Summary

ReferFlow is a plug-and-play referral program module for billing, POS, and appointment SaaS platforms.

It helps businesses convert happy paid customers into new paid customers. The product stays aligned with the original Referral Program Module PRD:

1. Existing customer completes an order or appointment.
2. Invoice or bill is paid.
3. `ReferralInvitationService` sends or shows the referral invitation.
4. Existing customer submits friend details through a referral form.
5. Referred customer registers, books/orders, completes first transaction, and pays.
6. System validates qualification rules.
7. Rewards are issued only after the first successful paid invoice.

This product is not a new POS system, appointment system, CRM campaign tool, influencer platform, or broad loyalty product.

## 2. PDF Alignment Contract

The prototype must preserve these source-PDF requirements:

- Admin menu: `Settings -> Referral Program`.
- Trigger service/event: `ReferralInvitationService`.
- Trigger options: `Order Completed`, `Appointment Completed`, `Invoice Paid`.
- Recommended selected trigger: `Invoice Paid`.
- Referral delivery channels: WhatsApp Message, SMS, Email, App Notification.
- Referral form fields: Friend Name, Mobile Number, Email Optional.
- Referral form must support multiple referrals.
- Visible lifecycle: `Pending -> Contacted -> Registered -> Appointment Booked -> Appointment Completed -> Invoice Paid -> Qualified -> Rewarded`.
- Rejected states: `Pending -> Duplicate -> Invalid -> Cancelled`.
- Qualification rules: Minimum Invoice Amount, First Visit Only, First Paid Invoice Only, Maximum Reward Per Customer, Reward Expiry Days.
- Reward type options: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- Cashback appears in the source PDF overview, but should be shown only as disabled/roadmap until payout, tax, fraud, and reconciliation rules are approved.

## 3. Product Flow

| Step | Actor | What Happens | Output |
| --- | --- | --- | --- |
| 1 | Existing customer | Completes order or appointment and pays invoice/bill | Eligible for referral invitation |
| 2 | System | Runs `ReferralInvitationService` | Referral invitation prepared |
| 3 | System | Sends/shows invitation through WhatsApp, SMS, Email, or App Notification | Contact channel visible |
| 4 | Customer | Submits friend name, mobile number, optional email | Referral status: Pending |
| 5 | System | Creates referral record with referrer and prospect details | Admin referral record visible |
| 6 | System | Marks contacted after allowed message/contact attempt | Status: Contacted |
| 7 | Referred customer | Registers using matching mobile/email | Status: Registered |
| 8 | Referred customer | Books appointment or places order | Status: Appointment Booked / Order Placed |
| 9 | Referred customer | Completes appointment/order and pays invoice | Status: Invoice Paid |
| 10 | System | Checks first visit, first paid invoice, minimum invoice, fraud rules | Status: Qualified or rejected |
| 11 | System | Issues configured rewards and updates reports | Status: Rewarded |

## 4. Owner Onboarding And Usage

ReferFlow should feel like a plug-in referral module inside the software the owner already uses.

Owner onboarding:

1. Owner opens ReferFlow or enables it inside partner SaaS.
2. Owner selects business type: Salon/Spa, Restaurant, Clinic, Other.
3. Owner selects billing/POS software: ReSpark, Devourin, custom API/webhook, CSV import, or manual mode.
4. Owner configures rewards, qualification rules, trigger, and channels.
5. Owner turns referral program ON.
6. Owner monitors dashboard, referral records, fraud checks, reward distribution, and reports.

## 5. Admin Settings

Prototype screen path:

`Settings -> Referral Program`

Required fields:

- Enable Referral Program: Yes/No.
- Referrer Reward Type: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- Referrer Reward Amount: INR 100.
- Referred Customer Reward Type: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.
- Referred Customer Reward Amount: INR 100.
- Minimum Invoice Amount: INR 500.
- First Visit Only: Yes.
- First Paid Invoice Only: Yes.
- Maximum Reward Per Customer: 10.
- Reward Expiry Days: 30.
- Referral Trigger: Order Completed, Appointment Completed, Invoice Paid.
- Selected Trigger: Invoice Paid.
- Delivery Channels: WhatsApp Message, SMS, Email, App Notification.

## 6. Prototype Screens

The CEO prototype should include these 13 screens:

| # | Screen | Must Show |
| --- | --- | --- |
| 1 | Owner Onboarding / Setup Wizard | Business type, billing/POS connection, reward setup, trigger options, launch program |
| 2 | Admin Dashboard | Total referrals, qualified referrals, conversion rate, rewards issued, revenue generated, top referrers |
| 3 | Referral Program Settings | `Settings -> Referral Program`, reward dropdowns, trigger dropdown, channels, qualification rules |
| 4 | Referral Invitation | `ReferralInvitationService`, WhatsApp/SMS/Email/App Notification, post-payment message |
| 5 | Referral Form | Friend name, mobile number, optional email, add another friend, submit referrals |
| 6 | Referral Submitted Confirmation | 2 referrals submitted successfully; status Pending |
| 7 | Admin Referral Record | Referral ID, referrer, prospect name/mobile/email, status, created date |
| 8 | New Customer Journey Tracker | Pending, Contacted, Registered, Appointment Booked/Order Placed, Completed, Invoice Paid, Qualified, Rewarded |
| 9 | Reward Distribution | INR 100 wallet credit to referrer and referred customer; status Rewarded |
| 10 | My Referrals | Total referrals, pending, qualified, rewarded, wallet earned, referral list |
| 11 | Fraud Checks | Duplicate mobile, existing customer, self-referral, one customer referred once, first referral wins, Invalid/Cancelled |
| 12 | Referral Report | Referral ID, referrer/referred details, status, reward amount, created/qualified/rewarded dates, export |
| 13 | Integrations / Plug-And-Play | ReSpark salon and Devourin restaurant cards; invoice/bill paid qualification |

## 7. Responsive Prototype Requirement

The prototype must work on desktop, tablet, and mobile devices.

Desktop:

- 1280px to 1440px wide.
- Sidebar navigation and top bar.
- Multi-column dashboard cards.
- Tables can remain tables.

Tablet:

- 768px to 1024px wide.
- Compact or collapsible navigation.
- Two-column dashboard cards where possible.
- Tables must stay readable without horizontal overflow.

Mobile:

- 360px to 430px wide.
- Single-column layout.
- Sidebar collapses into top menu or bottom navigation.
- Wide tables become stacked cards or compact list rows.
- Referral form is easy to complete on mobile.
- Lifecycle appears as a vertical stepper.
- Buttons are large and thumb-friendly.
- No text overlap, clipped buttons, or horizontal scrolling.

## 8. Plug-And-Play Examples

ReSpark-style salon flow:

1. Customer visits salon.
2. Appointment is completed.
3. Invoice is paid.
4. `ReferralInvitationService` sends referral invitation.
5. Customer submits Amit's details.
6. Amit registers and books appointment.
7. Amit completes first appointment.
8. Amit pays invoice.
9. Both receive wallet credit.

Devourin-style restaurant flow:

1. Customer places order.
2. Order is completed.
3. Bill is paid.
4. Referral invitation is sent.
5. Customer submits Rahul's details.
6. Rahul places first order.
7. Rahul pays bill.
8. Both receive wallet credit or discount.

## 9. Scope Guardrails

Do not include these as active v1 features:

- Referral links as the primary flow.
- QR code referrals.
- Influencer referral program.
- Staff referral program.
- Tier rewards.
- Branch-specific campaigns.
- Membership referral rewards.
- Package referral rewards.
- Cashback payouts.
- Public leaderboard.
- Full loyalty platform.

These can appear only as roadmap/future enhancements.

## 10. Final Product Sentence

Paid customer refers friend through a form -> friend completes first paid order/appointment -> invoice is paid -> rewards are issued -> admin sees revenue and reward cost.
