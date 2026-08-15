# Founder Public Presence Decision Log

**Status:** Active; append decisions, do not rewrite history
**Last Updated:** August 15, 2026

## Decision Format

Each entry records the trigger, decision, evidence, rejected alternative,
consequence, and documents changed.

## FPP-D001 — Create one personal founder account system

**Identity portion superseded by FPP-D004.** The single-account operating
system and audience decision remain; the earlier real-identity assumption does
not.

**Date:** August 12, 2026
**Trigger:** The founder is beginning X and Reddit from scratch and asked Codex
to act as an ongoing proactive guide.

**Historical decision:** Maintain one founder-account operating system in this
folder. The original version assumed a stable personal identity rather than an
indie-hacker, AI-founder, MenuList-only, Neelvara, or multi-product showroom
identity. FPP-D004 later reversed only the real-identity assumption.

**Evidence:** The portfolio has different buyers and launch gates. Answerlattice
has a narrow founder/studio distribution wedge; MenuList has a separate
owner-focused acquisition system; CampaignCue remains distribution-gated; and
Neelvara is a quiet company trust surface.

**Rejected alternatives:**

- MenuList as the entire personal identity;
- a generic developer tutorial account;
- an “AI founder” or “vibe coder” identity;
- equal promotion of MenuList, Answerlattice, and CampaignCue;
- a Neelvara-hosted founder funnel;
- a high-volume creator schedule.

**Consequence:** The personal content promise is turning AI-assisted software
into reliable products. Answerlattice is the primary audience bridge; MenuList
supplies recurring proof and case studies; CampaignCue stays absent for now.

## FPP-D002 — Codex maintains the system proactively but cannot publish by implication

**Date:** August 12, 2026
**Trigger:** The founder requested full-focus daily guidance and proactive
maintenance.

**Decision:** During relevant repo, strategy, research, or content work, Codex
must capture material post candidates, source findings, decisions, and observed
results in this folder without waiting for a separate documentation reminder.

This permission covers repository documentation and drafting. It does not
authorize external account creation, publishing, replies, DMs, follows,
subscriptions, spend, or disclosure of private material. Those actions still
require explicit founder direction.

**Consequence:** The mandatory behavior is mirrored in `.codex/rules/`,
`.cascade/rules/`, and `AGENTS.md`, and is also recorded through the allowed
Codex memory-extension mechanism.

## FPP-D003 — Start with a sustainable four-week baseline

**Date:** August 12, 2026

**Decision:** Begin with three original X posts and roughly ten to fifteen useful
replies per week. Use Reddit comments first and no more than one native post in
the first month.

**Reason:** The founder is new to both platforms and is still building the
underlying products. A smaller evidence-led cadence provides cleaner learning
and reduces pressure to manufacture content.

**Review gate:** Reassess after twelve X posts using audience quality,
repetition, saves, qualified conversations, founder time, and product-fit
signals—not follower count alone.

## FPP-D004 — Use one transparent pseudonymous identity

**Date:** August 12, 2026
**Trigger:** The founder set an absolute boundary that the original identity
must not be exposed publicly anywhere.

**Decision:** Use `Proof & State` with first-choice handle `@proofandstate`.
Describe it as pseudonymous when relevant. Do not invent a human name,
biography, face, voice, or location. Do not claim the platforms lack private
registration or identity information.

**Reason:** A stable pseudonym can accumulate trust through artifacts and
behavior without misrepresenting a fake person. X and Reddit permit
pseudonymous public participation; Instagram allows identity to remain
undisclosed publicly but requires accurate private registration information.

**Consequence:** The original real-name/face recommendation is reversed.
Profile, assets, post bank, rules, and privacy gates follow the alias.

## FPP-D005 — Withhold product and repository connections at launch

**Date:** August 12, 2026

**Decision:** Do not name or link MenuList, Answerlattice, Neelvara, a founder
hub, a domain, or a repository during the first thirty days. A product-specific
identity-correlation audit must clear each connection.

**Evidence:** Current Git history contains personal-associated author metadata.
Company, domain, app-store, provider, and historical ownership surfaces have
not yet been comprehensively cleared.

**Consequence:** The account teaches general mechanisms first. Direct product
distribution is delayed by privacy, not by lack of content.

