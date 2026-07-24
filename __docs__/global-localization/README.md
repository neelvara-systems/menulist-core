# Global Localization and Time Display

**Status:** Implemented and source-gated
**Last updated:** July 19, 2026
**Scope:** Shared MenuList owner UI locale, timezone, date/time, number, currency-formatting, direction behavior, and compact public-customer UI copy

This folder documents the system-wide presentation boundary. Owner-entered menu/business content translation remains under `__docs__/projects/multi-language-translation/`; this folder now also governs the fixed customer-facing chrome around that content.

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

The canonical owner boundary is every top-level MenuList message namespace except the separately governed public `Website` and adjacent-product `CampaignCue` trees. It currently contains 3,456 strings across 49 namespaces and is key-exact across all 52 registered locale files: missing and obsolete locale-only owner keys both fail verification. The source gate also checks non-empty values, ICU syntax and variables, locale-file/registry parity, runtime dashboard fallback copy, canonical desktop/mobile settings and shell copy, known Odia mixed-script artifacts, and regression in the established translated dashboard/settings contract.

Business/store locale truth is also scope-safe in MobileShell: the locale editor remounts drafts by exact tenant/store, rejects same-mount duplicate saves, and applies optimistic state or rollback only when the current context still matches the initiating tenant/store and attempt. Delayed success/error/loading effects are discarded after unmount. This changes no locale schema, translation provider, Firestore operation count, or public cache contract.

All 50 non-English packs are semantic-evidence gated across the full owner boundary. Existing non-source owner copy was preserved. The current public-customer audit statically generated and English-round-trip checked 48 packs, while Bodo and Kashmiri use the pinned local IndicTrans2 workflow. It records 75 key-specific contextual corrections and 71 exact public values approved only as same-spelling cognates or unit formats. The remaining exact-source owner values are approved brands, technical identifiers, ICU-only values, or reviewed same-spelling cognates.

Fixed customer-facing chrome is generated from `BusinessSettings.publicCustomer` into a compact static bundle containing 337 messages across all 52 locale packs. OBP, public menu, item detail, Guest Feedback, compliance chrome, Customer App install and shortcut handoffs, starter/error/not-found recovery, metadata fallbacks, temporary-status defaults, and shared public media controls resolve from the owner-controlled store language. The bounded spice-level enum is localized; unknown owner values remain readable rather than being guessed. Menu/business content can use the full 80-language public registry; when one of those languages has no dedicated UI pack, content stays in the owner-selected language while fixed chrome falls back to `en-US`. No runtime translation provider or additional Firebase operation is used.

This is executable machine-generated coverage, not a claim that every sentence was written or certified by a native speaker. Runtime `en-US` fallback remains a safety behavior for a future missing key, but the checked-in owner packs have no unresolved non-invariant English fallback.

## Verify

```bash
npm run verify:owner-dashboard-locales
npm run verify:global-localization-boundary
npm run verify:public-customer-localization
npm run verify:website-resource-locales
npm run sync:owner-locale-keys
npx tsc --noEmit --incremental false --pretty false
```
