# QR WhatsApp Experiments Firebase Cost

**Status:** PLANNING ONLY — ZERO CURRENT FIREBASE OPERATIONS
**Last Updated:** July 17, 2026

## Current Source Truth

Current Firestore operations: zero. There is no collection constant, DAL, rule, index, TTL policy, listener, scheduler, Function, Storage path, public counter, webhook, or provider integration for this proposal. The disabled feature flag has no runtime consumer.

No rules, indexes, TTL policy, listeners, scheduler, or Functions should be added until an approved implementation requires them. Keeping the proposal infrastructure-free is the smallest and cheapest current design.

## Cost Principle

This feature must be aggregate-first. It should help an SMB owner decide a campaign winner without turning every scan into a Firestore document.

## Proposed Runtime Cost Shape

| Operation | Firestore Reads | Firestore Writes | Storage | Functions/API | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open experiment screen | 1 | 0 | 0 | 0 | Read one store index doc such as `storeQrWhatsappExperiments/{tenantId}/{storeId}/default`. |
| Create draft campaign | 1 | 1 | 0 | 0 | Read/merge/write the store index doc. |
| Generate printable variants | 0 | 0 | 0 | 0 | Browser-side asset generation should reuse Assets/Printable Asset Templates. |
| Start/pause/complete campaign | 1 | 1 | 0 | 0 | Store index status update only. |
| Public scan/landing | 0-1 | 0-1 aggregate write | 0 | Public route only if approved | Must rate-limit and aggregate. Do not create raw scan docs. |
| WhatsApp click | 0-1 | 0-1 aggregate write | 0 | Public route/client event | Keep as aggregate counter unless provider integration requires more. |
| WhatsApp inbound webhook | 0-1 | 0-1 aggregate/consent write | 0 | Required only for connected WhatsApp Platform flow | Store hashed identifier and token result, not raw personal data. |
| Manual result entry | 1 | 1 | 0 | 0 | Owner-entered counts update aggregate summary. |
| View dashboard | 1-2 | 0 | 0 | 0 | Store index plus optional daily aggregate doc if detail is needed. |

## Rejected Patterns

| Rejected Pattern | Reason |
| --- | --- |
| Raw `scanEvents/{scanId}` documents for every scan | High write cost, high noise, low owner value. |
| Raw `whatsappEvents/{eventId}` documents for every status update | Cost and privacy risk unless a later provider-led analytics feature proves need. |
| Storing raw phone numbers or raw WhatsApp IDs | Personal-data risk; use hashed identifiers and minimum consent proof only. |
| Storing raw IP addresses or user-agent strings | Not needed for SMB decision-making. |
| Adding scan ledgers to Print Assets | Breaks the zero-cost print asset contract. |
| Uploading generated experiment PDFs/images by default | Owners can download locally; Storage should be explicit only. |
| Cloud Function rendering | Browser-side rendering already exists for Assets. |

## Consent Ledger

If consent capture is implemented, the minimum record should be compact:

```ts
type QrWhatsappConsentRecord = {
  hashedWaId: string;
  campaignId: string;
  variantId: string;
  storeId: string;
  tenantId: string;
  consentStatus: "opted_in" | "declined" | "opted_out";
  consentSource: "landing_checkbox" | "whatsapp_yes_reply" | "manual_import";
  consentTextVersion: string;
  consentAt: Timestamp;
  updatedAt: Timestamp;
};
```

Only add this ledger if the implementation needs future-message proof. For an early manual pilot, aggregate opt-in counts may be enough.

## Rules And Indexes

Future implementation must add explicit Firestore rules for store-scoped documents. Do not rely on broad owner access. No composite indexes are expected for the first version if the UI reads one store index doc and optional exact daily docs.

## Public Route Cost Controls

If `/q/[token]` writes aggregates:

- cap duplicate increments per session where practical;
- rate-limit token route requests;
- reject invalid tokens before Firestore;
- keep daily aggregate documents bounded;
- batch or debounce client-side click writes where safe;
- expose degraded UX if counters fail instead of blocking WhatsApp.

## Firebase Deployment

No Firebase deploy was performed for this docs pass. Future rule/index/function changes must be validated and deployed under the MenuList Firebase target per the repo Firebase infrastructure rule.
