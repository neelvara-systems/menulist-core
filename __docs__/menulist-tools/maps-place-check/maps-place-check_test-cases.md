# Maps Place Check - Test Cases

## Access

| Case | Expected |
| --- | --- |
| Unauthenticated callable request | `unauthenticated` |
| Store-scoped user checks another store | `permission-denied` |
| Platform user checks any store | Allowed |
| Missing tenant/store/business name | `invalid-argument` |
| Non-English `languageCode` | `invalid-argument` |

## Guardrails

| Case | Expected |
| --- | --- |
| Feature flag disabled | `failed-precondition` |
| Feature flag disabled and browser code attempts a new grounded Place-ID confirmation | Rejected before any Firestore read or write |
| SAFE_MODE active | `unavailable` |
| Rate limit exceeded | `resource-exhausted` |
| Provider returns no grounding metadata | `no_grounded_result` and no source list |

## Output

| Case | Expected |
| --- | --- |
| Grounded result contains Maps chunks | Sources returned with title, URI, and optional place ID |
| Response text contains JSON object | Proposed facts parsed into bounded fields |
| Response text is not valid JSON | Sources still returned; proposed facts empty |
| Grounded content returned | `attributionRequired: true` |
| Provider returns text with no grounding or malformed JSON | No raw provider response text is returned |

## Write Safety

| Case | Expected |
| --- | --- |
| Successful check | No Firestore writes |
| Address differs | Returned as proposed fact only |
| Hours differ | Returned as proposed fact only |
| Reviews/ratings present | Not persisted and not used as canonical truth |

## Confirmed Location Identity

| Case | Expected |
| --- | --- |
| Owner saves a valid Google Maps directions link on desktop, mobile, or embedded editor | The normalized public link and internal `google_maps` URI binding are written together |
| Owner clears the Google Maps link | Only the internal `google_maps` binding is removed |
| Grounded candidate lacks a valid Place ID or Google Maps URI | Confirmation is rejected |
| Model response text claims a Place ID/URI but no one Maps source contains both | Confirmation is rejected |
| Provider returns a valid Place ID longer than the old 160/180-character limits | The complete ID is retained without truncation |
| Provider Place ID exceeds the 2,048-character application ceiling | Confirmation is rejected rather than storing a partial ID |
| Grounded candidate includes proposed address/hours | Only the Place ID, Maps URI, and confirmation metadata can enter the binding |
| Store-scoped user confirms for another store | Rejected before the write |
| Active-session store is missing, inactive, deleted, blocked, or changes tenant identity | Transaction rejects before the write |
| Generic `updateStore` payload supplies `externalLocationIdentity` directly | Rejected; only the bounded mirror and dedicated mutation may write it |
| Browser confirmation supplies a GBP connection binding | Rejected; GBP requires a future server-authoritative connection flow |
| Owner confirms a replacement candidate | Current `google_maps` binding is replaced without touching canonical store facts |
| Google Business Profile binding also exists | Removing one provider binding preserves every other provider binding |
| Master store confirms a binding | No outlet propagation |
| Platform Pull or public output is requested | Internal identity metadata is omitted |
| Same provider Place ID could already identify another MenuList store | Grounded-candidate UI remains unreleased until an approved server-authoritative collision policy can fail closed and allow review/reversal |
