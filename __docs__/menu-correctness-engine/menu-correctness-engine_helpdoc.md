# Menu Correctness Engine — Help Documentation

**Version:** 3.1  
**Status:** ✅ IMPLEMENTED — READY FOR HELP CENTER  
**Audience:** Restaurant Owners, Store Operators (Non-Technical)  
**Last Updated:** February 14, 2026

---

> **Writing Rules:**  
> Written for non-tech Indian SMB owners. Zero jargon. One action per step.  
> Follows MenuList Language Governance v2.0.

---

## Quick Summary

MenuList automatically checks your menu every time you save it. It makes sure all your menu surfaces — QR code, website, digital screen, PDF, and POS — show the exact same, correct menu.

You don't need to do anything to activate this. It works automatically.

---

## How It Works

When you save your menu in the editor:

1. MenuList checks that every item has a name, a valid price, and belongs to a category.
2. If everything is correct, your menu is published to all surfaces at once.
3. If something needs fixing, you'll see a message telling you exactly what to fix.

That's it. No extra steps. No settings to configure.

---

## What Gets Checked

MenuList checks these things every time you save:

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

Your menu will be published to all surfaces once everything is correct.

---

## What Happens to Your Menu Surfaces

### QR Code / Website Menu

Your QR code and website always show the latest verified menu. When you save a correct menu, it updates within 30 seconds.

### Digital Screens

Your digital screens refresh automatically with the verified menu. No manual action needed.

### PDF Menu

When you download a PDF, it's generated from the latest verified menu. If your menu has changed since the last PDF download, the new PDF will have the updated data.

### POS System (If Connected)

Your POS webhook receives the same verified menu data that customers see. One menu, every system.

---

## For Multi-Location Owners

If you manage multiple outlets:

1. **Master menu changes** are verified before reaching any outlet.
2. **Each outlet** receives a verified copy of the master menu with any local overrides applied.
3. **No outlet** will show a partially updated or stale master menu.

You don't need to manually check each outlet after changing the master menu.

---

## Frequently Asked Questions

### Q: Do I need to turn this on?

**A:** No. Menu verification is always on. It works automatically every time you save.

### Q: Will this slow down my editing?

**A:** No. The check happens in the background when you save. You won't notice any difference in speed.

### Q: What if I want to save even though there's a warning?

**A:** Your menu data is always saved. Warnings highlight areas for improvement but don't prevent the save. Your edits are not lost.

### Q: Can I see what was checked?

**A:** You'll only see messages when something needs your attention. If everything is correct, your menu is published silently. No news is good news.

### Q: My screen is showing an old price. What do I do?

**A:** Digital screens refresh automatically via version polling. QR/web menus update within 30 seconds of saving. If an issue persists after a few minutes, contact support.

---

## Tips

- **Save regularly.** Each save triggers a verification check. More saves = more verification.
- **Fix warnings promptly.** Even though warnings don't block your menu, fixing them ensures every surface shows the best version.
- **Don't worry about checking surfaces manually.** MenuList validates your menu every time you save.

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
