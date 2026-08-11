# Durable Cloud Export Archive Mobile Support

## Mobile Decision

Saving and downloading the current Campaign Pack ZIP are valid mobile review actions. Dense Creative Editor work remains desktop-only under the existing CampaignCue editor boundary.

## Supported Mobile Actions

- review archive readiness;
- save the current cloud copy;
- replace the current cloud copy;
- download the saved copy through a short-lived link;
- see a bounded failure and use local download when cloud save is unavailable.

## UX Requirements

- Touch targets remain at least 44 px.
- The primary wording stays `Save cloud copy`, `Replace cloud copy`, and `Download saved copy`.
- Do not expose storage slots, checksums, object generations, leases, or signed URLs to the owner.
- Disable duplicate actions while save or download is running.
- Do not imply an unlimited history, public share link, or automatic posting.

## Data and Runtime

Mobile uses the same client helper, protected prepare route, campaign action route, and Asset Library download route as desktop. It must not add a mobile-only Firebase listener, upload path, or archive collection.

## Device Evidence Still Required

- iOS Safari/PWA signed PUT through configured bucket CORS;
- Android Chrome/PWA signed PUT;
- ZIP download handoff behavior on both platforms;
- interrupted upload, app backgrounding, and retry messaging;
- 25 MB boundary on a representative low-memory device.
