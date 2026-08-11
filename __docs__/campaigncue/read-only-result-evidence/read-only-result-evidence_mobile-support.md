# Read-Only Result Evidence Mobile Support

## Scope

Mobile supports review and compact result capture. It does not add a dense analytics workspace or provider connection flow.

## Requirements

- render inside the CampaignCue shared responsive shell;
- keep labels above fields and preserve 44px minimum touch targets;
- use native date and numeric inputs;
- keep the save action disabled until a campaign, valid date range, and at least one metric are present;
- show the attribution boundary before save;
- show the latest saved snapshot without horizontal overflow;
- hide the form for roles that cannot save evidence;
- preserve the normal owner-result form as the primary learning path.

## Offline behavior

No offline queue is introduced. An ambiguous network response retains the existing retry-stable idempotency key. The owner can retry without creating a second logical snapshot.

## Exclusions

- provider OAuth in an embedded browser;
- raw report upload;
- account-level charts;
- background synchronization;
- direct posting or ad mutation.
