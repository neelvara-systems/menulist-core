# Customer App — Help Documentation

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Customer-Facing Help Documentation  
**Status:** Source-backed help draft; not current support publication or launch certification
**Last Updated:** July 4, 2026
**Audience:** Restaurant owners (non-technical, SMB)

> **Launch Boundary:** This help draft is source evidence only. Current publication or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:customer-app-pwa`, browser/device Customer App QA, target deploy evidence, and production-host smoke.

---

## Quick Summary

The **Customer App** lets your customers add your menu to their phone's home screen — like any other app. They see your logo and restaurant name. One tap opens your public menu path. No download needed. Works on supported iPhone and Android browsers. Included with your MenuList subscription.

---

## Getting Started

### Prerequisites

- Your MenuList menu is published and active
- You have a logo uploaded in your business settings

### First-Time Setup

#### Step 1: Open Customer App Settings

1. Log in to your MenuList dashboard
2. Click **Surfaces** in the left menu
3. Click **Customer App**

> 📸 **Screenshot:** Dashboard showing Surfaces menu expanded, Customer App highlighted

#### Step 2: Enable the Customer App

1. Find the toggle **"Enable Installable App"**
2. Turn it **ON** (blue)
3. Your menu is now app-ready

> 💡 **Tip:** After the save is acknowledged and the public menu path is available, customers can add your menu to their phones.

#### Step 3: Decide on Promotion

1. Find the toggle **"Promote Installation"**
2. Turn it **ON** to suggest the app to repeat customers
3. Keep it **OFF** if you prefer customers discover it themselves

> 📸 **Screenshot:** Both toggles turned ON, status showing "Installable: Active"

---

## How-To Guides

### How to Customize Your App Name

If your restaurant name is long, you can set a shorter name for the app:

1. In Customer App settings, scroll to **Advanced**
2. Click to expand
3. Find **App Name**
4. Enter a shorter name (max 12 characters)
   - Example: "Habib Authentic Maharashtrian Family Restaurant" → "Habib Pune"
5. Click **Save**

> 📸 **Screenshot:** App Name field with example, preview showing how it appears

### How to Upload a Custom App Icon

Your app uses your store logo by default. If you want a different icon:

1. In Customer App settings, scroll to **Advanced**
2. Click **App Icon**
3. Select **"Upload Custom Icon"**
4. Click **Choose File**
5. Select a square image (PNG, 1024x1024 recommended)
6. See the preview — it shows how your icon looks on Android and iPhone
7. Click **Save** if you like it

> 💡 **Tip:** App icons are small. Simple logos work best. Avoid text-heavy images.

> 📸 **Screenshot:** Icon upload area with preview showing Android and iPhone home screens

### How to Preview Your Customer App

See exactly what customers will see:

1. In Customer App settings, find the **Preview** section
2. See your app icon and name
3. Click **Preview Customer App** to see the full experience
4. A test page opens showing how the install process works

> 📸 **Screenshot:** Preview section with app icon mockup

### How to Check If Customers Are Installing

1. In Customer App settings, look at the **Status** card
2. It shows:
   - Installable: Active/Inactive
   - App Icon: Generated from Logo / Custom
   - Install Promotion: Active/Inactive

> 💡 **Note:** We don't show individual install counts to protect customer privacy. But you can ask regular customers — many will show you their home screen proudly.

---

## Troubleshooting / FAQ

### Problem: Customers say they can't find how to add the app

**Why this happens:**
Every phone is slightly different. iPhone uses Safari's Share menu. Android uses Chrome's menu or a popup.

**How to fix it:**

**For iPhone customers:**

1. Open your menu in Safari (not Chrome, not WhatsApp browser)
2. Tap the **Share** button (rectangle with arrow, at bottom)
3. Scroll down
4. Tap **Add to Home Screen**
5. Tap **Add**

> 📸 **Screenshot:** iPhone Share menu with "Add to Home Screen" highlighted

**For Android customers:**

1. Open your menu in Chrome
2. Look for a popup that says "Add to Home Screen" — tap it
3. Or tap the **three dots** menu (top right)
4. Tap **Add to Home Screen**
5. Tap **Add**

> 📸 **Screenshot:** Android Chrome menu with "Add to Home Screen" highlighted

### Problem: App icon doesn't look right

**Why this happens:**
Your logo might have too much detail for a small icon, or transparent background that looks odd.

**How to fix it:**

1. Go to Customer App settings → Advanced → App Icon
2. Upload a custom icon designed for app size:
   - Square shape
   - Simple design
   - Solid background (white or your brand color)
   - 1024x1024 pixels
3. Check the preview before saving

> 💡 **Tip:** If you don't have a simple icon, just use your logo. The system will add padding and background automatically.

### Problem: Long restaurant name gets cut off

**Why this happens:**
Phone home screens only show about 12 characters under app icons.

**How to fix it:**

1. Go to Customer App settings → Advanced
2. Set a **pwaShortName** (short app name)
3. Example: "Joe's Pizza & Family Restaurant" → "Joe's Pizza"
4. Save

> 📸 **Screenshot:** Short name field with before/after comparison

### Problem: Customer says the app shows old menu

**Why this happens:**
The customer opened your app while online, then left it open in the background for a while. When they came back, they saw the version from when they first opened it. The app fetches fresh data when:

- They first open the app online (uses the current public menu path)
- They return to the app after switching away for 60+ seconds
- Their internet reconnects after being offline

If they never left the app (kept it visible the whole time), they won't see updates until they close and reopen.

**How to fix it:**

Tell the customer:

1. Close the app completely (swipe it away from recent apps)
2. Reopen the app with internet on

That's it — they'll see the approved public menu after the supported cache or return-to-app refresh path completes.

> 💡 **Note:** The app never caches your menu for offline use. If they're offline, they'll see an "offline" screen, not a stale menu. This prevents showing wrong prices or sold-out items.

### Problem: "Enable Installable App" toggle is grayed out

**Why this happens:**
Your menu might not be published yet, or there's a required field missing.

**How to fix it:**

1. Make sure your menu is **Published** (not Draft)
2. Make sure you have a **logo** uploaded
3. Make sure your **store is active**
4. Refresh the page and try again

If still grayed out, contact support.

### What happens if I stop using MenuList?

If your account becomes inactive, customers who already installed your app will see a simple screen: **"This business is currently unavailable."**

No broken menu. No confusing error page. No outbound links. Just a clean, deterministic message. Their app icon will remain on their phone until they remove it manually.

### What happens if I change my logo after customers install?

Once installed, the app icon on a customer's phone is managed by their operating system. In most cases, their old icon stays until they reinstall. **New customers who install after the logo change will see the new icon.**

If you want an existing customer to see your new logo:

1. Tell them to long-press the app → Remove
2. Visit your menu again
3. Add to home screen again

This is standard mobile app behavior, not specific to MenuList.

---

## Tips & Best Practices

### 💡 Enable It Even If You're Not Sure

The Customer App is generated from your menu settings. If customers don't use it, nothing changes for them. If they do use it, they have fewer steps to reach your menu. Turn it on and let customers decide.

### 💡 Tell Your Regulars

The best way to get app installs: mention it to regular customers.

> "Save our menu to your phone — tap the icon anytime, no searching needed."

### 💡 Check Your Icon Preview

After enabling, always check the preview. Make sure:

- Your logo is visible at small size
- The name isn't cut off
- It looks professional next to other apps

### 💡 Don't Overthink the Short Name

If your full name fits (under 12 characters), use it. Only shorten if needed. "Joe's Pizza" is fine. "J's Pizza" is unnecessary shortening.

### 💡 Keep Promotion ON Unless You Have a Reason

The "Promote Installation" setting gently suggests the app to repeat customers (after their 3rd visit). This is helpful, not pushy. Only turn it off if you specifically don't want to suggest it.

### 💡 Ask for Feedback

Once enabled, ask a few regular customers: "Did you save our menu to your phone?" Many will show you their home screen. This is good feedback that it's working.

---

## Analytics: What You'll See

Your Customer App reports into the same analytics dashboard as your menu. You'll see a dedicated **Customer App** card showing:

| Metric                  | What It Means                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Installed Customers** | How many unique customers added your app to their phone                             |
| **App Opens (30 days)** | How many times customers opened your app from their home screen in the last 30 days |
| **Install Conversion**  | Of customers who saw the install prompt, what percentage installed                  |
| **Top Shortcut Used**   | Which shortcut your customers use most (View Menu, Call, or Directions)             |

### What this tells you

- **High Installed Customers** — Your regulars are committing to you. Great sign.
- **High App Opens per install** — Your app is actually being used, not just installed and forgotten.
- **High Install Conversion** — Your menu is worth saving. Keep doing what you're doing.
- **Call is the Top Shortcut** — Customers prefer to call. Make sure your phone number is always right.
- **Directions is the Top Shortcut** — Walk-in traffic. Make sure your address is accurate.

### What we do NOT track

We deliberately do **not** track:

- Who your individual customers are (no customer identity)
- How long they spend in the app (no session timing)
- What they tap inside the app (no heatmaps)
- Their device details beyond rough device type (phone vs tablet)

Your customers' privacy is protected. You get useful business signals, nothing more.

### Can I turn analytics off?

Yes. Your existing **"Track menu views"** setting in analytics settings also controls Customer App tracking. If you disable menu analytics, Customer App events stop too. One toggle, both surfaces.

---

## Related Features

- **[Digital Menu](../client-menu/client-menu_helpdoc.md)** — The public menu customers see in the app
- **[Official Business Page](../official-business-page/official-business-page_helpdoc.md)** — Your public web presence
- **[QR Code Sharing](../client-menu/client-menu_helpdoc.md)** — How customers first find your menu
- **[PDF Menu](../pdf-surface/pdf-surface_helpdoc.md)** — Printable menu for sharing

---

## Need More Help?

- **WhatsApp:** [Your support number]
- **Email:** support@menulist.ai
- **Dashboard:** Click the ? button in your MenuList dashboard

We typically reply within 2 hours during business hours (9 AM - 7 PM IST).

---

_Document Status: Source-backed help draft; not standalone launch certification_
_Last Updated: July 4, 2026_
