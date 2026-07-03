# GBP Sync — Help Documentation

## Quick Summary

Google Business Profile sync is not active in MenuList today. Current MenuList support is a manual Google handoff: use your Official Business Page link and menu link when you update Google Business Profile yourself.

## Current Source Boundary

- `ENABLE_GBP_SYNC` is `false`.
- Google sync controls are hidden while the flag is off.
- Google OAuth connection is not available.
- MenuList does not update Google Business Profile automatically.
- Owner-managed Google updates remain the current path.

## How To Update Google Manually

### Copy Your MenuList Link

1. Open **Use MenuList** or **Share**.
2. Copy your current menu link or Official Business Page link.
3. Open Google Business Profile in your Google account.
4. Paste the MenuList link into the website/menu field that Google allows for your listing.
5. Save in Google.

### Check Your Hours

1. Open your MenuList hours settings.
2. Compare them with the hours shown in Google Business Profile.
3. If Google is wrong, update Google manually.
4. If MenuList is wrong, update MenuList first, then copy the corrected information to Google.

## What Is Not Available Yet

- Connect Google account from MenuList
- Automatic Google menu-link sync
- Automatic Google hours sync
- One-click Google hours fix
- Google review, post, photo, or Q&A automation

Those capabilities require approved Google Business Profile API access, OAuth setup, provider smoke, deploy evidence, browser/device QA, and production-host smoke before they can be documented as active.

## Troubleshooting

### I do not see a Google Sync tab

That is expected. Google sync controls are hidden while `ENABLE_GBP_SYNC` is off and API access is blocked.

### Did MenuList already update Google for me?

No. Until the integration is approved and shipped, MenuList only provides the source links and owner guidance. Google updates are still done in Google Business Profile.

## Related Features

- **Official Business Page** — The canonical page Google should point customers to.
- **Menu Presence Monitor** — Helps owners keep public menu links aligned.
- **Hours & Holiday Accuracy** — Where working hours are maintained in MenuList.

## Need More Help?

Email support@menulist.ai with the business name and the Google listing you want to update.
