# Menu Setup Progress - Test Cases

**Status:** Local source complete

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

Run `npm run verify:menu-setup-progress-boundary` and `npm run verify:menulist-activation-concierge`.
