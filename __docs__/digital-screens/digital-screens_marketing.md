# Digital Screens - Marketing & Sales Collateral

**Created:** January 4, 2026  
**Status:** 🔒 **LOCKED — FINAL (Post-Market Review)**  
**Author:** Lead Architect (Cascade)  
**Audience:** Sales Team, Marketing Team, Partnership Discussions  
**Last Audit:** August 1, 2026 (code-truth freshness, valid-price, loaded-offline, access, lifecycle, and unsupported-claim wording)

## Source Gate

Marketing copy must describe Digital Screens as a saved MenuList source display that refreshes through the screen update path, not as instant, absolute, or independently fresh. The active runtime uses a private control for the bearer link, a token-hashed 60-second state cache, a store-scoped menu cache, offline-only version-matched browser fallback, and the screen content-version listener. Guard with `npm run verify:digital-screens-boundary`.

---

## Elevator Pitch

### 1-Liner (5 seconds)

> **"Your current menu on your shop TV. One link. No separate screen editing."**

### 30-Second Pitch

> "You already have a TV in your shop. Right now it's either blank, showing old content, or running something generic. With MenuList, you open one link on your TV, and your full menu appears — categories, items, prices — from the same saved source your customer menu uses. When you save menu changes, connected screens refresh through the screen update path. Got a second screen? Use the highlights link for rotating promotions."

### Why It Matters (For the Pitch)

> "Shop owners don't want another thing to manage. They want their TV to show their menu — like their signboard, like their price list. MenuList keeps the screen tied to the same saved menu source."

---

## Feature Narrative

### The Problem (SMB Reality)

Every shop has a TV or digital screen. Walk into any cake shop, restaurant, or juice bar — there's a screen somewhere.

**What owners currently do:**

