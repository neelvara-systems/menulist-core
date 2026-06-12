# Creative Trust Center - Implementation

## Runtime Contract

Creative Trust Center should expose a shared CampaignCue trust-check service used by all generation and channel modules. Trust reports must be versioned, source-linked, and cheap to re-read.

## Flow

1. Receive output version and source fact refs.
2. Normalize claims and channel rules.
3. Run deterministic checks first.
4. Run model-assisted checks only when needed and feature-enabled.
5. Store trust report.
6. Return gate state to the caller.
7. Re-run only when output text, source refs, media metadata, or channel changes.

## Data Objects

| Object | Purpose |
| --- | --- |
| `trustReports` | Version-specific trust result. |
| `trustFindings` | Individual issue, severity, source, and recommendation. |
| `trustAcknowledgements` | Owner or agency acknowledgement where allowed. |
| `trustRuleVersions` | Rule version used to evaluate an output. |

## Current Runtime

- Campaign creation writes a deterministic `campaigncue-trust-v1` report.
- Outputs carry `clear`, `warning`, `needs_fix`, or `blocked` gate state.
- Unsupported absolute/result/ranking claims are blocked.
- Missing CTA/destination receives a `needs_fix` gate for WhatsApp, Google local, and ads.
- WhatsApp outputs receive consent/export warnings.
- Google local outputs receive manual verification warnings for post type, date, price, image, and link.
- Ad outputs receive spend and policy handoff warnings.
- Salon video/UGC/ad outputs receive consent/result-claim warnings.
- Restaurant outputs receive menu/source verification warnings when no public menu link exists.
- Creative/video/UGC outputs warn when no approved asset fact exists.
- Model-assisted checks are not active.

## Gate States

- `clear`: output can continue.
- `warning`: output can continue after owner review.
- `needs_fix`: output should be corrected.
- `blocked`: output cannot continue through automated handoff.

## Acceptance

- Trust reports are attached to every exportable output.
- Editing output invalidates old trust status.
- Manual acknowledgements are recorded with actor, timestamp, and rule version.
