# Customer Question Coverage Check

> **Status:** V0 source-gated evidence; not current launch certification
> **Last Updated:** July 4, 2026
> **Local Source Gate:** `npm run verify:customer-question-coverage-check`

---

## Purpose

Customer Question Coverage Check is a public MenuList tool for checking whether common customer questions have visible, owner-provided answers. It is a self-report tool, not a crawler, chatbot, AI search test, or customer-chat analyzer.

Runtime route: `/tools/customer-question-coverage-check`

## Version Ladder

| Version | Shape | Boundary |
| --- | --- | --- |
| V0 | Public browser-local self-report | No external fetch, no AI/provider calls, no customer conversation reads, no report storage |
| V1 | Owner Business Health card | Included through existing Business Health readiness modules and MenuList source truth |
| V2 | Paid recurring coverage report | Requires entitlement, retention, source policy, and cost approval before implementation |

## Source Files

| File | Role |
| --- | --- |
| `src/app/(website)/tools/customer-question-coverage-check/page.tsx` | Website route and structured data |
| `src/components/website/customerQuestionCoverageCheck/CustomerQuestionCoverageCheckPage.tsx` | Browser-local form, report, copy/download, and consented contact handoff |
| `src/lib/public-truth-tools/customerQuestionCoverageReport.ts` | Deterministic report builder |
| `src/lib/public-truth-tools/customerQuestionCoverageTypes.ts` | Report and boundary types |
| `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` | Owner Business Health readiness module |

## Hard Boundaries

- Links are format-checked only; they are not opened or fetched.
- Customer chats, external search, and AI answers are not checked.
- Reports are copied or downloaded locally; no report document is stored.
- Optional follow-up uses the existing bounded `/api/public/contact` route after explicit consent.

## Documentation

- [Spec](./customer-question-coverage-check_spec.md)
- [Implementation](./customer-question-coverage-check_impl.md)
- [Marketing](./customer-question-coverage-check_marketing.md)
- [Website](./customer-question-coverage-check_website.md)
- [Help Doc](./customer-question-coverage-check_helpdoc.md)
- [Firebase](./customer-question-coverage-check_firebase.md)
- [Mobile Support](./customer-question-coverage-check_mobile-support.md)
- [Test Cases](./customer-question-coverage-check_test-cases.md)
- [Validation](./customer-question-coverage-check_validation.md)
