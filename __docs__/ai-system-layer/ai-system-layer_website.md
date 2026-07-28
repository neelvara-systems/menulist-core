# AI System Layer — Website Content

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** Source-backed internal website reference; not current publication or launch certification
**Last Updated:** July 26, 2026
**Audience:** Public (if applicable)

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Website Relevance

The AI System Layer is **internal infrastructure**. It has **no direct customer-facing website content**.

The July 26 provider migration requires no website copy or route change. Model names, SDK versions, transport names, and vendor pricing stay internal.

However, its benefits can be referenced in broader MenuList messaging:

---

## Current Website/Launch Boundary

Any public use of the indirect references below requires the active production-readiness audit, the External Certification Runbook, `npm run verify:menu-extraction-pipeline`, `npm run verify:ai-accounting`, Provider smoke for the target extraction model and environment, authenticated desktop/mobile upload and extraction-review QA, target deploy evidence, production-host smoke, and release-specific evidence before using numeric speed, accuracy, page-count, language-count, or volume claims.

Do not use this infrastructure doc to publish speed claims, all-format claims, all-field automatic extraction claims, or publish-without-review claims.

---

## Indirect Website References

### For the "How It Works" Page

**Step: Upload Your Menu**

> Upload a photo or PDF of your menu. MenuList reads common menu structure into a review draft after processing. Review and publish the approved menu before customers see it.

_Note: No mention of "AI" or "Gemini" — this is MenuList's Language Governance requirement. The system "reads" the menu, not "AI processes" it._

### For the Features Page

**Automatic Menu Reading**

> Take a photo of your printed menu. MenuList prepares items, prices, and categories for owner review. Check the draft, edit what needs fixing, then publish the approved menu.

### For the Reliability Section (if applicable)

> Supported processing paths use shared retries and fixed failure handling. If processing cannot complete, MenuList keeps the current approved menu unchanged and shows the available retry path.

---

## SEO Meta (Not Applicable)

This feature does not have a dedicated landing page. SEO considerations are handled at the feature level (menu extraction, translations, etc.).

---

## Language Governance Compliance

All customer-facing text follows `__docs__/constitution/02-language-governance.md`:

| Forbidden | Use Instead |
|-----------|-------------|
| "AI-powered extraction" | "Automatic menu reading" |
| "Smart processing" | "Menu processing" |
| "Intelligent system" | "Managed processing" |
| "Gemini AI" | Never mention externally |

---

_Document Status: 📝 DOCUMENTED — Internal infrastructure, minimal website relevance_
