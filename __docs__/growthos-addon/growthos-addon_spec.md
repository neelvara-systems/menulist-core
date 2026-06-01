# GrowthOS Add-on - Product Specification

**Status:** Implemented V1 and enabled behind Pro/Premium entitlement gate
**Owner-facing label:** Growth Kits
**Implementation flag:** `ENABLE_GROWTHOS_ADDON=true` with `GROWTHOS_ADDON_ACCESS="paid"`
**Scope:** MenuList Pro/Premium plan feature only

---

## 1. What

GrowthOS Add-on is a paid MenuList module that prepares ready-to-use local growth kits from the store's current MenuList truth.

Each kit is a small finished bundle for one immediate action:

- copy this to WhatsApp
- paste this into Google Business Profile
- use this as an Instagram caption
- say this to walk-in customers
- print this as a table or counter prompt
- reply to this review after owner review

It is not a dashboard. It is not a posting calendar. It is not a creative workspace.

The V1 product loop is intentionally small:

```txt
Find one useful action -> check truth -> create one kit -> owner uses it manually -> record execution signal
```

## 2. Why

SMB owners already know they should post, update, reply, and keep visibility fresh. The blocker is not awareness. The blocker is time, confidence, and accurate source material.

MenuList can solve this better than generic tools because:

- the menu is already structured
- prices and availability are already known
- the public menu link already exists
- item images often already exist
- Today/Social Content already creates action candidates
- AI billing and provider accounting already exist

GrowthOS should convert that foundation into a paid outcome:

> accurate local action, ready now.

## 3. Who

### Primary ICP

Higher-tier MenuList clients:

- owner-operated restaurants and cafes
- small food chains
- cloud kitchens
- bakeries and dessert shops
- premium onboarding or managed-service clients
- businesses already relying on MenuList public links, QR menus, OBP, or screens

### Buyer Motivation

They pay because they want:

- more current local presence
- less manual writing
- fewer mistakes when posting public information
- a simple way to keep WhatsApp, Google, Instagram, and in-store messaging fresh
- confidence that the content matches the live menu

### Not For

GrowthOS is not for:

- free-tier users
- businesses with incomplete menu truth
- agencies
- marketing teams
- creator/design-heavy users
- owners who want analytics dashboards
- users who want direct posting before trust is proven

## 4. Where It Lives

GrowthOS lives inside MenuList.

| Surface | Behavior |
| --- | --- |
| Desktop owner app | Add a paid module entry labelled `Growth Kits` only for eligible stores. |
| Today screen | Show a small eligible-user entry point when a current action exists. Today itself remains focused on operational truth. |
| Mobile owner app | Show latest kit and copy/share actions from the current Today mobile surface and a compact Pro/Premium entry point. |
| Website/pricing | Mention as included in Pro/Premium, not as a separate product. |
| Help center | Explain how to use a kit, not how the system works. |

Implemented route:

```txt
/growth-kits
```

The route remains hidden unless the feature flag and entitlement pass.

No standalone GrowthOS domain, public app, or product route is approved by this spec.

## 5. How It Works

### Source Facts

GrowthOS may read:

- business name
- store hours and current open/closed status
- current public menu link
- current menu items
- item availability
- prices
- menu item images
- bestseller/manual highlight markers
- current Today campaign candidates
- existing public business page facts
- review text manually pasted by the owner

GrowthOS may not invent:

- discounts
- availability
- claims like "best", "most loved", or "number one"
- event participation
- customer reviews
- delivery promises
- timings
- phone numbers
- external profile status

### Kit Generation

The system builds a `GrowthOSSourceFacts` object from current MenuList data, hashes it, then generates a deterministic V1 kit from that immutable source snapshot.

Every generated kit must store:

- source fact hash
- source facts summary
- output destination
- generated copy
- safety status
- expiry date
- owner action status
- AI operation reference when AI is used in a future provider-backed mode

### Output Destinations

Initial allowed destinations:

| Destination | Mode |
| --- | --- |
| WhatsApp status | Copy/share text |
| WhatsApp message | Copy/share text |
| Google Business Profile update | Draft only |
| Instagram caption | Copy text |
| Staff brief | Copy/read/share manually |
| Print poster or QR tent | Download/print from existing physical surface patterns |
| Review reply guard | Draft from pasted review text only, triage-first |

Direct posting remains disabled.

## 6. V1 Core Kit Families

### Today Action Kit

Answers:

> "What should I share today?"

