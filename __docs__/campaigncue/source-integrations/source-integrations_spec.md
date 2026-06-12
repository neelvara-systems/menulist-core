# Source Integrations — Spec

## Summary

Source Integrations bring business data into CampaignCue without making CampaignCue the owner of that source truth. MenuList is a read-only-by-default connector for restaurant/menu facts. Manual setup, uploads, and website links must work for non-MenuList businesses.

## Current Runtime

The active runtime uses the signed-in MenuList store profile as a read-only bootstrap source and lets owners add source input records for manual notes, menu links, booking links, offers, events, and upload metadata. Upload parsing, website extraction, OAuth provider sync, webhooks, contact import, POS/booking import, and direct provider publishing are not active until credentials, permissions, and provider contracts are configured.

## Supported Sources

| Source | Day-one use |
| --- | --- |
| Manual entry | Business details, services, prices, CTA, offers. |
| Upload | PDF/image/CSV menus, service lists, photos, videos. |
| Website URL | Basic business facts and available public content, with review. |
| MenuList | Official restaurant/store/menu/photos/public-link source snapshots. |
| Google Business Profile | Manual Google-ready drafts; connected publish context is reserved for a separate future layer. |
| WhatsApp Business | Manual message copy/export; direct-send and template status are reserved for a separate future layer. |
| Meta social/ads | Manual social/ad handoff packs; no ad-account or social-account mutation in the active runtime. |
| Booking/POS/order | Owner-entered links and outcomes now; imports only after a future connector contract exists. |

## Integration Posture

| Source type | Default posture | Reason |
| --- | --- | --- |
| MenuList | Read-only source snapshots. | Protect MenuList public truth and cache/write contracts. |
| Website/public pages | Low-confidence extraction with owner review. | Public content can be stale, partial, or legally unsuitable for marketing claims. |
| Google Business Profile | Manual Google-ready export now; capability-detected connection only in a separate future layer. | API access, quotas, location eligibility, and post type support vary. |
| WhatsApp Business | Consent/template/preference-aware connection only. | Marketing messages require opt-in, pricing, policy, and preference handling. |
| Meta/Instagram/TikTok/YouTube | Export-first until app review and provider rules are satisfied. | Posting APIs require account eligibility, scopes, quotas, domain rules, and platform-specific UX. |
| POS/booking/order systems | Outcome import only until write-back contract exists. | Avoid accidental changes to operational systems. |
| Email/SMS/contact lists | Not default campaign channels. | Direct marketing needs explicit consent, opt-out, and jurisdiction-specific compliance. |

## Blocked Source Patterns

- No scraping private accounts, private WhatsApp chats, customer DMs, or closed groups.
- No importing contact lists without consent/source metadata.
- No using reviews, testimonials, or before/after photos without permission and trust review.
- No unofficial provider APIs or browser automation as the normal integration path.
- No source write-back unless the provider contract, permission model, and audit trail are documented first.

## Requirements

- Every future connection has explicit scopes.
- Every future sync creates or reuses a source snapshot.
- Source freshness is visible.
- Conflicts are shown, not silently resolved.
- Future disconnection stops future sync but preserves campaign snapshots per retention policy.
- Direct MenuList writes are blocked by default.

## Risks

- OAuth and provider APIs can fail.
- Public website scraping can create low-confidence facts.
- MenuList boundary confusion can damage MenuList trust.
- WhatsApp and Google platform policy must be respected.