## FPP-D006 — Start X and Reddit; gate or reject other channels

**Date:** August 12, 2026

**Decision:** Start X as primary and Reddit comments as community participation.
Instagram requires four proven native visuals and acceptance of Meta's private
registration boundary. Facebook and LinkedIn are not launch channels. YouTube
requires repeated demand for faceless long-form material.

**Reason:** Channel fit and identity risk differ. LinkedIn's User Agreement
requires a member's personal account to use their real name. Facebook Page
management requires an authentic private profile and may expose
manager-country or owner information through Page Transparency.

## FPP-D007 — Create PresenceOS and a daily research heartbeat

**Accountability cadence superseded by FPP-D008.** The internal-only automation
and external-action boundary remain.

**Date:** August 12, 2026

**Decision:** Treat this folder as the internal PresenceOS. Schedule one daily
8:30 AM Asia/Kolkata Codex heartbeat that returns a delta-first Presence Brief,
updates ledgers only for material findings, and recommends at most one action.

**Boundary:** Research, capture, redaction, and drafts may be automated.
Accounts, posts, replies, comments, messages, follows, purchases, verification,
and spend remain manual and require explicit external-action authority.

## FPP-D008 — Add evidence-based daily accountability

**Date:** August 12, 2026
**Trigger:** The founder asked Codex to track daily progress, remind them when an
action is missed, and identify what remains pending on their side.

**Decision:** Use one task-attached heartbeat with two daily occurrences: an
8:30 AM Presence Brief and a 9:30 PM accountability check. Maintain the founder
queue in `founder-public-presence_progress-tracker.md`.

Completion requires a founder-provided URL or clear result. Silence is
`unconfirmed`, not failure. Carry forward at most one action and never double
the next day's workload. The founder reports `DONE`, `BLOCKED`, or `SKIP` so
Codex can update the evidence and guide the next dependency.

## FPP-D009 — Use a proof-led composite, not one creator template

**Date:** August 12, 2026
**Trigger:** Read-only review of eight current X profiles and recent visible
posts through the founder's logged-in Chrome session.

**Decision:** Combine a sharp profile promise, repeated technical territory,
public-safe artifacts, source receipts, product boundaries, and substantive
questions. Do not model Proof & State on any one creator.

**Adopt:** ByteByteGo-style promise clarity, shadcn-style artifacts, Simon
Willison-style receipts, Jason Fried-style product judgment, and Arvid
Kahl-style topic-advancing questions.

**Reject:** Revenue-dashboard identity, many-product showroom bios, extreme
volume, personal lifestyle exposure, controversy, generic motivation, and
audience-growth advice without first-party evidence.

## FPP-D010 — Use X's open algorithm as an evidence boundary, not a growth formula

**Date:** August 14, 2026
**Trigger:** X published expanded For You ranking, filtering, label, and
`Under the Hood` transparency code on August 13, 2026. The founder asked that
the resulting strategy change become durable and govern future work.

**Decision:** Proof & State will optimize for close audience relevance,
substantive continuation, original proof-backed posts, safe links, account
security, and avoidance of spam-like or negative-feedback behavior. It will
not optimize around raw published weights or increase volume to satisfy a
transparency-report threshold.

Candidate retrieval, predicted-action ranking, parameter defaults, author and
network adjustments, reranking, visibility filtering, and report eligibility
remain distinct. Algorithm-derived conclusions require an exact source commit,
and the account's own results and eventual label report outrank generalized
creator advice.

**Cadence consequence:** Keep three original X posts and roughly ten to fifteen
useful replies per week. The ten-post prior-month requirement is an
`Under the Hood` access condition, not a ranking lever. A new account also
cannot qualify until it is at least one year old and selected into the pilot.

**Rejected alternatives:** Daily quota expansion, reply bait, copying the
largest action coefficients, converting coefficient ratios into
likes-equivalent engagement targets, treating freshness or cold-start code as
a reach guarantee, and diagnosing a shadow restriction from low impressions
alone.

**Evidence:** [Official X announcement](https://x.com/XOpenSource/status/2087951962004230428),
[`x-algorithm` commit `a389166`](https://github.com/xai-org/x-algorithm/tree/a389166f6cf5da70a286b568c87695d4dcdce3a1),
and research-ledger entry `FPP-R028`.