Inputs:

- available item
- current hours/status
- public link
- existing item image when available

Outputs:

- WhatsApp status
- WhatsApp message
- Instagram caption
- Google update draft

### Menu Event Kit

Answers:

> "Something changed in my menu. What can I say?"

Triggers:

- new item
- item back in stock
- best-selling item
- seasonal/festival item
- slow item selected by existing campaign logic

Outputs:

- short announcement
- public link copy
- no AI image generation in V1

### Staff Brief Kit

Answers:

> "What should staff say or avoid today?"

Inputs:

- available item
- unavailable or high-risk item list
- current public menu link
- current hours/status
- owner highlight or candidate action where available

Outputs:

- main staff line
- short internal reason
- avoid list
- public menu fallback
- optional counter/table prompt copy

Rules:

- staff brief must be store-specific
- unavailable items are never suggested
- price is included only when current and allowed
- brief expires end of business day or when critical facts change
- no staff task management, attendance, shifts, commissions, or internal chat

Example:

```txt
Suggest Paneer Roll for quick snack customers today.
Do not suggest Mango Shake. It is unavailable today.
For the full menu, share: [MenuList link]
```

### In-store Push Kit

Answers:

> "What should table or counter material say today?"

Outputs:

- counter card copy
- QR tent copy
- digital screen line where existing screen surfaces support it

### Local Trust Kit

Answers:

> "Does my public presence look current?"

Outputs:

- Google update draft
- hours/status reminder copy
- public menu link copy

This kit cannot write to Google or MenuList truth. If the underlying fact is wrong, the owner must use the normal MenuList edit path.

### Review Reply Guard

Answers:

> "How should I respond without making it worse?"

Inputs:

- owner-pasted review text
- optional owner-selected tone guard: calm, apology, clarification, thank-you

Outputs:

- triage recommendation
- short public reply draft when safe
- private recovery message when useful
- internal staff check line when useful
- warning when a public reply is not recommended

Review ingestion from Google remains blocked until GBP API access is approved.

Review Reply Guard is not a daily Do This Now action. It appears only when the owner opens review mode and supplies text.

Implemented V1 review reply guard is deterministic triage. It does not call an AI provider and does not persist raw review text.

## 7. Feature Decision Map

### V1 Core

Build these first:

| Feature | Scope |
| --- | --- |
| Do This Now Inbox | One or a few current actions from MenuList truth. |
| Menu Truth Readiness Checklist | Ready/limited/blocked/stale state for each kit family. |
| Owner Voice basics | Small controlled style/local-language choice, no prompt playground. |
| Compliance Preflight | Blocks invented claims, stale facts, unsupported offers, unsafe review wording. |
| One Kit to Multiple Handoffs | WhatsApp, Instagram, Google draft, staff brief, print/counter copy. |
| Staff Brief Pack | Short staff instruction and avoid list from current menu/store facts. |
| Basic export log | copied/shared/downloaded/printed/marked-used only. |
| Latest kit fallback | Mobile keeps latest loaded kit visible when refresh/generation fails. |

### Guarded Optional V1

| Feature | Admission |
| --- | --- |
| Review Reply Guard | Manual pasted review text only, triage-first, no raw review logging, no GBP ingestion. |

### Pilot Extensions

These are accepted in principle but blocked until pilot data proves the need:

| Feature | Pilot signal required | Boundary |
| --- | --- | --- |
| Existing Image Adaptation | Owners use text/staff kits and ask for image/print assets; item images exist. | Existing images only, deterministic templates, generate on owner action. |
| Customer FAQ Reply Snippets | Owners/staff repeatedly copy WhatsApp/DM replies. | Copyable snippets only, no chatbot/inbox/CRM. |
| Photo Capture Prompts | Useful kits are blocked by missing photos and owners actually upload after prompts. | One item prompt, not photography training. |
| Multi-Outlet Localized Kits | Pilot includes multi-outlet clients with differing store facts. | Store-specific kits only, no campaign center. |
| Used History UI | Owners use multiple kits and need memory/repetition control. | Execution history only, no ROI. |
| Advanced low-data/offline kit access | Mobile usage is high and network failures are real. | Stale/price-sensitive outputs require strict warnings or online verification. |

### Deferred

| Feature | Reason |
| --- | --- |
| Owner-Confirmed Offer Builder | Creates new business truth; needs validity, terms, item, expiry, and store-scope governance. |
| Review Triage expansion | Serious negative reviews create legal, food-safety, refund, and reputation risk. |
| AI image generation inside Growth Kits | Provider cost and accuracy risk; existing image adaptation must prove demand first. |

