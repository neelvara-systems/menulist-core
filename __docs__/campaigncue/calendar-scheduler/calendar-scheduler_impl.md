# Calendar Scheduler - Implementation

## Runtime Contract

Calendar Scheduler must be CampaignCue-scoped and scheduler-bounded. It should use compact schedule indexes and job leases rather than scanning all campaign documents.

## Flow

1. Campaign output is approved for one or more channels.
2. Owner selects publish date/time or manual task date.
3. Scheduler stores schedule record with timezone, channel, output ref, and execution mode.
4. Due-job runner claims bounded jobs by time window.
5. Channel adapter executes publish or marks manual reminder due.
6. Result event updates campaign, calendar, and analytics queues.

## Data Objects

| Object | Purpose |
| --- | --- |
| `campaignSchedules` | Scheduled channel actions and manual tasks. |
| `campaignScheduleJobs` | Execution records, leases, retries, and final status. |
| `campaignReminders` | Owner-visible manual tasks and follow-ups. |
| `campaignCalendarIndexes` | Compact date/channel indexes for calendar views. |

## Current Runtime

- `POST /api/campaigncue/campaigns/[campaignId]/actions` with `action: "schedule"` writes a manual schedule record.
- The workspace app reads a bounded schedule list through `GET /api/campaigncue/workspace`.
- No Cloud Scheduler or direct publish runner is active.
- Schedule records are manual tasks, not automatic publishing jobs.

## Scheduler Rules

- Use workspace timezone at schedule creation and execution display.
- Claim jobs with lease fields to avoid duplicate execution.
- Keep retry limits per channel.
- Do not execute publish if approval or trust status has changed.
- Mark future provider failures visibly and preserve export/download output.

## Acceptance

- Calendar loads without scanning every campaign.
- Manual tasks are clearly not automatic publishes.
- Failed jobs produce visible status and no duplicate publish.
