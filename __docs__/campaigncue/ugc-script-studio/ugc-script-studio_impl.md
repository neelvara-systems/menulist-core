# UGC Script Studio - Implementation

## Runtime Contract

UGC Script Studio is a script and brief workflow, not a creator marketplace. It should share campaign, source, asset, trust, and agency-workspace primitives without inheriting MenuList or Answerlattice product rules.

## Flow

1. Load campaign cue and approved business facts.
2. Select creator role and channel.
3. Generate script pack with disclosure and prohibited-claim notes.
4. Run claim and source checks.
5. Store draft version.
6. Let owner approve, regenerate, export, or send to agency workspace.

## Data Objects

| Object | Purpose |
| --- | --- |
| `ugcBriefs` | Script, role, channel, and business facts used. |
| `ugcBriefVersions` | Versioned scripts and edits. |
| `ugcTrustReports` | Claim, disclosure, and source checks. |
| `ugcExports` | Download, copy, or agency handoff history. |

## Trust Rules

- Customer-style scripts cannot claim a real experience unless a source-approved testimonial exists.
- Result claims require explicit evidence.
- Sponsorship or creator disclosure text must be included where relevant.
- Owner edits must trigger a new trust check before external handoff.

## Acceptance

- Briefs remain useful without any creator marketplace feature.
- Every exported brief has an owner-approved version id.
- Rejected claims remain visible in the trust report.

