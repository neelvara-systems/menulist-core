# Google Stitch Prototype Brief - ReferFlow

> Use this document as the primary prompt/context for Google Stitch.
> Do not use the long product strategy document as the main input because it contains post-approval and technical detail that can cause the prototype to drift.
> Optional supporting document: `referflow-ceo-plan.md`.
> Do not share the PDF with Stitch if it only accepts `.md` or `.txt`.

---

## Main Stitch Prompt

Create an end-to-end high-fidelity clickable web app prototype for a product called **ReferFlow**.

ReferFlow is a plug-and-play referral program module for billing, POS, and appointment SaaS platforms. It helps businesses acquire new customers through existing customers. Rewards are issued only after the referred customer completes their first successful paid order or appointment.

Stay tightly aligned with this product idea:

- Existing customer completes an order or appointment.
- Invoice/bill is paid.
- System runs `ReferralInvitationService`.
- System sends or shows a referral invitation through WhatsApp Message, SMS, Email, and/or App Notification.
- Existing customer submits friend details through a referral form.
- Friend details include name, mobile number, and optional email.
- Referral record is created as Pending.
- Referral status can move to Contacted after the referral message/contact attempt.
- Referred friend registers using matching mobile/email.
- Friend books an appointment or places an order.
- Appointment/order is completed.
- Invoice/bill is paid.
- System validates qualification rules.
- Rewards are issued to referrer and referred customer.
- Customer portal and admin dashboard update.

Do not redesign this into a generic referral-link product. Referral links, QR, influencer referrals, staff referrals, tiers, and branch campaigns are roadmap items, not v1. Cashback should appear only as a disabled/roadmap reward option because the source PDF mentions it in the overview, but the v1 demo should use wallet credit.

Mandatory PDF alignment:

- Admin path must be shown as `Settings -> Referral Program`.
- Trigger options must be visible: `Order Completed`, `Appointment Completed`, `Invoice Paid`.
- Recommended selected trigger: `Invoice Paid`.
- Delivery channels must be visible: WhatsApp Message, SMS, Email, App Notification.
- Lifecycle must be visible: `Pending -> Contacted -> Registered -> Appointment Booked -> Appointment Completed -> Invoice Paid -> Qualified -> Rewarded`.
- Rejected states must be visible: `Pending -> Duplicate -> Invalid -> Cancelled`.
- Reward type dropdowns must show: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points.

## Prototype Goal

Generate a CEO-demo-ready prototype, not a technical admin tool. The prototype should let a CEO understand the full product in 3-5 minutes.

The experience should feel like a modern SaaS module that can be embedded into platforms such as:

- ReSpark-style salon/spa billing and appointment software.
- Devourin-style restaurant billing/POS software.

The prototype should show both vertical examples, but the core product should be one shared ReferFlow product.

## Responsive Prototype Requirement

The prototype must work cleanly on desktop, tablet, and mobile devices. Build one responsive product experience, not separate unrelated layouts.

Required responsive breakpoints:

- Desktop: 1280px to 1440px wide.
- Tablet: 768px to 1024px wide.
- Mobile: 360px to 430px wide.

Desktop behavior:

- Use a left sidebar navigation and top bar.
- Dashboards can use multi-column cards.
- Tables can stay as tables, with clear filters and export actions.

Tablet behavior:

- Keep navigation compact or collapsible.
- Use two-column dashboard cards where space allows.
- Tables should remain readable; avoid horizontal overflow.
- Forms should use fewer columns and larger touch targets.

Mobile behavior:

- Collapse sidebar into a top menu or bottom navigation.
- Use single-column layout.
- Convert wide tables into stacked cards or compact list rows.
- Keep all primary actions visible and thumb-friendly.
- Referral form must be easy to complete on mobile.
- Status lifecycle should render as a vertical stepper.
- No text overlap, clipped buttons, or horizontal scrolling.

Every required screen must be usable at all three sizes:

- Owner Onboarding
- Admin Dashboard
- Referral Program Settings
- Referral Invitation
- Referral Form
- Referral Submitted Confirmation
- Admin Referral Record
- New Customer Journey Tracker
- Reward Distribution
- My Referrals
- Fraud Checks
- Referral Report
- Integrations / Plug-And-Play

