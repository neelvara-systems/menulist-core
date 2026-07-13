# Campaign Decision Engine — Test Cases

## Deterministic Cases

1. Restaurant with confirmed lunch item, price, WhatsApp, photo, and useful lunch result:
   - Top decision should be lunch/item campaign.
   - Confidence should be high or medium depending on current facts.
   - Missing inputs should not invent price/date.

2. Salon with weekend slot but missing price/date:
   - Top decision can be slot-fill.
   - Status should be `needs_owner_input`.
   - Missing input should ask for slot/date/price instead of generating final offer terms.
   - Owner UI should not enable full pack creation.
   - Server campaign creation should reject the request before Firestore writes.

3. Local visibility with missing locality:
   - Local visibility decision should carry missing location input.
   - Google/local handoff remains manual.

4. Restricted asset:
   - Trust preflight should be blocked.
   - Owner should see asset-rights input.

5. Useful result memory:
   - Similar recipe receives `resultMemoryBoost`.
   - Opportunity Engine can recommend repeat.

6. Not-useful result memory:
   - Similar recipe receives repetition/not-useful penalty.
   - Opportunity Engine can recommend adjustment.

7. Expired owner pulse/source input:
   - Expired pulse creates a required refresh input.
   - Expired source input is excluded from active decision evidence.
   - Pack expiry cannot extend beyond a current pulse or dated source input.

8. Honest review request:
   - Verified HTTP(S) review destination is required.
   - A non-identifying completed-interaction note is required.
   - Incentivized, selective, or fabricated review language is blocked.

9. Return-customer reminder:
   - A non-identifying owner-managed audience description is required.
   - Pasted customer emails, phone numbers, CSV/import instructions, or contact payloads are rejected.
   - No direct send or contact storage path is created.

## Safety Cases

- Decision engine must not contain `fetch(`.
- Decision engine must not import Firebase/Admin clients.
- Decision engine must not import provider SDKs.
- Decision engine must not write Firestore.
- Owner UI must not say AI decided the campaign.
- Owner UI must not enable pack creation for `needs_owner_input`, `safe_evergreen_only`, or `blocked` decisions.
- Server campaign creation must reject non-ready decisions before campaign, trust report, event, or analytics writes.
- Owner-managed destination fields must reject non-HTTP(S) protocols.
- `not_used` must preserve campaign status and omit the use time.
