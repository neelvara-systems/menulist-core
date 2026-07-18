# Global Localization and Time Display

**Status:** Implemented and source-gated
**Last updated:** July 18, 2026
**Scope:** Shared MenuList owner UI locale, timezone, date/time, number, currency-formatting, and direction behavior

This folder documents the system-wide presentation boundary. It does not document menu-content translation; that remains under `__docs__/projects/multi-language-translation/`.

## Documents

- [Specification](global-localization_spec.md)
- [Implementation](global-localization_impl.md)
- [Firebase and cost](global-localization_firebase.md)
- [Mobile support](global-localization_mobile-support.md)
- [Test cases](global-localization_test-cases.md)
- [Verification](global-localization_verification.md)
- [Owner help](global-localization_helpdoc.md)
- [Marketing boundary](global-localization_marketing.md)
- [Website boundary](global-localization_website.md)

## Authority

The active locale registry is `APP_LANGUAGES` in `src/constants/common.ts`. Preference validation and formatting defaults are centralized in `src/lib/localization/config.ts:4`. Request negotiation is in `src/i18n/request.ts:160`. Owner UI rendering uses the shared next-intl provider and helpers, while business/store locale fields remain separate public-business truth.

The canonical owner boundary is every top-level MenuList message namespace except the separately governed public `Website` and adjacent-product `CampaignCue` trees. It currently contains 3,119 strings across 49 namespaces and is key-exact across all 52 registered locale files: missing and obsolete locale-only owner keys both fail verification. The source gate also checks non-empty values, ICU syntax and variables, locale-file/registry parity, runtime dashboard fallback copy, canonical desktop/mobile settings and shell copy, known Odia mixed-script artifacts, and regression in the established translated dashboard/settings contract.

All 50 non-English packs are now semantic-evidence gated across the full owner boundary. Existing non-source copy was preserved; 122,117 values that still matched `en-US` were populated with pinned local models, followed by 826 bounded quality repairs for token loss, under-translation, overlong output, and non-invariant English residue. The remaining exact-source values are approved brands, technical identifiers, ICU-only values, or reviewed same-spelling cognates. Bodo and Kashmiri use the same evidence and quality gates as every other owner locale.

This is executable machine-generated coverage, not a claim that every sentence was written or certified by a native speaker. Runtime `en-US` fallback remains a safety behavior for a future missing key, but the checked-in owner packs have no unresolved non-invariant English fallback.

## Verify

```bash
npm run verify:owner-dashboard-locales
npm run verify:global-localization-boundary
npm run verify:website-resource-locales
npm run sync:owner-locale-keys
npx tsc --noEmit --incremental false --pretty false
```
