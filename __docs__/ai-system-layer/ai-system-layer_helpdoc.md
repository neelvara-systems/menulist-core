# AI System Layer — Help Documentation

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** Source-backed help draft — not current publication or launch approval
**Last Updated:** July 26, 2026
**Audience:** Public (customer-facing)

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Customer-Facing Relevance

The AI System Layer is **internal infrastructure**. Customers do not interact with it directly.

The July 26 provider/runtime migration does not add a customer setting, screen, or new promise. Existing owner review and retry behavior remains the customer-facing contract.

However, customers may notice its effects through:
- **Managed menu processing** — Supported paths use shared provider and model guards
- **Clear failure handling** — Supported operations use bounded retries and fixed owner-safe errors
- **Review before publishing** — Generated or extracted content remains owner-reviewed

---

## Quick Summary

MenuList can use automatic processing to prepare a structured menu draft from supported inputs. Provider capacity or configuration can delay or stop processing, so the owner reviews the result and follows the displayed retry path when needed.

---

## FAQ

### Why did my menu take longer to process?

Processing can take longer or fail when an input is unclear or the external provider is unavailable, rate-limited, or out of quota. Follow the status shown on screen; retry only when the page offers that action. Do not assume an unfinished job will always complete.

### What if extraction fails?

If processing fails, you'll see a clear error message. Common fixes:
1. **Upload a clearer photo** — Avoid blurry or dark images
2. **Try a smaller file** — Very large images take longer
3. **Wait a moment and retry** — Temporary issues resolve quickly

### How does MenuList read my menu?

MenuList uses advanced processing to read text from your menu images. It identifies categories, items, prices, and descriptions automatically. You can review and edit anything before publishing.

---

## Tips & Best Practices

1. **Good lighting** — Take menu photos in bright, even lighting
2. **Flat surface** — Lay the menu flat to avoid shadows and curves
3. **One page at a time** — Multiple clear pages are better than one blurry panorama
4. **Check the quality score** — After processing, review the quality indicator before editing

---

## Related Help Articles

- How to upload your menu
- Understanding the quality score
- Editing extracted menu data
- Translating your menu to multiple languages

---

## Need Help?

Email support@menulist.ai if you experience repeated processing issues.

---

_Document Status: Source-backed help draft; not current publication or launch approval._
