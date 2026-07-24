# SignalDesk Control Room - Implementation

**Status:** Implemented
**Revalidated:** July 21, 2026

## Runtime Map

| Boundary | Authority |
| --- | --- |
| Overview read/projection | `src/lib/signaldesk/server.ts` |
| Workspace section admission | `src/app/api/signaldesk/workspace/route.ts` and `src/database/signaldesk/index.ts` |
| Pause mutation | `src/app/api/signaldesk/kill-switches/route.ts` and `setSignalDeskKillSwitchServer` |
| Desktop/mobile shared UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Client retry coordination | `src/hooks/signaldesk/useSignalDeskOverview.ts` |
| Kill-switch/overview emulator | `scripts/verification/test-signaldesk-kill-switch-overview.js` |

## Read Flow

The overview reads:

1. the canonical control summary;
2. the canonical queue summary;
3. today's cost summary;
4. eleven canonical kill-switch documents in parallel; and
5. one bounded query for `open` or `acknowledged` incidents.

The Controls workspace then reads only budget policies, provider accounts, run
timelines, and self-service CTAs. It deliberately does not call the dashboard
common loader or load targets, approvals, conversations, outcomes, demand rows,
research runs, or research-table rows.

All overview objects pass strict product, identity, enum, numeric, timestamp and
allowlist projection before returning to the browser. Legacy summary identity is
repaired only when the old row is otherwise valid.

## Pause Transaction

For a new actor/idempotency key, one transaction reads the claim, current scope
document and today's strict cost summary, then writes:

1. the exact current scope document;
2. one classification-only audit event;
3. one actor/request-bound completed claim; and
4. the exact-replaced daily cost summary with `firestoreWriteEstimate + 4`.

An exact retry returns the stored result and writes zero records. Changed facts
under one key conflict. Foreign or malformed current pause truth fails closed.

## UI Boundary

The page shows summary cards, operating/safety/incident panels, confirmed pause
controls, advanced navigation, run timelines, CTAs and investment holds. Ant
Design confirmation is required before activation or recovery. The incident badge
uses the exact unresolved count, while the list remains capped.

The feature flag hides both route aliases and navigation and rejects the Controls
workspace read. It does not disable existing pause enforcement or emergency pause
infrastructure.
