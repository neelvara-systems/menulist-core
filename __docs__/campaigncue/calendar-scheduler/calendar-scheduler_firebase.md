# Calendar Scheduler - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/schedules/{scheduleId}` | Manual schedule task records created by campaign actions. |

Logical expansion:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaignSchedules` | Workspace schedule records. |
| `campaigncueWorkspaces/{workspaceId}/campaignScheduleJobs` | Due-job execution, leases, retries, and status. |
| `campaigncueWorkspaces/{workspaceId}/campaignReminders` | Manual tasks and owner reminders. |
| `campaigncueWorkspaces/{workspaceId}/campaignCalendarIndexes` | Compact date/channel indexes. |

## Cost Guardrails

- Query by due time and status, never scan all campaigns.
- Use per-job leases and retry counters.
- Store compact calendar index docs by month and channel.
- Avoid real-time listeners for large calendars; load visible ranges.
- Batch status updates where a provider returns multiple results.

## Security

- Workspace membership required for calendar access.
- Scheduler execution must run under server authority with workspace validation.
- Manual task notes can include operational details and must not be public.
