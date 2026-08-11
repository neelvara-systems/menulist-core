# Hosted Offer Page And QR - Implementation

## Flow

```text
owner selects Publish page
  -> authenticated, scoped, rate-limited API
  -> transaction reads campaign, workspace, Business Brain, current source snapshot, idempotency record
  -> trust, approval, commercial, and freshness gates
  -> pure public-safe record builder
  -> one public-offer document + campaign pointer + audit event
  -> cache tag invalidation
  -> owner opens page or downloads QR locally
```

## Code Map

| Responsibility | Location |
| --- | --- |
| Feature gate and limits | `src/config/features.ts`, `src/constants/campaigncue/offerPage.ts` |
| Pure builder and record parser | `src/lib/campaigncue/offerPage.ts` |
| Authenticated publish/unpublish service | `src/lib/campaigncue/offerPageServer.ts` |
| API validation | `src/lib/validation/campaigncueOfferPageSchemas.ts` |
| Owner API route | `src/app/api/campaigncue/campaigns/[campaignId]/offer-page/route.ts` |
| Public server route | `src/app/sites/campaigncue/offer/[slug]/page.tsx` |
| Owner controls and QR | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Regression suite | `scripts/verification/test-campaigncue-hosted-offer-page.ts` |

The QR PNG is generated in the browser from the public URL through the existing QR utility. It is not persisted.
