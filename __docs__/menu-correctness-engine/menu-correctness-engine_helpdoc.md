# Menu Correctness Engine — Help Documentation

**Version:** 3.1  
**Status:** Source-gated help evidence; not current launch certification
**Audience:** Restaurant Owners, Store Operators (Non-Technical)  
**Last Updated:** February 14, 2026

---

> **Writing Rules:**  
> Written for non-tech Indian SMB owners. Zero jargon. One action per step.  
> Follows MenuList Language Governance v2.0.

---

## Publishing Boundary

This help article is source-gated draft evidence for the current Menu Correctness Engine runtime. It is not current launch certification and should not be published until the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:public-business-truth`, browser/mobile save and publish-gate QA, public menu/device QA, PDF artifact review where PDF copy is included, POS/provider smoke where POS copy is included, target deploy evidence, and production-host smoke are recorded.

If published for owners, keep the customer-facing wording short and remove this internal boundary section from the public CMS copy.

---

## Quick Summary

MenuList checks supported project changes inside the save/publish or editor-gate path. Supported surfaces read from the same verified project data after their normal refresh, download, or provider flow completes.

You don't need to do anything to activate this. It works automatically.

---

## How It Works

When you save your menu in the editor:

1. MenuList checks that every item has a name, a valid price, and belongs to a category.
2. If everything is correct, your menu is marked as verified and customer-facing publishing flows continue.
3. If something needs fixing, you'll see a message telling you exactly what to fix.

That's it. No extra steps. No settings to configure.

---

## What Gets Checked

MenuList checks these things on the supported standalone mutation and editor-gate paths:

| Check            | What It Means                                                           |
| ---------------- | ----------------------------------------------------------------------- |
| **Item names**   | Every active item must have a name                                      |
| **Prices**       | Prices must be valid numbers (no negatives, no blanks for priced items) |
| **Categories**   | Every item must belong to a category that exists                        |
| **Languages**    | If you've added multiple languages, items should have translations      |
| **Completeness** | Your menu must have at least one file with items                        |

---

## What Happens If Something Needs Fixing

If MenuList finds an issue, you'll see a message like:

> "2 items need attention: Butter Chicken (missing price), Naan Basket (no category)"

**[Screenshot placeholder: Validation message in editor]**

### To fix it:

1. Read the message — it tells you exactly which items need attention.
2. Find the item in your editor.
3. Fix the issue (add the missing price, assign a category, etc.).
4. Save again.

Your menu can continue through customer-facing publishing flows once everything is correct.

---

## What Happens to Your Menu Surfaces

### QR Code / Website Menu

Your QR code and website read from the latest verified project data after the public menu cache refreshes.

### Digital Screens

Your digital screens refresh through their normal device polling and cache path.

### PDF Menu

When you download a PDF, it's generated from the latest verified menu. If your menu has changed since the last PDF download, the new PDF will have the updated data.

### POS System (If Connected)

Your POS connection receives menu data from the same project truth when the connected provider flow runs.

---

## For Multi-Location Owners

If you manage multiple outlets:

1. **Master menu changes** use the standalone validation path.
2. **Each outlet** resolves master data with its local overrides; the linked save route checks location scope and policy.
3. **Each outlet** should be checked in target QA when a release changes outlet inheritance, overrides, or location publishing.

Normal edits do not create an extra owner MCE task. Release teams should still run target QA when outlet inheritance or publishing behavior changes.

---

## Frequently Asked Questions

### Q: Do I need to turn this on?

**A:** No. The current flag is on. Standalone update/publish paths and the editor gate run local validation; linked outlet saves use their protected server route.

### Q: Will this slow down my editing?

**A:** No. The check happens in the background when you save. You won't notice any difference in speed.

### Q: What if I want to save even though there's a warning?

**A:** Your menu data is always saved. Warnings highlight areas for improvement but don't prevent the save. Your edits are not lost.

### Q: Can I see what was checked?

**A:** You'll only see messages when something needs your attention. If everything is correct, your menu is published silently. No news is good news.

### Q: My screen is showing an old price. What do I do?

**A:** Digital screens refresh through their normal polling path. QR and web menus refresh through their public cache path. If an issue persists after a few minutes, contact support.

---

## Tips

- **Save regularly.** Each save triggers a verification check. More saves = more verification.
- **Fix warnings promptly.** Even though warnings don't block your menu, fixing them ensures every surface shows the best version.
- **For normal edits, there is no separate MCE task.** Target-specific release QA still proves public, screen, PDF, and provider behavior.

---

## Related Features

- **[Menu Editor](/help/editor)** — Where you make menu changes
- **[Digital Screens](/help/digital-screens)** — How screens display your menu
- **[Multi-Location Management](/help/multi-outlet)** — Managing menus across outlets
- **[PDF Export](/help/pdf-export)** — Downloading printable menus

---

## Need Help?

If you see a verification message you don't understand, or if a surface is showing incorrect data:

1. **Take a screenshot** of the issue.
2. **Contact support** via the Help Chat in your dashboard.
3. **Include** which surface is incorrect (QR code, screen, PDF, etc.).

Our team can check the verification logs and resolve the issue quickly.

---

_Document Classification: Public — Customer Help Center_  
_Written for non-technical Indian SMB restaurant owners_  
_All content reviewed against `__docs__/constitution/02-language-governance.md`_
