# SignalDesk Revenue Operating Layer - Mobile Support

**Status:** Observe-only
**Created:** July 10, 2026

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial | Pipeline may be checked daily, but configuration is not frequent. |
| Speed | Fail | Offer/envelope/opportunity configuration cannot safely complete in under five seconds. |
| Touch | Fail | Commercial policy review requires detailed comparison and precise inputs. |
| Away-from-desk value | Partial | Status visibility is useful; mutation is not required. |

Decision: render existing private workspace summaries read-only on mobile. Do not add a separate mobile DAL, route, or mutation UI.

## Enforcement

- Existing SignalDesk mobile detection sends `x-signaldesk-client-mode: mobile-readonly`.
- Every new revenue action is classified as configure/approve and blocked server-side on mobile.
- The revenue workspace is wrapped in a disabled fieldset on mobile, so local form controls cannot imply that edits are saveable.
- Interested-reply and outcome projection updates run on the existing protected server workflow; mobile receives no new mutation control.
- The manual activation recheck remains disabled on mobile and is only a desktop recovery action.
- Founder market-pod approve/hold/reject controls are desktop-only; the server also rejects every mobile attempt.
- Mobile may use the existing global emergency pause only.
- No raw contact PII is added to mobile payloads.
