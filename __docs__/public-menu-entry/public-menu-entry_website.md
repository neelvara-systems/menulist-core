# Public Menu Entry - Website Content

**Status:** Local source complete; release evidence pending
**Last reviewed:** August 7, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. Preview status checks are 5 seconds apart, capped at 36, and end in an explicit retry state. Cleanup preserves the source attached to an expired claimed draft. Approved app release remains pending.

## Metadata

- **Title:** Create Your Digital Menu | MenuList
- **Description:** Sign in, add a current menu photo, PDF, or supported public link, review the prepared menu, and create one owner-controlled public link.
- **Canonical:** `https://app.menulist.ai/create-menu` in production and `https://app.menulist.digital/create-menu` in QA; both are `noindex`

## Hero

**Turn your current menu into one clean public link**

Sign in, add a clear menu photo, a PDF up to 15 pages, or a public menu link you have permission to use, and review the prepared menu before it is created.

**CTA:** Create your menu

## Source and review copy

Choose a photo or PDF from your saved files, take a menu photo, or paste a supported public page, PDF, or image link. MenuList prepares a review first. Nothing is published anonymously.

The customer link reflects the version the owner approved and published. For later menu edits, save the approved edit from Projects; publish design or page changes when needed. Customer-facing menus can take up to 60 seconds to refresh.

## FAQ

**Do I need an account?**
The owner-app page is reachable before sign-in, but upload, link acquisition, extraction, preview polling, claim, and publish require sign-in.

**Does this start a paid plan?**
No. The setup preview and claim do not start Razorpay checkout. Plan selection remains in Billing.

**What happens if processing takes longer?**
The page checks every 5 seconds for up to 36 checks and then offers Try Again.

**Can an existing owner use it?**
Yes, when the account has current Menu Extraction and Publish Menu permissions. The new menu is added to the current store.