- Leave it blank (wasted opportunity)
- Show outdated posters (forgot to update)
- Play generic slideshows (not their menu)
- Spend hours creating content (time they don't have)

**The hidden cost:**

- Customers don't know what to order
- Best items don't get noticed
- Owner spends time on marketing instead of running the shop

### The Solution (MenuList Digital Screens)

MenuList already knows your menu. It knows what's available. It knows what customers notice.

**One link. Fullscreen. Done.**

**Menu Board (default)** — your full menu on screen:

- All categories and items with prices
- Sold-out items leave after the menu is saved and the screen refresh path completes
- New items appear after save and screen refresh
- Pages rotate for large menus
- QR code to your digital menu

**Highlights (optional, second screen)** — rotating promotions:

- Today's featured item
- Popular items with prices
- QR code to full menu

**You update the MenuList source once. The screen path refreshes from that saved source.**

### The Emotional Hook

> "Imagine your full menu on your shop TV — from the same saved source as your MenuList menu. No separate screen editing. That's what MenuList does."

---

## Competitive Positioning

### What This Is NOT

| We Are NOT               | Why It Matters                        |
| ------------------------ | ------------------------------------- |
| Digital signage software | No playlist management, no scheduling |
| A design tool            | No templates to choose, no editing    |
| A content creator        | Content comes from YOUR menu data     |
| A social media tool      | This is in-store, not online          |

### What This IS

| We ARE                      | What It Means                                |
| --------------------------- | -------------------------------------------- |
| Your menu on your TV        | Full menu with categories, items, and prices |
| Part of your menu system    | Connected to saved availability and screen-version refresh |
| Zero-effort display         | Works without you touching it                |
| A decision remover          | You open a link, not manage a system         |
| Two screens from one system | Menu board + highlights, same data           |

### Competitive Alternatives

| Alternative             | Problem                                   | MenuList Advantage                      |
| ----------------------- | ----------------------------------------- | --------------------------------------- |
| **Blank TV**            | Wasted opportunity                        | Keeps showing relevant menu content     |
| **USB slideshow**       | Becomes stale, manual effort               | Refreshes from the saved MenuList source |
| **Generic signage CMS** | Expensive, complex, another tool to learn | Free with MenuList, zero learning curve |
| **Hire a designer**     | Expensive, slow, still need to update     | No separate board design for normal menu changes |
| **DIY Canva**           | Time-consuming, still manual              | Zero time investment                    |

---

## Pitch Deck Outline (7 Slides)

### Slide 1: The Problem

**Title:** Your Shop TV is Wasting Money

**Visual:** Photo of a blank/outdated shop TV

**Key Points:**

- Shop TVs often end up blank, generic, or outdated when they require a separate editing routine
- Customers can't decide what to order
- You're too busy to update it

**Speaker Note:**

> "Walk into any local shop. There's a TV. It's either blank, or showing something from last month. Sound familiar?"

---

### Slide 2: The Solution

**Title:** One Link. Your Saved Menu on TV.

**Visual:** Simple diagram: Menu → MenuList → TV

**Key Points:**

- Open one link on your TV
- Saved content refreshes through the screen update path
- Sold out items leave the screen after save and refresh

**Speaker Note:**

> "You already have MenuList for your menu. Now your TV uses the same data. When something sells out, it disappears from your screen. When you add something new, it appears. You do nothing."

---

### Slide 3: How It Works

**Title:** 3 Steps, 1 Minute

**Visual:** Simple numbered steps with icons

**Steps:**

1. Open the link on your TV (Chrome, fullscreen)
2. Bookmark it
3. That's it — forever

**Speaker Note:**

> "No app to install. No account to create on the TV. No USB drive. One link. Bookmark. Fullscreen."

---

### Slide 4: What Your TV Shows

**Title:** Your Full Menu, From One Source

**Visual:** Side-by-side mockups of Menu Board and Highlights modes

**Menu Board (main screen):**

- Full menu with categories and prices
- Sold-out items leave after the menu is saved and the screen refresh completes
- New items appear after save and refresh
- Pages rotate for large menus

**Highlights (optional second screen):**

- Featured items with prices
- Rotating promotions
- QR code to full menu

**Speaker Note:**

> "The main screen shows your full menu. If you have a second TV, use the highlights link for promotions. Both follow the saved MenuList source after the screen update path refreshes."

---

### Slide 5: Real SMB Scenarios

**Title:** It Just Works

**Scenario 1: The Restaurant (Menu Board)**

> TV above counter shows full menu with prices. Customer walks in, sees what's available, knows what to order before reaching the counter. Owner marks butter chicken sold out in MenuList; the connected screen refreshes from the saved source.

**Scenario 2: The Cake Shop (Two screens)**

> Main screen above counter: full menu with prices. Waiting area screen: rotating highlights of today's specials. Both follow the saved MenuList source.

**Scenario 3: Diwali Festival**

> Owner uploads one Diwali poster. It appears on the highlights screen. After Diwali, they remove it. Regular content resumes. Menu board is unaffected.

**Speaker Note:**

> "Notice what's not happening in these stories: the owner isn't managing anything. The system handles it."

---

### Slide 6: The Outcome

**Title:** Your TV Becomes Invisible (In a Good Way)

**Visual:** Calm owner + happy customer

**Outcomes:**

- Customers know what to order
- Popular items get noticed
- You stop thinking about marketing
- One less thing to manage

**Speaker Note:**

> "The best technology disappears. You don't think about your fridge. You shouldn't think about your TV either."

---

### Slide 7: Get Started

**Title:** Available in MenuList Today

**Visual:** Simple CTA

**CTA:**

- Already a MenuList customer? It's in your Settings.
- New to MenuList? Start your free trial.

**No pressure. No urgency. Just availability.**

**Speaker Note:**

> "This isn't a separate product. It's part of MenuList. If you're already using us, you already have this. Just turn it on."

---

## Landing Page Copy Hooks

### Hero Section

**Headline:**

> **Your shop TV, on autopilot.**

**Subheadline:**

> One link. Current menu source on screen. No separate screen editing.

**CTA Button:**

> See how it works

---

### Benefit Bullets

- ✓ **Your full menu on screen** — Categories, items, prices from one saved source.
- ✓ **Sold out? Save once** — Connected screens refresh from the same menu source.
- ✓ **New item? It appears** — Add to MenuList, save, and the screen refreshes through the update path.
- ✓ **Connection-resilient after load** — If the connection drops after content has loaded, the screen keeps its last valid display. A cold browser boot still needs the page assets.
- ✓ **Two modes, one link** — Menu board for ordering, highlights for promotions.
- ✓ **Zero learning curve** — One link. Fullscreen. Done.

---

### How It Works (3 Steps)

**Step 1: Connect**

> Open one link on your shop TV. Any browser, any device.

**Step 2: Fullscreen**

> Press one button. Your menu takes over the whole screen.

**Step 3: Leave It Running**

> Saved MenuList changes reach the display through the screen update path.

---

### Social Proof Placeholders

> **"I haven't touched my TV in 3 months. It just works."**  
> — Future testimonial

> **"Customers started asking about items they saw on the screen."**  
> — Future testimonial

> **Metric placeholders:**
>
> - "X shops running screens"
> - "Y hours saved per month"

---

### CTA Variants

| Variant               | Copy                     |
| --------------------- | ------------------------ |
| **Curiosity**         | "See how it works"       |
| **Low commitment**    | "Try it on your TV"      |
| **Existing customer** | "Turn it on in Settings" |

**Avoid:**

- ❌ "Start your free trial NOW"
- ❌ "Limited time offer"
- ❌ "Don't miss out"
- ❌ Any urgency language

---

## Go-to-Market Messaging

### India Messaging (Primary Market)

**Key Themes:**

- WhatsApp-first mention (they already use WhatsApp Status with MenuList)
- TV is common in Indian shops (cake shops, restaurants, juice bars)
- No USB/pendrive hassle (big pain point)
- Works even with unreliable internet (offline mode)

**Sample Copy:**

> "You already share on WhatsApp Status with MenuList. Now your shop TV shows your full menu with prices from the same saved source. No pendrive. No design. Just your current MenuList menu on screen."

**Regional Language Adaptations:**

- Hindi: "Apki dukaan ka TV ab khud chalega"
- Tamil: "Unga kadai TV thaniyana velai seyyum"
- (Adapt tone, not just translate)

---

### Non-India Messaging (Secondary Markets)

**Key Themes:**

- Full platform positioning (not WhatsApp-centric)
- Automation narrative
- "Digital signage without the signage software"

**Sample Copy:**

> "Digital menu boards are expensive and complicated. MenuList puts your full menu on your TV — with prices, categories, and saved availability — without the software, without the cost, without the complexity."

---

## Sales Talking Points

### Objection Handlers

| Objection                                 | Response                                                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **"We already have a TV slideshow"**      | "With MenuList, your full menu appears on screen with prices — not just slideshows. Saved menu changes refresh through the screen update path." |
| **"We don't have a TV"**                  | "This feature is optional. But if you ever add one, you're ready. Focus on what matters to you today."                                   |
| **"Isn't this just content generation?"** | "No. This is your saved MenuList menu on screen. When you mark butter chicken sold out, the connected screen refreshes from that source." |
| **"Will this help our sales?"**           | "Customers who see the full menu with prices decide faster. We don't promise numbers, but we make sure customers see what's available."  |
| **"We use [signage tool X]"**             | "Great tools for teams that need signage management. MenuList is for owners who want one link and no separate screen editing." |
| **"Can I customize the design?"**         | "The menu board is designed for readability. You can upload images on the highlights screen for special occasions."                      |
| **"Can it show our full menu?"**          | "That's the default. Open the link and your full menu appears with categories, items, and prices."                                       |

### Key Differentiators to Emphasize

1. **Full menu on screen** — Categories, items, prices. Not just slideshows.
2. **Connected to real data** — Not static images, saved MenuList source data
3. **No separate screen editing** — Manage the saved menu source
4. **Availability-aware** — Saved sold-out changes flow through the screen refresh path
5. **Two modes, one system** — Menu board + highlights from same link
6. **Included in MenuList** — Not a separate product or cost
7. **Keeps loaded content during a connection loss** — India-ready without promising a cold offline boot

---

## Approved Language

### Terms to USE

| Term             | Context                           |
| ---------------- | --------------------------------- |
| "Automatic"      | "Your screen runs automatically"  |
| "Current source" | "Showing the saved MenuList menu source" |
| "One link"       | "Just open one link"              |
| "Zero effort"    | "Zero effort to maintain"         |
| "Just works"     | "It just works"                   |
| "Screen refresh" | "Refreshes after saved menu changes" |

### Terms to AVOID (Forbidden Phrases)

| Term                  | Why                                |
| --------------------- | ---------------------------------- |
| ❌ "AI-powered"       | Tech jargon, invites skepticism    |
| ❌ "Smart"            | Overused, meaningless              |
| ❌ "Boost sales"      | Implies attribution we can't prove |
| ❌ "Increase orders"  | Same — comparative/causal claim    |
| ❌ "Analytics"        | Not relevant to screens            |
| ❌ "Campaign"         | Marketing jargon                   |
| ❌ "Playlist"         | Implies management                 |
| ❌ "Signage software" | We're not that                     |
| ❌ "Digital signage"  | Same association                   |

### Tone Guidelines

- **Calm, not urgent** — No FOMO, no pressure
- **Practical, not hype** — Focus on what it does, not what it promises
- **Outcome-focused** — "No separate screen editing" > "Saves time"
- **SMB-respectful** — They're busy, don't waste their attention

---

## Pricing & Packaging Story

### Positioning

**Digital Screens is included in MenuList.** It's not a separate product.

This is intentional:

- Reduces perceived complexity
- Increases perceived value of MenuList
- No "another tool to pay for" objection
- Natural upsell for basic plans

### How to Talk About It

| Context                       | Messaging                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **To existing customers**     | "This is already in your account. Go to Settings > Digital Screen to turn it on." |
| **To prospects**              | "Digital Screens is included in all MenuList plans. One more reason to try us."   |
| **To competitors' customers** | "You're paying separately for signage software. With MenuList, it's built in."    |

### Future Monetization (If Needed)

> **Note:** This is NOT for launch. Only if business model evolves.

Potential paths:

- Multi-location screen management (for chains)
- Custom branding/colors (careful — must stay zero-config)

**Explicitly rejected monetization paths:**

- ❌ Premium templates (creates management burden)
- ❌ Screen analytics (invites ROI thinking)
- ❌ Per-screen pricing (adds complexity)

**For now:** Keep it free, keep it simple, keep it valuable.

---

## Quick Reference Card (For Sales Team)

### The 10-Second Pitch

> "One link on your TV. Your full menu with prices from the saved MenuList source. No separate screen editing."

### The 3 Key Points

1. **Full menu on screen** — Categories, items, prices. Not slideshows.
2. **Zero effort** — Set once, forget forever.
3. **Availability-aware** — Saved sold-out changes leave connected screens after refresh.

### The Demo Flow

1. Show the menu board URL in browser — "This is your full menu."
2. Click fullscreen — "This is what customers see."
3. Point out: "If I mark this item sold out..." [do it] "...it disappears."
4. Show highlights URL — "For a second screen, use this link for promotions."
5. "That's it. That's the whole feature."

### Common Questions

- **"What if internet goes down?"** → "If the screen is already loaded, it keeps the last valid content. A cold browser start still needs a connection."
- **"Can I add my own content?"** → "Yes, on the highlights screen. Upload in Settings."
- **"What screens does it work on?"** → "Any screen with a browser. Smart TV, Android box, old laptop."
- **"Can I show my full menu?"** → "That's the default. Open the link and your full menu appears."
- **"I have two TVs."** → "Use the main link for menu board, highlights link for the second TV."

---

## Document History

| Version | Date       | Author  | Changes                                                                                                                                                                                       |
| ------- | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2026-01-04 | Cascade | Initial marketing collateral                                                                                                                                                                  |
| 2.0     | 2026-02-08 | Cascade | **Major update:** Two-surface positioning (Menu Board default + Highlights secondary), price emphasis, updated pitches, scenarios, objection handlers, demo flow, competitive differentiators |
