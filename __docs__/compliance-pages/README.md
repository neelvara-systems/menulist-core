# Compliance Pages — Domain Activation Infrastructure

**Status:** 🟢 Runtime implemented; source verifiers active
**Feature Flag:** `ENABLE_COMPLIANCE_PAGES`
**Version:** 1.2
**Date:** July 2, 2026
**Last Hardened:** July 2, 2026
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

---

## Purpose

Static privacy policy, terms, and refund policy pages served on custom domains (`abc.com/privacy`, `abc.com/terms`, `abc.com/refund`) to satisfy platform verification requirements (Meta, Google, Razorpay) without turning OBP into a website builder.

**Identity:** Domain Activation Infrastructure — NOT a feature, NOT a CMS.

---

## Quick Navigation

| Doc                                                  | Audience    | Purpose                                       |
| ---------------------------------------------------- | ----------- | --------------------------------------------- |
| [Spec](compliance-pages_spec.md)                     | CEO / PM    | Business requirements, user flows             |
| [Implementation](compliance-pages_impl.md)           | Developers  | Technical blueprint, DB schema, API contracts |
| [Marketing](compliance-pages_marketing.md)           | Sales       | Internal pitch, positioning                   |
| [Website](compliance-pages_website.md)               | Public      | Landing page content                          |
| [Help Doc](compliance-pages_helpdoc.md)              | Customers   | Self-service help article                     |
| [Firebase](compliance-pages_firebase.md)             | DevOps      | Every read/write, cost estimates              |
| [Mobile Support](compliance-pages_mobile-support.md) | Engineering | Mobile admission test                         |

---

## Key Files in Codebase

| File                                                   | Purpose                                                |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `src/app/client/compliance/CompliancePageContent.tsx`  | SSR compliance page renderer                           |
| `src/lib/compliance/templates.ts`                      | Privacy, Terms, and Refund template generation + input extraction |
| `src/lib/compliance/sanitizer.ts`                      | Content sanitization for custom overrides              |
| `src/lib/auth/browserRequestPolicy.ts`                 | Shared authenticated browser request boundary          |
| `src/app/api/compliance/route.ts`                      | GET/POST compliance data (withAuth + Zod)              |
| `src/database/compliance/index.ts`                     | DAL functions (CRUD)                                   |
| `src/config/features.ts`                               | `ENABLE_COMPLIANCE_PAGES` flag                         |
| `src/app/client/[[...slug]]/page.tsx`                  | Route intercept for `/privacy`, `/terms`, and `/refund` |
| `src/app/client/obp/OBPResolvedSurface.tsx`            | OBP policy links                                       |
| `src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx` | Public menu policy links               |

---

## Feature Flags

| Flag                      | Default | Purpose                                 |
| ------------------------- | ------- | --------------------------------------- |
| `ENABLE_COMPLIANCE_PAGES` | `true` | Master kill switch for compliance pages |

---

## Architecture Summary

```
Custom Domain Request → Middleware → /client/privacy
                                   → /client/terms
                                   → /client/refund

Subdomain Request → brand.menulist.ai/privacy → same pages

Generation: Pure template substitution (zero AI, zero cost)
Storage: compliancePages collection (1 doc per store)
Override: Plain text only, sanitized, max 15K chars
Owner editor API calls: shared authenticated browser request policy, bounded response parsing
Local gate: npm run verify:compliance-pages-boundary
```

---

## Related Documentation

- [Official Business Page](__docs__/official-business-page/)
- [URL Routing Architecture](__docs__/url-routing-architecture/)
- [Reviews & Reputation](__docs__/reviews-reputation/)
- [ChatGPT Review](_archive/chatgpt-review-compliance-pages.md)