## Visual Style

Design style:

- Modern B2B SaaS.
- Clean, professional, polished.
- Light theme.
- Calm colors: deep teal/navy for headers, green for successful rewards, amber for pending/warning states, light neutral backgrounds.
- Dense enough for business users, but not cluttered.
- Rounded corners should be modest, not playful.
- Use realistic tables, status badges, cards, forms, and dashboards.
- Avoid cartoon illustrations, marketing hero pages, and decorative blobs.

Suggested tone:

- Trustworthy.
- Operational.
- Business-value focused.
- Simple enough for non-technical SMB owners.

## Required Navigation

Create a sidebar navigation with:

1. Onboarding
2. Dashboard
3. Referral Program Settings
4. Referral Form
5. Referrals
6. Rewards
7. Fraud Checks
8. Reports
9. Integrations

Add a top bar with:

- Business selector: `Glow Salon`
- Platform badge: `Connected to ReSpark`
- Secondary switch/example: `Switch to Devourin Restaurant Demo`
- User profile: `Admin`

## Required Screens

### Screen 1 - Owner Onboarding / Setup Wizard

Purpose: show how a salon or restaurant owner gets started.

Create a simple setup wizard with 5 steps:

1. Choose business type
2. Connect billing/POS software
3. Set referral rewards
4. Select referral trigger
5. Turn referral program ON

Show selected values:

- Business Type: Salon / Spa
- Billing Software: ReSpark
- Connection Mode: Connected
- Referrer Reward: INR 100 wallet credit
- Referred Customer Reward: INR 100 wallet credit
- Minimum Invoice: INR 500
- Reward Expiry: 30 days
- Trigger: Invoice Paid
- Trigger Options: Order Completed, Appointment Completed, Invoice Paid
- Referral Channels: WhatsApp Message, SMS, Email, App Notification

Include buttons:

- Continue
- Launch Referral Program

Show a success state:

`ReferFlow is live. ReferralInvitationService will start after paid invoices.`

Also show a secondary card:

`Restaurant demo available: switch to Devourin restaurant workflow.`

### Screen 2 - Admin Dashboard

Purpose: show business value.

Include summary cards:

- Total Referrals: 120
- Qualified Referrals: 38
- Conversion Rate: 31.6%
- Total Rewards Issued: INR 7,600
- Revenue Generated: INR 92,000
- Top Referrers: 5

Include a simple funnel:

Pending -> Contacted -> Registered -> Booked/Ordered -> Completed -> Invoice Paid -> Qualified -> Rewarded

Include a small list of top referrers:

- Priya Shah - 8 qualified referrals - INR 800 earned
- Neha Kapoor - 5 qualified referrals - INR 500 earned
- Aman Mehta - 4 qualified referrals - INR 400 earned

### Screen 3 - Referral Program Settings

Purpose: show admin control from the PDF.

Show page path/breadcrumb:

`Settings -> Referral Program`

Fields:

- Enable Referral Program: Yes/No toggle
- Program Name: Glow Referral Program
- Referrer Reward Type dropdown: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points
- Referrer Reward Amount: INR 100
- Referred Customer Reward Type dropdown: Wallet Credit, Fixed Discount, Percentage Discount, Loyalty Points
- Referred Customer Reward Amount: INR 100
- Minimum Invoice Amount: INR 500
- First Visit Only: Yes
- First Paid Invoice Only: Yes
- Maximum Reward Per Customer: 10
- Reward Expiry Days: 30
- Referral Trigger dropdown: Order Completed, Appointment Completed, Invoice Paid
- Selected Referral Trigger: Invoice Paid
- Referral Delivery Channels: WhatsApp Message, SMS, Email, App Notification
- Cashback: Roadmap / disabled until payout rules are approved

Show Save Settings button.

Show helper note:

`Recommended trigger: Invoice Paid. Rewards are issued only after real payment is completed.`

### Screen 4 - Post-Invoice Referral Invitation

Purpose: show the trigger moment after payment.

Show automation label:

`Trigger Event: ReferralInvitationService`

Show delivery channel chips:

- WhatsApp Message
- SMS
- Email
- App Notification

Create a preview panel that looks like a customer-facing message after invoice payment.

Salon example:

