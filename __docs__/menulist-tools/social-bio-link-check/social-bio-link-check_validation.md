# Social Bio Link Consistency Check - Validation

**Status:** V0 validation evidence; not current launch certification
**Last Updated:** July 4, 2026
**Source Gate:** `npm run verify:social-bio-link-check`

## Current Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Public route exists | Pass | `src/app/(website)/tools/social-bio-link-check/page.tsx` |
| Browser-local report builder exists | Pass | `src/lib/public-truth-tools/socialBioLinkCheckReport.ts` |
| Types include hard boundary fields | Pass | `src/lib/public-truth-tools/socialBioLinkCheckTypes.ts` |
| Website component renders evidence text | Pass | `src/components/website/socialBioLinkCheck/SocialBioLinkCheckPage.tsx` |
| Docs live under MenuList Tools | Pass | `__docs__/menulist-tools/social-bio-link-check/` |
| Verifier exists | Pass | `scripts/verification/verify-social-bio-link-check.js` |

## Required Release Note

Current release approval still requires the active production-readiness audit, targeted TypeScript check, website locale check, docs link check, and browser smoke on the local route.

## Manual Smoke

1. Open `/tools/social-bio-link-check`.
2. Generate a report with no customer link.
3. Generate a report with a valid link, two placements, old link cleanup, and clear action.
4. Confirm the report says what was checked and what was not checked.
5. Confirm copy/download work locally.
6. Confirm optional contact handoff requires consent and security check when Turnstile is active.
