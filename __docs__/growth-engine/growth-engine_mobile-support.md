# Growth Engine - Mobile Support Assessment

**Status:** Planning only
**Mobile relevance decision:** Partial
**Mobile posture:** Emergency visibility and pause controls only; no campaign creation or outbound approvals on mobile for first implementation.

---

## 1. Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Admin may need to check urgent alerts daily, but most work is desk-based. |
| Speed | Partial pass | Emergency pause can complete under 5 seconds; campaign review cannot. |
| Touch | Partial pass | Kill switches and status chips work on mobile; lead review and message approval require dense context. |
| Value | Partial pass | Founder may need to pause outbound away from desk. Operators should use desktop for accuracy. |

Decision:

```txt
Mobile = emergency control and read-only status.
Desktop = source runs, campaigns, dry-runs, inbox, approvals, operator work.
```

## 2. Allowed Mobile Surfaces

| Mobile surface | Allowed actions |
| --- | --- |
| Growth status | View active campaigns, channel health, cost state, safety alerts. |
| Emergency stop | Pause all outbound. |
| Channel pause | Pause email/WhatsApp/Instagram/Messenger separately. |
| Campaign pause | Pause a campaign. |
| Incident acknowledgement | Mark that an admin saw an incident. |

## 3. Blocked Mobile Actions

Mobile must not allow:

- creating source runs
- importing CSVs
- creating campaigns
- approving campaign launches
- editing templates
- revealing full contact details
- sending email
- opening WhatsApp assisted send
- replying from inbox
- changing provider settings
- changing budget policy except emergency pause

## 4. UX Requirements

- 44px minimum touch targets.
- Clear destructive confirmation for pause/kill-switch actions.
- No dense tables.
- No horizontal scrolling for critical controls.
- No hidden send/approve action behind a swipe gesture.
- Status text must fit on small mobile screens.
- Emergency controls must show current active/inactive state.

## 5. Data Requirements

Mobile reads only summary docs:

- `growthEngineCampaignSummaries`
- `growthEngineChannelHealthSummaries`
- `growthEngineIncidents`
- `growthEngineKillSwitches`
- `growthEngineCostAttributions` latest summary

No mobile raw lead, message, source payload, or event-list reads.

## 6. Security

- Same internal/admin auth as desktop.
- No separate mobile auth.
- Role checks for emergency actions.
- Full contact details hidden.
- Every pause/resume action logs actor, time, scope, and reason.

## 7. Acceptance Criteria

- Mobile can pause all outbound in less than 5 seconds after login.
- Mobile cannot launch a campaign.
- Mobile cannot reveal raw PII.
- Mobile cannot send messages.
- Mobile shows stale-data warning if summaries are old.
- Desktop remains the only surface for normal operations.
