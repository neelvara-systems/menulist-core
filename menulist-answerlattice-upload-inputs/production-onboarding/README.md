# MenuList Production Onboarding For Answerlattice

**Status:** Preparation pack for real production onboarding
**Client:** MenuList
**Answerlattice environment:** Production, after explicit founder/legal approval
**Primary output:** Correct live MenuList owner support in Answerlattice, plus meaningful Answerlattice dashboard data and website/demo assets based on MenuList as a real Answerlattice client.

## Purpose

This folder closes the gap between a knowledge-upload package and the actual launch path.

MenuList is not only sample content for Answerlattice. The intended launch story is:

1. MenuList is approved as a real Answerlattice production client.
2. MenuList production knowledge is imported into Answerlattice.
3. Answerlattice is connected to MenuList production owner surfaces through the existing widget embed path.
4. Answerlattice answers real MenuList SMB owner support questions from approved knowledge.
5. Answerlattice dashboard surfaces show real MenuList readiness, knowledge, surface, widget, and governance state.
6. Those dashboard states become the source for Answerlattice website, demo, and marketing screenshots.

## Files

| File | Purpose |
| --- | --- |
| `menulist-client-profile.json` | Machine-readable production client profile and launch constraints. |
| `onboarding-runbook.md` | Step-by-step operating checklist for legal approval, Answerlattice production setup, intake, widget install, dashboard proof, and screenshot capture. |
| `dashboard-demo-data-requirements.md` | The minimum meaningful Answerlattice state needed before taking website/demo screenshots. |
| `product-surface-map.csv` | MenuList routes and surfaces to create in Answerlattice Product Surfaces. |
| `widget-context-events.jsonl` | Safe page-context examples for MenuList owner routes. |
| `knowledge-output-targets.md` | Expected KB, FAQ, canonical, entity, support, and widget outputs after intake. |
| `production-data-safety.md` | Privacy, legal, and screenshot-scrub rules for using MenuList production data in Answerlattice assets. |
| `live-smb-support-coverage-checklist.md` | Coverage gate before live MenuList owners use Answerlattice for help. |
| `live-owner-support-test-questions.csv` | Thirty owner-style questions for pre-live Answerlattice answer review. |

## Answerlattice Surfaces To Fill

The production onboarding should create usable state in these Answerlattice dashboard areas:

- `/answerlattice/activation`
- `/answerlattice/dashboard`
- `/answerlattice/knowledge-intake`
- `/answerlattice/knowledge-base`
- `/answerlattice/faqs`
- `/answerlattice/governance`
- `/answerlattice/product-surfaces`
- `/answerlattice/widget`
- `/answerlattice/support-board`
- `/answerlattice/feedback`
- `/answerlattice/weekly-digest`

The main asset goal is not to make screenshots look busy. The goal is to show that Answerlattice has a real product client with imported knowledge, reviewed canonical answers, mapped product surfaces, live widget telemetry, and owner-controlled support signals.

The main support goal is stricter: live MenuList SMB owners must receive correct, bounded answers. If an answer is not covered by reviewed MenuList knowledge, Answerlattice should escalate and log a knowledge gap instead of guessing.

## Boundary

This is an onboarding and asset-preparation package. It does not itself create an Answerlattice tenant, issue a widget key, modify MenuList production env vars, or grant marketing consent.

Those actions must happen through the production Answerlattice dashboard, production environment configuration, and explicit approval steps in the runbook.
