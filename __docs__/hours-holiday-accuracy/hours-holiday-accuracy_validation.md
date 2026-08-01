# Working Hours, Holidays, and Time Slots — Verification

**Result:** Local source complete on July 30, 2026

**Release status:** Owner/deployment/browser/device evidence pending

## Verified Source Behavior

- Canonical weekly-hours parser and evaluator rejects malformed/equal ranges.
- Previous-day overnight carry and current-day start attribution are correct.
- Exact closing time is closed.
- Multiple historical day ranges render safely without changing the owner schema.
- OBP status delegates to the canonical engine.
- Mobile Today uses the store timezone and refreshes each minute.
- Desktop empty/partial maps retain seven editable rows.
- Unrelated Business Settings saves do not write hours.
- Desktop/mobile editors preserve untouched legacy ranges.
- Full mobile success copy follows DAL acknowledgement.
- Mobile/desktop time-slot overlap policy matches.
- Decision Blocks share the normal category time-slot evaluator.
- Structured data and FAQ output omit malformed hours.
- Store DAL validates weekday keys and range shapes before Firestore.
- Special dates are bounded, normalized, and evaluated in the store timezone.
- Exact-date closure suppresses weekly/prior-overnight truth for that complete date.
- Public projection, OBP, menu status, owner messages, API output, and JSON-LD share normalized special-hour truth.

## Focused Gates

- `npm run verify:working-hours-boundary`
- `npm run test:time-slot-data-flow`
- `npm run verify:hours-check`
- `npm run verify:public-business-truth`
- `npm run verify:menulist-api-tenant-safety`
- `npm run verify:mobile-shell-route-map`
- `npx tsc --noEmit --pretty false`
- scoped ESLint for touched source and verifier files
- `npm run docs:check-links`
- `git diff --check`

## Deterministic Cases

| Case | Expected |
| --- | --- |
| Friday `22:00-02:00`, Friday 23:00 | Open |
| Friday `22:00-02:00`, Saturday 01:00 | Open from Friday |
| Friday `22:00-02:00`, Saturday 02:00 | Closed |
| Saturday `22:00-02:00`, Saturday 01:00 | Closed; opens Saturday 22:00 |
| Friday-only category slot, Saturday 01:00 | Visible |
| Saturday-only overnight slot, Saturday 01:00 | Hidden |
| Slot exact end | Hidden |
| Invalid `99:00-17:00` | Hours not available; structured data omitted |
| Overlapping preset definitions | Accepted |
| Weekly open plus exact-date closed | Closed for the exact store-local date |
| Exact-date different hours | Exact-date range wins |
| Prior special overnight with no current exception | Carries into the next date |
| Current exact-date closure after prior overnight | Closure wins; no carry |
| Invalid date/range/extra entry key | DAL/public projection rejects or omits |

## Pending Owner/Release Evidence

- Authenticated desktop and MobileShell mutation/rollback smoke.
- Real public menu and OBP boundary smoke in multiple timezones.
- Desktop/mobile special-date add/edit/remove and Today override smoke.
- iOS/Android PWA and desktop browser QA.
- Approved app deployment, cache observation, and production-host smoke.

No Firebase rules, indexes, Storage rules, or Cloud Function source changed in this audit. No Firebase or Vercel deployment was performed.
