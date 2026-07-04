# PDF Surface — Internal Marketing Collateral

**Feature:** PDF Surface (Enhanced Menu PDF Generation)
**Version:** 2.1
**Last Updated:** 2026-03
**Audience:** Internal sales, onboarding, support teams

---

## Current Sales/Launch Boundary

This collateral is internal source evidence for the lightweight PDF Surface. It is not current launch certification, visual print artifact approval, or a sales guarantee. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:menu-export`, authenticated desktop/mobile Share screen QA, visual PDF artifact review, target deploy evidence, and production-host smoke.

Do not use fixed generation-speed, every-item, print-shop-quality, no-review, or stale-artifact freshness claims without release-specific evidence.

---

## One-Line Pitch

Download a versioned menu PDF generated from the current project data, then review the file before printing or sharing it.

---

## The Problem We Solve

Restaurant owners print menus from their phone or laptop. Without MenuList, this means:
- Exporting from a spreadsheet or WhatsApp screenshot
- Prices go stale the moment they change online
- The printed menu has no branding, no structure, no visual hierarchy
- The owner has no way to know if the PDF they're holding matches current prices

MenuList generates a print-ready PDF on demand, stamped with the current date and a version ID. The file is a generated artifact, so owners should review the PDF and replace older downloads or printed copies after menu changes.

---

## What Makes It Different

Traditional PDF tools give owners a blank canvas and ask them to design. MenuList keeps the lightweight PDF layout constrained and generated from the current project source so owners can review a consistent file without configuring a design tool.

| Feature | Manual design tools | MenuList PDF Surface |
|---------|--------------------|--------------------|
| Layout | Owner designs | System-decided |
| Source freshness | Only if owner remembers to update | Generated from the current project data at download time |
| Version tracking | Never | Every PDF has a version ID |
| Print quality | Depends on owner skill | Consistent generated layout for review |
| Time to print | 15-30 min design time | Requires release-specific timing evidence before quoting |

---

## Key Talking Points (Support / Sales)

1. **"It looks like a real menu card"** — Dark header band, dotted leader lines between items and prices, structured category sections. Not a plain list.

2. **"The version is clear"** — PDF is generated from the current project data at download time. The version ID in the footer lets owners (and customers) verify which menu version they're looking at.

3. **"Works from your phone"** — Owner can generate and download a PDF from the Share screen on mobile. No desktop required.

4. **"No setup needed"** — Owner does not configure layout, colors, or fonts in the lightweight PDF flow. Review the generated file before printing or sharing.

---

## Who Uses This

- Restaurant owners printing table menus
- Owners sending menu PDFs to delivery partners (Zomato, Swiggy onboarding)
- Staff needing a printed reference sheet
- Owners attaching menus to emails or WhatsApp broadcasts

---

## Language Governance (Mandatory)

All customer-facing communication about this feature must avoid:
- "AI-powered PDF" ❌
- "Smart layout" ❌
- "Optimized for printing" ❌

Use instead:
- "Print-ready menu" ✅
- "Generated from your current menu source" ✅
- "Download as PDF" ✅
