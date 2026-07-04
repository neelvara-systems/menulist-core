# Social Bio Link Consistency Check

**Status:** Implemented V0 public tool; V1 maps to existing MenuList Share, Public Discovery, and Business Health readiness surfaces
**Last Updated:** July 4, 2026
**Route:** `/tools/social-bio-link-check`
**Local Source Gate:** `npm run verify:social-bio-link-check`
**Family:** [Public Truth Tools](../public-truth-tools/README.md)

Social Bio Link Consistency Check helps an SMB owner see whether social bios, public profiles, website links, QR codes, and print materials point customers to one current customer link.

It is not a social profile crawler, SEO audit, ranking tracker, social posting tool, reputation tool, AI visibility check, link monitor, or external platform updater.

## Documentation Set

| Audience | File | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./social-bio-link-check_spec.md) | Owner job, scope, V0/V1/V2 ladder, non-goals |
| Developers | [Implementation](./social-bio-link-check_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./social-bio-link-check_marketing.md) | Internal positioning for SMB conversations |
| Website | [Website](./social-bio-link-check_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./social-bio-link-check_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./social-bio-link-check_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./social-bio-link-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./social-bio-link-check_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./social-bio-link-check_validation.md) | Implementation parity record |

## Version Ladder

| Lane | Behavior | Status |
| --- | --- | --- |
| V0 | Public free tool. Owner enters a customer link, marks where it appears, and receives a browser-local consistency report. | Implemented |
| V1 | Logged-in MenuList owner check. Uses existing MenuList Share, Public Discovery, and Business Health surfaces instead of a duplicate owner module. | Mapped to existing owner surfaces |
| V2 | Paid add-on behavior: recurring link placement checks, saved history, multi-location profile-link reports, agency setup exports, or owner-approved managed cleanup. | Documented only |

## Runtime Files

| Surface | File |
| --- | --- |
| Public route | `src/app/(website)/tools/social-bio-link-check/page.tsx` |
| Website component | `src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/socialBioLinkCheckReport.ts` |
| Types | `src/lib/public-truth-tools/socialBioLinkCheckTypes.ts` |
| Feature flag | `src/config/features.ts` (`ENABLE_PUBLIC_TRUTH_SOCIAL_BIO_LINK_CHECK`) |
| Verifier | `scripts/verification/verify-social-bio-link-check.js` |

## Boundary

V0 checks owner-entered fields and owner-selected placement facts only. It does not open social profiles, fetch social profiles, inspect websites, inspect Google profiles, inspect QR destinations, inspect print materials, store reports, call AI providers, check rankings, scan search results, or update external platforms.

The optional follow-up form uses the existing `/api/public/contact` path after consent.
