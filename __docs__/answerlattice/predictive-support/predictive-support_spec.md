# Predictive Support And Known Issues Specification

**Status:** Implemented
**Last verified:** July 18, 2026

## Customer job

Help an end user notice relevant approved support while they are already on the affected product page, without interrupting unrelated workflows or claiming that engagement equals resolution.

## Product boundary

Predictive support may:

- match approved support to exact safe context;
- present a bounded cue through the existing widget;
- open approved content or a governed procedure;
- show a current known-issue notice;
- collect shown, opened, and dismissed evidence;
- create reviewable friction suggestions.

It must not:

- inspect unrestricted DOM or application state;
- identify a user with email or customer ID for cooldown;
- click controls or change account data;
- auto-publish a suggestion;
- auto-approve or auto-disable a trigger;
- describe engagement as task completion or support resolution.

## Trigger object

Required first-version fields:

| Field | Contract |
| --- | --- |
| `id` | Valid Firestore document ID |
| `pId`, `tId`, `sId` | Exact Answerlattice workspace ownership |
| `name` | 1-100 characters |
| `kind` | `predictive_help` or `known_issue` |
| `conditions.page` | Exact normalized page; required for active status |
| optional conditions | `feature`, `workflow`, `plan`, `userRole` |
| `action.type` | Allowlisted trigger action type |
| `priority` | Integer 0-100 |
| `cooldownHours` | Integer 1-720 |
| `status` | `draft`, `suggested`, `active`, `disabled`, or `archived` |
| `source` | `manual`, `friction_auto`, or `system` |
| `knownIssue` | Required only for known-issue behavior; bounded severity/window/public URL |

Runtime summaries exclude creator metadata, source context, friction details, effectiveness aggregates, and other server/advisory fields.

## Eligibility

A trigger is eligible only when:

1. the predictive feature and widget are enabled;
2. the widget credential is valid and authorized for the current origin;
3. the trigger is in the exact tenant/workspace summary;
4. status is `active`;
5. the exact page matches;
6. every supplied optional condition matches;
7. the known-issue window is current, if applicable;
8. ordinary prompt cooldown is not active;
9. the suggestion can be projected into the bounded public contract.

Highest priority wins, with deterministic ID ordering for ties.

## User experience

Predictive help appears as a bounded notice inside the existing widget experience. The loader may open or focus the widget when the user chooses the cue. A context change removes any stale suggestion from the previous page.

Known issues remain visible according to their active window and are not hidden by the ordinary prompt cooldown. They may link only to a public HTTPS status page accepted by the public URL boundary.

## Owner workflow

```text
create or receive suggestion
-> review wording and action
-> assign exact page and optional applicability
-> save
-> activate
-> inspect shown/opened/dismissed evidence
-> edit, disable, archive, or delete manually
```

System-generated friction candidates always enter as `suggested`. Owner review remains mandatory.

## Failure behavior

- Invalid key, scope, origin, context, trigger, or body: no suggestion.
- Rate-limit provider unavailable: predictive help fails closed.
- Summary overflow or malformed summary: do not serve the invalid replacement.
- Cooldown provider unavailable: ordinary prompts fail closed to avoid repeated interruption.
- Interaction signal disabled: return success with `recorded: false`.
- Suggestion response malformed or oversized: loader discards it and clears stale state.
- Known-issue timestamp or status URL invalid: reject the owner input or omit the invalid stored trigger from runtime admission.

Predictive failure never blocks the host product or ordinary support widget.

## Success measures

Use evidence that reflects actual behavior:

- eligible suggestion delivery rate;
- widget-open rate after a cue;
- dismissal rate;
- stale-context suppression rate;
- trigger mismatch or rejected-interaction rate;
- known-issue visibility during the intended window;
- downstream verified resolution or task completion, measured separately;
- owner review time and manual disable/edit rate.

Do not use suggestion count, click rate, containment, or ticket reduction alone as proof of customer value.

## Acceptance criteria

- Active triggers require exact page context.
- Generated suggestions cannot activate without owner review.
- Runtime input and output are bounded and strictly normalized.
- Workspace and origin are derived from authenticated widget truth.
- Interaction evidence is bound to a current matching trigger.
- No engagement event changes trigger status automatically.
- Stale page suggestions are cleared.
- Known issues enforce window and public HTTPS URL handling.
- Firestore rules reject forged scope, source, server evidence, kind changes, and cross-workspace mutations.
