# MenuList Activation Concierge - Test Cases

**Status:** Local source complete

| ID | Case | Expected |
| --- | --- | --- |
| AC-01 | unsupported onboarding source | starter activation does not apply |
| AC-02 | allowlisted action with valid ISO/Date/Firestore timestamp | counted once |
| AC-03 | unknown action key | ignored |
| AC-04 | allowlisted key with boolean/malformed/throwing timestamp | ignored; no crash |
| AC-05 | same external signal exists in action and presence maps | deduplicated |
| AC-06 | exactly one valid distinct action | 1 of 2; not activated |
| AC-07 | two valid distinct actions | activated |
| AC-08 | action write returns malformed acknowledgement | loaded state does not advance |
| AC-09 | action acknowledgement arrives after store switch | new store is unchanged |
| AC-10 | confirmation transaction sees current non-starter/paid state | presence writes, starter action does not |
| AC-11 | external confirmation removed | presence and matching action deleted atomically |
| AC-12 | desktop/mobile acknowledgement succeeds | banner/progress state refreshes without another read |
| AC-13 | SignalDesk workflow scan | no MenuList starter/presence mutations |
| AC-14 | route scan | no public Activation Concierge or SignalDesk website route |
| AC-15 | starter row has missing/malformed deadline | workspace and public surfaces fail closed as expired |
| AC-16 | malformed truthy `activePlanType` | does not bypass starter expiry |
| AC-17 | valid Firebase seconds/nanoseconds timestamp | admitted with millisecond precision |
| AC-18 | persisted object exposes timestamp methods only | methods are not invoked; value is rejected |
| AC-19 | compact count receives malformed evidence timestamps | matches detailed summary and counts zero |

Run `npm run verify:menulist-activation-concierge`, `npm run verify:menu-setup-progress-boundary`, and `npm run verify:menu-presence-monitor-boundary`.
