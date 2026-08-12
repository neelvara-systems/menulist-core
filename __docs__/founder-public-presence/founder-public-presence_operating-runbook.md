# Founder Public Presence Operating Runbook

**Status:** Active
**Last Updated:** August 12, 2026

## Operating Principle

The work produces the content. The content must not become a second product
that displaces the work.

Codex acts as an active guide by noticing useful material, validating it,
capturing it, helping draft it, checking claims and platform fit, and learning
from results. The founder retains final authority over public disclosure,
publishing, replies, messages, follows, subscriptions, spend, and disclosure.

The public identity is frozen as Proof & State. The original identity, face,
natural voice, personal accounts, and personal Git history are not public
content.

Founder-owned actions, blockers, and evidence are maintained in the
[daily progress tracker](./founder-public-presence_progress-tracker.md). Codex
does not infer that an external action happened; the founder reports `DONE`,
`BLOCKED`, or `SKIP` in the active task.

## Daily Workflow

### 0. Identity and privacy gate

Before capture or drafting, check the
[identity and privacy contract](./founder-public-presence_identity-and-privacy.md).
If an artifact or connection could expose the original identity, the candidate
is `blocked` regardless of content value.

### 1. Capture

During any relevant repo or strategy task, ask:

- Did we find a reusable pattern?
- Did an assumption fail?
- Did we protect an important product boundary?
- Did we remove owner or founder work?
- Did we discover a useful failure mode?
- Is there a public-safe artifact or before/after?
- Would this help the intended builder audience?

If yes, add one content-ledger row before final handoff for the related task.
Do not draft a full post automatically unless the material is strong enough or
the founder asks for drafts.

### 2. Validate

Before moving a candidate to the post bank:

1. Check current code, docs, runtime behavior, and verifier evidence.
2. Check the relevant product's claim and launch boundaries.
3. Remove or generalize secrets, private identifiers, customer material, abuse
   thresholds, vulnerabilities, and unreleased strategy.
4. Verify unstable platform or market claims through current primary sources.
5. State limitations and whether the result is local, deployed, measured,
   inferred, or still blocked.

### 3. Shape

Choose one primary lesson and one native format.

| Channel | Default shape |
| --- | --- |
| X short post | One sharp mechanism, decision, or correction; concise and conversational |
| X visual post | One privacy-cleared proof card, diagram, or short silent/captioned recording with the decision underneath it |
| X deeper post | A mechanism that genuinely needs more context; do not lengthen a small idea |
| Reddit comment | Direct answer to the actual question, with experience and limitations; no concealed product plug |
| Reddit native post | Problem -> context -> attempted approach -> implementation -> observed result -> limitations or unresolved question |

### 4. Review

Founder review checks:

- Does this sound like me?
- Is every factual claim supportable today?
- Does the post expose anything private or competitively sensitive?
- Can any name, face, voice, path, commit identity, metadata, product ownership,
  or linked account reveal the original identity?
- Is product affiliation disclosed when relevant?
- Is the audience and channel correct?
- Is there a real reason to publish this now?

### 5. Publish or hold

Codex may prepare and maintain drafts without separate permission during
founder-public-presence work. Codex must not publish, reply, message, follow,
subscribe, purchase, advertise, or create an external account without an
explicit instruction covering that action.

After publication, update the content ledger status and add the post URL when
available.

### 6. Learn

After enough observation time for the channel, record:

- relevant replies and recurring people;
- bookmarks or saves when available;
- profile visits and relevant follows when available;
- qualified conversations or product-fit signals;
- misunderstandings or objections;
- whether the intended lesson was understood;
- what should be repeated, corrected, narrowed, or stopped.

### 7. Record progress

At the end of the daily session:

1. Record the founder result and evidence in the progress tracker.
2. Mark the action `done`, `blocked`, `skipped`, or `unconfirmed`.
3. Name the next dependency.
4. Carry forward at most one unfinished action.
5. Do not create catch-up volume after a missed day.

## Initial Four-Week Cadence

The executable calendar and first twelve-post order live in the
[thirty-day launch plan](./founder-public-presence_launch-plan.md).

### X

- Monday: one production pattern.
- Wednesday: one audit finding, corrected assumption, or product decision.
- Friday: one public-safe screenshot, diagram, or short proof recording.
- On four weekdays: two or three thoughtful replies, aiming for roughly ten to
  fifteen per week.

Use 8:00 PM Asia/Kolkata as a convenient initial publishing time for the first
twelve original posts. It is a controlled baseline, not an algorithm claim.
Review the founder's own response data before changing it.

### Reddit

- Weeks 1-2: three to five useful comments per week across no more than two
  carefully chosen communities.
- Weeks 3-4: continue comments. Do not publish a native post unless the weekly
  review finds a repeated community question and current rules allow it.
- Read current site-wide and subreddit rules immediately before every post or
  product mention.
- Do not link, mention a product, ask for DMs, or solicit users unless the
  community rules clearly allow it and the contribution remains useful without
  the promotion.

This cadence is deliberately smaller than a content-creator schedule. Increase
only when the content ledger contains strong real material and publishing does
not displace product or customer work.

## Weekly Review

Once per week:

1. Review all `captured` content-ledger items.
2. Select at most three strong candidates for the next X week.
3. Select at most one Reddit question or theme worth participating in.
4. Confirm evidence and redaction.
5. Prepare channel-native drafts and any public-safe asset.
6. Review the previous week's metrics and audience quality.
7. Record one keep, one change, and one stop/no-change decision.

## Monthly Review

Every four weeks:

- compare content pillars by meaningful response, not raw reach alone;
- identify repeated audience questions that could become durable technical
  assets;
- review whether the account is becoming too broad, too promotional, or too
  generic;
- check whether the audience is revealing Answerlattice-fit workloads or
  MenuList referral paths without naming products before the privacy gate;
- retire formats that require artificial volume or personality;
- revalidate important platform/community rules;
- update the strategy only when evidence changes it.

## Status Vocabulary

Use only these content-ledger statuses:

- `captured` - useful possibility, not researched enough;
- `validated` - evidence and product boundary checked;
- `drafting` - being turned into channel-native copy;
- `founder-review` - ready for voice, claim, and timing review;
- `approved` - founder approved, not necessarily published;
- `published` - externally published; include URL/date;
- `measuring` - observation window active;
- `reusable` - strong enough to repurpose in a new native format;
- `deferred` - useful only after a named proof/product/platform gate;
- `rejected` - do not publish; retain the reason;
- `retired` - once useful but no longer current or effective.
- `blocked` - fails identity, privacy, product, platform, or proof boundary.

## Safety And Truth Boundary

Public-safe does not mean technically vague. Explain the mechanism without
publishing the exploitable, customer-specific, or competitively sensitive
details.

Examples:

- share that entitlement truth must be enforced server-side; do not publish a
  live bypass or weak endpoint;
- share a sanitized multi-tenant failure pattern; do not expose tenant IDs,
  rules gaps awaiting deployment, or reproduction steps for an active flaw;
- share a cost pattern using rounded or modeled examples; label modeled versus
  measured values;
- share an Answerlattice drift example using approved demo or consented proof;
  do not share customer questions or sources without permission;
- share a MenuList owner-relief decision; do not claim real owner outcomes from
  fictional demo material.
