# SignalDesk Control Room - Implementation Plan

**Status:** Initial implementation blueprint
**Created:** June 23, 2026

## Suggested Future Modules

```txt
signaldesk/
  controlRoom/
    controlRoomTypes.ts
    healthSummaries.ts
    killSwitchService.ts
    incidentService.ts
    costSummaries.ts
    aiEvalSummaries.ts
    ControlRoomDashboard.tsx
    KillSwitchPanel.tsx
    IncidentQueue.tsx
```

## Data Flow

```txt
feature events and daily jobs
  -> update bounded health summaries
  -> detect thresholds
  -> create or update incidents
  -> apply kill switch when configured
  -> render control room from summaries
```

## Summary-First Rule

The dashboard must read derived summaries:

- channel health summary,
- queue summary,
- source health summary,
- AI eval summary,
- cost summary,
- incident summary,
- outcome summary,
- demand summary.

Raw event lists are only for drill-down and admin/debug workflows.

## Implementation Order

1. Define summary schemas and stale-state rules.
2. Implement kill-switch service.
3. Implement incident service.
4. Wire email rail health summaries.
5. Wire inbox and approval queue summaries.
6. Wire source and AI summaries.
7. Wire cost summaries.
8. Add control-room dashboard.
9. Add mobile emergency summary.

## Threshold Examples

| Threshold | Action |
| --- | --- |
| Complaint rate over limit | Pause affected channel and create incident. |
| Bounce rate over limit | Pause sender identity and create review item. |
| AI low-confidence spike | Pause AI auto-suggestions and create eval incident. |
| Source rejection spike | Pause source run and flag source policy review. |
| Firestore reads exceed planned budget | Flag cost incident and reduce raw views. |

## Guardrails

- Kill switches must be checked by sending, import, AI, and follow-up paths.
- Summary freshness must be visible.
- Admin controls require confirmation.
- Incident resolution requires note.
- No dashboard should encourage send volume as the primary success measure.
