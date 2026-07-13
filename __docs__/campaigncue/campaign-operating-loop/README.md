# Campaign Operating Loop

Campaign Operating Loop makes CampaignCue react to the business that exists today, not only the facts saved during onboarding.

The implemented loop is:

`Business Brain + Owner Pulse + Commercial Policy + Recipes + Result Receipts -> Decision -> Campaign Pack -> Truth Recheck -> Manual Use -> Next One-Variable Test`

The owner-facing rhythm is:

`Use or approve the current pack -> record the result -> safely rebuild a useful pack from current truth -> schedule the next manual task`

## Current Status

- Implemented in the shared CampaignCue app and existing API routes.
- Uses the existing Business Brain, source snapshot, campaign, schedule, event, and analytics-summary documents.
- Derives campaign rhythm, pack readiness, and the best safe reuse candidate from the already-loaded overview.
- Reuse never republishes or blindly clones old copy. It rebuilds the selected recipe from current facts and runs the normal decision and trust gates again.
- Approval requests, approval decisions, and rejected packs use the existing campaign/action path; a pending or rejected approval blocks public-use actions.
- Adds no Firestore collection, realtime listener, Cloud Function, scheduled job, or provider call.
- Direct posting, WhatsApp sending, CRM/contact import, automatic translation, and automatic profile updates remain outside the active runtime.
- Root TypeScript and CampaignCue verifiers are the source gates. Deployment and authenticated production-host evidence remain separate.

## Documents

- [Spec](./campaign-operating-loop_spec.md)
- [Implementation](./campaign-operating-loop_impl.md)
- [Firebase](./campaign-operating-loop_firebase.md)
- [Mobile](./campaign-operating-loop_mobile-support.md)
- [Help](./campaign-operating-loop_helpdoc.md)
- [Marketing](./campaign-operating-loop_marketing.md)
- [Website](./campaign-operating-loop_website.md)
- [Test cases](./campaign-operating-loop_test-cases.md)
- [Validation](./campaign-operating-loop_validation.md)
