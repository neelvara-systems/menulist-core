# SignalDesk Operating Layer - Mobile Support

**Status:** Desktop-first internal tool
**Created:** June 24, 2026
**Last Updated:** July 16, 2026

## Decision

Mobile support is partial.

The Mission screen may be read on mobile for emergency visibility, but creation, editing, and review actions remain desktop-first for the first build.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Founder may check daily, but not constantly. |
| Speed | Partial | Reviewing mission actions can be fast; creating experiments and policies is not. |
| Touch | Partial | Reading is thumb-safe; editing structured cards is not. |
| Value | Partial | Emergency pause/visibility has value away from desk. |

## Mobile Allowance

- View mission summary.
- View recent research table output.
- View blocked/risk actions.
- View an existing experiment's readback plan and founder decision.
- Keep the selected-card inspector available while experiment create, readback-edit, result-summary, and decision controls remain disabled.
- Use existing emergency kill switches through Control Room.

## Mobile Blocked

- Create experiment card.
- Edit comparison windows, primary metric, confounders, or next-readback time.
- Record an experiment result summary or submit repeat, narrow, hold, stop, or complete.
- Run Research Agent Table prompts or source-provider research.
- Edit offer/CTA.
- Edit reply playbook.
- Review sender/source/provider gates.
- Send/export/publish.