`Your invoice is paid. Refer your friends and earn INR 100 wallet credit when they complete their first appointment.`

Buttons:

- Refer Now
- Maybe Later

Restaurant example:

`Your bill is paid. Refer your friends and earn INR 100 wallet credit when they place their first paid order.`

### Screen 5 - Referral Form

Purpose: core PDF customer flow.

Create a customer-facing form titled:

`Refer Your Friends`

Subtitle:

`Add your friends below. You earn INR 100 wallet credit when they complete their first paid appointment.`

Fields:

- Friend Name
- Mobile Number
- Email Optional

Support multiple friend rows:

| Friend Name | Mobile Number | Email |
| --- | --- | --- |
| Amit Sharma | 9876543210 | amit@example.com |
| Rahul Jain | 9876543211 | empty |

Buttons:

- Add Another Friend
- Submit Referrals

After submit, show confirmation:

`2 referrals submitted successfully. Status: Pending.`

### Screen 6 - Referral Submitted Confirmation

Purpose: show customer confidence.

Show cards:

- Amit Sharma - Pending
- Rahul Jain - Pending

Show explanation:

`Rewards unlock only after your friend completes their first paid appointment or order.`

### Screen 7 - Admin Referral Record

Purpose: show operational tracking.

Create a table with:

- Referral ID
- Referrer Name
- Referrer Mobile
- Prospect Name
- Prospect Mobile
- Prospect Email
- Current Status
- Created Date

Sample rows:

- REF-1001 | Priya Shah | 9876500001 | Amit Sharma | 9876543210 | amit@example.com | Pending | Jun 23, 2026
- REF-1002 | Priya Shah | 9876500001 | Rahul Jain | 9876543211 | - | Contacted | Jun 23, 2026
- REF-1003 | Neha Kapoor | 9876500002 | Karan Mehta | 9876543212 | - | Rewarded | Jun 21, 2026

Use status badges.

### Screen 8 - New Customer Journey Tracker

Purpose: show lifecycle clearly.

Show one referral detail page for Amit Sharma.

Lifecycle:

- Pending - Done
- Contacted - Done
- Registered - Done
- Appointment Booked / Order Placed - Done
- Appointment Completed / Order Completed - Done
- Invoice Paid - Done
- Qualified - Done
- Rewarded - Pending or Done

Also show rejected-state path:

Pending -> Duplicate -> Invalid -> Cancelled

Show qualification panel:

- First Visit Only: Passed
- First Paid Invoice Only: Passed
- Minimum Invoice Amount INR 500: Passed, invoice INR 900
- Duplicate Mobile Check: Passed
- Existing Customer Check: Passed
- Self Referral Check: Passed

### Screen 9 - Reward Distribution

Purpose: show reward moment.

Title:

`Referral Qualified`

Show:

- Referrer: Priya Shah
- Reward: INR 100 Wallet Credit
- Referred Customer: Amit Sharma
- Reward: INR 100 Wallet Credit
- Invoice Amount: INR 900
- Status: Rewarded
- Reward Expiry: 30 days

Show a green success state:

`Rewards issued after successful paid invoice.`

### Screen 10 - Customer Portal: My Referrals

Purpose: customer self-service.

Show:

- Total Referrals: 3
- Pending Referrals: 1
- Qualified Referrals: 1
- Rewards Earned: INR 200
- Wallet Earned: INR 200

Referral list:

| Name | Status | Reward |
| --- | --- | --- |
| Amit Sharma | Pending | - |
| Rahul Jain | Qualified | INR 100 |
| Karan Mehta | Rewarded | INR 100 |

Use simple customer-friendly statuses:

- Waiting for friend
- Friend registered
- Reward pending
- Reward earned

### Screen 11 - Fraud Checks

Purpose: show business protection.

Show fraud rule cards:

- Duplicate Mobile - Enabled
- Existing Customer Check - Enabled
- Self Referral Check - Enabled
- One Customer Referred Once - Enabled
- First Referral Wins - Enabled
- Invalid Referral State - Enabled
- Cancelled Referral State - Enabled

Show sample fraud queue:

