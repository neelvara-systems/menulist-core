# Pattern Cue

Pattern Cue lets an SMB owner submit one useful public reel/post example and turn its abstract format into an original CampaignCue reel or creator brief.

It learns structure, not content. CampaignCue does not copy scripts, monitor creator accounts, bypass platform access, promise virality, or present synthetic people as real customers.

## Documents

- [Spec](./pattern-cue_spec.md)
- [Implementation](./pattern-cue_impl.md)
- [Firebase](./pattern-cue_firebase.md)
- [Help](./pattern-cue_helpdoc.md)
- [Marketing](./pattern-cue_marketing.md)
- [Website](./pattern-cue_website.md)
- [Mobile](./pattern-cue_mobile-support.md)
- [Tests](./pattern-cue_test-cases.md)
- [Validation](./pattern-cue_validation.md)

## Runtime Boundary

The active runtime accepts an owner-submitted public HTTPS link plus transcript/format notes. It derives a deterministic compact observation, stores one current example on the existing CampaignCue workspace document, and feeds the observation only into video/UGC outputs. Provider analysis remains disabled.
