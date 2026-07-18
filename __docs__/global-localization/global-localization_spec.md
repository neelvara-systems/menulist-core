# Global Localization Specification

**Status:** Implemented
**Last updated:** July 18, 2026

## Purpose

Every owner-facing desktop and MobileShell surface must display language, direction, dates, times, numbers, and currencies consistently without changing stored business truth.

## Three Separate Contracts

1. **Owner UI preference:** locale, timezone, date format, and time format are lightweight cookies. They control the dashboard presentation only.
2. **Business/store locale:** `timeZone`, `currencyCode`, `currencySymbol`, `dateFormat`, `timeFormat`, `activeLanguages`, and `defaultLanguage` are store truth. They control business/public output and are saved through the existing store DAL.
3. **Menu-content language:** names, descriptions, and generated translations use localized project fields. They are governed by the multi-language translation flow.

These contracts must not overwrite or infer one another.

## Required Behavior

- Supported UI locales come only from `APP_LANGUAGES`.
- Locale variants such as `pt_BR` normalize to the supported canonical value.
- Unsupported or malformed locale, timezone, date-format, and time-format preferences fail closed to documented defaults.
- The server fallback timezone is deterministic `UTC`; it never depends on a Vercel or local host timezone.
- Date/time display uses the selected owner timezone and formats. Storage remains ISO/UTC.
- Invalid calendar dates, invalid `HH:mm` values, and invalid timezones do not roll into another valid-looking value.
- Arabic, Persian, Hebrew, Kashmiri, Sindhi, and Urdu locales select RTL automatically. The existing manual RTL preference may still force RTL for an LTR locale.
- The document `lang` and `dir` attributes follow the resolved UI locale.
- Number grouping follows the UI locale. Currency format must always receive an explicit currency code from the owning billing/business contract.
- Missing translation keys fall back to the `en-US` message tree and do not crash the application.
- Every top-level MenuList owner namespace except separately governed `Website` and `CampaignCue` is key-complete in every registered locale file.
- Every owner message must preserve ICU variables exactly.
- Every checked-in non-English owner pack must match its semantic-evidence hash.
- Non-English values of 20 or more source characters must stay inside the bounded translated/source length ratio unless the source is an approved invariant.
- Exact `en-US` values are allowed only for protected brands, technical identifiers, ICU-only copy, or a locale-specific reviewed cognate.
- Machine-generated text that changes scripts, variables, product names, or meaning must be rejected rather than represented as completion.
- Desktop and MobileShell share the same preference and formatting helpers.

## Defaults

| Preference | Default |
| --- | --- |
| Locale | `en-US` |
| Timezone | `UTC` |
| Date | numeric day, short month, numeric year |
| Time | two-digit hour/minute, 12-hour clock |
| Direction | locale-derived LTR/RTL |

Source: `src/lib/localization/config.ts:11`.

## Non-goals

- No automatic translation of owner-created menu content.
- No persistence of UI preferences in Firestore.
- No timezone inference from IP/location.
- No new owner settings or duplicate mobile data layer.
- No public claim that every UI string has native human-reviewed translation.
- No unreliable or unsupported translation endpoint in the application or maintainer workflow.
- No runtime translation provider, model download, or owner-triggered system-UI translation.
