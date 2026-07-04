# Customer App — Website Content

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Public Website Content  
**Status:** Source-backed website draft; publish/use with current Customer App runtime boundary
**Last Updated:** July 4, 2026
**Audience:** Potential customers visiting menulist.ai

---

## Hero Section

**Headline:**

> Stay one tap away from repeat customers.

**Subheadline:**

> Your customers can add your menu to their home screen as your branded app — your logo, your name, one-tap access. No app store. No download. Works on modern iPhone and Android browsers.

**CTA Text:** See How It Works
**CTA Link:** #how-it-works

**Visual Description:**

- Split screen: Left side shows phone home screen with restaurant app icon among other apps (WhatsApp, Instagram, Camera, "Joe's Pizza" with logo)
- Right side shows the same phone with the restaurant's menu open in standalone mode
- Subtle animation: Icon tap → menu opens

---

## Problem Statement

**Copy:**

Your best customers want to come back. But every time they have to search, type a URL, or dig through chat history to find your menu — you risk losing them to a competitor who was easier to find.

QR codes get buried. Links get forgotten. Bookmarks are too much work.

**What customers actually do:** Unlock their phone, tap an app, get what they need. That's the standard you've been held to.

---

## Solution Statement

**Copy:**

MenuList creates your **Customer App** automatically. When customers visit your menu a few times, we invite them to save it to their home screen.

They see **your logo**. They see **your restaurant name**. They tap it — your public menu opens in the app view.

No browser chrome. No typing. No searching. One tap, just like any other app.

When you update your menu, the app opens the current public menu path. Customers see approved changes after the public cache or return-to-app refresh path completes.

---

## Feature Benefits

### Benefit 1: Your Branding, Not Ours

**Title:** Your logo on their phone

**Description:**
Customers see your restaurant's name and logo on their home screen — not MenuList. It's your app in their collection, next to WhatsApp and Instagram. When they think of ordering, they see you.

**Visual:** Phone home screen zoomed in on the restaurant app icon, showing logo and name clearly

### Benefit 2: One Tap to Order

**Title:** Friction removed

**Description:**
No typing URLs. No searching Google. No scrolling through chat history for that link. One tap from home screen opens the public menu path. For repeat customers, this reduces the steps between "maybe I'll order" and checking your menu.

**Visual:** Side-by-side comparison: Left shows "Old way" (5 steps: unlock → open browser → type URL → wait → menu), Right shows "New way" (2 steps: unlock → tap app)

### Benefit 3: Current Menu Path

**Title:** Approved updates stay on the same path

**Description:**
Change a price, add a dish, or mark something sold out, then the Customer App opens the refreshed public menu after the supported cache or return-to-app refresh path completes. Active sessions do not mutate in the background, and the app does not serve stale offline menu content.

**Visual:** Split screen showing owner making a change in dashboard, customer phone showing updated menu with "Updated" indicator

### Benefit 4: Works on Every Phone

**Title:** iPhone, Android, any browser

**Description:**
No app store approval. No download required. No worrying about iOS vs. Android. Works on any modern phone with a browser — which means it works on your customers' phones.

**Visual:** Three phones side by side: iPhone, Samsung Android, JioPhone — all showing the same restaurant app icon

### Benefit 5: Zero Work From You

**Title:** Automatic from your menu

**Description:**
You don't build it. You don't design it. You don't maintain it. MenuList generates your Customer App from the menu data you already have. Toggle it on. Done.

**Visual:** Simple toggle switch animation: "Off" → "On" with checkmark, followed by phone showing the app icon appearing

---

## How It Works

**Section Title:** How Your Customer App Works

### Step 1: Customer Visits Your Menu

**Copy:**
They scan your QR code, click your link, or find you on Google. Your MenuList menu loads.

**Visual:** QR code scan → menu opens

### Step 2: We Suggest Saving It

