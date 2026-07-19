# Answerlattice Guided Workflows Test Cases

> **Last verified:** 2026-07-18

## Contract Tests

| Case | Expected |
|---|---|
| Valid completed outcome | Accepted only when completed steps equal total steps |
| Incomplete outcome without blocked step | Rejected |
| Target-missing outcome without target | Rejected |
| CSS selector as target | Rejected |
| Unknown request field | Rejected |
| Retry with a new client request ID | Same server idempotency key |
| Procedure with valid target/event | Accepted |
| Procedure with selector-like target | Rejected |
| Old widget config | `guidedResolutionEnabled === false` |
| Intake procedure with matching answer type | Accepted |
| Intake procedure attached to explanation | Rejected |
| Intake procedure removed while answer type remains procedure | Rejected |
| Legacy intake item without procedure fields | Remains readable |
| Canonical explanation/navigation proposal with procedure payload | Rejected |
| Canonical procedure proposal without procedure payload | Rejected |

## Public Endpoint Tests

| Case | Expected |
|---|---|
| Feature disabled | 404 before processing |
| Missing/malformed key | 401 |
| Missing `widget:feedback` scope | 401 |
| Cross-product credential | 401 |
| Mismatched workspace scope | 401 |
| Workspace toggle disabled | 404 |
| Disallowed origin or runtime token | 403 |
| Body over 4 KB | 413 |
| Invalid strict schema | 400 |
| Signal mutation disabled | 200, `recorded: false`, no history read/write |
| Missing/non-widget/non-canonical history | 404, no signal |
| Valid terminal outcome | One deduplicated signal |
| Expired search history | 404, no signal |
| Missing/invalid served procedure snapshot | 409, no signal |
| Mismatched step count, blocked step, target, event, context, or widget session | 409, no signal |

## Host Runtime Tests

| Case | Expected |
|---|---|
| Exact semantic target exists | Non-interactive highlight appears |
| Duplicate target where first match is hidden | Hidden match ignored; visible match selected |
| Selected target becomes hidden | Existing overlay is hidden |
| Target appears during bounded retry | Host finds it without a MutationObserver |
| Target missing after bounded retry | Host reports missing; written step remains |
| More than 500 marked targets | Scan stops at 500 |
| Matching expected event | Current step advances once |
| Event-gated step | Manual Next/Finish action is unavailable |
| Wrong/stale event | Ignored |
| Route or context changes | Active highlight/session clears |
| Widget hide/close | Highlight clears |
| Reduced motion | No smooth scrolling |
| Forged window message | Rejected by source/origin check |
| Attempted action execution | No action API or click path exists |

## MenuList Reference Client

| Case | Expected |
|---|---|
| Target/event registry | Unique semantic IDs only |
| Reference procedure | Every target/event exists in the registry |
| Desktop and mobile source wiring | Every registered target/event has a real call site |
| Import start | Emitted after accepted existing/new job |
| Review completion | Emitted after acknowledged apply result |
| Publish completion | Emitted after acknowledged project write |
| Publish verification | Emitted only for `status === "OK"` |
| Browser SDK build | Source, JavaScript distribution, and declarations expose event/state helpers |
| Server/mobile without widget | Event helper safely returns `false` |

## UI Tests

- Owner toggle defaults off and persists through existing widget-config save flow.
- Guided Steps tab shows semantic target and event examples.
- Procedure editor preserves existing warnings, prerequisites, and slug.
- Guide controls remain usable at narrow mobile width.
- Completion, target missing, and escalation use clear non-technical copy.
- **Still stuck** opens the explicit support form; the escalated outcome is sent only after ticket creation succeeds.

## Deployment Smoke Required

For each enabled workspace:

1. Load the widget from an allowed origin.
2. Ask a question with an approved canonical procedure.
3. Start the guide on desktop and mobile.
4. Verify target highlighting and no host-page click interception.
5. Emit the expected event after the client confirms state.
6. Complete one guide and escalate one blocked guide.
7. Verify one terminal signal per session and no duplicate on retry.
