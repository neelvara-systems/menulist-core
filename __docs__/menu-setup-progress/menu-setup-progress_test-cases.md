# Menu Setup Progress — Test Cases

## Desktop

| ID | Scenario | Expected |
| --- | --- | --- |
| MSP-01 | no project selected | card shows source/menu as next setup work |
| MSP-02 | project with no active items | source done, menu imported next |
| MSP-03 | project with items and missing prices | key details needs attention |
| MSP-04 | project with `lastPublishedAt` | published step done |
| MSP-05 | starter activation target met | link placed step done |
| MSP-06 | all required complete | card returns null in running state |
| MSP-07 | categories exist but zero active items | menu imported is not done |
| MSP-08 | multiple menu languages selected | translations appear as optional polish |

## Mobile

| ID | Scenario | Expected |
| --- | --- | --- |
| MSP-09 | MobileMenuScreen selected project loaded | setup card renders without extra project read |
| MSP-10 | next action is menu work | button stays inside mobile menu flow |
| MSP-11 | MobileShareScreen after publish | placement progress appears |
| MSP-12 | optional improvements remain | card shows optional count but does not block publish |
| MSP-13 | Mobile More root while setup is incomplete | Modules shows one Menu setup shortcut, not a new group |
| MSP-14 | Mobile More shortcut action is tapped | shell opens Menu, Share, or Official Page based on the next setup action |

## Boundary

| ID | Scenario | Expected |
| --- | --- | --- |
| MSP-15 | feature disabled | no setup card renders |
| MSP-16 | missing Menu Check signal | descriptions/images remain optional |
| MSP-17 | OBP photo missing | optional photo step is not required |
| MSP-18 | no new backend files | verifier passes |

---

**Created:** July 7, 2026
