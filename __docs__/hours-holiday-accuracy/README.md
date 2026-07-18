# Working Hours, Holidays, and Time Slots

**Status:** Current code-truth reference

**Last verified:** July 16, 2026

**Current Source Contract:** Working-hours status and time-slot presets are implemented from existing store/project truth. Holiday calendars and exception managers are not shipped runtime.

> **Launch boundary:** Not current launch certification or deploy approval. This README is source-gated working-hours and time-slot evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

Run `npm run verify:working-hours-boundary`. It includes deterministic weekly-hours tests. Also run `npm run test:time-slot-data-flow`, `npm run verify:hours-check`, exact TypeScript, scoped lint, documentation links, and diff integrity for a release candidate.

## Current Source Contract

- Current output covers public open/closed status from saved weekly working hours.
- `stores/{storeId}.workingHours` remains the weekly source as `sun` through `sat` keys with `HH:mm-HH:mm` values.
- `stores/{storeId}.timeZone` determines the store weekday and current minute.
- `ENABLE_HOURS_STATUS_DISPLAY` keeps the public status surface explicitly gated.
- Public open/closed status from saved weekly working hours uses one canonical evaluator. A Friday `22:00-02:00` range owns its Saturday after-midnight portion, and the close boundary is exclusive.
- Comma-separated historical ranges are read safely and rendered in structured data, but the owner editors intentionally manage one regular range per day. Editing one day preserves untouched historical ranges on other days.
- Desktop Business Settings and MobileShell support regular weekly-hour edits. Mobile Today supports a quick edit of the current store-timezone weekday.
- Store-level time-slot presets are reusable category windows. Category `days` restrictions use the weekday on which an overnight slot starts, and the end minute is exclusive.
- Decision Blocks use the same category time-slot evaluator as normal customer category rendering.
- Store writes use the existing DAL, acknowledgement, public-cache invalidation, and screen-version invalidation paths.
- Holiday calendars and date-specific exception managers are not shipped. For a one-off closure, use Temporary Status or today's hours.

## Surfaces

| Surface | Current behavior |
| --- | --- |
| Desktop owner | Seven-day regular-hours editor and time-slot preset manager |
| Mobile owner | Today status/edit, full seven-day editor, and preset manager inside `MobileShell` |
| Public menu | Current status and urgent status-boundary badge from store truth |
| Official Business Page | Current status, today's hours, and validated seven-day display |
| Structured data | One validated `OpeningHoursSpecification` per valid day range |
| Decision Blocks | Suppresses candidates whose category is outside its current slot |
| Screens and output control | Reuses the saved store hours and existing invalidation/read paths |

## Owner and Release Pending

- Authenticated desktop and MobileShell save/rollback smoke against a test store.
- Public menu and OBP smoke before, during, and exactly after normal and overnight boundaries in at least two store timezones.
- Preset create/edit/delete plus linked category rendering smoke.
- Approved app deployment and production-host verification.
- No holiday provider, calendar, date-exception manager, or provider sync is pending because none is part of the current product boundary.

## Maintained Documents

- [Specification](./hours-holiday-accuracy_spec.md)
- [Implementation](./hours-holiday-accuracy_impl.md)
- [Firebase cost](./hours-holiday-accuracy_firebase.md)
- [Mobile support](./hours-holiday-accuracy_mobile-support.md)
- [Help](./hours-holiday-accuracy_helpdoc.md)
- [Website](./hours-holiday-accuracy_website.md)
- [Marketing](./hours-holiday-accuracy_marketing.md)
- [Verification](./hours-holiday-accuracy_validation.md)
- Historical pre-audit narratives are preserved under [`_archive/pre-2026-07-16/`](./_archive/pre-2026-07-16/README.md).
