# Visual Profile Completion

Visual Profile Completion is the owner-facing readiness layer for the Official Business Page visual profile.

It turns existing MenuList visual truth into a short checklist:

- main photo for the public page
- enough business photos for the public gallery
- one menu or service photo when project summaries are already loaded

The feature is deliberately not a social scheduler, campaign generator, gallery editor, or AI image classifier. It sits beside the current OBP cover/gallery controls and uses the Media Image System for actual uploads and image preparation.

## Product Decision

Build the feature as an OBP completion guide.

Do not build the broader ChatGPT proposal as described. The broad version would create an owner-facing creative tool, introduce image classification and placement promises, and overlap with CampaignCue, Canva-style design tools, and social platforms. The MenuList-fit version is smaller and stronger: show what the public business profile is missing, then let the existing upload surfaces fix it.

Owner-facing line:

> Add your business photos. MenuList keeps the public profile complete.

## Source Of Truth

- OBP cover image: `publicPresence.businessCover`
- OBP gallery images: `publicPresence.photos[]`
- Menu or service image coverage: already-loaded project summaries when available
- Upload and preparation: Media Image System
- Public rendering: Official Business Page

The completion result records whether its evidence is `full` or
`business-only`. A caller without project summaries may confirm that the
business photos are ready, but it must not claim the entire visual profile is
complete.

## Feature Flag

`FEATURE_FLAGS.ENABLE_VISUAL_PROFILE_COMPLETION`

The flag controls the owner-side completion UI only. It does not change public OBP rendering, image upload behavior, Firebase rules, indexes, Storage layout, or provider usage.

## Documentation Set

- [Spec](./visual-profile-completion_spec.md)
- [Implementation](./visual-profile-completion_impl.md)
- [Firebase](./visual-profile-completion_firebase.md)
- [Mobile support](./visual-profile-completion_mobile-support.md)
- [Marketing](./visual-profile-completion_marketing.md)
- [Website](./visual-profile-completion_website.md)
- [Help doc](./visual-profile-completion_helpdoc.md)
- [Test cases](./visual-profile-completion_test-cases.md)
- [Validation](./visual-profile-completion_validation.md)
