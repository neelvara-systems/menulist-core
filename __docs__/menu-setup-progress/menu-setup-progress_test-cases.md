# Menu Setup Progress - Test Cases

**Status:** Local source complete
**Last reviewed:** August 14, 2026

| ID | Case | Expected |
| --- | --- | --- |
| MSP-01 | no loaded project; store has onboarding source | source incomplete; phase `start` |
| MSP-02 | selected project with malformed `files` | no crash; import incomplete |
| MSP-03 | selected project has categories exist but zero active items | menu imported incomplete |
| MSP-04 | active extracted items exist and prices are clear | import/details complete |
| MSP-05 | malformed or throwing `lastPublishedAt` | publish incomplete; no crash |
| MSP-06 | valid Firestore/Date/ISO publication timestamp | publish complete |
| MSP-07 | starter has exactly one recorded placement action | placement shows 1 of 2 and remains incomplete |
| MSP-08 | starter has two distinct valid timestamped actions | placement complete |
| MSP-09 | invalid action/presence timestamp values | evidence ignored |
| MSP-10 | owner removes external placement confirmation | matching action stops counting |
| MSP-11 | acknowledgement arrives after store switch | current store context unchanged |
| MSP-12 | non-starter menu is published | Link ready remains complete |
| MSP-13 | no translation signals | translation step omitted |
| MSP-14 | Mobile More root while setup is incomplete | one permission-compatible Menu setup shortcut after provider load |
| MSP-15 | all required steps complete while optional work remains | progress card suppressed; optional work stays in its normal surfaces |
| MSP-16 | setup card is visible | owner sees one next step and one action; no percentage, step-pill list, or optional checklist is rendered |

Run `npm run verify:menu-setup-progress-boundary` and `npm run verify:menulist-activation-concierge`.

## Location Launch Readiness

- An outlet store with incomplete menu setup returns `context: location_launch` and keeps the same one next required step.
- A master store without an outlet-linked project returns `context: menu_setup`.
- A project with `masterProjectId` returns `context: location_launch` even when the compact store payload omits `isMaster`.
- Disabling `ENABLE_LOCATION_LAUNCH_READINESS` changes only the outlet-facing title; required steps, routing, reads, and writes remain unchanged.
- Location mode must not render a full checklist, percentage, HQ approval, vendor/compliance task, or direct mobile route.

## August 14, 2026 Cross-check

- Desktop and Mobile More use the same helper result and the same five existing setup gates.
- Outlet detection is limited to `store.isMaster === false` or an outlet-linked project with `masterProjectId`.
- Activation evidence remains owned by the existing activation summary; its source verifier now follows the translated runtime contract.
- Corrected the Hindi `menuListRecorded` label to the protected product name `MenuList` and refreshed deterministic locale evidence. No locale key or runtime contract changed.
