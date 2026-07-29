# Releases and Changelog Specification

## Product job

When a SaaS product changes, the founder must be able to announce the change and identify which approved support answers may now be stale without publishing an unsupported or partially propagated release note.

Before a versioned note activates its release dependency, the target contract
must also let the founder inspect the directly affected canonical answers and
explicitly linked Answer Tests. This is the admitted preventive part of the
external Release Impact Guard proposal.

## Actors

- **Founder or knowledge manager:** drafts and publishes release notes.
- **Answerlattice release service:** admits ordered releases and evaluates affected answers.
- **Reviewer:** resolves drifted canonical answers.
- **End user:** sees only explicitly published, workspace-correct entries.

## Invariants

1. Releases belong to one exact `pId=AL`, `tId`, and `sId` scope.
2. Versions are canonical numeric labels with matching normalized integers.
3. A release contains one to 25 unique changed entity IDs owned by the workspace.
4. A version must be greater than the latest stored release version.
5. A versioned public changelog entry requires an active release dependency.
6. The entry and release must have the same normalized version, release timestamp, and changed-entity set.
7. Drafts, missing `published`, and versioned entries without a valid `releaseId` are not deliverable.
8. Support tickets, notes, or changelog text never become canonical truth automatically.

## Publication states

- **Draft announcement:** `published=false`; may be versioned but does not affect public delivery.
- **Pending release:** release exists with `status=pending`; note remains draft.
- **Processing release:** activation lease is active; note remains draft.
- **Active linked release:** release evaluation completed; note may publish with exact `releaseId`.
- **Legacy unlinked versioned note:** normalized as a draft until repaired.

## Pre-Activation Impact Preview

The implemented flow inserts this bounded step between release creation and
activation:

```text
private versioned draft
  -> pending immutable release
  -> direct support-impact preview
  -> owner confirms current preview
  -> release activation and drift marking
  -> exact linked changelog publication
```

The preview:

1. reads the strict pending release;
2. resolves at most 200 active canonical answers whose governed entity bindings
   overlap the release;
3. returns only bounded answer identity, version, drift/review state, and exact
   match reason;
4. identifies active Answer Tests explicitly linked to the changed entities;
5. distinguishes current test proof, stale proof, missing proof, and critical
   failure without running a provider call automatically;
6. returns a deterministic fingerprint over the release version, changed
   entities, and affected authoritative source versions;
7. lets the owner open a directly affected answer or the release-scoped Answer
   Tests workflow without changing preview state;
8. performs no knowledge, release, changelog, drift, or test write.

Activation must recompute the authoritative affected-answer input and reject a
stale preview fingerprint. The owner then reviews the new preview.

The preview remains advisory. A founder may activate after acknowledging risk,
but Answerlattice must not claim `support ready` merely because no direct
answer was found.

## Release Impact Guard Proposal Decision

| Proposal | Decision |
|---|---|
| Preventive review before activation | Implemented in the bounded direct-impact form above. |
| Release and public changelog remain separate | Already implemented; preserve. |
| Canonical-answer impact | Implemented reactively and preventively through the read-only preview. |
| Release-scoped Answer Tests | Implemented; compose proof into the preview and open the existing release check with validated context without duplicating tests. |
| Atomic change units | Validate first. Current founder flow uses one release plus 1-25 changed entities. |
| Article, procedure, and product-surface impact queue | Validate first; current dependency completeness is not proven. |
| Evidence tiers and one-hop graph propagation | Reject from the initial hardening. Use direct governed mappings only. |
| Support-readiness state machine and accepted-risk lifecycle | Reject. It creates a second task/release system and false confidence. |
| Scheduled future canonical versions | Reject until canonical version activation is separately designed and proven. |
| Automatic suppression of stale answers | Reject from this feature; retrieval safety requires a separate doctrine and runtime decision. |
| Post-release causal monitoring | Reject. Existing friction evidence may be reviewed separately without causal claims. |
| Dedicated Release Guard summary and collections | Reject until production telemetry proves current bounded release reads are costly. |
| CI/CD or deployment gate | Reject. |

## Failure behavior

- Duplicate create requests replay only when the request fingerprint matches.
- Reused request IDs with changed data return conflict.
- Failed release activation returns the release to `pending` and records a fixed failure state.
- If publication propagation fails after staging, the note remains a draft and the owner is told to reopen and retry.
- Invalid scope, stored shape, dependency, or page size fails closed.

## Non-goals

- A public status page or incident timeline.
- Arbitrary semantic-version formats or mutable release history.
- Automatic approval of drifted answers.
- A full documentation CMS or help-desk replacement.
- Public exposure of release IDs, entity IDs, audit actors, or internal context keys.
- change-unit planning, engineering tasks, deployment state, or feature flags;
- automatic support-readiness decisions;
- scheduled publication of future canonical truth;
- persisted impact-item, accepted-risk, or monitoring workflows;
- semantic impact inference presented as confirmed dependency;
- causal release-to-friction claims.

## Success measures

- Versioned public notes with exact active release linkage: 100%.
- Draft or unlinked versioned notes reaching public surfaces: 0.
- Release activation failures stranded in `processing`: 0.
- Affected answers evaluated within the 200-answer activation cap.
- Time from release activation to review of drifted priority answers.
- Percentage of versioned activations preceded by a current direct-impact
  preview.
- Number of activations rejected because the preview became stale.
