# Customer FAQ Reply Pack - Implementation

**Status:** Implemented V0 public browser-local tool
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:customer-faq-reply-pack`

---

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/(website)/tools/customer-faq-reply-pack/page.tsx` | Feature-flagged public website route |
| `src/components/website/customerFaqReplyPack/CustomerFaqReplyPackPage.tsx` | Public form, generated FAQ blocks, report card, copy/download/share, consented handoff |
| `src/lib/public-truth-tools/customerFaqReplyPackTypes.ts` | Input, report, FAQ block, and boundary types |
| `src/lib/public-truth-tools/customerFaqReplyPackReport.ts` | Deterministic browser-local report and FAQ builder |
| `scripts/verification/verify-customer-faq-reply-pack.js` | Focused source gate |

## Feature Flag

```ts
ENABLE_PUBLIC_TRUTH_CUSTOMER_FAQ_REPLY_PACK: true
```

## Report Contract

Each report row has:

```ts
id: CustomerFaqReplyPackCheckId;
result: CustomerFaqReplyPackResult;
evidence: CustomerFaqReplyPackEvidence;
evidenceText: string;
required: boolean;
```

The report also includes:

```ts
copyBlocks: CustomerFaqReplyBlock[];
```

Each FAQ block has:

```ts
id: CustomerFaqReplyBlockId;
title: string;
body: string;
evidenceText: string;
```

## Evidence Contract

`evidenceText` must explicitly state what was checked:

- owner-entered questions and facts only
- URL format checked locally
- FAQ replies generated from entered facts only
- no customer conversation logs read
- no chatbot created
- no automation configured
- no message sent

## Boundaries

Boundary flags are all false:

- `conversationLogsRead`
- `chatbotCreated`
- `messageSent`
- `automationConfigured`
- `externalUrlFetched`
- `externalPlatformUpdated`
- `reportStored`
- `aiAnswerGenerated`
- `aiOrSearchChecked`
- `rankingPromise`

## Source Policy

V0 must not add chatbot, inbox, WhatsApp Business Platform, helpdesk, provider, Google, Instagram, Facebook, Maps, directory, website, or search crawling. Entered URLs are references only and receive local format checks.

The only allowed network write is the optional consented `/api/public/contact` handoff.

## Shareable Report Integration

The component must use:

```ts
buildShareablePublicTruthToolReportPayload({ toolId: 'customer-faq-reply-pack' })
createShareableToolReportUrl(...)
```

The report link is encoded client-side. It does not create a report collection.
