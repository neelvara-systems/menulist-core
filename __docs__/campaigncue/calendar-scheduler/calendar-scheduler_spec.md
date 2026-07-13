# Calendar Scheduler - Spec

## Summary

Calendar Scheduler turns a public-use-eligible campaign pack into a visible manual-task calendar. It stores the owner's intended date/time and execution note; it does not execute a channel action.

The active runtime is a manual task calendar, not a provider scheduler. A task can carry a local date/time, channel, note, owner/staff assignee label, and task type (`post`, `print`, `staff_share`, `follow_up`, or `result_check`).

## Goals

- Help owners see what is planned or due.
- Keep manual channel, print, staff-share, follow-up, and result-check tasks together.
- Make the difference between a reminder and automatic publishing explicit.
- Route the owner back to result memory after manual use.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Calendar view | Owner can view the bounded workspace schedule list with channel, task type, assignee, and local time. |
| Approval-aware | Requested or rejected packs cannot be scheduled. Agency workspaces additionally require approved state. |
| Manual tasks | Manual Google/WhatsApp/ad/print/staff handoffs can create task reminders. |
| Staff execution | Owner can attach a non-sensitive assignee label and task type to the existing schedule document without creating a staff-task collection. |
| Explicit time | The owner must select a `datetime-local` value; CampaignCue never silently defaults to tomorrow or an inferred best time. |
| Derived due state | An elapsed `scheduledAt` is displayed as due from the already-loaded list; no due-status write or polling worker is required. |
| Timezone safe | Workspace timezone converts the selected local time to an ISO instant and drives display. |
| Truth safe | Scheduling a freshness-enabled pack rechecks the current source snapshot; stale or expired packs cannot be scheduled for manual public use. |
| Rhythm handoff | Campaign Rhythm shows due/scheduled counts and routes result follow-up through the existing Daily Desk. |

## Non-Goals

- It is not a generic project-management suite.
- It does not bypass channel-specific approval gates.
- It does not edit, reschedule, complete, retry, or cancel schedule records in the current UI.
- It does not guarantee exact platform publish timing; provider publishing is not active in the current runtime.

## Risks

- Timezone mistakes can show tasks at the wrong local time.
- Owners may confuse manual reminders with automatic publishing.
