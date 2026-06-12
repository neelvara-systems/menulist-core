# Google Local Studio - Mobile Support

## Mobile Admission

Google Local Studio is mobile-relevant because owners often approve local updates from a phone.

## Mobile Requirements

- Show post preview, location, date, CTA, and media in one clear review flow.
- Keep publish/manual-download actions large and separated.
- Show when manual export is required.
- Allow download/export of post text and download/share of media.
- Avoid OAuth setup as the primary mobile path.

Current runtime exposes manual download/export behavior only. Connected publish controls must remain unavailable until a separate Google provider layer is complete.

## Mobile Non-Goals

- Advanced Google account setup.
- Bulk multi-location publishing from a small screen.
- Insights table management.

## Acceptance

- Owner can approve and download/export a Google update from mobile.
- Owner can download/export one approved Google-ready post from mobile.
- Manual instructions remain clear.
