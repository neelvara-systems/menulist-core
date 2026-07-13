# Calendar Scheduler - Implementation

## Runtime Contract

Calendar Scheduler is CampaignCue-scoped and manual-only. It reuses the bounded schedule list already loaded by the workspace overview and the existing campaign action route.

## Flow

1. Owner opens a public-use-eligible campaign pack and chooses Schedule.
2. Calendar selects that campaign and requires a local date/time.
3. Owner optionally chooses a non-sensitive assignee label and task type.
4. `POST /api/campaigncue/campaigns/[campaignId]/actions` with `action: "schedule"` validates the payload, trust/freshness gate, and agency approval gate.
5. The server writes one `schedules/{scheduleId}` document in the same idempotent batch as campaign/event state.
6. Daily Desk derives due/scheduled rhythm from the already-loaded bounded list. CampaignCue never executes the task.

## Data Objects

| Object | Purpose |
| --- | --- |
| `CampaignCueSchedule` | Existing manual task record in `campaigncueWorkspaces/{workspaceId}/schedules/{scheduleId}`. |
| `CampaignCueCampaignRhythm` | Derived in-memory next-action view with due/scheduled counts; never persisted. |

## Current Runtime

- `POST /api/campaigncue/campaigns/[campaignId]/actions` with `action: "schedule"` writes a manual schedule record.
- The workspace app reads a bounded schedule list through `GET /api/campaigncue/workspace`.
- The owner must choose a date/time; the UI does not invent one.
- Elapsed scheduled tasks render as due without a Firestore write.
- No Cloud Scheduler, Cloud Task, lease, retry record, provider adapter, or direct publish runner is active.
- Schedule records are manual tasks, not automatic publishing jobs.

## Scheduler Rules

- Use workspace timezone at schedule creation and display.
- Require trust and freshness recheck before creating the reminder.
- Block requested/rejected approval states; require approved state in agency mode.
- Keep note and assignee text non-sensitive and bounded by request validation.
- Preserve the manual export/download fallback as the only active delivery mode.

## Acceptance

- Calendar uses the existing bounded overview and adds no read.
- Manual tasks are clearly not automatic publishes.
- Due state is derived without a scheduler write.
- Repeat submissions stay protected by the existing action idempotency ledger.
