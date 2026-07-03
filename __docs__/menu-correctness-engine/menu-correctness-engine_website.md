# Menu Correctness Engine — Website Content

**Version:** 3.1  
**Status:** Source-gated website evidence; not current launch certification
**Audience:** Website Content Writers, Designers  
**Last Updated:** February 14, 2026

---

> **Language Governance:** All content follows MenuList Language Governance v2.0.  
> No "AI-powered", "Smart", "Dynamic", "Helps you", "Recommends", "Optimized", "Advanced".  
> MenuList manages, runs, handles, verifies, ensures, guarantees.

---

## Current Launch Boundary

This website draft describes the current Menu Correctness Engine source contract and active runtime flag. It is not current launch certification and must not be published as a blanket guarantee that every surface has been externally certified.

Current website approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:public-business-truth`, browser/mobile save and publish-gate QA, customer-facing surface smoke for validated project data, public menu/device QA where the page references QR menus or screens, PDF artifact review where PDF copy is used, POS/provider smoke where POS copy is used, target deploy evidence, and production-host smoke.

Use this page only as source-gated website copy. When a surface has separate refresh, download, provider, or device timing, say it reads from the same verified project truth after that surface refreshes or is regenerated.

---

## 1. Hero Section

### Headline

**Your menu. Verified at save time.**

### Subheadline

Change a price once. MenuList verifies the menu state and keeps supported surfaces reading from the same project truth, with each surface updating through its own refresh, download, or provider flow.

### CTA

**Start Free** → [Sign up flow]

### Supporting Text (below CTA)

No setup needed. Works automatically from your first menu.

---

## 2. Problem Statement

### Section Title

**One change. Five surfaces. Zero guarantee it's all the same.**

### Body

You change a price in your menu. The QR code updates. But does the digital screen show the same price? Does the PDF your staff printed this morning? Does the POS system your cashier uses?

Most menu systems write changes and hope they sync. You're left checking each surface manually — or worse, finding out from a customer that your menu shows conflicting prices.

---

## 3. Solution Statement

### Section Title

**MenuList verifies before publishing. Every time.**

### Body

When you save your menu, MenuList checks that everything is complete, correct, and consistent before customer-facing publishing flows continue.

If something needs your attention, you'll know before it goes live. Not after a customer complains.

---

## 4. Feature Benefits (Outcomes, Not Features)

### Benefit 1: Consistent Prices Across Every Surface

**Title:** Same price. Every screen. Every printout. Every link.  
**Body:** Your QR menu, digital screen, PDF export, and POS connection all read from the same verified project truth after their normal refresh, download, or provider flow completes.
**Visual suggestion:** [Split screen showing QR code, digital screen, and PDF — all showing identical price for "Butter Chicken ₹350"]

### Benefit 2: Catch Errors Before Customers Do

**Title:** Issues caught at save time. Not at complaint time.  
**Body:** Missing item names, invalid prices, incomplete categories — MenuList catches these when you save, not when a customer points them out.  
**Visual suggestion:** [Simple validation message: "2 items need attention before publishing" with clear fix buttons]

### Benefit 3: Every Location, Same Menu

**Title:** All your outlets. One verified menu.  
**Body:** Master menu changes and outlet overrides are checked against the same verified project truth, so release QA can confirm each location receives the expected menu state.
**Visual suggestion:** [Map with 3-4 location pins, each showing the same menu card with identical prices]

### Benefit 4: Always Available, Never Blank

**Title:** Your menu is always visible. Even if something goes wrong.  
**Body:** If a normal cache fallback is available during a system issue, customers see the cached menu instead of a blank page. Screens and QR menus use fallback caching so the business can keep serving while the issue is handled.
**Visual suggestion:** [Phone screen showing complete menu with subtle "Verified" checkmark]

### Benefit 5: Zero Cost, Zero Effort

**Title:** No extra charges. No extra steps. Just correct menus.  
**Body:** Menu verification is built into MenuList at no additional cost. It runs automatically every time you save. No add-ons, no premium tiers, no monitoring dashboards. It just works.  
**Visual suggestion:** [₹0 icon with checkmark — "Included in every plan"]

---

## 5. How It Works (3 Steps)

### Step 1: Edit Your Menu

Make any change — update a price, add an item, mark something unavailable. Your workflow doesn't change at all.

### Step 2: MenuList Verifies

Every save is automatically checked for completeness and correctness. MenuList validates your data and marks it as verified.

### Step 3: Every Surface Updates

Your QR code, digital screen, PDF, POS, and website read from the same verified project truth through their own normal refresh or regeneration path.

---

## 6. Social Proof Slots

### Testimonial Slot 1

**[Screenshot placeholder]**  
"I used to check my QR menu, then the screen, then the PDF every time I changed prices. Now I just save and it's done everywhere."  
— _[Restaurant owner name], [City]_

### Testimonial Slot 2

**[Screenshot placeholder]**  
"We have 4 outlets. Before, price changes were a nightmare — one location always had the old price. Not anymore."  
— _[Chain operator name], [City]_

### Stat Slot

**[Number to be updated after launch]**  
"X menus verified daily across Y surfaces"

---

## 7. FAQ

### Q: Do I need to set anything up?

**A:** No. Menu verification works automatically from your first menu. No configuration, no settings, no toggles.

### Q: Does this slow down my editing?

**A:** No. Verification happens instantly when you save. Your editing experience is unchanged.

### Q: What happens if verification finds an issue?

**A:** You'll see a clear message telling you what needs fixing — like "Item X needs a price" or "Category Y has no items." Fix it and save again.

### Q: Does this work for all my surfaces?

**A:** Yes, supported surfaces read from the same verified project data. Each surface still follows its own refresh, download, provider, or device timing.

### Q: What if I have multiple locations?

**A:** Master menu changes and outlet overrides are verified through the same project truth. Multi-location releases still need target QA when outlet inheritance or publishing changes.

### Q: Is this included in my plan?

**A:** Yes. Menu verification is included in every MenuList plan. Correct menus are not a premium feature — they're a baseline expectation.

---

## 8. SEO Meta

### Page Title

Menu Correctness — Verified Menus Across All Surfaces | MenuList

### Meta Description

MenuList verifies menu state before customer-facing publishing flows continue. QR menus, screens, PDFs, and POS connections read from the same project truth.

### Keywords

menu consistency, verified menu, QR menu accuracy, digital menu sync, multi-surface menu management, restaurant menu system, menu correctness

### Open Graph Title

Your Menu. Verified at Save Time.

### Open Graph Description

Change a price once. MenuList verifies the menu state and keeps supported surfaces reading from the same project truth.

---

## 9. Visual Direction Notes

### Tone

Calm, confident, minimal. No urgency. No fear-based messaging. The visual should communicate "everything is handled."

### Color Palette

Use existing MenuList brand colors. No red/orange "alert" colors in hero or benefits sections. Verification should feel routine, not dramatic.

### Imagery

- Show real menu surfaces (phone with QR menu, TV screen, printed PDF) reading from the same project truth after their normal refresh or regeneration paths
- Use checkmarks sparingly — one per section maximum
- Show Indian restaurant context (₹ currency, familiar dishes, local restaurant setting)
- No stock photos of stressed restaurant owners — show calm, confident operators

### Animation (if applicable)

- Subtle: price changes rippling across surfaces simultaneously
- Not: dramatic "before/after" transformations or flashing alerts

---

_Document Classification: Public — Website Team_  
_This document follows MenuList Language Governance v2.0_  
_All content must be reviewed against `__docs__/constitution/02-language-governance.md` before publishing_
