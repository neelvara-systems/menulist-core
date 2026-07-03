# Google Profile Basics Checklist

**Status:** Implemented V0 public tool; V1 maps to existing Google profile handoff owner module
**Route:** `/tools/google-profile-basics-checklist`
**Local Source Gate:** `npm run verify:google-profile-basics-checklist`
**Family:** [Public Truth Tools](../public-truth-tools/README.md)

Google Profile Basics Checklist helps an SMB owner see whether the Google Business Profile facts they maintain are ready for customers and connected to one current MenuList customer link.

It is not a Google crawler, ranking tracker, listing manager, review tool, SEO audit, AI visibility check, or external platform updater.

## Documentation Set

| Audience | File | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./google-profile-basics-checklist_spec.md) | Owner job, scope, V0/V1/V2 ladder, non-goals |
| Developers | [Implementation](./google-profile-basics-checklist_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./google-profile-basics-checklist_marketing.md) | Internal positioning for SMB conversations |
| Website | [Website](./google-profile-basics-checklist_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./google-profile-basics-checklist_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./google-profile-basics-checklist_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./google-profile-basics-checklist_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./google-profile-basics-checklist_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./google-profile-basics-checklist_validation.md) | Implementation parity record |

## Version Ladder

| Lane | Behavior | Status |
| --- | --- | --- |
| V0 | Public free tool. Owner self-reports whether core Google profile basics are present and enters an optional current customer link. Browser-local report only. | Implemented |
| V1 | Logged-in MenuList owner check. Uses existing `google_profile_handoff` readiness module to show whether a live MenuList customer link exists and whether owner-confirmed handoff is done. | Implemented through existing owner module |
| V2 | Paid add-on behavior: recurring profile-link readiness reports, multi-location handoff exports, agency setup reports, or owner-approved managed setup. | Documented only |

## Runtime Files

| Surface | File |
| --- | --- |
| Public route | `src/app/(website)/tools/google-profile-basics-checklist/page.tsx` |
| Website component | `src/components/website/googleProfileBasicsChecklist/GoogleProfileBasicsChecklistPage.tsx` |
| Report builder | `src/lib/public-truth-tools/googleProfileBasicsReport.ts` |
| Types | `src/lib/public-truth-tools/googleProfileBasicsTypes.ts` |
| Owner readiness module | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` (`google_profile_handoff`) |
| Verifier | `scripts/verification/verify-google-profile-basics-checklist.js` |

## Boundary

V0 checks owner-entered fields and owner-selected facts only. It does not open Google, fetch Google Search, fetch Google Maps, inspect a Business Profile, update Google, check rankings, inspect reviews, call AI providers, store report state, or update external platforms.

The optional follow-up form uses the existing `/api/public/contact` path after consent.
