# Working Hours, Holidays, and Time Slots

**Status:** Current code-truth reference

**Last verified:** July 30, 2026

**Current Source Contract:** Weekly hours, owner-set date-specific special hours, status output, and time-slot presets are implemented from existing store/project truth. Automatic holiday calendars are not shipped.

> **Launch boundary:** Not current launch certification or deploy approval. This README is source-gated working-hours and time-slot evidence only; Hours release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:working-hours-boundary`, authenticated desktop/mobile working-hours save QA, customer-facing public menu/OBP hours output QA across timezone/open/closed/temporary-status cases, cache/deploy evidence for store-output writes, and production-host smoke.

## Source Gate

Run `npm run verify:working-hours-boundary`. It includes deterministic weekly-hours tests. Also run `npm run test:time-slot-data-flow`, `npm run verify:hours-check`, exact TypeScript, scoped lint, documentation links, and diff integrity for a release candidate.

## Current Source Contract

- Current output covers public open/closed status from saved weekly working hours.
- `stores/{storeId}.workingHours` remains the weekly source as `sun` through `sat` keys with `HH:mm-HH:mm` values.
- `stores/{storeId}.specialHours` is the bounded exact-date override source. It is keyed by store-local `YYYY-MM-DD`; each entry holds validated hours or an all-day closure plus an optional public occasion label.
- `stores/{storeId}.timeZone` determines the store weekday and current minute.
- `ENABLE_HOURS_STATUS_DISPLAY` gates the public status surface and `ENABLE_SPECIAL_HOURS` gates owner exception management.
- Public open/closed status from saved weekly working hours uses one canonical evaluator. A Friday `22:00-02:00` range owns its Saturday after-midnight portion, and the close boundary is exclusive.
- Comma-separated historical ranges are read safely and rendered in structured data, but the owner editors intentionally manage one regular range per day. Editing one day preserves untouched historical ranges on other days.
- Desktop Business Settings and MobileShell support regular weekly-hour edits. Mobile Today supports a quick edit of the current store-timezone weekday.
- Desktop Business Settings, mobile full-week hours, and Mobile Today remount by exact tenant/store. Delayed acknowledgement, rollback, loading, dialog and success state cannot settle into a newly selected store.
- Store-level time-slot presets are reusable category windows. Category `days` restrictions use the weekday on which an overnight slot starts, and the end minute is exclusive.
- Preset edits/deletes atomically persist the store change with a durable pending-cascade marker. Desktop and mobile reconcile the marker against the exact tenant/store project set, repeat required cache invalidation after partial progress, clear it only after acknowledged project/cache work, and retry an interrupted marker when that store screen is opened again.
- Decision Blocks use the same category time-slot evaluator as normal customer category rendering.
- Special hours are managed inside the existing desktop/mobile Working Hours surface. An exact-date entry replaces the weekly schedule for that complete store-local date and suppresses previous-day overnight carry.
- Store writes use the existing DAL, acknowledgement, and public-cache invalidation paths. Screens do not currently display hours, so a special-hours save does not advance the screen content version.
- Automatic holiday calendars and provider sync are not shipped. Owners choose each special date; Temporary Status remains the source for an unplanned live interruption.

## Surfaces

| Surface | Current behavior |
| --- | --- |
| Desktop owner | Seven-day regular-hours editor, special-date manager, and time-slot preset manager |
| Mobile owner | Today status/edit, full week plus special dates, and preset manager inside `MobileShell` |
| Public menu | Current status and urgent status-boundary badge from effective weekly/special truth |
| Official Business Page | Current status, today's effective hours, upcoming special dates, and validated weekly display |
| Structured data | Valid weekly `openingHoursSpecification` plus exact-date `specialOpeningHoursSpecification` |
| Public API and owner messages | Validated special-hour map and effective today-hours replies |
| Decision Blocks | Suppresses candidates whose category is outside its current slot |
| Output Control | Uses effective weekly/special truth with the existing freshness policy |
| Digital Screens | Does not currently render business hours; no hours claim is shown |

## Owner and Release Pending

- Authenticated desktop and MobileShell save/rollback smoke against a test store.
- Public menu and OBP smoke before, during, and exactly after normal and overnight boundaries in at least two store timezones.
- Preset create/edit/delete plus linked category rendering smoke.
- Approved app deployment and production-host verification.
- Authenticated special-date add/edit/remove smoke on desktop and MobileShell.
- No automatic holiday provider or third-party sync is pending because neither is part of the current product boundary.

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
