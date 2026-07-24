# SignalDesk Revenue Operating Layer - Mobile Support

**Status:** Desktop-only; mobile dashboard remains read-only
**Created:** July 10, 2026
**Last verified:** July 21, 2026

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Pipeline may be checked daily, but configuration is not frequent. |
| Speed | Fail | Offer/envelope/opportunity configuration cannot safely complete in under five seconds. |
| Touch | Fail | Commercial policy review requires detailed comparison and precise inputs. |
| Away-from-desk value | Partial | Status visibility is useful; mutation is not required. |

Decision: do not admit the Revenue workspace on mobile. Do not add a separate mobile DAL, route, summary payload, or mutation UI.

## Enforcement

- Existing SignalDesk mobile detection sends `x-signaldesk-client-mode: mobile-readonly`.
- The workspace API serves only `dashboard` in exact mobile-readonly mode; a Revenue section request returns `403`.
- Every revenue action is classified as configure/review/policy mutation and remains blocked server-side on mobile.
- Interested-reply and outcome projection updates run on the existing protected server workflow; mobile receives no new mutation control.
- The manual activation recheck is desktop-only and remains a recovery action.
- Founder market-pod approve/hold/reject controls are desktop-only; the server also rejects every mobile attempt.
- Mobile may observe the bounded dashboard and use only separately admitted mobile controls such as the existing emergency pause.
- No raw contact PII is added to mobile payloads.