| Referral | Issue | Action |
| --- | --- | --- |
| REF-1010 | Duplicate mobile already exists | Rejected |
| REF-1011 | Referrer mobile matches prospect mobile | Invalid |
| REF-1012 | Same prospect submitted twice | First referral wins |
| REF-1013 | Appointment cancelled before invoice payment | Cancelled |

### Screen 12 - Referral Report

Purpose: operational reporting.

Filters:

- Date Range
- Status
- Referrer
- Reward Status

Columns:

- Referral ID
- Referrer Name
- Referrer Mobile
- Referred Name
- Referred Mobile
- Current Status
- Reward Amount
- Created Date
- Qualified Date
- Rewarded Date

Add Export Report button.

### Screen 13 - Integrations / Plug-And-Play

Purpose: show this can work with billing/POS SaaS platforms.

Show two integration cards:

Card 1:

- Platform: ReSpark
- Business Type: Salon / Spa
- Connected Status: Connected
- Trigger: Appointment Completed + Invoice Paid
- Reward Writeback: Wallet Credit / Discount

Card 2:

- Platform: Devourin
- Business Type: Restaurant
- Connected Status: Demo Mode
- Trigger: Order Completed + Bill Paid
- Reward Writeback: Coupon / Wallet Credit

Also show:

`This module does not replace billing software. It plugs into the billing/POS system and uses invoice payment as the referral qualification trigger.`

## Required Clickable Flow

Make the prototype navigable in this order:

1. Owner Onboarding / Setup Wizard
2. Dashboard
3. Settings
4. Post-Invoice Referral Invitation
5. Referral Form
6. Referral Submitted Confirmation
7. Admin Referral Record
8. New Customer Journey Tracker
9. Reward Distribution
10. My Referrals
11. Fraud Checks
12. Reports
13. Integrations

If clickable interactions are possible, make these work:

- Save Settings
- Launch Referral Program
- Refer Now
- Add Another Friend
- Submit Referrals
- View Referral Details
- Issue Rewards
- Export Report
- Switch to Devourin Restaurant Demo

## Data And Copy Rules

Use INR amounts.

Use these sample values:

- Referrer reward: INR 100 wallet credit
- Referred customer reward: INR 100 wallet credit
- Minimum invoice: INR 500
- Reward expiry: 30 days
- Salon invoice example: INR 900
- Restaurant order example: INR 650

Use plain wording:

- Referrer
- Referred Customer
- Qualified Referral
- Invoice Paid
- Rewarded
- Pending
- Contacted
- Duplicate
- Invalid
- Cancelled
- Existing Customer
- Self Referral

Do not use developer terms like API, webhook, schema, database, idempotency, ledger, OAuth, or event bus in the main UI. The CEO prototype should feel business-facing.

## Strict Scope Guardrails

Do not include:

- Influencer referral program
- Staff referral program
- Tier rewards
- Branch-specific campaigns
- Membership referral rewards
- Package referral rewards
- Cashback payouts
- Complex QR referral flows
- Advanced referral links as the primary flow
- Public leaderboard
- Full loyalty platform
- Marketing landing page

## Most Important Alignment Rule

The prototype must communicate this exact product:

`Paid customer refers friend through a form -> friend completes first paid order/appointment -> invoice is paid -> rewards are issued -> admin sees revenue and reward cost.`

If any screen drifts away from this flow, revise it back to the PDF-aligned referral module.

## Optional Refinement Prompt After First Stitch Output

After Stitch generates the first version, paste this refinement:

Refine the prototype to stay closer to the PDF referral flow. Make the referral form the core customer action. Show `Settings -> Referral Program`, `ReferralInvitationService`, trigger options Order Completed / Appointment Completed / Invoice Paid, delivery channels WhatsApp Message / SMS / Email / App Notification, the full lifecycle Pending -> Contacted -> Registered -> Appointment Booked -> Appointment Completed -> Invoice Paid -> Qualified -> Rewarded, and rejected states Duplicate / Invalid / Cancelled. Keep referral links, QR, influencer referrals, staff referrals, tiers, cashback payouts, and advanced loyalty out of active v1. Ensure every screen reinforces that rewards are issued only after the referred customer completes the first paid order or appointment and invoice/bill is paid. Make the UI feel like a plug-and-play module inside ReSpark-style salon software and Devourin-style restaurant billing software.
