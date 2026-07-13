# Calendar Scheduler - Firebase Notes

## Active Collection

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/schedules/{scheduleId}` | Manual schedule task records created by campaign actions. |

`CampaignCueCampaignRhythm` is derived from the schedule list already present in the workspace response. It is not another document or collection.

## Operation Budget

| Owner action | Reads | Writes |
| --- | ---: | ---: |
| Open Calendar / derive due state | 0 incremental | 0 |
| Open Campaign Rhythm | 0 incremental | 0 |
| Create manual reminder | Existing campaign/idempotency reads plus the conditional current-source snapshot recheck for freshness-enabled packs | One batch containing the schedule, campaign update, event, and idempotency completion |

There is no polling query, realtime listener, due-status write, Cloud Scheduler invocation, provider call, or monthly calendar index.

## Cost Guardrails

- Keep the overview schedule query bounded by the shared CampaignCue page-size constant.
- Derive due state in memory from `scheduledAt` instead of writing a status transition.
- Keep one schedule collection; do not add reminder, job, lease, or calendar-index collections while delivery remains manual.
- Keep schedule creation in the existing idempotent batch.
- Add pagination or a compact month summary only if real workspace volume proves the bounded list insufficient.

## Security

- Workspace membership required for calendar access.
- Schedule creation runs under server authority with workspace validation.
- Manual task notes can include operational details and must not be public.
- Notes and assignee labels must not contain customer contact lists or provider credentials.
