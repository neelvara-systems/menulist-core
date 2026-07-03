# Menu PDF Cleanup Check

**Status:** Implemented V0 public tool and V1 owner readiness module
**Route:** `/tools/menu-pdf-cleanup-check`
**Local Source Gate:** `npm run verify:menu-pdf-cleanup-check`
**Family:** [Public Truth Tools](../public-truth-tools/README.md)

Menu PDF Cleanup Check helps an SMB owner see whether an old menu, service, catalog, package, or rate-card PDF is still useful for customers or should be replaced with one current MenuList customer link.

It is not a PDF parser, OCR tool, file upload tool, website crawler, SEO audit, AI visibility check, or external platform updater.

## Documentation Set

| Audience | File | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./menu-pdf-cleanup-check_spec.md) | Owner job, scope, V0/V1/V2 ladder, non-goals |
| Developers | [Implementation](./menu-pdf-cleanup-check_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./menu-pdf-cleanup-check_marketing.md) | Internal positioning for SMB conversations |
| Website | [Website](./menu-pdf-cleanup-check_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./menu-pdf-cleanup-check_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./menu-pdf-cleanup-check_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./menu-pdf-cleanup-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./menu-pdf-cleanup-check_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./menu-pdf-cleanup-check_validation.md) | Implementation parity record |

## Version Ladder

| Lane | Behavior | Status |
| --- | --- | --- |
| V0 | Public free tool. Owner enters where an old PDF is used, whether it is current/readable/actionable, and optional current customer link. Browser-local report only. | Implemented |
| V1 | Logged-in MenuList owner check. Uses selected/default MenuList project truth and customer-link readiness to show whether MenuList can replace old PDFs. | Implemented |
| V2 | Paid add-on behavior: recurring PDF cleanup report, saved history, multi-location PDF replacement reports, agency exports, or owner-approved managed repair. | Documented only |

## Runtime Files

| Surface | File |
| --- | --- |
| Public route | `src/app/(website)/tools/menu-pdf-cleanup-check/page.tsx` |
| Website component | `src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/menuPdfCleanupReport.ts` |
| Types | `src/lib/public-truth-tools/menuPdfCleanupTypes.ts` |
| Owner readiness module | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` |
| Verifier | `scripts/verification/verify-menu-pdf-cleanup-check.js` |

## Boundary

V0 checks owner-entered PDF references and owner-selected facts only. It does not upload files, parse PDFs, run OCR, open links, fetch external URLs, call AI providers, scan search results, store report state, or update external platforms.

The optional follow-up form uses the existing `/api/public/contact` path after consent.
