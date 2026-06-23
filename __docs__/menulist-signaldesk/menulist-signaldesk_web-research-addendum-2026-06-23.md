# MenuList SignalDesk - Web Research Addendum

**Status:** Adopted guidance
**Created:** June 23, 2026
**Scope:** Current external guidance that affects the owner-control SignalDesk model.

## Research Verdict

The research confirms the current direction:

```txt
SignalDesk should automate preparation, monitoring, and attribution.
SignalDesk should not automate scale, send, spend, or source-policy judgment by default.
```

The valid additions are compliance and trust gates, not more outbound automation.

## Sources Reviewed

| Source | SignalDesk impact |
| --- | --- |
| [FTC CAN-SPAM business guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) | Email needs clear opt-out, physical address, prompt opt-out handling, and owner responsibility even if a vendor sends. |
| [Gmail sender guidelines](https://support.google.com/mail/answer/81126?hl=en) | Sender readiness should check SPF/DKIM for all senders, SPF/DKIM/DMARC for bulk senders, and authentication before any provider send. |
| [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) | WhatsApp needs approved templates outside the 24-hour customer-service window, consent/notice handling, and escalation paths when automation replies. |
| [Meta Messenger send-message documentation](https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages) | Messenger and Instagram response behavior is governed by a 24-hour standard messaging window after user interaction. |
| [Instagram Messaging API documentation](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api/) | Instagram messaging should stay inbound/ad-click/response-led, not cold-DM automation. |
| [Google Places API field-mask guide](https://developers.google.com/maps/documentation/places/web-service/choose-fields) | Places calls must use field masks and should request only required fields to control cost and data exposure. |
| [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies) | Place IDs are exempt from caching restrictions; other Google Maps content needs tighter retention and cannot become durable prospect truth by default. |
| [Google Places API Place ID guide](https://developers.google.com/maps/documentation/places/web-service/place-id) | Stored Place IDs should be refreshed if older than 12 months. |
| [FCC TCPA one-to-one consent summary](https://docs.fcc.gov/public/attachments/DOC-408396A1.pdf) | Automated calls/texts from lead-source consent are risky; SignalDesk should keep phone/WhatsApp outreach opt-in or inbound only. |
| [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) | AI-assisted growth should be governed, mapped, measured, and managed continuously, not treated as a one-time prompt feature. |

## Adopted Additions

### 1. Sender Readiness Gate

Provider email send must stay disabled until SignalDesk records:

- sender identity;
- physical postal address policy;
- unsubscribe URL and reply-based opt-out handling;
- SPF/DKIM status;
- DMARC status before scale;
- bounce and complaint processing;
- suppression processing within the required window;
- visible owner approval for sender go-live.

Low volume is not a reason to skip authentication or suppression.

### 2. Channel Window Gate

WhatsApp, Instagram, and Messenger must store a channel-window state before any assisted send:

| Channel | Required state before free-form response |
| --- | --- |
| WhatsApp | User message or explicit opt-in; template required outside the 24-hour customer-service window. |
| Instagram | User interaction/ad-click/inbound message; response within platform messaging window. |
| Messenger | User interaction/ad-click/inbound message; response within platform messaging window. |

Cold WhatsApp, cold Instagram DM, and cold Messenger automation remain blocked.

### 3. Source Provider Retention Gate

Places-like source providers should be treated as candidate discovery, not durable prospect truth.

SignalDesk should:

- use narrow production field masks;
- avoid requesting phone/email fields from Places-like providers;
- store provider ID and source policy reference;
- avoid storing raw provider payloads in Firestore;
- apply short retention to non-exempt provider content;
- refresh Google Place IDs after 12 months if retained;
- require a human-approved source policy before provider candidates are eligible for outreach.

### 4. AI Risk Gate

SignalDesk AI should follow a practical govern/map/measure/manage loop:

| Function | SignalDesk implementation |
| --- | --- |
| Govern | Feature flags, source policy, approval gates, kill switches, audit trail. |
| Map | Each AI run records target, task, source, evidence, model, prompt version, and intended use. |
| Measure | Store confidence, rejected facts, eval failures, correction rate, and cost. |
| Manage | Pause AI tasks when confidence drops, edits spike, complaints rise, or provider cost crosses budget. |

AI still cannot infer consent, approve legality, approve send, or override suppression.

### 5. Owner Control Packet

Every approval packet should show:

- source policy and allowed use;
- source/provider age and retention state;
- evidence summary and rejected facts;
- target risk and suppression state;
- channel window/readiness state;
- draft body and unsupported-claim check;
- expected MenuList outcome;
- cost and incident impact;
- approve, hold, reject, pause, or redirect action.

This is the practical UI form of the founder's observe/monitor/approve model.

## Rejected Additions

| Idea | Reason rejected |
| --- | --- |
| Auto-enable provider send after credentials exist | Credentials are not enough; sender, suppression, consent, channel, and approval gates must pass. |
| Import Google Places results as permanent prospect truth | Places data is a candidate signal; durable outreach needs source policy and verification. |
| Cold WhatsApp or Instagram automation | Platform policy and trust risk do not fit MenuList's owner-control model. |
| Paid campaign optimizer | Explicitly skipped; spend automation needs its own approval and budget gate. |
| Third-party lead-list enrichment by default | Consent, source rights, PII, and data quality risks are too high for default use. |

## Needed Follow-Up

| ID | Work | Priority |
| --- | --- | --- |
| WR-001 | Add sender-health checklist to channel readiness before provider send can ever be enabled. | P0 |
| WR-002 | Add channel-window fields to assisted WhatsApp/Instagram/Messenger handoff records. | P0 |
| WR-003 | Add provider-source retention/refresh fields for Google Place ID and non-exempt provider content. | P0 |
| WR-004 | Add approval packet shape that combines evidence, risk, channel readiness, source retention, cost, and action. | P0 |
| WR-005 | Add AI quality monitoring summary: edit rate, rejected-fact count, confidence drift, eval failures, and cost. | P1 |

