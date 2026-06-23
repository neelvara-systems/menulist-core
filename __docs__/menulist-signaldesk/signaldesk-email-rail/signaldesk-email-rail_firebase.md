# SignalDesk Email Rail - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskSenderDomains` | Sender/domain readiness | Policy/control room |
| `signaldeskEmailActions` | Export/send actions | Target/campaign detail |
| `signaldeskEmailEvents` | Delivery/bounce/complaint/click events | Detail/debug only |
| `signaldeskEmailDailySummaries` | Email channel health/cost | Dashboard |
| `signaldeskUnsubscribeEvents` | Email unsubscribe proof | Suppression lookup/detail |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Export email | 6-12 | 3-7 | Draft, approval, suppression, target; action, audit, attribution. |
| Provider send | 8-15 | 4-10 | Adds sender/domain/cap checks. |
| Bounce/complaint webhook | 2-6 | 3-8 | Normalize event, suppression if needed, summary. |
| Dashboard | 2-5 | 0 | Summary docs only. |

## Indexes

- `signaldeskEmailActions`: `targetId + createdAt`
- `signaldeskEmailActions`: `status + createdAt`
- `signaldeskEmailEvents`: `emailActionId + createdAt`
- `signaldeskEmailDailySummaries`: `date + senderDomainId`
- `signaldeskUnsubscribeEvents`: `identityHash + createdAt`

## Cost Controls

- No dashboard raw email events.
- Store provider payloads in Storage if needed.
- Webhook events compact only.
- Daily summaries updated incrementally.
- Send caps prevent cost spikes.
