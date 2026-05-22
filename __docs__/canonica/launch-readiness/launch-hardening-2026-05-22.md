# Canonica Launch Hardening — 2026-05-22

## Scope

This pass hardened the eight launch items needed before paid Canonica onboarding:

1. Ticket/email notification verification.
2. Widget install verification end to end.
3. Signal-to-Knowledge Queue QA.
4. Ticket browser-log flow QA.
5. Launch-grade widget branding.
6. Ticket-to-knowledge extraction.
7. Product friction intelligence.
8. Basic usage/readiness summary.

## Product Decision

Canonica clients should see readiness and useful support-control actions, not raw Firebase/cache/internal operations. The client-facing surfaces therefore show:

- whether the widget is installed and recently seen,
- whether allowed origins and blocked routes are configured,
- whether support email notifications can be tested,
- whether knowledge, changelog, tickets, signals, and governance summaries are healthy,
- whether the widget matches the client's product branding enough for launch.

Raw logs, cache strategy, scheduler internals, and cost controls remain platform/operator concerns.

## Implementation Summary

| Item | Runtime decision | Cost posture |
| --- | --- | --- |
| Ticket/email notification verification | `/canonica/activation` has a Send Test Email action backed by `POST /api/canonica/notifications/test`. | One explicit store read + one rate-limit check + one notification log write per attempted test. No log scan. |
| Widget install verification | Existing runtime status and widget config remain the source. Activation and Widget Management show install status. | Runtime marker remains throttled and config uses short cache; no listeners. |
| Signal-to-Knowledge Queue QA | Manual Generate/Regenerate is exposed in governance and production clustering remains server-side. | No client signal scans; nightly caps draft work. |
| Ticket browser logs | Tickets capture sanitized recent browser logs plus capped user-agent debugging context on creation and expose raw + parsed context in details. | Logs/context are captured once at ticket creation, not streamed. |
| White-label / branding | Widget supports header title, accent color, greeting, launcher controls, and powered-by visibility. | Rides existing widget runtime config; no new collection/read/listener. |
| Ticket to knowledge | `ENABLE_CANONICA_TICKET_KNOWLEDGE` is enabled. Resolution signals use separate dedupe keys from ticket creation. | Requires 3+ resolved tickets/entity and max 5 drafts/night. |
| Product friction intelligence | `ENABLE_CANONICA_FRICTION_INTELLIGENCE` is enabled. Summaries are written by `canonicaNightly`. | UI reads compact `platformSummary` docs only. |
| Basic usage/readiness | Activation summary includes notification readiness and stays summary-backed. | No notification-log reads and no operational collection scans on page load. |

## Files Touched

- `src/components/templates/canonica/activation/CanonicaActivationCommandCenter.tsx`
- `src/lib/canonica/activationSummary.ts`
- `src/app/api/canonica/notifications/test/route.ts`
- `src/lib/notifications/index.ts`
- `src/lib/notifications/client.ts`
- `src/lib/notifications/templates.ts`
- `src/app/api/notifications/send/route.ts`
- `src/database/tickets/index.ts`
- `src/lib/canonica/widgetConfig.ts`
- `src/components/templates/canonica/widgetManagement/CanonicaWidgetManagement.tsx`
- `public/widget/canonica-widget.js`
- `src/app/widget/[apiKey]/WidgetClient.tsx`
- `src/lib/canonica/signalEmitter.ts`
- `src/config/features.ts`
- `functions-canonica/src/constants/features.ts`
- `firestore-canonica.rules`
- `firestore-canonica.indexes.json`

## Firebase Cost Notes

- Notification logs moved to `canonica_notificationLogs` for Canonica-owned events.
- Notification idempotency uses deterministic document IDs instead of a broad composite query.
- Ticket reply notifications do not call the notification API unless a recipient email exists.
- Status/test notification paths skip the dedupe read because their reference IDs are intentionally unique.
- Widget branding uses existing runtime config and does not introduce a white-label read model for v1.
- Friction intelligence and ticket knowledge remain inside the consolidated Canonica nightly scheduler.

## Verification Checklist

Run before paid launch:

- `npx tsc --noEmit --incremental false`
- `npm --prefix functions-canonica run build`
- Local `/canonica/activation`: load summary and verify Ticket Notifications card.
- Local `/canonica/widget`: save widget UI configuration, confirm snippet updates, confirm preview reflects header/accent/powered-by.
- Local ticket flow: create ticket, confirm browser logs are visible in details, reply/status update does not block if email fails.
- SMTP-configured environment: click Send Test Email and verify inbox delivery plus `canonica_notificationLogs`.
- Canonica nightly/manual trigger in staging: confirm friction and ticket-to-knowledge caps produce expected summary/proposal output from real signals.

## Remaining Launch Risk

The code path is ready for staging validation, but actual email delivery and real scheduler output still depend on environment configuration and real tenant data. Do not call paid-launch verification complete until the SMTP inbox test and one real signal-to-knowledge/friction run are observed in the Canonica QA Firebase project.
