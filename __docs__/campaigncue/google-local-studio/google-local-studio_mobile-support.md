# Google Local Studio - Mobile Support

## Mobile Admission

Google Local Studio is mobile-relevant because owners often approve local updates from a phone.

## Mobile Requirements

- Show post preview, location, date, CTA, and media in one clear review flow.
- Keep publish/manual-copy actions large and separated.
- Show when manual fallback is required.
- Allow copy of post text and download/share of media.
- Avoid OAuth setup as the primary mobile path.

Current runtime exposes manual copy/export behavior only. Connected publish controls must remain unavailable until Google provider setup is complete.

## Mobile Non-Goals

- Advanced Google account setup.
- Bulk multi-location publishing from a small screen.
- Insights table management.

## Acceptance

- Owner can approve and copy a Google update from mobile.
- If connected publish is available, owner can publish one approved post from mobile.
- If publish is not available, manual instructions remain clear.
