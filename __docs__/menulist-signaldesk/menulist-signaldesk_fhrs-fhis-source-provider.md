# MenuList SignalDesk - FHRS/FHIS Source Provider

**Status:** Implemented behind source policy, provider account, provider budget, feature flag, and source-provider pause
**Created:** June 25, 2026
**Scope:** Internal UK official food-business establishment seed for SignalDesk target discovery.

## Decision

FHRS/FHIS is useful for long-term MenuList distribution because it gives SignalDesk a government-maintained seed of UK food establishments. It should be used as a trusted establishment identity source, not as a hygiene-rating product feature and not as outreach permission.

Use it for:

- UK market-pod sizing;
- official establishment identity;
- restaurant/cafe/takeaway/pub filtering;
- evidence packets that say the business exists in an official food-business register;
- enrichment handoff into website/menu/social detection.

Do not use it for:

- owner contact permission;
- cold WhatsApp/Instagram/Messenger;
- public MenuList hygiene-rating pages;
- implying Food Standards Agency endorsement;
- storing raw bulk payloads as durable prospect truth.

## Official Source Basis

Primary references:

- [FSA UK food hygiene rating data API](https://www.food.gov.uk/uk-food-hygiene-rating-data-api)
- [FHRS API v2 help](https://api.ratings.food.gov.uk/help)
- [Ratings open data page](https://ratings.food.gov.uk/open-data)
- [FSA terms and conditions](https://www.food.gov.uk/terms-and-conditions)

Important source facts:

- The API is free and does not require sign-up or an API key at the time of implementation.
- API calls must include `x-api-version: 2`.
- Data covers FHRS in England, Wales, and Northern Ireland, and FHIS in Scotland.
- Data can change as local authorities upload or publish records; SignalDesk must retain refresh and expiry controls.
- Ratings/images have separate accuracy, currency, trademark, and non-endorsement rules; SignalDesk does not publish them as MenuList public claims in this slice.

## Runtime Shape

| Area | Implementation |
| --- | --- |
| Provider ID | `fhrs-fhis` |
| Feature flag | `ENABLE_MENULIST_SIGNALDESK_FHRS_FHIS_SOURCE_PROVIDER` |
| API base | `https://api.ratings.food.gov.uk` |
| Endpoint | `GET /Establishments` |
| Required header | `x-api-version: 2` |
| Source action | Existing `run-source-provider` action |
| Provider account | `signaldeskProviderAccounts` row for provider `fhrs-fhis`, use `discovery`, credentials `not_required` |
| Budget | Zero-cost provider budget still registered so the same governor path is used |
| Raw payload | Not stored in Firestore |
| Retention | `signaldeskProviderSourceRetention` stores provider record ID/URL, source policy, source run, target, refresh/expiry dates |

## Normalization

FHRS/FHIS establishment rows are normalized into the same target import shape used by manual, Google Places, and Apify source runs:

| SignalDesk field | FHRS/FHIS input |
| --- | --- |
| `displayName` | `BusinessName` |
| `category` | `BusinessType` |
| `city` | run city or `LocalAuthorityName` |
| `country` | run country or `UK` |
| `providerRecordId` | `FHRSID` |
| `providerRecordUrl` | `https://api.ratings.food.gov.uk/Establishments/{FHRSID}` |
| `notes` | scheme type, rating value/date, local authority, address, geocode, new-rating-pending state, and contact-boundary note |

The adapter intentionally does not map `Phone` or local authority email into contact fields. FHRS/FHIS is establishment identity and evidence, not consent or owner-contact permission.

## Query Behavior

SignalDesk maps broad MenuList-relevant queries to FSA business types where possible:

| Query token | Business type |
| --- | --- |
| restaurant, cafe, canteen, coffee | Restaurant/Cafe/Canteen |
| takeaway, sandwich | Takeaway/sandwich shop |
| pub, bar, nightclub | Pub/bar/nightclub |
| mobile caterer, food truck, food van | Mobile caterer |
| hotel, bed and breakfast, guest house | Hotel/bed & breakfast/guest house |
| catering, caterers | Other catering premises |

If the query does not match a known food-business category, SignalDesk sends it as the establishment name search. City/country are sent as the API address filter.

## Guardrails

1. The broad source-provider flag must be enabled.
2. The FHRS/FHIS provider flag must be enabled.
3. A provider source policy must be active, non-expired, and tied to `fhrs-fhis`.
4. Evidence use must be allowed.
5. Import/use must remain within the policy retention window.
6. Contact use must not be inferred from FHRS/FHIS.
7. Provider send remains disabled by separate sender/channel flags and approval gates.
8. No public SignalDesk or public MenuList route is created.
9. No MenuList store, menu, project, billing, or public-output truth is written.
10. Any public use of rating imagery or rating claims requires a separate legal/content review.

## MenuList Use

Best first use is UK pod research:

```txt
FHRS/FHIS UK establishment seed
-> source policy
-> target import
-> website/menu/social enrichment
-> current-menu gap score
-> evidence packet
-> owner-approved outreach/export
```

Best-fit segments:

- restaurant/cafe/takeaway/pub records with no obvious current menu link after enrichment;
- PDF/image-only menu surfaces;
- Instagram-only menu surfaces;
- high-trust public identity with weak menu distribution;
- local multi-outlet groups with inconsistent public menu surfaces.

## Boundaries

- No cold send is enabled.
- No public hygiene-rating feature is added.
- No Food Standards Agency endorsement is claimed.
- No raw FHRS/FHIS bulk payload is stored.
- No contact values are normalized from this provider.
- No Firebase deploy was done in this implementation slice.
