# Create Your Menu - Help

**Status:** Local source complete; approved release evidence pending
**Last reviewed:** August 7, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The publicly reachable `/create-menu` owner-onboarding route uses the canonical MenuList app host, is `noindex`, and is omitted from marketing sitemap/LLM discovery; source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

**Local result:** Local source complete. The preview checks progress every 5 seconds for up to 36 checks, then offers Try Again. An expired claimed draft record can be cleaned without removing the menu photo used by the created menu. Approved app release remains pending.

## Start

1. Open **Create your menu**.
2. Sign in with the owner account.
3. Choose a clear JPEG, PNG, or WebP menu photo, a PDF up to 10MB and 15 pages, or paste a public menu link you own or have permission to use.
4. Wait for the structured preview and review the items and prices.
5. Confirm the business name and optional public contact details. New accounts also enter city or area; existing accounts reuse their saved location.
6. Create the menu.

## If progress takes too long

MenuList checks every 5 seconds and stops after 36 checks. Select **Try Again** to resume checking. If the draft expired, upload the source again.

## After creation

The success screen shows the official page and menu link. You can copy or share them, then continue to the dashboard. If the screen shows **Publish**, click **Publish**. Customer menus can take up to 60 seconds to refresh after later edits.

The free setup does not start a Razorpay payment. Plans and subscription choices remain in Billing.

## Common problems

- **Sign-in requested:** processing is tied to an owner account; the page itself is public, extraction is not anonymous.
- **Photo rejected:** use JPEG, PNG, or WebP within 10MB and choose a real image, not a renamed file.
- **PDF rejected:** use one valid, unlocked PDF within 10MB and 15 pages. Split a longer PDF or use clearer page images.
- **Link rejected:** use a publicly accessible page/PDF/image and confirm permission. Login, CAPTCHA, private-network, or unsafe redirects are not supported.
- **Account setup incomplete:** sign out and sign in again so tenant/store membership can refresh.
- **No permission:** ask the account owner for Menu Extraction and Publish Menu access.
- **Invalid price or phone:** correct the source/contact and retry; unsafe values are not published.
