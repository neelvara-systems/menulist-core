# Growth Intelligence Firebase and Cost

**Status:** Approved  
**Last Updated:** July 29, 2026

## Data

| Path | Operation | Frequency |
| --- | --- | --- |
| `publicMenuDrafts/{draftId}` | Existing write, adds allowlisted acquisition map | New draft only |
| `publicMenuDrafts/{draftId}.growthTelemetry` | Idempotency marker on the existing draft record | One update per attributed draft or claim |
| `platformSummary/founderMonitorGrowth` | Counter merge | One per first accepted event |
| Subscription document | Existing cancellation write, adds structured cancellation audit | Cancellation only |
| `platformSummary/founderMonitorRevenue*` | Existing idempotent movement writes, adds reason counter | First accepted churn movement |

Founder Monitor adds one document read for `founderMonitorGrowth` per manual refresh. No query, listener, index, client Firestore access, rule change, scheduler, or Cloud Function is added.

Acquisition telemetry is best-effort so a summary outage cannot block owner onboarding. The idempotency markers share the parent draft's existing lifecycle and add no independent retention surface; no permanent growth-event collection or cleanup job is introduced. Cancellation reason aggregation rides the existing idempotent revenue movement transaction and adds no transaction round trip.

The transaction treats the persisted draft attribution as authoritative. A
caller-provided source/medium/campaign must normalize to the same fixed
combination already stored on the draft before either the marker or summary
counter can change. Attribution fields admit primitive strings only and never
invoke unknown conversion hooks. Missing, mismatched or malformed persisted
attribution and invalid event timestamps fail closed without a write.

## Security

- Admin SDK/server routes only for founder summaries and draft idempotency markers.
- Fixed source values only.
- Exact persisted-draft attribution must match the caller's normalized attribution.
- No raw URL, referrer, tenant ID, store ID, owner ID, cancellation detail, or provider error in aggregate maps.
- Existing platform-auth and billing tenant checks remain mandatory.