## 8. Detailed P2 Feature Rules

### Existing Image Adaptation

If approved after pilot, it may create:

- WhatsApp status image
- Instagram square image
- Google update image
- counter prompt
- QR table prompt
- staff share image

Rules:

- source image must already exist in MenuList
- missing image never blocks text/staff kits
- no background removal, photo enhancement pipeline, design canvas, or template marketplace
- generate only on owner action
- store or persist only when needed for re-download/history
- stale source facts require regeneration

### Owner-Confirmed Offer Builder

If approved later, Growth Kits may communicate offers only after the owner creates the offer fact.

Allowed offer types later:

- percentage discount
- fixed price offer
- Buy X Get Y
- bundle/combo
- free add-on

Not allowed:

- invented discount recommendations
- coupon/loyalty/referral systems
- cashback
- membership plans
- customer segmentation
- POS-linked promotions

### Customer FAQ Reply Snippets

If approved after pilot, start with deterministic snippets:

- send menu
- are we open
- item availability
- item price
- store address
- order inquiry fallback
- delivery/pickup fallback
- today's recommendation

Do not build an auto-reply bot, inbox, ticket system, or customer database.

### Photo Capture Prompts

If approved after pilot, prompts should say:

- which item photo to take
- why it matters
- simple photo tip
- what it unlocks
- direct Add Photo action

Do not build a photography course.

### Multi-Outlet Localized Kits

If approved after pilot:

- generate per selected store
- use store-specific price, availability, hours, public link, staff line
- block stores where source facts are missing or contradictory
- do not reuse a kit across outlets unless source facts are identical

### Used History Without ROI

Allowed signals:

- copied
- shared
- downloaded
- printed
- marked used
- regenerated
- stale

Forbidden:

- revenue generated
- estimated orders
- customer conversions
- engagement score
- ROI
- attribution

### Low-Data Mobile Kit Access

V1 only keeps latest loaded kit visible after refresh failure.

Anything more requires a separate policy for:

- stale copy
- entitlement removal
- review text privacy
- price/availability-sensitive outputs
- offline export logging

## 9. Entitlement

GrowthOS is not a default MenuList feature.

Required gates:

- `ENABLE_GROWTHOS_ADDON === true`
- active store subscription is Pro or Premium
- AI capacity is available for paid generation
- store has enough MenuList truth to produce accurate outputs

Suggested packaging:

| Package | Behavior |
| --- | --- |
| Pro included access | Core Growth Kits access for active Pro stores. |
| Premium included access | Higher kit allowance and managed-service readiness for active Premium stores. |
| Managed growth service | Operator-assisted setup and review for Pro/Premium clients only. |

Exact pricing remains a business decision before implementation.

## 10. Success Criteria

The add-on is useful if:

- owners understand the output without explanation
- owners copy/download/share at least one kit in a pilot
- generated kits require little or no editing
- owners do not ask for a dashboard to understand value
- support does not receive accuracy complaints caused by invented facts
- direct posting is not needed to deliver perceived value
- Staff Brief is used without owners asking for a staff-management system
- mobile owners can reuse the latest kit when refresh fails
- pilot data shows whether P2 features are truly needed

## 11. Failure Criteria

Pause or redesign if:

- owners see it as a side feature
- output feels generic
- owners ask "where did this come from?"
- owners must edit most drafts
- owners expect ROI or performance reporting
- the feature pulls attention away from MenuList truth readiness
- generation cost cannot be covered by the paid tier
- Staff Brief becomes staff operations software
- Offer Builder is needed before core kits prove value
- image adaptation becomes a design tool
- customer replies become a chatbot or inbox

## 12. Acceptance Criteria

Current rollout requirements:

- master feature flag is enabled
- paid access mode remains active
- Pro/Premium entitlement gate works on desktop and mobile
- free/base users cannot access paid generation APIs
- generated output cites only current MenuList facts
- stale kit warning appears when source facts change
- no direct posting path is active
- no new scheduler is active
- review reply works only from owner-provided text and triages before drafting
- all AI provider calls pass capacity checks before execution
- all writes are tenant-scoped and rule-protected
- mobile supports view, copy, share, and mark-used flows
- Staff Brief never promotes unavailable items
- export history contains no revenue, orders, customer attribution, or ROI fields
