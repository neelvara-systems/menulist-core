# GrowthOS Add-on - Product Specification

**Status:** Planning spec
**Owner-facing label:** Growth Kits
**Implementation flag:** `ENABLE_GROWTHOS_ADDON` must default to `false`
**Scope:** MenuList higher-tier add-on only

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
| Mobile owner app | Show latest kit and copy/share actions from the current Today mobile surface and a compact paid add-on entry point. |
| Website/pricing | Mention as a MenuList add-on, not as a separate product. |
| Help center | Explain how to use a kit, not how the system works. |

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

The system builds a `GrowthOSSourceFacts` object from current MenuList data, hashes it, then generates a kit from that immutable source snapshot.

Every generated kit must store:

- source fact hash
- source facts summary
- output destination
- generated copy
- safety status
- expiry date
- owner action status
- AI operation reference when AI was used

### Output Destinations

Initial allowed destinations:

| Destination | Mode |
| --- | --- |
| WhatsApp status | Copy/share text |
| WhatsApp message | Copy/share text |
| Google Business Profile update | Draft only |
| Instagram caption | Copy text |
| Staff line | Copy/read in app |
| Print poster or QR tent | Download/print from existing physical surface patterns |
| Review reply | Draft from pasted review text only |

Direct posting remains disabled.

## 6. Core Kit Families

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
- optional image generation if the item lacks a usable image and image mode allows it

### In-store Push Kit

Answers:

> "What should staff or table material say today?"

Outputs:

- staff line
- counter card copy
- QR tent copy
- digital screen line

### Local Trust Kit

Answers:

> "Does my public presence look current?"

Outputs:

- Google update draft
- hours/status reminder copy
- public menu link copy

This kit cannot write to Google or MenuList truth. If the underlying fact is wrong, the owner must use the normal MenuList edit path.

### Review Reply Kit

Answers:

> "How should I respond without making it worse?"

Inputs:

- owner-pasted review text
- optional owner-selected tone guard: calm, apology, clarification, thank-you

Outputs:

- short reply draft
- warning if the review should not receive a public reply

Review ingestion from Google remains blocked until GBP API access is approved.

## 7. Entitlement

GrowthOS is not a default MenuList feature.

Required gates:

- `ENABLE_GROWTHOS_ADDON === true`
- store plan or explicit add-on entitlement is active
- AI capacity is available for paid generation
- store has enough MenuList truth to produce accurate outputs

Suggested packaging:

| Package | Behavior |
| --- | --- |
| Higher-tier included allowance | Small monthly kit allowance for premium MenuList plans. |
| Growth Kits add-on | Additional monthly kit allowance for active businesses. |
| Managed growth service | Operator-assisted setup and review for higher-value clients. |

Exact pricing remains a business decision before implementation.

## 8. Success Criteria

The add-on is useful if:

- owners understand the output without explanation
- owners copy/download/share at least one kit in a pilot
- generated kits require little or no editing
- owners do not ask for a dashboard to understand value
- support does not receive accuracy complaints caused by invented facts
- direct posting is not needed to deliver perceived value

## 9. Failure Criteria

Pause or redesign if:

- owners see it as a side feature
- output feels generic
- owners ask "where did this come from?"
- owners must edit most drafts
- owners expect ROI or performance reporting
- the feature pulls attention away from MenuList truth readiness
- generation cost cannot be covered by the paid tier

## 10. Acceptance Criteria

Before activation:

- feature flag defaults off
- add-on entitlement gate works on desktop and mobile
- free/base users cannot access paid generation APIs
- generated output cites only current MenuList facts
- stale kit warning appears when source facts change
- no direct posting path is active
- no new scheduler is active
- review reply works only from owner-provided text unless GBP ingestion is unlocked
- all AI provider calls pass capacity checks before execution
- all writes are tenant-scoped and rule-protected
- mobile supports view, copy, share, and mark-used flows
