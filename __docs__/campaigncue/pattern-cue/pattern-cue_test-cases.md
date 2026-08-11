# Pattern Cue - Test Cases

## Contract Tests

- Valid public Instagram, TikTok, YouTube, and other HTTPS URLs.
- Reject HTTP, localhost, private IPv4, IPv6 literals, loopback, credentialed, token/signature-bearing, overlong, malformed, and missing URLs.
- Reject missing/short notes, oversized notes, customer contact payloads, and unknown fields.
- Raw notes do not appear in the persisted observation.
- URL fragments are removed.
- Platform, hook, format, pacing, duration, and CTA classification stay bounded.
- A known source host outranks a conflicting owner-selected platform label.
- Owner takeaway can guide bounded classification but is never copied into output text.
- Candidate hooks use Business Brain name/item/service/locality.
- Pattern input creates zero source facts and cannot satisfy decision gates.
- Current pattern replaces the fixed workspace field without collection growth.
- A `needs_review` pattern stays visible as review state and is not projected into a pack.
- Inspiration alone does not change the source snapshot from MenuList truth to manual business truth.
- Video/UGC outputs include pattern brief and originality boundary.
- WhatsApp, Google, print, and ad outputs do not inherit pattern language.
- Only packs with video or UGC output pin the pattern source ID/hash.
- Packs without video or UGC do not become stale when the example changes.
- Changed/deleted pattern blocks public-use actions for dependent packs.
- Non-pattern campaigns remain current when the example changes.
- Provider flags remain disabled and no provider call runs.
- Pattern-backed video projects retain only compact hook/format/pacing/duration classification, not raw notes or source wording.
- Exact rendered versions produce a bounded format signature; legacy unbound renders cannot create pattern outcome learning.
- Format summaries use only already-loaded workspace video projects and owner-reported outcomes.
- No account monitor, recurring refresh, competitor-performance record, or new pattern collection exists.

## Verification

- `npm run verify:campaigncue-pattern-cue`
- `npm run verify:campaigncue`
- `npm run typecheck`
- `npm run lint`
