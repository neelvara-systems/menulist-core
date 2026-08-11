# Save a Campaign Pack in CampaignCue

## What This Does

`Save cloud copy` keeps the current Campaign Pack ZIP in your CampaignCue workspace so you can download that checked copy again later.

## Save a Copy

1. Open a Campaign Pack that is ready to use.
2. Select **Save cloud copy**.
3. Keep the page open until CampaignCue confirms the save.
4. Use **Download saved copy** whenever you need that current ZIP again.

When a copy already exists, the button says **Replace cloud copy**. CampaignCue keeps one current copy for you. It uses two rotating storage slots internally; it does not provide an unlimited version history.

## What Is Checked

Before saving, CampaignCue rechecks the campaign's facts, trust state, location access, and approval state. The file must be a ZIP no larger than 25 MB. Cloud Storage also checks the file checksum during upload.

## When Saving Is Blocked

CampaignCue will not save a public-use copy when:

- a protected fact changed or the pack expired;
- the campaign has a blocking trust issue;
- required owner/client approval is waiting or rejected;
- your workspace role or location assignment does not permit the action;
- another cloud-copy save is currently in progress;
- the file or upload evidence cannot be verified.

Create or review a fresh Campaign Pack, then try again. Local ZIP download remains the fallback when cloud storage is unavailable.

## Privacy and Delivery

The saved copy is not public. CampaignCue creates a short-lived link only after you request a download. Saving a copy does not post, message, print, schedule, or send the campaign anywhere.
