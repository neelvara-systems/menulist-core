# SignalDesk AI Intelligence - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Output Validation Tests

| Test | Expected |
| --- | --- |
| AI returns invalid schema | Blocked and review item created. |
| AI omits evidence refs | Blocked or low-confidence review. |
| AI uses blocked source field | Blocked. |
| AI recommends send approval | Blocked. |
| AI marks consent as present without proof | Blocked. |

## Scoring Tests

| Test | Expected |
| --- | --- |
| Strong restaurant menu gap | High current-list gap score with evidence. |
| Salon service-list target | Fit accepted, not restaurant-only. |
| No evidence of list problem | Low current-list gap or hold. |
| Source policy blocked | Risk high and action held. |
| Suppressed contact | Contactability blocked. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Same evidence hash reruns immediately | Cache hit. |
| List page triggers AI for every row | Fails. |
| Worker runs without budget cap | Blocked. |
| Prompt includes full conversation history unnecessarily | Fails. |

## Compliance Tests

| Test | Expected |
| --- | --- |
| AI invents discount | Blocked. |
| AI claims official WhatsApp partnership | Blocked. |
| AI recommends Google Maps scraping as truth | Blocked. |
| AI recommends cold WhatsApp from public phone | Blocked. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile runs AI scoring | Not available. |
| Mobile approves AI output | Not available. |
| Mobile pauses AI worker | Allowed with audit. |
