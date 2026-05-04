# 📜 Digital Menu Output Constitution

## Part II — Editor Guardrails (Hard Constraints)

**Goal:**
Make it **impossible** for SMB owners to produce a bad menu — even if they try.

No warnings.
No “best practices.”
Only **design constraints baked into the system**.

---

## 1️⃣ Access & Speed Guardrails

### G1. No-Gate Rule (Hard Lock)

**The editor must never allow:**

- Login wall before viewing
- Phone/email capture before menu load
- App download prompts

**Implementation rule:**

- Viewer mode is always public
- Any lead capture must be **post-intent only** (offer, booking, payment)

> If it blocks menu access → it does not exist.

---

### G2. Performance Budget Lock

**The editor enforces:**

- Max image weight per page
- Lazy-load images **after text**
- No heavy JS per theme

**Owner cannot:**

- Upload videos as backgrounds
- Add animations that delay render
- Override loading order

> Speed is not configurable.

---

## 2️⃣ Typography Guardrails (Readability First)

### G3. Minimum Font Safety

**Locked constraints:**

- Body text cannot go below minimum size
- Price font cannot be smaller than description
- Headings must remain visually dominant

**Owner cannot:**

- Shrink fonts to “fit more”
- Use decorative fonts for prices
- Apply accent color to long body text

> If it hurts eyes → it’s blocked.

---

### G4. Contrast Enforcement

**System enforces WCAG-level contrast**

- Accent color auto-adjusts for readability
- Dark modes auto-correct text brightness
- Background-image overlays get contrast masks

**Owner cannot:**

- Pick color combos that reduce legibility
- Apply gold-on-black low-contrast text

> Accessibility is not optional.

---

## 3️⃣ Pricing & Transparency Guardrails

### G5. Price Visibility Lock

**Editor enforces:**

- Item prices are visible by default
- When item price display is enabled, price must appear in list view
- When item price display is enabled, price cannot be hidden inside modals
- When item price display is enabled, price cannot be moved below images
- When item price display is disabled, price-driven recommendation blocks and analytics payload price fields must be disabled consistently

**Owner cannot:**

- Partially hide prices in one view while showing them in another
- Use “Market Price” without explanation

> If the menu shows prices, customers must never hunt for them.

---

### G6. Modifier Price Disclosure

**Editor enforces:**

- Add-ons must show price
- Size changes must update price live
- No “surprise” totals at checkout

**Owner cannot:**

- Add zero-priced modifiers that secretly cost later
- Delay price updates

> Transparency is structural.

---

## 4️⃣ Navigation & Structure Guardrails

### G7. Category Integrity

**Editor enforces:**

- Every item belongs to a category
- Categories always visible or reachable
- Sticky category access on scroll

**Owner cannot:**

- Create flat, endless item dumps
- Hide category context

> Users must always know where they are.

---

### G8. Long Menu Safety

**System auto-applies:**

- Visual breaks for long lists
- Section headers after X items
- Scroll anchors

**Owner cannot:**

- Create infinite text walls
- Remove navigation aids

> Fatigue prevention is automatic.

---

## 5️⃣ Image Guardrails (Visual Truth System)

### G9. Image Quotas

**Editor enforces:**

- Max images per screen
- Images are optional, never required
- Images cannot replace text

**Owner cannot:**

- Turn menu into gallery
- Hide prices behind images

> Images assist decisions — not distract.

---

### G10. Image Quality Control

**System flags:**

- Low-resolution images
- Incorrect aspect ratios
- Overly heavy files

**Owner choice:**

- Fix image
- Or system hides it gracefully

> Bad images damage trust more than no images.

---

## 6️⃣ Trust Signal Guardrails

### G11. Business Identity Lock

**Editor requires:**

- Business name always visible
- Location or contact info present
- Brand not anonymous

**Owner cannot:**

- Publish nameless menus
- Hide identity completely

> Menus must feel real.

---

### G12. Freshness Enforcement

**System auto-injects:**

- “Last updated” timestamp
- Sold-out state visuals
- Live status badges

**Owner cannot:**

- Disable freshness indicators
- Fake availability

> Stale menus are lies.

---

## 7️⃣ Interaction Safety Guardrails

### G13. Feedback on Every Action

**System enforces:**

- Tap → immediate visual response
- Loading → skeleton, not spinner
- No dead zones

**Owner cannot:**

- Add unresponsive UI elements

> Silence = broken.

---

### G14. Back Button Safety

**System enforces:**

- Predictable back behavior
- Modal closes before exit
- History-aware navigation

> Exploration must be safe.

---

## 8️⃣ Cross-Vertical Neutrality Guardrails

### G15. No Forced Vibes

**Editor forbids:**

- Mandatory dark themes
- Nightclub-only aesthetics
- Excessive motion

**Default output must look safe for:**

- Clinic
- Salon
- Cafe
- Restaurant

> Neutral first. Flavor later.

---

### G16. Share Pride Rule

**System guarantees:**

- Beautiful link preview (OG tags)
- Clean title + image
- No broken unfurls

**Owner must feel:**

> “Yes, I can send this.”

---

## Core Guardrail Principle

> **If a user option can create a bad menu, it must not exist.**

Freedom is earned only **after safety is guaranteed**.

---
