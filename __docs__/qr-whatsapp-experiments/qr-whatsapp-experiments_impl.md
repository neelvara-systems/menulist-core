# QR WhatsApp Experiments Implementation Plan

**Status:** Docs-ready
**Last Updated:** June 25, 2026

## Current State

No runtime implementation exists yet. This document records the approved architecture boundary so implementation does not get folded into Print Assets, Menu Kit, or ordinary QR output.

## Architecture

```text
Assets / Printable Asset Templates
  create campaign artwork variants
        |
        v
QR WhatsApp Experiments
  owns campaign tokens, destination logic, consent text, event rollups
        |
        v
Tracked public entry
  landing page or redirect
        |
        v
WhatsApp click-to-chat
  pre-filled campaign token
        |
        v
Webhook/manual result capture
  aggregate result summary
```

## Proposed Modules

| Module | Responsibility |
| --- | --- |
| `src/lib/qr-whatsapp-experiments/experimentTypes.ts` | Shared type contracts and constants. |
| `src/lib/qr-whatsapp-experiments/experimentDal.ts` | Client-side DAL for store-level campaign metadata and aggregate summaries. |
| `src/lib/qr-whatsapp-experiments/token.ts` | Token creation/parse helpers. |
| `src/lib/qr-whatsapp-experiments/metrics.ts` | Funnel metric and winner-decision helpers. |
| `src/lib/qr-whatsapp-experiments/consent.ts` | Consent text version and consent-state helpers. |
| `src/components/owner/qr-whatsapp-experiments/` | Desktop owner UI. |
| `src/components/mobile/qr-whatsapp-experiments/` | Mobile admitted status/download UI. |
| `src/app/q/[token]/page.tsx` | Public tracked landing/redirect route after security review. |

Use these names only when implementation starts and the repo pattern is rechecked. Do not create API routes for Firestore-only work.

Creative variant generation should reuse the Branded QR Action Templates contract through existing Assets/Printable Asset Templates metadata. Do not add a separate visual generator for QR WhatsApp Experiments unless the shared template layer cannot express the required physical asset.

## Feature Flag

Add runtime behavior only behind:

```ts
FEATURE_FLAGS.ENABLE_QR_WHATSAPP_EXPERIMENTS
```

The feature remains disabled until consent copy, public route security, and Firebase rules are reviewed.

## Data Shape

Use store-level documents and aggregate arrays/maps, not raw event collections.

Recommended first-pass documents:

| Document | Purpose |
| --- | --- |
| `storeQrWhatsappExperiments/{tenantId}/{storeId}/default` | Store campaign index, variant metadata, current status, latest aggregate summary. |
| `storeQrWhatsappExperimentDaily/{tenantId}/{storeId}/{campaignId}__{yyyyMMdd}` | Bounded daily aggregate counters if daily history cannot fit safely in the default doc. |

The implementation may adjust names to match the project DB constants, but it must preserve the cost posture:

- one store index read when the owner opens the experiment screen;
- no per-scan Firestore document writes;
- no raw phone number storage;
- no raw IP/user-agent storage;
- no public route writes without rate limiting and abuse controls.

## Campaign Index Shape

```ts
type QrWhatsappExperimentIndex = {
  data: QrWhatsappExperimentSummary[];
  updatedAt: Timestamp;
  version: number;
};

type QrWhatsappExperimentSummary = {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  businessCategory: string;
  campaignGoal: "whatsapp_optin" | "booking" | "order" | "coupon" | "feedback" | "support";
  assetTypeId: string;
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  consentTextVersion: string;
  variants: QrWhatsappExperimentVariant[];
  latestSummary: QrWhatsappExperimentMetrics;
};
```

The summary can stay compact because the owner needs active comparison, not an event warehouse.

## Variant Shape

```ts
type QrWhatsappExperimentVariant = {
  id: string;
  label: "A" | "B" | string;
  token: string;
  assetTemplateId?: string;
  printableAssetTypeId: string;
  placement: string;
  destinationMode: "landing_to_whatsapp" | "direct_whatsapp" | "redirect_to_whatsapp";
  whatsappPrefill: string;
  utmContent: string;
  status: "draft" | "active" | "paused";
};
```

The pre-filled message must include a campaign token that can be matched later:

```text
Hi {BusinessName}, I want the offer. Code: {campaignToken}
```

## Event Capture Strategy

Preferred order:

1. Use existing web analytics for page/click event visibility where possible.
2. Write aggregate counters only for events MenuList must own for owner dashboard decisions.
3. Use WhatsApp webhook ingestion only when the store has connected/approved provider infrastructure.
4. Support manual outcome entry/import for early SMB pilots before provider automation.

## Public Route Rules

The future `/q/[token]` route must:

- validate token format before any lookup;
- rate-limit before expensive work;
- return generic errors;
- avoid exposing store internals;
- preserve UTMs when redirecting;
- keep landing copy plain and consent-aware;
- avoid storing raw IP/user-agent;
- continue working if analytics is unavailable.

## Owner UI Flow

1. Owner opens **Assets** or future **Experiments** section.
2. Owner chooses a goal such as coupon, booking, order, feedback, or support.
3. Owner chooses an asset type and placement.
4. Owner selects two variants or creates one visual/copy change.
5. MenuList shows QR scan-safety and consent checks.
6. Owner downloads the two print files.
7. Owner starts the experiment.
8. Owner sees scans, WhatsApp clicks, starts, consent, leads, conversions, and guardrails.
9. Owner marks winner or MenuList recommends winner when sample threshold is met.

## Integration With Assets

Assets can expose an entry point only when the feature flag is enabled:

```text
Assets -> Campaign QR experiment -> choose asset/template -> launch experiment
```

Normal asset download must remain unchanged.

## Implementation Order

1. Add shared types, metric helpers, and unit tests.
2. Add store-level DAL and Firestore rules for owner store access.
3. Add desktop draft/list UI behind the feature flag.
4. Add public token route with security/rate-limit review.
5. Add landing-to-WhatsApp flow and analytics event hooks.
6. Add aggregate counters and owner dashboard.
7. Add mobile read/download view.
8. Add optional WhatsApp webhook/manual import path.

Do not add WhatsApp outbound sending in this feature.
