# PresenceOS Research And Accountability Automations

**Status:** Active operating contract
**Mode:** One heartbeat attached to the current local Codex task, with two daily
occurrences

| Occurrence | Cadence | Automation ID |
| --- | --- | --- |
| Morning Presence Brief | Daily at 8:30 AM Asia/Kolkata | `proof-state-daily-presence-brief` |
| Evening accountability check | Daily at 9:30 PM Asia/Kolkata | `proof-state-daily-presence-brief` |

The app permits one active heartbeat on a task. The shared automation branches
by local run time so both occurrences use the same task history and tracker.

## Purpose

The morning Presence Brief prevents the founder from having to interpret every
platform change or search for content ideas alone. The evening check records
the result, identifies what remains pending, and reminds the founder of one
small unfinished action when no completion evidence exists. Publishing and all
other external actions stay manual.

## Required Inputs

Each run reads:

1. `README.md` and the identity/privacy boundary;
2. the strategy, platform playbook, launch plan, and operating runbook;
3. the progress tracker plus the content, post, research, metrics, and decision
   ledgers;
4. current relevant repository work without exposing unrelated private changes;
5. current primary platform sources and a rotating subset of the maintained
   account-pattern watchlist.

## Daily Output

Use this exact compact structure:

```text
Presence Brief — YYYY-MM-DD

Progress status
- Yesterday: done, blocked, skipped, carried-forward, or unconfirmed, with recorded evidence.
- Pending on founder: one current dependency.

Material change
- One current platform, community, or account-pattern change with a direct source; or “No material change.”

Best content candidate
- One evidence-backed lesson from current work or the ledger.
- Why it helps the target audience.
- Privacy/product boundary.

Best engagement opportunity
- One topic, question, or account class worth checking manually.
- Suggested reply angle; never a fabricated exact reply to an unseen post.

Today’s action
- Exactly one small founder action: account setup, one post, two replies, one Reddit comment, prepare proof, resolve a blocker, or intentionally do nothing.

Do not do
- One current risk, duplication, weak claim, or privacy issue to avoid.
```

The brief must not create a second action merely because yesterday was missed.
It carries forward the most important unfinished action and explicitly states
what Codex has already prepared.

## Evening Accountability Output

Use this exact compact structure:

```text
Proof & State Check-in — YYYY-MM-DD

Status
- done, blocked, skipped, or unconfirmed.

Recorded evidence
- URL/result, or “No completion evidence recorded.”

Pending on your side
- Exactly one smallest next action, or “Nothing pending today.”

Reply with one line
- DONE <URL or result>
- BLOCKED <reason>
- SKIP <reason>

Tomorrow
- Carry forward one action, choose the next dependency, or keep the planned cadence.
```

When completion is already recorded, the evening heartbeat acknowledges it and
states the next dependency without issuing another same-day task. When no result
is recorded, it uses `unconfirmed`; it never says the founder failed.

## Research Rules

- Prefer official current platform sources for policy, feature, and
  recommendation claims.
- Use creator material only as evidence of their method or self-reported
  history, not a universal causal claim.
- Compare against previous ledger entries and report deltas first.
- A source is added only when it changes a decision, closes an uncertainty, or
  adds a transferable successful-account pattern.
- “No material change” is a valid and preferred result over filler.
- Never print secrets, private diffs, customer material, personal identity, or
  unpublished vulnerability detail.
- For an X recommendation or visibility change, inspect an exact current source
  or pinned code commit and report deltas between candidate retrieval,
  predicted-action ranking, parameter defaults, reranking, visibility labels,
  and transparency-tool eligibility. Never turn a coefficient or eligibility
  threshold into a posting instruction.
- Treat the account's own `Under the Hood` report as higher-quality diagnostic
  evidence when eligible. Until then, low reach is an observation—not proof of
  a visibility label or platform restriction.

## Repository Maintenance

The run may update the research ledger, content ledger, or post bank when a
material item is found. It must preserve history, cite the source/evidence, and
record the privacy boundary.

Both runs may update the progress tracker from explicit founder results. They
must never infer completion from silence, elapsed time, or an unverified
external profile.

It must not create a new dashboard, database, public route, scraper, product
feature, or second operating system without a separate architecture decision.

## External-Action Boundary

The heartbeat may research, recommend, capture, redact, and draft. It must not
create accounts, publish, reply, comment, DM, follow, subscribe, purchase,
advertise, verify, or change an external profile.

## Duplicate And Noise Guard

Before emitting a brief:

- compare the last seven daily findings;
- do not repeat the same recommendation unless evidence changed;
- choose one action, not a list of optional chores;
- do not treat a repo commit, creator post, or platform announcement as useful
  merely because it is new.

Before emitting an evening check:

- inspect the progress tracker and recent task messages;
- do not remind when today's completion is already recorded;
- do not stack missed actions or create catch-up volume;
- surface only one founder-owned action and one named blocker;
- keep the tone neutral, direct, and practical.
