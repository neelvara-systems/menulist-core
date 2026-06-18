# AI Menu Manager - Website Content

**Status:** Public launch copy locked for website implementation  
**Public feature name:** AI Menu Manager  
**In-app owner label:** Menu Manager, with AI badge where useful  
**Last Updated:** June 17, 2026

---

## Naming Decision

MenuList may use `AI Menu Manager` publicly for this feature.

This is an explicit founder decision and is the exception to the normal public-copy preference to avoid AI-led product framing.

The exception is narrow:

- Do use `AI Menu Manager` as the market-facing feature name.
- Do use `AI-powered. Owner-approved.` for this feature.
- Do use `approval-based AI agent` as explanatory copy.
- Do keep the overall MenuList product positioned as one official menu source customers can trust.
- Do not rebrand MenuList as generic AI restaurant software.

Naming stack:

| Surface | Name |
| --- | --- |
| Public launch / website / SEO | AI Menu Manager |
| In-app navigation | Menu Manager, optional AI badge |
| Technical docs / code | AMM / AI Menu Manager |
| Core promise | Tell MenuList what changed. Approve the prepared update. |
| Trust line | AI-powered. Owner-approved. |

---

## Public Copy Boundary

The public website can lead with AI for this feature, but claims must remain approval-safe and operation-specific.

Use:

- AI Menu Manager
- approval-based AI menu operations
- update your menu by message
- prepared update
- approval card
- owner-approved
- customer preview
- manual task
- receipt

Avoid:

- "world's first"
- "fully autonomous"
- "AI runs your menu"
- "never manage your menu again"
- "updates everywhere automatically"
- claims that Google, Instagram, Zomato, Swiggy, or any external system updates directly from AI Menu Manager

---

## Website Placement

AI Menu Manager appears in these website surfaces:

| Surface | Decision |
| --- | --- |
| Homepage hero | Add a visible "New: AI Menu Manager" teaser and make secondary CTA point to `/ai-menu-manager`. |
| Homepage body | Add a full AI Menu Manager section after the source-to-public workflow. |
| Dedicated landing page | Create `/ai-menu-manager` for launch, SEO, and campaigns. |
| Header navigation | Add AI Menu Manager as a first-level nav item. |
| Feature menu | Add AI Menu Manager as the first Operate feature. |
| Features page | Add AI Menu Manager as the first Operations card. |
| How It Works | Update step 04 to "Tell MenuList what changed." |
| Pricing | Show AI Menu Manager as a Pro/Premium value driver. |
| FAQ | Add safety questions around approval, chatbot boundary, staff access, and unsupported external platforms. |
| Sitemap / LLM files | Include `/ai-menu-manager` in discovery files. |

---

## Homepage Copy

Hero teaser:

```text
New: AI Menu Manager
Update your menu by message
```

Homepage section:

```text
Your approved menu now updates like a message.

AI Menu Manager lets owners tell MenuList what changed. MenuList prepares an operation card,
waits for approval when the change is important, then applies it through the same MenuList
systems you already use.
```

Demo examples:

| Owner message | Prepared output |
| --- | --- |
| Cold coffee sold out | Availability card with customer-facing preview |
| Add mango lassi 99 today special | Today Special card with price and expiry |
| Increase all paneer items by ₹20 | Bulk approval card with affected count |
| Generate image for masala tea | Draft image card before it goes on the menu |

---

## Landing Page Contract

Route:

```text
/ai-menu-manager
```

Metadata:

```text
Title: AI Menu Manager for Restaurants | MenuList
Description: Update prices, sold-out items, specials, photos, imports, design, and publishing from simple messages. AI prepares the card; you approve before it goes live.
```

Hero:

```text
Tell MenuList what changed. Approve the prepared update.
```

Subheadline:

```text
AI Menu Manager is an approval-based AI agent for menu operations. Update prices,
sold-out items, specials, photos, imports, design, and publishing from simple messages
while MenuList keeps you in control.
```

Core flow:

```text
Owner intent
-> prepared card
-> owner approval when needed
-> existing MenuList operation
-> receipt
```

---

## FAQ

### Does AI Menu Manager change my menu automatically?

No. AI Menu Manager prepares cards. Important work such as prices, bulk updates, publishing, and generated images needs owner approval before it goes live.

### Is AI Menu Manager a customer chatbot?

No. It is an owner-side menu operations feature. Customers do not chat with it. Owners use it to prepare menu updates inside MenuList.

### Can staff use AI Menu Manager?

Staff access depends on the permissions the owner gives them. High-risk work still follows approval rules and cannot bypass owner-controlled access.

### Can it update Zomato, Swiggy, Google, or Instagram directly?

No. MenuList does not support direct Zomato, Swiggy, Google Business Profile, Instagram, or Facebook posting from AI Menu Manager. If an owner asks for it, AI Menu Manager must say that destination is not supported and leave MenuList truth unchanged.

---

## Screenshot Slots

| Slot | Description |
| --- | --- |
| Hero visual | AMM workspace with owner message, prepared card, approval controls, and receipt. |
| Price update | Before/after card with approval. |
| Sold out | Availability card with restore time. |
| Generated image | Masala tea draft image card with Use on menu. |
| Theme update | Menu design preset preview card. |
| Unsupported external request | Destination-specific not-supported card that does not claim integration support or completion. |
| Receipt | Completed update with undo wording only when that adapter supports safe reversal. |
