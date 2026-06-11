# Google Local Studio - Spec

## Summary

Google Local Studio prepares campaign content for Google Business Profile: updates, offers, events, photos, CTAs, and local-post performance capture.

## Current Runtime

The implemented runtime prepares Google-ready manual drafts and keeps direct publish disabled. Connected location mapping, OAuth/API access status, quota checks, local-post publish jobs, and insight imports are architecture requirements that remain inactive until Google provider setup is complete.

## External API Reality

- Google Business Profile APIs require setup, OAuth, and access approval: https://developers.google.com/my-business/content/basic-setup
- Google documents Local Posts for news, events, offers, edits, and deletes, and states that Product Posts cannot be created via the Google My Business API at this time: https://developers.google.com/my-business/content/posts-data
- Google local post insights are reportable with limits, including a 100 local-post name limit per call: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts/reportInsights
- Google Business Profile quota docs state that quota `0` means API access has not been granted and that quota errors return `429` or `RESOURCE_EXHAUSTED`: https://developers.google.com/my-business/content/limits
- Google Business Profile help confirms businesses can create posts, offers, and events to share updates with customers on Search and Maps: https://support.google.com/business/answer/7342169

## Goals

- Turn campaign cues into Google-ready local updates.
- Keep manual fallback for unsupported post types, disabled locations, or API access gaps.
- Avoid unsupported Product Post assumptions.
- Capture post and location performance where APIs allow.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Post type fit | Update, offer, event, and CTA post formats are separate. |
| Product-post fallback | Product-post style content uses manual instructions unless Google API support is available. |
| Location eligibility | Workspace must show connected location, API access status, and post availability. |
| Media rules | Images and videos must pass size/type/provider validation before handoff. |
| Owner approval | Owner approves final Google post copy and media. |
| Performance capture | Insights are imported only where authorized and available. |
| Quota/access status | Workspace shows whether GBP API access is connected, unavailable, quota-blocked, or manual-only. |

## Non-Goals

- It does not guarantee Google Business Profile API approval.
- It does not manage reviews beyond campaign-safe response references.
- It does not bypass disabled-location or verification requirements.

## Risks

- Google API access and quotas can change.
- Product Post limitations require honest manual fallback.
- Multi-location businesses need strict location mapping.
