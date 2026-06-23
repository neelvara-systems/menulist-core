# SignalDesk Control Room - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Objective

Give growth admins one summary-first surface to monitor SignalDesk safety, cost, quality, and operational load.

## Goals

1. Show channel health before sending volume increases.
2. Expose source quality and rejection trends.
3. Track AI eval quality, low-confidence rates, and override rates.
4. Monitor approval queue, inbox backlog, outcomes, demand, and incidents.
5. Provide admin kill switches for channel, source, AI, and global pause.
6. Keep dashboards cheap by reading summary documents only.

## Non-Goals

- No autonomous campaign optimizer.
- No public analytics surface.
- No raw event-stream dashboard.
- No bypass of approval, suppression, or source policy.
- No owner/customer MenuList dashboard.

## Dashboard Sections

| Section | Shows |
| --- | --- |
| System status | Global health, kill switches, open incidents. |
| Channel health | Email/export readiness, bounce, complaint, unsubscribe, pause state. |
| Source health | Source runs, rejected fields, expired rights, bad-data rate. |
| AI quality | Eval pass rate, override rate, low-confidence rate, prompt version. |
| Queue load | Approval backlog, inbox backlog, overdue work items. |
| Cost | AI calls, Firestore reads/writes, provider costs where available. |
| Outcomes | Activated outcomes, route-token health, attribution summaries. |
| Demand | Warm signals, referrals, hook health. |

## Kill Switches

| Switch | Scope |
| --- | --- |
| `global_pause` | Stops all non-read SignalDesk actions. |
| `channel_pause` | Stops a specific channel rail. |
| `source_pause` | Stops source imports/runs. |
| `ai_pause` | Stops AI scoring/drafting/classification. |
| `follow_up_pause` | Stops follow-up work creation. |

## Requirements

| ID | Requirement |
| --- | --- |
| CTRL-001 | Default dashboard reads summary collections only. |
| CTRL-002 | Kill switches require admin role and audit event. |
| CTRL-003 | Complaint thresholds must create or escalate incidents. |
| CTRL-004 | Cost summaries must separate AI, Firestore, and channel costs. |
| CTRL-005 | Stale summaries must show as stale, not healthy. |
| CTRL-006 | Admins must be able to see why sending is paused. |
| CTRL-007 | Incidents must have status, owner, severity, and resolution note. |

## Acceptance Criteria

- Admin can pause all sends from one global control.
- Dashboard loads without scanning raw messages/events.
- Complaint spike creates incident and pauses affected channel when threshold requires it.
- Cost summary shows daily AI and Firestore cost posture.
- Stale source or hook health is visible.
