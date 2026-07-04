# One Customer Link Preview

**Status:** Implemented V0 public tool and V1 owner readiness module
**Last Updated:** July 4, 2026
**Route:** `/tools/customer-link-preview`
**Local Source Gate:** `npm run verify:customer-link-preview`
**Family:** [Public Truth Tools](../public-truth-tools/README.md)

One Customer Link Preview helps an SMB owner see whether one customer-facing business link has the basics customers need before they call, visit, order, book, or ask a question.

It is not a website crawler, link monitor, ranking tracker, SEO audit, AI visibility check, social profile scanner, or external platform updater.

## Documentation Set

| Audience | File | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./customer-link-preview_spec.md) | Owner job, scope, V0/V1/V2 ladder, non-goals |
| Developers | [Implementation](./customer-link-preview_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./customer-link-preview_marketing.md) | Internal positioning for SMB conversations |
| Website | [Website](./customer-link-preview_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./customer-link-preview_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./customer-link-preview_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./customer-link-preview_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./customer-link-preview_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./customer-link-preview_validation.md) | Implementation parity record |

## Version Ladder

| Lane | Behavior | Status |
| --- | --- | --- |
| V0 | Public free tool. Owner enters a current or planned customer link, marks visible facts, and receives a browser-local preview report. | Implemented |
| V1 | Logged-in MenuList owner check. Uses existing MenuList public-link, business, action, hours, location, and menu facts inside Business Health. | Implemented |
| V2 | Paid add-on behavior: recurring link readiness reports, saved history, multi-location link previews, agency setup exports, or owner-approved managed setup. | Documented only |

## Runtime Files

| Surface | File |
| --- | --- |
| Public route | `src/app/(website)/tools/customer-link-preview/page.tsx` |
| Website component | `src/components/website/customerLinkPreview/CustomerLinkPreviewPage.tsx` |
| Report builder | `src/lib/public-truth-tools/customerLinkPreviewReport.ts` |
| Types | `src/lib/public-truth-tools/customerLinkPreviewTypes.ts` |
| Feature flag | `src/config/features.ts` (`ENABLE_PUBLIC_TRUTH_CUSTOMER_LINK_PREVIEW`) |
| Verifier | `scripts/verification/verify-customer-link-preview.js` |

## Boundary

V0 checks owner-entered fields and owner-selected facts only. It does not open links, fetch customer pages, inspect websites, inspect Google profiles, inspect social profiles, store reports, call AI providers, check rankings, scan search results, or update external platforms.

The optional follow-up form uses the existing `/api/public/contact` path after consent.