**Copy:**
On their third visit, we gently suggest: "Save this menu for faster access." No pushy popups. Just a helpful nudge when we know they're interested.

**Visual:** Bottom sheet UI showing prompt: "Save Joe's Pizza to your home screen?"

### Step 3: They Add It — Done

**Copy:**
One tap. Your logo appears on their home screen. From now on, one tap opens your public menu path. Customers have fewer steps to return to your menu.

**Visual:** Animation: App icon appears on home screen → tap → menu opens

---

## Social Proof Slots

### Testimonial Slot 1

Use only an owner-approved quote from a live Customer App customer. Do not publish invented names, locations, or performance outcomes.

### Testimonial Slot 2

Use only an owner-approved quote from a live Customer App customer. Do not publish invented names, locations, or performance outcomes.

### Stat Block

| Stat                  | Value                                      |
| --------------------- | ------------------------------------------ |
| Customer App installs | Use live Customer App analytics evidence   |
| App opens             | Use live Customer App analytics evidence   |
| Repeat visits         | Use owner-approved or analytics evidence   |

---

## FAQ

### Q: Do my customers need to download something?

**A:** No download needed. They use the browser's save-to-phone flow, and your app icon appears on their home screen after that browser confirms the action. Exact wording and timing vary by device and browser.

### Q: Does this cost extra?

**A:** No. Customer App is included with every MenuList subscription. No usage limits. No install fees. Every customer who adds your app — free.

### Q: What if I change my menu?

**A:** It opens the current public menu path. Approved changes appear after the public cache refresh or return-to-app visibility refresh completes; active sessions do not mutate in the background.

### Q: Is this a real app or just a shortcut?

**A:** It's a real installable app. It opens without browser chrome. It works offline (shows a branded offline page when you have no signal — never a stale menu). It has app shortcuts (long-press for "Call" or "Directions"). The only difference from "native apps" — customers don't go to an app store to get it.

### Q: Can I customize how it looks?

**A:** Your app uses your logo and name automatically. You can optionally customize the app name if your restaurant name is long. The layout and behavior are standardized so the experience stays predictable.

---

## SEO Meta

**Page Title:** Customer App — Your Restaurant on Their Home Screen | MenuList

**Meta Description:** Give your customers an app for your restaurant — your logo, your name, one-tap access to your public menu. No download. No app store. Included with MenuList.

**OG Title:** Your Own Customer App

**OG Description:** Your customers can add your menu to their home screen as your branded app. One tap access. No download needed. Included with MenuList.

**Target Keywords:**

- restaurant customer app
- menu app for customers
- installable menu
- branded restaurant app
- repeat customer retention
- restaurant loyalty app
- no-code restaurant app

---

## Approved Language

### Use These Phrases:

- "Stay one tap away from repeat customers"
- "Your logo on their phone"
- "One tap to your menu"
- "No download needed"
- "Works on iPhone and Android"
- "Included with MenuList"
- "Opens the current public menu path"
- "Your branded app"

### Never Use:

- "PWA" or "Progressive Web App" — technical jargon
- "Web app" — weakens positioning
- "Add to home screen" — technical instruction, use "Save to your phone"
- "AI-powered" or "Smart" — forbidden by Language Governance
- "Optimizes conversion" or "Increases sales" — unverifiable claims
- "Bookmark" — weakens positioning

---

## Related Documents

| Document                         | Purpose                     |
| -------------------------------- | --------------------------- |
| `customer-app_spec.md`           | Product requirements        |
| `customer-app_impl.md`           | Technical implementation    |
| `customer-app_marketing.md`      | Sales/marketing strategy    |
| `customer-app_helpdoc.md`        | Customer help documentation |
| `customer-app_firebase.md`       | Firebase cost tracking      |
| `customer-app_mobile-support.md` | Mobile assessment           |

---

_Document Status: Source-backed website draft; not standalone launch certification_
_Last Updated: July 2, 2026_
