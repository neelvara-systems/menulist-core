# UGC Script Studio - Implementation

## Runtime Contract

UGC Script Studio is a script and brief workflow, not a creator marketplace. It should share campaign, source, asset, trust, and agency-workspace primitives without inheriting MenuList or Answerlattice product rules.

## Flow

1. Load campaign cue and approved business facts.
2. Select creator role and channel.
3. Generate script pack with persona, phone-camera plan, product-placement note, dialogue/action beats, disclosure, and prohibited-claim notes.
4. Run claim and source checks.
5. Store draft version.
6. Let owner approve, regenerate, export, or send to agency workspace.

## Active Export Runtime

The current CampaignCue runtime emits UGC brief structure through existing `CampaignCueOutput.fields.handoffFields` and the Campaign Pack Output ZIP. It does not create a new UGC provider call, avatar render, voiceover render, creator marketplace record, or video file. The generated handoff fields are deterministic: persona, camera plan, product placement, dialogue/action beats, brand direction, disclosure, consent, and CTA.

## Data Objects

| Object | Purpose |
| --- | --- |
| `ugcBriefs` | Script, role, channel, and business facts used. |
| `ugcBriefVersions` | Versioned scripts and edits. |
| `ugcTrustReports` | Claim, disclosure, and source checks. |
| `ugcExports` | Download, export, or agency handoff history. |

## Trust Rules

- Customer-style scripts cannot claim a real experience unless a source-approved testimonial exists.
- Result claims require explicit evidence.
- Sponsorship or creator disclosure text must be included where relevant.
- First-person usage or recommendation wording such as long-term use, personal results, or "I recommend this" requires source proof, consent, and disclosure before handoff.
- Owner edits must trigger a new trust check before external handoff.

## Acceptance

- Briefs remain useful without any creator marketplace feature.
- Every exported brief has an owner-approved version id.
- Rejected claims remain visible in the trust report.
