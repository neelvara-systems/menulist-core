# Owner Support Assistant - Mobile Support

> **Status:** RESPONSIVE SOURCE IMPLEMENTED - browser/device evidence pending
> **Created:** 2026-06-07
> **Surface:** Answerlattice responsive dashboard route, not MenuList mobile PWA shell

---

## Mobile Decision

Owner Support Assistant should be available on mobile through the Answerlattice dashboard responsive shell at `/answerlattice/support-assistant`.

The live client uses a single-column phone layout, wrapping prompt controls, bounded response parsing, and 44px refresh/input/submit/prompt/evidence/route actions. Mutation previews, destructive confirmations, ticket reply editing, and analytics-period cards below remain deferred because those runtime capabilities do not exist.

It should not be added to MenuList `MobileShell`, the MenuList More tab, or any `/help-center/*` mobile route. This is an Answerlattice owner/staff management feature, not a MenuList owner app feature and not a public widget.

---

## Admission Gate

| Gate | Verdict | Reason |
| --- | --- | --- |
| Frequency | Pass | Owners may need quick support health checks from a phone. |
| Speed | Pass with constraint | Initial load must be summary-only and avoid realtime listeners. |
| Touch | Pass with constraint | Actions must be 44px minimum and avoid dense table-only layouts. |
| Owner value | Pass | The feature reduces dashboard hopping when deciding what support gap needs review. |

---

## Required Mobile Behavior

- The question input remains visible without covering answer evidence.
- Suggested prompts wrap cleanly and do not require horizontal scrolling.
- Answer cards use stacked sections: answer, evidence, priority, action, limits.
- Dashboard support analytics cards use the same standard periods as the assistant: today, this week, last week, this month, and last month.
- Evidence cards show short labels and route links without long raw IDs.
- Primary actions use full-width or clearly tappable controls on phone widths.
- Drawer/contextual entry points collapse to full-screen panels on narrow screens.
- Long evidence lists collapse behind "Show details" when needed.
- Unsupported-action responses remain visible and do not look like errors.
- Action previews show target, change, risk, and confirmation in a single readable stack.
- Destructive or customer-facing actions require a second clear confirmation tap.
- Ticket reply drafts remain editable before send.

---

## Layout Contract

| Viewport | Contract |
| --- | --- |
| Phone | Single-column assistant surface, sticky input/action area only if it does not cover content. |
| Tablet | Two-column layout allowed: prompt/history rail and answer panel. |
| Desktop | Two-column or three-zone layout allowed: prompt rail, answer panel, context/evidence panel. |

Do not render wide governance tables inside the assistant. Link to existing review screens for table-heavy work.

Support analytics period cards must stack into single-column sections on phone widths. Do not use dense chart-only layouts for the first screen; use compact stat cards and route links to capped detail views.

---

## Touch Targets

All owner actions must be at least 44px high:

- Ask/submit
- Suggested prompt
- Open review screen
- Save plan
- Copy summary
- Confirm action preview
- Send reviewed ticket reply
- Show/hide evidence
- Clear question

Icon-only controls need accessible labels and tooltip/ARIA labels.

---

## Mobile Cost Contract

Mobile must not introduce a separate data path.

- Same query endpoint.
- Same summary packet.
- Same rate limits.
- Same feature flag.
- Same safe actions.
- Same typed action preview/execute endpoints.
- Same no-transcript rule.
- Same owner analytics summary packet for period stats.

No mobile-specific Firestore listener or route bypass is allowed.

---

## Test Matrix

| Case | Expected result |
| --- | --- |
| 375px phone route load | Summary cards fit without horizontal overflow. |
| 375px long question | Text area grows or scrolls without covering answer. |
| 375px evidence-heavy answer | Evidence collapses or stacks cleanly. |
| 375px unsupported request | Refusal and review route are readable and tappable. |
| 375px ticket reply preview | Draft text is editable and confirmation does not overlap evidence. |
| 375px ticket status change | Risk and target status are visible before the confirm button. |
| Tablet route load | Prompt and answer layout does not waste space or hide actions. |
| Slow network | Skeleton/loading state does not trigger repeated queries. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added mobile action-preview and confirmation requirements for ticket/status/reply actions. |
| 2026-06-07 | Added mobile support plan for responsive Answerlattice dashboard implementation. |
