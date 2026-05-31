# MenuList Production Onboarding For Canonica

**Status:** Preparation pack for real production onboarding  
**Client:** MenuList  
**Canonica environment:** Production, after explicit founder/legal approval  
**Primary output:** Correct live MenuList owner support in Canonica, plus meaningful Canonica dashboard data and website/demo assets based on MenuList as a real Canonica client.

## Purpose

This folder closes the gap between a knowledge-upload package and the actual launch path.

MenuList is not only sample content for Canonica. The intended launch story is:

1. MenuList is approved as a real Canonica production client.
2. MenuList production knowledge is imported into Canonica.
3. Canonica is connected to MenuList production owner surfaces through the existing widget embed path.
4. Canonica answers real MenuList SMB owner support questions from approved knowledge.
5. Canonica dashboard surfaces show real MenuList readiness, knowledge, surface, widget, and governance state.
6. Those dashboard states become the source for Canonica website, demo, and marketing screenshots.

## Files

| File | Purpose |
| --- | --- |
| `menulist-client-profile.json` | Machine-readable production client profile and launch constraints. |
| `onboarding-runbook.md` | Step-by-step operating checklist for legal approval, Canonica production setup, intake, widget install, dashboard proof, and screenshot capture. |
| `dashboard-demo-data-requirements.md` | The minimum meaningful Canonica state needed before taking website/demo screenshots. |
| `product-surface-map.csv` | MenuList routes and surfaces to create in Canonica Product Surfaces. |
| `widget-context-events.jsonl` | Safe page-context examples for MenuList owner routes. |
| `knowledge-output-targets.md` | Expected KB, FAQ, canonical, entity, support, and widget outputs after intake. |
| `production-data-safety.md` | Privacy, legal, and screenshot-scrub rules for using MenuList production data in Canonica assets. |
| `live-smb-support-coverage-checklist.md` | Coverage gate before live MenuList owners use Canonica for help. |
| `live-owner-support-test-questions.csv` | Thirty owner-style questions for pre-live Canonica answer review. |

## Canonica Surfaces To Fill

The production onboarding should create usable state in these Canonica dashboard areas:

- `/canonica/activation`
- `/canonica/dashboard`
- `/canonica/knowledge-intake`
- `/canonica/knowledge-base`
- `/canonica/faqs`
- `/canonica/governance`
- `/canonica/product-surfaces`
- `/canonica/widget`
- `/canonica/support-board`
- `/canonica/feedback`
- `/canonica/weekly-digest`

The main asset goal is not to make screenshots look busy. The goal is to show that Canonica has a real product client with imported knowledge, reviewed canonical answers, mapped product surfaces, live widget telemetry, and owner-controlled support signals.

The main support goal is stricter: live MenuList SMB owners must receive correct, bounded answers. If an answer is not covered by reviewed MenuList knowledge, Canonica should escalate and log a knowledge gap instead of guessing.

## Boundary

This is an onboarding and asset-preparation package. It does not itself create a Canonica tenant, issue a widget key, modify MenuList production env vars, or grant marketing consent.

Those actions must happen through the production Canonica dashboard, production environment configuration, and explicit approval steps in the runbook.
