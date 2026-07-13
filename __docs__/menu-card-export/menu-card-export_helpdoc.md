# Menu Card Export — Help Documentation

**Status:** Source-gated support draft; not current launch or support-publication approval
**Audience:** MenuList owners
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Card Export evidence only. Current support publication or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, Digital Menu Output Constitution checks for print/menu outputs, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, applicable target deploy evidence, and production-host smoke.

> **Current collateral boundary (July 2, 2026):** These notes are source evidence only; they are not current sales, demo, support, website-publication, or launch approval. Current collateral approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, Digital Menu Output Constitution checks, `npm run verify:menu-card-export`, authenticated desktop/mobile browser QA, visual PDF and print-shop artifact review, provider smoke for the AI advisor where enabled, target deploy evidence, and production-host smoke.

---

## Quick Summary

Menu Card Export creates printable menu files from your current MenuList menu. Use it when you need a menu for in-house printing, WhatsApp, or a print shop.

---

## Before You Start

You need:

- A menu in MenuList.
- At least one visible item.
- Current prices saved in the menu.

---

## Create A Menu PDF

1. Open MenuList.
2. Go to **Use MenuList**.
3. Open **Menu Card Export**.
4. Choose the menu you want to export.
5. Choose what you need: **Home Print**, **WhatsApp PDF**, or **Print-shop packet**.
6. MenuList picks a layout for the current menu. Change it only if needed.
7. Review any warnings.
8. Check the preview.
9. Select **Create PDF**.
10. Download or share the file.

Screenshot needed: Menu Card Export route with style picker and preview.

---

## Choose The Right Style

| Style | Use When |
| --- | --- |
| Classic | Your menu has normal categories and item descriptions. |
| Compact | Your menu has many items and short descriptions. |
| Premium | Your menu is shorter and needs more space between items. |

MenuList starts with the style, spacing, and display options that fit the current menu. This keeps the PDF from feeling like a plain data printout while avoiding a design editor.

## Suggest A Layout

Pro and Premium accounts can select **Suggest layout** for an extra layout check. MenuList reviews the current PDF setup and recommends any safer preset, style, density, or display setting.

Review the suggestion, then select **Apply suggestion** if it looks right. The final PDF is still created from your saved MenuList menu.

---

## Check Warnings Before Printing

MenuList may show warnings before creating the file.

| Warning | What To Do |
| --- | --- |
| Missing prices | Add prices or confirm the menu can be printed without them. |
| Text may not fit | Use Compact style or turn off descriptions. |
| QR may be hard to scan | Use the suggested QR size or print one sample first. |
| Menu changed | Create the file again from the current menu. |
| Print margin issue | Use the suggested print-shop packet settings. |

---

## Export For WhatsApp

1. Open **Menu Card Export**.
2. Choose **WhatsApp PDF**.
3. Check the preview.
4. Select **Create PDF**.
5. Share the file from your phone.

Screenshot needed: Mobile export action.

---

## Send To A Print Shop

1. Open **Menu Card Export**.
2. Choose **Print-shop packet**.
3. Check the warnings and preview.
4. Select **Create packet**.
5. Send the downloaded packet to your printer.

The packet can include the menu PDF, printing notes, file details for the printer, and a QR test checklist.

Before printing many copies, ask the printer or staff to scan the QR code from one sample.

---

## When A PDF Shows `Menu Changed`

This means the menu was updated after the PDF was created.

To create a fresh file:

1. Open the old export.
2. Select **Create again**.
3. Download the new PDF.

---

## Troubleshooting

### The PDF has too many pages

Choose **Compact** style or turn off descriptions.

### The print shop asks for a print-ready file

Use **Print-shop packet** instead of the normal PDF.

### Some items are missing

Hidden items and unavailable items are not included by default.

### The PDF did not create

Try again. If it still does not work, contact support from the dashboard.

### The QR code opens the online menu

This is expected. The QR code points customers to the latest live menu.

---

## Need More Help?

Contact support from your MenuList dashboard.
