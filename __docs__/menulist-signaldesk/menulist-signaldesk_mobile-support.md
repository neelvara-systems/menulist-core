# MenuList SignalDesk - Mobile Support Assessment

**Status:** Initial assessment
**Created:** June 23, 2026
**Mobile relevance decision:** Partial
**Mobile posture:** Emergency controls and read-only summaries only.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Founder may need to check urgent safety/cost/channel health alerts. Normal work is desk-based. |
| Speed | Partial pass | Emergency pause can be under 5 seconds. Target review, evidence review, and approval cannot. |
| Touch | Partial pass | Kill switches and status summaries work on mobile. Dense evidence and message review do not. |
| Value | Partial pass | Emergency pause is useful away from desk. Normal operations require desktop accuracy. |

Decision:

```txt
Mobile = read-only status + emergency pause.
Desktop = source import, evidence review, AI scoring review, draft approval, inbox work, channel setup, policy setup, and reporting.
```

## Allowed Mobile Actions

| Surface | Allowed |
| --- | --- |
| Control room | View channel, source, cost, AI, suppression, and incident summaries. |
| Emergency stop | Pause all outbound. |
| Channel pause | Pause email/WhatsApp/Instagram/Messenger separately. |
| Campaign/source pause | Pause a campaign or source run. |
| Incident acknowledgement | Mark seen, add short note. |

## Blocked Mobile Actions

Mobile must not allow:

- importing targets;
- uploading CSV files;
- creating source policies;
- approving source-provider use;
- revealing full contact details;
- editing evidence packets;
- approving drafts;
- sending or exporting messages;
- replying from inbox;
- configuring sender domains;
- configuring WhatsApp or Meta providers;
- editing suppression records;
- launching campaigns;
- approving AI autonomy;
- recording or changing AI shadow-review decisions;
- starting or retrying AI Volume Mode;
- changing budgets except emergency pause;
- creating MenuList routes;
- mutating MenuList outcomes.

## Mobile Data Rules

Mobile reads summary docs only:

- `signaldeskTargetSummaries`
- `signaldeskApprovalQueue` counts only
- `signaldeskConversationSummaries` counts only
- `signaldeskChannelHealthSummaries`
- `signaldeskCostDailySummaries`
- `signaldeskIncidents`
- `signaldeskKillSwitches`
- `signaldeskDemandSignalSummaries`

No mobile reads:

- raw contact values;
- raw message bodies;
- source payloads;
- webhook payloads;
- AI prompts;
- full evidence packets;
- suppression proof details.

## UX Requirements

- 44px minimum touch targets.
- Destructive pause/resume confirmation.
- No dense tables.
- No horizontal scrolling for emergency controls.
- Stale-data warning when summaries are old.
- Clear active/inactive state for every pause.

The primary mobile-observe map is limited to Today, Conversations, Activations, and system health/Controls. Opportunities may be inspected through the read-only case drawer. Advanced configuration routes remain server-blocked on mobile even when opened directly.

## Acceptance Criteria

- Admin can pause all outbound from mobile within 5 seconds after login.
- Mobile cannot send, export, approve, or reveal raw PII.
- Mobile cannot configure providers.
- Mobile cannot edit source/channel policies.
- Mobile cannot approve WhatsApp or email governance.
- Mobile cannot record AI accept/edit/reject/hold evidence or founder-attention minutes.
- Mobile cannot start, retry, or change AI volume batches.
- Mobile shows only summary data.
- Mobile cannot create route tokens, record outcomes, create proof permissions, or schedule proof content.

## Manual Contact And Rejection Controls

- The Conversations manual-contact form is disabled by the shared `mobileReadOnly` action state.
- Approval rejection controls are disabled with the rest of Approval Queue mutations.
- Forced `record-manual-contact` requests are classified as `configure` and return `MOBILE_READ_ONLY_ACTION_BLOCKED` server-side.
- Mobile cannot turn a prepared export into a completed contact or store a rejection decision.
- Emergency pause remains the only admitted mobile mutation and does not bypass these restrictions.
