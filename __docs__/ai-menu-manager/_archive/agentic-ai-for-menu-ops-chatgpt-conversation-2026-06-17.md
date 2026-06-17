# Agentic AI for Menu Ops - ChatGPT Conversation Capture

> Raw source capture only. This file has not been validated against MenuList codebase truth and is not an accepted feature spec.

## Capture Metadata

- Source tab title: Agentic AI for Menu Ops
- Source URL: https://chatgpt.com/c/6a319a1d-4160-83ee-ba15-f695ab718e8c
- Captured at: 2026-06-17T09:23:51.918Z
- Message count: 32
- Expected active-thread message count from scroll scan: 32
- Missing message IDs: None
- Capture method: Chrome tab DOM extraction with scroll-band de-duplication by ChatGPT message ID.
- Intended follow-up: Review this source material before creating any AI Menu Manager docs or implementation.

## Conversation Messages

### Message 1 - Assistant

- Message ID: f86bbb6c-de6f-4a6d-a626-3f63180d0b3f
- Captured from scroll band: target-0

```
Here’s a fast, practical way to use agent‑style AI (beyond chat) to automate owner support, menu upkeep, and lead follow‑ups—without going “full autonomy.”

Pilot: Monitor → Propose → Human‑approve

Goal: catch changes, draft the right response/action, you approve, agent executes.
Surfaces: Google Business Profile (GBP), your public menu URLs, socials/DMs, inbound forms/WhatsApp, and Answerlattice.

1) Monitoring (read-only, cheap)

GBP watch: poll business info, hours, menu links, posts, reviews.

Menu drift watch: crawl your official MenuList URL(s) + known third‑party menus (Swiggy/Zomato/site PDFs) for mismatches (items/prices/availability).

Inbox watcher: tags inbound messages (email/WhatsApp/IG DM/form) as: “menu update,” “hours issue,” “offer request,” “owner support,” “lead.”

Offer/calendar watch: looks for expiring promos, festivals, local events to propose timely kits.

2) Proposals (no write ops yet)

Owner support replies: drafts a correct, approved answer from Answerlattice; shows cost estimate (tokens) and risk label.

Menu sync card: “Detected ₹20 price difference for ‘Paneer Tikka’ on Zomato vs MenuList; suggest: update Zomato to ₹199, keep MenuList as source of truth.”

GBP fix kit: suggests post (“We’re open late this Friday…”) or hours patch; shows preview.

Offer kit: one‑click bundle (story + post + WhatsApp text + screen slide) localized per outlet.

Verified menu import: for sites with clean structure, prepares a diff + mapping (category→items→prices) ready for import.

3) Human approve (one tap)

Approve/edit/decline each card.

Guardrails: write scopes (GBP, MenuList, social caption, reply‑to‑review) are gated; every write is logged with before/after and rollback.

4) Execute + Log

Atomic writes: apply only the approved mutations (e.g., update MenuList item, schedule a GBP post, send reply, open a ticket).

Receipts: link to the changed resource, store diff JSON, cost, and who approved.

What this automates for you (MenuList + Answerlattice stack)

Owner Support

Draft → approve replies for FAQs, outages, “how do I change X,” etc.

Escalate to ticket if confidence < threshold or policy block.

Menu Upkeep

Detect drifts across public surfaces.

Prepare verified import diffs from URLs or PDFs; you approve the mapping, agent imports.

Lead Follow‑ups

Auto‑qualify inbound leads (industry, outlets, current menu state).

Propose a 3‑touch sequence (intro → proof → offer) with channel mix (email/WhatsApp/IG DM).

After approval, schedules/sends and tracks replies.

Multi‑outlet Local Kits

Per‑outlet price/name localization applied automatically to each asset before you post.

Minimal tech to ship this week (cost‑aware)

Events bus: append‑only “observations” (cheap JSON in Storage) + a daily summary doc in Firestore.

Policy layer: Answerlattice “approved answers” + rules (what the agent may edit, where).

Confidence + cost bands: show model confidence and max token cost before you approve.

UI: one “Agent Inbox” with cards: Observation ▸ Proposal ▸ Approve ▸ Executed.

Rollbacks: keep pre/post snapshots for every write.

Starter SOPs (copy/paste)

GBP: “Agent may only update hours ±2h, post once/week, and reply to reviews with pre‑approved tone; anything else = draft only.”

Menu: “MenuList is source of truth. External sites must be synced to MenuList, not the other way around, unless flagged as ‘Owner override’.”

Leads: “No more than 3 touches in 10 days; stop on reply; never send outside business hours of the lead’s timezone.”

Success metrics (7‑day pilot)

TTR (time‑to‑response) owner support: ↓ 60–80%.

Menu drift MTTR: from days → <24h.

Lead follow‑up rate: ≥ 95% of new leads touched within 24h.

Human edits on drafts: < 20% after day 5 (shows learning).

Firestore reads/write per task: capped; show per‑task cost receipt.

Where to start (your next 3 cards)

GBP: Hours mismatch → draft patch + post; you approve.

Menu drift: 3 items on a third‑party site → prepare verified import; you approve.

Lead: “Need digital menu” → propose 3‑touch multi‑channel follow‑up; you approve.

If you want, I’ll generate the exact Agent Inbox card specs (fields, API calls, and Firestore/Storage shapes) so your dev agent can wire it immediately.
```

### Message 2 - User

- Message ID: 0cad6db2-6a9d-4a86-9be3-8a73d2e2496b
- Captured from scroll band: target-3000

```
This is interesting and something new 
Lets go deeper in smb owners tool pov 
First will focus on menulist only 
So tell me
```

### Message 3 - Assistant

- Message ID: 250f9827-ebca-4a54-9078-16e9b717123e
- Model: gpt-5-5-pro
- Captured from scroll band: target-3000

```
I’ll focus only on MenuList as an SMB owner tool: a practical menu operations assistant that saves time, prevents mistakes, and can help increase orders.
```

### Message 4 - Assistant

- Message ID: 61329afe-a7e8-4b03-b6e2-80e60f3d1815
- Model: gpt-5-5-pro
- Captured from scroll band: target-3000

```
For MenuList only, the strongest SMB owner tool is:

MenuList AI Owner Assistant

A menu operations tool that helps the owner create, update, improve, publish, and monitor their digital menu with minimal effort.

Not a chatbot first.
It should feel like:

“I tell MenuList what changed. It understands, prepares the update, shows preview, and I approve.”

1. Core SMB owner problem

Restaurant/cafe owners do not usually want “AI.” They want these problems solved:

“My menu is always outdated.”
Prices change, items go out of stock, new specials come in, but QR/menu pages remain old.

“I do not have time to edit everything manually.”
Small owners are busy with staff, kitchen, suppliers, customers.

“My menu does not look professional.”
Missing photos, weak descriptions, bad category order, inconsistent item names.

“Customers keep asking basic questions.”
Veg/non-veg, spicy, available today, half/full, combos, timing, takeaway, etc.

“I want to push today’s special quickly.”
They need simple promotional updates without designing posters or rewriting text.

So MenuList should become the menu control room for SMB food businesses.

2. The main product idea
MenuList should have an “Agent Inbox”

Every useful AI action appears as a simple card:

Detected / Suggested / Needs approval

Example cards:

Card 1: Price Update

Owner said: “Increase Paneer Tikka to 199.”
AI proposes: Paneer Tikka price: ₹179 → ₹199
Impact: Menu page, QR menu, public link
Buttons: Approve / Edit / Cancel

Card 2: Missing Photos

AI found: 12 popular items have no photo.
Suggested action: Add stock placeholder, request staff photo, or mark as “photo pending.”
Buttons: Fix now / Remind later

Card 3: Better Description

Current: “Chicken Burger”
Suggested: “Grilled chicken patty with fresh lettuce, cheese, and house sauce.”
Buttons: Use this / Make shorter / Ignore

Card 4: Availability

Owner said: “Momos not available today.”
AI proposes: Hide Veg Momos and Chicken Momos until tomorrow 11 AM.
Buttons: Approve / Change time

This is important: the agent should not silently change important things. It should prepare, preview, and let owner approve.

3. Best first features for MenuList
Feature 1: Menu Import Agent

This is probably the strongest first AI feature.

Owner uploads:

Photo of printed menu

PDF menu

Excel sheet

Old website menu

Zomato/Swiggy-style screenshot

WhatsApp menu text

AI converts it into a proper MenuList structure:

Categories
  Starters
    Paneer Tikka - ₹199
    Chicken Lollipop - ₹249

  Main Course
    Butter Chicken Half - ₹299
    Butter Chicken Full - ₹499

  Beverages
    Fresh Lime Soda - ₹89

Then it asks owner to approve.

The agent should flag uncertain things:

Need confirmation:
- Is “Spl Thali 149/199” two variants?
- Is “Paneer Roll 99” veg?
- Does “Half/Full” apply to all chicken curries or only selected items?

This saves the owner a lot of setup time.

Feature 2: Quick Update Agent

The owner should not need to open five screens to update the menu.

They should type or speak:

Make masala dosa 99 from today.
Hide cold coffee for 2 days.
Add today special: Rajma Chawal 129.
Change all momos prices by 10 rupees.
Mark pav bhaji available only after 4 PM.

MenuList AI should convert that into a safe update proposal.

Important: for bulk edits, always show preview:

You are changing 6 items:

Veg Momos ₹80 → ₹90
Paneer Momos ₹100 → ₹110
Chicken Momos ₹120 → ₹130

Approve?

This is very useful for SMB owners because it matches how they naturally think.

Feature 3: Menu Health Score

MenuList should give every owner a simple score:

Menu Health: 72/100

With practical fixes:

Improve these:
- 18 items have no photos
- 9 items have no description
- 4 items have duplicate names
- 3 items may have wrong category
- 6 items do not have veg/non-veg labels
- 2 items have price missing

This becomes a daily/weekly habit.

The owner does not need analytics jargon. Just say:

“Fix these 5 things to make your menu look more complete.”

Feature 4: Smart Item Descriptions

Many SMB menus have item names only:

Paneer Roll
Veg Sandwich
Special Pizza
Chicken Curry

AI can generate clean descriptions.

But guardrail: AI should not invent ingredients unless owner confirms.

Better flow:

Item: Paneer Roll

AI asks:
What is inside?
[Paneer] [Onion] [Capsicum] [Cheese] [Sauce] [Other]

Then creates:
Soft roll filled with paneer, onion, capsicum, and house sauce.

This avoids wrong claims.

Feature 5: Photo Helper

Photos are a huge pain for small restaurants.

MenuList can help in three ways:

A. Missing photo tracker
You still need photos for:
- Paneer Tikka
- Veg Biryani
- Cold Coffee
B. Staff upload link

Owner sends a link to staff:

Take photo → upload → AI matches photo to menu item → owner approves.
C. Photo quality check

AI can say:

This photo is dark.
This photo has multiple dishes; choose item.
This photo looks good for menu.

Do not start with advanced image generation. Start with organizing and improving real menu photos.

4. Daily owner experience

The product should feel like this:

Morning

Owner opens MenuList.

Today’s menu tasks:
- 2 items marked unavailable yesterday. Make available again?
- Weekend special expired. Remove or extend?
- 7 items need photos.

Buttons:

Restore items
Extend special
Ignore
During rush

Owner quickly types:

Biryani sold out

AI replies:

Mark Chicken Biryani and Veg Biryani as unavailable for today?

Owner taps approve.

Evening

MenuList shows:

Today’s menu activity:
- 3 items updated
- 2 specials added
- 41 people viewed menu
- Most viewed item: Cheese Burst Pizza

Simple and useful.

5. The best MenuList AI modules

I would split the product into 6 owner-facing agents.

1. Setup Agent

Helps create the menu from photo, PDF, text, Excel, or website.

Best for new customers.

2. Update Agent

Handles price changes, availability, new items, deleted items, timings, variants.

Best for daily usage.

3. Menu Quality Agent

Finds missing info, bad formatting, duplicate items, weak descriptions, missing photos.

Best for retention.

4. Offer Agent

Creates today’s special, combo, festival offer, happy hour, lunch deal.

Best for upsell and engagement.

5. Publish Agent

Updates the public MenuList page, QR menu, printable QR, and shareable WhatsApp/social text.

Best for distribution.

6. Menu Insights Agent

Shows simple menu performance:

Most viewed items
Least viewed items
Items customers search for
Items with missing info
Popular categories

Best for making MenuList feel valuable after setup.

6. What the owner dashboard should look like

The owner home page should not be a complex admin panel.

It should have 5 main areas:

A. Quick command box
Tell MenuList what changed...

Examples below it:

Add new item
Change price
Hide item
Create offer
Upload menu photo
B. Agent Inbox

Cards waiting for approval.

3 updates need approval
C. Menu Health
72/100
Fix 5 issues
D. Live Menu Preview

Owner sees exactly what customers will see.

E. Share Tools
QR code
WhatsApp link
Instagram story text
Print menu
7. Very important: MenuList should be action-first, not chat-first

Bad experience:

Owner: Change dosa price to 99
AI: Sure! I can help you change dosa price. Please go to menu settings...

Good experience:

Owner: Change dosa price to 99
AI: I found Masala Dosa. Price ₹89 → ₹99. Approve?

The difference is huge.

The AI should not just answer.
It should prepare real changes.

8. Suggested MVP

For the first version, build only these 3 things:

MVP 1: Import Menu

Owner uploads photo/PDF/text.
AI creates structured menu draft.
Owner approves.

This helps acquisition.

MVP 2: Quick Menu Update

Owner types natural language update.
AI converts to change proposal.
Owner approves.

This helps daily retention.

MVP 3: Menu Health

AI checks the menu and suggests fixes.
Owner approves improvements.

This helps product stickiness.

Everything else can come later.

9. Example user flows
Flow 1: New restaurant onboarding
Owner signs up
↓
Uploads menu photo
↓
AI extracts items, prices, categories
↓
AI asks 5 confirmation questions
↓
Owner approves
↓
MenuList creates public menu + QR
↓
Owner shares QR

This should take less than 10 minutes.

Flow 2: Price change
Owner: Increase all tea prices by ₹5
↓
AI finds Tea items
↓
Shows affected items
↓
Owner approves
↓
Menu updated
↓
Change logged
Flow 3: Sold out item
Owner: Cold coffee sold out
↓
AI: Mark Cold Coffee unavailable until tomorrow?
↓
Owner approves
↓
Customer menu shows “Unavailable today”
Flow 4: Add special
Owner: Add today special chole bhature 129
↓
AI creates item:
Category: Today’s Special
Name: Chole Bhature
Price: ₹129
Availability: Today only
↓
Owner approves
↓
Menu updated
Flow 5: Improve menu
AI: 8 items have weak descriptions. Improve?
↓
Owner approves
↓
AI updates descriptions
↓
Owner can edit any line
10. Data model needed behind the scenes

MenuList needs a clean structure for AI to act safely.

Core objects:

Business
Outlet
Menu
Category
Item
Variant
Add-on
Price
Availability
Photo
Offer
Change Proposal
Approval
Audit Log

The most important object is Change Proposal.

Every AI action should become a proposal before execution:

JSON
{
  "proposal_type": "price_update",
  "item": "Paneer Tikka",
  "old_price": 179,
  "new_price": 199,
  "confidence": 0.94,
  "requires_approval": true,
  "status": "pending"
}

This keeps the product safe.

11. Guardrails for SMB trust

Owners will only trust the AI if it behaves carefully.

Rules:

Never change prices without approval.

Never delete items directly; archive first.

Never invent ingredients, allergens, or claims.

Always show before/after preview.

Always keep change history.

Allow one-click rollback.

For low confidence, ask a question instead of guessing.

Example:

AI: I found “Spl Pizza 199/299”. Is this Small ₹199 and Large ₹299?

This is better than making a wrong assumption.

12. What makes this valuable to owners

The owner should feel:

I can update my menu in 10 seconds.
My menu looks better than before.
My staff can help without breaking anything.
My QR menu is always accurate.
I do not need a designer or developer.

That is the real value.

Not “AI-powered menu.”
Position it as:

“Your menu manager that updates itself with your approval.”

13. Pricing angle

For SMBs, pricing should connect to pain.

Possible plan structure:

Free / Starter

Digital menu

QR code

Basic manual editing

Limited AI import

Pro

AI menu import

Quick updates

Menu health score

Smart descriptions

Offers/specials

Multi-outlet

Branch-level menus

Bulk price changes

Outlet-specific availability

Approval roles

Menu change history

The AI features should sit in the paid plan because they save real owner time.

14. The killer feature

The strongest wedge is:

“Update your menu by WhatsApp-style messages.”

Example:

Owner: Add mango lassi 99, available only this week
MenuList: Add Mango Lassi at ₹99 under Beverages, available until Sunday?
Owner: Yes
MenuList: Done. Public menu updated.

This is simple, understandable, and valuable.

Many SMB owners may not want to learn a dashboard. But they understand messaging.

15. My recommended MenuList roadmap
Phase 1: Menu creation

Upload photo/PDF

Extract menu

Categorize items

Confirm unclear entries

Publish QR menu

Phase 2: Menu updates

Natural language edits

Price changes

Availability changes

New items

Time-based specials

Phase 3: Menu improvement

Descriptions

Missing photo alerts

Veg/non-veg labels

Duplicate detection

Menu health score

Phase 4: Growth tools

Offers

Combo suggestions

WhatsApp share text

Festival specials

Customer FAQ from menu

Phase 5: Multi-outlet

Master menu

Branch-specific prices

Branch-specific availability

Bulk updates

Approval workflows

Final product definition

MenuList should become:

An AI-assisted menu operating system for small restaurants, cafes, cloud kitchens, bakeries, and food trucks.

The first promise should be very simple:

“Upload your menu. MenuList builds it. Tell us changes anytime. We update it after your approval.”

That is strong enough for SMB owners.
```

### Message 5 - User

- Message ID: cb0845e2-6306-4f98-ab20-785939e3f14e
- Captured from scroll band: target-18000

```
Do deep web searxh arround smb owner pov and continue and hope your on ai agenetic ops for menu topic
```

### Message 6 - Assistant

- Message ID: 1650f7c9-cb11-49ff-b665-559514b367a4
- Model: gpt-5-5-pro
- Captured from scroll band: target-18000

```
I’ll research from the owner/operator angle first, then convert findings into MenuList-specific agentic workflows: what to monitor, propose, approve, and safely automate.
```

### Message 7 - Assistant

- Message ID: d6fcd938-452c-4a37-908a-b1f8347721b3
- Model: gpt-5-5-pro
- Captured from scroll band: target-18000

```
Early signal: AI menu import is becoming commoditized, so the stronger wedge is ongoing menu operations tied to margin, accuracy, staffing pressure, and rush-hour admin.
```

### Message 8 - Assistant

- Message ID: f661d9aa-7176-475a-a108-eb0b3bedc138
- Model: gpt-5-5-pro
- Captured from scroll band: target-18000

```
I treated this as current public-web research around SMB restaurant owners, then translated it into MenuList agentic menu operations.

The big conclusion:

MenuList should not be “AI menu generator.” That is already becoming common. MenuList should become the owner’s always-on Menu Ops Assistant: source of truth, update engine, publishing layer, monitoring layer, and approval inbox.

1. What the web research says from SMB owner POV
A. Owners are under margin pressure, so menu updates are not cosmetic

Restaurant owners are dealing with food cost, labor, inflation, and profitability pressure. The National Restaurant Association’s 2026 report says average food costs are now more than 35% above pre-pandemic levels, and 82% of operators reported higher food costs in 2025 than in 2024. Toast’s 2025 restaurant survey found profitability is the top goal for 40% of operators, and 48% plan to raise menu prices if inflation continues. 
WTOP News
+1

MenuList implication:
Price updates are not occasional admin work. They are a business survival workflow. MenuList should make price changes fast, safe, reversible, and easy to publish everywhere.

B. Owners want tech, but only if it reduces work

Restaurant operators are open to technology, but they do not want another complicated dashboard. The National Restaurant Association found that 76% of operators say technology gives them a competitive edge, yet only 13% feel they are on the leading edge. Operators planned investments in digital/location marketing, loyalty, back office, inventory, POS, contactless ordering, and flexible/dynamic menu pricing. 
NRA
+1

Square’s 2025 restaurant research says restaurant leaders are optimistic about AI/automation improving several areas, including marketing, inventory, payments, menu optimization, and staff management. Toast also found 86% of restaurant operators are comfortable using AI and 81% plan to use it more. 
Business Wire
+1

MenuList implication:
Do not sell “AI.” Sell:

“Change your menu in 10 seconds. MenuList prepares it. You approve. It updates everywhere.”

C. The online menu matters before the customer arrives

Menus are now part of discovery, decision-making, and conversion. A US Foods survey found that 83% of diners review the menu beforehand and 50% decide what to order before arriving. The National Restaurant Association found that 59% of full-service customers and 57% of limited-service customers would access a menu through a QR code. 
usfoods.com
+1

A 2024 India-focused digital menu study found that menu visual appeal, menu informativeness, perceived convenience, and desire for food influence purchase intention. 
Manipal Academy

MenuList implication:
The menu is not a PDF. It is a sales surface. MenuList should improve:

item photos

descriptions

category order

offer visibility

veg/non-veg/spice labels

availability

today’s specials

mobile readability

D. “AI menu import” is becoming commoditized

This is important. Google Business Profile already supports creating a detailed menu from a menu photo or PDF using AI. Google says restaurant owners can upload a photo/PDF, generate a menu, review it, and publish/edit it. Google’s API also supports structured menu fields such as item name, price, currency, item description, sections, nutrition, and photos. 
Google Help
+1

Other products also advertise AI menu-from-photo flows, such as FineDine’s “turn menu photos into online QR menu” and India-focused AI menu tools that export print, delivery-app, and QR-ready formats. 
Finedine
+1

Uber Eats is also adding AI-generated menu descriptions, AI-enhanced menu photos, review summaries, and live order chat for merchants. 
The Verge

MenuList implication:
Basic AI extraction is useful, but it is not enough as a moat.

The moat should be:

MenuList remembers the menu, understands changes, asks for approval, publishes updates, checks drift, and keeps the owner safe.

E. India/SMB context makes this even more operational

The Indian restaurant sector is large and growing, but smaller owners face input costs, complex compliance, delivery dynamics, limited operating hours, and platform pressure. NRAI says the Indian food services industry was around ₹5.69 lakh crore in FY24 and is projected to reach ₹7.76 lakh crore by FY28, while also noting rising input costs, delivery dynamics, regulatory complexity, and pressure on smaller/MSME restaurant owners. 
nrai.org
+1

For delivery platforms, Reuters reported that India’s CCI investigation found Zomato and Swiggy used practices like exclusivity arrangements and price/discount restrictions, with the investigation beginning after a complaint from NRAI. 
Reuters

MenuList implication:
For Indian SMBs, MenuList should support:

WhatsApp-first updates

QR menu

Google Business Profile publishing

Zomato/Swiggy-ready exports

printable menus

UPI/share links

regional languages

outlet-wise pricing

platform price drift checks

2. The right positioning for MenuList

Do not position it as:

“AI QR menu builder.”

That sounds like a commodity.

Position it as:

“Your AI menu manager. Tell MenuList what changed. Review once. Your menu stays updated everywhere.”

Or more SMB-friendly:

“Menu update karo WhatsApp jaise. MenuList samajh ke preview dikhayega. Aap approve karo, menu live.”

The owner does not care about agents, LLMs, OCR, embeddings, or workflows.

The owner cares about:

“Wrong price mat dikhao.”
“Sold-out item customer ko mat dikhao.”
“Special offer jaldi live karo.”
“Staff se mistake na ho.”
“Google/QR/WhatsApp menu same rahe.”
“Mujhe dashboard seekhna na pade.”

3. MenuList Agentic Ops: the product concept
MenuList should work like a menu control room

Every AI action should follow this loop:

Observe → Understand → Propose → Approve → Publish → Verify → Log

This is the agentic pattern. OpenAI describes agents as applications that can plan, call tools, collaborate across specialists, and maintain state for multi-step work; for sensitive tool calls, human-in-the-loop approval pauses execution until a person approves or rejects the action. 
OpenAI Developers
+1

For MenuList, that means:

Owner says: "Paneer tikka 199, cold coffee not available today"

AI understands:
- Update Paneer Tikka price ₹179 → ₹199
- Mark Cold Coffee unavailable until tomorrow morning

MenuList shows:
Approve these 2 changes?

Owner taps:
Approve

MenuList:
Updates QR menu
Updates MenuList public page
Creates WhatsApp share text
Logs change

This is much better than chat.

4. The core MenuList owner workflows
Workflow 1: New menu setup

Owner uploads:

printed menu photo

PDF

WhatsApp text

delivery-app screenshot

Excel sheet

existing website menu

MenuList extracts:

Category
Item
Price
Variant
Add-on
Description
Veg/non-veg
Spice level
Availability

But the important part is not extraction. The important part is confirmation.

Example:

I found “Special Thali 149/199”.
Is this:
A) Regular ₹149, Special ₹199
B) Half ₹149, Full ₹199
C) Lunch ₹149, Dinner ₹199

This builds trust.

Workflow 2: Daily quick updates

Owner types or speaks:

Biryani sold out
Increase tea by 5 rupees
Add mango lassi 99 for summer
Remove Diwali offer
Make lunch thali available 12 to 4 only

MenuList turns this into a change proposal, not a direct change.

Example:

Proposal:
Mark Chicken Biryani unavailable until tomorrow 11:00 AM.

Affected surfaces:
- QR menu
- MenuList public link
- WhatsApp share menu

Approve?
Workflow 3: Price pressure update

This is a killer use case because food costs keep changing.

Owner says:

Increase all paneer items by ₹20

MenuList shows:

Found 7 paneer items:

Paneer Tikka ₹179 → ₹199
Paneer Butter Masala ₹249 → ₹269
Paneer Roll ₹99 → ₹119
Paneer Momos ₹120 → ₹140

Approve all?
Edit selected?

Rule:

Prices should never change without explicit approval.

Workflow 4: Today’s special / offer

Owner says:

Add today's special rajma chawal 129

MenuList proposes:

Category: Today's Special
Item: Rajma Chawal
Price: ₹129
Availability: Today only
Description: Homestyle rajma served with steamed rice.
Visibility: Top of menu
Expiry: Tonight 11:00 PM

Then MenuList can generate:

menu update

WhatsApp message

Instagram caption

QR menu badge

printable counter card text

This makes MenuList more than a menu editor.

Workflow 5: Menu quality improvement

MenuList scans the menu and shows:

Menu Health: 68/100

Fix these:
- 14 items have no photos
- 8 items have no descriptions
- 6 items have no veg/non-veg label
- 4 prices look missing
- 3 duplicate items found
- 2 items are in wrong category

The owner taps:

Fix descriptions

MenuList generates short, safe descriptions, but does not invent ingredients.

Bad AI:

Paneer Roll: stuffed with onions, capsicum, mint chutney...

Safe AI:

Paneer Roll: Soft roll filled with paneer and house-style seasoning.
Need confirmation: onion? capsicum? chutney?
5. The Agent Inbox: the main UI

The owner dashboard should start with one box:

Tell MenuList what changed...

Below it, show cards.

Card examples
Price Change Card
Change detected from your message:
"Tea 20 now"

Proposal:
Masala Tea ₹15 → ₹20

Impact:
QR menu + public menu

[Approve] [Edit] [Cancel]
Sold Out Card
You said: "Cold coffee over"

Proposal:
Mark Cold Coffee unavailable until tomorrow 10 AM.

[Approve] [Change time] [Cancel]
Menu Drift Card
Possible mismatch:
MenuList: Paneer Tikka ₹199
Uploaded delivery menu image: Paneer Tikka ₹179

Which is correct?

[Keep MenuList ₹199] [Change to ₹179] [Ignore]
Missing Photo Card
12 popular items have no photo.

Send this link to staff:
staff.menulist.in/photo-upload

[Send link] [Remind later]
Offer Expiry Card
Weekend Combo expired yesterday.

Remove from menu?
Extend till Sunday?

[Remove] [Extend] [Edit]
6. The agent system MenuList should build

Think of MenuList as several small agents, not one big chatbot.

1. Import Agent

Purpose: create structured menu from messy input.

Inputs:

photo

PDF

text

Excel

website

delivery-app image

Outputs:

categories

items

variants

prices

add-ons

confidence score

questions for owner

This helps onboarding.

2. Update Agent

Purpose: understand owner commands.

Examples:

Add item
Change price
Hide item
Restore item
Change timing
Bulk update
Remove offer

This helps daily retention.

3. Quality Agent

Purpose: make the menu better.

Checks:

missing prices
missing descriptions
missing photos
duplicate items
bad categories
too-long names
unclear variants
no veg/non-veg labels
no spice level
old offers still live

This makes MenuList sticky.

4. Offer Agent

Purpose: create specials quickly.

Examples:

today special
happy hour
festival offer
combo
weekday lunch
student discount
family pack

It should produce menu updates plus shareable promo text.

5. Publishing Agent

Purpose: push approved menu state to surfaces.

First surfaces:

MenuList public page
QR menu
printable menu PDF
WhatsApp share message
Google Business Profile menu link / structured menu where possible

Google supports structured food menu updates through Business Profile APIs when eligible, including item name, price, description, sections, and photos. It also notes that manual menu changes on Google may take 24–48 hours to appear. 
Google for Developers
+1

6. Drift Monitor Agent

Purpose: detect mismatch.

Sources:

MenuList current menu
public website
Google menu
old menu PDFs
delivery-app export files
social menu posts
uploaded menu images

For Zomato/Swiggy, direct write APIs may not be available to you, so start with:

Export-ready images
CSV/PDF exports
owner task reminders
drift detection from screenshots/manual uploads
7. Insights Agent

Purpose: give simple owner insights.

Not analytics-heavy.

Examples:

Most viewed item: Chicken Burger
Least viewed category: Soups
10 customers searched for "momos"
8 people clicked WhatsApp after viewing Lunch Combo
Items without photos get fewer clicks

This creates the weekly “why should I keep paying?” value.

7. The real product moat

The moat is not OCR.

The moat is operational memory.

MenuList should know:

This owner changes prices every Monday.
This cafe runs weekend specials.
This kitchen often marks biryani sold out by 9 PM.
This branch has different pricing.
This item should never be hidden because it is a bestseller.
This owner prefers Hindi WhatsApp promos.
This outlet needs Jain/veg labels.
This category order converts better.

That becomes the agent’s advantage.

Google can import a menu.
Uber can improve menu descriptions.
Canva can design a menu.
POS tools can store menu items.

But MenuList can become:

The living menu brain for small food businesses.

8. Safety and trust rules

SMB owners will not trust the agent if it makes silent mistakes.

Use these rules:

Never change prices without approval.
Never delete items directly; archive first.
Never invent ingredients, allergens, or health claims.
Never publish external changes without preview.
Always show before/after.
Always keep rollback.
Always log who approved.
Ask questions when confidence is low.

Risk levels:

Low risk:
- suggest descriptions
- detect missing photos
- create draft promo text

Medium risk:
- availability changes
- category movement
- offer expiry

High risk:
- price changes
- delete/archive item
- publish to Google
- bulk updates
- allergen/nutrition claims

For high-risk actions, use human approval. This matches best practice for agentic workflows where sensitive tool calls pause until a human approves or rejects. 
OpenAI GitHub

9. MenuList data model for agentic ops

You need a proper schema so AI can act safely.

Core objects:

Business
Outlet
Menu
Category
Item
Variant
Add-on
Modifier group
Price
Availability window
Photo
Description
Label
Offer
Publishing surface
Change proposal
Approval
Audit log
Rollback snapshot

Most important object:

JSON
{
  "type": "change_proposal",
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "proposal_kind": "price_update",
  "source": "owner_command",
  "owner_input": "Paneer tikka 199",
  "changes": [
    {
      "entity_type": "item",
      "entity_id": "item_paneer_tikka",
      "field": "price",
      "old_value": 179,
      "new_value": 199
    }
  ],
  "confidence": 0.94,
  "risk_level": "high",
  "requires_approval": true,
  "status": "pending"
}

The product should be built around change proposals, not direct edits.

10. The SMB owner dashboard

Keep it extremely simple.

Home screen
[ Tell MenuList what changed... ]

Today:
3 updates need approval
Menu Health: 72/100
2 offers expiring
9 items need photos
Tabs
Menu
Agent Inbox
Offers
QR / Share
Insights
Settings

Do not make “AI Chat” the main tab.

Make the command box the main input, and the Agent Inbox the main workflow.

11. The strongest MVP

Build only 3 things first.

MVP 1: Menu Import Agent

Owner uploads photo/PDF/text.
MenuList creates structured menu.
Owner reviews and publishes.

But add confidence and questions, not just extraction.

MVP 2: Quick Update Agent

Owner types:

Cold coffee sold out
Dosa 99
Add mango lassi 99
Increase all tea by 5

MenuList converts to proposals.

This is the daily-use feature.

MVP 3: Menu Health Agent

MenuList finds:

missing photos
missing descriptions
duplicate items
missing prices
bad category order
old offers
no veg/non-veg labels

Owner fixes with one tap.

This is the retention feature.

12. What I would build after MVP
Phase 2: Publishing layer

Add:

QR menu
public menu page
printable PDF
WhatsApp menu share
Google Business Profile menu link
Google structured food menu integration where eligible
Phase 3: Drift detection

Add:

Compare MenuList vs Google
Compare MenuList vs uploaded delivery-app images
Compare MenuList vs old PDFs
Detect stale offers
Detect price mismatch
Phase 4: Staff photo workflow

Add:

Send staff link
Staff uploads dish photo
AI matches photo to item
AI checks quality
Owner approves
Photo goes live
Phase 5: Multi-outlet

Add:

Master menu
Outlet-specific prices
Outlet-specific availability
Bulk update with exceptions
Branch approval roles
13. Example agentic flows in detail
Flow: “Increase tea by ₹5”
Owner command:
Increase all tea by 5

Agent finds:
Masala Tea
Ginger Tea
Lemon Tea
Elaichi Tea

Agent proposes:
Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

Owner approves.

Agent publishes:
MenuList QR updated.
Public menu updated.
Change log saved.
Flow: “Momos sold out”
Owner command:
Momos over

Agent asks:
I found 3 momos items:
- Veg Momos
- Paneer Momos
- Chicken Momos

Mark all unavailable until tomorrow?

Owner approves.

Customer sees:
Unavailable today
Flow: “New special”
Owner command:
Today special chole bhature 129

Agent proposes:
Category: Today's Special
Item: Chole Bhature
Price: ₹129
Availability: Today only
Description: Classic chole served with fluffy bhature.

Also create:
WhatsApp text
Instagram caption
Counter display text

Owner approves selected actions.
Flow: Menu drift
Agent observes:
Uploaded delivery menu image has Veg Burger ₹89.
MenuList has Veg Burger ₹99.

Agent card:
Possible mismatch. Which price is correct?

Owner chooses:
Keep MenuList ₹99.

Agent:
Marks external source as stale.
Creates task: update delivery menu image.
14. Why owners will pay

MenuList Pro should save time and prevent mistakes.

The paid promise:

No more outdated menu.
No more wrong price.
No more retyping.
No more designing offers manually.
No more guessing what to fix.

Suggested pricing logic:

Starter
QR menu
public link
manual editing
basic import
Pro
AI import
quick updates
menu health
offers
photo helper
WhatsApp share
change history
Growth / Multi-outlet
branch menus
bulk updates
approval roles
Google publishing
drift monitoring
advanced insights
15. The key product insight

The owner does not wake up thinking:

“I need agentic AI.”

The owner thinks:

“My menu is wrong again.”
“Food cost increased.”
“This item is sold out.”
“I need today’s offer live fast.”
“Customers keep asking price/photo/details.”
“My staff will make mistakes if I give access.”

So MenuList agentic ops should feel like this:

Owner speaks naturally.
MenuList understands.
MenuList prepares safe changes.
Owner approves.
Menu updates everywhere.
MenuList checks if it stayed correct.

That is the product.

16. Recommended next build spec

Build the first version of Agent Inbox with these proposal types:

price_update
availability_update
new_item
archive_item
category_update
description_suggestion
photo_missing
offer_create
offer_expire
menu_import_review
drift_detected

Each proposal needs:

old value
new value
confidence
risk level
affected surfaces
approval required
rollback snapshot
audit log

First owner command examples to support:

Add [item] [price]
Change [item] to [price]
Increase [category/item group] by [amount]
Hide [item] today
Make [item] available tomorrow
Add today special [item] [price]
Remove offer
Upload menu photo
Fix menu descriptions
Final strategic direction

MenuList should become:

AI Agentic Menu Ops for SMB food businesses.

Not a chat assistant.
Not just QR menu.
Not just menu design.
Not just AI import.

The product promise should be:

“Your menu stays accurate, attractive, and updated everywhere — with your approval.”
```

### Message 9 - User

- Message ID: 0b618c2a-727a-4515-9ee8-ea8baee9ecf8
- Captured from scroll band: target-39000

```
There is no phases no versions everything goes on day one 
So think in this way for long term positioning and prepare this plan in that way
```

### Message 10 - Assistant

- Message ID: c7889a6a-0ce0-4b46-a633-83a2977d901c
- Model: gpt-5-5-pro
- Captured from scroll band: target-39000

```
I’ll reframe this as a day-one platform thesis: positioning, owner promise, full product surface, agentic ops loop, data moat, pricing, and GTM as one system.
```

### Message 11 - Assistant

- Message ID: 7854541d-c23c-494c-b1e8-d8aab6e452f0
- Model: gpt-5-5-pro
- Captured from scroll band: target-39000

```
Key shift: MenuList should launch as a complete menu operating layer, with depth varying behind the scenes but the owner-facing promise complete from day one.
```

### Message 12 - Assistant

- Message ID: 91c1d2f4-44a0-42ec-a795-b9c7e9bc2a47
- Model: gpt-5-5-pro
- Captured from scroll band: target-39000

```
Agreed. Then MenuList should not be planned like “QR menu first, AI later, integrations later.” That creates a small tool. The stronger move is to define MenuList from day one as a complete AI Menu Ops platform.

The product can still have practical depth limits internally, but the positioning, architecture, data model, owner journey, pricing, and product surface should all be born as one system.

MenuList long-term positioning
Category

AI Menu Operations Platform for SMB Food Businesses

Not:

AI menu generator
QR menu builder
Digital menu design tool
Restaurant website menu
Menu OCR tool

But:

The operating system that keeps a restaurant’s menu accurate, attractive, published, and monitored everywhere.

The strongest positioning line:

Tell MenuList what changed. It prepares the update. You approve. Your menu stays correct everywhere.

A more SMB-friendly version:

Menu update karo WhatsApp jaise. MenuList samjhega, preview dikhayega, aur approve ke baad sab jagah update karega.

Why this positioning is right

Basic AI menu import is already becoming a commodity. Google Business Profile already lets restaurant owners upload a menu photo or PDF and use AI to convert it into menu sections, item names, descriptions, and prices. 
Google Help
 Uber Eats is also adding AI around menu descriptions, menu photos, and review summaries for merchants. 
Uber
+1

So MenuList should not compete as “we can generate your menu.” That is too narrow.

The bigger owner problem is ongoing menu operations: prices change, food cost changes, specials expire, items sell out, photos are missing, staff make mistakes, and menus become inconsistent across QR, Google, WhatsApp, print, and delivery surfaces.

This also matches owner behavior. Restaurant operators are increasingly open to technology and AI: Toast’s 2025 restaurant survey says 86% of operators are comfortable using AI and 81% plan to use it more. 
Toast POS
 The National Restaurant Association has also reported that more than 80% of restaurant operators see technology as giving them a competitive advantage. 
NRA

And the menu is now a pre-sale surface, not just an in-restaurant object. US Foods found that 83% of diners review the menu beforehand and 50% decide what to order before arriving. 
US Foods

So the long-term thesis is:

The restaurant menu is no longer a file. It is a live business object. MenuList owns that object.

Day-one product thesis

MenuList should launch as one complete system:

Create menu → improve menu → update menu → publish menu → monitor menu → learn from menu → repeat.

No separate tools. No disconnected AI features. No “chatbot” bolted onto a menu editor.

Everything should flow through one operating loop:

Observe → Understand → Propose → Approve → Publish → Verify → Learn

This is the heart of MenuList agentic ops.

The owner should feel:

I do not manage menu software.
I just tell MenuList what changed.
MenuList handles the menu work.
The full day-one product surface
1. Menu Command Center

This is the home screen.

At the top:

Tell MenuList what changed...

Owner can type, speak, upload a photo, upload a PDF, paste WhatsApp text, or send a screenshot.

Examples:

Add mango lassi 99
Cold coffee sold out today
Increase all paneer items by 20
Weekend combo remove
Add lunch thali 149 only 12 to 4
Make all tea items 5 rupees higher
Upload new menu photo
Fix missing descriptions
Create today special rajma chawal 129

The command box is the main product interface.

Not a chatbot.

The AI should not reply with advice. It should prepare real changes.

Bad:

Sure, you can update this in menu settings.

Good:

I found Masala Tea, Ginger Tea, and Lemon Tea.
I will increase each by ₹5.

Approve?
2. Agent Inbox

This is where every AI action becomes a card.

Nothing important should silently change.

Example cards:

Price update
Paneer Tikka ₹179 → ₹199

Risk: High
Impact: QR menu, public menu, WhatsApp menu, printable PDF

[Approve] [Edit] [Cancel]
Sold-out update
Mark Cold Coffee unavailable until tomorrow 10 AM.

Risk: Medium
Impact: Customer menu will show “Unavailable today.”

[Approve] [Change time] [Cancel]
Menu health issue
13 items have no photos.
7 items have no description.
4 items have no veg/non-veg label.

[Fix now] [Assign to staff] [Ignore]
Offer expiry
Weekend Combo expired yesterday.

[Remove] [Extend] [Edit]
Drift detected
MenuList has Veg Burger ₹99.
Uploaded delivery menu image shows Veg Burger ₹89.

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]

The Agent Inbox is the trust layer. It makes AI feel safe.

3. Master Menu

MenuList needs to own the restaurant’s canonical menu.

This is the source of truth.

The owner’s menu should not be stored as a flat list. It should be a structured menu graph:

Menu
  Category
    Item
      Variant
      Add-on
      Modifier
      Price
      Availability
      Photo
      Description
      Labels
      Publishing status

Example:

Category: Beverages

Item: Cold Coffee
Price: ₹99
Labels: Veg, Cold, Bestseller
Availability: 11 AM - 11 PM
Status: Available
Photo: Added
Description: Chilled coffee blended with milk and ice.
Visible on:
- QR menu
- Public menu
- WhatsApp menu
- Printable PDF

The master menu should support from day one:

categories
items
variants
half/full
small/medium/large
add-ons
combo items
meal periods
availability
sold-out status
photos
descriptions
veg/non-veg labels
spice labels
Jain option
custom labels
regional language names
tax-inclusive or tax-extra price display
outlet-specific prices
outlet-specific availability

This is important because SMB menus are messy. If the schema is weak, the AI will fail later.

4. AI Menu Import

This is part of the day-one experience, but it is not the full product.

Owner can upload:

printed menu photo
PDF
Excel sheet
WhatsApp menu text
old website menu
delivery-app screenshot
social post menu

MenuList extracts:

categories
items
prices
variants
descriptions
labels
add-ons
timings

But the magic is confirmation.

Example:

I found “Special Thali 149/199”.

Is this:
A) Regular ₹149 and Special ₹199
B) Half ₹149 and Full ₹199
C) Lunch ₹149 and Dinner ₹199

Another example:

I found “Chicken Biryani 180/300”.

Should I create:
A) Half ₹180, Full ₹300
B) Regular ₹180, Family ₹300

This makes the import agent feel careful, not reckless.

5. Quick Update Agent

This is the daily retention engine.

The owner should be able to update the menu in seconds.

Examples:

Owner: Biryani sold out

MenuList:
I found:
- Veg Biryani
- Chicken Biryani
- Mutton Biryani

Mark all unavailable until tomorrow 11 AM?

[Approve all] [Select items] [Cancel]
Owner: Increase all tea by 5

MenuList:
Found 4 tea items:

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

[Approve] [Edit] [Cancel]
Owner: Add mango lassi 99 summer special

MenuList:
Create item:
Name: Mango Lassi
Category: Beverages
Price: ₹99
Label: Summer Special
Availability: This week
Description: Chilled mango lassi made with yogurt and mango.

[Approve] [Edit]

This is the “killer” MenuList behavior.

6. Menu Health Agent

Every restaurant gets a living score:

Menu Health: 74/100

The score is not vanity. It tells the owner what to fix.

Fix these:
- 16 items have no photos
- 9 items have no descriptions
- 6 items have no veg/non-veg label
- 4 items have duplicate names
- 3 items may be in the wrong category
- 2 offers are expired
- 1 item has no price

The owner can tap:

Fix descriptions
Request photos from staff
Add veg/non-veg labels
Clean duplicates
Remove expired offers

Menu Health should be one of the main reasons owners return weekly.

7. Offer Agent

MenuList should help owners create offers without thinking like marketers.

Owner says:

Create lunch combo for office crowd

MenuList proposes:

Offer: Office Lunch Combo
Items: Veg Thali + Buttermilk
Price: ₹149
Timing: Monday-Friday, 12 PM - 4 PM
Badge: Lunch Special
WhatsApp text: Ready
Instagram caption: Ready
QR menu banner: Ready
Expiry: Friday 4 PM

Owner can approve the full kit.

Offer types from day one:

today special
weekend special
lunch combo
happy hour
festival offer
student offer
family pack
limited stock item
seasonal item
buy 2 get 1
combo meal

This turns MenuList from a static menu into a revenue tool.

8. Publishing Agent

Once owner approves changes, MenuList publishes to all menu surfaces.

Day-one surfaces should be designed as one system:

MenuList public menu page
QR menu
printable PDF menu
WhatsApp share menu
Instagram story/post text
Google Business Profile menu link / structured menu where eligible
delivery-app-ready export images or CSV/PDF
counter display menu
staff internal menu

Google matters because restaurants are discovered on Search and Maps, and Google’s restaurant business profile product emphasizes helping customers choose restaurants based on menu, photos, and related information. 
Google

For delivery platforms, direct write access may not always be available. So MenuList should still support:

Zomato-ready export
Swiggy-ready export
Uber Eats-ready CSV/image
platform screenshot comparison
owner task reminders

The core promise remains:

Change once. Publish everywhere possible. Export where direct publish is not possible.

9. Drift Monitor Agent

MenuList should continuously check whether the menu is consistent.

Sources to compare:

MenuList master menu
public menu page
QR menu
Google menu
uploaded delivery-app screenshots
old menu PDFs
website menu
social post menus
printable menus

Example:

Drift detected:

MenuList:
Paneer Roll ₹119

Old uploaded delivery menu:
Paneer Roll ₹99

Action:
Confirm correct price and create update task.

This is a strong long-term moat because most owners do not even know where their old menus are still visible.

MenuList can own the idea of:

Menu freshness.

10. Photo Agent

Food photos are painful for SMB owners.

Day-one photo system should include:

missing photo tracker
staff upload link
AI item-photo matching
photo quality check
basic crop/brightness improvement
owner approval before live

Example:

12 items need photos.

Send upload link to staff?

Staff can upload photos.
MenuList will match photos to items.
You approve before publishing.

AI should say:

This photo is dark.
This photo contains multiple dishes.
This photo looks good for Butter Chicken.
This may not match Paneer Tikka.

Do not rely only on generated images. SMB trust is higher when photos are real.

11. Description Agent

MenuList should generate better descriptions, but safely.

Rule:

Never invent ingredients, allergens, health claims, or cooking methods.

Example:

Item: Paneer Roll

Current description: empty

Safe suggestion:
Soft roll filled with paneer and house-style seasoning.

Need confirmation:
Does it include onion, capsicum, cheese, or chutney?

For simple items:

Cold Coffee
Chilled coffee blended with milk and ice.

For uncertain items:

Special Pizza
I need more detail before writing this. What makes it special?

This is how AI earns trust.

12. Insights Agent

MenuList should show simple, owner-friendly insights.

Not complex analytics.

Examples:

Today:
Menu views: 146
WhatsApp clicks: 23
Most viewed item: Chicken Biryani
Most searched word: Momos
Least viewed category: Soups
Items without photos got fewer clicks
Lunch Combo was viewed 41 times

Insights should become action cards.

Customers searched “momos” 18 times, but momos are not on your menu.
Add item or ignore?
Cold Coffee is highly viewed but has no photo.
Request photo?

The insight should always lead to an operation.

13. Multi-outlet Agent

This should exist in the product thinking from day one, even if the first customer has one outlet.

MenuList should support:

master menu
outlet-specific pricing
outlet-specific availability
branch-level specials
bulk updates
exceptions
approval by outlet manager
central owner approval

Example:

Increase Paneer Tikka to ₹219 for all outlets except Andheri.

Affected:
Bandra ₹199 → ₹219
Powai ₹199 → ₹219
Andheri unchanged ₹199

Approve?

This prevents the product from becoming single-outlet-only and hard to expand later.

14. Staff Permissions

SMB owners need staff help, but they fear mistakes.

Roles:

Owner
Manager
Staff
Designer
Agency
Accountant

Permissions:

Staff can upload photos
Manager can mark sold out
Owner approves price changes
Agency can create offers but not publish
Staff cannot delete items

This is very important.

The AI assistant should also respect roles.

Example:

Staff says: Change biryani to 299

MenuList:
Price change requires owner approval.
I created a proposal.
The agentic ops architecture

MenuList should not have “one AI bot.” It should have specialist agents working on one menu graph.

Agent 1: Intake Agent

Understands messy inputs:

text
voice
photo
PDF
Excel
screenshot
website URL
WhatsApp-style command

Its job:

What is the owner trying to do?
What menu entities are involved?
Is anything unclear?
Agent 2: Menu Resolver Agent

Maps owner language to actual menu objects.

Example:

Owner says: tea 20

Menu Resolver:
Could mean:
- Masala Tea
- Ginger Tea
- Lemon Tea
- all Tea category items

Ask question or propose likely match.

This is critical for avoiding wrong updates.

Agent 3: Proposal Agent

Converts intent into structured changes.

Every action becomes a proposal:

JSON
{
  "proposal_type": "price_update",
  "source": "owner_command",
  "input": "Paneer tikka 199",
  "changes": [
    {
      "entity": "item",
      "name": "Paneer Tikka",
      "field": "price",
      "old_value": 179,
      "new_value": 199
    }
  ],
  "risk": "high",
  "confidence": 0.94,
  "requires_approval": true
}

This is the core object of the product.

The most important MenuList object is not Item.

It is:

Change Proposal
Agent 4: Policy Agent

Decides what can happen automatically and what needs approval.

Rules:

Price change: approval required
Delete item: approval required
Archive item: approval required
Availability update: approval required or manager approval
Description suggestion: owner can bulk approve
Photo upload: approval required
Offer publish: approval required
Google publish: approval required
Bulk update: approval required

Risk levels:

Low risk:
description draft
photo quality suggestion
menu health suggestion

Medium risk:
availability
offer expiry
category movement

High risk:
price change
delete/archive
bulk update
external publishing
allergen/nutrition claims
Agent 5: Publishing Agent

After approval, it updates every surface.

Publishing status should be visible:

QR menu: updated
Public menu: updated
Printable PDF: regenerated
WhatsApp menu: ready
Google: submitted
Delivery export: ready

The owner should see completion, not guess.

Agent 6: Verification Agent

After publishing, it checks if the change actually appeared.

Example:

Paneer Tikka price update verified on public menu.
Google update submitted; may take time to reflect.
Printable PDF regenerated.

This is where MenuList becomes operational, not just generative.

Agent 7: Memory Agent

Learns owner preferences:

Owner prefers short descriptions
Owner likes Hindi WhatsApp captions
Owner runs weekend specials
Owner usually restores sold-out items next morning
Owner changes prices on Mondays
Owner never wants AI to mention “homemade”
Outlet A has higher prices than outlet B

This becomes the long-term data moat.

Day-one owner experience
First 10 minutes
Owner signs up
↓
Uploads menu photo/PDF/WhatsApp text
↓
MenuList extracts structured menu
↓
MenuList asks only unclear questions
↓
Owner approves
↓
QR menu, public menu, WhatsApp menu, and printable menu are ready
↓
Menu Health score appears
↓
Agent Inbox shows next best fixes

The owner should feel immediate relief:

“My menu is online and organized.”

Daily usage
Owner: Cold coffee sold out

MenuList:
Mark Cold Coffee unavailable until tomorrow 10 AM?

Owner: Approve

MenuList:
Done. QR menu and public menu updated.
Owner: Add today special rajma chawal 129

MenuList:
Create Rajma Chawal under Today’s Special for ₹129?
Also create WhatsApp promo and QR menu badge?

Owner: Approve

MenuList:
Done.

The product becomes part of daily restaurant operations.

Weekly usage
MenuList:
This week:
- 3 items were marked sold out
- 7 price changes were made
- 2 offers expired
- 18 items still need photos
- Biryani was the most viewed item
- 11 customers searched for “momos”

Then:

Suggested actions:
- Add momos or mark not available
- Add photo for Biryani
- Extend lunch combo
- Fix missing descriptions

This keeps the owner engaged.

The day-one information architecture

The app should have only five main areas.

1. Home
Command box
Agent Inbox
Menu Health
Today’s activity
Quick share
2. Menu
categories
items
prices
variants
photos
availability
labels
outlet overrides
3. Publish
QR
public link
printable menu
WhatsApp menu
Google
delivery exports
4. Growth
offers
specials
combos
descriptions
photo improvements
customer searches
5. Control
staff
permissions
approvals
audit log
rollback
business settings

This keeps the product powerful without looking complicated.

The day-one data model

MenuList needs a serious backend from the start.

Core objects:

Business
Outlet
Menu
MenuVersion
Category
Item
Variant
ModifierGroup
Modifier
AddOn
Price
AvailabilityWindow
SoldOutStatus
Photo
Description
Label
Offer
Channel
ChannelSnapshot
PublishJob
ChangeProposal
Approval
AuditLog
RollbackSnapshot
StaffRole
OwnerPreference
MenuHealthIssue
Insight
CustomerSignal

The AI should never directly mutate the menu.

It should create:

ChangeProposal

Then after approval:

PublishJob

Then after publish:

VerificationResult

This makes the system safe and scalable.

Guardrails that must exist from day one

These are not optional.

Never change prices without approval.
Never delete directly; archive first.
Never invent ingredients.
Never invent allergens.
Never invent health claims.
Never publish externally without preview.
Always show before/after.
Always keep rollback.
Always log who approved.
Always ask when confidence is low.
Always separate draft from live.

Owner trust is the product.

One bad price update can destroy trust.

Differentiation
Against Google Business Profile

Google can help create or show a menu.

MenuList owns the menu operation.

Google = one discovery surface
MenuList = source of truth + updates + approval + publishing + monitoring
Against Uber Eats / delivery apps

Uber Eats can optimize its own marketplace menu.

MenuList is neutral.

Delivery app = platform-specific menu
MenuList = restaurant-owned master menu
Against Canva/menu design tools

Canva creates beautiful static menus.

MenuList manages living menus.

Canva = design
MenuList = operations
Against POS systems

POS menus are built for billing and kitchen operations.

MenuList menus are built for customers, discovery, sharing, QR, Google, and marketing.

POS = transaction menu
MenuList = customer-facing menu brain
Against QR menu builders

QR menu builders host a page.

MenuList keeps the menu accurate, improved, and synchronized.

QR menu = display
MenuList = AI menu control room
The product moat

The moat is not AI generation.

The moat is operational memory.

MenuList learns:

menu structure
owner language
item aliases
price history
seasonal specials
outlet differences
approval patterns
photo status
customer searches
menu views
offer performance
external menu drift
staff behavior
publishing history

Over time, MenuList becomes harder to replace because it understands the restaurant’s menu reality.

The owner should eventually think:

“MenuList knows my menu better than any staff member.”

That is the moat.

Pricing and packaging

For SMBs, keep pricing simple.

Do not sell ten tiny add-ons.

Sell the full operating system.

Single Outlet
One restaurant/cafe/cloud kitchen
Full MenuList OS
AI import
Agent Inbox
QR menu
public menu
WhatsApp menu
offers
menu health
photo workflow
audit log
basic insights
Multi Outlet
Everything in Single Outlet
master menu
outlet overrides
bulk updates
manager approvals
branch insights
central control
Agency / Reseller
manage many restaurants
client approvals
white-label exports
bulk onboarding
menu audits

The pricing metric should be:

per outlet per month

Because the owner understands outlet-based pricing.

Best customer segments

MenuList should focus on food SMBs where menus change often.

Strong segments:

cafes
cloud kitchens
biryani shops
sweet shops
bakeries
juice shops
QSR outlets
food trucks
small restaurants
thali/tiffin providers
multi-branch local chains

Less ideal early segments:

fine dining with rarely changing menus
large chains with heavy POS integrations
bars with complex alcohol compliance
hotels with custom enterprise systems

The best initial customer is:

A restaurant or cafe that already uses WhatsApp, QR, Google, and delivery apps, but does not have one clean source of truth.

GTM positioning

Do not lead with:

AI-powered QR menu

Lead with pain:

Wrong menu? Wrong price? Sold-out item still showing?
MenuList keeps your menu correct everywhere.

Strong hooks:

Update your menu in 10 seconds.
Upload menu photo, get QR menu instantly.
One menu for QR, Google, WhatsApp, print, and delivery exports.
Never show old prices again.
Create today’s special in one message.
Know what items customers are checking.

Sales demo should be simple:

1. Upload menu photo
2. MenuList creates menu
3. Type: “Cold coffee sold out”
4. Approve update
5. Public QR menu changes live
6. Type: “Add mango lassi 99”
7. MenuList creates item + WhatsApp promo

That demo sells the product.

Growth loops

MenuList can grow naturally through the menu itself.

QR loop

Customer scans QR.

Footer:

Powered by MenuList

Other restaurant owners see it.

WhatsApp loop

Owner shares menu link.

Customers forward it.

Other businesses discover it.

Staff loop

Owner sends photo upload link to staff.

Staff uses MenuList without account complexity.

Agency loop

Local marketing agencies can manage menus for many restaurants.

Menu audit loop

MenuList can offer a free audit:

Your menu has:
- 12 missing photos
- 8 missing descriptions
- 3 price mismatches
- 2 expired offers

This is a strong lead magnet.

The actual day-one product promise

Everything should ladder into this one promise:

MenuList is your always-on menu manager. It creates your menu, updates it from simple messages, improves missing content, publishes it across customer surfaces, monitors mistakes, and keeps a complete approval history.

That is bigger than QR.

That is bigger than AI import.

That is a real operating layer.

What the landing page should say
Hero
Your menu, always correct.
Subhero
Upload your menu once. Tell MenuList what changes.
Approve updates before they go live across QR, web, WhatsApp, print, and more.
Three proof blocks
Create
Upload a photo, PDF, or WhatsApp menu. MenuList builds a structured digital menu.

Update
Change prices, mark items sold out, add specials, and create offers by typing naturally.

Control
Approve every important change, publish everywhere, monitor mismatches, and roll back anytime.
CTA
Create my live menu

or

Send menu photo
The owner-facing language

Avoid:

agentic AI
LLM
workflow automation
semantic parser
vector matching
menu graph

Use:

MenuList understands your menu.
MenuList prepares the update.
You approve before it goes live.
Your QR menu stays fresh.
Your prices stay correct.
Your offers expire automatically.
Your staff can help safely.

Internally, it is agentic AI.

Externally, it is simple menu management.

Final blueprint

MenuList should be built around five permanent pillars:

1. Source of Truth
One master menu for the business.

2. Natural Updates
Owner updates menu by message, voice, photo, or upload.

3. Approval Inbox
AI prepares changes; owner approves important actions.

4. Publish and Monitor
Menu goes live across surfaces and MenuList checks for mismatch.

5. Improve and Grow
Descriptions, photos, offers, insights, and menu health improve revenue.

The long-term position is:

MenuList is the AI operating system for SMB menus.

The day-one product should feel complete:

Upload menu.
Menu goes live.
Tell MenuList changes.
Approve updates.
Publish everywhere.
Monitor accuracy.
Improve menu.
Create offers.
Track insights.
Control staff.
Rollback mistakes.

That is the right direction. Not a feature roadmap. A category-defining product.
```

### Message 13 - Assistant

- Message ID: 2f4c9bb0-10a1-4f21-bad8-3d3369a98ea1
- Model: gpt-5-5-pro
- Captured from scroll band: target-77000

```
I’ll stay anchored to MenuList as the AI Menu Ops platform, not a QR tool or chatbot. I’ll go deeper through owner experience first, then system behavior underneath.
```

### Message 14 - Assistant

- Message ID: b7e27102-8477-40cc-afa8-5d30f5ace162
- Model: gpt-5-5-pro
- Captured from scroll band: target-77000

```
Perfect. We lock the direction here:

MenuList is the AI Menu Ops platform for SMB food businesses.
The owner does not “use AI.”
The owner tells MenuList what changed. MenuList understands, prepares safe changes, shows consequences, gets approval, publishes, verifies, and remembers.

Everything below stays inside this exact product vision.

1. The deepest product idea

MenuList is not a menu editor.

It is a menu operating layer.

A normal menu tool asks the owner:

“Go to item. Edit price. Save. Publish. Share QR.”

MenuList should behave like:

“Tell me what changed. I will handle the menu work.”

That is the key mental shift.

The owner should not think in fields, categories, forms, variants, channels, schedules, photos, descriptions, and publishing surfaces.

The owner thinks in real-world events:

Milk price increased.
Tea price needs to go up.
Biryani sold out.
Weekend offer is over.
New mango item started.
Staff took photos.
Customer said price is wrong.
Google menu is old.
Lunch thali only available till 4 PM.

MenuList translates these messy business events into clean menu operations.

That is the core.

2. The owner-side promise

From the owner’s point of view, MenuList should make one promise:

“Your menu will not become outdated, confusing, or inconsistent.”

This breaks into five owner benefits:

I can update my menu quickly.
I do not need to learn a dashboard.
I approve important changes before they go live.
My menu looks better over time.
My QR, web, WhatsApp, print, and other menu surfaces stay aligned.

This is stronger than “AI menu generator.”

A generator helps once.

MenuList helps every day.

3. The system-side promise

From the system’s point of view, MenuList should behave like this:

Observe business/menu signals
↓
Understand what the owner means
↓
Resolve the exact menu objects involved
↓
Prepare structured change proposals
↓
Check risk and confidence
↓
Ask for approval or clarification
↓
Publish approved changes
↓
Verify the result
↓
Log everything
↓
Remember owner preferences

This loop is the heart of agentic menu ops.

Observe → Understand → Propose → Approve → Publish → Verify → Learn

Do not break this loop.

Every feature should fit into it.

4. The owner should feel like MenuList is a smart menu manager

The best behavior is not “chatbot behavior.”

The best behavior is manager behavior.

A chatbot says:

Sure, I can help you update your menu.

A smart menu manager says:

I found Masala Tea.
Current price is ₹15.
You want to change it to ₹20.

Approve?

A chatbot gives answers.

MenuList should prepare actions.

A chatbot waits.

MenuList should notice problems.

A chatbot forgets.

MenuList should remember patterns.

A chatbot says too much.

MenuList should show the next useful decision.

5. The owner’s real-world operating moments

To design MenuList properly, we should not start with screens.

We should start with moments.

SMB food owners interact with menus in specific pressure moments.

Moment 1: “I need to get my menu online.”

Owner has a printed menu, PDF, WhatsApp text, or delivery app screenshot.

They do not want to create items manually.

Owner action:

Uploads menu photo/PDF

MenuList behavior:

Extracts categories, items, variants, prices, add-ons
Finds uncertain parts
Asks only necessary confirmation questions
Builds public menu
Creates QR
Shows customer preview

Owner feeling:

This saved me hours.

Important smoothness improvement:

Do not show the owner a raw extraction table first. Show “Your menu is 85% ready. Please confirm these 6 things.”

That feels much easier.

Moment 2: “Something is sold out.”

This happens during rush.

Owner does not want a complex edit flow.

Owner says:

Cold coffee over

MenuList should understand that “over” means temporarily unavailable.

System response:

Mark Cold Coffee unavailable until tomorrow 10 AM?

[Approve] [Change time] [Cancel]

Important smoothness improvement:

Availability changes should default to temporary, not permanent.

Most sold-out items are not removed from the menu forever. They are unavailable for today.

So MenuList should not ask too much.

It should suggest:

Unavailable until next opening
Unavailable for today
Unavailable for 2 hours
Unavailable until manually restored

For SMBs, this is huge.

Moment 3: “Prices changed.”

This is high-risk.

Owner says:

Increase all tea by 5

MenuList behavior:

Found 4 tea items:

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

This changes customer-visible prices.

[Approve all] [Edit selected] [Cancel]

System principle:

Never change prices silently.

Price changes must always show before/after.

Important smoothness improvement:

For bulk price changes, always show affected item count first.

Example:

This will update 14 items.
View details?
Approve all?

Owners fear accidental bulk changes. Showing the count builds trust.

Moment 4: “I want to add today’s special.”

Owner says:

Add today special rajma chawal 129

MenuList should not just create one item.

It should understand this as a full menu operation.

System proposal:

Create item:
Rajma Chawal
Price: ₹129
Category: Today's Special
Availability: Today only
Badge: Today's Special
Placement: Top of menu

Also ready:
WhatsApp share text
Instagram caption
Counter display text
QR menu banner

Owner can approve the menu update and optionally use the promo kit.

Important smoothness improvement:

Every special should have an expiry by default.

SMB menus become messy because old offers stay live.

So MenuList should ask:

Should this expire tonight, this week, or stay until removed?

Better default:

Today’s special → expires tonight
Weekend special → expires Sunday night
Lunch offer → visible only during lunch time
Festival offer → expires on selected date
Moment 5: “Customer says menu is wrong.”

This is a painful moment.

Owner receives message:

Sir menu me price 99 hai, bill me 119 hai.

Owner should be able to forward or type:

Customer says burger price wrong

MenuList behavior:

I found Veg Burger:
MenuList price: ₹99
Last approved price change: none
Possible issue: price may be outdated.

What is correct price?
[₹99] [₹119] [Other]

After owner chooses:

Update Veg Burger to ₹119 across live menu?

Important smoothness improvement:

MenuList should keep price history and last approval source.

That means when something goes wrong, the owner can see:

Who changed this?
When?
From what value?
Where was it published?
Can I rollback?

This is not just admin functionality. It creates trust.

Moment 6: “Staff needs to help.”

Owners want staff to upload photos or mark items unavailable, but they do not want staff changing prices.

MenuList should support natural delegation.

Owner sends staff link:

Upload item photos

Staff opens simple page:

Take photo
Select item or let MenuList match
Submit

MenuList behavior:

Photo submitted for Paneer Tikka.
Quality: Good.
Owner approval needed before publishing.

For sold out:

Manager marked Chicken Biryani unavailable.
Owner approval not required because manager has stock permission.

For price:

Staff requested price change.
Owner approval required.

Important smoothness improvement:

Staff should be able to contribute without entering the full admin dashboard.

Give staff tiny task links:

Photo upload link
Sold-out link
Availability link
Correction request link

This protects the menu.

6. The owner’s home screen should not be a dashboard

It should be a decision room.

When the owner opens MenuList, they should not see charts first.

They should see:

What needs my attention today?
What changed?
Is my menu live and correct?
What can I fix quickly?

The home screen should feel like:

Good morning. Your menu is live.

Needs approval:
2 price updates
1 new photo
1 expired offer

Menu Health:
74/100

Today:
3 items unavailable
1 offer active
QR menu viewed 86 times

At the top:

Tell MenuList what changed...

This one box is the most important interface.

7. The three things the owner should always see

No matter how powerful the backend becomes, the owner interface should keep returning to three simple ideas.

1. Live Menu Status
Your menu is live.
Last updated 12 minutes ago.
QR and public link are synced.

This reassures the owner.

2. Agent Inbox
4 things need approval.

This keeps AI safe.

3. Quick Command
Tell MenuList what changed...

This makes the product easy.

Everything else can exist, but these three should dominate the experience.

8. The hidden system model

Behind the scenes, MenuList must treat the menu as a living business object.

Not as static content.

Every menu item should have state.

Example:

Item: Cold Coffee
Price: ₹99
Availability: Available
Photo: Missing
Description: Present
Labels: Veg, Cold
Visibility: QR, Public, WhatsApp, Print
Last changed: 2 days ago
Last approved by: Owner
Confidence: High

The system should understand that this item can move through states:

Draft
Needs confirmation
Pending approval
Live
Temporarily unavailable
Scheduled
Expired
Archived
Conflict detected
Rollback available

This matters because real menu operations are not only create/edit/delete.

They are:

temporarily hide
restore tomorrow
schedule next week
expire tonight
publish to one outlet
publish everywhere
keep in print but hide online
show in lunch only
show as sold out but visible
archive but keep history

A weak menu tool cannot handle this.

A true Menu Ops platform can.

9. How MenuList should decide what to do

The system should not treat all tasks equally.

Every owner input should be judged on two dimensions:

Confidence
Risk
Confidence

How sure is MenuList that it understood correctly?

Example high confidence:

Owner: Change Cold Coffee to 99
Menu has one item called Cold Coffee.

Example low confidence:

Owner: Tea 20
Menu has Masala Tea, Ginger Tea, Lemon Tea, Tea Flask.
Risk

How dangerous is it if wrong?

Low risk:

Draft description
Suggest photo
Find duplicate
Create unpublished offer draft

Medium risk:

Mark unavailable
Move category
Expire offer
Change availability timing

High risk:

Change price
Delete/archive item
Bulk update
Publish externally
Change allergen/nutrition/health claims

The behavior rule:

High confidence + low risk = prepare fast, maybe bulk draft
High confidence + medium risk = propose with simple approval
High confidence + high risk = show before/after and require approval
Low confidence + any meaningful risk = ask clarification

This is how the product stays useful without becoming dangerous.

10. The “ask vs propose” principle

MenuList should not ask questions too early.

Bad:

Owner: Add mango lassi 99

MenuList:
Which category?
Which description?
Which photo?
Which availability?
Which label?
Should this be featured?

That creates work.

Better:

I’ll add Mango Lassi under Beverages at ₹99.
I’ll mark it as Summer Special.
No photo yet.

Approve?

Ask only when needed.

The rule:

When the answer is obvious and low-risk, propose. When the answer is unclear and risky, ask.

This is very important for SMB smoothness.

Owners hate long setup forms.

They like approving prepared work.

11. The Agent Inbox card is the main product unit

Every meaningful AI action should become a card.

A card should answer five questions:

What did MenuList understand?
What will change?
Where will it appear?
How risky is it?
What can I do now?

Example:

Price Update

You said:
“Paneer tikka 199”

I found:
Paneer Tikka

Change:
₹179 → ₹199

Appears on:
QR menu
Public menu
WhatsApp menu
Printable PDF

[Approve] [Edit] [Cancel]

The card should not be technical.

Do not show:

intent_classification: price_update
confidence: 0.94
entity_resolution_id: item_923

Show owner language:

I’m confident this is Paneer Tikka.

For uncertainty:

I found 3 possible items. Which one did you mean?
12. MenuList should separate “drafting” from “going live”

This is one of the biggest trust principles.

AI can draft many things.

AI should not publish important things without approval.

Example:

MenuList can draft descriptions for 40 items.

But before going live:

Review 40 description improvements.
Approve all or edit selected.

Same for offers:

Create Weekend Combo draft.

But before publishing:

Publish this offer to live menu?

Important smoothness improvement:

Let owners approve in batches, but always allow edit selected.

Example:

Approve all 12 descriptions
Edit 3
Skip 2

This saves time without removing control.

13. MenuList should use “safe defaults”

Safe defaults are what make the flow feel intelligent.

Examples:

Sold out item

Default:

Unavailable until next opening

Not:

Hidden forever
Today’s special

Default:

Expires tonight

Not:

Stays live forever
New item

Default:

Visible on QR and public menu
No photo yet
Placed in likely category
Price change

Default:

Requires owner approval
Staff photo

Default:

Needs owner approval before live
Delete item

Default:

Archive, not delete

These defaults are not small UX details. They are core to trust.

14. The menu should have memory

This is where MenuList becomes hard to replace.

MenuList should remember:

Owner calls Masala Tea “chai”
Owner calls Chicken Biryani “CB”
Owner usually restores sold-out items next morning
Owner prefers short item descriptions
Owner likes Hindi WhatsApp promo text
Owner runs lunch thali Monday to Friday
Weekend combo usually expires Sunday night
This outlet has higher prices
This item is a bestseller
This item should always stay visible even if unavailable

Then the product becomes smoother over time.

Example:

First time:

Owner: Chai 20

MenuList:
Did you mean Masala Tea?

Next time:

Owner: Chai 25

MenuList:
Masala Tea ₹20 → ₹25. Approve?

That is real intelligence.

15. The system should understand item aliases

SMB owners do not always use exact menu names.

Their menu might say:

Masala Tea

Owner says:

chai
tea
cutting
masala chai

MenuList should map these to the right item.

For food:

Paneer Butter Masala = PBM
Chicken Biryani = CB
Veg Fried Rice = VFR
Cold Coffee = cold coffee / coffee / cold

Important smoothness improvement:

Create owner-specific aliases automatically.

When the owner confirms once, remember it.

You said “PBM”. Should I remember this as Paneer Butter Masala?

After that, updates become faster.

16. The menu should understand time

Menus are time-based.

Not everything is simply available or unavailable.

MenuList should support:

breakfast only
lunch only
dinner only
weekend only
today only
seasonal
limited stock
after 4 PM
before 11 AM
Monday-Friday
festival dates

Owner command:

Pav bhaji only after 4

MenuList proposal:

Set Pav Bhaji availability:
Every day, after 4 PM

[Approve] [Edit]

Owner command:

Lunch thali 12 to 4

MenuList proposal:

Show Lunch Thali from 12 PM to 4 PM daily.
Hide outside that time or show as unavailable?

[Hide outside time] [Show unavailable] [Edit]

Important smoothness improvement:

Ask how unavailable timed items should appear.

Some owners want items hidden outside timing.

Some want them visible with “Available after 4 PM.”

MenuList should remember that preference.

17. Publishing should feel like one action

The owner should not think:

Update QR
Update website
Update PDF
Update WhatsApp
Update Google
Regenerate print

They should think:

Menu updated.

After approval, MenuList should show:

Done.

Updated:
QR menu
Public menu
WhatsApp menu
Printable PDF

Needs manual action:
Delivery app export ready

This is important.

Even when direct publishing is not possible, MenuList should reduce the work.

Example:

Swiggy direct update not connected.
I created an export image and update checklist.

Important smoothness improvement:

Show publishing status per surface in plain language.

Not:

job_completed: true

But:

QR menu updated
Google submitted
Printable PDF regenerated
Delivery export ready
18. Verification is where MenuList becomes different

Most tools stop after “saved.”

MenuList should continue:

Was it actually published?
Is the live customer menu showing the new value?
Does another menu surface still show old value?

Example:

Paneer Tikka changed to ₹199.
Verified on QR menu.
Verified on public link.
Printable PDF regenerated.
Google update submitted.

If mismatch:

QR menu updated, but printable PDF still has old price.
Regenerate now?

This creates a feeling of reliability.

Important smoothness improvement:

Always give the owner a completion receipt.

Example:

Done. Cold Coffee is unavailable until tomorrow 10 AM.
Rollback available.

This makes owners trust the system.

19. Drift detection should be owner-friendly

Drift means different menu surfaces show different information.

But do not use the word “drift” to owners too often.

Owner-friendly language:

Possible mismatch found.

Example:

Possible mismatch:

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

Which is correct?

System should not assume external source is correct.

MenuList is source of truth unless owner says otherwise.

Important smoothness improvement:

When mismatch is found, ask “Which is correct?” instead of saying “Update this.”

That respects the owner’s authority.

20. The menu health system should create action, not guilt

A score is useful only if it leads to simple fixes.

Bad:

Menu Health 62/100

Owner thinks:

So what?

Good:

Menu Health 62/100

Fix 5 things:
Add photos to bestsellers
Add veg/non-veg labels
Remove expired offer
Fix duplicate Chicken Roll
Add missing price for Fresh Lime Soda

Even better:

Fix in 3 minutes

Important smoothness improvement:

Prioritize fixes by business impact, not by technical completeness.

For example, missing photo on a bestseller matters more than missing description on a rarely viewed item.

So MenuList should say:

Start here:
Chicken Biryani has 86 views but no photo.
Add photo?

This makes the health score useful.

21. MenuList should act like a memory-backed checklist

SMB owners are busy. They forget.

MenuList should remember and gently remind.

Examples:

Cold Coffee was marked unavailable yesterday. Restore now?
Weekend Combo expires tonight. Extend or remove?
You added Mango Lassi last week as a summer item. Keep active?
7 staff photos are waiting for approval.
Your printable menu is 12 days older than your QR menu. Regenerate?

Important smoothness improvement:

Reminders should be tied to menu operations, not generic notifications.

Bad:

Improve your menu today!

Good:

Your Lunch Combo expired yesterday. Remove or extend?

Specific reminders get action.

22. The system should understand “scope”

Every command has a scope.

Scope means:

Which item?
Which category?
Which outlet?
Which surface?
Which time?
Which customer view?

Owner says:

Increase paneer by 20

System must resolve:

All items containing paneer?
Only Paneer category?
All outlets?
Only current outlet?
Permanent or temporary?

But it should not ask all questions every time.

It should infer likely scope and show it clearly:

I found 7 paneer items in this outlet.
Increase each by ₹20?

[Approve] [All outlets] [Edit selected]

For multi-outlet:

Apply to:
Current outlet only
All outlets
Selected outlets

Important smoothness improvement:

Always show scope before approval.

Many expensive mistakes happen because the owner thinks they are changing one outlet, but the system changes all outlets.

23. Multi-outlet should feel simple, not enterprise-heavy

For a single outlet owner, multi-outlet should not be visible.

For a multi-outlet owner, MenuList should support:

Master menu
Branch-specific prices
Branch-specific sold-out status
Branch-specific offers
Central approval
Manager requests
Bulk update with exceptions

Owner command:

Increase dosa to 119 all branches except Indiranagar

MenuList proposal:

Update Masala Dosa:

Koramangala ₹99 → ₹119
HSR ₹99 → ₹119
Whitefield ₹109 → ₹119
Indiranagar unchanged

[Approve]

Important smoothness improvement:

Use “all except” logic naturally.

Owners think like that.

They do not want to select 11 checkboxes.

24. MenuList should make rollback obvious

Mistakes will happen.

The difference between a trusted system and a scary system is rollback.

After every change:

Done. Undo available.

For larger changes:

Bulk price update completed.
14 items changed.
Rollback all changes?

For published changes:

Restore previous menu version?

Important smoothness improvement:

Rollback should be visible immediately after high-risk actions.

This reduces fear and increases adoption.

Owners will approve more confidently when they know they can undo.

25. The system should not over-automate trust-sensitive work

This is critical.

MenuList should be agentic, but not reckless.

The product should not say:

AI automatically manages your menu.

That sounds dangerous.

Better:

MenuList prepares updates. You stay in control.

The boundary:

AI can detect
AI can draft
AI can suggest
AI can prepare
AI can schedule after approval
AI can publish after approval
AI can verify
AI can remind

But:

AI should not silently change prices
AI should not silently delete items
AI should not invent ingredients
AI should not publish risky claims
AI should not override owner decisions

Owner trust is more valuable than automation speed.

26. The owner’s language should drive the system

MenuList should support natural owner language.

Not only English.

Owners may type mixed language:

chai 20 kar do
biryani khatam
paneer items 20 badhao
mango lassi add karo 99
aaj ka special rajma chawal
coffee kal tak unavailable

System should map intent:

price update
availability update
bulk price update
new item
today special
temporary unavailability

Important smoothness improvement:

MenuList should accept messy, mixed-language, shorthand commands.

This will matter a lot for SMB adoption.

A polished English-only assistant will fail with real owners.

27. The system should show customer preview before publishing

Owners care about how customers see it.

Before approval, show:

Before
Paneer Tikka ₹179

After
Paneer Tikka ₹199

For offers:

Customer preview:
Today's Special
Rajma Chawal ₹129
Available today only

For sold-out:

Customer preview:
Cold Coffee
Unavailable today

Important smoothness improvement:

Show customer view, not admin view.

Owners make faster decisions when they see what the customer will see.

28. MenuList should understand visibility

Some items should be hidden when unavailable.

Some should remain visible as sold out.

Example:

Chicken Biryani
Unavailable today

This can still create demand.

But for a limited-time item:

Mango Shake

Maybe owner wants it hidden when unavailable.

MenuList should support visibility choices:

Show as unavailable
Hide from menu
Show available after time
Show only to staff
Keep in print but hide online

Important smoothness improvement:

Availability and visibility are different.

Many menu systems mix them.

MenuList should not.

29. MenuList should understand “menu surfaces”

The same master item may appear differently across surfaces.

Example:

QR menu:
Full description + photo

WhatsApp menu:
Short text

Print menu:
Compact layout

Google:
Structured item name, price, description

Instagram:
Promotional caption

Owner should not manage these separately.

System should convert one master item into surface-specific formats.

Example:

Owner adds:

Mango Lassi ₹99

MenuList generates:

QR item
WhatsApp line
Print layout entry
Promo caption
Search-friendly description

Important smoothness improvement:

One menu truth, many surface formats.

This is central to long-term positioning.

30. The system should treat print as a living output too

Many SMBs still use printed menus.

So MenuList should not ignore print.

When prices change:

Printable menu is outdated.
Regenerate PDF?

When QR changes:

QR code remains same.
Menu content updated.

When many prices change:

You changed 18 prices.
Your printed menu may now be outdated.
Create updated print PDF?

Important smoothness improvement:

Tell owners when offline materials are now stale.

This is a real SMB pain.

31. The photo workflow should be operational, not decorative

Many AI products focus on generating beautiful food photos.

For SMB trust, the first job is managing real photos.

Photo Agent should help with:

Which items need photos?
Who can take them?
Which uploaded photo matches which item?
Is the photo usable?
Does owner approve?
Where should it publish?

Owner flow:

MenuList:
10 best-selling/viewed items need photos.

Send photo task to staff?

[Send WhatsApp link]

Staff flow:

Take photo
MenuList suggests item match
Submit

Owner flow:

3 photos waiting:
Paneer Tikka - good
Cold Coffee - dark
Veg Thali - multiple dishes

[Approve good] [Ask retake] [Crop]

Important smoothness improvement:

Do not make photo collection an owner-only job.

MenuList should turn it into staff tasks.

32. Description writing should be safe and useful

Descriptions help the menu look professional, but wrong descriptions can create customer complaints.

MenuList should write only what it can safely infer.

Safe:

Fresh Lime Soda
Refreshing lime soda served chilled.

Risky:

Made with organic lemons and Himalayan salt.

Unless owner confirms, do not invent.

System should ask ingredient confirmation only when useful.

Example:

Paneer Roll

Suggested:
Soft roll filled with paneer and house-style seasoning.

Optional details:
Add onion?
Add capsicum?
Add cheese?
Add chutney?

Important smoothness improvement:

Use “safe descriptions” by default and “rich descriptions” only after owner confirmation.

This protects trust.

33. The menu should learn from customer behavior

MenuList should not show analytics for the sake of analytics.

It should convert customer behavior into menu actions.

Bad:

Views: 1,248
CTR: 4.2%
Engagement: 17%

Good:

Chicken Biryani is your most viewed item but has no photo.
Add photo?
Customers searched “momos” 14 times.
You do not have momos listed.
Add item or ignore?
Lunch Combo gets many views after 3 PM, but it is hidden after 2 PM.
Extend timing?

Important smoothness improvement:

Every insight should lead to a recommended menu action.

Owners do not want dashboards. They want decisions.

34. The system should have a “daily menu ritual”

MenuList should become part of opening and closing.

Opening ritual
Good morning.

Yesterday unavailable:
- Cold Coffee
- Chicken Biryani

Restore now?

Offers:
Weekend Combo expires tonight.

Photos:
2 staff photos waiting.
Closing ritual
Today’s summary:

3 items updated
2 items sold out
1 offer created
QR menu viewed 126 times
Most viewed item: Paneer Roll

Tomorrow:
Restore sold-out items?
Extend today’s special?

Important smoothness improvement:

Opening and closing cards are better than random notifications.

Restaurants already operate around opening and closing routines.

MenuList should fit that rhythm.

35. MenuList should behave differently during rush hours

During rush hours, owners need speed.

The interface should become simpler.

Rush mode commands:

Sold out
Restore
Hide
Add special
Change price

For common actions, show large tap buttons.

Example:

Mark item unavailable
Restore item
Today’s special
Price change

Important smoothness improvement:

During business hours, reduce text and increase one-tap actions.

Do not show long improvement suggestions during lunch rush.

Show urgent operational actions.

Menu improvement can wait until slower hours.

36. The system should know when not to interrupt

AI products often become noisy.

MenuList should be careful.

Do not notify for every small thing.

Notify when:

customer-facing menu may be wrong
offer expired
sold-out item should be restored
high-view item missing photo
price mismatch found
approval pending for important update

Do not notify loudly for:

minor description suggestion
low-impact formatting issue
rarely viewed item missing photo
optional marketing idea

Important smoothness improvement:

Notifications should be based on urgency and business impact.

This keeps MenuList useful instead of annoying.

37. How the system should handle uncertainty

Uncertainty should be visible, but not technical.

Bad:

Confidence 0.61

Good:

I’m not sure which item you mean.

Example:

You said “burger 119.”

I found:
- Veg Burger
- Cheese Burger
- Chicken Burger

Which one?

After owner chooses:

Remember “burger” as Veg Burger?

Important smoothness improvement:

Turn clarifications into memory.

Every question should make the system better next time.

38. MenuList should have “correction intelligence”

Owners will correct the system.

The system should not just accept correction. It should learn.

Example:

MenuList:
Add Mango Lassi under Desserts?

Owner:
No, Beverages.

System memory:
Mango Lassi and similar drinks should go under Beverages.

Example:

MenuList:
Description: spicy paneer curry.

Owner:
Don’t say spicy.

System memory:
Avoid spice claims unless label exists.

Important smoothness improvement:

Every owner edit should become a preference signal.

That is how MenuList becomes smoother over time.

39. The system should protect the owner from staff mistakes

This is a major SMB need.

Scenario:

Staff uploads wrong photo.

MenuList:

This photo may not match Paneer Tikka.
It looks like a curry dish.
Approve anyway?

Scenario:

Manager tries to delete bestseller.

MenuList:

This item is one of your most viewed items.
Archive instead of delete?
Owner approval required.

Scenario:

Staff changes price.

MenuList:

Price change requires owner approval.
Proposal sent to owner.

Important smoothness improvement:

Use role-based approval plus AI risk detection.

Permissions alone are not enough.

The system should notice risky staff actions.

40. The system should understand “temporary vs permanent”

This is one of the most important theoretical distinctions.

Many menu actions are temporary:

sold out today
seasonal item
festival offer
lunch only
weekend only
staff photo pending

Some are permanent:

price changed
item renamed
category reorganized
new regular item
old item archived

MenuList should always infer this.

Owner says:

Cold coffee not available

System should assume temporary.

Owner says:

Remove cold coffee from menu

System should ask:

Archive permanently or mark unavailable?

Important smoothness improvement:

When intent could mean temporary or permanent, ask.

This prevents accidental deletion.

41. The system should protect the source of truth

MenuList is the canonical menu.

External surfaces may be stale, wrong, or edited by someone else.

So when mismatch appears, MenuList should not blindly overwrite itself.

Example:

Google shows Paneer Tikka ₹179.
MenuList shows ₹199.

Which is correct?

Owner decides.

After decision:

MenuList remains source of truth.
Google update submitted.

Important smoothness improvement:

External mismatch should create a decision, not an automatic overwrite.

This keeps MenuList authoritative.

42. The “approval” should not feel heavy

Approval can become annoying if every tiny thing needs a tap.

So approval must be smart.

Use approval levels:

Explicit approval
Batch approval
Pre-approved rule
Manager approval
Draft-only
Auto-expiry after prior approval

Example:

Owner creates today’s special and approves expiry tonight.

At night, MenuList can remove it automatically because the expiry was part of the approved proposal.

This is safe.

Example:

Owner says:

For sold-out items, restore next morning automatically.

MenuList can remember that as a rule.

Important smoothness improvement:

Let owners approve rules, not just actions.

This reduces daily taps while keeping control.

Example:

Always restore sold-out beverages next morning?

Owner approves once.

Then system can follow that rule.

43. Rules are different from autonomy

This distinction matters.

Bad autonomy:

AI changed your menu by itself.

Good rule-based control:

You approved this rule:
Sold-out items restore next morning.

Cold Coffee restored at 10 AM.

This feels safe because the owner set the rule.

MenuList should gradually convert repeated approvals into optional rules.

Example:

You usually approve staff photos after quality check.
Should staff photos marked “good” go live automatically after manager approval?

Owner can say yes or no.

Important smoothness improvement:

Repeated actions should become suggested rules.

This is how agentic ops becomes smoother without becoming scary.

44. The system should speak in consequences

Before approval, MenuList should not only show the change.

It should show the consequence.

Example:

Change:
Cold Coffee will be unavailable.

Customer impact:
Customers can still see it, but cannot order/request it today.

Example:

Change:
Paneer Tikka ₹179 → ₹199.

Customer impact:
New price appears on QR, public menu, WhatsApp menu, and print PDF after regeneration.

Example:

Change:
Weekend Combo will expire.

Customer impact:
It will no longer appear under Offers.

Important smoothness improvement:

Owners approve faster when consequences are clear.

45. MenuList should have strong audit memory

Every action should answer:

What changed?
Who approved?
When?
From where?
Where was it published?
Can it be undone?

Owner view:

History:
12:41 PM - Cold Coffee marked unavailable by Manager Ravi
12:42 PM - Published to QR menu
12:43 PM - Verified live
Rollback available

For price:

Yesterday 7:10 PM
Paneer Tikka ₹179 → ₹199
Approved by Owner
Published to QR, public menu, WhatsApp

Important smoothness improvement:

Use plain-language history, not technical logs.

Owners should be able to understand the audit trail.

46. The system should treat menu changes as jobs

Internally, every operation should become a job.

Owner does not need to see technical job IDs, but the system should behave as if each operation has lifecycle.

Example:

Job: Update Cold Coffee availability

Status:
Proposal created
Owner approved
QR menu updated
Public menu updated
Verification complete

Owner-facing:

Done. Cold Coffee is unavailable until tomorrow 10 AM.

For longer jobs:

Publishing to Google may take time.
I’ll keep checking.

Important smoothness improvement:

Long-running actions need status, not silence.

This avoids owner confusion.

47. MenuList should make the live customer menu feel premium

The customer-facing menu matters.

Even though we are focusing on owner ops, customer experience is part of the product promise.

The AI should improve:

category order
bestseller badges
today special placement
photos
descriptions
availability labels
search
veg/non-veg filters
spice labels
language
mobile readability

But owner should not manually optimize all this.

MenuList should suggest:

Move Today’s Special to top?
Add Bestseller badge to Chicken Biryani?
Hide empty categories?
Group beverages better?

Important smoothness improvement:

Improve customer menu presentation through owner-approved suggestions.

Not just manual design.

48. MenuList should not overwhelm new owners

Because everything exists from day one, the product must still feel simple.

The trick is not to hide capabilities by “versions.”

The trick is to reveal only what matters now.

For a new owner:

Upload menu
Confirm unclear items
Publish QR

For a daily owner:

Tell MenuList changes
Approve updates

For a growing owner:

Staff tasks
Multi-outlet control
Drift monitoring
Insights

Same platform. Same operating loop. Different visible attention.

Important smoothness improvement:

Use progressive attention, not progressive product capability.

The system is complete from day one, but the owner only sees what is useful in the moment.

49. What MenuList should never become

This is important to protect positioning.

MenuList should not become:

A generic chatbot
A simple QR menu host
A Canva-style menu designer only
A restaurant website builder only
A POS replacement
A delivery app menu editor only
A one-time AI OCR importer
A social media content generator with menu features

Those are smaller categories.

MenuList is:

The living source of truth and operating system for customer-facing menus.

Everything else supports that.

50. The theoretical model in one sentence

The owner gives MenuList messy business truth.

“Biryani over.”
“Tea 20.”
“Add mango lassi.”
“Weekend offer remove.”
“Staff uploaded photo.”

MenuList converts that into safe, structured, approved menu operations.

Understand
Resolve
Propose
Approve
Publish
Verify
Remember

That is the product.

51. The most important smoothness ideas to lock now

These are not small features. They are core to making SMB owners love the product.

1. Temporary by default for sold-out items

Sold out should not mean deleted.

Unavailable until next opening
2. Expiry by default for specials

Specials should not live forever.

Today’s special expires tonight.
3. Approval cards, not chat replies

AI should prepare actions.

Approve / Edit / Cancel
4. Customer preview before publishing

Owners should see what customers will see.

5. Staff task links

Staff should help without entering the full dashboard.

6. Aliases and shorthand memory

Owner says “chai,” MenuList remembers it means Masala Tea.

7. Scope preview

Always show whether change affects one item, many items, one outlet, or all outlets.

8. Completion receipt

After every important change:

Done. Updated on QR and public menu. Rollback available.
9. Menu health based on business impact

Fix bestsellers first, not random missing fields.

10. Suggested rules from repeated approvals

MenuList becomes smoother by turning repeated actions into owner-approved rules.

52. The final owner experience we should design toward

The ideal owner experience is this:

Owner opens MenuList.

MenuList:
Your menu is live.
2 updates need approval.
1 offer expires tonight.
3 staff photos are waiting.
Cold Coffee was unavailable yesterday. Restore?

Owner types:
Add mango lassi 99 today special

MenuList:
Create Mango Lassi ₹99 under Today’s Special.
Available today only.
Show at top of menu.
Create WhatsApp text also?

Owner taps Approve.

MenuList:
Done.
QR menu updated.
Public menu updated.
WhatsApp text ready.
Offer expires tonight.
Rollback available.

This is the whole product philosophy.

No complicated dashboard.

No AI gimmick.

No manual menu work.

Just menu operations handled safely.

53. The system behavior we should never compromise

MenuList must always behave with these principles:

Owner controls the business decision.
MenuList does the menu work.
AI prepares; owner approves.
Every change has before/after.
Every risky action has scope.
Every published action has verification.
Every important change has rollback.
Every correction becomes memory.
Every insight becomes action.
Every surface comes from one menu truth.

That is the foundation.

Next, the natural layer is to define the exact owner flows and system states for each major operation: import, price update, availability, offer, photo, description, publishing, mismatch, staff action, and rollback.
```

### Message 15 - Assistant

- Message ID: 2182ff32-240f-4bf1-913f-0454261db370
- Model: gpt-5-5-pro
- Captured from scroll band: target-147000

```
We’ll go one layer deeper now: not screens or database specs yet, but the exact operating behavior behind each owner moment. I’ll keep it anchored to the same MenuList OS vision.
```

### Message 16 - Assistant

- Message ID: a0d8e27a-6632-4e7a-adcf-4b8d1aef4daf
- Model: gpt-5-5-pro
- Captured from scroll band: target-147000

```
Now we go one level deeper: exact owner flows + exact system behavior.

This is not a roadmap. This is the day-one operating model of MenuList as the full AI Menu Ops platform.

The core idea remains:

Owner gives messy business input. MenuList turns it into safe, structured, approved menu operations.

1. The universal MenuList operation model

Every action in MenuList should follow the same hidden structure.

The owner may say:

Tea 20
Biryani over
Add mango lassi 99
Remove weekend offer
Staff uploaded photo
Google menu price wrong

But MenuList should convert every input into the same operation pattern:

Input
↓
Intent
↓
Entity
↓
Scope
↓
Time
↓
Risk
↓
Proposal
↓
Approval
↓
Publish
↓
Verify
↓
Log
↓
Memory

This is the true engine.

Example

Owner says:

Cold coffee over

MenuList interprets:

Input: owner command
Intent: availability_update
Entity: Cold Coffee
Scope: this outlet
Time: until next opening
Risk: medium
Proposal: mark unavailable
Approval: required
Publishing: QR, public menu, WhatsApp menu
Verification: check live menu
Memory: owner usually restores beverages next morning

Owner only sees:

Mark Cold Coffee unavailable until tomorrow 10 AM?

[Approve] [Change time] [Cancel]

The system handles the rest.

2. The Menu Operation Grammar

This is important theoretically.

MenuList should understand that every owner command has six hidden parts.

Action
Object
Value
Scope
Time
Surface
Example 1
Increase all tea by 5

Hidden structure:

Action: increase price
Object: all tea items
Value: +₹5
Scope: current outlet
Time: permanent
Surface: all live menu surfaces
Example 2
Momos not available today

Hidden structure:

Action: mark unavailable
Object: momos items
Value: unavailable
Scope: current outlet
Time: today
Surface: customer menu
Example 3
Add rajma chawal 129 today special

Hidden structure:

Action: create item
Object: Rajma Chawal
Value: ₹129
Scope: current outlet
Time: today only
Surface: menu + offer placement + share text

The owner should never fill these fields manually unless needed.
MenuList should infer them, then show the result.

3. The three system questions behind every command

MenuList should silently answer these three questions:

Question 1: What does the owner want?

This is intent.

price_update
availability_update
new_item
new_offer
archive_item
photo_update
description_update
publish_update
drift_resolution
staff_request
rollback
Question 2: What exactly is affected?

This is entity resolution.

Which item?
Which category?
Which variant?
Which outlet?
Which offer?
Which photo?
Which surface?
Question 3: Is it safe to do?

This is risk and policy.

Can we prepare?
Can we auto-draft?
Can we ask manager?
Does owner approval need to happen?
Should we ask clarification?
Should we block?

This is the heart of the system behavior.

4. Flow 1: New menu creation/import

This is the owner’s first experience.

Owner POV

Owner has some messy menu source:

printed menu photo
PDF
Excel
WhatsApp text
delivery-app screenshot
old website menu
social media menu image

Owner does not want to create categories and items manually.

Owner action:

Uploads menu

MenuList should not say:

Processing...

It should say:

I’m building your live menu from this.

Then:

Your menu is 87% ready.

I found:
8 categories
94 items
31 variants
12 add-ons
6 unclear prices

Please confirm these 6 things.

This is smoother than throwing a spreadsheet at the owner.

System behavior

The system should do five jobs.

Extract
Structure
Normalize
Detect uncertainty
Prepare menu draft
Extract

Read item names, prices, category headings, variants, add-ons, notes.

Structure

Convert messy input into MenuList structure.

Category → Item → Variant → Price → Add-ons → Labels
Normalize

Clean inconsistencies.

Example:

Paneer tikka
paneer Tikka
PANEER TIKKA

becomes:

Paneer Tikka
Detect uncertainty

MenuList should not guess when the input is ambiguous.

Example:

Chicken Biryani 180/300

Possible meanings:

Half/Full
Regular/Family
Small/Large

MenuList asks:

For Chicken Biryani 180/300, what do these prices mean?

[Half ₹180 / Full ₹300]
[Regular ₹180 / Family ₹300]
[Small ₹180 / Large ₹300]
Prepare menu draft

The owner sees a preview, not raw data.

Your customer menu preview is ready.
Important system states
import_uploaded
import_processing
import_extracted
needs_confirmation
draft_menu_ready
owner_reviewing
approved
published
verified
Smoothness idea to lock

Ask only the questions that block publishing. Everything else can become a later Menu Health task.

For example, missing photos should not block launch.

Bad:

Please add photos for all items before publishing.

Good:

Your menu can go live now. 18 items need photos later.

This helps SMB owners launch fast.

5. Flow 2: Single price update

Price updates are high-trust operations.

Owner POV

Owner says:

Paneer tikka 199

or:

Change paneer tikka to 199

MenuList responds:

I found Paneer Tikka.

Price change:
₹179 → ₹199

This will update:
QR menu
Public menu
WhatsApp menu
Printable PDF

[Approve] [Edit] [Cancel]

Owner taps approve.

MenuList replies:

Done. Paneer Tikka is now ₹199.
QR and public menu updated.
Printable PDF regenerated.
Rollback available.
System behavior

The system should do:

Detect price intent
Resolve item
Check old price
Create proposal
Mark risk high
Require approval
Publish after approval
Verify live result
Log price history
Important system states
command_received
item_resolved
proposal_created
pending_owner_approval
approved
menu_updated
publishing
published
verified
rollback_available
Smoothness idea to lock

For price changes, always show old price and new price.

Never show only:

Change Paneer Tikka to ₹199?

Always show:

₹179 → ₹199

The before/after makes the owner feel safe.

6. Flow 3: Bulk price update

Bulk price changes are powerful but dangerous.

Owner POV

Owner says:

Increase all paneer items by 20

MenuList should not immediately ask for approval. It should first show scope.

I found 7 paneer items in this outlet.

This will update:
Paneer Tikka ₹179 → ₹199
Paneer Roll ₹99 → ₹119
Paneer Butter Masala ₹249 → ₹269
Paneer Momos ₹120 → ₹140
Paneer Pizza ₹199 → ₹219
Paneer Paratha ₹89 → ₹109
Paneer Fried Rice ₹159 → ₹179

Apply to:
Current outlet only

[Approve all] [Edit selected] [Change scope] [Cancel]

If multi-outlet:

Apply to:
Current outlet
All outlets
Selected outlets
System behavior

The system should:

Detect bulk update intent
Find matching items
Classify match strength
Separate exact matches from possible matches
Show affected count
Show before/after
Require explicit approval
Log all item-level changes
Allow rollback as one group

The rollback must be grouped.

Owner should not have to undo seven items one by one.

Bulk update completed.
7 items changed.
Rollback all 7?
Smoothness idea to lock

Bulk operations need a “change group.”

Internally, all affected changes should share one operation ID.

Example:

operation_id: bulk_price_update_2026_06_17_1420

Owner-facing:

Bulk price update: 7 items

This makes rollback, history, and audit much cleaner.

7. Flow 4: Sold-out / temporary unavailability

This is one of the most frequent daily actions.

Owner POV

Owner says:

Biryani over

MenuList should understand “over” as sold out.

Response:

I found 3 biryani items:

Veg Biryani
Chicken Biryani
Mutton Biryani

Mark all unavailable until tomorrow 11 AM?

[Approve all] [Select items] [Change time] [Cancel]

If only one item matches:

Mark Chicken Biryani unavailable until tomorrow 11 AM?

[Approve] [Change time] [Cancel]
System behavior

The system should:

Detect availability intent
Resolve item or group
Infer temporary duration
Suggest restore time
Keep item visible or hidden based on owner preference
Publish unavailable state
Schedule restore reminder or auto-restore rule
Verify customer menu
Important states
available
temporarily_unavailable
scheduled_restore
restored
manually_restored
expired_unavailability
Smoothness idea to lock

Sold-out should default to temporary until next opening.

This prevents menu damage.

Bad behavior:

Hide Biryani permanently

Good behavior:

Unavailable until tomorrow
8. Flow 5: Restore unavailable items

Restoring is as important as marking sold out.

Owner POV

Morning opening card:

Good morning.

These items were unavailable yesterday:
Cold Coffee
Chicken Biryani
Veg Momos

Restore now?

[Restore all] [Select items] [Keep unavailable]

Owner taps restore.

MenuList replies:

Done. 3 items are available again.
System behavior

The system should:

Track temporary unavailability
Know business opening time
Create morning restore card
Respect auto-restore rules
Publish restored status
Log restoration
Smoothness idea to lock

The system should prevent “forgotten sold-out” items.

Many restaurants forget to re-enable items. This directly loses sales.

A simple restore card is extremely valuable.

9. Flow 6: Add new regular item

This is different from a special.

Owner POV

Owner says:

Add cheese garlic bread 149

MenuList proposes:

Create new item:

Name: Cheese Garlic Bread
Category: Starters
Price: ₹149
Description: Toasted garlic bread topped with cheese.
Photo: Missing
Visibility: Live menu

[Approve] [Edit] [Cancel]

If category is uncertain:

Where should I place Cheese Garlic Bread?

Suggested: Starters

[Use Starters] [Choose category]
System behavior

The system should:

Detect new item intent
Infer category
Generate safe description
Set price
Set default availability
Check duplicate names
Prepare proposal
Require approval
Publish
Add photo task if missing
Smoothness idea to lock

Adding an item should create a follow-up photo task automatically.

After approval:

Cheese Garlic Bread is live.
Photo missing. Send staff photo task?

This keeps the menu improving without blocking the owner.

10. Flow 7: Add today’s special

Specials are time-bound revenue actions.

Owner POV

Owner says:

Today special rajma chawal 129

MenuList should understand:

This is not just a new item.
This is a time-bound featured item.

Proposal:

Create Today’s Special:

Rajma Chawal
₹129
Available today only
Show at top of menu
Badge: Today’s Special
Expires tonight at closing

Also prepared:
WhatsApp message
Instagram caption
Counter display text

[Approve menu update] [Edit] [Cancel]

After approval:

Done. Rajma Chawal is live under Today’s Special.
It will expire tonight at closing.
WhatsApp message is ready.
System behavior

The system should:

Detect special intent
Create item or offer
Assign time-bound availability
Set expiry
Set featured placement
Prepare share assets
Schedule expiry/removal
Publish
Verify
Important states
draft_special
active_special
scheduled_expiry
expired
extended
converted_to_regular_item
archived
Smoothness idea to lock

Every special should have an expiry by default.

This prevents stale offers.

Also, after a special performs well, MenuList can ask:

Rajma Chawal got high views today.
Add it as a regular item?

That is a very strong SMB-friendly intelligence layer.

11. Flow 8: Create offer/combo

Offers are slightly different from specials.

A special is often one item.
An offer may combine existing items, discount, timing, and marketing.

Owner POV

Owner says:

Create lunch combo for office people

MenuList proposes:

Offer idea:

Office Lunch Combo
Veg Thali + Buttermilk
Combo price: ₹149
Timing: Monday to Friday, 12 PM - 4 PM
Placement: Top of Lunch section
Badge: Lunch Combo
Expiry: Friday evening

Customer preview:
Office Lunch Combo ₹149
Veg Thali with Buttermilk. Available 12 PM - 4 PM.

[Approve] [Edit items] [Change price] [Cancel]
System behavior

The system should:

Understand offer goal
Suggest existing items
Create combo structure
Check price logic
Set timing
Set visibility
Generate promo text
Create expiry
Publish after approval
Track views/clicks
Smoothness idea to lock

Offer creation should start from owner intent, not form fields.

Owner should not have to first choose:

discount type
modifier type
combo type
eligibility
validity

MenuList should propose the offer and let owner edit.

12. Flow 9: Offer expiry and extension

Expired offers are a major source of menu mess.

Owner POV

Agent Inbox card:

Weekend Combo expires tonight.

What should happen?

[Remove tonight] [Extend to Sunday] [Edit] [Keep active]

If it already expired:

Weekend Combo expired yesterday.

Remove from menu or extend?

[Remove] [Extend] [Edit]
System behavior

The system should:

Track expiry time
Warn before expiry
Auto-expire if approved earlier
Create extension proposal if offer is performing
Remove from customer menu
Keep historical record
Smoothness idea to lock

Expiry should be part of the original approval.

If owner approved:

Today’s Special, expires tonight

Then removal tonight is not a new risky action. It is execution of an approved rule.

This reduces approval fatigue.

13. Flow 10: Description improvement

Descriptions should improve the menu, but safely.

Owner POV

Menu Health card:

9 items have no description.

I prepared safe descriptions.

[Review] [Approve all] [Edit selected]

Owner opens:

Paneer Roll

Current:
No description

Suggested:
Soft roll filled with paneer and house-style seasoning.

[Use] [Edit] [Skip]

For uncertain items:

Special Pizza

I need one detail before writing this:
What makes it special?

[Extra cheese] [Paneer topping] [House sauce] [Other]
System behavior

The system should:

Find missing/weak descriptions
Generate safe descriptions
Avoid unsupported ingredient claims
Flag uncertain items
Batch proposals
Track owner edits as preferences
Publish approved descriptions
Smoothness idea to lock

Use safe descriptions first. Ask ingredient questions only where needed.

Do not make description writing a long interview.

14. Flow 11: Photo collection and approval

Photos should be treated as an operational workflow.

Owner POV

MenuList says:

12 items need photos.
4 of them are highly viewed.

Start with:
Chicken Biryani
Paneer Tikka
Cold Coffee
Veg Thali

Send photo task to staff?

[Send WhatsApp link] [Upload myself] [Later]

Staff receives link.

Staff uploads photos.

Owner sees:

3 photos waiting for approval:

Paneer Tikka — good quality
Cold Coffee — slightly dark
Veg Thali — contains multiple dishes

[Approve good photos] [Ask retake] [Crop/Edit]
System behavior

The system should:

Detect missing photos
Prioritize by business impact
Generate staff task link
Receive uploads
Match photo to item
Check quality
Detect mismatch
Create approval proposal
Publish approved photo
Smoothness idea to lock

Photo collection should be delegated through task links, not full dashboard access.

This is very important for SMBs.

The owner should not need to chase photos manually.

15. Flow 12: Menu Health fixing

Menu Health should behave like a practical assistant.

Owner POV

Home screen:

Menu Health: 72/100

Fix these first:
1. Chicken Biryani has high views but no photo.
2. Weekend Combo expired yesterday.
3. 6 items have no veg/non-veg label.
4. Fresh Lime Soda has no price.
5. Paneer Roll and Paneer Roll Special may be duplicates.

Owner taps:

Fix top issues

MenuList creates action cards.

System behavior

The system should:

Scan menu completeness
Scan publishing freshness
Scan expired items
Scan missing labels
Scan duplicate names
Scan photo gaps
Use customer behavior to prioritize
Create fix proposals
Track score improvement
Smoothness idea to lock

Menu Health should prioritize by revenue/customer impact, not database completeness.

A missing photo on a top item matters more than a missing description on a rarely viewed item.

16. Flow 13: Publishing after approval

Publishing should feel like one action.

Owner POV

Owner approves price change.

MenuList says:

Publishing update...

Then:

Done.

Updated:
QR menu
Public menu
WhatsApp menu
Printable PDF

Needs action:
Delivery app export ready

Rollback available.

For a surface that takes time:

Google update submitted. It may take time to appear.
I’ll keep checking.
System behavior

The system should:

Apply approved menu changes
Create new menu version
Update all connected surfaces
Regenerate derived outputs
Submit external updates where possible
Create manual export where direct update is not possible
Verify surfaces
Show completion receipt
Important states
approved
menu_version_created
publish_job_started
surface_pending
surface_updated
surface_failed
surface_manual_action_required
verified
receipt_created
Smoothness idea to lock

Always show surface-level publishing status in plain language.

Owner should know what happened.

Not:

Sync complete.

But:

QR menu updated.
Public menu updated.
Printable PDF regenerated.
Delivery app export ready.
17. Flow 14: Drift / mismatch detection

MenuList should protect the source of truth.

Owner POV

Agent Inbox card:

Possible mismatch found.

MenuList:
Veg Burger ₹99

Uploaded delivery menu screenshot:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]

Owner chooses:

Keep ₹99

MenuList responds:

Got it. MenuList remains ₹99.
I marked the delivery menu as outdated.
Export update ready.
System behavior

The system should:

Compare MenuList source of truth with external/menu outputs
Detect price/name/availability mismatches
Estimate confidence
Show side-by-side comparison
Ask owner which source is correct
Update MenuList only if owner chooses external value
Create external update task if MenuList is correct
Log decision
Smoothness idea to lock

Mismatch cards should ask “which is correct?”

Do not accuse the owner.
Do not assume external data is right.
Do not silently overwrite the master menu.

18. Flow 15: Staff action and approval

Staff should help without risking the menu.

Owner POV

Owner adds staff member Ravi.

Permissions:

Can upload photos
Can mark items sold out
Cannot change prices
Cannot delete items
Cannot publish offers

Staff says:

Chicken Biryani sold out

MenuList:

Ravi marked Chicken Biryani unavailable until tomorrow 11 AM.

But if staff says:

Change Chicken Biryani to 249

MenuList:

Ravi requested a price change.

Chicken Biryani ₹229 → ₹249

Owner approval required.

[Approve] [Edit] [Reject]
System behavior

The system should:

Identify actor
Check role permissions
Classify action risk
Allow low-risk permitted actions
Escalate high-risk actions
Create approval card for owner
Log staff action
Smoothness idea to lock

Staff should not need the full MenuList dashboard.

They should get small action surfaces:

photo upload link
sold-out link
stock update link
correction request link

This keeps the product simple and safe.

19. Flow 16: Rollback

Rollback must be visible and calm.

Owner POV

After a change:

Done. 7 paneer items updated.
Rollback available.

Owner taps rollback.

MenuList shows:

Rollback bulk price update?

This will restore:
Paneer Tikka ₹199 → ₹179
Paneer Roll ₹119 → ₹99
Paneer Butter Masala ₹269 → ₹249
...

[Rollback all] [Cancel]

After rollback:

Restored previous prices.
QR and public menu updated.
System behavior

The system should:

Keep before snapshot
Group related changes
Allow rollback at operation level
Create rollback proposal for high-risk reversal
Publish reverted state
Verify
Log rollback
Smoothness idea to lock

Rollback should be operation-level, not item-level only.

For bulk changes, the owner needs one undo.

20. Flow 17: Customer insight to action

Insights should become menu operations.

Owner POV

MenuList says:

Customers searched “momos” 18 times this week.
Momos are not on your menu.

Add momos or ignore?

[Add item] [Ignore] [Remind later]

Another:

Chicken Biryani is your most viewed item but has no photo.

[Request photo] [Upload now] [Ignore]

Another:

Lunch Combo gets many views after 3 PM, but it is available only until 2 PM.

Extend timing to 4 PM?

[Approve] [Edit] [Ignore]
System behavior

The system should:

Collect customer behavior
Detect actionable pattern
Connect pattern to menu object
Generate recommendation
Create proposal
Track whether action improves result
Smoothness idea to lock

Never show analytics without a next action.

Owners do not need dashboards.
They need decisions.

21. Flow 18: Multi-outlet command

Multi-outlet should feel natural, not enterprise-heavy.

Owner POV

Owner says:

Increase dosa to 119 all branches except Indiranagar

MenuList proposes:

Update Masala Dosa:

Koramangala ₹99 → ₹119
HSR ₹99 → ₹119
Whitefield ₹109 → ₹119
Indiranagar unchanged

[Approve] [Edit outlets] [Cancel]

Another command:

Biryani sold out only in Bandra

MenuList:

Mark Biryani unavailable in Bandra outlet only?

Other outlets remain unchanged.

[Approve]
System behavior

The system should:

Resolve item
Resolve outlet scope
Apply outlet-specific overrides
Preserve master menu
Show exceptions clearly
Publish outlet-specific menus
Log by outlet
Smoothness idea to lock

Always show outlet scope before approval.

This prevents the most dangerous multi-outlet mistake.

22. Flow 19: Print menu freshness

Print is still important for SMBs.

Owner POV

Owner changes 18 prices.

MenuList says:

You changed 18 prices.
Your printable menu is now outdated.

Regenerate print PDF?

[Regenerate] [Later]

If QR code remains same:

Your QR code does not need to change.
Only the menu content changed.

This is important because owners often think they need to reprint QR codes.

System behavior

The system should:

Track print version
Compare print version with live menu version
Detect stale print outputs
Offer regenerated PDF
Keep QR code stable
Smoothness idea to lock

Reassure owners that QR code stays same when menu changes.

This is a simple but powerful SMB trust point.

23. Flow 20: Owner-approved rules

This is how MenuList becomes smoother over time without becoming scary.

Owner POV

MenuList notices repeated behavior:

You usually restore sold-out beverages next morning.

Create rule?

When beverages are marked sold out,
restore them automatically at next opening.

[Create rule] [No]

Another:

You always expire Today’s Specials at closing.

Create default rule?

[Yes] [No]

Another:

You approve staff photos marked “good quality” most of the time.

Allow manager-approved good photos to go live?

[Yes] [No]
System behavior

The system should:

Detect repeated approvals
Suggest safe rule
Explain rule clearly
Require owner approval
Apply rule in future
Log rule-based actions
Allow owner to pause/remove rule
Smoothness idea to lock

MenuList should automate rules the owner approved, not business decisions the AI guessed.

This is the safe path to agentic operations.

24. The proposal object is the center of the system

The most important product object is not just item, category, or menu.

It is:

Change Proposal

Because every AI operation becomes a proposal.

A proposal should contain:

What owner said
What MenuList understood
What will change
Old value
New value
Affected items
Affected outlets
Affected surfaces
Risk level
Confidence
Approval required
Customer preview
Rollback snapshot
Status

Owner-facing card:

You said:
“Tea 20”

I found:
Masala Tea

Change:
₹15 → ₹20

Affects:
QR menu
Public menu
WhatsApp menu

[Approve] [Edit] [Cancel]

System-facing structure:

proposal_type: price_update
source: owner_command
entity: item
entity_id: masala_tea
old_value: 15
new_value: 20
scope: current_outlet
risk: high
requires_approval: true
status: pending

This keeps the AI safe.

25. The live menu should be versioned

Every approved operation should create a menu version.

Owner does not need to see version numbers every day, but the system needs them.

Example:

Menu Version 42
Before:
Paneer Tikka ₹179

Menu Version 43
After:
Paneer Tikka ₹199

Owner-facing history:

2:14 PM
Paneer Tikka changed from ₹179 to ₹199.
Approved by owner.
Published to QR and public menu.
Rollback available.
Smoothness idea to lock

Versioning makes rollback, audit, publishing, and drift detection possible.

Without versioning, MenuList becomes fragile.

26. The system state machine

Every operation should move through states.

received
understood
needs_clarification
proposal_created
pending_approval
approved
rejected
scheduled
publishing
published
verified
failed
rolled_back

Some operations skip states.

Example: description suggestion

received → proposal_created → pending_approval → approved → published

Example: low-confidence command

received → needs_clarification → proposal_created → pending_approval

Example: scheduled special

proposal_created → approved → scheduled → active → expired → archived

This gives MenuList operational reliability.

27. The owner language for uncertainty

Do not expose system terms.

Bad:

Entity resolution confidence is 0.58.

Good:

I found 3 possible items. Which one did you mean?

Bad:

Intent classification failed.

Good:

Do you want to change the price or mark it unavailable?

Bad:

Surface sync failed.

Good:

QR menu updated, but printable PDF could not regenerate. Try again?

The owner should always understand what happened.

28. The decision logic for ask, propose, or execute

MenuList needs one clear behavior rule.

Low risk + high confidence:
Prepare or draft quickly.

Medium risk + high confidence:
Create proposal with simple approval.

High risk:
Always show before/after and require approval.

Low confidence:
Ask clarification before proposal.

Previously approved rule:
Execute according to rule, then notify/log.

Examples:

Low risk
Generate missing description drafts.

MenuList can prepare without asking too much.

Medium risk
Mark item unavailable today.

MenuList proposes and asks approval.

High risk
Change prices.

MenuList always requires explicit approval.

Rule-based
Today’s Special expires tonight.

If owner approved expiry earlier, MenuList can execute expiry.

29. The “receipt” after every operation

Every approved action should end with a receipt.

Not just:

Saved.

But:

Done.

Cold Coffee is unavailable until tomorrow 10 AM.

Updated:
QR menu
Public menu
WhatsApp menu

Rollback available.

For bulk:

Done.

7 paneer items updated.
QR and public menu updated.
Printable PDF regenerated.

Rollback all 7 available.
Smoothness idea to lock

Receipts make owners trust that the work is complete.

This is a small UX element with huge psychological value.

30. How MenuList should behave over time

The product should become smoother with use.

First week:

Owner clarifies item names.
Owner approves common actions.
Owner uploads menu.
Owner fixes major health issues.

After repeated usage:

MenuList remembers aliases.
MenuList suggests default expiry.
MenuList knows opening hours.
MenuList knows preferred promo language.
MenuList knows which staff can do what.
MenuList knows outlet-specific patterns.

Example:

First time:

Owner: PBM 269

MenuList:
Did you mean Paneer Butter Masala?

Second time:

Owner: PBM 279

MenuList:
Paneer Butter Masala ₹269 → ₹279. Approve?

This is the real agentic moat.

31. The smoothest owner journey end-to-end

This is how the product should feel in one continuous story.

Owner opens MenuList.

MenuList:
Your menu is live.
2 approvals pending.
1 offer expires tonight.
3 photos waiting.
Cold Coffee was unavailable yesterday. Restore?

Owner types:
Add mango lassi 99 today special

MenuList:
Create Mango Lassi ₹99 under Today’s Special.
Available today only.
Show at top of menu.
Expires tonight at closing.
Create WhatsApp text also?

[Approve]

MenuList:
Done.
QR menu updated.
Public menu updated.
WhatsApp text ready.
Expires tonight.
Rollback available.

Later staff uploads photo.

MenuList:
Photo received for Mango Lassi.
Quality good.
Publish to menu?

[Approve]

Evening:

MenuList:
Today’s Special expires at closing.
Remove automatically as approved?

[Yes, keep rule] [Extend] [Remove now]

This is the product.

32. What makes this flow smooth for SMB owners

The biggest smoothness principles are:

1. MenuList should propose, not ask too many questions

Owners do not want forms.
They want prepared work.

2. Every risky change should show before/after

Especially price, bulk, outlet, and publishing changes.

3. Temporary actions should not become permanent by accident

Sold out means temporary by default.
Remove means archive with confirmation.

4. Specials should expire automatically

Old offers are one of the easiest ways menus become messy.

5. Staff should contribute through task links

Do not force staff into a complex admin system.

6. Insights should become actions

Do not show analytics unless they create a useful menu decision.

7. Publishing should end with a receipt

Owners need confidence that the live menu changed.

8. Repeated approvals should become owner-approved rules

This is how MenuList becomes fast without becoming unsafe.

33. The final operating philosophy

MenuList should behave like a careful, fast, memory-backed menu manager.

It should not say:

I can help you.

It should say:

I prepared this update. Approve?

It should not say:

Saved.

It should say:

Done. QR and public menu updated. Rollback available.

It should not say:

Here are analytics.

It should say:

Customers searched for momos. Add item?

It should not say:

AI will manage your menu automatically.

It should say:

MenuList prepares the work. You stay in control.

That is the complete behavior model.

Next layer after this is the exact screen-by-screen product design: Home, Command Box, Agent Inbox, Menu, Publish, Growth, Control, and the exact cards each screen should contain.
```

### Message 17 - User

- Message ID: af2bcfad-ad7d-445f-a4fe-3f5e61fe309e
- Captured from scroll band: target-161000

```
Next
```

### Message 18 - Assistant

- Message ID: 74281d8e-caa7-4a81-a0f2-0a7b3edc6dc6
- Model: gpt-5-5-pro
- Captured from scroll band: target-211000

```
I’ll continue from the locked MenuList vision and move into the owner-facing product surface: screens, owner actions, and system behavior behind each interaction.
```

### Message 19 - Assistant

- Message ID: f905ebd7-e1a8-461b-a60a-addc0bfa8227
- Model: gpt-5-5-pro
- Captured from scroll band: target-211000

```
Now we go into the owner-facing product surface.

This is still theoretical, not technical specs yet. The goal here is to define:

What the owner sees
What the owner feels
What the owner can do
How MenuList behaves behind the scenes
What makes the flow smooth for SMB owners

The key idea:

MenuList screens are not “pages.” They are decision surfaces.

Every screen should help the owner answer one of these questions:

Is my menu live and correct?
What needs my approval?
What changed today?
What should I fix?
Where is my menu published?
Can my staff help safely?
Can I undo mistakes?
1. The full MenuList product surface

MenuList should have seven core surfaces from day one:

Home / Command Center
Command Box
Agent Inbox
Master Menu
Publish Center
Growth / Menu Improvement
Control / Trust Center

These are not separate products.

They are different views of the same operating loop:

Observe → Understand → Propose → Approve → Publish → Verify → Learn

The owner should feel that the whole app is one system.

Not:

One place for menu
One place for AI
One place for QR
One place for offers
One place for reports

But:

MenuList manages my menu.
Every screen helps me keep it correct, attractive, and live.
2. Home / Command Center

This is the most important screen.

The owner should open MenuList and immediately know:

My menu is live.
These things need my attention.
I can tell MenuList what changed.

The home screen should not feel like an analytics dashboard.

It should feel like a daily menu control room.

What the owner sees

At the top:

Your menu is live
Last updated 12 minutes ago
QR menu and public menu are synced

Then the main input:

Tell MenuList what changed...

Then attention cards:

Needs approval:
2 price updates
1 staff photo
1 expired offer

Today:
3 items unavailable
1 offer active
QR menu viewed 86 times

Menu Health:
74/100
Fix 5 important issues

The home screen should always answer:

What needs action now?

Not:

Here are 25 admin options.
Owner POV

Morning:

Owner opens MenuList.

MenuList:
Good morning. Your menu is live.

Yesterday unavailable:
Cold Coffee
Chicken Biryani

Restore now?

[Restore all] [Select items] [Keep unavailable]

During rush:

Owner opens MenuList.

MenuList shows quick actions:
Sold out
Restore item
Add today special
Change price

Evening:

MenuList:
Today’s summary:

3 items updated
2 items sold out
1 special added
QR menu viewed 126 times
Most viewed item: Chicken Biryani

Tomorrow:
Restore sold-out items?
Extend today’s special?
System behavior behind Home

The system is constantly gathering state:

Current menu version
Publishing status
Pending approvals
Unavailable items
Expiring offers
Staff submissions
Menu health issues
Customer behavior
External mismatches
Recent changes
Business hours
Outlet status

But the owner should not see all raw state.

The system should rank what matters.

Urgency should be based on:

Customer-visible error
Revenue impact
Time sensitivity
Owner approval needed
Business hours
Risk level

Example priority:

1. Wrong price mismatch
2. Sold-out item still visible
3. Offer expired
4. Staff price change request
5. Missing photo on top item
6. Missing description on low-view item

This matters because SMB owners are busy.

MenuList should not create notification noise.

Smoothness rule to lock

Home should show decisions, not data.

Bad home screen:

Total items: 143
Categories: 12
Descriptions missing: 38
Photos missing: 64
QR scans: 1,283

Good home screen:

Chicken Biryani is your most viewed item but has no photo.

[Request photo]

The system should convert information into action.

3. The Command Box

The Command Box is the main interaction model.

This is where MenuList becomes different from a normal menu editor.

The owner should type, speak, paste, or upload messy input.

MenuList turns it into structured proposals.

What the owner sees

A single box:

Tell MenuList what changed...

Below it, contextual examples:

Cold coffee sold out
Add mango lassi 99
Increase all tea by 5
Create lunch combo
Upload new menu photo

These examples should change based on the restaurant.

For a cafe:

Cold coffee sold out
Add frappe 129
Increase all coffee by 10
Create breakfast combo

For a biryani shop:

Chicken biryani over
Add family pack 499
Increase all biryani by 20
Create weekend combo

This makes the system feel relevant.

Owner command examples
Tea 20
Biryani over
Paneer items 20 badhao
Add mango lassi 99
Aaj ka special rajma chawal 129
Lunch thali 12 to 4
Remove weekend combo
Cold coffee kal tak unavailable
Upload new menu
Customer says burger price wrong

MenuList should accept mixed language, shorthand, spelling mistakes, and owner-specific words.

The owner should not need to use perfect menu item names.

How the system behaves

Every command goes through this hidden interpretation:

What is the action?
What menu item or group is involved?
What value is being changed?
What is the scope?
What is the time period?
What surfaces will be affected?
What is the risk?
Is clarification needed?

Example:

Owner:
Chai 20

System:
Action: price update
Entity: maybe Masala Tea
Value: ₹20
Risk: high
Confidence: medium
Needed: confirm item

Owner sees:

I found Masala Tea.

Change price:
₹15 → ₹20

[Approve] [Choose another item] [Cancel]

If ambiguous:

You said “tea 20”.

Which item?
Masala Tea
Ginger Tea
Lemon Tea
All tea items

[Choose]

After the owner chooses:

Remember “tea” as all tea items?

This is how MenuList gets smoother.

Command Box should not behave like chat

Bad behavior:

Owner:
Increase all tea by 5

MenuList:
Sure, I can help you update tea prices. Please go to the menu tab and select the items.

Good behavior:

Owner:
Increase all tea by 5

MenuList:
Found 4 tea items.

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

[Approve all] [Edit selected] [Cancel]

The command box should always try to create an action card.

Not an answer.

Smoothness rule to lock

The command box should remember owner language.

First time:

Owner:
PBM 269

MenuList:
Did you mean Paneer Butter Masala?

Owner confirms.

Next time:

Owner:
PBM 279

MenuList:
Paneer Butter Masala ₹269 → ₹279.

[Approve]

This is a major SMB advantage.

Owners use shorthand all the time.

MenuList should adapt to the owner, not force the owner to adapt to software.

4. Agent Inbox

The Agent Inbox is the trust center of the product.

Every meaningful AI action becomes a card.

The owner should feel:

MenuList did the thinking.
I just need to approve, edit, or reject.
What the owner sees

A list of cards grouped by urgency.

Needs approval now
Price change request
Sold-out update
Staff photo

Needs review
Description suggestions
Possible duplicate item

Scheduled
Today’s special expires tonight
Lunch combo active until Friday

Cards should not be endless.

They should be grouped.

Example:

7 description improvements ready

instead of seven separate cards.

Anatomy of a card

Every card should answer:

What triggered this?
What did MenuList understand?
What will change?
Where will it appear?
What is the customer impact?
What can I do now?

Example:

Price Update

You said:
“Paneer tikka 199”

I found:
Paneer Tikka

Change:
₹179 → ₹199

Customer impact:
New price will appear on QR menu, public menu, WhatsApp menu, and printable PDF.

[Approve] [Edit] [Cancel]
Card type: price update
Price Update

Change:
Masala Tea ₹15 → ₹20

Scope:
Current outlet only

Affects:
QR menu
Public menu
WhatsApp menu
Print PDF

Risk:
Price changes need owner approval.

[Approve] [Edit] [Cancel]

Important behavior:

Always show old price and new price.
Always show scope.
Always show affected surfaces.
Always require approval.
Card type: sold-out item
Availability Update

You said:
“Cold coffee over”

Proposal:
Mark Cold Coffee unavailable until tomorrow 10 AM.

Customer view:
Cold Coffee
Unavailable today

[Approve] [Change time] [Hide instead] [Cancel]

Important behavior:

Temporary by default.
Restore reminder or auto-restore rule.
Visibility choice: show unavailable or hide.
Card type: today’s special
Today’s Special

Create:
Rajma Chawal ₹129

Placement:
Top of menu

Availability:
Today only

Expiry:
Tonight at closing

Also ready:
WhatsApp message
Instagram caption
Counter text

[Approve menu update] [Edit] [Cancel]

Important behavior:

Expiry by default.
Featured placement by default.
Promotion kit ready but optional.
Card type: staff photo
Photo Approval

Ravi uploaded a photo for Paneer Tikka.

Quality:
Good

MenuList check:
Looks like a dry starter dish.

[Publish photo] [Ask retake] [Choose another item]

Important behavior:

Staff can upload.
Owner approves before live.
AI checks quality and match.
Card type: mismatch
Possible Mismatch

MenuList:
Veg Burger ₹99

Uploaded delivery menu screenshot:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]

Important behavior:

Never assume external source is correct.
Ask which value is correct.
Keep MenuList as source of truth unless owner chooses otherwise.
Card type: rule suggestion
Suggested Rule

You usually restore sold-out beverages the next morning.

Create rule?

When beverages are marked sold out,
restore them automatically at next opening.

[Create rule] [No]

Important behavior:

Rules come from repeated owner behavior.
Owner approves the rule.
System executes rule later and logs it.
Smoothness rule to lock

The Agent Inbox should reduce decisions, not multiply them.

Bad:

40 separate description cards

Good:

40 descriptions ready.
Approve all, edit selected, or skip.

Bad:

Every minor issue needs approval.

Good:

Only risky or meaningful actions need approval.
Low-risk improvements are batched.
5. Master Menu

The Master Menu is the source of truth.

This is not just a list of items.

It is the restaurant’s living menu brain.

What the owner sees

The owner should see the menu like customers see it first.

Today’s Special
Starters
Main Course
Beverages
Desserts

Each item shows simple status:

Paneer Tikka
₹199
Available
Photo added
Description added
Visible on QR + public menu

Cold Coffee
₹99
Unavailable until tomorrow 10 AM
Photo missing
Visible as unavailable

The owner should not first see a database-style table.

They should see the customer menu with management controls layered in.

Item detail view

When owner opens an item, they see:

Paneer Tikka

Live price:
₹199

Availability:
Available

Customer description:
Grilled paneer pieces with house-style seasoning.

Photo:
Added

Labels:
Veg
Spicy
Bestseller

Appears on:
QR menu
Public menu
WhatsApp menu
Print menu

Recent history:
Yesterday: Price changed ₹179 → ₹199
Last week: Photo updated

Actions:

Change price
Mark unavailable
Edit description
Replace photo
Add variant
Create offer
Archive item
View history

The owner should not need to understand the full schema.

But the structure must exist behind the scenes.

System behavior behind Master Menu

Every item should have rich operational state:

Identity
Aliases
Category
Variants
Add-ons
Prices
Availability
Visibility
Photos
Descriptions
Labels
Outlet overrides
Publishing surfaces
History
Performance signals
Health issues

The system should understand that an item can be:

Live
Draft
Pending approval
Temporarily unavailable
Scheduled
Expired
Archived
Conflict detected
Photo pending
Needs confirmation

This statefulness is what makes MenuList different from simple QR menu tools.

Master Menu should support messy SMB menu reality

SMB menus are rarely clean.

MenuList must support:

Half / full
Small / medium / large
Regular / family pack
Add cheese
Extra spicy
Jain option
Eggless option
Breakfast only
Lunch only
Weekend only
Today only
Branch-specific price
Branch-specific availability

Owner command:

Butter chicken half 299 full 499

MenuList should create:

Item:
Butter Chicken

Variants:
Half ₹299
Full ₹499

Owner command:

Add cheese option 30 for all burgers

MenuList should propose:

Add modifier:
Extra Cheese ₹30

Apply to:
5 burger items

[Approve] [Edit selected]
Smoothness rule to lock

The owner should see customer preview first, admin structure second.

Most owners understand:

How will customers see this?

They do not naturally think:

modifier group
variant entity
availability window
publishing surface

The system can use structured data internally.

The owner should see plain menu reality.

6. Publish Center

Publishing should feel like one action.

The owner should not manually think:

Update QR
Update public link
Update WhatsApp menu
Update print PDF
Update Google
Create delivery export

They should think:

Menu updated.

The Publish Center exists to give confidence.

What the owner sees
Publishing Status

QR Menu
Updated 12 minutes ago

Public Menu
Updated 12 minutes ago

WhatsApp Menu
Ready

Printable PDF
Outdated after 7 price changes

Google
Submitted, waiting to reflect

Delivery Apps
Export ready

The owner sees which surfaces are synced and which need attention.

Surface statuses

Use plain language.

Updated
Needs approval
Outdated
Submitted
Waiting
Failed
Manual action needed
Export ready
Not connected

Not technical states like:

job_success
sync_pending
webhook_failed
Owner POV after approval

Owner approves price update.

MenuList says:

Publishing update...

Then receipt:

Done.

Updated:
QR menu
Public menu
WhatsApp menu

Regenerated:
Printable PDF

Needs action:
Delivery app export ready

Rollback available.

For Google or external platforms:

Google update submitted. It may take time to appear.
I’ll keep checking.

The owner should understand that some surfaces are instant and some are not.

System behavior behind Publish Center

The system should:

Create new menu version
Update MenuList public menu
Update QR-linked menu
Regenerate WhatsApp text
Regenerate print PDF
Submit connected external updates
Create exports for non-connected platforms
Verify reachable surfaces
Mark manual tasks
Create completion receipt

The system should not just “save.”

It should publish and verify.

Smoothness rule to lock

Always reassure owners that the QR code stays the same.

Many SMB owners worry:

If I change menu, do I need a new QR code?

MenuList should say:

Your QR code stays the same.
Only the menu content changed.

This simple reassurance will reduce fear.

7. Growth / Menu Improvement

This is where MenuList helps the menu become more attractive and more useful.

But it should not feel like marketing software.

It should feel like:

MenuList is helping my menu sell better.

Growth includes:

Menu Health
Photos
Descriptions
Offers
Combos
Customer searches
Popular items
Missing content
Category order
Badges

All of these are menu operations.

Not separate marketing modules.

What the owner sees
Improve your menu

Start here:
Chicken Biryani is your most viewed item but has no photo.
Weekend Combo expired yesterday.
6 items have no veg/non-veg label.
Customers searched “momos” 18 times.
Paneer Roll and Paneer Roll Special may be duplicates.

Each insight becomes an action.

[Request photo]
[Remove expired offer]
[Add labels]
[Add momos]
[Review duplicate]
Menu Health

Menu Health should not be a generic score.

It should be an action system.

Menu Health: 74/100

Most important fixes:
1. Add photo for Chicken Biryani
2. Remove expired Weekend Combo
3. Add missing price for Fresh Lime Soda
4. Add veg/non-veg labels to 6 items
5. Review duplicate Paneer Roll

The system should prioritize based on impact.

High impact:

Top item missing photo
Expired offer still live
Wrong price mismatch
Missing price
Popular item unavailable for too long

Low impact:

Rarely viewed item missing description
Minor formatting issue
Old archived item missing photo
Description improvement

Owner sees:

9 items have weak descriptions.

I prepared safe descriptions.

[Review] [Approve all] [Edit selected]

Example:

Cold Coffee

Current:
No description

Suggested:
Chilled coffee blended with milk and ice.

[Use] [Edit] [Skip]

For uncertain item:

Special Pizza

I need one detail:
What makes it special?

[Extra cheese] [Paneer topping] [House sauce] [Other]

The system should avoid invented claims.

Photo improvement

Owner sees:

12 items need photos.
4 are high-view items.

Send photo task to staff?

[Send WhatsApp link]

Staff uploads.

Owner approves.

Menu improves.

The owner should not manually manage a photo folder.

MenuList should turn photo collection into a simple workflow.

Offer creation

Owner says:

Create lunch combo for office crowd

MenuList proposes:

Office Lunch Combo

Veg Thali + Buttermilk
₹149
Monday to Friday
12 PM - 4 PM

Placement:
Top of Lunch section

Promo text:
Ready for WhatsApp

[Approve] [Edit] [Cancel]

The owner should not start from a blank offer form.

The system should start from intent.

Customer insight to action

Bad:

QR scans: 1,483
Searches: 73
Top item: Chicken Biryani

Good:

Customers searched “momos” 18 times this week.
Momos are not on your menu.

[Add item] [Ignore]

Good:

Cold Coffee gets high views but no photo.

[Request photo]

Good:

Lunch Combo gets many views after 3 PM, but it is available only until 2 PM.

Extend timing to 4 PM?

[Approve] [Edit]
Smoothness rule to lock

Every insight should become a menu action.

Owners do not need passive analytics.

They need useful decisions.

8. Control / Trust Center

This is where the owner feels safe.

MenuList can be powerful only if the owner believes:

Nothing dangerous happens without me.
I can see who changed what.
I can undo mistakes.
My staff cannot break the menu.

The Control Center should include:

Approvals
Staff roles
Rules
Audit history
Rollback
Outlet control
Publishing permissions
AI safety preferences
What the owner sees
Control

Pending approvals:
3

Staff:
Ravi can mark sold out and upload photos.
Priya can upload photos only.

Rules:
Today’s specials expire at closing.
Sold-out beverages restore next morning.

History:
Paneer Tikka price changed yesterday.
Cold Coffee marked unavailable today.
Weekend Combo expired automatically.
Staff permissions

The owner should set simple permissions:

Can upload photos
Can mark sold out
Can restore items
Can create offer drafts
Can request price changes
Can approve price changes
Can publish changes

For SMBs, staff should mostly use task links.

Not full admin access.

Example:

Photo upload link
Sold-out link
Correction request link

Staff action:

Ravi:
Chicken Biryani sold out

MenuList:

Ravi marked Chicken Biryani unavailable until tomorrow 11 AM.

Staff risky action:

Ravi:
Chicken Biryani 249

MenuList:

Ravi requested a price change.

Chicken Biryani ₹229 → ₹249

Owner approval required.

[Approve] [Reject]
Rules

Rules are the safe path to automation.

MenuList should suggest rules only after observing repeated approvals.

Example:

You usually expire Today’s Specials at closing.

Create default rule?

Today’s Specials will expire automatically at closing unless you extend them.

[Create rule] [No]

Another:

You usually restore sold-out beverages next morning.

Create rule?

[Create rule] [No]

The owner approves rules once.

Then MenuList can execute them safely.

Audit history

History should be plain language.

Today, 2:14 PM
Paneer Tikka changed from ₹179 to ₹199.
Approved by Owner.
Published to QR menu and public menu.
Verified live.
Rollback available.

For staff:

Today, 1:05 PM
Ravi marked Chicken Biryani unavailable.
Published to QR menu.
Scheduled to restore tomorrow 11 AM.

For rules:

Yesterday, 11:00 PM
Today’s Special expired automatically.
Rule approved by Owner on Monday.

This is very important.

The owner should never wonder:

Who changed this?
Why is this item missing?
Why is this price different?
Rollback

Rollback should be visible after important changes.

Bulk price update completed.
7 items changed.

[Rollback all]

Rollback should show before/after again:

Rollback bulk price update?

Paneer Tikka ₹199 → ₹179
Paneer Roll ₹119 → ₹99
Paneer Butter Masala ₹269 → ₹249

[Rollback all] [Cancel]

For SMB owners, rollback reduces fear.

They will use MenuList more confidently.

Smoothness rule to lock

Automation should come from owner-approved rules, not hidden AI decisions.

This is the difference between:

AI changed my menu.

and:

MenuList followed the rule I approved.

That distinction protects trust.

9. How the screens work together

The screens are not separate.

One operation should move naturally across them.

Example:

Owner:
Add mango lassi 99 today special
Home

Owner enters command.

Tell MenuList what changed...
Agent Inbox

MenuList creates proposal.

Create Mango Lassi ₹99 under Today’s Special.
Available today only.
Show at top.
Expires tonight.

[Approve]
Master Menu

After approval, item appears.

Today’s Special
Mango Lassi ₹99
Active today
Photo missing
Publish Center

MenuList publishes.

QR menu updated
Public menu updated
WhatsApp text ready
Print PDF regenerated
Growth

MenuList creates follow-up.

Mango Lassi has no photo.
Send staff photo task?
Control

History records it.

Mango Lassi added by Owner.
Expires tonight.
Rollback available.

This is the whole system working as one.

10. The owner’s daily rhythm

MenuList should fit restaurant rhythm.

Not generic SaaS rhythm.

Restaurants have:

Opening
Pre-lunch
Rush
Evening
Closing
Weekly review

MenuList should behave differently in each.

Opening mode
Good morning.

Restore yesterday’s unavailable items?
2 offers active today.
1 staff photo waiting.
Menu is live.

Opening mode should focus on readiness.

Rush mode

During busy hours, show only fast actions:

Sold out
Restore item
Add special
Change price

Do not push:

Improve descriptions
Review analytics
Redesign menu

Rush mode should reduce cognitive load.

Closing mode
Today’s summary:

3 items sold out
1 special added
QR menu viewed 126 times
Most viewed item: Chicken Biryani

Before closing:
Today’s Special expires tonight.
Restore sold-out items tomorrow?

Closing mode should help clean up the menu.

Weekly review
This week:

Most viewed:
Chicken Biryani

Needs attention:
Chicken Biryani has no photo.
Customers searched “momos.”
Weekend Combo performed well.
3 price changes were made.

Suggested actions:
Add biryani photo
Add momos
Repeat Weekend Combo

Weekly review should not be a report.

It should be a menu improvement session.

Smoothness rule to lock

MenuList should match restaurant operating rhythm.

This will make it feel natural.

Generic software says:

Dashboard
Reports
Settings

MenuList should think:

Opening
Rush
Closing
Weekly improvement
11. What should be hidden from the owner

MenuList may use advanced AI and agentic workflows behind the scenes.

But the owner should not see internal complexity.

Hide:

confidence scores
intent names
entity IDs
job IDs
model names
vector matches
sync payloads
API errors
raw extraction tables
technical logs

Translate them.

Instead of:

Entity resolution confidence: 0.61

Show:

I found 3 possible items. Which one did you mean?

Instead of:

Publish job failed

Show:

QR menu updated, but printable PDF could not regenerate.

[Try again]

Instead of:

OCR extraction low confidence

Show:

I could not clearly read 4 prices. Please confirm them.

Instead of:

Variant parsing ambiguity

Show:

Does 180/300 mean Half/Full or Regular/Family?
12. The card priority system

The Agent Inbox should not be chronological only.

It should be priority-based.

Highest priority:

Customer-visible mistakes
Price mismatches
Failed publishing
Expired active offers
Staff risky requests
Bulk changes awaiting approval

Medium priority:

Sold-out restore reminders
Photo approvals
Offer extensions
Missing price
Duplicate item

Lower priority:

Description improvements
Category cleanup
Photo suggestions for low-view items
Optional promo ideas

This matters because owners cannot handle 40 equal cards.

MenuList should decide what deserves attention.

13. How MenuList should group work

Grouping is essential.

Bad:

12 separate missing photo cards
9 separate description cards
7 separate label cards
5 separate duplicate warnings

Good:

12 items need photos
Start with 4 high-view items

9 descriptions ready
Approve all or edit selected

6 items need veg/non-veg labels
Apply suggested labels?

MenuList should group by:

Risk
Task type
Outlet
Menu section
Business impact
Required approval

For example:

Price changes should not be grouped with photo suggestions.

Because price is high-risk.

But description suggestions can be grouped.

14. The live menu preview

Customer preview should appear everywhere.

Before approval:

Customer preview

After publish:

Live preview

For sold-out:

Cold Coffee
Unavailable today

For timed item:

Pav Bhaji
Available after 4 PM

For special:

Today’s Special
Rajma Chawal ₹129
Available today only

For offer:

Office Lunch Combo ₹149
Available 12 PM - 4 PM

The owner should not approve abstract data.

They should approve what customers will see.

15. The “surface awareness” system

MenuList must understand that every menu item can appear differently across surfaces.

One master item:

Mango Lassi
₹99
Summer Special

Different outputs:

QR menu:
Mango Lassi ₹99 with description and badge

WhatsApp:
Mango Lassi - ₹99 - Summer Special

Print:
Mango Lassi 99

Instagram:
Beat the heat with our Mango Lassi, available this week.

Google:
Mango Lassi, price, category, description

The owner should not manage these manually.

MenuList should transform one menu truth into many surface formats.

Smoothness rule to lock

One master menu, many outputs.

This is core to long-term positioning.

MenuList is not just another place to edit a menu.

It becomes the source from which all customer-facing menus are created.

16. The correction flow

MenuList will make mistakes or uncertain guesses.

The correction flow must be elegant.

Example:

MenuList:
Add Mango Lassi under Desserts?

Owner:
No, Beverages.

System should not just move the item.

It should remember:

Mango Lassi and similar drinks belong under Beverages for this owner.

Another:

MenuList:
Paneer Roll description includes spicy.

Owner:
Don’t say spicy.

System remembers:

Avoid spice claims unless owner labels item spicy.

Another:

MenuList:
“CB” means Cheese Burger?

Owner:
No, Chicken Biryani.

System remembers:

CB = Chicken Biryani for this business.
Smoothness rule to lock

Every correction should improve future behavior.

This is how MenuList becomes increasingly personalized.

17. The “needs clarification” experience

Clarification should be fast.

Do not turn it into a conversation.

Example:

Owner:
Burger 119

MenuList:
Which burger?

Veg Burger
Cheese Burger
Chicken Burger
All burgers

Owner taps.

Then MenuList continues:

Change Cheese Burger ₹99 → ₹119?

[Approve]

Clarification should be:

Tap-based where possible
Contextual
Memory-building
Minimal

Not:

Please provide more information about which item you are referring to.

That feels like a weak chatbot.

18. The approval weight system

Not all approvals should feel the same.

Light approval

For low-risk suggestions:

Use these 9 descriptions?

[Approve all] [Edit selected]
Normal approval

For availability:

Mark Cold Coffee unavailable until tomorrow?

[Approve] [Change time]
Heavy approval

For price, bulk, outlet-wide, or external publishing:

This will change 14 prices across 3 outlets.

View changes:
...

[Confirm update] [Edit] [Cancel]

Heavy approval should include:

Before/after
Affected count
Outlet scope
Publishing surfaces
Rollback note

This prevents accidental damage.

19. How MenuList should behave with risky actions

Risky action examples:

Change price
Bulk update
Archive item
Delete offer
Publish externally
Change all outlets
Change allergens
Change nutrition claims

MenuList behavior:

Show before/after
Show scope
Show customer impact
Require owner approval
Create rollback snapshot
Log approval
Verify publishing

For delete:

Archive item instead?

Archiving hides it from customers but keeps history.

[Archive] [Cancel]

The default should be archive, not delete.

20. The “manual action needed” experience

Some platforms may not allow direct publishing.

MenuList should still help.

Example:

Delivery app direct update not connected.

I created:
Updated item list
Price change summary
Menu image export

Manual task:
Upload this to delivery app.

[Download export] [Mark done]

For Google or other slower surfaces:

Submitted. Waiting to reflect.
I’ll keep checking.

Owner should not feel abandoned when direct sync is unavailable.

Smoothness rule to lock

When MenuList cannot directly publish, it should create the next-best task.

This keeps the promise:

Change once. MenuList handles as much as possible.
21. The owner should always know the current truth

At any moment, the owner should be able to answer:

What is live now?
What is scheduled?
What is pending approval?
What is outdated?
What failed?
What can be undone?

MenuList should show simple states:

Live
Pending approval
Scheduled
Unavailable today
Expired
Outdated
Needs action
Rollback available

These states should appear across Home, Menu, Publish, and Control.

22. The hidden “menu timeline”

Every menu should have a timeline.

Owner-facing:

Today
2:14 PM - Paneer Tikka price changed ₹179 → ₹199
1:05 PM - Chicken Biryani marked unavailable
12:10 PM - Rajma Chawal added as Today’s Special
11:00 AM - Staff uploaded 3 photos

This timeline is useful for:

Trust
Debugging
Rollback
Staff accountability
Owner memory
Multi-outlet operations

The owner should not need to ask:

What happened to my menu?

The timeline should answer it.

23. The owner’s mental model should become simple

MenuList should teach the owner one mental model:

Tell MenuList.
Review proposal.
Approve.
Menu updates.

Everything should reinforce this.

Upload menu:

Upload → Review → Approve → Publish

Price update:

Tell → Review → Approve → Publish

Photo:

Upload → Review → Approve → Publish

Offer:

Tell → Review → Approve → Publish

Mismatch:

Detect → Decide → Publish/fix

Rule:

Suggest → Approve → Auto-run next time

This consistency makes the product easy.

24. The seven surfaces as one product

Here is the clean mental map:

Home
What needs attention?

Command Box
Tell MenuList what changed.

Agent Inbox
Review prepared actions.

Master Menu
See and manage source of truth.

Publish Center
See where menu is live and synced.

Growth
Improve menu quality, offers, photos, and insights.

Control
Manage trust, staff, rules, history, and rollback.

The owner does not need to visit every surface every day.

Most daily usage should happen through:

Home
Command Box
Agent Inbox

The other surfaces provide confidence, improvement, and control.

25. What makes this smooth for SMB owners

These are the most important product decisions from this layer.

1. The home screen is a decision room

Not a dashboard.

It should answer:

What needs my attention now?
2. The command box is action-first

It should create proposals, not chat replies.

3. Agent Inbox is the trust layer

Every important AI action becomes:

Approve
Edit
Cancel
4. Customer preview is everywhere

Owners approve what customers will see.

5. Publishing is one action

MenuList handles QR, public menu, WhatsApp, print, and exports as one flow.

6. Staff uses task links

Staff helps without entering the full dashboard.

7. Rules reduce repeated approvals

Automation comes from owner-approved rules.

8. Menu Health is impact-based

Fix what matters to customers and revenue first.

9. Every operation has a receipt

After changes:

Done. Updated. Verified. Rollback available.
10. Corrections become memory

Every owner edit makes MenuList smarter.

26. The final screen-level product behavior

MenuList should behave like this:

Owner opens app.

MenuList:
Your menu is live.
2 updates need approval.
1 offer expires tonight.
3 photos waiting.
Cold Coffee was unavailable yesterday. Restore?

Owner:
Add mango lassi 99 today special

MenuList:
Create Mango Lassi ₹99 under Today’s Special.
Available today only.
Show at top.
Expires tonight.
WhatsApp text ready.

[Approve]

MenuList:
Done.
QR menu updated.
Public menu updated.
WhatsApp text ready.
Printable PDF regenerated.
Rollback available.

Later:
Photo uploaded by staff.
Approve?

Evening:
Today’s Special will expire at closing as approved.
Extend or let it expire?

This is the product experience we should keep building toward.

27. The next layer

Now that the owner-facing surfaces are clear, the next layer is the internal product model:

What objects must exist?
What states must each object have?
How proposals are structured?
How approvals work?
How publishing jobs work?
How rollback works?
How memory works?
How agents coordinate safely?

That is where MenuList becomes ready for actual specs.
```

### Message 20 - User

- Message ID: 5e2ff6e7-a545-49df-8617-52fbe93fc7cc
- Captured from scroll band: target-211000

```
Next
```

### Message 21 - Assistant

- Message ID: 99067182-caaf-40ca-beaf-febeefb6c3d9
- Model: gpt-5-5-pro
- Captured from scroll band: target-211000

```
I’ll take the same MenuList vision one layer inward now: the internal operating model behind source of truth, proposals, approvals, publishing, memory, rollback, and safe agent coordination.
```

### Message 22 - Assistant

- Message ID: a7c5ff6d-b16b-4aeb-8a27-c82cc468411f
- Model: gpt-5-5-pro
- Captured from scroll band: target-211000

```
Next layer: the internal MenuList operating model

Now we go under the screens.

The owner sees:

Tell MenuList what changed.
Review proposal.
Approve.
Menu updates.

But internally, MenuList must behave like a controlled operations system, not a chatbot and not a simple CRUD menu editor.

The deepest model is this:

MenuList does not directly edit menus. MenuList receives events, creates proposed operations, gets approval when needed, publishes the approved menu state, verifies the result, and stores memory.

That is what makes it safe enough for SMB owners.

1. The core internal truth

MenuList should treat the menu as three things at once:

1. A structured menu graph
2. A live publishing source
3. An operating history

Most menu tools only store the first part:

Item name
Price
Category
Description
Photo

MenuList needs much more.

Because owner reality is not:

Edit item.

Owner reality is:

This item is sold out today.
This offer expires tonight.
This branch has different price.
This staff photo needs approval.
This price changed but print menu is old.
This customer saw wrong price somewhere.
This item should show only after 4 PM.
This item should stay visible even when unavailable.

So the internal model must support operations, not just content.

2. The Menu Graph

The Menu Graph is the source of truth.

It should represent the restaurant’s menu in a structured way.

Not flat like:

Paneer Tikka - ₹199
Cold Coffee - ₹99

But as a connected structure:

Business
  Outlet
    Menu
      Category
        Item
          Variant
          Modifier
          Add-on
          Price
          Availability
          Visibility
          Photo
          Description
          Label
          Offer relationship
          Publishing status

Example:

Business:
Sharma Cafe

Outlet:
Indiranagar

Menu:
Main Menu

Category:
Beverages

Item:
Cold Coffee

Price:
₹99

Availability:
Available 11 AM - 11 PM

Visibility:
Show on customer menu

Labels:
Veg
Cold
Popular

Photo:
Missing

Description:
Chilled coffee blended with milk and ice.

Appears on:
QR menu
Public menu
WhatsApp menu
Print menu

The owner does not need to see this complexity.
But the system needs it.

Without this structure, MenuList cannot safely handle:

Cold coffee over
Lunch thali 12 to 4
Increase all tea by 5
Add cheese option to all burgers
Hide item from QR but keep in staff menu
Apply this to all outlets except Bandra
3. The most important object: Change Proposal

The center of MenuList should not be the menu item.

The center should be the Change Proposal.

Because AI should not directly mutate the live menu.

Every meaningful action becomes:

Proposal first.
Approval second.
Publishing third.

A proposal is like a prepared work order.

Example owner command:

Paneer tikka 199

Internal proposal:

Proposal type:
price_update

Source:
owner_command

Original input:
Paneer tikka 199

Resolved item:
Paneer Tikka

Change:
price ₹179 → ₹199

Scope:
current outlet

Affected surfaces:
QR menu
Public menu
WhatsApp menu
Print PDF

Risk:
high

Approval:
owner required

Customer preview:
Paneer Tikka ₹199

Owner sees:

Price Update

Paneer Tikka
₹179 → ₹199

This will update QR menu, public menu, WhatsApp menu, and print PDF.

[Approve] [Edit] [Cancel]

This is the key safety mechanism.

4. Why proposals matter so much

Without proposals, AI becomes dangerous.

If AI directly changes the menu, one mistake can create:

wrong price
wrong item hidden
wrong branch updated
old offer still active
staff mistake published
customer complaint
owner losing trust

With proposals, MenuList can be powerful but controlled.

The proposal gives the owner:

before/after
scope
risk
customer preview
affected surfaces
approval choice
rollback path

This is why the Agent Inbox is not just a UI feature.

It is the product’s trust architecture.

5. Proposal lifecycle

Every proposal should move through clear states.

created
needs_clarification
pending_approval
approved
edited
rejected
scheduled
publishing
published
verified
failed
rolled_back
expired

Example:

Owner:
Increase all tea by 5

System:
created → pending_approval

Owner:
Approve

System:
approved → publishing → published → verified

Example with ambiguity:

Owner:
Tea 20

System:
created → needs_clarification

Owner:
All tea items

System:
pending_approval → approved → published → verified

Example with scheduled special:

Owner:
Today special mango lassi 99

System:
created → pending_approval → approved → published → scheduled_expiry → expired

This makes the product reliable.

The owner sees simple cards, but the backend knows exactly where every operation stands.

6. The Menu Operation

A Menu Operation is the larger container around one or more proposals.

This is important because owners often give multi-action commands.

Example:

Cold coffee over and add mango lassi 99 today special

This should create one operation with two proposals:

Operation:
owner_command_2026_06_17_1205

Proposal 1:
Mark Cold Coffee unavailable until tomorrow

Proposal 2:
Create Mango Lassi ₹99 as Today’s Special

Owner sees:

I prepared 2 updates:

1. Mark Cold Coffee unavailable until tomorrow 10 AM.
2. Add Mango Lassi ₹99 under Today’s Special, expires tonight.

[Approve both] [Edit] [Cancel]

This is smoother than forcing the owner to send two commands.

Smoothness improvement to lock

MenuList should support multi-change commands from day one.

Owners naturally speak in batches:

Tea 20, coffee 40, cold coffee over

MenuList should not make them repeat commands one by one.

It should prepare a grouped operation and let them approve together or separately.

7. The hidden operation grammar

Every owner input should be parsed into this internal grammar:

Action
Object
Value
Scope
Time
Surface
Risk

Example:

Increase all paneer items by 20

Internal interpretation:

Action:
increase price

Object:
items containing paneer

Value:
+₹20

Scope:
current outlet

Time:
permanent

Surface:
all customer-facing menu surfaces

Risk:
high

Example:

Biryani over

Internal interpretation:

Action:
mark unavailable

Object:
biryani items

Value:
unavailable

Scope:
current outlet

Time:
until next opening

Surface:
customer-facing menus

Risk:
medium

Example:

Lunch thali 12 to 4

Internal interpretation:

Action:
set availability window

Object:
Lunch Thali

Value:
available 12 PM - 4 PM

Scope:
current outlet

Time:
daily

Surface:
customer-facing menus

Risk:
medium

The owner never sees this grammar.

But the system must use it every time.

8. Entity resolution

Entity resolution means:

When the owner says something messy, MenuList figures out the exact menu object.

Owner says:

chai 20

Menu might contain:

Masala Tea
Ginger Tea
Lemon Tea
Elaichi Tea

MenuList should decide whether “chai” means:

Masala Tea
all tea items
one category
something new

If confident:

Masala Tea ₹15 → ₹20

[Approve]

If not confident:

Which one did you mean?

Masala Tea
Ginger Tea
Lemon Tea
All tea items

After the owner chooses, MenuList should remember.

Remember “chai” as Masala Tea?

or:

Remember “chai” as all tea items?

This is very important for SMBs because owners do not speak like databases.

They use:

chai
PBM
CB
momos
special pizza
burger
coffee
thali
family pack

MenuList should learn their language.

9. Scope resolution

Scope is one of the most dangerous parts of menu operations.

Every command must answer:

One item or many items?
One outlet or all outlets?
One surface or all surfaces?
Temporary or permanent?
Now or scheduled?

Example:

Increase dosa to 119

For single outlet:

Masala Dosa ₹99 → ₹119

Scope:
Current outlet only

For multi-outlet:

Apply to:
Current outlet
All outlets
Selected outlets

Example:

Biryani sold out only Bandra

MenuList should show:

Mark Biryani unavailable in Bandra outlet only.

Other outlets remain unchanged.

[Approve]
Smoothness improvement to lock

Always show scope before approval.

Many severe mistakes happen because the system updates more than the owner intended.

For high-risk actions, scope must be visible:

Current outlet only
All outlets
Selected outlets
QR menu only
All customer menus
Today only
Permanent

This one detail will prevent many trust-breaking moments.

10. Risk model

MenuList must classify every operation by risk.

Risk is not about how hard the task is technically.

Risk is about business damage if wrong.

Low-risk actions
Draft item descriptions
Suggest missing photos
Detect duplicate items
Suggest category cleanup
Prepare WhatsApp text
Create unpublished offer draft

Behavior:

Prepare freely.
Batch suggestions.
Approval can be light.
Medium-risk actions
Mark item unavailable
Restore item
Move category
Set availability timing
Expire offer
Publish photo
Feature item

Behavior:

Show proposal.
Require approval or manager permission.
Show customer preview.
High-risk actions
Change price
Bulk update
Archive item
Delete item
Apply to all outlets
Publish externally
Change allergens
Change nutrition claims
Change tax display

Behavior:

Always show before/after.
Always show scope.
Always require explicit approval.
Always create rollback snapshot.
Always log approval.
Blocked or protected actions

Some actions should not happen unless the owner explicitly overrides.

Invent ingredient claims
Invent allergen claims
Invent health claims
Delete history permanently
Silently overwrite source of truth from external source
Let staff publish price changes

Behavior:

Ask owner.
Or block.
Or create draft only.
11. Policy engine

The Policy Engine decides what is allowed.

It answers:

Can this action be drafted?
Can this action be approved by manager?
Does owner approval need to happen?
Can this action run automatically because of an approved rule?
Should the system ask clarification?
Should the action be blocked?

Example:

Staff Ravi:
Chicken Biryani sold out

Policy:

Ravi can mark items unavailable.
Risk: medium.
Allowed.

MenuList:

Ravi marked Chicken Biryani unavailable until tomorrow 11 AM.

Example:

Staff Ravi:
Chicken Biryani 249

Policy:

Price change.
Risk: high.
Staff cannot approve.
Owner approval required.

MenuList:

Ravi requested a price change.

Chicken Biryani ₹229 → ₹249

[Approve] [Reject]

Example:

Today’s Special expires tonight

Policy:

Expiry was approved when special was created.
Rule/action already approved.
Can execute.

MenuList:

Today’s Special expired at closing as approved.
Smoothness improvement to lock

MenuList should use owner-approved rules to reduce approval fatigue.

Not hidden AI autonomy.

Owner-approved automation.

Example:

Rule:
Today’s Specials expire at closing.
Approved by Owner.

Now MenuList can expire specials safely.

This is the right path to agentic operations.

12. Approval model

Approval should not be one generic button internally.

MenuList needs different approval types.

Owner approval
Manager approval
Staff request
Batch approval
Rule approval
External publish approval
Rollback approval
Scheduled approval

Example:

Owner says:
Add today special rajma chawal 129

Approval includes:

Create item
Feature it
Expire tonight
Publish to QR and public menu
Prepare WhatsApp text

The owner approves the full operation.

At closing, MenuList does not need to ask again to expire it, because expiry was included in the original approval.

Approval should include consequences

A good approval card should show:

What changes
Where it changes
Who will see it
When it starts
When it ends
Can it be undone

Example:

Create Today’s Special:

Rajma Chawal ₹129

Visible:
Today only

Placement:
Top of menu

Expires:
Tonight at closing

Rollback:
Available

[Approve]

This is how the owner stays in control without doing manual work.

13. Menu versioning

MenuList needs menu history.

Not product versions.
Menu versions.

Every approved operation creates a new menu state.

Example:

Menu state before:
Paneer Tikka ₹179

Approved operation:
Change Paneer Tikka to ₹199

Menu state after:
Paneer Tikka ₹199

Internally:

Menu Snapshot 41
↓
Operation: price_update
↓
Menu Snapshot 42

Owner sees:

Paneer Tikka changed from ₹179 to ₹199.
Approved by Owner.
Published to QR and public menu.
Rollback available.

Versioning is required for:

rollback
audit history
publishing verification
drift detection
staff accountability
multi-outlet control
print freshness
external sync status

Without versioning, MenuList cannot be trustworthy.

14. Operation groups

Bulk actions need grouped history.

Example:

Increase all paneer items by ₹20

This may change seven items.

Internally, these should not become seven unrelated changes.

They should belong to one operation group:

Operation:
Bulk paneer price update

Changes:
Paneer Tikka ₹179 → ₹199
Paneer Roll ₹99 → ₹119
Paneer Butter Masala ₹249 → ₹269
Paneer Momos ₹120 → ₹140
...

Owner sees:

Bulk price update completed.
7 items changed.

[Rollback all]

This is critical.

Without operation groups, rollback becomes painful.

Smoothness improvement to lock

Every bulk update should create one grouped operation with one grouped rollback.

Owners should not have to undo item by item.

15. Publishing model

Publishing should happen after approval.

The flow:

Approved proposal
↓
New menu state created
↓
Publishing jobs created
↓
Each surface updated or prepared
↓
Verification runs
↓
Receipt shown

MenuList should support many publishing surfaces from one master menu:

QR menu
Public web menu
WhatsApp menu
Printable PDF
Google menu/link/structured data where available
Delivery-app export
Instagram caption
Counter display
Staff menu

Each surface has its own state.

updated
pending
submitted
waiting
failed
manual_action_required
outdated
not_connected

Owner sees plain language:

QR menu updated.
Public menu updated.
WhatsApp menu ready.
Printable PDF regenerated.
Google submitted.
Delivery export ready.

Not:

sync_job_success
external_surface_pending
adapter_payload_created
16. Surface adapters

Internally, every publishing destination should have an adapter.

A surface adapter converts the master menu into that surface’s format.

Example master item:

Mango Lassi
₹99
Summer Special
Available this week
Description: Chilled mango lassi made with yogurt and mango.

QR menu output:

Full item card with badge, description, photo, price.

WhatsApp output:

Mango Lassi - ₹99 - Summer Special

Print output:

Compact menu line.

Instagram output:

Short promo text.

Google output:

Structured item name, category, price, description.

Delivery export:

CSV, image, or task summary.

The owner should never manually format each one.

Smoothness improvement to lock

One master menu should generate many surface-specific outputs.

This is a major long-term positioning strength.

MenuList is not just where the menu is edited.

MenuList is where the menu truth lives.

17. Verification model

Most tools stop at:

Saved.

MenuList should continue to:

Published.
Verified.
Receipt created.

Verification means:

Did the QR menu actually show the new value?
Did the public menu update?
Was the print PDF regenerated?
Did the external surface accept the update?
Is any surface still outdated?

Example:

Owner changes Paneer Tikka ₹179 → ₹199.

MenuList:
QR menu updated.
Public menu updated.
Printable PDF regenerated.
Verified live.
Rollback available.

If something fails:

QR menu updated.
Public menu updated.
Printable PDF could not regenerate.

[Try again]

If external platform is slow:

Google update submitted.
It may take time to appear.
I’ll keep checking.
Smoothness improvement to lock

Every operation should end with a completion receipt.

Not just:

Saved

But:

Done. Updated on QR and public menu. Rollback available.

This gives owners confidence.

18. Rollback model

Rollback should be built into the system from the start.

Rollback needs:

before state
after state
operation group
affected surfaces
approval record
publishing record

Example:

Bulk price update:
7 paneer items increased by ₹20

Rollback proposal:

Rollback bulk paneer price update?

This will restore:
Paneer Tikka ₹199 → ₹179
Paneer Roll ₹119 → ₹99
Paneer Butter Masala ₹269 → ₹249
...

[Rollback all] [Cancel]

After rollback:

Restored previous prices.
QR and public menu updated.
Printable PDF regenerated.
Rollback logged.

Rollback itself should be treated as a new operation.

That way, history remains clean.

Operation 1:
Prices increased.

Operation 2:
Rollback applied.

The system should not erase history.

It should restore state and preserve the audit trail.

19. Item state model

Every item should have operational states.

Not just:

active
inactive

MenuList needs richer states:

draft
needs_confirmation
pending_approval
live
scheduled
available
temporarily_unavailable
hidden
visible_as_unavailable
expired
archived
conflict_detected
photo_pending
description_pending
rollback_available

Example:

Cold Coffee
State: temporarily_unavailable
Visibility: visible_as_unavailable
Restore: tomorrow 10 AM

Customer sees:

Cold Coffee
Unavailable today

Owner sees:

Cold Coffee unavailable until tomorrow 10 AM.
Restore now?

This distinction matters.

Availability and visibility are different.

Availability:
Can the customer get this item?

Visibility:
Should the item appear on the menu?

An unavailable item can still be visible.

That is important for demand and customer awareness.

20. Offer state model

Offers need their own lifecycle.

draft
pending_approval
scheduled
active
expiring_soon
expired
extended
archived
converted_to_regular

Example:

Today’s Special:
Rajma Chawal ₹129

State:
active

Expiry:
tonight at closing

After closing:
expired

Owner sees:

Rajma Chawal expired at closing as approved.
Add as regular item?

That last suggestion is important.

If an item performs well as a special, MenuList should help the owner decide whether to keep it.

Smoothness improvement to lock

Successful specials should create follow-up decisions.

Example:

Mango Lassi got 63 views today.
Add it as a regular item or repeat tomorrow?

This makes MenuList feel like it is learning from the business.

21. Photo state model

Photos should not be a simple uploaded file.

They should move through states.

missing
requested
uploaded_by_staff
matched_to_item
quality_checked
needs_owner_approval
approved
published
rejected
retake_requested
replaced

Example:

Ravi uploaded photo.
MenuList matched it to Paneer Tikka.
Quality: good.
Owner approval needed.

Owner sees:

Photo for Paneer Tikka is ready.

Quality: Good
Looks like a dry starter dish.

[Publish] [Ask retake] [Choose another item]

This creates an operational photo workflow.

Not a media folder.

22. Description state model

Descriptions should also have safety states.

missing
weak
draft_generated
needs_confirmation
approved
published
owner_edited
blocked_claim

Example:

Special Pizza

MenuList should not invent:

Loaded with cheese, olives, jalapeños, and house sauce.

Unless known.

Safe behavior:

I need one detail before writing this:
What makes it special?

For safe items:

Fresh Lime Soda
Refreshing lime soda served chilled.

Owner can approve.

Smoothness improvement to lock

Use safe descriptions by default and ask ingredient questions only when needed.

This keeps the owner from getting stuck in a long content-writing flow.

23. Drift state model

Drift means menu mismatch across surfaces.

Owner-friendly language:

Possible mismatch

Internal states:

observed
matched
possible_mismatch
needs_owner_decision
resolved_keep_menulist
resolved_update_menulist
external_task_created
ignored
verified_resolved

Example:

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

MenuList should ask:

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]

If owner chooses keep ₹99:

MenuList remains source of truth.
Delivery menu marked outdated.
Export update ready.

If owner chooses ₹89:

MenuList price update proposal:
Veg Burger ₹99 → ₹89

[Approve]

Notice that external drift should not directly overwrite the menu.

It creates a decision.

24. Memory model

Memory is the long-term moat.

MenuList should remember more than menu content.

It should remember how this business operates.

There should be several kinds of memory.

Alias memory

Owner language:

chai = Masala Tea
PBM = Paneer Butter Masala
CB = Chicken Biryani
coffee = Cold Coffee in this cafe

This makes commands faster over time.

First time:

PBM 269

Did you mean Paneer Butter Masala?

Later:

PBM ₹249 → ₹269

[Approve]
Preference memory

Owner style:

Prefers short descriptions
Avoids the word spicy unless confirmed
Likes Hindi WhatsApp promo text
Wants sold-out items visible as unavailable
Wants lunch items hidden outside lunch time
Uses closing time as offer expiry

This makes proposals better.

Operational memory

Business patterns:

Beverages often restore next morning
Weekend Combo usually expires Sunday night
Lunch Thali runs 12 PM - 4 PM
Biryani often sells out after 9 PM
Owner changes prices on Mondays

This helps MenuList suggest rules.

Staff memory

Staff behavior:

Ravi uploads good photos
Priya often submits wrong item matches
Manager can mark sold out
Only owner approves price

This helps risk handling.

Outlet memory

Branch behavior:

Bandra prices are higher
Powai has different breakfast timings
Indiranagar does not sell momos
Outlet A runs lunch combo
Outlet B does not

This is essential for multi-outlet.

25. Rule model

Rules are owner-approved patterns.

They are not hidden AI decisions.

Example rules:

Today’s Specials expire at closing.
Sold-out beverages restore next morning.
Staff photos marked good still require owner approval.
Lunch Thali is visible only 12 PM - 4 PM.
Show unavailable items instead of hiding them.

A rule should have:

trigger
condition
action
scope
approval owner
created date
last run
pause option
audit history

Example:

Rule:
When Today’s Special is created,
set expiry to closing time.

Approved by:
Owner

Scope:
Current outlet

Status:
Active

Owner sees:

Today’s Specials expire at closing.

Not a technical rule engine.

Smoothness improvement to lock

Repeated approvals should become suggested rules.

Example:

You have approved “restore sold-out beverages next morning” 5 times.

Create rule?

[Create rule] [No]

This reduces daily work while preserving trust.

26. Event model

MenuList should be event-driven.

Everything starts as an event.

Event sources:

Owner command
Owner upload
Staff action
Customer signal
System timer
External surface check
Menu health scan
Publishing result
Rule trigger
Manual edit

Example events:

owner_command_received
menu_pdf_uploaded
staff_photo_uploaded
item_viewed
customer_search_detected
offer_expiry_time_reached
external_price_mismatch_detected
publish_job_failed
rule_triggered

Events create proposals, reminders, insights, or publishing jobs.

This makes the system feel alive.

It is always watching the menu state, not waiting for manual editing.

27. Agent coordination model

MenuList should not be one large chatbot.

It should be a set of specialized agents working on the same menu graph.

But there is one strict rule:

No agent can directly change the live menu. Agents create proposals. Only approved proposals become live changes.

This protects the owner.

Intake Agent

Understands input type.

text command
voice command
menu photo
PDF
Excel
WhatsApp text
staff upload
external screenshot

Its job:

What came in?
What kind of menu operation might this be?
Resolver Agent

Finds the exact menu objects.

chai → Masala Tea?
biryani → all biryani items?
paneer → all items containing paneer?
Bandra → outlet?
today special → offer/category?

Its job:

Map messy language to structured menu objects.
Ask clarification when needed.
Proposal Agent

Creates structured changes.

old value
new value
affected item
affected outlet
affected surface
time window
customer preview

Its job:

Prepare the work.
Policy Agent

Checks risk and permission.

Is this high-risk?
Who can approve?
Can this be auto-run by rule?
Should this be blocked?

Its job:

Protect the owner.
Preview Agent

Generates customer preview.

Before:
Paneer Tikka ₹179

After:
Paneer Tikka ₹199

Its job:

Show what customers will see.
Publishing Agent

Updates surfaces after approval.

QR menu
Public menu
WhatsApp menu
Print PDF
Google
Delivery export

Its job:

Publish approved menu state.
Verification Agent

Checks whether publishing worked.

QR updated?
Public menu updated?
Print regenerated?
External submitted?
Mismatch still exists?

Its job:

Make sure the work is complete.
Memory Agent

Learns from decisions.

aliases
preferences
rules
owner edits
staff reliability
outlet patterns

Its job:

Make MenuList smoother next time.
Insight Agent

Turns behavior into actions.

Customers searched “momos.”
Biryani has high views but no photo.
Lunch Combo performs well.
Expired offer still live.

Its job:

Create useful menu decisions, not passive analytics.
28. The agent safety contract

Every agent must follow these internal rules:

Read menu state
Prepare structured output
Never directly mutate live menu
Never bypass policy
Never publish without approval unless rule-approved
Never invent risky claims
Always log action source
Always preserve rollback path for risky changes

This is what makes MenuList agentic but safe.

Agentic does not mean:

AI does whatever it wants.

Agentic means:

The system can understand, prepare, coordinate, publish, verify, and learn inside owner-approved boundaries.
29. The Impact Simulator

This is a very important smoothness feature.

Before high-risk changes, MenuList should simulate impact.

Example:

Increase all paneer items by ₹20

Owner should see:

This will change 7 items.
It affects current outlet only.
It updates QR, public menu, WhatsApp menu, and print PDF.
Customers will see new prices immediately after approval.
Rollback available.

For multi-outlet:

This will change 18 items across 3 outlets.
Bandra outlet unchanged.

For print:

Your printable menu will be regenerated.
Existing printed copies may show old prices.

For external platforms:

Delivery export will be created.
Direct update not connected.
Smoothness improvement to lock

High-risk changes should have an impact simulator before approval.

This prevents owner fear.

It turns:

Will this break something?

into:

I know exactly what will happen.
30. The Menu Operating Ledger

MenuList needs a plain-language ledger.

Not a technical log.

A menu ledger answers:

What changed?
Who changed it?
Who approved it?
When did it go live?
Where did it publish?
Was it verified?
Can it be undone?

Example:

Today, 2:14 PM

Paneer Tikka changed from ₹179 to ₹199.
Requested by Owner.
Approved by Owner.
Published to QR menu and public menu.
Printable PDF regenerated.
Verified live.
Rollback available.

For staff:

Today, 1:05 PM

Ravi marked Chicken Biryani unavailable until tomorrow 11 AM.
Published to QR and public menu.
Restore scheduled.

For rule:

Yesterday, 11:00 PM

Today’s Special expired automatically.
Rule approved by Owner on Monday.

This ledger is essential for SMB trust.

Owners should never wonder:

Why is this price changed?
Who hid this item?
Why is my offer gone?
31. The system should separate truth, draft, and output

This is a deep architectural principle.

There are three layers:

Menu Truth
Draft/Proposal
Published Output
Menu Truth

The approved canonical menu.

Paneer Tikka ₹199
Draft/Proposal

Prepared but not yet live.

Paneer Tikka ₹199 → ₹219 pending approval
Published Output

What each customer surface currently shows.

QR menu: ₹199
Public menu: ₹199
Print PDF: ₹179 outdated
Google: submitted

This separation is critical.

Without it, the system cannot answer:

What is approved?
What is pending?
What is actually live?
What is outdated?
Smoothness improvement to lock

MenuList should always distinguish approved truth from published reality.

Example:

MenuList price is ₹199.
Google still shows ₹179.
Update submitted.

This prevents confusion.

32. Customer signals model

MenuList should collect customer behavior, but only use it to create useful menu decisions.

Signals:

menu views
item views
search terms
WhatsApp clicks
offer views
photo interactions
unavailable item views
category views
QR scans
location/outlet views

But owner should not see raw analytics first.

The system should convert signals into actions.

Example:

Signal:
Customers searched “momos” 18 times.

Insight:
Momos are not on the menu.

Proposal:
Add momos item or ignore search.

Owner sees:

Customers searched “momos” 18 times this week.
Momos are not on your menu.

[Add item] [Ignore]

Example:

Signal:
Chicken Biryani has many views but no photo.

Proposal:
Request photo from staff.

Owner sees:

Chicken Biryani is your most viewed item but has no photo.

[Request photo]
33. Menu Health model

Menu Health should be based on impact.

Not equal scoring.

A missing photo on a top item matters more than a missing description on a rarely viewed item.

Menu Health should consider:

customer-visible correctness
missing prices
expired offers
publishing mismatches
high-view items missing photos
missing veg/non-veg labels
weak descriptions
duplicate items
unclear variants
stale print menus
unresolved staff submissions

The output should be action-first:

Menu Health: 74/100

Fix first:
Chicken Biryani has high views but no photo.
Weekend Combo expired yesterday.
Fresh Lime Soda has no price.
6 items need veg/non-veg labels.

The owner should not feel judged.

They should feel helped.

34. Time model

Menus are time-sensitive.

MenuList must deeply understand time.

Time objects:

business hours
outlet hours
opening time
closing time
item availability window
offer validity
temporary unavailability
scheduled publish
scheduled restore
special expiry
holiday hours
weekday/weekend rules

Example:

Cold coffee over

System default:

Unavailable until next opening.

Example:

Lunch thali 12 to 4

System:

Available daily 12 PM - 4 PM.
Outside that time, show as “Available 12 PM - 4 PM” or hide based on owner preference.

Example:

Weekend combo

System:

Suggest Friday-Sunday or ask if unclear.
Expiry Sunday closing.
Smoothness improvement to lock

MenuList should use restaurant rhythm: opening, rush, closing, weekly review.

This makes the product feel natural.

During rush:

Sold out
Restore
Add special
Change price

At closing:

Expire specials
Restore tomorrow
Show summary

Weekly:

Improve photos
Repeat offers
Review searches
35. Temporary vs permanent model

This distinction must exist everywhere.

Temporary actions:

sold out today
special today
seasonal item
limited stock
holiday timing
staff photo pending
offer this week

Permanent actions:

price change
new regular item
archive item
category change
variant added
description approved

Owner says:

Cold coffee not available

MenuList assumes:

temporary

Owner says:

Remove cold coffee

MenuList asks:

Archive permanently or mark unavailable for now?

This prevents accidental menu damage.

36. Manual task model

Some operations cannot be fully automated.

MenuList should still help.

Example:

Delivery app direct publishing not connected.

MenuList should create:

manual task
export file
change summary
checklist
mark done button
reminder

Owner sees:

Delivery app update needs manual action.

I prepared:
Updated price list
Menu image export
Change summary

[Download export] [Mark done]

This keeps the promise:

Change once. MenuList handles the rest as much as possible.

Even when direct publishing is not possible, MenuList reduces work.

37. External source model

MenuList should treat external sources carefully.

External sources include:

Google
delivery-app screenshots
old PDFs
public website
social media menus
print PDFs
WhatsApp menus
staff uploads
customer complaints

But external sources are not automatically trusted.

MenuList should compare them to the master menu.

Example:

External:
Paneer Tikka ₹179

MenuList:
Paneer Tikka ₹199

MenuList asks:

Which is correct?

This protects source of truth.

The system should not silently overwrite MenuList because an external source differs.

38. Staff model

Staff should be part of the operating system, but with limited power.

Staff should mostly use task-specific links.

photo upload link
sold-out link
restore link
correction request link
stock note link

Roles:

Owner
Manager
Staff
Agency
Accountant

Permissions:

Can upload photos
Can mark sold out
Can restore items
Can create drafts
Can request price changes
Can approve price changes
Can publish externally
Can manage rules
Can rollback

Owner sees:

Ravi can mark sold out and upload photos.
Ravi cannot change prices.

This is simple enough for SMBs.

Smoothness improvement to lock

Do not force staff into the full dashboard.

Task links are much better.

A cook or counter staff member should not need to understand MenuList.

They should just open:

Mark sold out
Upload photo
Submit correction
39. Owner notification model

MenuList should notify based on urgency and business impact.

Notify immediately:

price mismatch found
publish failed
staff requested price change
expired offer still live
high-risk approval pending
customer-visible issue

Notify gently:

photo waiting
description improvements ready
low-impact health issue
weekly menu review

Do not notify noisily for:

minor formatting issue
low-view item missing description
optional promo idea

The system should avoid becoming annoying.

40. The Decision Queue

Internally, Agent Inbox should be a priority queue.

Cards should be ranked by:

risk
urgency
customer impact
revenue impact
time sensitivity
owner approval requirement
business hours

Example priority order:

1. Publishing failed after price update
2. Price mismatch detected
3. Staff price change request
4. Offer expired but still live
5. Sold-out item needs restore
6. Staff photo waiting
7. Missing photo on top item
8. Description suggestions

This matters because owners cannot process everything.

MenuList must decide what deserves attention.

41. Batch model

Batching prevents overload.

Some things should be grouped.

Good batch examples:

9 descriptions ready
12 items need photos
6 veg/non-veg labels suggested
7 tea prices changing
3 staff photos waiting

But high-risk batches need stronger approval.

Example:

Bulk price update:
7 items changing

[Approve all] [Edit selected] [Cancel]

Low-risk batch:

9 safe descriptions ready

[Approve all] [Edit selected] [Skip]

The system should not create 40 separate cards for 40 low-risk improvements.

42. The Customer Preview Engine

Every proposal should be able to produce a customer preview.

Examples:

Price
Before:
Paneer Tikka ₹179

After:
Paneer Tikka ₹199
Sold out
Cold Coffee
Unavailable today
Timed item
Pav Bhaji
Available after 4 PM
Special
Today’s Special
Rajma Chawal ₹129
Available today only
Offer
Office Lunch Combo ₹149
Available 12 PM - 4 PM

The preview engine is important because owners approve faster when they see what customers will see.

43. The Command Memory Loop

Every command should improve the system.

Example:

Owner:
Burger 119

MenuList:
Which burger?

Owner:
Cheese Burger

Memory:

When this owner says “burger” without detail, Cheese Burger is likely.

But MenuList should not become overconfident too fast.

Next time:

Owner:
Burger 129

MenuList:
Cheese Burger ₹119 → ₹129?

[Approve] [Choose another]

After repeated confirmation, it can become smoother.

Example:

Owner:
PBM 279

MenuList:
Paneer Butter Masala ₹269 → ₹279.

[Approve]

This is how MenuList becomes personalized.

44. Correction learning

Owner corrections should become memory.

Example:

MenuList:
Mango Lassi category: Desserts

Owner:
No, Beverages

Memory:

Lassi-type items belong under Beverages for this business.

Example:

MenuList:
Description includes “spicy”

Owner:
Don’t say spicy

Memory:

Avoid spice claims unless item has spicy label.

Example:

MenuList:
Hide sold-out item

Owner:
No, show as unavailable

Memory:

Owner prefers sold-out items visible.

This is a major smoothness layer.

45. The “ask only when needed” model

MenuList should not ask too many questions.

Bad:

Owner:
Add mango lassi 99

MenuList:
Which category?
What description?
What photo?
What availability?
What label?
Which surfaces?

Good:

Create Mango Lassi under Beverages at ₹99.
No photo yet.
Visible on QR and public menu.

[Approve] [Edit]

Ask only when ambiguity blocks safe action.

Example:

Chicken Biryani 180/300

Ask:

Does 180/300 mean Half/Full or Regular/Family?

That is necessary.

But missing photo should not block.

Photo missing. Add later?
46. Internal behavior for common commands
Command: Tea 20

System:

Detect price update.
Resolve “tea”.
If one likely item, propose.
If multiple, ask.
Risk high.
Show before/after.
Require approval.

Owner sees:

I found Masala Tea.

₹15 → ₹20

[Approve] [Choose another] [Cancel]
Command: Increase all tea by 5

System:

Detect bulk price update.
Find tea items.
Show affected count.
Show before/after.
Risk high.
Require approval.
Group operation.
Create rollback group.

Owner sees:

Found 4 tea items.

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

[Approve all] [Edit selected] [Cancel]
Command: Biryani over

System:

Detect temporary unavailability.
Resolve biryani items.
Default until next opening.
Respect visibility preference.
Risk medium.
Create restore schedule.

Owner sees:

Mark 3 biryani items unavailable until tomorrow 11 AM?

[Approve all] [Select items] [Change time]
Command: Add mango lassi 99 today special

System:

Detect new special.
Create item.
Set category.
Set price.
Set badge.
Set top placement.
Set expiry at closing.
Prepare promo text.
Risk medium.
Require approval.

Owner sees:

Create Today’s Special:

Mango Lassi ₹99
Available today only
Expires tonight
Show at top

WhatsApp text ready.

[Approve] [Edit]
Command: Customer says burger price wrong

System:

Detect correction issue.
Resolve possible burger items.
Show current MenuList price.
Ask correct price.
Create price proposal if needed.

Owner sees:

I found these burger items:

Veg Burger ₹99
Cheese Burger ₹119
Chicken Burger ₹149

Which one is wrong?

Then:

What is the correct price?

[₹99] [₹119] [Other]
47. Internal model for owner trust

The system must always be able to answer:

What did MenuList understand?
Why did it propose this?
Who approved it?
What changed?
Where did it publish?
Did it verify?
Can it rollback?
What did it learn?

This should be true for every meaningful operation.

That is what separates MenuList from a normal AI wrapper.

48. The strongest internal principle

MenuList should never have a path like this:

AI output → live menu

It should always be:

AI output → structured proposal → policy check → approval/rule → menu state change → publishing → verification → log

Even for simple actions, this architecture should exist.

The owner experience can be fast.

But internally, the safety loop must remain.

49. The complete internal loop

Here is the full operating loop:

1. Event received
Owner command, upload, staff action, customer signal, timer, external mismatch

2. Intent understood
Price update, sold out, new item, special, offer, photo, drift, etc.

3. Entity resolved
Item, category, outlet, variant, offer, surface, time window

4. Scope determined
One item, many items, one outlet, all outlets, one surface, all surfaces

5. Risk classified
Low, medium, high, blocked

6. Proposal created
Before/after, customer preview, affected surfaces, approval requirement

7. Policy applied
Who can approve? Can rule execute? Need clarification?

8. Owner/staff approval
Approve, edit, reject, batch approve, create rule

9. Menu state updated
New approved menu state created

10. Publishing jobs run
QR, public, WhatsApp, print, Google, exports

11. Verification runs
Check live outputs, detect failure or mismatch

12. Receipt shown
Done, updated, verified, rollback available

13. Ledger updated
Plain-language history

14. Memory updated
Aliases, preferences, rules, patterns

This is the internal operating system.

50. What makes this smooth for SMB owners

The internal model directly creates owner smoothness.

Proposal-first architecture

Owners stay in control.

MenuList prepares.
Owner approves.
Operation grouping

Owners can approve multiple related changes at once.

7 prices changed together.
Rollback together.
Scope visibility

Owners avoid accidental branch-wide or bulk changes.

Current outlet only.
All outlets.
Selected outlets.
Safe defaults

The system behaves like a real restaurant manager.

Sold out = temporary.
Special = expires.
Delete = archive.
Price = approval.
Rules from repeated behavior

The system becomes faster without becoming unsafe.

You approved this pattern before. Create rule?
Plain-language ledger

Owners can trust and debug.

Who changed what, when, and where?
Verification and receipts

Owners know the work is complete.

QR updated. Public menu updated. Rollback available.
Memory

MenuList adapts to the owner’s language and habits.

PBM means Paneer Butter Masala.
Chai means Masala Tea.
51. Final internal definition

MenuList internally is not:

A menu database with AI chat.

It is:

A proposal-driven, approval-controlled, versioned, publishable, verifiable, memory-backed menu operations system.

The owner-facing product remains simple:

Tell MenuList what changed.
Approve the prepared update.
Menu stays correct everywhere.

The internal system makes that possible safely.

52. The foundation we now have

We have now defined:

The product positioning
The owner operating moments
The screen-level experience
The internal product model
The safety and approval logic
The menu state model
The publishing and verification model
The memory and rule model
The agent coordination model

The next layer is the actual specification layer:

Exact data objects
Fields
State machines
Proposal types
Permission rules
Agent contracts
Event names
API behavior
Screen components
Card templates
```

### Message 23 - Assistant

- Message ID: 21bf0c3c-a0b3-46c2-885a-90d6f18fb86a
- Model: gpt-5-5-pro
- Captured from scroll band: target-287000

```
I’ll now move from theory into the first product-spec layer: the internal objects, states, proposal types, permissions, and safety rules that keep the owner experience simple.
```

### Message 24 - Assistant

- Message ID: b6dd6c14-61b5-42a9-a49e-ea81fae1182c
- Model: gpt-5-5-pro
- Captured from scroll band: target-287000

```
Spec Layer 1: MenuList Operating Contract

Now we define the first real specification layer.

Not database-only.
Not screen-only.
Not AI prompt-only.

This is the operating contract of MenuList:

Every owner input becomes a controlled menu operation.
Every operation becomes one or more proposals.
Every risky proposal requires approval.
Every approved proposal creates a new menu state.
Every menu state publishes to surfaces.
Every publish is verified.
Every action is logged.
Every correction improves memory.

This contract must exist from day one.

1. The non-negotiable system rule

MenuList should never have this path:

AI understands something
↓
Live menu changes directly

The only allowed path is:

Event
↓
Operation
↓
Proposal
↓
Policy check
↓
Approval or approved rule
↓
Menu state update
↓
Publishing
↓
Verification
↓
Receipt
↓
Ledger
↓
Memory

This is the foundation.

The owner experiences speed.

The system preserves control.

2. The core product primitives

MenuList needs these primary object families from day one:

Business Identity
Menu Graph
Operations
Proposals
Approvals
Publishing
Verification
Ledger
Rollback
Rules
Memory
Staff Control
Menu Health
Customer Signals
Manual Tasks

These are not optional modules. They are the product’s skeleton.

A QR menu tool can survive with:

Business
Category
Item
Price
Photo

MenuList cannot.

MenuList needs to understand:

Who changed what?
Was it approved?
Where did it publish?
Is print outdated?
Is this item temporarily unavailable?
Is this special expired?
Does staff have permission?
Can this be rolled back?
Did the owner mean “chai” as Masala Tea?

That is why the object model must be deeper.

3. The top-level object map

Conceptually:

Business
  Outlet
    Menu
      MenuSnapshot
      Category
        Item
          Variant
          ModifierGroup
          Modifier
          Price
          AvailabilityRule
          VisibilityRule
          PhotoAsset
          Description
          Label

Operation
  ChangeProposal
    ChangePrimitive
    Approval
    RollbackSnapshot

PublishingSurface
  PublishJob
  SurfaceSnapshot
  VerificationResult
  ManualTask

StaffUser
  Role
  Permission

Rule
MemoryEntry
MenuHealthIssue
CustomerSignal
InsightAction
AuditLedgerEntry

The important thing:

The menu graph stores truth.
Proposals prepare changes.
Publishing surfaces display truth.
Ledger explains history.
Memory improves future behavior.

4. Business

The Business is the owner’s food business.

Owner meaning:

My restaurant, cafe, bakery, cloud kitchen, food truck, or local chain.

Core fields:

JSON
{
  "business_id": "biz_123",
  "name": "Sharma Cafe",
  "business_type": "cafe",
  "owner_user_id": "user_owner_1",
  "default_currency": "INR",
  "default_language": "en-IN",
  "secondary_languages": ["hi-IN"],
  "timezone": "Asia/Kolkata",
  "default_tax_display": "inclusive",
  "brand_voice": "simple_friendly",
  "created_at": "timestamp",
  "status": "active"
}

Important owner preferences should not be hidden in random settings. Some belong at business level:

Default language
Currency
Tax display
Description style
Sold-out visibility preference
Offer expiry preference
WhatsApp promo language
Approval strictness

Smoothness lock:

Business preferences should become defaults for proposals.

Example:

Owner prefers Hindi WhatsApp text.

Then whenever MenuList creates a promo kit, Hindi/Hinglish text should be prepared automatically.

5. Outlet

The Outlet is a physical or operating location.

Even a single-outlet business should use an outlet object internally. This prevents future multi-outlet pain.

Owner meaning:

This branch / shop / cloud kitchen location.

Core fields:

JSON
{
  "outlet_id": "outlet_1",
  "business_id": "biz_123",
  "name": "Indiranagar",
  "address": "Indiranagar, Bengaluru",
  "phone": "+91...",
  "timezone": "Asia/Kolkata",
  "business_hours": [
    {
      "day": "monday",
      "open": "10:00",
      "close": "23:00"
    }
  ],
  "status": "active",
  "menu_id": "menu_main_1",
  "inherits_master_menu": true
}

Outlet-specific things:

Price override
Availability override
Offer override
Staff permissions
Business hours
Publishing surfaces
Google profile
QR menu

Smoothness lock:

Every high-risk proposal should show outlet scope.

Example:

Current outlet only
All outlets
Selected outlets
All outlets except Bandra

This prevents dangerous multi-outlet mistakes.

6. Menu

The Menu is the owner’s current canonical customer-facing menu structure.

Owner meaning:

My live menu.

Core fields:

JSON
{
  "menu_id": "menu_main_1",
  "business_id": "biz_123",
  "name": "Main Menu",
  "menu_type": "customer_facing",
  "default_outlet_scope": "all_outlets",
  "current_snapshot_id": "snap_104",
  "status": "live",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}

Menu should not be treated as a flat table.

It should support:

Categories
Items
Variants
Add-ons
Modifiers
Time-based sections
Outlet-specific overrides
Offer placement
Visibility rules
Publishing formats

Smoothness lock:

The owner should see customer menu preview first, not database structure.

Internally the menu is structured.
Externally it should feel like:

This is what customers see.
7. Menu Snapshot

The Menu Snapshot is an approved menu state at a point in time.

This is different from product versioning. This is menu history.

Owner meaning:

What my menu looked like after a change.

Core fields:

JSON
{
  "snapshot_id": "snap_104",
  "menu_id": "menu_main_1",
  "business_id": "biz_123",
  "created_by_operation_id": "op_789",
  "created_at": "timestamp",
  "snapshot_status": "current",
  "summary": "Paneer Tikka price changed ₹179 → ₹199",
  "previous_snapshot_id": "snap_103"
}

Why snapshots matter:

Rollback
Audit
Publishing verification
Print freshness
External mismatch detection
History

Smoothness lock:

Every approved operation should create a recoverable menu state.

After price changes:

Rollback available.

That is only possible if snapshots exist.

8. Category

A Category groups items.

Owner meaning:

Starters, Beverages, Main Course, Today’s Special, Lunch Combos.

Core fields:

JSON
{
  "category_id": "cat_beverages",
  "menu_id": "menu_main_1",
  "name": "Beverages",
  "display_name": {
    "en-IN": "Beverages",
    "hi-IN": "Drinks"
  },
  "sort_order": 5,
  "visibility": "visible",
  "availability_rule_id": null,
  "is_system_category": false,
  "status": "active"
}

Special categories can be system-created:

Today’s Special
Offers
Lunch Combos
Unavailable Today
Seasonal

Smoothness lock:

MenuList should create useful categories automatically, but never make the owner manage system complexity.

Example:

Owner: Add rajma chawal 129 today special

MenuList can create or reuse:

Today’s Special

without asking unless needed.

9. Item

The Item is the main menu unit.

Owner meaning:

A dish, drink, combo, sweet, snack, or product customers see.

Core fields:

JSON
{
  "item_id": "item_paneer_tikka",
  "menu_id": "menu_main_1",
  "category_id": "cat_starters",
  "name": "Paneer Tikka",
  "display_name": {
    "en-IN": "Paneer Tikka"
  },
  "aliases": ["paneer tikka", "pt"],
  "description_id": "desc_123",
  "base_price_id": "price_123",
  "photo_ids": ["photo_55"],
  "label_ids": ["veg", "spicy", "bestseller"],
  "availability_rule_id": "avail_123",
  "visibility_rule_id": "vis_123",
  "sort_order": 3,
  "status": "live",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}

Item status should be richer than active/inactive:

draft
needs_confirmation
pending_approval
live
temporarily_unavailable
scheduled
hidden
archived
conflict_detected
photo_pending
description_pending

Smoothness lock:

Availability and visibility must be separate.

Example:

Cold Coffee
Availability: unavailable until tomorrow
Visibility: show as unavailable

Customer sees:

Cold Coffee
Unavailable today

This is different from hiding it completely.

10. Variant

A Variant is a price or size option under one item.

Owner meaning:

Half/full, small/medium/large, regular/family, egg/without egg.

Example:

Butter Chicken
  Half ₹299
  Full ₹499

Core fields:

JSON
{
  "variant_id": "var_butter_chicken_half",
  "item_id": "item_butter_chicken",
  "name": "Half",
  "price_id": "price_half_299",
  "sort_order": 1,
  "status": "active"
}

Common variant types:

Half / Full
Small / Medium / Large
Regular / Family
Single / Double
250g / 500g / 1kg

Smoothness lock:

Ambiguous split prices should trigger a simple clarification.

Example:

Chicken Biryani 180/300

MenuList should ask:

Does this mean Half ₹180 / Full ₹300 or Regular ₹180 / Family ₹300?

Not guess silently.

11. Modifier Group and Modifier

Modifiers are add-ons or choices.

Owner meaning:

Extra cheese, extra spicy, Jain option, add egg, choose sauce.

Modifier group example:

Add-ons for Burgers
  Extra Cheese ₹30
  Extra Patty ₹60
  Make it Combo ₹99

Core fields:

JSON
{
  "modifier_group_id": "modgrp_burger_addons",
  "name": "Burger Add-ons",
  "applies_to": {
    "type": "category",
    "category_id": "cat_burgers"
  },
  "selection_type": "multiple",
  "required": false,
  "status": "active"
}

Modifier:

JSON
{
  "modifier_id": "mod_extra_cheese",
  "modifier_group_id": "modgrp_burger_addons",
  "name": "Extra Cheese",
  "price_delta": 30,
  "status": "active"
}

Owner command:

Add cheese option 30 for all burgers

MenuList proposal:

Add Extra Cheese ₹30 to 5 burger items.

[Approve] [Edit selected] [Cancel]

Smoothness lock:

Bulk modifier changes should show affected item count and allow edit selected.

12. Price

Price should be its own object or structured component because price is high-risk and history-sensitive.

Owner meaning:

What customers pay or see.

Core fields:

JSON
{
  "price_id": "price_123",
  "amount": 199,
  "currency": "INR",
  "display_format": "₹199",
  "tax_mode": "inclusive",
  "valid_from": "timestamp",
  "valid_until": null,
  "outlet_scope": ["outlet_1"],
  "status": "active"
}

Why price needs structure:

High-risk approval
History
Outlet override
Scheduled price change
Variant prices
Offer prices
Tax display
Rollback
Drift detection

Smoothness lock:

Every price proposal must show old price and new price.

Never:

Change Paneer Tikka to ₹199?

Always:

Paneer Tikka
₹179 → ₹199
13. Availability Rule

Availability means whether the item can be ordered/requested.

Owner meaning:

Available now, sold out today, only after 4 PM, lunch only.

Core fields:

JSON
{
  "availability_rule_id": "avail_123",
  "entity_type": "item",
  "entity_id": "item_cold_coffee",
  "rule_type": "temporary_unavailable",
  "status": "unavailable",
  "start_at": "timestamp",
  "end_at": "timestamp",
  "repeat": null,
  "restore_behavior": "restore_at_next_opening",
  "created_by_operation_id": "op_456"
}

Availability rule types:

always_available
temporary_unavailable
daily_time_window
weekly_time_window
date_range
seasonal
limited_stock
manual_unavailable_until_restored

Examples:

Cold Coffee unavailable until tomorrow 10 AM
Lunch Thali available daily 12 PM - 4 PM
Pav Bhaji available after 4 PM
Weekend Combo available Friday to Sunday

Smoothness lock:

Sold-out defaults to temporary until next opening.

Owner says:

Cold coffee over

MenuList proposes:

Mark Cold Coffee unavailable until tomorrow 10 AM?
14. Visibility Rule

Visibility means whether customers can see the item.

Owner meaning:

Show it, hide it, show as unavailable, show after time.

Core fields:

JSON
{
  "visibility_rule_id": "vis_123",
  "entity_type": "item",
  "entity_id": "item_cold_coffee",
  "visibility_mode": "visible_as_unavailable",
  "surface_scope": ["qr_menu", "public_menu", "whatsapp_menu"],
  "status": "active"
}

Visibility modes:

visible
hidden
visible_as_unavailable
visible_with_available_after_time
staff_only
surface_specific

Example:

Lunch Thali outside 12-4

Possible customer views:

Hidden

or:

Available 12 PM - 4 PM

Smoothness lock:

MenuList should remember the owner’s visibility preference.

Some owners want sold-out items hidden.
Some want them shown as unavailable.

The system should learn this.

15. Photo Asset

Photo is not just a file. It is an operational asset.

Owner meaning:

Dish photo for my menu.

Core fields:

JSON
{
  "photo_id": "photo_55",
  "business_id": "biz_123",
  "uploaded_by": "staff_ravi",
  "source": "staff_upload_link",
  "candidate_item_ids": ["item_paneer_tikka"],
  "matched_item_id": "item_paneer_tikka",
  "quality_status": "good",
  "match_confidence_label": "likely_match",
  "approval_status": "pending_owner_approval",
  "published_surfaces": [],
  "status": "uploaded"
}

Photo states:

missing
requested
uploaded_by_staff
matched_to_item
quality_checked
needs_owner_approval
approved
published
rejected
retake_requested
replaced

Smoothness lock:

Photo collection should happen through staff task links.

Owner should see:

12 items need photos.
Send photo task to staff?

Staff should not need full dashboard access.

16. Description

Descriptions need safety.

Owner meaning:

The text customers see under an item.

Core fields:

JSON
{
  "description_id": "desc_123",
  "item_id": "item_paneer_roll",
  "text": "Soft roll filled with paneer and house-style seasoning.",
  "language": "en-IN",
  "source": "ai_generated_safe",
  "approval_status": "approved",
  "safety_status": "safe",
  "owner_edited": false,
  "status": "published"
}

Description states:

missing
weak
draft_generated
needs_confirmation
approved
published
owner_edited
blocked_claim

Blocked claims:

Unsupported ingredient
Unsupported allergen
Unsupported health claim
Unsupported nutrition claim
Unsupported cooking method

Smoothness lock:

Use safe descriptions by default.

Example safe:

Soft roll filled with paneer and house-style seasoning.

Unsafe unless confirmed:

Made with organic paneer, fresh mint chutney, and no preservatives.

MenuList should not invent.

17. Label

Labels help customers filter and understand items.

Owner meaning:

Veg, non-veg, spicy, Jain, bestseller, new, today special.

Core fields:

JSON
{
  "label_id": "label_veg",
  "name": "Veg",
  "label_type": "dietary",
  "display_icon": "veg_dot",
  "requires_owner_confirmation": false,
  "status": "active"
}

Label types:

dietary
spice
availability
promotion
preference
custom
system

Common labels:

Veg
Non-veg
Egg
Spicy
Jain Available
Bestseller
New
Today’s Special
Seasonal
Limited

Smoothness lock:

Labels with risk should require confirmation.

For example:

Vegan
Gluten-free
Nut-free
Sugar-free
Organic
Healthy
Low-calorie

These should never be guessed.

18. Offer

An Offer is a time-bound or condition-bound menu promotion.

Owner meaning:

Today’s special, lunch combo, weekend combo, happy hour, family pack.

Core fields:

JSON
{
  "offer_id": "offer_lunch_combo_1",
  "business_id": "biz_123",
  "outlet_scope": ["outlet_1"],
  "name": "Office Lunch Combo",
  "offer_type": "combo",
  "items": ["item_veg_thali", "item_buttermilk"],
  "offer_price": 149,
  "availability_rule_id": "avail_lunch_12_4",
  "visibility_rule_id": "vis_featured_lunch",
  "badge": "Lunch Combo",
  "placement": "top_of_lunch_section",
  "expiry_at": "timestamp",
  "status": "active"
}

Offer states:

draft
pending_approval
scheduled
active
expiring_soon
expired
extended
archived
converted_to_regular

Offer types:

today_special
combo
lunch_offer
weekend_offer
festival_offer
happy_hour
seasonal_offer
family_pack
limited_stock

Smoothness lock:

Every special or offer should have an expiry by default.

Owner says:

Today special rajma chawal 129

MenuList should default:

Expires tonight at closing.

Old offers should not stay live accidentally.

19. Publishing Surface

A Publishing Surface is where the menu appears.

Owner meaning:

QR menu, public link, WhatsApp menu, print PDF, Google, delivery export.

Core fields:

JSON
{
  "surface_id": "surface_qr_menu",
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "surface_type": "qr_menu",
  "display_name": "QR Menu",
  "connection_status": "connected",
  "publish_mode": "direct",
  "last_published_snapshot_id": "snap_104",
  "last_verified_at": "timestamp",
  "status": "updated"
}

Surface types:

qr_menu
public_menu
whatsapp_menu
print_pdf
google_business_profile
delivery_export
instagram_caption
counter_display
staff_menu
website_embed

Surface statuses:

updated
outdated
pending
submitted
waiting
failed
manual_action_required
export_ready
not_connected

Smoothness lock:

Publishing status should be plain language.

Owner sees:

QR menu updated
Printable PDF outdated
Delivery export ready
Google submitted

Not technical sync language.

20. Surface Snapshot

A Surface Snapshot records what a surface showed at a point in time.

Owner meaning:

What customers saw on QR/menu/print at that time.

Core fields:

JSON
{
  "surface_snapshot_id": "surf_snap_555",
  "surface_id": "surface_qr_menu",
  "menu_snapshot_id": "snap_104",
  "rendered_at": "timestamp",
  "content_hash": "hash_abc",
  "status": "active"
}

Why it matters:

Verification
Drift detection
Print freshness
Debugging customer complaints
Rollback

Example:

MenuList price: ₹199
Print PDF still shows: ₹179

MenuList can know print is outdated because surface snapshots exist.

21. Publish Job

A Publish Job is the execution process after approval.

Owner meaning:

MenuList is updating the places where my menu appears.

Core fields:

JSON
{
  "publish_job_id": "pub_789",
  "operation_id": "op_456",
  "menu_snapshot_id": "snap_104",
  "surface_id": "surface_qr_menu",
  "status": "published",
  "started_at": "timestamp",
  "completed_at": "timestamp",
  "failure_reason": null
}

Publish states:

queued
publishing
published
submitted
waiting_external
manual_action_required
failed
verified

Owner receipt:

Done.

Updated:
QR menu
Public menu
WhatsApp menu

Regenerated:
Printable PDF

Needs action:
Delivery export ready

Rollback available.

Smoothness lock:

Publishing is not “save.” Publishing is a job with status and receipt.

22. Verification Result

Verification checks whether the publish worked.

Owner meaning:

Did the live menu actually update?

Core fields:

JSON
{
  "verification_id": "verify_123",
  "publish_job_id": "pub_789",
  "surface_id": "surface_qr_menu",
  "check_type": "live_menu_readback",
  "expected_value": "₹199",
  "observed_value": "₹199",
  "status": "verified",
  "checked_at": "timestamp"
}

Verification statuses:

verified
mismatch
pending
not_supported
failed
manual_check_required

Smoothness lock:

Every important operation should end with a receipt.

Not:

Saved.

But:

Done. QR and public menu updated. Rollback available.
23. Operation

An Operation is the container for one owner/system/staff event that may produce one or more proposals.

Owner meaning:

The thing I asked MenuList to do.

Example owner command:

Tea 20, coffee 40, cold coffee over

This should become one operation with multiple proposals.

Core fields:

JSON
{
  "operation_id": "op_456",
  "business_id": "biz_123",
  "source_event_id": "event_123",
  "actor_id": "user_owner_1",
  "actor_type": "owner",
  "source_type": "owner_command",
  "raw_input": "Tea 20, coffee 40, cold coffee over",
  "operation_summary": "Prepared 3 menu updates",
  "proposal_ids": ["prop_1", "prop_2", "prop_3"],
  "status": "pending_approval",
  "created_at": "timestamp"
}

Operation states:

received
understanding
needs_clarification
proposals_created
pending_approval
partially_approved
approved
publishing
completed
failed
cancelled
rolled_back

Smoothness lock:

MenuList should support multi-change commands.

Owners naturally speak in batches.

Tea 20, coffee 40, cold coffee over

MenuList should not force one command at a time.

24. Change Proposal

This is the most important object.

A Change Proposal is a prepared menu change waiting for approval, rule execution, or rejection.

Owner meaning:

MenuList understood what I want and prepared the update for review.

Core fields:

JSON
{
  "proposal_id": "prop_123",
  "operation_id": "op_456",
  "business_id": "biz_123",
  "proposal_type": "price_update",
  "source_type": "owner_command",
  "raw_input": "Paneer tikka 199",
  "interpretation_summary": "Change Paneer Tikka price from ₹179 to ₹199",
  "risk_level": "high",
  "confidence_label": "high",
  "status": "pending_approval",
  "scope": {
    "outlets": ["outlet_1"],
    "surfaces": ["qr_menu", "public_menu", "whatsapp_menu", "print_pdf"],
    "time": "immediate"
  },
  "changes": [
    {
      "change_type": "set_field",
      "entity_type": "item",
      "entity_id": "item_paneer_tikka",
      "field": "price.amount",
      "old_value": 179,
      "new_value": 199
    }
  ],
  "customer_preview": {
    "before": "Paneer Tikka ₹179",
    "after": "Paneer Tikka ₹199"
  },
  "approval_policy": {
    "required": true,
    "required_role": "owner",
    "reason": "Price changes require owner approval"
  },
  "rollback_snapshot_required": true,
  "created_at": "timestamp"
}

Proposal states:

created
needs_clarification
pending_approval
approved
edited
rejected
scheduled
executing
published
verified
failed
expired
rolled_back

Smoothness lock:

Agent Inbox cards are just proposal objects rendered in owner language.

The trust architecture is inside the proposal.

25. Change Primitive

A proposal contains one or more Change Primitives.

A change primitive is the smallest structured mutation MenuList understands.

Common primitives:

create_entity
set_field
set_price
set_availability
set_visibility
attach_photo
replace_photo
set_description
add_label
remove_label
move_category
reorder_item
archive_entity
create_offer
expire_offer
create_modifier
publish_surface
create_manual_task

Example:

JSON
{
  "change_type": "set_price",
  "entity_type": "item",
  "entity_id": "item_masala_tea",
  "old_value": {
    "amount": 15,
    "currency": "INR"
  },
  "new_value": {
    "amount": 20,
    "currency": "INR"
  }
}

Bulk proposal:

JSON
{
  "proposal_type": "bulk_price_update",
  "changes": [
    {
      "change_type": "set_price",
      "entity_id": "item_masala_tea",
      "old_value": 15,
      "new_value": 20
    },
    {
      "change_type": "set_price",
      "entity_id": "item_ginger_tea",
      "old_value": 20,
      "new_value": 25
    }
  ]
}

Smoothness lock:

Bulk proposals should be grouped as one operation with one rollback path.

Owner sees:

7 items changed.
Rollback all available.
26. Approval

An Approval records who allowed a proposal to become real.

Owner meaning:

I approved this change.

Core fields:

JSON
{
  "approval_id": "appr_123",
  "proposal_id": "prop_123",
  "approved_by": "user_owner_1",
  "approver_role": "owner",
  "approval_type": "explicit",
  "decision": "approved",
  "approved_at": "timestamp",
  "approval_note": null
}

Approval types:

explicit
batch
rule_based
manager_approved
scheduled_from_prior_approval
rollback_approval
external_publish_approval

Examples:

Owner taps Approve
Manager marks item sold out
Rule expires Today’s Special at closing
Owner approves 9 descriptions at once

Smoothness lock:

Approval can be light, normal, or heavy depending on risk.

Low-risk:

Approve all descriptions

High-risk:

Confirm 14 price changes across 3 outlets
27. Rollback Snapshot

A Rollback Snapshot stores enough information to undo an approved operation.

Owner meaning:

I can undo this mistake.

Core fields:

JSON
{
  "rollback_snapshot_id": "rollback_123",
  "operation_id": "op_456",
  "before_menu_snapshot_id": "snap_103",
  "after_menu_snapshot_id": "snap_104",
  "affected_entities": [
    {
      "entity_type": "item",
      "entity_id": "item_paneer_tikka",
      "field": "price",
      "before": 179,
      "after": 199
    }
  ],
  "rollback_status": "available",
  "created_at": "timestamp"
}

Rollback states:

available
used
expired
not_available
blocked

Rollback itself should create a new operation.

Operation 1:
Paneer Tikka ₹179 → ₹199

Operation 2:
Rollback Paneer Tikka ₹199 → ₹179

Do not erase history.

Smoothness lock:

Rollback should be operation-level.

For bulk price changes:

Rollback all 7 changes

not item-by-item.

28. Audit Ledger Entry

The Ledger is the plain-language history of the menu.

Owner meaning:

Who changed what, when, and where?

Core fields:

JSON
{
  "ledger_entry_id": "ledger_123",
  "business_id": "biz_123",
  "operation_id": "op_456",
  "actor_id": "user_owner_1",
  "actor_role": "owner",
  "entry_type": "price_update",
  "plain_language_summary": "Paneer Tikka changed from ₹179 to ₹199.",
  "surfaces_updated": ["QR menu", "Public menu"],
  "approval_summary": "Approved by Owner",
  "verification_summary": "Verified live",
  "rollback_status": "available",
  "created_at": "timestamp"
}

Owner sees:

Today, 2:14 PM

Paneer Tikka changed from ₹179 to ₹199.
Approved by Owner.
Published to QR menu and public menu.
Verified live.
Rollback available.

Smoothness lock:

The ledger should be plain language, not technical logs.

Owners should never wonder:

Who changed this?
Why is this item hidden?
Why is this price different?
29. Staff User, Role, Permission

Staff should help without risking the menu.

Owner meaning:

My staff can upload photos or mark sold out, but they cannot break prices.

Staff user:

JSON
{
  "staff_user_id": "staff_ravi",
  "business_id": "biz_123",
  "name": "Ravi",
  "role_id": "role_manager",
  "outlet_scope": ["outlet_1"],
  "status": "active"
}

Role:

JSON
{
  "role_id": "role_manager",
  "name": "Manager",
  "permissions": [
    "mark_unavailable",
    "restore_item",
    "upload_photo",
    "create_offer_draft"
  ]
}

Permission examples:

upload_photo
mark_unavailable
restore_item
create_item_draft
create_offer_draft
request_price_change
approve_availability_change
approve_photo
approve_price_change
publish_external
rollback_operation
manage_staff
manage_rules

Smoothness lock:

Staff should mostly use task links, not the full dashboard.

Examples:

Photo upload link
Sold-out link
Correction request link
Restore link
30. Rule

A Rule is owner-approved automation.

Owner meaning:

MenuList can do this repeated thing because I approved the rule.

Core fields:

JSON
{
  "rule_id": "rule_special_expiry",
  "business_id": "biz_123",
  "name": "Today’s Specials expire at closing",
  "trigger": {
    "event_type": "today_special_created"
  },
  "conditions": {
    "offer_type": "today_special"
  },
  "action": {
    "type": "set_expiry",
    "value": "outlet_closing_time"
  },
  "scope": {
    "outlets": ["outlet_1"]
  },
  "approved_by": "user_owner_1",
  "status": "active",
  "created_at": "timestamp"
}

Rule states:

suggested
pending_approval
active
paused
expired
deleted

Rule examples:

Today’s Specials expire at closing
Sold-out beverages restore next morning
Show sold-out items as unavailable instead of hiding
Lunch Thali visible only 12 PM - 4 PM
Staff photos still need owner approval

Smoothness lock:

Rules should come from repeated approvals.

Example:

You have approved restoring sold-out beverages next morning 5 times.

Create rule?

This is safe automation.

Not hidden AI autonomy.

31. Memory Entry

Memory makes MenuList smoother over time.

Owner meaning:

MenuList understands how I talk and how my business works.

Core fields:

JSON
{
  "memory_id": "mem_123",
  "business_id": "biz_123",
  "memory_type": "alias",
  "key": "PBM",
  "value": {
    "entity_type": "item",
    "entity_id": "item_paneer_butter_masala"
  },
  "confidence": "high",
  "source": "owner_confirmation",
  "created_at": "timestamp",
  "status": "active"
}

Memory types:

alias
category_preference
description_style
visibility_preference
offer_preference
staff_reliability
outlet_pattern
approval_pattern
language_preference

Examples:

PBM = Paneer Butter Masala
chai = Masala Tea
CB = Chicken Biryani
Owner prefers short descriptions
Owner wants sold-out items visible
Weekend Combo expires Sunday night
Bandra prices are higher

Smoothness lock:

Every correction should become memory.

Owner says:

No, Mango Lassi goes under Beverages.

MenuList remembers:

Lassi-type items belong under Beverages.
32. Customer Signal

A Customer Signal is menu behavior from customers.

Owner meaning:

What customers are looking at, searching, or clicking.

Core fields:

JSON
{
  "signal_id": "sig_123",
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "signal_type": "item_view",
  "entity_type": "item",
  "entity_id": "item_chicken_biryani",
  "value": 1,
  "occurred_at": "timestamp"
}

Signal types:

menu_view
qr_scan
item_view
category_view
search_query
whatsapp_click
offer_view
unavailable_item_view
photo_click

Raw analytics should not dominate the owner UI.

Customer signals should become actions.

Example:

Customers searched “momos” 18 times.
Momos are not on your menu.

[Add item] [Ignore]

Smoothness lock:

Every insight should lead to a menu action.

Not passive charts first.

33. Menu Health Issue

A Menu Health Issue is something that makes the menu less correct, useful, or attractive.

Owner meaning:

Something I should fix.

Core fields:

JSON
{
  "health_issue_id": "health_123",
  "business_id": "biz_123",
  "issue_type": "missing_photo",
  "entity_type": "item",
  "entity_id": "item_chicken_biryani",
  "severity": "high",
  "impact_reason": "This is a highly viewed item",
  "suggested_action": "request_photo",
  "status": "open"
}

Issue types:

missing_price
missing_photo
missing_description
weak_description
expired_offer
duplicate_item
unclear_variant
missing_label
publishing_mismatch
stale_print_menu
high_view_item_missing_photo
unavailable_too_long

Smoothness lock:

Menu Health should prioritize by business impact.

Example:

Chicken Biryani has 86 views but no photo.

matters more than:

Low-view item missing description.
34. Insight Action

An Insight Action turns customer/menu signals into a proposal.

Owner meaning:

MenuList noticed something useful and prepared an action.

Core fields:

JSON
{
  "insight_action_id": "insight_123",
  "business_id": "biz_123",
  "source_signal_ids": ["sig_1", "sig_2"],
  "insight_summary": "Customers searched for momos 18 times this week.",
  "recommended_action": "add_item",
  "proposal_id": "prop_add_momos",
  "status": "pending_owner_decision"
}

Example owner card:

Customers searched “momos” 18 times this week.
Momos are not on your menu.

Add momos?

[Add item] [Ignore]

Smoothness lock:

Insight should not be separate from operations.

Insight should create a decision card.

35. Manual Task

A Manual Task exists when MenuList cannot directly complete something.

Owner meaning:

MenuList prepared the work, but I or staff need to finish this outside the system.

Core fields:

JSON
{
  "manual_task_id": "task_123",
  "business_id": "biz_123",
  "operation_id": "op_456",
  "task_type": "delivery_app_update",
  "title": "Update delivery app menu",
  "prepared_assets": [
    "price_change_summary.pdf",
    "delivery_menu_export.csv"
  ],
  "instructions": "Upload this updated price list to your delivery app menu.",
  "status": "open",
  "assigned_to": "owner",
  "created_at": "timestamp"
}

Manual task states:

open
in_progress
done
dismissed
expired

Examples:

Delivery app export ready
Print new menu copies
Update old Instagram menu post
Confirm unclear menu prices
Ask staff to retake photo

Smoothness lock:

When MenuList cannot directly publish, it should create the next-best task.

This preserves the promise:

Change once. MenuList handles as much as possible.
36. Proposal type catalog

From day one, MenuList should understand these proposal types:

menu_import_review
price_update
bulk_price_update
availability_update
restore_availability
new_item
new_variant
new_modifier
archive_item
category_update
description_suggestion
photo_approval
label_update
offer_create
offer_expire
offer_extend
publish_update
manual_task_create
drift_resolution
rollback_operation
rule_create
staff_request
insight_action

Each proposal type should have a standard card format.

37. Proposal contract by type
Price update

Required:

Item resolved
Old price
New price
Outlet scope
Surface impact
Approval required
Rollback snapshot
Customer preview

Owner card:

Paneer Tikka
₹179 → ₹199

Scope:
Current outlet only

Affects:
QR menu, public menu, WhatsApp menu, print PDF

[Approve] [Edit] [Cancel]
Bulk price update

Required:

Affected item count
Item-level before/after
Outlet scope
Bulk operation group
Approval required
Rollback group

Owner card:

This will update 7 paneer items.

Paneer Tikka ₹179 → ₹199
Paneer Roll ₹99 → ₹119
Paneer Butter Masala ₹249 → ₹269

[Approve all] [Edit selected] [Cancel]
Availability update

Required:

Item or group resolved
Temporary/permanent interpretation
End time or restore behavior
Visibility behavior
Customer preview

Owner card:

Mark Cold Coffee unavailable until tomorrow 10 AM?

Customer view:
Cold Coffee
Unavailable today

[Approve] [Change time] [Hide instead]
New item

Required:

Name
Category
Price
Description draft if safe
Photo status
Availability default
Visibility default
Duplicate check

Owner card:

Create new item:

Cheese Garlic Bread
Category: Starters
Price: ₹149
Description: Toasted garlic bread topped with cheese.
Photo: Missing

[Approve] [Edit] [Cancel]
Today’s special

Required:

Item name
Price
Special category
Featured placement
Expiry
Promo outputs
Customer preview

Owner card:

Create Today’s Special:

Rajma Chawal ₹129
Available today only
Show at top
Expires tonight at closing

WhatsApp text ready.

[Approve] [Edit] [Cancel]
Photo approval

Required:

Uploader
Suggested item match
Quality check
Owner approval
Surface impact

Owner card:

Ravi uploaded a photo for Paneer Tikka.

Quality: Good
Looks like a dry starter dish.

[Publish] [Ask retake] [Choose another item]
Drift resolution

Required:

MenuList value
External value
Source
Confidence
Owner decision
No automatic overwrite

Owner card:

Possible mismatch:

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]
Rule create

Required:

Pattern observed
Rule explanation
Scope
Future behavior
Owner approval
Pause option

Owner card:

You usually restore sold-out beverages next morning.

Create rule?

When beverages are marked sold out,
restore them automatically at next opening.

[Create rule] [No]
38. State machines
Operation state machine
received
↓
understanding
↓
needs_clarification OR proposals_created
↓
pending_approval
↓
approved / partially_approved / rejected
↓
publishing
↓
completed / failed
↓
rollback_available

Owner sees:

Prepared
Needs approval
Publishing
Done
Failed
Rollback available
Proposal state machine
created
↓
needs_clarification
↓
pending_approval
↓
approved / edited / rejected
↓
executing
↓
published
↓
verified
↓
completed

Scheduled proposal:

approved
↓
scheduled
↓
executing_at_time
↓
published
↓
verified
Item state machine
draft
↓
pending_approval
↓
live
↓
temporarily_unavailable
↓
live

live
↓
archived

Other overlay states:

photo_pending
description_pending
conflict_detected
scheduled
Offer state machine
draft
↓
pending_approval
↓
scheduled / active
↓
expiring_soon
↓
expired
↓
extended OR archived OR converted_to_regular

Smoothness idea:

High-performing expired specials should ask:
Repeat, extend, or add as regular item?
Photo state machine
missing
↓
requested
↓
uploaded_by_staff
↓
matched_to_item
↓
quality_checked
↓
needs_owner_approval
↓
approved
↓
published

Failure paths:

rejected
retake_requested
wrong_item_match
Publish job state machine
queued
↓
publishing
↓
published / submitted / manual_action_required / failed
↓
verification_pending
↓
verified / mismatch / manual_check_required

Owner language:

Updating
Updated
Submitted
Needs manual action
Could not update
Verified
Rule state machine
suggested
↓
pending_approval
↓
active
↓
paused
↓
removed

Rule execution:

triggered
↓
policy_checked
↓
executed
↓
logged
↓
receipt_created
39. Risk and approval rules

MenuList needs a simple internal risk matrix.

Action	Risk	Default behavior
Draft description	Low	Prepare, batch review
Suggest photo task	Low	Prepare, no heavy approval
Create unpublished offer draft	Low	Prepare draft
Mark sold out	Medium	Approval or manager permission
Restore item	Medium	Approval or rule
Publish photo	Medium	Owner/manager approval
Set item timing	Medium	Approval
Expire offer	Medium	Rule if expiry was approved
Change price	High	Owner approval required
Bulk price update	High	Owner approval plus scope preview
Archive item	High	Owner approval
Publish externally	High	Owner approval
Apply to all outlets	High	Owner approval plus outlet scope
Allergen/nutrition claims	High/protected	Owner confirmation required
Delete permanently	Protected	Avoid; archive instead

Smoothness lock:

The user should feel fast flow for normal operations and strong protection for risky operations.

40. Permission rules

Simple default permission model:

Role	Can do
Owner	Everything
Manager	Mark sold out, restore, upload/approve photos, create drafts
Staff	Upload photos, request corrections, mark sold out if allowed
Agency	Create offer/content drafts, cannot publish high-risk changes
Accountant	View price history/export, cannot edit menu

Price changes:

Owner approval only by default.

Photo uploads:

Staff can upload.
Owner approves before live.

Sold-out:

Manager can mark sold out if permission exists.
Staff may request or mark sold out depending on owner setting.

External publishing:

Owner approval by default.

Rollback:

Owner only by default.

Smoothness lock:

Permissions should be action-based, not dashboard-based.

Instead of:

Staff has admin access.

Use:

Staff can upload photos.
Staff can mark sold out.
Staff cannot change prices.
41. Event catalog

MenuList should be event-driven.

Core events:

owner_command_received
owner_voice_command_received
menu_file_uploaded
menu_import_completed
clarification_requested
clarification_answered
proposal_created
proposal_approved
proposal_rejected
proposal_edited
publish_job_started
surface_updated
surface_update_failed
verification_completed
verification_mismatch_detected
rollback_requested
rollback_completed
staff_photo_uploaded
staff_action_requested
rule_suggested
rule_approved
rule_triggered
offer_expiring_soon
offer_expired
item_marked_unavailable
item_restore_due
customer_search_detected
customer_item_viewed
menu_health_issue_detected
manual_task_created
manual_task_completed

Each event should answer:

What happened?
Who or what triggered it?
What entity is involved?
Does it require owner attention?
Does it create a proposal?
Does it update memory?

Smoothness lock:

Events should create decisions, not noise.

For example:

customer_search_detected

should not notify the owner every time.

It should become:

Customers searched “momos” 18 times this week. Add item?
42. Agent contracts

MenuList should have specialist agents, but they must all follow the same safety contract.

Universal agent rule
Agents can observe, understand, draft, and propose.
Agents cannot directly mutate live menu.
Agents cannot bypass policy.
Agents cannot publish risky changes without approval or approved rule.
Intake Agent

Input:

Text
Voice
Photo
PDF
Excel
WhatsApp text
Screenshot
Staff upload
External menu source

Output:

Normalized event
Possible operation type
Raw input preserved

Example:

Input: "Biryani over"
Output: owner_command_received, likely availability_update
Resolver Agent

Input:

Owner command
Menu graph
Alias memory
Outlet context

Output:

Resolved entity candidates
Confidence label
Clarification question if needed

Example:

"chai" → Masala Tea or all Tea items
Proposal Agent

Input:

Intent
Resolved entities
Scope
Current menu state

Output:

Change proposal
Before/after
Customer preview
Affected surfaces
Policy Agent

Input:

Proposal
Actor
Role
Risk level
Rules
Business settings

Output:

approval_required
allowed_by_role
blocked
rule_executable
needs_owner
Preview Agent

Input:

Proposal
Menu rendering rules
Surface formats

Output:

Customer preview
Surface-specific preview
Publishing Agent

Input:

Approved proposal
Menu snapshot
Surface adapters

Output:

Publish jobs
Surface outputs
Manual tasks where needed
Verification Agent

Input:

Expected menu state
Published surface
Surface snapshot

Output:

Verified
Mismatch
Failed
Manual check required
Memory Agent

Input:

Owner corrections
Clarifications
Repeated approvals
Staff behavior
Outlet patterns

Output:

Alias memory
Preference memory
Rule suggestions
Confidence improvements
Insight Agent

Input:

Customer signals
Menu health data
Menu graph
Publishing state

Output:

Insight action proposal

Example:

Customers searched “momos” 18 times.
Momos are not on menu.
Create add-item proposal.

Smoothness lock:

Agents should coordinate through objects, not free-form chat.

The system should pass:

structured event
structured proposal
structured policy result

not vague text.

43. Publishing adapter contract

Each surface adapter should answer:

Can this surface be updated directly?
What format does it need?
How do we publish?
Can we verify?
What happens if direct update is unavailable?

Adapter fields:

JSON
{
  "surface_type": "whatsapp_menu",
  "publish_mode": "generated_output",
  "supports_direct_publish": false,
  "supports_verification": false,
  "output_format": "text",
  "fallback": "copyable_text"
}

Examples:

QR menu
Direct publish: yes
Verification: yes
Output: live web menu
Public menu
Direct publish: yes
Verification: yes
Output: web page
WhatsApp menu
Direct publish: maybe no
Verification: no
Output: copyable/shareable text
Print PDF
Direct publish: generated file
Verification: generated snapshot
Output: PDF
Delivery app
Direct publish: usually no unless integrated
Verification: manual or screenshot
Output: export file/manual task

Smoothness lock:

When direct publish is unavailable, MenuList should still prepare the export and task.

44. Customer preview contract

Every proposal should attempt to generate:

Before preview
After preview
Surface impact
Customer impact explanation

Examples:

Price
Before:
Paneer Tikka ₹179

After:
Paneer Tikka ₹199
Sold out
After:
Cold Coffee
Unavailable today
Timed availability
After:
Pav Bhaji
Available after 4 PM
Offer
After:
Office Lunch Combo ₹149
Available 12 PM - 4 PM

Smoothness lock:

Owners approve faster when they see what customers will see.

45. Clarification contract

When confidence is low, MenuList should ask a short, tap-based question.

Clarification object:

JSON
{
  "clarification_id": "clar_123",
  "operation_id": "op_456",
  "question": "Which burger did you mean?",
  "options": [
    {
      "label": "Veg Burger",
      "entity_id": "item_veg_burger"
    },
    {
      "label": "Cheese Burger",
      "entity_id": "item_cheese_burger"
    },
    {
      "label": "Chicken Burger",
      "entity_id": "item_chicken_burger"
    },
    {
      "label": "All burgers",
      "scope": "category_burgers"
    }
  ],
  "memory_offer": "Remember this for next time?"
}

Owner sees:

Which burger?

Veg Burger
Cheese Burger
Chicken Burger
All burgers

Smoothness lock:

Clarifications should become memory.

After owner chooses:

Remember “burger” as Cheese Burger?
46. Import contract

Menu import is a special operation because it creates a large menu draft.

Import should not dump a raw table on the owner.

Import result:

JSON
{
  "import_id": "import_123",
  "source_type": "pdf",
  "business_id": "biz_123",
  "detected_categories": 8,
  "detected_items": 94,
  "detected_variants": 31,
  "unclear_fields_count": 6,
  "draft_menu_snapshot_id": "draft_snap_1",
  "status": "needs_confirmation"
}

Owner sees:

Your menu is 87% ready.

I found:
8 categories
94 items
31 variants
6 things need confirmation

[Review confirmations]

Confirmation examples:

Does 180/300 mean Half/Full or Regular/Family?
Is “Spl Thali 149/199” two variants?
Is “Paneer Roll 99” veg?

Smoothness lock:

Only block publishing for issues that truly block correctness.

Missing photos should become Menu Health tasks later.

Not:

Add 94 photos before publishing.

Instead:

Your menu can go live now.
18 items need photos later.
47. Drift contract

External mismatch should create a decision, not an overwrite.

Drift object:

JSON
{
  "drift_id": "drift_123",
  "business_id": "biz_123",
  "entity_type": "item",
  "entity_id": "item_veg_burger",
  "field": "price",
  "menulist_value": 99,
  "external_value": 89,
  "external_source": "uploaded_delivery_menu",
  "confidence_label": "medium",
  "status": "needs_owner_decision"
}

Owner sees:

Possible mismatch:

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]

Smoothness lock:

MenuList remains source of truth unless the owner decides otherwise.

48. Menu Health scoring contract

Menu Health should be action-first.

Health scoring dimensions:

Correctness
Completeness
Freshness
Presentation
Publishing consistency
Customer impact
Revenue impact

High-priority issues:

Missing price
Expired offer still live
Publishing mismatch
Top item missing photo
Sold-out item unavailable too long
External price mismatch

Lower-priority issues:

Weak description on low-view item
Minor category order issue
Missing photo on rarely viewed item

Owner sees:

Menu Health: 74/100

Fix first:
Chicken Biryani has high views but no photo.
Weekend Combo expired yesterday.
Fresh Lime Soda has no price.
6 items need veg/non-veg labels.

Smoothness lock:

Do not make Menu Health feel like a report card. Make it feel like help.

49. Receipts

Every completed operation should produce a receipt.

Receipt object:

JSON
{
  "receipt_id": "receipt_123",
  "operation_id": "op_456",
  "summary": "Paneer Tikka is now ₹199.",
  "surfaces_updated": [
    "QR menu",
    "Public menu",
    "WhatsApp menu"
  ],
  "surfaces_pending": [
    "Google"
  ],
  "manual_tasks_created": [
    "Delivery export ready"
  ],
  "rollback_available": true,
  "created_at": "timestamp"
}

Owner sees:

Done.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu
WhatsApp menu

Regenerated:
Printable PDF

Rollback available.

Smoothness lock:

Receipt is the owner’s confidence moment.

This confirms that MenuList did the work.

50. The day-one system behavior for core commands
Command: Tea 20

System behavior:

Detect price update
Resolve tea
If ambiguous, ask
Create price proposal
Show before/after
Require owner approval
Publish
Verify
Log
Remember alias if confirmed

Owner sees:

I found Masala Tea.

₹15 → ₹20

[Approve] [Choose another] [Cancel]
Command: Increase all tea by 5

System behavior:

Detect bulk price update
Resolve all tea items
Show affected count
Show before/after
Require approval
Create grouped rollback
Publish and verify

Owner sees:

Found 4 tea items.

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

[Approve all] [Edit selected] [Cancel]
Command: Biryani over

System behavior:

Detect temporary unavailability
Resolve biryani items
Default until next opening
Respect visibility preference
Create restore schedule
Publish
Verify

Owner sees:

Mark 3 biryani items unavailable until tomorrow 11 AM?

[Approve all] [Select items] [Change time]
Command: Add mango lassi 99 today special

System behavior:

Detect today special
Create item proposal
Set price
Set Today’s Special category
Set featured placement
Set expiry at closing
Prepare WhatsApp text
Require approval
Publish
Schedule expiry

Owner sees:

Create Today’s Special:

Mango Lassi ₹99
Available today only
Show at top
Expires tonight

WhatsApp text ready.

[Approve] [Edit]
Command: Customer says burger price wrong

System behavior:

Detect correction issue
Resolve burger candidates
Ask which item
Show current MenuList price
Ask correct price
Create price proposal if needed
Log correction source

Owner sees:

Which burger?

Veg Burger ₹99
Cheese Burger ₹119
Chicken Burger ₹149

Then:

What is the correct price?

[₹99] [₹119] [Other]
51. The owner-facing simplification

Even though the system has many objects, the owner only needs to understand five things:

Tell MenuList what changed.
MenuList prepares the update.
You approve important changes.
MenuList publishes and verifies.
You can see history and rollback.

Everything else exists to make this simple.

The owner should not think:

I am editing a database.

The owner should think:

MenuList is managing my menu work.
52. The strongest smoothness ideas from this spec

These should be protected as core product principles.

1. Proposal is the only write path

AI should never directly change the live menu.

2. Scope is always visible for risky actions

One outlet, all outlets, selected outlets, current surface, all surfaces.

3. Price changes always show before/after
₹179 → ₹199
4. Sold-out defaults to temporary

Usually until next opening.

5. Specials default to expiry

Today’s special expires at closing.

6. Staff works through task links

Upload photo, mark sold out, request correction.

7. Publishing ends with receipt

Done, updated, verified, rollback available.

8. Drift asks “which is correct?”

External sources do not overwrite MenuList automatically.

9. Repeated approvals become suggested rules

Automation is owner-approved, not hidden.

10. Every correction becomes memory

MenuList learns the owner’s language and habits.

53. Final operating contract

MenuList from day one should be:

Proposal-driven
Approval-controlled
Menu-snapshot based
Surface-aware
Verification-backed
Rollback-safe
Staff-permissioned
Rule-enabled
Memory-backed
Insight-action oriented

That is the full platform foundation.

The next layer is the card and screen specification:

Exact Home cards
Exact Agent Inbox cards
Exact Command Box behaviors
Exact Master Menu item states
Exact Publish Center statuses
Exact Growth cards
Exact Control Center panels

That layer turns this operating model into the actual product experience owners will touch every day.
```

### Message 25 - Assistant

- Message ID: 506cd4ec-9e36-4306-8a3b-6c8c0b3375c6
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
I’ll continue from the locked MenuList AI Menu Ops model into owner-facing product specs: exact screens, cards, states, actions, and behind-the-scenes behavior.
```

### Message 26 - Assistant

- Message ID: e020e221-b91a-4c7d-8b0e-82cc568ee58b
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
Spec Layer 2: Owner Surface + Card Contracts

Now we turn the operating model into the exact owner-touchable product.

This layer defines:

What each screen contains
What each card says
What actions are available
What system behavior happens behind each action
What states the owner sees
What makes each flow smooth for SMB owners

The product stays exactly as defined:

MenuList is the AI Menu Ops platform for SMB food businesses.
Owner tells MenuList what changed. MenuList prepares the update. Owner approves. MenuList publishes, verifies, logs, and remembers.

No phases. No “later AI.” No separate versions.
This is the day-one product shape.

1. The core UI philosophy

MenuList should not feel like an admin dashboard.

It should feel like a menu control room.

The owner should always be able to answer:

Is my menu live?
What needs my approval?
What changed today?
What is wrong or outdated?
What should I do next?
Can I undo a mistake?

So the product surface should be built around decisions, not navigation.

Bad product structure:

Items
Categories
Settings
QR
Reports
AI Chat

Better MenuList structure:

Home
Command
Agent Inbox
Menu
Publish
Growth
Control

Even better from owner POV:

What needs attention?
Tell MenuList what changed.
Approve prepared updates.
See live menu.
Publish everywhere.
Improve menu.
Control staff, rules, and history.
2. Global app shell

Every screen should have a consistent top area.

Global top bar

The owner should always see:

Business name
Outlet selector
Live menu status
Pending approval count
Quick command button

Example:

Sharma Cafe · Indiranagar

Menu live · Updated 12 min ago

3 approvals pending

[Tell MenuList]

For multi-outlet:

Sharma Cafe · All outlets

or:

Sharma Cafe · Bandra outlet

Important behavior:

The outlet selector must affect command scope.

If the owner is viewing Bandra and says:

Biryani sold out

MenuList should assume:

Bandra outlet only

unless the owner says “all outlets.”

Smoothness rule:

Always make the current outlet context visible before the owner gives a command.

This prevents accidental wrong-branch updates.

3. Global command dock

The command box should be accessible from everywhere.

The owner should not have to “go to AI.”

They should be able to act from any screen:

Tell MenuList what changed...

Command input supports:

typing
voice
photo upload
PDF upload
paste WhatsApp text
screenshot upload
menu URL paste
staff note
customer complaint text

The command box should have contextual examples based on the current screen.

On Home
Cold coffee sold out
Add mango lassi 99
Increase all tea by 5
Create lunch combo
On Menu item page

For Cold Coffee:

Change price to 119
Mark unavailable today
Replace photo
Add description
On Publish Center
Regenerate print PDF
Create WhatsApp menu
Check Google menu
On Growth
Fix missing photos
Create weekend offer
Improve descriptions

Smoothness rule:

The command box should understand page context.

If the owner is already on Cold Coffee and types:

99

MenuList can infer:

Change Cold Coffee price to ₹99?

But because price is high-risk, it still shows before/after.

4. Universal card anatomy

Every important AI output should become a card.

A card is the product unit of MenuList.

A card should always answer:

What triggered this?
What did MenuList understand?
What will change?
Where will it appear?
What will customers see?
How risky is it?
What can the owner do?
Standard card structure
Card title
Trigger / source
Interpretation
Change summary
Scope
Customer preview
Affected surfaces
Risk note
Actions

Example:

Price Update

You said:
“Paneer tikka 199”

MenuList found:
Paneer Tikka

Change:
₹179 → ₹199

Scope:
Indiranagar outlet only

Customer preview:
Paneer Tikka ₹199

Affects:
QR menu, public menu, WhatsApp menu, print PDF

Price changes need owner approval.

[Approve] [Edit] [Cancel]

This format should be consistent across the product.

5. Card action rules

Each card should have clear action levels.

Primary action

The main safe next step.

Approve
Restore
Publish
Create rule
Request photo
Regenerate
Keep MenuList value
Secondary actions

Useful alternatives.

Edit
Change time
Select items
Change scope
Ask retake
Extend
Ignore
Destructive or risky actions

Always visually and behaviorally separated.

Archive
Rollback
Reject
Cancel
Delete permanently

Default destructive behavior should be safe.

Example:

Archive item

not:

Delete item

Smoothness rule:

Every card should have one obvious primary action.

SMB owners should not feel they are solving a puzzle.

6. Home screen specification

Home is the daily decision room.

It should not show everything.

It should show what matters now.

Home layout
1. Live menu status
2. Command box
3. Priority attention cards
4. Quick actions
5. Today’s menu state
6. Menu Health summary
7. Recent activity
6.1 Live menu status block

At the top:

Your menu is live

Last updated 12 minutes ago

QR menu and public menu are synced

If something is wrong:

Menu needs attention

QR menu updated
Printable PDF outdated
Google update waiting

If publishing failed:

Menu update incomplete

QR menu updated
Print PDF failed to regenerate

[Fix now]

Smoothness rule:

The owner should never wonder whether the menu is live.

This top block creates trust.

6.2 Home command box
Tell MenuList what changed...

Below it:

Try:
Cold coffee sold out
Add today special rajma chawal 129
Increase all tea by 5

The examples should be restaurant-specific.

For a bakery:

Chocolate cake sold out
Add blueberry muffin 89
Increase all pastries by 10

For a cloud kitchen:

Biryani family pack 499
Chicken biryani sold out in Bandra
Add weekend combo

Smoothness rule:

Examples should teach owners how to use MenuList without a tutorial.

6.3 Priority attention area

This is the most important part of Home.

Cards should be sorted by business urgency.

Example:

Needs attention

1. Staff requested a price change
Chicken Biryani ₹229 → ₹249
[Review]

2. Weekend Combo expired yesterday
[Remove] [Extend]

3. Cold Coffee was unavailable yesterday
[Restore] [Keep unavailable]

4. 3 staff photos waiting
[Review photos]

The Home screen should show only the top few cards, not the whole inbox.

Button:

View all in Agent Inbox

Smoothness rule:

Home should show the most important decisions, not the full task backlog.

6.4 Quick actions

Quick actions should adapt to restaurant rhythm.

Normal mode
Sold out
Add item
Change price
Create offer
Upload menu
Rush mode

During busy hours:

Mark sold out
Restore item
Add today special
Change price

Do not show:

Improve descriptions
Review weekly insights
Redesign print menu
Opening mode
Restore yesterday’s items
Review today’s offers
Check pending photos
Closing mode
Expire today’s specials
Restore tomorrow
View summary

Smoothness rule:

MenuList should match restaurant operating rhythm.

Owners behave differently during opening, rush, and closing.

6.5 Today’s menu state

This block shows active operational state.

Example:

Today

Unavailable:
Cold Coffee until tomorrow 10 AM
Chicken Biryani until manually restored

Active offers:
Office Lunch Combo, 12 PM - 4 PM
Today’s Special, expires tonight

Scheduled:
Weekend Combo starts Friday

Actions:

Restore
Extend
Edit timing
Remove

Smoothness rule:

Temporary states should be visible and easy to clean up.

This prevents forgotten sold-out items and stale offers.

6.6 Menu Health summary

Home shows a small version:

Menu Health: 74/100

Fix first:
Chicken Biryani has high views but no photo.
Weekend Combo expired yesterday.
Fresh Lime Soda has no price.

[Fix top issues]

Do not show every issue here.

Smoothness rule:

Menu Health should feel like help, not criticism.

6.7 Recent activity

A small plain-language feed:

Recent activity

2:14 PM · Paneer Tikka price changed ₹179 → ₹199
1:05 PM · Ravi marked Chicken Biryani unavailable
12:10 PM · Rajma Chawal added as Today’s Special

Actions:

View history
Rollback

Smoothness rule:

Recent activity gives owners confidence and accountability.

7. Command Box specification

The Command Box is the main product interface.

It should not behave like chat.

It should behave like an operation creator.

7.1 Command states
Idle
Receiving input
Understanding
Needs clarification
Proposal ready
Approval pending
Publishing
Done
Failed

Owner-friendly labels:

Understanding your menu update...
I found 3 possible items.
I prepared 2 updates.
Publishing update...
Done.
7.2 Command input types
Text command
Tea 20
Biryani over
Add mango lassi 99
Voice command

Owner speaks naturally.

Cold coffee khatam hai aaj

MenuList converts to:

Mark Cold Coffee unavailable today?
Upload command

Owner uploads menu photo/PDF.

MenuList responds:

I’m building your menu from this.
Screenshot command

Owner uploads delivery app screenshot.

MenuList responds:

I’ll compare this with your MenuList menu.
Customer complaint command

Owner types:

Customer says burger price wrong

MenuList responds:

Which burger is wrong?
7.3 Command interpretation behavior

For every command, MenuList should internally resolve:

Intent
Entity
Value
Scope
Time
Surface
Risk

But owner sees only:

I prepared this update.

Example:

Owner:
Increase all tea by 5

MenuList:

Found 4 tea items.

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

Scope:
Indiranagar outlet only

[Approve all] [Edit selected] [Cancel]
7.4 Multi-command handling

Owner may say:

Tea 20, coffee 40, cold coffee over

MenuList should create one operation:

I prepared 3 updates:

1. Masala Tea ₹15 → ₹20
2. Hot Coffee ₹35 → ₹40
3. Cold Coffee unavailable until tomorrow 10 AM

[Approve all] [Review one by one] [Cancel]

Smoothness rule:

Owners speak in batches. MenuList should handle batches.

7.5 Clarification behavior

Clarification should be tap-based and short.

Example:

Owner:
Burger 119

MenuList:

Which burger?

[Veg Burger]
[Cheese Burger]
[Chicken Burger]
[All burgers]

After selection:

Cheese Burger ₹99 → ₹119

[Approve]

Then:

Remember “burger” as Cheese Burger?

Smoothness rule:

Clarification should become memory.

Every question should make future commands faster.

7.6 Error behavior

If MenuList cannot understand:

Bad:

Sorry, I cannot help with that.

Good:

I’m not sure what menu change you want.

Do you want to:
[Change price]
[Mark sold out]
[Add item]
[Create offer]
[Upload menu]

Smoothness rule:

Failure should become guided choice.

Do not leave the owner stuck.

8. Agent Inbox specification

Agent Inbox is where prepared work waits.

It is the trust layer.

8.1 Inbox groups

Cards should be grouped by action priority.

Needs approval now
Needs review
Scheduled
Waiting / manual action
Done recently

Example:

Needs approval now
Price change request
Bulk tea price update
Staff photo approval

Needs review
9 description suggestions
Possible duplicate item

Scheduled
Today’s Special expires tonight

Waiting / manual action
Delivery app export ready

Smoothness rule:

Inbox should not be chronological only. It should be priority-based.

8.2 Priority order

Highest priority:

Publishing failed
Price mismatch
Price change approval
Bulk update approval
Expired offer still live
Staff risky request

Medium priority:

Restore sold-out item
Photo approval
Offer extension
Missing price
Drift decision

Lower priority:

Description suggestions
Low-view photo gaps
Category cleanup
Optional promo ideas

Smoothness rule:

MenuList should protect owner attention.

9. Agent Inbox card templates

Now the exact card contracts.

9.1 Price Update Card
Trigger
Owner command
Staff request
External correction
Drift resolution
Manual edit
Card
Price Update

You said:
“Paneer tikka 199”

MenuList found:
Paneer Tikka

Change:
₹179 → ₹199

Scope:
Indiranagar outlet only

Customer preview:
Paneer Tikka ₹199

Affects:
QR menu
Public menu
WhatsApp menu
Printable PDF

Price changes need owner approval.

[Approve] [Edit] [Cancel]
Required system behavior
Show old price and new price
Show outlet scope
Show affected surfaces
Require owner approval
Create rollback snapshot
Log approval
Publish after approval
Verify live menu
Create receipt
Smoothness lock

Price cards must never hide before/after.

9.2 Bulk Price Update Card
Trigger
Increase all tea by 5
Increase paneer items by 20
Change all biryani prices by 30
Card
Bulk Price Update

You said:
“Increase all tea by 5”

I found 4 tea items:

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

Scope:
Indiranagar outlet only

Affects:
QR menu, public menu, WhatsApp menu, printable PDF

Rollback:
All 4 changes can be undone together.

[Approve all] [Edit selected] [Change scope] [Cancel]
Required system behavior
Show affected count
Show item-level before/after
Allow edit selected
Create operation group
Create grouped rollback
Require owner approval
Smoothness lock

Bulk actions need grouped rollback.

9.3 Availability / Sold-Out Card
Trigger
Cold coffee over
Biryani sold out
Momos not available today
Card
Availability Update

You said:
“Cold coffee over”

Proposal:
Mark Cold Coffee unavailable until tomorrow 10 AM.

Customer preview:
Cold Coffee
Unavailable today

Visibility:
Show as unavailable

Scope:
Indiranagar outlet only

[Approve] [Change time] [Hide instead] [Cancel]
Required system behavior
Default temporary
Suggest next opening restore time
Respect visibility preference
Publish unavailable state
Schedule restore reminder or rule
Verify
Smoothness lock

Sold-out defaults to temporary until next opening.

9.4 Restore Availability Card
Trigger
Opening time
Unavailable item end time reached
Owner opens app in morning
Card
Restore Items

These items were unavailable yesterday:

Cold Coffee
Chicken Biryani
Veg Momos

Restore now?

[Restore all] [Select items] [Keep unavailable]
Required system behavior
Know previous unavailable items
Know business opening time
Restore selected items
Publish
Verify
Log
Smoothness lock

Prevent forgotten sold-out items.

This directly protects sales.

9.5 New Item Card
Trigger
Add cheese garlic bread 149
New mango lassi 99
Add paneer roll 119
Card
New Item

Create:

Cheese Garlic Bread
Category: Starters
Price: ₹149
Description: Toasted garlic bread topped with cheese.
Photo: Missing

Visibility:
Live on customer menu

Affects:
QR menu, public menu, WhatsApp menu, print PDF

[Approve] [Edit] [Cancel]
Required system behavior
Infer category
Check duplicates
Generate safe description
Set default availability
Set photo missing task
Require approval
Publish
Create follow-up photo task
Smoothness lock

Missing photo should not block item creation.

After approval:

Cheese Garlic Bread is live.
Photo missing. Send staff photo task?
9.6 Today’s Special Card
Trigger
Today special rajma chawal 129
Add mango lassi 99 today only
Card
Today’s Special

Create:

Rajma Chawal ₹129

Placement:
Top of menu

Availability:
Today only

Expiry:
Tonight at closing

Customer preview:
Today’s Special
Rajma Chawal ₹129
Available today only

Also ready:
WhatsApp text
Instagram caption
Counter display text

[Approve menu update] [Edit] [Cancel]
Required system behavior
Create item or offer
Set Today’s Special category
Set featured placement
Set expiry
Prepare promo outputs
Schedule expiry
Publish
Verify
Smoothness lock

Specials must expire by default.

9.7 Offer Create Card
Trigger
Create lunch combo
Weekend family pack
Happy hour offer
Festival combo
Card
Offer

Create:

Office Lunch Combo
Veg Thali + Buttermilk
Combo price: ₹149

Timing:
Monday to Friday, 12 PM - 4 PM

Placement:
Top of Lunch section

Customer preview:
Office Lunch Combo ₹149
Available 12 PM - 4 PM

Promo:
WhatsApp text ready

[Approve] [Edit items] [Change price] [Cancel]
Required system behavior
Suggest offer structure
Use existing items where possible
Set timing
Set placement
Set expiry if relevant
Generate promo text
Require approval
Publish
Track views
Smoothness lock

Offer creation starts from intent, not form fields.

Owner says:

Create lunch combo for office crowd

MenuList should propose the offer.

9.8 Offer Expiry Card
Trigger
Offer expiry approaching
Offer expired
Scheduled expiry executed
Card before expiry
Offer Expiring

Weekend Combo expires tonight.

What should happen?

[Let it expire] [Extend] [Edit]
Card after expiry
Offer Expired

Weekend Combo expired yesterday.

Remove from customer menu or extend it?

[Remove] [Extend] [Keep active]
Required system behavior
Track expiry
Auto-expire if owner approved expiry earlier
Create extension option
Archive historical offer
Log
Smoothness lock

Expiry should be part of original approval.

If owner approved:

Today’s Special expires tonight

MenuList can expire it without asking again.

9.9 Photo Approval Card
Trigger
Staff uploaded photo
Owner uploaded photo
Photo matched to item
Photo quality checked
Card
Photo Approval

Ravi uploaded a photo for Paneer Tikka.

Quality:
Good

MenuList check:
Looks like a dry starter dish.

Customer preview:
Paneer Tikka with new photo

[Publish photo] [Ask retake] [Choose another item]
Required system behavior
Track uploader
Match photo to item
Check quality
Require approval before publishing
Publish approved photo
Log staff contribution
Smoothness lock

Staff uploads should not go live without approval unless the owner created a rule.

9.10 Photo Task Card
Trigger
Missing photo
High-view item without photo
Owner asks fix photos
Card
Photo Task

12 items need photos.
Start with 4 high-view items:

Chicken Biryani
Paneer Tikka
Cold Coffee
Veg Thali

Send photo upload link to staff?

[Send WhatsApp link] [Upload myself] [Later]
Required system behavior
Prioritize by customer impact
Generate task link
Track uploads
Match photos
Create approval cards
Smoothness lock

Photo collection should be delegated.

The owner should not have to personally manage every photo.

9.11 Description Batch Card
Trigger
Menu health scan
Owner says fix descriptions
New import has missing descriptions
Card
Description Improvements

9 items have no description.

I prepared safe descriptions.

Examples:

Cold Coffee
Chilled coffee blended with milk and ice.

Paneer Roll
Soft roll filled with paneer and house-style seasoning.

[Review all] [Approve all] [Edit selected] [Skip]
Required system behavior
Generate safe descriptions
Avoid invented ingredients
Flag uncertain items
Batch low-risk proposals
Learn from owner edits
Publish approved descriptions
Smoothness lock

Use safe descriptions first. Ask ingredient questions only when necessary.

9.12 Label Update Card
Trigger
Missing veg/non-veg labels
Owner asks add labels
Menu import detected labels
Card
Menu Labels

6 items need veg/non-veg labels.

Suggested:
Paneer Tikka — Veg
Chicken Biryani — Non-veg
Egg Roll — Egg

[Approve suggestions] [Edit selected] [Skip]
Required system behavior
Use obvious labels cautiously
Require confirmation for risky labels
Never guess allergen/health claims
Publish approved labels
Smoothness lock

Dietary basics can be suggested, but sensitive claims need confirmation.

Never guess:

Vegan
Gluten-free
Nut-free
Sugar-free
Healthy
Organic
9.13 Drift / Mismatch Card
Trigger
External screenshot mismatch
Google menu mismatch
Print PDF stale
Customer complaint
Website menu mismatch
Card
Possible Mismatch

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]
Required system behavior
Compare values
Show source
Ask owner decision
Do not overwrite source of truth automatically
Create update proposal or external task
Log decision
Smoothness lock

Always ask “Which is correct?”

Never assume external source is correct.

9.14 Menu Import Review Card
Trigger
Photo/PDF/Excel/menu screenshot uploaded
Card
Menu Import

Your menu is 87% ready.

I found:
8 categories
94 items
31 variants
6 things need confirmation

Ready to review?

[Review confirmations] [Preview menu] [Cancel]
Confirmation card example
Confirm Variant

Chicken Biryani 180/300

What do these prices mean?

[Half ₹180 / Full ₹300]
[Regular ₹180 / Family ₹300]
[Small ₹180 / Large ₹300]
Required system behavior
Extract menu
Structure categories/items/variants
Detect ambiguity
Ask only blocking questions
Create draft menu
Publish after approval
Create health tasks for missing photos/descriptions
Smoothness lock

Do not block launch for non-critical missing content.

Missing photo should become a later task.

9.15 Staff Request Card
Trigger
Staff attempts restricted action
Staff requests correction
Staff creates offer draft
Card
Staff Request

Ravi requested a price change:

Chicken Biryani
₹229 → ₹249

Price changes need owner approval.

[Approve] [Edit] [Reject]
Required system behavior
Check role permission
Classify risk
Allow permitted actions
Escalate restricted actions
Log staff actor
Notify owner
Smoothness lock

Staff can contribute without risking the menu.

9.16 Rule Suggestion Card
Trigger
Repeated approvals detected
Owner behavior pattern found
Card
Suggested Rule

You usually restore sold-out beverages the next morning.

Create rule?

When beverages are marked sold out,
restore them automatically at next opening.

[Create rule] [No]
Required system behavior
Detect pattern
Explain rule simply
Require owner approval
Allow pause/removal
Log future rule actions
Smoothness lock

Automation should come from owner-approved rules.

Not hidden AI decisions.

9.17 Publish Failure Card
Trigger
Surface update failed
Verification mismatch
Manual output failed
Card
Publishing Issue

Paneer Tikka was changed to ₹199.

Updated:
QR menu
Public menu

Could not update:
Printable PDF

[Try again] [Create manual PDF task] [Ignore for now]
Required system behavior
Show partial success
Show failed surface
Offer retry
Create manual task if needed
Keep operation status incomplete until resolved or dismissed
Smoothness lock

Never hide partial failure.

Owner trust increases when the system is honest.

9.18 Rollback Card
Trigger
Owner taps rollback
Recent high-risk operation
Bulk update mistake
Card
Rollback Price Update?

This will restore:

Paneer Tikka ₹199 → ₹179
Paneer Roll ₹119 → ₹99
Paneer Butter Masala ₹269 → ₹249

Affects:
QR menu, public menu, WhatsApp menu, print PDF

[Rollback all] [Cancel]
Required system behavior
Show reversal before/after
Treat rollback as new operation
Publish reverted state
Verify
Log
Smoothness lock

Rollback should restore state but never erase history.

10. Master Menu specification

The Master Menu is the source of truth view.

But it should feel like the customer menu first.

10.1 Master Menu layout
Live customer preview
Category list
Item status overlays
Filters
Quick actions
Item detail panel

The default view:

Today’s Special
Starters
Main Course
Beverages
Desserts

Each item row:

Paneer Tikka
₹199
Available
Photo added
Veg · Spicy
Visible on QR + public menu

Another:

Cold Coffee
₹99
Unavailable until tomorrow 10 AM
Photo missing
Shown as unavailable

Another:

Fresh Lime Soda
No price
Needs attention

Smoothness rule:

The owner should see what customers see, with operational overlays.

10.2 Menu filters

Filters should answer owner needs.

Needs attention
Unavailable
Missing photos
Missing descriptions
No price
Recently changed
Offers
Scheduled
Archived
Conflict detected

For multi-outlet:

Different by outlet
Outlet-specific price
Unavailable in selected outlet

Smoothness rule:

Filters should help owners fix problems, not just browse data.

10.3 Item detail panel

When opening an item:

Paneer Tikka

Live status:
Available

Price:
₹199

Category:
Starters

Description:
Grilled paneer pieces with house-style seasoning.

Photo:
Added

Labels:
Veg, Spicy, Bestseller

Availability:
Every day

Visibility:
Shown on customer menu

Appears on:
QR menu
Public menu
WhatsApp menu
Print PDF

Recent history:
Yesterday · Price changed ₹179 → ₹199
Last week · Photo updated

Actions:

Change price
Mark unavailable
Edit description
Replace photo
Add variant
Add add-on
Create offer
Archive item
View history

Smoothness rule:

Item detail should combine control, preview, and history in one place.

10.4 Item status badges

Use plain language.

Live
Unavailable today
Available after 4 PM
Photo missing
Description missing
Needs confirmation
Pending approval
Scheduled
Expired
Conflict found
Print outdated
Outlet override
Rollback available

Avoid technical statuses.

Bad:

sync_pending
visibility_rule_active
entity_conflict_detected

Good:

Waiting to publish
Possible mismatch
Shown as unavailable
10.5 Category management

Owners should be able to reorder categories, but MenuList should suggest improvements.

Example card:

Category Suggestion

Today’s Special is below Beverages.

Move it to the top?

[Move to top] [Keep]

Category row:

Beverages
24 items
2 unavailable
5 missing photos

Smoothness rule:

Category suggestions should be based on customer/menu impact.

Not arbitrary beautification.

10.6 Variants and add-ons

For item with variants:

Butter Chicken

Half ₹299
Full ₹499

Owner command:

Butter chicken half 329 full 529

MenuList proposal:

Update Butter Chicken variants:

Half ₹299 → ₹329
Full ₹499 → ₹529

[Approve] [Edit]

For add-ons:

Extra Cheese ₹30
Extra Spicy ₹0
Make it Combo ₹99

Owner command:

Add cheese option 30 for all burgers

MenuList:

Add Extra Cheese ₹30 to 5 burger items.

[Approve] [Edit selected]

Smoothness rule:

Variant and modifier changes should use normal owner language.

The owner should not need to understand internal schema.

11. Publish Center specification

Publish Center gives confidence that MenuList is the source of truth and surfaces are updated.

11.1 Publish Center layout
Publishing overview
Surface status cards
Latest receipt
Manual tasks
Print freshness
External checks
Surface history
11.2 Publishing overview
Menu truth:
Version from 2:14 PM

Status:
QR and public menu synced

Needs action:
Printable PDF outdated
Delivery app export ready
Google waiting to reflect

Plain language states:

Updated
Outdated
Submitted
Waiting
Failed
Export ready
Manual action needed
Not connected

Smoothness rule:

Publish Center should show approved truth versus published reality.

Example:

MenuList price is ₹199.
Google still shows ₹179.
Update submitted.

This prevents confusion.

11.3 Surface status cards
QR Menu
QR Menu
Updated 12 minutes ago
Verified live

Your QR code stays the same when menu changes.

[Preview] [Download QR] [Print QR]
Public Menu
Public Menu
Updated 12 minutes ago
Verified live

[Open live menu] [Copy link]
WhatsApp Menu
WhatsApp Menu
Ready from latest menu

[Copy text] [Share on WhatsApp]
Printable PDF
Printable PDF
Outdated after 7 price changes

[Regenerate PDF]
Google
Google
Update submitted
Waiting to reflect

[I’ll keep checking]
Delivery Export
Delivery Apps
Direct update not connected

Export ready:
Updated price list
Menu image
Change summary

[Download export] [Mark done]

Smoothness rule:

When direct publish is unavailable, create the next-best task.

11.4 Publish receipt

After every approved operation:

Done.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu
WhatsApp menu

Regenerated:
Printable PDF

Waiting:
Google

Manual action:
Delivery export ready

Rollback available.

Smoothness rule:

The receipt is the owner’s confidence moment.

Never end with only:

Saved.
11.5 Print freshness

Print matters for SMBs.

If menu changed after PDF generation:

Printable menu is outdated

You changed 18 prices after the last print PDF.

[Regenerate PDF]

Also reassure:

Your QR code does not need to change.
Only the menu content changed.

Smoothness rule:

Tell owners when offline materials are stale.

12. Growth / Menu Improvement specification

Growth is not a separate marketing product.

It is menu improvement.

12.1 Growth layout
Menu Health
High-impact fixes
Photos
Descriptions
Offers
Customer searches
Popular items
Weekly recommendations
12.2 Menu Health card
Menu Health: 74/100

Fix first:

1. Chicken Biryani has high views but no photo.
2. Weekend Combo expired yesterday.
3. Fresh Lime Soda has no price.
4. 6 items need veg/non-veg labels.
5. Paneer Roll may be duplicated.

[Fix top issues]

Smoothness rule:

Menu Health should prioritize business impact.

Not all missing fields are equal.

12.3 Photo improvement section
Photos

12 items need photos.
4 are high-impact:

Chicken Biryani
Paneer Tikka
Cold Coffee
Veg Thali

[Send staff photo task]

After staff uploads:

3 photos waiting for approval

Smoothness rule:

The product should turn missing photos into delegated work.

12.4 Description improvement section
Descriptions

9 items have weak or missing descriptions.

I prepared safe descriptions.

[Review] [Approve all] [Edit selected]

For unsafe/uncertain items:

Special Pizza needs one detail before I write it.

What makes it special?

[Extra cheese] [Paneer topping] [House sauce] [Other]

Smoothness rule:

Do not invent ingredients. Ask only when necessary.

12.5 Offers section
Offers

Active:
Office Lunch Combo
Today’s Special

Suggested:
Weekend Family Pack
Summer Beverage Offer

Expired:
Weekend Combo

[Create offer] [Repeat successful offer]

If a special performed well:

Mango Lassi got high views yesterday.

Repeat today or add as regular item?

[Repeat today] [Add regular item] [Ignore]

Smoothness rule:

Successful specials should become follow-up decisions.

12.6 Customer search insights
Customers searched “momos” 18 times this week.
Momos are not on your menu.

[Add momos] [Ignore]
Customers viewed Lunch Combo often after 3 PM.
It is available only until 2 PM.

Extend timing to 4 PM?

[Approve] [Edit]

Smoothness rule:

Every insight should become an action.

No passive analytics first.

13. Control / Trust Center specification

Control is where the owner feels safe.

13.1 Control layout
Approvals
Staff and roles
Rules
History / ledger
Rollback
AI preferences
Outlet control
Publishing permissions
13.2 Approvals panel
Pending approvals

Price updates: 2
Staff requests: 1
Photo approvals: 3
External publish approvals: 1

[Review approvals]

This panel is useful for owners who want to manage risk centrally.

13.3 Staff panel

Staff list:

Ravi · Manager
Can mark sold out
Can restore items
Can upload photos
Cannot change prices

Priya · Staff
Can upload photos
Can request corrections
Cannot publish

Actions:

Send photo task
Send sold-out link
Edit permissions
Remove access

Smoothness rule:

Staff permissions should be action-based.

Do not say:

Admin access
Editor access
Viewer access

Say:

Can upload photos
Can mark sold out
Can approve price changes
13.4 Task links

Task links should be generated from Control, Home, or Growth.

Examples:

Photo upload link
Sold-out update link
Correction request link
Restore item link

Staff page should be tiny.

For photo upload:

Take photo
Choose item
Submit

For sold out:

Search item
Mark sold out
Choose duration
Submit

Smoothness rule:

Staff should not need the full dashboard.

This is crucial for SMB adoption.

13.5 Rules panel

Rules shown in plain language:

Active rules

Today’s Specials expire at closing.
Sold-out beverages restore next morning.
Sold-out items are shown as unavailable.
Staff photos require owner approval.

Rule detail:

Rule:
Today’s Specials expire at closing

Approved by:
Owner

Scope:
Indiranagar outlet

Last run:
Yesterday 11:00 PM

[Pause rule] [Edit] [Remove]

Suggested rule:

You usually restore sold-out beverages next morning.

Create rule?

[Create rule] [No]

Smoothness rule:

Rules are approved automation.

This makes agentic behavior safe.

13.6 Ledger / history panel

Plain-language timeline:

Today

2:14 PM
Paneer Tikka changed from ₹179 to ₹199.
Approved by Owner.
Published to QR menu and public menu.
Verified live.
Rollback available.

1:05 PM
Ravi marked Chicken Biryani unavailable until tomorrow 11 AM.
Published to QR and public menu.

12:10 PM
Rajma Chawal added as Today’s Special.
Expires tonight at closing.

Filters:

Price changes
Staff actions
Offers
Publishing
Rollbacks
Rules
Photos

Smoothness rule:

History should explain business events, not technical logs.

13.7 Rollback panel

Recent rollbackable operations:

Bulk paneer price update
7 items changed
Rollback available

Paneer Tikka price update
₹179 → ₹199
Rollback available

Today’s Special added
Rollback available

Rollback confirmation:

Rollback this operation?

This will restore:
Paneer Tikka ₹199 → ₹179

Affects:
QR menu
Public menu
WhatsApp menu
Print PDF

[Rollback] [Cancel]

Smoothness rule:

Rollback should be easy to find after high-risk changes.

13.8 AI preferences panel

This should not feel technical.

Settings should be business-friendly:

Descriptions:
Short and simple

Sold-out items:
Show as unavailable

Today’s Specials:
Expire at closing

Price changes:
Owner approval required

Staff photos:
Owner approval required

WhatsApp promo language:
Hinglish

Customer-facing tone:
Friendly

Smoothness rule:

AI settings should be expressed as owner preferences, not model settings.

Do not show:

temperature
confidence threshold
model behavior

Show:

Ask me before price changes.
Keep descriptions short.
14. Screen state behavior

Each screen should have clear states.

14.1 Home states
Healthy state
Your menu is live.
No urgent issues.
Attention state
3 things need attention.
Publishing issue state
Menu update incomplete.
Opening state
Restore yesterday’s unavailable items?
Rush state
Quick actions only.
Closing state
Expire specials and prepare tomorrow?
14.2 Agent Inbox states
Empty
Needs approval
Needs clarification
Scheduled
Manual action required
Recently completed

Empty should still be useful:

No approvals pending.
Your menu is live and synced.

[Add update] [View menu]
14.3 Master Menu states
Live
Draft changes pending
Item unavailable
Item scheduled
Item archived
Conflict detected
Needs attention
14.4 Publish Center states
All synced
Some surfaces outdated
Publishing in progress
Manual action required
External waiting
Failure
15. Exact owner flows across screens

Now we connect screens into real owner journeys.

Flow A: Price change

Owner on Home:

Paneer tikka 199

Command Box creates card:

Paneer Tikka ₹179 → ₹199

Owner approves.

Publish Center runs:

QR updated
Public updated
WhatsApp ready
PDF regenerated

Receipt:

Done. Paneer Tikka is now ₹199. Rollback available.

Control ledger records:

Approved by Owner.
Verified live.

System memory:

Paneer tikka phrase maps to Paneer Tikka item.
Flow B: Sold out during rush

Owner taps quick action:

Sold out

Searches:

Cold Coffee

MenuList proposes:

Mark Cold Coffee unavailable until tomorrow 10 AM?

Owner approves.

Customer menu shows:

Unavailable today

Home Today state shows:

Cold Coffee unavailable until tomorrow 10 AM

Next morning Home shows:

Restore Cold Coffee?
Flow C: Staff photo collection

Growth card:

Chicken Biryani has high views but no photo.

Owner taps:

Send staff photo task

Staff uploads.

Agent Inbox:

Ravi uploaded photo for Chicken Biryani.
Quality good.

[Publish]

Owner approves.

Publish receipt:

Photo published to QR and public menu.

Menu Health improves.

Flow D: Today’s special

Owner:

Add today special rajma chawal 129

Card:

Rajma Chawal ₹129
Today only
Top of menu
Expires tonight
WhatsApp text ready

Owner approves.

Home Today state:

Today’s Special active
Expires tonight

Closing:

Rajma Chawal expires at closing as approved.
Repeat tomorrow or let expire?

If views are high:

Rajma Chawal got high views.
Add as regular item?
Flow E: Drift resolution

MenuList detects mismatch:

MenuList Veg Burger ₹99
Uploaded delivery menu ₹89

Agent Inbox:

Which is correct?

Owner chooses:

Keep ₹99

System:

MenuList remains ₹99.
Delivery export ready.

Manual task:

Update delivery app menu.

Ledger records decision.

16. Notification behavior

MenuList should notify only when useful.

Immediate notifications
Price change approval requested
Publishing failed
Possible price mismatch
Expired offer still live
Staff requested high-risk change
Gentle notifications
Photo waiting for approval
Description suggestions ready
Weekly menu improvement summary
No noisy notification
Low-view item missing description
Minor category suggestion
Optional promo idea

Smoothness rule:

Notifications should be based on urgency and business impact.

17. Empty states

Empty states should teach behavior.

Empty Home attention
No urgent issues.
Your menu is live and synced.

Tell MenuList what changed anytime.
Empty Agent Inbox
No approvals pending.
MenuList will show prepared updates here before anything important goes live.
Empty Menu

For new business:

Upload a menu photo, PDF, or WhatsApp text.
MenuList will build your live menu.
Empty Growth
Your menu has no major issues right now.
MenuList will suggest improvements as customers interact with it.

Smoothness rule:

Empty states should reinforce the operating model.

18. Language and tone

MenuList should speak like a careful assistant, not a technical system.

Use:

I found...
This will change...
Customers will see...
Approve?
Done.
Rollback available.

Avoid:

Intent detected
Entity resolved
Mutation pending
Sync job complete
Confidence score

For uncertainty:

I’m not sure which item you mean.

Not:

Low entity resolution confidence.

For publishing:

QR menu updated.

Not:

Surface adapter completed.

For failure:

Printable PDF could not regenerate.

Not:

PDF render job failed.

Smoothness rule:

Every technical state must translate into owner language.

19. The most important card design detail

Every high-risk card should include four things above the approve button:

Before/after
Scope
Customer preview
Rollback note

Example:

Change:
₹179 → ₹199

Scope:
Indiranagar outlet only

Customer preview:
Paneer Tikka ₹199

Rollback:
Available after publishing

Only then:

[Approve]

Smoothness rule:

Owners approve faster when they know exactly what will happen.

20. Final screen contract

MenuList screens should behave like this:

Home:
Shows what needs attention now.

Command Box:
Turns messy owner input into proposals.

Agent Inbox:
Shows prepared actions for approval.

Master Menu:
Shows the source of truth with customer preview and operational status.

Publish Center:
Shows where the menu is live, synced, outdated, or waiting.

Growth:
Turns menu quality and customer signals into useful actions.

Control:
Protects trust with staff roles, rules, history, rollback, and preferences.

This is the complete owner-facing product surface.

21. The smoothness ideas to protect from this layer

These are product-defining, not cosmetic.

1. Home is a decision room

The owner should immediately know what needs action.

2. Command is always available

The owner should not hunt for edit screens.

3. Agent Inbox is the approval layer

Every important AI action becomes a card.

4. Cards show consequence

Before approval, show what changes, where, and what customers see.

5. Price and bulk updates are heavily protected

Before/after, scope, approval, rollback.

6. Sold-out and specials use safe defaults

Sold-out is temporary. Specials expire.

7. Publishing gives receipts

The owner sees what updated and what still needs action.

8. Staff uses simple task links

Staff helps without full dashboard complexity.

9. Growth produces actions, not reports

Insights become menu decisions.

10. Control makes AI trustworthy

Rules, roles, history, rollback, and preferences keep the owner in charge.

22. The final owner experience at screen level

The product should feel like this:

Owner opens MenuList.

Home:
Your menu is live.
2 approvals pending.
1 offer expires tonight.
3 photos waiting.
Cold Coffee was unavailable yesterday. Restore?

Owner types:
Add mango lassi 99 today special

Command Box:
Understanding...

Agent Inbox card:
Create Mango Lassi ₹99 under Today’s Special.
Available today only.
Show at top.
Expires tonight.
WhatsApp text ready.

[Approve]

Publish receipt:
Done.
QR menu updated.
Public menu updated.
WhatsApp text ready.
Printable PDF regenerated.
Rollback available.

Growth:
Mango Lassi has no photo.
Send staff photo task?

Control:
Mango Lassi added by Owner.
Expires tonight.
Rollback available.

That is MenuList.

Not a QR tool.
Not an AI chat widget.
Not a menu generator.

A full AI Menu Ops platform where:

Owner speaks business truth.
MenuList turns it into safe menu operations.
Owner approves.
Menu stays correct everywhere.

Next layer: interaction-level specs for each major card — exact button behavior, edit behavior, clarification behavior, approval behavior, receipt behavior, and failure behavior.
```

### Message 27 - User

- Message ID: 2df855f0-5d7e-4562-bb87-87dc472cd016
- Captured from scroll band: target-0

```
Next
```

### Message 28 - Assistant

- Message ID: 12a2d92d-2ade-40bf-8e26-af073e7c4425
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
I’ll go one level deeper now: not screens, but the exact interaction behavior behind every approve, edit, clarify, publish, rollback, failure, and rule action.
```

### Message 29 - Assistant

- Message ID: 21864b13-f613-4df6-b167-ed44635b11f2
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
Spec Layer 3: Interaction Contracts

Now we go one level deeper than screens and cards.

This layer defines exactly:

What happens when owner taps Approve
What happens when owner taps Edit
What happens when owner taps Cancel
What happens when MenuList is unsure
What happens when publishing fails
What happens when a card is ignored
What happens when a batch is partially approved
What happens when owner changes scope, time, or item selection
What happens after completion
What MenuList remembers

The product remains the same:

Owner gives messy business input. MenuList prepares safe menu operations. Owner approves. MenuList publishes, verifies, logs, and remembers.

1. The core interaction rule

Every owner action should move a card forward in a predictable way.

The owner should never feel:

What happened after I tapped this?
Did it update?
Where did it update?
Can I undo it?

So every meaningful interaction must end in one of these visible states:

Needs clarification
Ready for approval
Edited and ready
Publishing
Done
Scheduled
Waiting for manual action
Failed
Ignored
Rolled back

No silent states.

No hidden work.

No “Saved” without context.

2. Universal card lifecycle

Every Agent Inbox card should follow this lifecycle:

Created
↓
Needs clarification, if unclear
↓
Ready for approval
↓
Owner approves / edits / cancels / ignores
↓
Policy check
↓
Menu state update
↓
Publishing
↓
Verification
↓
Receipt
↓
Ledger
↓
Memory update

Owner sees a simple version:

Prepared
Needs approval
Publishing
Done
Rollback available

This consistency is very important.

The owner should learn one behavior:

MenuList prepares.
I approve.
MenuList updates.
I get confirmation.
3. Universal interaction states
State: Needs clarification

Used when MenuList is not confident enough.

Example:

You said:
“Burger 119”

I found 3 burgers.

Which one?
[Veg Burger] [Cheese Burger] [Chicken Burger] [All burgers]

After owner selects, the card becomes:

Price Update

Cheese Burger
₹99 → ₹119

[Approve] [Edit] [Cancel]

Important rule:

Clarification should never feel like a form. It should feel like a quick tap.

State: Ready for approval

Used when MenuList knows what to do but needs permission.

Example:

Paneer Tikka
₹179 → ₹199

[Approve] [Edit] [Cancel]

Important rule:

High-risk cards must show before/after, scope, customer preview, and rollback note before approval.

State: Publishing

After approval:

Publishing update...

For quick operations, this may only appear briefly.

For multi-surface operations:

Updating QR menu...
Updating public menu...
Regenerating print PDF...
Preparing WhatsApp menu...

Important rule:

Publishing should show progress only when it takes noticeable time.

Do not overcomplicate fast updates.

State: Done

After successful publish and verification:

Done.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu
WhatsApp menu

Printable PDF regenerated.

Rollback available.

Important rule:

Done should always explain what changed and where.

State: Scheduled

For future actions:

Scheduled.

Weekend Combo will start Friday at 6 PM.
It will expire Sunday at closing.

Important rule:

Scheduled cards should remain visible in Home or Agent Inbox until active or completed.

State: Waiting for manual action

When direct publishing is unavailable:

Delivery app update needs manual action.

I prepared:
Price change summary
Menu export image
CSV export

[Download export] [Mark done]

Important rule:

Manual action should still feel supported, not abandoned.

State: Failed

When something fails:

Publishing issue.

QR menu updated.
Public menu updated.
Printable PDF could not regenerate.

[Try again] [Create manual task] [Ignore for now]

Important rule:

Failure should show partial success and next action.

Never simply say:

Something went wrong.
4. Universal button behavior

These buttons should behave consistently everywhere.

5. Button: Approve
Owner expectation
I agree. Do it.
System behavior

When owner taps Approve, MenuList should:

1. Lock the proposal content
2. Run policy check one final time
3. Create approval record
4. Create rollback snapshot if needed
5. Apply change to approved menu state
6. Create new menu snapshot
7. Start publishing jobs
8. Verify surfaces
9. Create receipt
10. Add ledger entry
11. Update memory

Owner sees:

Publishing update...

Then:

Done.
Critical behavior

Approval should not mean:

Store as draft

unless the card clearly says draft.

Approval means:

Make this approved menu change and publish according to scope.
6. Approve behavior by risk
Low-risk approval

Example:

Approve 9 safe descriptions

Owner taps:

Approve all

System:

Publishes descriptions
Logs batch approval
Learns description style

Receipt:

Done. 9 descriptions updated.
Medium-risk approval

Example:

Mark Cold Coffee unavailable until tomorrow 10 AM

Owner taps:

Approve

System:

Updates availability
Publishes customer menu
Schedules restore reminder
Logs action

Receipt:

Done. Cold Coffee is unavailable until tomorrow 10 AM.
High-risk approval

Example:

Change Paneer Tikka ₹179 → ₹199

Owner taps:

Approve

System:

Creates rollback snapshot
Updates price
Publishes
Verifies
Shows rollback

Receipt:

Done. Paneer Tikka is now ₹199.
Rollback available.
7. Button: Edit
Owner expectation
This is close, but I want to change something before approval.

Edit should not throw the owner into a full admin page unless necessary.

There should be three edit levels:

Quick edit
Structured edit
Full edit
7.1 Quick edit

Used for small changes.

Example price card:

Paneer Tikka
₹179 → ₹199

Owner taps:

Edit

Inline edit opens:

New price: [199]

Owner changes to:

209

Card updates:

Paneer Tikka
₹179 → ₹209

[Approve] [Cancel]

System behavior:

Recalculate proposal
Recalculate customer preview
Recalculate publishing impact
Keep same operation
Update proposal revision

Important rule:

After edit, MenuList must re-run impact and policy.

A small edit can change risk.

7.2 Structured edit

Used when the owner needs to change scope, time, item selection, or placement.

Example sold-out card:

Mark Cold Coffee unavailable until tomorrow 10 AM

Owner taps:

Change time

Structured options:

For 2 hours
Until tomorrow opening
Until manually restored
Choose date/time

Owner selects:

For 2 hours

Card updates:

Mark Cold Coffee unavailable until 4 PM today.

[Approve]
7.3 Full edit

Used for complex objects like offers, combos, imported menu, variants.

Example offer card:

Office Lunch Combo
Veg Thali + Buttermilk
₹149
12 PM - 4 PM

Owner taps:

Edit

Full edit panel opens:

Offer name
Items
Combo price
Timing
Expiry
Placement
Promo text

After editing, owner returns to approval card.

Important rule:

Even full edit should return to a preview approval card before publishing.

No form should directly publish risky changes.

8. Edit history inside proposal

Each proposal should track edits.

Example:

Original proposal:
Paneer Tikka ₹179 → ₹199

Owner edited:
₹199 → ₹209

Final approved:
₹179 → ₹209

Ledger should say:

Paneer Tikka changed from ₹179 to ₹209.
Approved by Owner.

Internal history can preserve the original AI suggestion.

Owner does not need to see it unless debugging.

Smoothness idea to lock:

Owner edits should become memory.

If MenuList suggested:

Mango Lassi under Desserts

Owner changed to:

Beverages

Memory:

Lassi-type items belong under Beverages.
9. Button: Cancel
Owner expectation
Do not do this.

Cancel should remove the proposal from active attention.

But MenuList should preserve the record internally.

Owner sees:

Cancelled.
No menu changes were made.

System behavior:

Mark proposal cancelled
Do not update menu
Do not publish
Log cancellation lightly
Use cancellation as weak memory signal

Example:

MenuList proposed:
Move Today’s Special to top.

Owner cancels.

Memory:
Do not aggressively suggest this again soon.

Important rule:

Cancel means no change. It should not archive the item, delete the card history, or publish anything.

10. Button: Reject

Reject is stronger than Cancel.

Use Reject when another actor requested something.

Example:

Ravi requested price change:
Chicken Biryani ₹229 → ₹249

[Approve] [Edit] [Reject]

Owner taps:

Reject

System:

Mark staff request rejected
Notify staff if needed
Log rejection
Do not update menu

Owner sees:

Rejected. No menu change was made.

Staff sees:

Price change request was rejected by owner.

Smoothness rule:

Use Cancel for owner’s own draft. Use Reject for another person/system request.

11. Button: Ignore

Ignore is used for suggestions, not important pending changes.

Examples:

Customers searched “momos”
Missing photo suggestion
Category suggestion
Optional offer idea

Owner taps:

Ignore

System:

Dismiss card
Do not create proposal
Reduce similar suggestion frequency
Keep insight history

Owner sees:

Ignored.

For repeated irrelevant insights:

Do not suggest this again?

Example:

Customers searched “momos” 18 times.

Owner ignores twice.

MenuList can ask:

Stop suggesting momos?

Smoothness rule:

Ignore should reduce noise.

12. Button: Change Scope

Scope edits are critical for trust.

Used for:

One outlet vs all outlets
Selected items vs all items
One surface vs all surfaces
Temporary vs permanent
Current menu vs future menu

Example:

Bulk Price Update

Increase 7 paneer items by ₹20.

Scope:
Indiranagar outlet only

[Approve all] [Change scope]

Owner taps:

Change scope

Options:

Indiranagar only
All outlets
Selected outlets
All outlets except...

If owner selects all outlets:

This will update 21 items across 3 outlets.

Indiranagar: 7 items
Bandra: 7 items
Powai: 7 items

[Approve all] [Edit selected] [Cancel]

Important rule:

Changing scope must regenerate impact preview.

Scope changes can increase risk.

So MenuList must re-run:

affected item count
affected outlet count
affected surfaces
rollback group
approval requirement

Smoothness idea to lock:

Show outlet exceptions clearly.

Example:

All outlets except Bandra

Owner should not manage 20 checkboxes when natural language can express exceptions.

13. Button: Change Time

Used for availability, specials, offers, scheduling.

Example:

Mark Cold Coffee unavailable until tomorrow 10 AM.

[Change time]

Options:

For 2 hours
Until closing
Until next opening
Until manually restored
Choose date/time

For specials:

Expires tonight
This week
This weekend
Custom date
Keep until removed

For timed items:

Every day
Weekdays
Weekends
Specific days
Custom schedule

System behavior:

Update availability/expiry rule
Update customer preview
Update scheduled jobs
Update receipt wording

Customer preview example:

Cold Coffee
Available after 4 PM

or:

Cold Coffee
Unavailable today

Smoothness idea to lock:

Time choices should use restaurant language.

Use:

Until closing
Until tomorrow opening
Lunch time
Weekend

not only:

Date/time picker
14. Button: Select Items

Used when a group match may include too much.

Example:

Biryani over

MenuList:

I found 3 biryani items:

Veg Biryani
Chicken Biryani
Mutton Biryani

[Approve all] [Select items]

Owner taps:

Select items

Selection panel:

[x] Veg Biryani
[x] Chicken Biryani
[x] Mutton Biryani

Owner unchecks Veg Biryani.

Card updates:

Mark 2 biryani items unavailable until tomorrow 11 AM:

Chicken Biryani
Mutton Biryani

[Approve]

System behavior:

Update proposal changes
Update affected count
Update customer preview
Update rollback group

Smoothness rule:

Selection should start from MenuList’s best guess, not a blank checklist.

15. Button: Edit Selected

Used for bulk operations.

Example:

Increase all tea by ₹5

Card:

4 tea items changing

[Approve all] [Edit selected]

Owner taps:

Edit selected

Panel:

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

Owner changes:

Elaichi Tea ₹25 → ₹35

Card updates:

4 tea items changing.

Elaichi Tea edited:
₹25 → ₹35

[Approve all]

Important rule:

Edit selected should preserve the batch.

Do not split into separate unrelated cards unless owner chooses.

16. Button: Approve All

Used for grouped proposals.

Examples:

Bulk price update
Batch descriptions
Multiple photos
Multiple label suggestions
Menu import confirmations

Behavior depends on risk.

Low-risk batch

Example:

9 descriptions ready

Owner taps:

Approve all

System:

Publish all descriptions
Log one batch operation
Learn style

Receipt:

Done. 9 descriptions updated.
High-risk batch

Example:

7 prices changing

Owner taps:

Approve all

Before execution, card must already show:

Affected count
Before/after
Scope
Rollback note

No extra confirmation is needed if the card is clear.

But for very large or multi-outlet batch, use heavier confirmation:

Confirm 42 price changes across 5 outlets?

[Confirm update] [Cancel]

Smoothness rule:

Batch approval saves time, but large high-risk batches need stronger confirmation.

17. Button: Review One by One

Used when a grouped operation contains mixed risk.

Example:

I prepared 3 updates:

1. Tea ₹15 → ₹20
2. Coffee ₹35 → ₹40
3. Cold Coffee unavailable until tomorrow

[Approve all] [Review one by one]

Owner taps:

Review one by one

Cards become:

Card 1 of 3
Card 2 of 3
Card 3 of 3

Owner can:

Approve
Edit
Skip

At end:

2 approved, 1 skipped.

Publish approved changes?

[Publish 2 changes] [Cancel]

Smoothness idea to lock:

Mixed-risk batches need guided review.

Do not force all-or-nothing when the owner may want partial approval.

18. Button: Publish

Most proposal cards should use Approve, not Publish.

Use Publish when the proposal is already approved as a draft but not live.

Examples:

Photo approved but not published
Offer draft ready
Imported menu reviewed
Print PDF ready

Example:

Imported menu is ready.

94 items
8 categories
6 confirmed corrections

[Publish live menu]

System behavior:

Create current menu snapshot
Publish surfaces
Verify
Receipt
Ledger

Smoothness rule:

Use Approve for decision. Use Publish for making an already-reviewed draft live.

This keeps language clear.

19. Button: Try Again

Used for failed publishing or verification.

Example:

Printable PDF could not regenerate.

[Try again]

System behavior:

Retry failed publish job
Do not duplicate menu change
Keep same operation
Update status
Create new verification result

Owner sees:

Trying again...

Then either:

Done. Printable PDF regenerated.

or:

Still could not regenerate PDF.

[Create manual task] [Contact support]

Important rule:

Retry should not apply the menu change again.

It should retry only the failed publishing/output step.

20. Button: Create Manual Task

Used when automation cannot finish.

Example:

Delivery app direct update not connected.

[Create manual task]

System creates:

Manual task
Prepared assets
Instructions
Assignee
Due/reminder

Owner sees:

Manual task created.

Update delivery app menu.
Export and change summary ready.

[Download] [Mark done]

Smoothness rule:

Manual task should include prepared assets.

Do not create vague tasks like:

Update delivery app.

Create:

Download updated price list
Upload this image
Use this change summary
21. Button: Mark Done

Used for manual tasks.

Example:

Delivery export ready.

[Mark done]

Owner taps.

MenuList asks, when useful:

Did you update the delivery app menu?

[Yes, mark done] [Not yet]

System behavior:

Mark manual task completed
Record completion actor and time
Optionally schedule drift check/reminder

If owner uploads screenshot after marking done:

Upload screenshot to verify?

Smoothness idea to lock:

Manual completion should optionally create verification.

For delivery platforms without API, screenshot verification can help detect mismatch.

22. Button: Rollback

Used after high-risk or recent operations.

Example receipt:

Done. 7 paneer items updated.
Rollback available.

Owner taps:

Rollback

Rollback card:

Rollback bulk price update?

This will restore:

Paneer Tikka ₹199 → ₹179
Paneer Roll ₹119 → ₹99
Paneer Butter Masala ₹269 → ₹249

Affects:
QR menu
Public menu
WhatsApp menu
Print PDF

[Rollback all] [Cancel]

System behavior:

Create rollback operation
Create reversal proposal
Require approval for high-risk rollback
Apply previous values
Publish
Verify
Log

Receipt:

Rollback complete.

7 prices restored.
QR and public menu updated.
Printable PDF regenerated.

Important rule:

Rollback restores state but does not erase history.

Ledger should show:

Bulk price update applied.
Bulk price update rolled back.
23. Button: Create Rule

Used when MenuList identifies repeated behavior.

Example:

You usually restore sold-out beverages next morning.

Create rule?

[Create rule] [No]

Owner taps:

Create rule

MenuList shows final rule preview:

Rule:

When a beverage is marked sold out,
restore it automatically at next opening.

Scope:
Indiranagar outlet

You can pause this anytime.

[Confirm rule]

System behavior:

Create rule object
Record owner approval
Apply to future matching events
Log future rule executions

Future receipt:

Cold Coffee restored at opening.
Rule: Sold-out beverages restore next morning.

Smoothness rule:

Rule creation needs explicit confirmation because it affects future behavior.

24. Button: Extend

Used for offers, specials, unavailable states, scheduled items.

Example:

Weekend Combo expires tonight.

[Extend]

Options:

Extend to Sunday closing
Extend by 1 day
Extend this week
Choose date

Card updates:

Extend Weekend Combo until Sunday 11 PM.

[Approve]

System behavior:

Update expiry rule
Update scheduled jobs
Publish if customer-visible
Log extension

Smoothness idea:

Extension options should be smart by offer type.

Today’s Special:

Tomorrow
This week
Make regular item

Weekend Combo:

Sunday closing
Next weekend
Custom date

Lunch Combo:

This week
Every weekday
Custom schedule
25. Button: Ask Retake

Used for photo approval.

Example:

Cold Coffee photo is dark.

[Ask retake]

System behavior:

Mark photo rejected or retake_requested
Notify staff with reason
Keep task open
Preserve rejected photo internally

Staff message:

Please retake Cold Coffee photo.
Reason: photo is dark.

Owner sees:

Retake requested from Ravi.

Smoothness rule:

Ask retake should include the reason automatically.

Staff should not receive vague feedback.

26. Button: Choose Another Item

Used when photo match or command entity is wrong.

Example photo card:

Ravi uploaded a photo for Paneer Tikka.

[Choose another item]

Owner selects:

Paneer Butter Masala

System:

Update matched item
Re-run match/safety if needed
Update proposal

Owner sees:

Publish this photo for Paneer Butter Masala?

[Publish]

Memory:

Staff/photo matching adjusted.

Smoothness rule:

Corrections should be fast and should improve future matching.

27. Button: Keep MenuList Value

Used for drift.

Example:

Possible mismatch:

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

[Keep ₹99]

System behavior:

Do not change MenuList truth
Mark external source stale
Create manual/external update task if useful
Log owner decision

Owner sees:

MenuList remains ₹99.
Delivery menu marked outdated.
Export update ready.

Smoothness rule:

Keeping MenuList value should still help fix the external mismatch.

28. Button: Change to External Value

Used for drift.

Example:

[Change to ₹89]

System should not instantly overwrite.

It should create a price proposal:

Price Update

Veg Burger
₹99 → ₹89

Source:
Uploaded delivery menu

Affects:
QR menu
Public menu
WhatsApp menu
Print PDF

[Approve] [Cancel]

Why?

Because changing MenuList truth is still high-risk.

Smoothness rule:

External drift decision can create a proposal, but high-risk menu truth changes still require approval.

29. Button: Preview

Used across import, publish, offer, item edit.

Preview should show customer view, not admin data.

Example:

Customer preview:

Today’s Special
Rajma Chawal ₹129
Available today only

For full menu import:

Preview live menu

Owner sees customer-facing menu with status badges:

Missing photo
Needs confirmation

Smoothness rule:

Preview should answer: “What will customers see?”

Not:

What does the database contain?
30. Button: Save Draft

Used for offers, imported menu, descriptions, complex edits.

Example:

Save offer as draft

System behavior:

Save draft state
Do not publish
Do not update live customer menu
Create draft ledger entry if useful

Owner sees:

Draft saved.
Not visible to customers yet.

[Publish when ready]

Smoothness rule:

Draft must clearly mean not live.

SMB owners should never confuse draft with published menu.

31. Button: Archive

Used instead of delete.

Example:

Archive Cold Coffee?

MenuList should explain:

Archiving hides it from customers but keeps history.
You can restore it later.

[Archive] [Cancel]

System behavior:

Set item status archived
Remove from customer-facing surfaces
Keep price/photo/history
Publish
Verify
Create rollback/restore path

Owner receipt:

Cold Coffee archived.
It no longer appears on customer menu.
Restore available.

Smoothness rule:

Delete should almost never be the default. Archive protects owners from mistakes.

32. Interaction contract: Price Update Card
Initial card
Price Update

Paneer Tikka
₹179 → ₹199

Scope:
Indiranagar outlet only

Customer preview:
Paneer Tikka ₹199

Affects:
QR menu, public menu, WhatsApp menu, print PDF

Rollback:
Available after update

[Approve] [Edit] [Change scope] [Cancel]
Approve
Publishing...

Receipt:

Done.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu
WhatsApp menu

Printable PDF regenerated.

Rollback available.
Edit

Inline field:

New price: ₹199

Owner changes to ₹209.

Card updates:

₹179 → ₹209
Change scope

Options:

This outlet only
All outlets
Selected outlets

For all outlets:

This will update Paneer Tikka in 3 outlets.

Indiranagar ₹179 → ₹199
Bandra ₹189 → ₹199
Powai ₹179 → ₹199

[Approve]
Cancel
Cancelled. No price change was made.
Failure
Price updated in MenuList.

QR menu updated.
Public menu updated.
Printable PDF failed.

[Try again] [Create manual task]
33. Interaction contract: Bulk Price Update Card
Initial card
Bulk Price Update

Increase all tea items by ₹5.

Found 4 items:

Masala Tea ₹15 → ₹20
Ginger Tea ₹20 → ₹25
Lemon Tea ₹20 → ₹25
Elaichi Tea ₹25 → ₹30

Scope:
Indiranagar outlet only

Rollback:
All 4 changes can be undone together.

[Approve all] [Edit selected] [Change scope] [Cancel]
Approve all

System creates one operation group.

Receipt:

Done.

4 tea prices updated.
QR and public menu updated.
Printable PDF regenerated.

Rollback all 4 available.
Edit selected

Owner changes one item.

Card updates with note:

Elaichi Tea edited manually:
₹25 → ₹35
Partial approval

Owner unselects one item.

Receipt:

Done.

3 tea prices updated.
1 item skipped.
Rollback
Rollback tea price update?

This will restore 3 prices.

[Rollback all]

Smoothness lock:

Bulk operation must stay grouped even after edits.

34. Interaction contract: Availability Card
Initial card
Availability Update

Cold Coffee

Mark unavailable until tomorrow 10 AM.

Customer preview:
Cold Coffee
Unavailable today

Visibility:
Show as unavailable

[Approve] [Change time] [Hide instead] [Cancel]
Approve

Receipt:

Done.

Cold Coffee is unavailable until tomorrow 10 AM.
Customers will see “Unavailable today.”

Restore reminder set.
Change time

Options:

For 2 hours
Until closing
Until tomorrow opening
Until manually restored
Choose time
Hide instead

Card updates:

Cold Coffee will be hidden from customer menu until tomorrow 10 AM.

[Approve]
Next morning restore

Home card:

Cold Coffee was unavailable yesterday.

Restore now?

[Restore] [Keep unavailable]

Smoothness lock:

Availability and visibility are separate choices.

35. Interaction contract: Restore Card
Initial card
Restore Items

These items were unavailable yesterday:

Cold Coffee
Chicken Biryani
Veg Momos

[Restore all] [Select items] [Keep unavailable]
Restore all

Receipt:

Done.

3 items are available again.
QR and public menu updated.
Select items

Owner chooses only Cold Coffee.

Receipt:

Done.

Cold Coffee restored.
2 items remain unavailable.
Keep unavailable

System asks only if needed:

Keep unavailable until when?

[Today closing] [Tomorrow opening] [Until manually restored]

Smoothness lock:

Restore flow prevents lost sales caused by forgotten unavailable items.

36. Interaction contract: New Item Card
Initial card
New Item

Create:

Cheese Garlic Bread
Category: Starters
Price: ₹149
Description: Toasted garlic bread topped with cheese.
Photo: Missing

Customer preview:
Cheese Garlic Bread ₹149

[Approve] [Edit] [Cancel]
Approve

Receipt:

Done.

Cheese Garlic Bread is live under Starters.

Photo missing.
Send photo task to staff?

[Send task] [Later]
Edit

Structured edit:

Name
Category
Price
Description
Availability
Visibility

After edit, returns to approval card.

Duplicate detected

Before approval:

Possible duplicate found:

Garlic Bread ₹129

Still create Cheese Garlic Bread?

[Create anyway] [Merge/Edit] [Cancel]

Smoothness lock:

New item approval should include duplicate check but not overblock.

37. Interaction contract: Today’s Special Card
Initial card
Today’s Special

Create:

Rajma Chawal ₹129

Placement:
Top of menu

Availability:
Today only

Expiry:
Tonight at closing

Customer preview:
Today’s Special
Rajma Chawal ₹129
Available today only

Also ready:
WhatsApp text
Instagram caption
Counter display text

[Approve menu update] [Edit] [Cancel]
Approve

Receipt:

Done.

Rajma Chawal is live under Today’s Special.
It will expire tonight at closing.
WhatsApp text is ready.

[Share on WhatsApp]
Edit

Owner can change:

Price
Category
Expiry
Placement
Promo text
At expiry

If original approval included expiry:

Rajma Chawal expired at closing as approved.

No new approval required.

After high engagement
Rajma Chawal got high views today.

Repeat tomorrow or add as regular item?

[Repeat tomorrow] [Add regular item] [Ignore]

Smoothness lock:

Specials should create their own cleanup and follow-up decisions.

38. Interaction contract: Offer Card
Initial card
Offer

Create:

Office Lunch Combo
Veg Thali + Buttermilk
₹149

Timing:
Monday to Friday, 12 PM - 4 PM

Placement:
Top of Lunch section

Customer preview:
Office Lunch Combo ₹149
Available 12 PM - 4 PM

[Approve] [Edit items] [Change price] [Cancel]
Approve

Receipt:

Done.

Office Lunch Combo is live.
Visible Monday to Friday, 12 PM - 4 PM.
WhatsApp promo ready.
Edit items

Owner can swap items.

MenuList recalculates:

New combo:
Paneer Roll + Cold Coffee
Suggested price: ₹179
Change timing

Options:

Today only
Weekdays
Weekend
Lunch time
Custom
Expiry

Offer should always have either:

expiry date
recurring schedule
manual active status

Smoothness lock:

Offer cards should never require the owner to start from discount mechanics.

Owner says intent. MenuList proposes structure.

39. Interaction contract: Offer Expiry Card
Before expiry
Offer Expiring

Weekend Combo expires tonight.

[Let it expire] [Extend] [Edit]
Let it expire

If expiry was already approved:

Okay. Weekend Combo will expire tonight as planned.
Extend

Options:

Extend to Sunday closing
Extend one week
Choose date

After selection:

Extend Weekend Combo until Sunday 11 PM.

[Approve]
After expiry
Weekend Combo expired yesterday.

[Remove from menu] [Extend] [Repeat next weekend]

Smoothness lock:

Expired offers should never remain live unnoticed.

40. Interaction contract: Photo Task Card
Initial card
Photo Task

12 items need photos.
Start with 4 high-view items:

Chicken Biryani
Paneer Tikka
Cold Coffee
Veg Thali

[Send WhatsApp link] [Upload myself] [Later]
Send WhatsApp link

Owner selects staff or copies link.

System:

Create task link
Track assigned items
Notify staff

Owner sees:

Photo task sent to Ravi.
I’ll show uploads here for approval.
Upload myself

Owner uploads photo.

System:

Match photo to item
Check quality
Create approval card
Later

System dismisses but may remind gently.

Smoothness lock:

Photo work should move from owner burden to staff task.

41. Interaction contract: Photo Approval Card
Initial card
Photo Approval

Ravi uploaded a photo for Paneer Tikka.

Quality:
Good

MenuList check:
Looks like a dry starter dish.

Customer preview:
Paneer Tikka with new photo

[Publish photo] [Ask retake] [Choose another item]
Publish photo

Receipt:

Done.

Photo published for Paneer Tikka.
QR and public menu updated.
Ask retake

System sends reason:

Retake requested.
Reason: photo is dark.
Choose another item

Owner selects correct item.

Card updates:

Publish this photo for Paneer Butter Masala?

[Publish]

Smoothness lock:

Photo approval should be fast, visual, and reversible.

42. Interaction contract: Description Batch Card
Initial card
Description Improvements

9 items have no description.
I prepared safe descriptions.

[Review all] [Approve all] [Edit selected] [Skip]
Review all

Owner sees list:

Cold Coffee
Chilled coffee blended with milk and ice.

Paneer Roll
Soft roll filled with paneer and house-style seasoning.

Actions per item:

Use
Edit
Skip
Approve all

Receipt:

Done. 9 descriptions updated.
Edit selected

Owner edits text.

System memory:

Learns preferred style
Unsafe item

For uncertain item:

Special Pizza needs one detail.

What makes it special?

[Extra cheese] [Paneer topping] [House sauce] [Other]

Smoothness lock:

Do not ask ingredient questions for every item. Only ask where needed.

43. Interaction contract: Label Card
Initial card
Menu Labels

6 items need veg/non-veg labels.

Suggested:
Paneer Tikka — Veg
Chicken Biryani — Non-veg
Egg Roll — Egg

[Approve suggestions] [Edit selected] [Skip]
Approve suggestions

Receipt:

Done. 6 labels added.
Risky label detected

For sensitive claims:

I should not guess this label.

Is Chocolate Cake eggless?

[Yes] [No] [Skip]

Smoothness lock:

Sensitive labels require confirmation.

Never guess:

Vegan
Gluten-free
Nut-free
Organic
Sugar-free
Healthy
44. Interaction contract: Drift Card
Initial card
Possible Mismatch

MenuList:
Veg Burger ₹99

Uploaded delivery menu:
Veg Burger ₹89

Which is correct?

[Keep ₹99] [Change to ₹89] [Ignore]
Keep MenuList value

System:

MenuList remains source of truth
External source marked outdated
Manual task/export prepared

Owner sees:

MenuList remains ₹99.
Delivery menu update task created.
Change to external value

System creates high-risk price proposal:

Change Veg Burger ₹99 → ₹89?

[Approve] [Cancel]
Ignore

System dismisses.

If same mismatch appears repeatedly:

Ignore this source for Veg Burger?

Smoothness lock:

Drift resolution should never silently overwrite the master menu.

45. Interaction contract: Menu Import Review
Initial card
Menu Import

Your menu is 87% ready.

I found:
8 categories
94 items
31 variants
6 things need confirmation

[Review confirmations] [Preview menu] [Cancel]
Review confirmations

One clarification at a time:

Chicken Biryani 180/300

What do these prices mean?

[Half / Full]
[Regular / Family]
[Small / Large]

Progress:

Question 1 of 6
Preview menu

Shows customer menu with badges:

Needs confirmation
Photo missing
Description missing
Publish

After blocking confirmations:

Publish this menu?

94 items
8 categories
18 missing photos can be fixed later.

[Publish live menu]

Receipt:

Done.

Your live menu is ready.
QR menu and public menu published.
18 photo tasks created.

Smoothness lock:

Menu import should ask only blocking questions before launch.

Do not make missing photos/descriptions block publishing.

46. Interaction contract: Staff Request Card
Initial card
Staff Request

Ravi requested a price change:

Chicken Biryani
₹229 → ₹249

Price changes need owner approval.

[Approve] [Edit] [Reject]
Approve

System:

Record owner approval
Apply price change
Publish
Notify staff if needed
Log actor and approver separately

Ledger:

Ravi requested price change.
Owner approved.
Chicken Biryani changed ₹229 → ₹249.
Edit

Owner changes to ₹239.

Ledger:

Ravi requested ₹249.
Owner approved ₹239.
Reject
Rejected. No menu change was made.

Staff notification:

Price change request rejected by owner.

Smoothness lock:

Staff actor and owner approver must be separately visible.

This creates accountability.

47. Interaction contract: Rule Suggestion Card
Initial card
Suggested Rule

You usually restore sold-out beverages the next morning.

Create rule?

When beverages are marked sold out,
restore them automatically at next opening.

[Create rule] [No]
Create rule

Final confirmation:

Confirm rule:

Beverages marked sold out will restore at next opening.

Scope:
Indiranagar outlet

You can pause this anytime.

[Confirm rule]

Receipt:

Rule created.
Sold-out beverages will restore at next opening.
No

System:

Dismiss rule suggestion
Do not suggest again immediately
Future rule execution

Receipt:

Cold Coffee restored at opening.
Rule: Sold-out beverages restore next morning.

Smoothness lock:

Rules should feel owner-approved and reversible.

48. Interaction contract: Publish Failure Card
Initial card
Publishing Issue

Paneer Tikka was changed to ₹199.

Updated:
QR menu
Public menu

Could not update:
Printable PDF

[Try again] [Create manual task] [Ignore for now]
Try again

System retries only failed surface.

Success:

Done. Printable PDF regenerated.

Failure again:

Still could not regenerate PDF.

[Create manual task] [Contact support]
Ignore for now

System marks issue dismissed but surface remains outdated.

Publish Center shows:

Printable PDF outdated

Smoothness lock:

Ignoring a publish failure should not pretend everything is synced.

49. Interaction contract: Insight Card
Initial card
Customer Insight

Customers searched “momos” 18 times this week.
Momos are not on your menu.

[Add momos] [Ignore] [Remind later]
Add momos

System creates new item proposal:

Create new item:

Momos
Category: Snacks
Price: Need price

What price should I use?

[Enter price]

Because price is required, ask only that.

Ignore

System reduces suggestion frequency.

Remind later

System schedules reminder.

Smoothness lock:

Insights should convert into menu operations, not analytics pages.

50. Interaction contract: Manual Task Card
Initial card
Manual Action Needed

Delivery app direct update is not connected.

I prepared:
Updated price list
Menu image export
Change summary

[Download export] [Mark done] [Remind me]
Download export

System:

Provide prepared assets
Keep task open
Mark done

Owner confirms:

Did you update the delivery app menu?

[Yes, mark done] [Not yet]

After yes:

Marked done.
Upload screenshot to verify?

[Upload screenshot] [Skip]

Smoothness lock:

Manual tasks should not be dead ends. They should include assets, completion, and optional verification.

51. Interaction contract: Archive Item
Initial card
Archive Item

Archive Cold Coffee?

This will hide it from customers but keep history.
You can restore it later.

[Archive] [Cancel]
Archive

Receipt:

Cold Coffee archived.
It no longer appears on customer menu.
Restore available.
Restore later
Restore Cold Coffee to menu?

[Restore] [Cancel]

Smoothness lock:

Archive protects owners from accidental permanent deletion.

52. Interaction contract: Customer Complaint

This is a powerful owner flow.

Owner input
Customer says burger price wrong
MenuList response
Which burger?

Veg Burger ₹99
Cheese Burger ₹119
Chicken Burger ₹149

Owner selects:

Cheese Burger

MenuList asks:

What is the correct price?

Current MenuList price:
₹119

[₹119 is correct] [Change price] [Check external menus]

If owner taps Change price:

New price:
[   ]

Then proposal:

Cheese Burger
₹119 → ₹129

[Approve]

If owner taps Check external menus:

I’ll compare MenuList with uploaded/public menu sources.

Smoothness lock:

Customer complaints should become guided correction flows.

Owners often discover menu errors through customers. MenuList should make this easy to fix.

53. Interaction contract: Low-confidence command
Owner input
Special 149

MenuList should not guess recklessly.

Response:

What do you want to do with “Special 149”?

[Add today’s special]
[Change price of existing item]
[Create offer]
[Something else]

If owner chooses today’s special:

What is the item name?

The system asks only what is missing.

Smoothness lock:

When intent is unclear, ask intent first before entity details.

54. Interaction contract: Mixed-language command
Owner input
chai 20 kar do

MenuList:

I found Masala Tea.

Change price:
₹15 → ₹20

[Approve] [Choose another item]
Owner input
biryani khatam

MenuList:

Mark 3 biryani items unavailable until tomorrow 11 AM?

[Approve all] [Select items]
Owner input
paneer items 20 badhao

MenuList:

Increase 7 paneer items by ₹20?

[Approve all] [Edit selected]

Smoothness lock:

MenuList should understand messy, mixed-language, shorthand owner commands.

This is central for SMB adoption.

55. Interaction contract: Memory prompt

Memory should be suggested lightly.

Example:

You selected Paneer Butter Masala for “PBM”.

Remember this for next time?

[Remember] [Not now]

After enough repeated confirmation, MenuList can remember without asking too often.

For sensitive memory:

You prefer sold-out items shown as unavailable.

Save this preference?

[Save preference] [No]

Smoothness lock:

Memory should improve speed, not feel creepy.

Use owner-confirmed memory for important preferences.

56. Interaction contract: Completion receipt

Every completed operation should generate a receipt.

Receipt format
Done.

[Plain-language result]

Updated:
Surface 1
Surface 2

Waiting / manual:
Surface 3

Rollback:
Available / Not needed

Next:
Optional useful action

Example price receipt:

Done.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu
WhatsApp menu

Printable PDF regenerated.

Rollback available.

Example sold-out receipt:

Done.

Cold Coffee is unavailable until tomorrow 10 AM.
Customers will see “Unavailable today.”

Restore reminder set.

Example special receipt:

Done.

Mango Lassi is live under Today’s Special.
It expires tonight at closing.
WhatsApp text is ready.

Photo missing. Send staff task?

Smoothness lock:

Receipt should include the next useful action only when it is directly related.

Do not add random suggestions after every receipt.

57. Interaction contract: Failure receipt

Failure should be calm and actionable.

Bad:

Failed.

Good:

Update partially completed.

Paneer Tikka is now ₹199.

Updated:
QR menu
Public menu

Could not update:
Printable PDF

[Try again] [Create manual task]

Important rule:

Failure should separate menu truth from surface output.

Example:

MenuList price is ₹199.
Printable PDF still shows old price because regeneration failed.

This avoids owner confusion.

58. Interaction contract: Scheduled actions

Scheduled actions should be visible and controllable.

Example:

Today’s Special expires tonight at closing.

Owner should be able to:

Extend
Cancel expiry
Edit timing

At execution:

Today’s Special expired at closing as approved.

If execution fails:

Today’s Special should have expired, but QR menu could not update.

[Try again]

Smoothness lock:

Scheduled actions should not disappear into the background.

They should be visible as future menu events.

59. Interaction contract: Undo snackbar

Immediately after high-risk actions, MenuList should show a short-lived quick undo plus permanent rollback in history.

Example:

Paneer Tikka updated to ₹199.

[Undo]

If owner misses it, Control still has:

Rollback available

Difference:

Undo = quick immediate reversal
Rollback = structured operation from history

Smoothness idea to lock:

Use both quick undo and operation rollback.

Quick undo reduces fear.
Rollback provides long-term safety.

60. Interaction contract: Card grouping

Cards should group when it reduces cognitive load.

Good groups
9 descriptions ready
12 missing photo tasks
6 labels suggested
3 staff photos waiting
7 tea prices changing
Bad groups
Price update + photo suggestion + offer idea in one card

Risk levels should not be mixed unless the card clearly separates them.

Example mixed owner command:

Tea 20 and cold coffee over

Group is acceptable because it came from one command, but show separate rows:

1 high-risk price update
1 medium-risk availability update

Actions:

Approve both
Review one by one

Smoothness lock:

Group by owner intent and task type, not by random chronology.

61. Interaction contract: Card expiration

Not all cards should remain forever.

Cards that should expire or change state
Offer expiring soon
Restore reminder
Photo task reminder
Manual task reminder
Low-priority insight

Example:

Today’s Special expires tonight

After tonight:

Today’s Special expired

or:

Today’s Special expired as approved
Cards that should not disappear silently
Price approval
Publishing failure
Mismatch decision
Staff high-risk request
Missing price

Smoothness lock:

Critical cards stay until resolved. Optional cards can expire or become weekly summary.

62. Interaction contract: Notification to card

Every notification should open the relevant card, not a generic screen.

Example notification:

Ravi requested a price change.

Tap opens:

Staff Request card
Chicken Biryani ₹229 → ₹249

Example:

Printable PDF failed to regenerate.

Tap opens:

Publishing Issue card

Smoothness lock:

Notifications should deep-link to decisions.

63. Interaction contract: Owner command while card exists

If owner gives a command related to an existing pending card, MenuList should update that card instead of creating duplicates.

Example:

Existing card:

Cold Coffee unavailable until tomorrow 10 AM

Owner says:

Actually restore cold coffee now

MenuList should update:

Restore Cold Coffee now?

[Approve]

Not create a second conflicting card.

Example:

Existing card:

Paneer Tikka ₹179 → ₹199 pending

Owner says:

Make paneer tikka 209

MenuList should update proposal:

Paneer Tikka ₹179 → ₹209

[Approve]

Smoothness lock:

Related commands should merge into the active operation when appropriate.

This prevents card clutter and conflicting proposals.

64. Interaction contract: Conflict handling

A conflict happens when two pending or recent actions affect the same item/field.

Example:

Staff requested:
Chicken Biryani ₹229 → ₹249

Owner command:
Chicken Biryani 239

MenuList should show:

Two price changes for Chicken Biryani

Staff request:
₹229 → ₹249

Your command:
₹229 → ₹239

Which should I use?

[Use ₹239] [Use ₹249] [Cancel both]

System behavior:

Resolve conflict before approval
Log resolution
Notify staff if their request was overridden

Smoothness lock:

Conflicts should be explicit, not silently overwritten.

65. Interaction contract: Multi-outlet approval

For multi-outlet changes, scope preview must be strong.

Example:

Increase dosa to ₹119 all branches except Indiranagar

Card:

Multi-outlet Price Update

Masala Dosa

Koramangala ₹99 → ₹119
HSR ₹99 → ₹119
Whitefield ₹109 → ₹119
Indiranagar unchanged

Affects:
3 outlets

[Approve] [Edit outlets] [Cancel]

If many outlets:

This will update 18 items across 6 outlets.
View details

[Confirm update]

Smoothness lock:

Multi-outlet changes should support natural “all except” logic.

Owners think like this:

All branches except Bandra

not like:

Select 17 checkboxes
66. Interaction contract: Surface-specific approval

Sometimes owner wants to publish to one surface only.

Example:

Regenerate print menu only

Card:

Print Update

Regenerate printable PDF from latest menu.

No live menu changes.

[Regenerate PDF]

Example:

Share today special on WhatsApp

Card:

WhatsApp Text Ready

Mango Lassi ₹99
Today’s Special

[Copy text] [Share]

Important distinction:

Menu truth change
Surface output generation
External publishing

Smoothness lock:

Surface-only actions should not create menu truth changes.

67. Interaction contract: Import correction loop

During import, owner corrections should be quick.

Example:

Chicken Biryani 180/300

Owner selects:

Half / Full

MenuList should apply the pattern to similar items.

Then ask:

Apply Half/Full to 8 similar biryani/curry items?

[Apply] [Review]

Smoothness idea to lock:

Import confirmations should generalize patterns.

If the owner confirms one split-price pattern, MenuList should use it for similar lines and reduce questions.

68. Interaction contract: Menu Health fix flow

Owner taps:

Fix top issues

MenuList should create a guided sequence:

Issue 1 of 5:
Chicken Biryani has high views but no photo.

[Send staff photo task] [Skip]

Then:

Issue 2 of 5:
Weekend Combo expired yesterday.

[Remove] [Extend]

At end:

Done.

Fixed 3 issues.
Skipped 2.

Menu Health improved:
74 → 82

Smoothness lock:

Menu Health should become a short fixing session, not a long report.

69. Interaction contract: Rush mode

During rush hours, interactions should be shorter.

Command results should favor fast approvals.

Example:

Biryani over

Rush mode card:

Mark all biryani unavailable until tomorrow 11 AM?

[Approve] [Select]

Not:

Full surface list
Detailed analytics
Description suggestions
Offer recommendations

For high-risk price updates, still show protection:

Tea ₹15 → ₹20

[Approve]

Smoothness lock:

Rush mode reduces non-urgent detail but never removes high-risk safeguards.

70. Interaction contract: Opening mode

At opening, MenuList should surface readiness decisions.

Good morning.

Restore yesterday’s unavailable items?

Cold Coffee
Chicken Biryani
Veg Momos

[Restore all] [Select items]

Also:

Today’s scheduled offers:
Lunch Combo active 12 PM - 4 PM

3 photos waiting

Smoothness lock:

Opening mode should help the owner make the menu ready for the day.

71. Interaction contract: Closing mode

At closing, MenuList should clean up temporary states.

Before closing

Today’s Special expires tonight.
2 items are unavailable.
3 updates were made today.

[Let specials expire] [Prepare tomorrow]

Prepare tomorrow can show:

Restore sold-out items tomorrow morning?
Repeat Mango Lassi tomorrow?
Regenerate print PDF after today’s price changes?

Smoothness lock:

Closing mode prevents stale specials and forgotten sold-out items.

72. Interaction contract: Weekly review

Weekly review should create action cards.

This week

Most viewed:
Chicken Biryani

Needs action:
Chicken Biryani has no photo.
Customers searched “momos.”
Weekend Combo performed well.

Suggested:
Request biryani photo
Add momos
Repeat Weekend Combo

[Start weekly fixes]

Smoothness lock:

Weekly review should be a decision session, not analytics.

73. The strongest new smoothness idea from this layer

A very important addition:

Proposal Revision Preview

Whenever owner edits a proposal, MenuList should immediately show:

Updated proposal

not force the owner back through the command flow.

Example:

Original:
Paneer Tikka ₹179 → ₹199

Owner edits:
₹209

Updated:
Paneer Tikka ₹179 → ₹209

[Approve]

This makes editing feel lightweight.

Without this, owners will avoid AI proposals because correcting them feels like extra work.

74. Another smoothness idea: Smart chips

Instead of always opening forms, use smart chips.

For time:

Until closing
Tomorrow opening
2 hours
Custom

For scope:

This outlet
All outlets
Selected
All except...

For visibility:

Show unavailable
Hide
Available after time

For offer expiry:

Tonight
Sunday
This week
Custom

Smart chips make SMB workflows much faster than form fields.

75. Another smoothness idea: Approval friction levels

Do not use the same confirmation weight for everything.

Use three levels:

Light approval
Approve all descriptions
Normal approval
Mark item unavailable until tomorrow
Heavy approval
Confirm 42 price changes across 5 outlets

Heavy approval must include:

affected count
before/after
scope
rollback

This keeps common tasks fast and risky tasks safe.

76. Another smoothness idea: Sticky operation receipt

After completion, the receipt should stay accessible.

Example:

Paneer Tikka updated to ₹199.

This should appear:

briefly on Home
inside recent activity
inside ledger
inside item history
inside Publish Center receipt

Owners often need to confirm changes later.

Smoothness lock:

Receipt should not vanish completely after a few seconds.

77. Another smoothness idea: Suggested next action, but only one

After an operation, MenuList can suggest one directly related next action.

Example new item:

Photo missing. Send staff photo task?

Example special:

WhatsApp text ready. Share now?

Example bulk price update:

Printable PDF regenerated. Download?

Do not show five suggestions.

Bad:

Add photo, share WhatsApp, create Instagram, update Google, create offer, check analytics.

Good:

Photo missing. Send staff task?

Smoothness lock:

One next action is helpful. Many next actions become noise.

78. Interaction safety rules

These should never be broken.

Price changes always require approval.
Bulk changes always show affected count.
Multi-outlet changes always show outlet scope.
Delete defaults to archive.
Sold-out defaults to temporary.
Specials default to expiry.
External mismatch never overwrites MenuList silently.
Staff risky actions escalate to owner.
Failed publishing shows partial success.
Rollback restores state but preserves history.

These are product laws.

79. The complete interaction loop

Here is how every interaction should work internally:

Owner taps action
↓
Card state changes
↓
Proposal updates if needed
↓
Policy re-checks
↓
Approval recorded if required
↓
Menu snapshot created
↓
Publishing jobs run
↓
Verification runs
↓
Receipt shown
↓
Ledger updated
↓
Memory updated
↓
Next useful action suggested

The owner sees:

Approve
Publishing
Done
Rollback available

The system handles the complexity.

80. Final interaction behavior definition

MenuList should feel like this:

Fast for daily work.
Careful for risky work.
Helpful when unsure.
Honest when something fails.
Easy to correct.
Easy to undo.
Better every time the owner uses it.

A normal menu editor says:

Fill the form correctly.

MenuList says:

I prepared the update. Review and approve.

A normal AI chatbot says:

Here is how you can update your menu.

MenuList says:

I found the item. This is the change. Approve?

A normal dashboard says:

You have 38 missing fields.

MenuList says:

Chicken Biryani is highly viewed but has no photo. Send staff task?

That is the interaction layer.

The next layer is the technical API and event contract: exact endpoint behavior, payload shapes, event names, proposal schemas, approval payloads, publishing job payloads, verification payloads, and memory update rules.
```

### Message 30 - User

- Message ID: b0894c43-0806-46d8-8d4d-bd56660bf076
- Captured from scroll band: target-0

```
Next
```

### Message 31 - Assistant

- Message ID: 8aaed9a0-a7d9-4c66-b2e7-52290c0da177
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
I’ll continue from the locked MenuList direction into the technical API/event contract, covering endpoints, payloads, state changes, publishing, verification, memory, rules, and safety boundaries.
```

### Message 32 - Assistant

- Message ID: 79c1f382-d4a8-4782-bb0e-25c8d402543c
- Model: gpt-5-5-pro
- Captured from scroll band: target-0

```
Spec Layer 4: Technical API + Event Contract

This is where MenuList becomes buildable.

The owner experience remains simple:

Tell MenuList what changed.
MenuList prepares the update.
Owner approves.
MenuList publishes, verifies, logs, and remembers.

But the system underneath must be strict.

MenuList should not be built as:

Frontend calls updateItem()
AI sometimes edits menu directly
Publishing happens after save
History is added later

That would break trust.

MenuList should be built as:

Event received
↓
Operation created
↓
Proposal created
↓
Policy checked
↓
Approval recorded
↓
Menu snapshot created
↓
Publishing jobs run
↓
Verification completes
↓
Receipt created
↓
Ledger updated
↓
Memory updated

This is the technical contract.

1. The core API principle

There should be no public path where AI directly changes the live menu.

The wrong pattern:

POST /items/{id}
AI updates item
Menu changes live

The MenuList pattern:

POST /commands
↓
Operation created
↓
Proposal created
↓
Owner approves proposal
↓
Menu state changes
↓
Publish jobs run

Even manual edits should follow the same model.

If owner opens Paneer Tikka and changes price manually, internally that should still create:

price_update proposal
approval record
menu snapshot
publish job
ledger entry
rollback snapshot

This keeps the whole system consistent.

2. API families

MenuList needs these API groups from day one:

Command APIs
Operation APIs
Proposal APIs
Approval APIs
Clarification APIs
Menu Graph APIs
Publishing APIs
Verification APIs
Receipt APIs
Ledger APIs
Rollback APIs
Staff Task APIs
Rule APIs
Memory APIs
Menu Health APIs
Insight APIs
Manual Task APIs
Webhook / Event APIs

These are not separate products.

They are different technical surfaces of the same Menu Ops system.

3. Tenant and context contract

Every API call must carry business context.

At minimum:

business_id
outlet_context
actor_id
actor_role
request_id
idempotency_key

Why this matters:

If the owner is looking at Bandra outlet and says:

Biryani sold out

MenuList should know:

Scope: Bandra outlet only

unless the owner says all outlets.

Request context example
JSON
{
  "business_id": "biz_123",
  "outlet_context": {
    "mode": "single_outlet",
    "outlet_ids": ["outlet_bandra"]
  },
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "client_context": {
    "screen": "home",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata"
  },
  "request_id": "req_abc_123",
  "idempotency_key": "idem_abc_123"
}

Smoothness rule:

The backend must know where the owner is acting from, because scope is part of safety.

4. Universal response shape

Every API response that triggers work should return an operation state.

Example:

JSON
{
  "operation_id": "op_789",
  "status": "proposals_created",
  "owner_message": "I prepared 2 updates.",
  "cards": [
    {
      "card_id": "card_price_1",
      "proposal_id": "prop_1",
      "card_type": "price_update"
    },
    {
      "card_id": "card_availability_1",
      "proposal_id": "prop_2",
      "card_type": "availability_update"
    }
  ],
  "next_required_action": "owner_approval"
}

The frontend should not need to guess what happened.

The backend should always say:

Needs clarification
Ready for approval
Publishing
Done
Failed
5. Event envelope

Everything important should emit an event.

Not just for analytics.

Events drive:

Agent processing
Agent Inbox
Publishing
Verification
Ledger
Memory
Rules
Notifications
Manual tasks
Event envelope
JSON
{
  "event_id": "evt_123",
  "event_type": "owner_command_received",
  "business_id": "biz_123",
  "outlet_ids": ["outlet_1"],
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "operation_id": "op_789",
  "proposal_id": null,
  "correlation_id": "corr_456",
  "causation_id": null,
  "occurred_at": "2026-06-17T12:05:00+05:30",
  "schema_revision": "2026-06-01",
  "payload": {}
}

Important fields:

event_id
event_type
business_id
outlet_ids
actor
operation_id
proposal_id
correlation_id
causation_id
occurred_at
payload

Smoothness rule:

Every owner-visible action should be traceable back to an event.

That is how MenuList can answer:

Who changed this?
Why did this happen?
Where did it publish?
Can I undo it?
6. Core event types

MenuList should support these event families.

Command events
owner_command_received
owner_voice_command_received
owner_upload_received
customer_complaint_received
staff_command_received
Understanding events
intent_detected
entity_resolution_completed
clarification_requested
clarification_answered
scope_resolved
risk_classified
Proposal events
proposal_created
proposal_updated
proposal_needs_clarification
proposal_ready_for_approval
proposal_approved
proposal_rejected
proposal_cancelled
proposal_ignored
proposal_expired
Menu state events
menu_snapshot_created
item_created
item_price_changed
item_availability_changed
item_restored
item_archived
offer_created
offer_expired
photo_published
description_published
Publishing events
publish_job_created
publish_job_started
surface_updated
surface_update_failed
manual_task_required
surface_outdated
Verification events
verification_started
verification_completed
verification_failed
verification_mismatch_detected
Ledger and receipt events
receipt_created
ledger_entry_created
rollback_available
rollback_requested
rollback_completed
Memory and rule events
memory_suggested
memory_saved
rule_suggested
rule_approved
rule_triggered
rule_executed
rule_paused
Health and insight events
menu_health_issue_detected
menu_health_issue_resolved
customer_signal_recorded
insight_action_created
7. Command API

The Command API is the main owner input path.

It accepts messy input.

http
POST /v1/commands
Request
JSON
{
  "business_id": "biz_123",
  "outlet_context": {
    "mode": "single_outlet",
    "outlet_ids": ["outlet_1"]
  },
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "input": {
    "input_type": "text",
    "raw_text": "Tea 20, cold coffee over"
  },
  "client_context": {
    "screen": "home",
    "timezone": "Asia/Kolkata",
    "locale": "en-IN"
  },
  "idempotency_key": "idem_123"
}
Response
JSON
{
  "operation_id": "op_123",
  "status": "proposals_created",
  "owner_message": "I prepared 2 updates.",
  "cards": [
    {
      "proposal_id": "prop_price_tea",
      "card_type": "price_update",
      "title": "Price Update",
      "summary": "Masala Tea ₹15 → ₹20",
      "requires_approval": true
    },
    {
      "proposal_id": "prop_cold_coffee_unavailable",
      "card_type": "availability_update",
      "title": "Availability Update",
      "summary": "Cold Coffee unavailable until tomorrow 10 AM",
      "requires_approval": true
    }
  ]
}

Internal behavior:

Create event
Create operation
Run intake agent
Run resolver agent
Run proposal agent
Run policy agent
Return cards

Smoothness rule:

The command API should return cards, not just text.

8. Voice command API

Voice should become the same command pipeline.

http
POST /v1/commands/voice
Request
JSON
{
  "business_id": "biz_123",
  "outlet_context": {
    "mode": "single_outlet",
    "outlet_ids": ["outlet_1"]
  },
  "audio_asset_id": "audio_123",
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "client_context": {
    "screen": "home",
    "locale": "hi-IN"
  },
  "idempotency_key": "idem_voice_123"
}

The system should transcribe, normalize, and then enter the same pipeline.

Example:

"biryani khatam hai"

becomes:

Mark biryani items unavailable?

Smoothness rule:

Voice is not a separate product. It is another input into the same operation engine.

9. Upload / import API

Menu import should be an operation, not a file parser endpoint.

http
POST /v1/menu-imports
Request
JSON
{
  "business_id": "biz_123",
  "outlet_context": {
    "mode": "single_outlet",
    "outlet_ids": ["outlet_1"]
  },
  "source": {
    "source_type": "pdf",
    "asset_id": "asset_menu_pdf_123"
  },
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "idempotency_key": "idem_import_123"
}
Response
JSON
{
  "operation_id": "op_import_123",
  "import_id": "import_123",
  "status": "processing",
  "owner_message": "I’m building your menu from this."
}

When processing completes:

JSON
{
  "event_type": "menu_import_completed",
  "payload": {
    "import_id": "import_123",
    "detected_categories": 8,
    "detected_items": 94,
    "detected_variants": 31,
    "unclear_fields_count": 6,
    "draft_menu_snapshot_id": "draft_snap_123"
  }
}

Owner card:

Your menu is 87% ready.
8 categories, 94 items, 31 variants.
6 things need confirmation.

Smoothness rule:

Import should produce a draft menu plus confirmation cards, not raw OCR output.

10. Operation API

Operations are the parent container.

http
GET /v1/operations/{operation_id}
Response
JSON
{
  "operation_id": "op_123",
  "business_id": "biz_123",
  "source_type": "owner_command",
  "raw_input": "Tea 20, cold coffee over",
  "status": "pending_approval",
  "proposal_ids": ["prop_1", "prop_2"],
  "created_at": "2026-06-17T12:05:00+05:30",
  "updated_at": "2026-06-17T12:05:04+05:30"
}

Operation statuses:

received
understanding
needs_clarification
proposals_created
pending_approval
partially_approved
approved
publishing
completed
failed
cancelled
rolled_back

Smoothness rule:

The frontend should render operation status using owner language.

Example:

pending_approval → Needs approval
publishing → Updating menu
completed → Done
11. Agent Inbox API

The Agent Inbox is a priority queue of cards.

http
GET /v1/agent-inbox
Query parameters
business_id
outlet_id
group_by=priority
status=pending
limit=20
Response
JSON
{
  "business_id": "biz_123",
  "groups": [
    {
      "group_key": "needs_approval_now",
      "title": "Needs approval now",
      "cards": [
        {
          "card_id": "card_1",
          "proposal_id": "prop_1",
          "card_type": "price_update",
          "priority": "high",
          "title": "Price Update",
          "summary": "Paneer Tikka ₹179 → ₹199",
          "primary_action": "approve"
        }
      ]
    },
    {
      "group_key": "needs_review",
      "title": "Needs review",
      "cards": []
    }
  ]
}

The backend should prioritize cards by:

risk
urgency
customer impact
revenue impact
time sensitivity
approval requirement
business hours

Smoothness rule:

Agent Inbox should be backend-prioritized. The frontend should not simply sort by creation time.

12. Proposal API

A proposal is the core write object.

http
GET /v1/proposals/{proposal_id}
Response
JSON
{
  "proposal_id": "prop_123",
  "operation_id": "op_123",
  "proposal_type": "price_update",
  "status": "pending_approval",
  "risk_level": "high",
  "confidence_label": "high",
  "interpretation_summary": "Change Paneer Tikka price from ₹179 to ₹199",
  "source": {
    "source_type": "owner_command",
    "raw_input": "Paneer tikka 199"
  },
  "scope": {
    "outlets": ["outlet_1"],
    "surfaces": ["qr_menu", "public_menu", "whatsapp_menu", "print_pdf"],
    "time": {
      "mode": "immediate"
    }
  },
  "changes": [
    {
      "change_id": "chg_1",
      "change_type": "set_price",
      "entity_type": "item",
      "entity_id": "item_paneer_tikka",
      "field": "price.amount",
      "old_value": 179,
      "new_value": 199
    }
  ],
  "customer_preview": {
    "before": "Paneer Tikka ₹179",
    "after": "Paneer Tikka ₹199"
  },
  "approval_policy": {
    "required": true,
    "required_role": "owner",
    "reason": "Price changes require owner approval"
  },
  "rollback": {
    "available_after_approval": true,
    "rollback_group": "op_123"
  }
}

Smoothness rule:

The proposal response should contain everything needed to render the card.

The frontend should not reconstruct risk, scope, or preview from raw menu data.

13. Proposal action API

Every button on a card should call a consistent proposal action endpoint.

http
POST /v1/proposals/{proposal_id}/actions
Request shape
JSON
{
  "action": "approve",
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "idempotency_key": "idem_action_123"
}

Supported actions:

approve
edit
cancel
reject
ignore
change_scope
change_time
select_items
edit_selected
approve_all
review_one_by_one
publish
try_again
create_manual_task
rollback
create_rule
extend
ask_retake
choose_another_item
keep_menulist_value
change_to_external_value
mark_done
archive

Some actions require payload.

14. Approve action
http
POST /v1/proposals/{proposal_id}/actions
Request
JSON
{
  "action": "approve",
  "actor": {
    "actor_id": "user_owner_1",
    "actor_type": "owner",
    "role": "owner"
  },
  "idempotency_key": "idem_approve_123"
}
Response
JSON
{
  "proposal_id": "prop_123",
  "status": "approved",
  "operation_id": "op_123",
  "publish_jobs": [
    {
      "publish_job_id": "pub_qr_1",
      "surface_type": "qr_menu",
      "status": "queued"
    },
    {
      "publish_job_id": "pub_public_1",
      "surface_type": "public_menu",
      "status": "queued"
    }
  ],
  "owner_message": "Publishing update..."
}

Backend steps:

Lock proposal
Run final policy check
Create approval record
Create rollback snapshot if needed
Create new menu snapshot
Create publish jobs
Emit proposal_approved
Emit menu_snapshot_created
Emit publish_job_created

Smoothness rule:

Approve should not just mark a proposal approved. It must trigger the approved operation pipeline.

15. Edit action
http
POST /v1/proposals/{proposal_id}/actions
Request
JSON
{
  "action": "edit",
  "edit_payload": {
    "changes": [
      {
        "change_id": "chg_1",
        "new_value": 209
      }
    ]
  },
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_edit_123"
}
Response
JSON
{
  "proposal_id": "prop_123",
  "status": "pending_approval",
  "revision": 2,
  "interpretation_summary": "Change Paneer Tikka price from ₹179 to ₹209",
  "changes": [
    {
      "change_id": "chg_1",
      "old_value": 179,
      "new_value": 209
    }
  ],
  "customer_preview": {
    "before": "Paneer Tikka ₹179",
    "after": "Paneer Tikka ₹209"
  },
  "approval_policy": {
    "required": true,
    "required_role": "owner"
  }
}

Backend steps:

Create proposal revision
Re-run policy
Re-run impact preview
Update card
Emit proposal_updated
Update memory from correction if relevant

Smoothness rule:

Edit should update the proposal, not restart the flow.

16. Change scope action
Request
JSON
{
  "action": "change_scope",
  "scope": {
    "outlets": ["outlet_1", "outlet_2", "outlet_3"],
    "surfaces": ["qr_menu", "public_menu", "whatsapp_menu", "print_pdf"]
  },
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_scope_123"
}
Response
JSON
{
  "proposal_id": "prop_123",
  "status": "pending_approval",
  "revision": 3,
  "scope": {
    "outlets": ["outlet_1", "outlet_2", "outlet_3"]
  },
  "impact_summary": {
    "affected_outlet_count": 3,
    "affected_item_count": 3,
    "affected_surface_count": 4
  },
  "changes": [
    {
      "entity_id": "item_paneer_tikka_outlet_1",
      "old_value": 179,
      "new_value": 199
    },
    {
      "entity_id": "item_paneer_tikka_outlet_2",
      "old_value": 189,
      "new_value": 199
    },
    {
      "entity_id": "item_paneer_tikka_outlet_3",
      "old_value": 179,
      "new_value": 199
    }
  ]
}

Smoothness rule:

Scope change must regenerate impact. Scope is never a cosmetic edit.

17. Change time action

Used for availability, offers, specials, scheduled changes.

Request
JSON
{
  "action": "change_time",
  "time_payload": {
    "mode": "until_next_opening",
    "resolved_end_at": "2026-06-18T10:00:00+05:30"
  },
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_time_123"
}
Response
JSON
{
  "proposal_id": "prop_123",
  "status": "pending_approval",
  "interpretation_summary": "Mark Cold Coffee unavailable until tomorrow 10 AM",
  "customer_preview": {
    "after": "Cold Coffee\nUnavailable today"
  }
}

Smoothness rule:

Time payload should support restaurant language like closing, next opening, lunch time, weekend.

18. Clarification API

When MenuList is unsure, it creates a clarification object.

http
GET /v1/clarifications/{clarification_id}
Response
JSON
{
  "clarification_id": "clar_123",
  "operation_id": "op_123",
  "question": "Which burger did you mean?",
  "options": [
    {
      "option_id": "opt_veg",
      "label": "Veg Burger",
      "entity_type": "item",
      "entity_id": "item_veg_burger"
    },
    {
      "option_id": "opt_cheese",
      "label": "Cheese Burger",
      "entity_type": "item",
      "entity_id": "item_cheese_burger"
    },
    {
      "option_id": "opt_chicken",
      "label": "Chicken Burger",
      "entity_type": "item",
      "entity_id": "item_chicken_burger"
    },
    {
      "option_id": "opt_all",
      "label": "All burgers",
      "scope": {
        "category_id": "cat_burgers"
      }
    }
  ],
  "memory_prompt": {
    "enabled": true,
    "message": "Remember this for next time?"
  }
}
Answer clarification
http
POST /v1/clarifications/{clarification_id}/answer
JSON
{
  "selected_option_id": "opt_cheese",
  "remember": true,
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_clar_123"
}
Response
JSON
{
  "operation_id": "op_123",
  "status": "proposals_created",
  "cards": [
    {
      "proposal_id": "prop_cheese_burger_price",
      "card_type": "price_update",
      "summary": "Cheese Burger ₹99 → ₹119"
    }
  ]
}

Smoothness rule:

Clarification answers should continue the operation immediately.

Do not force the owner to retype the command.

19. Approval object API
http
GET /v1/approvals/{approval_id}
Approval object
JSON
{
  "approval_id": "appr_123",
  "proposal_id": "prop_123",
  "operation_id": "op_123",
  "approved_by": "user_owner_1",
  "approver_role": "owner",
  "approval_type": "explicit",
  "decision": "approved",
  "approved_at": "2026-06-17T12:06:00+05:30",
  "approval_summary": "Owner approved Paneer Tikka price change ₹179 → ₹199"
}

Approval types:

explicit
batch
rule_based
manager_approved
scheduled_from_prior_approval
rollback_approval
external_publish_approval

Smoothness rule:

Staff actor and owner approver should be stored separately.

Example:

Ravi requested price change.
Owner approved.
20. Menu Graph read API

The frontend needs a customer-preview-first menu read.

http
GET /v1/menus/{menu_id}/customer-preview
Response
JSON
{
  "menu_id": "menu_main_1",
  "snapshot_id": "snap_104",
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "categories": [
    {
      "category_id": "cat_starters",
      "name": "Starters",
      "items": [
        {
          "item_id": "item_paneer_tikka",
          "name": "Paneer Tikka",
          "price_display": "₹199",
          "availability_display": "Available",
          "visibility": "visible",
          "labels": ["Veg", "Spicy"],
          "photo_status": "added",
          "description_status": "added",
          "operational_badges": [
            "Live"
          ]
        }
      ]
    }
  ]
}

This endpoint is for owner preview and customer rendering.

There can also be admin-detail endpoints, but the default read should be customer-oriented.

Smoothness rule:

The menu API should return customer view plus operational overlays.

21. Direct manual edit API

Even manual edit should create a proposal.

Example:

http
POST /v1/menu-edits
Request
JSON
{
  "business_id": "biz_123",
  "outlet_context": {
    "mode": "single_outlet",
    "outlet_ids": ["outlet_1"]
  },
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "edit": {
    "entity_type": "item",
    "entity_id": "item_paneer_tikka",
    "field": "price.amount",
    "new_value": 199
  },
  "idempotency_key": "idem_manual_edit_123"
}
Response
JSON
{
  "operation_id": "op_manual_123",
  "proposal_id": "prop_manual_price_123",
  "status": "pending_approval",
  "card": {
    "card_type": "price_update",
    "summary": "Paneer Tikka ₹179 → ₹199"
  }
}

For low-risk manual edits, owner can approve faster. But the proposal path still exists.

Smoothness rule:

Manual editing and AI commands should share the same safety pipeline.

22. Publish Job API

Publishing happens after approval.

http
GET /v1/publish-jobs/{publish_job_id}
Response
JSON
{
  "publish_job_id": "pub_123",
  "operation_id": "op_123",
  "proposal_id": "prop_123",
  "menu_snapshot_id": "snap_104",
  "surface": {
    "surface_id": "surface_qr_menu",
    "surface_type": "qr_menu",
    "display_name": "QR Menu"
  },
  "status": "published",
  "started_at": "2026-06-17T12:06:04+05:30",
  "completed_at": "2026-06-17T12:06:06+05:30",
  "failure_reason": null
}

Publish statuses:

queued
publishing
published
submitted
waiting_external
manual_action_required
failed
verified

Smoothness rule:

Publishing state should be surface-specific.

One surface can succeed while another fails.

23. Publishing status API
http
GET /v1/publishing/status
Query
business_id=biz_123
outlet_id=outlet_1
Response
JSON
{
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "menu_truth_snapshot_id": "snap_104",
  "surfaces": [
    {
      "surface_type": "qr_menu",
      "display_name": "QR Menu",
      "status": "updated",
      "last_published_snapshot_id": "snap_104",
      "last_verified_at": "2026-06-17T12:06:07+05:30",
      "owner_message": "QR menu updated"
    },
    {
      "surface_type": "print_pdf",
      "display_name": "Printable PDF",
      "status": "outdated",
      "last_published_snapshot_id": "snap_101",
      "owner_message": "Printable PDF outdated after 7 price changes"
    },
    {
      "surface_type": "delivery_export",
      "display_name": "Delivery Apps",
      "status": "export_ready",
      "owner_message": "Delivery export ready"
    }
  ]
}

Smoothness rule:

Publish Center must show approved truth versus published output.

Example:

MenuList truth: snap_104
Print PDF: snap_101

That means print is outdated.

24. Verification API
http
GET /v1/verifications/{verification_id}
Response
JSON
{
  "verification_id": "verify_123",
  "publish_job_id": "pub_123",
  "surface_id": "surface_qr_menu",
  "check_type": "live_menu_readback",
  "expected": {
    "entity_id": "item_paneer_tikka",
    "field": "price_display",
    "value": "₹199"
  },
  "observed": {
    "value": "₹199"
  },
  "status": "verified",
  "checked_at": "2026-06-17T12:06:07+05:30"
}

Verification statuses:

verified
mismatch
pending
not_supported
failed
manual_check_required

Smoothness rule:

Verification should create owner language.

Example:

Verified live
Possible mismatch
Manual check needed
25. Receipt API

Every completed operation creates a receipt.

http
GET /v1/receipts/{receipt_id}
Response
JSON
{
  "receipt_id": "receipt_123",
  "operation_id": "op_123",
  "business_id": "biz_123",
  "title": "Done",
  "summary": "Paneer Tikka is now ₹199.",
  "surfaces_updated": [
    "QR menu",
    "Public menu",
    "WhatsApp menu"
  ],
  "surfaces_regenerated": [
    "Printable PDF"
  ],
  "surfaces_waiting": [
    "Google"
  ],
  "manual_tasks": [
    {
      "manual_task_id": "task_delivery_123",
      "title": "Delivery export ready"
    }
  ],
  "rollback": {
    "available": true,
    "rollback_operation_id": null
  },
  "next_action": {
    "type": "download_pdf",
    "label": "Download print PDF"
  },
  "created_at": "2026-06-17T12:06:10+05:30"
}

Smoothness rule:

Receipt should be sticky and retrievable.

It should appear in:

Home recent activity
Publish Center
Ledger
Item history
26. Ledger API
http
GET /v1/ledger
Query
business_id=biz_123
outlet_id=outlet_1
entity_id=item_paneer_tikka optional
entry_type=price_update optional
Response
JSON
{
  "entries": [
    {
      "ledger_entry_id": "ledger_123",
      "operation_id": "op_123",
      "entry_type": "price_update",
      "plain_language_summary": "Paneer Tikka changed from ₹179 to ₹199.",
      "actor_summary": "Approved by Owner",
      "publishing_summary": "Published to QR menu and public menu.",
      "verification_summary": "Verified live.",
      "rollback_status": "available",
      "created_at": "2026-06-17T12:06:10+05:30"
    }
  ]
}

Smoothness rule:

Ledger should be written for owners, not engineers.

27. Rollback API

Rollback should be an operation.

http
POST /v1/operations/{operation_id}/rollback
Request
JSON
{
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_rollback_123"
}
Response
JSON
{
  "rollback_operation_id": "op_rollback_123",
  "proposal_id": "prop_rollback_123",
  "status": "pending_approval",
  "card": {
    "card_type": "rollback_operation",
    "title": "Rollback Price Update?",
    "summary": "Restore Paneer Tikka ₹199 → ₹179",
    "requires_approval": true
  }
}

Rollback proposal:

JSON
{
  "proposal_type": "rollback_operation",
  "changes": [
    {
      "entity_type": "item",
      "entity_id": "item_paneer_tikka",
      "field": "price.amount",
      "old_value": 199,
      "new_value": 179
    }
  ],
  "customer_preview": {
    "before": "Paneer Tikka ₹199",
    "after": "Paneer Tikka ₹179"
  }
}

Smoothness rule:

Rollback should restore state but never erase history.

28. Manual Task API

Manual tasks are created when MenuList cannot directly finish a job.

http
GET /v1/manual-tasks
Response
JSON
{
  "tasks": [
    {
      "manual_task_id": "task_delivery_123",
      "business_id": "biz_123",
      "operation_id": "op_123",
      "task_type": "delivery_app_update",
      "title": "Update delivery app menu",
      "status": "open",
      "prepared_assets": [
        {
          "asset_id": "asset_price_summary",
          "asset_type": "pdf",
          "label": "Price change summary"
        },
        {
          "asset_id": "asset_delivery_csv",
          "asset_type": "csv",
          "label": "Delivery menu export"
        }
      ],
      "instructions": "Upload this updated price list to your delivery app menu.",
      "assigned_to": "owner"
    }
  ]
}
Mark done
http
POST /v1/manual-tasks/{manual_task_id}/mark-done
JSON
{
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "verification_asset_id": "asset_uploaded_screenshot_optional",
  "idempotency_key": "idem_task_done_123"
}

Smoothness rule:

Manual tasks should include prepared assets and optional verification.

29. Staff task link API

Staff should not need full dashboard access.

http
POST /v1/staff-task-links
Request
JSON
{
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "task_type": "photo_upload",
  "created_by": "user_owner_1",
  "scope": {
    "item_ids": [
      "item_chicken_biryani",
      "item_paneer_tikka",
      "item_cold_coffee"
    ]
  },
  "expires_at": "2026-06-24T23:59:00+05:30"
}
Response
JSON
{
  "task_link_id": "tasklink_123",
  "task_url_token": "secure_token_abc",
  "owner_message": "Photo upload link created."
}

Staff upload:

http
POST /v1/staff-task-links/{token}/submissions
JSON
{
  "submission_type": "photo_upload",
  "item_id": "item_paneer_tikka",
  "asset_id": "photo_asset_123",
  "submitted_by_name": "Ravi"
}

Response:

JSON
{
  "submission_id": "sub_123",
  "status": "received",
  "owner_message": "Photo submitted for approval."
}

Smoothness rule:

Staff links should create proposals or approval cards, not publish risky changes directly.

30. Staff permissions API
http
GET /v1/staff
Response
JSON
{
  "staff": [
    {
      "staff_user_id": "staff_ravi",
      "name": "Ravi",
      "role": "Manager",
      "outlet_scope": ["outlet_1"],
      "permissions": [
        "mark_unavailable",
        "restore_item",
        "upload_photo",
        "create_offer_draft"
      ],
      "restrictions": [
        "cannot_change_price",
        "cannot_publish_external"
      ]
    }
  ]
}

Permission check should happen inside the Policy Agent.

Smoothness rule:

Permissions should be action-based, not dashboard-based.

31. Rule API

Rules are owner-approved automation.

http
GET /v1/rules
Response
JSON
{
  "rules": [
    {
      "rule_id": "rule_123",
      "name": "Today’s Specials expire at closing",
      "plain_language": "Today’s Specials expire at closing.",
      "status": "active",
      "scope": {
        "outlets": ["outlet_1"]
      },
      "approved_by": "user_owner_1",
      "last_run_at": "2026-06-16T23:00:00+05:30"
    }
  ]
}
Create rule from suggestion
http
POST /v1/rules
JSON
{
  "suggestion_id": "rulesug_123",
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "confirm": true,
  "idempotency_key": "idem_rule_123"
}

Smoothness rule:

Rule creation must require explicit owner approval.

No hidden autonomy.

32. Memory API

Memory should be controlled and explainable.

http
GET /v1/memory
Response
JSON
{
  "memories": [
    {
      "memory_id": "mem_123",
      "memory_type": "alias",
      "plain_language": "PBM means Paneer Butter Masala.",
      "status": "active",
      "source": "owner_confirmation"
    },
    {
      "memory_id": "mem_456",
      "memory_type": "visibility_preference",
      "plain_language": "Sold-out items are shown as unavailable.",
      "status": "active",
      "source": "owner_preference"
    }
  ]
}
Save memory
http
POST /v1/memory
JSON
{
  "business_id": "biz_123",
  "memory_type": "alias",
  "key": "PBM",
  "value": {
    "entity_type": "item",
    "entity_id": "item_paneer_butter_masala"
  },
  "source": "owner_confirmation",
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  }
}

Smoothness rule:

Important memory should be owner-confirmed.

Especially:

aliases
visibility preferences
automation preferences
description style
33. Menu Health API
http
GET /v1/menu-health
Query
business_id=biz_123
outlet_id=outlet_1
Response
JSON
{
  "score": 74,
  "status": "needs_attention",
  "top_issues": [
    {
      "health_issue_id": "health_1",
      "issue_type": "high_view_item_missing_photo",
      "severity": "high",
      "entity_type": "item",
      "entity_id": "item_chicken_biryani",
      "owner_message": "Chicken Biryani has high views but no photo.",
      "recommended_action": {
        "action_type": "request_photo",
        "label": "Send staff photo task"
      }
    },
    {
      "health_issue_id": "health_2",
      "issue_type": "expired_offer",
      "severity": "high",
      "owner_message": "Weekend Combo expired yesterday.",
      "recommended_action": {
        "action_type": "remove_or_extend_offer",
        "label": "Review offer"
      }
    }
  ]
}

Smoothness rule:

Menu Health API should return action-ready issues, not only score components.

34. Insight API
http
GET /v1/insights/actions
Response
JSON
{
  "insight_actions": [
    {
      "insight_action_id": "insight_123",
      "insight_type": "missing_searched_item",
      "summary": "Customers searched “momos” 18 times this week.",
      "recommended_action": "add_item",
      "card": {
        "card_type": "insight_action",
        "title": "Customer Insight",
        "summary": "Customers searched “momos” 18 times. Momos are not on your menu.",
        "actions": ["add_momos", "ignore", "remind_later"]
      }
    }
  ]
}

Smoothness rule:

Insight API should create decisions, not dashboards.

35. Customer Signal API

Customer menu should emit signals.

http
POST /v1/customer-signals
Request
JSON
{
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "session_id": "sess_123",
  "signal_type": "search_query",
  "value": {
    "query": "momos"
  },
  "occurred_at": "2026-06-17T15:22:00+05:30"
}

Signal types:

menu_view
qr_scan
item_view
category_view
search_query
whatsapp_click
offer_view
unavailable_item_view
photo_click

Smoothness rule:

Customer signals should be aggregated before becoming owner cards.

Do not notify for every single search.

36. Drift API

Drift detection compares MenuList truth to external/menu outputs.

http
POST /v1/drift-checks
Request
JSON
{
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "source": {
    "source_type": "uploaded_delivery_screenshot",
    "asset_id": "asset_screenshot_123"
  },
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  }
}
Response
JSON
{
  "drift_check_id": "driftcheck_123",
  "status": "processing"
}

When complete:

JSON
{
  "drift_id": "drift_123",
  "entity_type": "item",
  "entity_id": "item_veg_burger",
  "field": "price",
  "menulist_value": 99,
  "external_value": 89,
  "external_source": "uploaded_delivery_screenshot",
  "status": "needs_owner_decision",
  "card": {
    "card_type": "drift_resolution",
    "title": "Possible Mismatch",
    "summary": "Veg Burger: MenuList ₹99, uploaded delivery menu ₹89"
  }
}

Smoothness rule:

Drift creates a decision card. It never overwrites MenuList automatically.

37. Surface adapter contract

Each publishing surface should implement a common adapter contract.

JSON
{
  "surface_type": "qr_menu",
  "supports_direct_publish": true,
  "supports_verification": true,
  "publish_mode": "direct",
  "output_format": "web_menu",
  "fallback_mode": null
}

Adapter functions:

render(menu_snapshot, surface_context)
publish(rendered_output)
verify(expected_state)
create_manual_task_if_needed()

Examples:

QR menu
JSON
{
  "surface_type": "qr_menu",
  "supports_direct_publish": true,
  "supports_verification": true,
  "publish_mode": "direct",
  "fallback_mode": null
}
WhatsApp menu
JSON
{
  "surface_type": "whatsapp_menu",
  "supports_direct_publish": false,
  "supports_verification": false,
  "publish_mode": "generated_output",
  "fallback_mode": "copyable_text"
}
Delivery export
JSON
{
  "surface_type": "delivery_export",
  "supports_direct_publish": false,
  "supports_verification": "manual_or_screenshot",
  "publish_mode": "export",
  "fallback_mode": "manual_task"
}

Smoothness rule:

One master menu should generate surface-specific outputs.

The owner should not format menus separately.

38. Agent contract

Agents should communicate through structured objects, not free-form text.

Universal agent rule:

Agents can read, understand, draft, propose, and verify.
Agents cannot directly mutate the live menu.
Agents cannot bypass policy.
Agents cannot publish risky changes without approval or owner-approved rule.
39. Intake Agent contract
Input
JSON
{
  "event_id": "evt_123",
  "input": {
    "input_type": "text",
    "raw_text": "chai 20 kar do"
  },
  "business_context": {
    "business_id": "biz_123",
    "outlet_ids": ["outlet_1"],
    "locale": "hi-IN"
  }
}
Output
JSON
{
  "operation_id": "op_123",
  "normalized_input": "chai 20 kar do",
  "candidate_intents": [
    {
      "intent": "price_update",
      "confidence_label": "high"
    }
  ],
  "requires_resolver": true
}
40. Resolver Agent contract
Input
JSON
{
  "operation_id": "op_123",
  "intent": "price_update",
  "raw_input": "chai 20 kar do",
  "menu_context": {
    "menu_id": "menu_main_1",
    "outlet_ids": ["outlet_1"]
  },
  "memory_context": {
    "aliases": [
      {
        "key": "chai",
        "entity_id": "item_masala_tea"
      }
    ]
  }
}
Output
JSON
{
  "resolution_status": "resolved",
  "resolved_entities": [
    {
      "entity_type": "item",
      "entity_id": "item_masala_tea",
      "display_name": "Masala Tea",
      "confidence_label": "high"
    }
  ],
  "extracted_values": {
    "price": 20
  },
  "clarification_required": false
}

If ambiguous:

JSON
{
  "resolution_status": "needs_clarification",
  "clarification": {
    "question": "Which tea did you mean?",
    "options": [
      {
        "label": "Masala Tea",
        "entity_id": "item_masala_tea"
      },
      {
        "label": "All tea items",
        "scope": "category_tea"
      }
    ]
  }
}

Smoothness rule:

Resolver must prefer clarification over risky guessing.

41. Proposal Agent contract
Input
JSON
{
  "operation_id": "op_123",
  "intent": "price_update",
  "resolved_entities": [
    {
      "entity_type": "item",
      "entity_id": "item_masala_tea"
    }
  ],
  "extracted_values": {
    "price": 20
  },
  "current_menu_state": {
    "item_masala_tea": {
      "price": 15
    }
  }
}
Output
JSON
{
  "proposal_type": "price_update",
  "interpretation_summary": "Change Masala Tea price from ₹15 to ₹20",
  "changes": [
    {
      "change_type": "set_price",
      "entity_type": "item",
      "entity_id": "item_masala_tea",
      "old_value": 15,
      "new_value": 20
    }
  ],
  "customer_preview": {
    "before": "Masala Tea ₹15",
    "after": "Masala Tea ₹20"
  }
}

Smoothness rule:

Proposal Agent prepares work. It does not execute work.

42. Policy Agent contract
Input
JSON
{
  "proposal_id": "prop_123",
  "proposal_type": "price_update",
  "actor": {
    "actor_id": "staff_ravi",
    "role": "manager"
  },
  "risk_level": "high",
  "changes": [
    {
      "change_type": "set_price"
    }
  ],
  "business_rules": []
}
Output
JSON
{
  "allowed": false,
  "approval_required": true,
  "required_role": "owner",
  "reason": "Price changes require owner approval",
  "can_create_request": true
}

For owner:

JSON
{
  "allowed": true,
  "approval_required": true,
  "required_role": "owner",
  "reason": "Price changes need explicit approval"
}

For rule-based expiry:

JSON
{
  "allowed": true,
  "approval_required": false,
  "execution_basis": "owner_approved_rule",
  "rule_id": "rule_special_expiry"
}

Smoothness rule:

Policy Agent is the safety gate. No agent can bypass it.

43. Publishing Agent contract
Input
JSON
{
  "operation_id": "op_123",
  "approved_proposal_ids": ["prop_123"],
  "menu_snapshot_id": "snap_104",
  "surfaces": [
    "qr_menu",
    "public_menu",
    "whatsapp_menu",
    "print_pdf"
  ]
}
Output
JSON
{
  "publish_jobs": [
    {
      "publish_job_id": "pub_qr_1",
      "surface_type": "qr_menu",
      "status": "queued"
    },
    {
      "publish_job_id": "pub_print_1",
      "surface_type": "print_pdf",
      "status": "queued"
    }
  ]
}

Smoothness rule:

Publishing Agent acts only on approved menu snapshots.

44. Verification Agent contract
Input
JSON
{
  "publish_job_id": "pub_qr_1",
  "surface_type": "qr_menu",
  "expected_state": {
    "entity_id": "item_paneer_tikka",
    "field": "price_display",
    "value": "₹199"
  }
}
Output
JSON
{
  "verification_status": "verified",
  "observed_state": {
    "value": "₹199"
  },
  "owner_message": "QR menu verified live."
}

If mismatch:

JSON
{
  "verification_status": "mismatch",
  "observed_state": {
    "value": "₹179"
  },
  "owner_message": "QR menu still shows old price."
}

Smoothness rule:

Verification failure should create an owner-actionable publishing issue card.

45. Memory Agent contract
Input
JSON
{
  "event_type": "clarification_answered",
  "business_id": "biz_123",
  "raw_input": "PBM 269",
  "selected_entity": {
    "entity_type": "item",
    "entity_id": "item_paneer_butter_masala"
  },
  "owner_selected_remember": true
}
Output
JSON
{
  "memory_entries": [
    {
      "memory_type": "alias",
      "key": "PBM",
      "value": {
        "entity_type": "item",
        "entity_id": "item_paneer_butter_masala"
      },
      "source": "owner_confirmation"
    }
  ]
}

Smoothness rule:

Memory should improve future proposals but not silently override risky uncertainty too soon.

46. Rule Agent contract
Input
JSON
{
  "business_id": "biz_123",
  "observed_pattern": {
    "pattern_type": "repeated_approval",
    "action": "restore_sold_out_beverages_next_opening",
    "count": 5
  }
}
Output
JSON
{
  "rule_suggestion": {
    "suggestion_id": "rulesug_123",
    "plain_language": "You usually restore sold-out beverages the next morning.",
    "proposed_rule": {
      "trigger": "item_marked_unavailable",
      "conditions": {
        "category": "beverages"
      },
      "action": "restore_at_next_opening"
    },
    "requires_owner_approval": true
  }
}

Smoothness rule:

Rules should emerge from repeated approvals, not from hidden AI assumptions.

47. Idempotency contract

Every write/action endpoint should require an idempotency key.

Why:

Owners may tap twice.

Mobile networks may retry.

Publishing may be slow.

The system must not duplicate changes.

Example:

JSON
{
  "idempotency_key": "idem_approve_prop_123_001"
}

If same key is received again, return same result:

JSON
{
  "status": "already_processed",
  "original_response": {
    "operation_id": "op_123",
    "status": "publishing"
  }
}

Smoothness rule:

Double taps should not create duplicate menu changes.

48. Concurrency contract

MenuList must protect against conflicting edits.

Every proposal should be based on a known menu snapshot.

Proposal field:

JSON
{
  "base_menu_snapshot_id": "snap_103"
}

Before approval, backend checks:

Is current menu still snap_103?
Did another approved operation change the same item/field?

If conflict:

JSON
{
  "status": "conflict_detected",
  "owner_message": "Paneer Tikka price changed after this proposal was created.",
  "current_value": 199,
  "proposed_value": 209,
  "actions": ["update_proposal", "cancel"]
}

Owner card:

Conflict found.

Paneer Tikka is now ₹199.
This proposal wants ₹209.

Use ₹209?

[Use ₹209] [Cancel]

Smoothness rule:

Conflicts should be explicit, not silently overwritten.

49. Menu snapshot contract

Every approved menu-changing operation creates a new menu snapshot.

Snapshot object:

JSON
{
  "menu_snapshot_id": "snap_104",
  "menu_id": "menu_main_1",
  "business_id": "biz_123",
  "created_by_operation_id": "op_123",
  "previous_snapshot_id": "snap_103",
  "summary": "Paneer Tikka price changed ₹179 → ₹199",
  "created_at": "2026-06-17T12:06:00+05:30"
}

Smoothness rule:

Snapshots are required for rollback, publishing, verification, drift, and print freshness.

50. Surface snapshot contract

Each surface should record what menu snapshot it last rendered.

JSON
{
  "surface_snapshot_id": "surf_snap_123",
  "surface_id": "surface_print_pdf",
  "surface_type": "print_pdf",
  "menu_snapshot_id": "snap_101",
  "rendered_at": "2026-06-10T10:00:00+05:30",
  "content_hash": "hash_abc",
  "status": "active"
}

If menu truth is now snap_104, then:

print_pdf is outdated

Smoothness rule:

Surface snapshots allow MenuList to tell owners when print or external outputs are stale.

51. Notification contract

Notifications should be generated from cards/events, not random triggers.

Notification object:

JSON
{
  "notification_id": "notif_123",
  "business_id": "biz_123",
  "recipient_user_id": "user_owner_1",
  "priority": "high",
  "title": "Price change needs approval",
  "body": "Ravi requested Chicken Biryani ₹229 → ₹249.",
  "deep_link": {
    "target_type": "proposal",
    "target_id": "prop_staff_price_123"
  },
  "created_at": "2026-06-17T12:08:00+05:30"
}

Smoothness rule:

Every notification should deep-link to a decision card.

52. Webhook contract

MenuList can expose webhooks later for agencies, POS, external tools, or integrations. The contract should exist from the start.

Webhook events:

proposal.created
proposal.approved
menu.snapshot_created
publish.completed
publish.failed
manual_task.created
rule.executed

Webhook payload should reuse the event envelope.

JSON
{
  "event_id": "evt_123",
  "event_type": "proposal.approved",
  "business_id": "biz_123",
  "operation_id": "op_123",
  "proposal_id": "prop_123",
  "occurred_at": "2026-06-17T12:06:00+05:30",
  "payload": {
    "proposal_type": "price_update",
    "summary": "Paneer Tikka ₹179 → ₹199"
  }
}

Smoothness rule:

External systems should consume events, not bypass the proposal pipeline.

53. Error contract

Errors should be owner-safe and developer-useful.

API error response
JSON
{
  "error": {
    "code": "PUBLISH_SURFACE_FAILED",
    "owner_message": "Printable PDF could not regenerate.",
    "developer_message": "PDF renderer timed out.",
    "recoverable": true,
    "recommended_action": "try_again",
    "correlation_id": "corr_123"
  }
}

Owner sees:

Printable PDF could not regenerate.

[Try again]

Developer logs contain:

PDF renderer timed out
correlation_id
surface_id
operation_id

Smoothness rule:

Owner-facing errors should be calm and actionable. Developer details should not leak into the UI.

54. Retry contract

Retry should never reapply the menu change.

Example:

Price updated.
Print PDF failed.

Retry should call:

http
POST /v1/publish-jobs/{publish_job_id}/retry

Not:

approve proposal again
Request
JSON
{
  "actor": {
    "actor_id": "user_owner_1",
    "role": "owner"
  },
  "idempotency_key": "idem_retry_123"
}

Smoothness rule:

Retry failed publishing, not the approved business operation.

55. Security contract

MenuList must protect:

prices
staff permissions
publishing rights
external surfaces
owner approvals
manual task links
customer data

Minimum requirements:

Actor authentication
Business tenant isolation
Outlet-level access checks
Role-based permission checks
Signed staff task links
Short-lived upload tokens
Audit ledger for high-risk actions
Idempotency on writes
No direct AI write path

Staff task links should be scoped.

Example:

JSON
{
  "task_type": "photo_upload",
  "allowed_item_ids": ["item_1", "item_2"],
  "expires_at": "2026-06-24T23:59:00+05:30",
  "cannot_change_price": true
}

Smoothness rule:

Staff should be empowered but boxed into safe actions.

56. Example full flow: price update

Owner command:

Paneer tikka 199
Step 1: Command
http
POST /v1/commands

Response:

JSON
{
  "operation_id": "op_1",
  "cards": [
    {
      "proposal_id": "prop_1",
      "card_type": "price_update",
      "summary": "Paneer Tikka ₹179 → ₹199"
    }
  ]
}
Step 2: Approve
http
POST /v1/proposals/prop_1/actions
JSON
{
  "action": "approve",
  "idempotency_key": "idem_approve_1"
}
Step 3: Publish jobs created
JSON
{
  "publish_jobs": [
    {
      "surface_type": "qr_menu",
      "status": "queued"
    },
    {
      "surface_type": "public_menu",
      "status": "queued"
    },
    {
      "surface_type": "print_pdf",
      "status": "queued"
    }
  ]
}
Step 4: Receipt
JSON
{
  "summary": "Paneer Tikka is now ₹199.",
  "surfaces_updated": ["QR menu", "Public menu", "WhatsApp menu"],
  "surfaces_regenerated": ["Printable PDF"],
  "rollback": {
    "available": true
  }
}

Owner sees:

Done.
Paneer Tikka is now ₹199.
QR menu and public menu updated.
Printable PDF regenerated.
Rollback available.
57. Example full flow: sold out

Owner command:

Cold coffee over

Command API returns:

JSON
{
  "proposal_id": "prop_2",
  "card_type": "availability_update",
  "summary": "Cold Coffee unavailable until tomorrow 10 AM"
}

Proposal:

JSON
{
  "proposal_type": "availability_update",
  "risk_level": "medium",
  "changes": [
    {
      "change_type": "set_availability",
      "entity_id": "item_cold_coffee",
      "old_value": "available",
      "new_value": {
        "status": "temporary_unavailable",
        "end_at": "2026-06-18T10:00:00+05:30",
        "restore_behavior": "restore_at_next_opening"
      }
    }
  ],
  "customer_preview": {
    "after": "Cold Coffee\nUnavailable today"
  }
}

After approval:

Availability changed
Restore reminder scheduled
Publish jobs created
Receipt created

Owner sees:

Done.
Cold Coffee is unavailable until tomorrow 10 AM.
Restore reminder set.
58. Example full flow: today’s special

Owner command:

Add mango lassi 99 today special

Proposal:

JSON
{
  "proposal_type": "offer_create",
  "risk_level": "medium",
  "interpretation_summary": "Create Mango Lassi ₹99 as Today’s Special",
  "changes": [
    {
      "change_type": "create_item",
      "entity_type": "item",
      "new_value": {
        "name": "Mango Lassi",
        "category": "Today’s Special",
        "price": 99
      }
    },
    {
      "change_type": "set_availability",
      "new_value": {
        "mode": "today_only",
        "expires_at": "closing_time"
      }
    },
    {
      "change_type": "set_placement",
      "new_value": "top_of_menu"
    }
  ],
  "derived_outputs": [
    {
      "surface_type": "whatsapp_menu",
      "status": "ready"
    },
    {
      "surface_type": "instagram_caption",
      "status": "ready"
    }
  ],
  "customer_preview": {
    "after": "Today’s Special\nMango Lassi ₹99\nAvailable today only"
  }
}

Receipt:

Done.
Mango Lassi is live under Today’s Special.
It expires tonight at closing.
WhatsApp text is ready.
59. Example full flow: drift

External screenshot shows different price.

Drift object:

JSON
{
  "drift_id": "drift_1",
  "entity_type": "item",
  "entity_id": "item_veg_burger",
  "field": "price",
  "menulist_value": 99,
  "external_value": 89,
  "external_source": "uploaded_delivery_screenshot",
  "status": "needs_owner_decision"
}

Owner card:

Possible mismatch.
MenuList: Veg Burger ₹99
Uploaded delivery menu: Veg Burger ₹89
Which is correct?

If owner chooses keep MenuList:

JSON
{
  "action": "keep_menulist_value"
}

System:

MenuList remains source of truth
External task created
Ledger updated

If owner chooses external value:

Create price update proposal
Veg Burger ₹99 → ₹89
Requires approval

Smoothness rule:

Drift decision and price approval are separate when changing MenuList truth.

60. Database behavior contract

Even if implementation uses Firestore, Postgres, or another store, the behavioral contract should remain.

Important persistence rules:

Operations are append-friendly.
Proposals are immutable after approval.
Edits create proposal revisions.
Menu snapshots are immutable.
Ledger entries are append-only.
Rollback creates a new operation.
Publishing jobs are stateful.
Verification results are append-only.
Memory can be updated but should preserve source.
Rules can be paused but past executions remain in ledger.

Smoothness rule:

Do not mutate history to make the current state look clean.

Owners need truth, not hidden cleanup.

61. Proposal revision contract

Proposal edits should create revisions.

JSON
{
  "proposal_id": "prop_123",
  "current_revision": 2,
  "revisions": [
    {
      "revision": 1,
      "summary": "Paneer Tikka ₹179 → ₹199",
      "created_by": "ai"
    },
    {
      "revision": 2,
      "summary": "Paneer Tikka ₹179 → ₹209",
      "created_by": "owner"
    }
  ]
}

Owner does not need to see all revisions normally.

But system should remember:

AI suggested ₹199
Owner changed to ₹209

Smoothness rule:

Owner edits should become memory signals.

62. Card render contract

The backend should return card-ready UI data.

Example:

JSON
{
  "card_id": "card_123",
  "proposal_id": "prop_123",
  "card_type": "price_update",
  "priority": "high",
  "title": "Price Update",
  "sections": [
    {
      "type": "source",
      "label": "You said",
      "value": "Paneer tikka 199"
    },
    {
      "type": "change",
      "label": "Change",
      "value": "₹179 → ₹199"
    },
    {
      "type": "scope",
      "label": "Scope",
      "value": "Indiranagar outlet only"
    },
    {
      "type": "customer_preview",
      "label": "Customer preview",
      "value": "Paneer Tikka ₹199"
    }
  ],
  "actions": [
    {
      "action": "approve",
      "label": "Approve",
      "style": "primary"
    },
    {
      "action": "edit",
      "label": "Edit",
      "style": "secondary"
    },
    {
      "action": "cancel",
      "label": "Cancel",
      "style": "secondary"
    }
  ]
}

Smoothness rule:

The frontend should render owner language. The backend should supply the meaning.

63. Home API

Home should be decision-first.

http
GET /v1/home
Response
JSON
{
  "business_id": "biz_123",
  "outlet_id": "outlet_1",
  "live_status": {
    "status": "live",
    "message": "Your menu is live.",
    "last_updated_at": "2026-06-17T12:06:00+05:30",
    "sync_summary": "QR menu and public menu are synced."
  },
  "attention_cards": [
    {
      "card_id": "card_1",
      "priority": "high",
      "title": "Staff requested a price change",
      "summary": "Chicken Biryani ₹229 → ₹249"
    },
    {
      "card_id": "card_2",
      "priority": "medium",
      "title": "Restore items",
      "summary": "Cold Coffee was unavailable yesterday."
    }
  ],
  "today_state": {
    "unavailable_items": 2,
    "active_offers": 1,
    "scheduled_offers": 1
  },
  "menu_health": {
    "score": 74,
    "top_issue": "Chicken Biryani has high views but no photo."
  },
  "recent_activity": [
    {
      "summary": "Paneer Tikka changed from ₹179 to ₹199.",
      "created_at": "2026-06-17T12:06:10+05:30"
    }
  ]
}

Smoothness rule:

Home API should return decisions and state, not raw analytics.

64. State change rules

The API must enforce these state transitions.

Proposal
created
→ needs_clarification
→ pending_approval
→ approved
→ executing
→ published
→ verified
→ completed

Allowed alternate paths:

pending_approval → rejected
pending_approval → cancelled
pending_approval → edited
published → failed
completed → rolled_back
Publish job
queued
→ publishing
→ published
→ verification_pending
→ verified

Failure paths:

publishing → failed
publishing → manual_action_required
verification_pending → mismatch
Manual task
open
→ in_progress
→ done

Alternate:

open → dismissed
open → expired

Smoothness rule:

State transitions should be strict. UI behavior depends on reliable states.

65. Background worker contract

MenuList needs workers for:

Import processing
Agent reasoning
Publishing
Verification
Scheduled expiry
Restore reminders
Health scans
Insight generation
Drift checks
Rule execution
Notification generation

But workers must not bypass policy.

Example worker flow for scheduled expiry:

Rule trigger reached
↓
Policy check confirms prior approval
↓
Expiry operation created
↓
Menu snapshot created
↓
Publish jobs run
↓
Receipt and ledger created

Smoothness rule:

Background automation should still create ledger entries and receipts.

Owner should see:

Today’s Special expired at closing as approved.
66. Outbox contract

When a menu state changes, event emission must be reliable.

Technical pattern:

Write menu snapshot + outbox event in same transaction
Worker publishes outbox event
Downstream publishing jobs consume event

Why this matters:

If MenuList changes price but fails to create publish jobs, owner trust breaks.

Smoothness rule:

Approved menu changes and downstream events should not get out of sync.

67. Idempotent publishing contract

Publishing jobs should be idempotent.

Same publish job retried should not create duplicate public pages, duplicate PDFs, or duplicate messages.

Publish job identity should include:

menu_snapshot_id
surface_id
operation_id
render_hash

If already published:

JSON
{
  "status": "already_published",
  "surface_snapshot_id": "surf_snap_123"
}

Smoothness rule:

Retry should be safe.

68. Owner-visible audit contract

For every high-risk action, the system must store:

actor
approver
source input
old value
new value
scope
surfaces
approval time
publish result
verification result
rollback availability

High-risk actions:

price change
bulk update
archive item
multi-outlet update
external publish
rollback
rule creation
sensitive labels

Smoothness rule:

High-risk operations require complete audit.

This is not optional.

69. API contract for sensitive claims

Some labels/descriptions are protected.

Protected claims:

vegan
gluten-free
nut-free
sugar-free
organic
healthy
low-calorie
allergen-free
homemade
fresh
no preservatives

If AI suggests one, proposal must be:

JSON
{
  "proposal_type": "label_update",
  "risk_level": "high",
  "approval_policy": {
    "required": true,
    "required_role": "owner",
    "reason": "Sensitive dietary or health claim requires confirmation"
  }
}

If unsupported, block:

JSON
{
  "status": "blocked",
  "owner_message": "I should not add this claim unless you confirm it."
}

Smoothness rule:

AI can make safe descriptions, but cannot invent sensitive claims.

70. The technical laws of MenuList

These are the backend laws.

1. No AI direct write to live menu.
2. Every meaningful change starts as an operation.
3. Every operation creates one or more proposals.
4. Risk decides approval weight.
5. Price changes always require owner approval.
6. Bulk changes always show affected count and grouped rollback.
7. Multi-outlet changes always show outlet scope.
8. Menu snapshots are immutable.
9. Publishing jobs are surface-specific.
10. Verification results are stored.
11. Receipts are created after completion.
12. Ledger is append-only.
13. Rollback is a new operation, not history deletion.
14. Staff permissions are action-based.
15. Rules execute only after owner approval.
16. Memory learns from owner confirmation and corrections.
17. External mismatch never overwrites MenuList silently.
18. Manual tasks include prepared assets.
19. Notifications deep-link to decision cards.
20. Idempotency is required for all writes.
71. The final technical operating flow

The full API/event flow:

POST /commands
↓
owner_command_received event
↓
operation created
↓
intake agent
↓
resolver agent
↓
clarification if needed
↓
proposal agent
↓
policy agent
↓
proposal_created event
↓
GET /agent-inbox returns card
↓
POST /proposals/{id}/actions approve
↓
approval record created
↓
rollback snapshot created
↓
menu snapshot created
↓
publish jobs created
↓
surface adapters publish
↓
verification jobs run
↓
receipt created
↓
ledger entry created
↓
memory/rule/health updates triggered

Owner sees only:

I prepared this update.
Approve?
Publishing...
Done.
Rollback available.

That is the right architecture.

72. What this makes possible for SMB owners

This technical contract directly creates the owner smoothness we want:

Owners can speak naturally.
MenuList can understand messy input.
Risky changes stay protected.
Staff can help safely.
Bulk changes can be undone together.
Specials clean themselves up.
Sold-out items restore properly.
External mismatches become decisions.
Publishing status is visible.
Failures are recoverable.
History is understandable.
MenuList improves with use.

This is the foundation of MenuList as an AI Menu Ops platform.

Not a chatbot.

Not a QR menu tool.

Not an AI menu generator.

A controlled, proposal-driven, approval-safe, publish-aware, verification-backed menu operating system.
```
