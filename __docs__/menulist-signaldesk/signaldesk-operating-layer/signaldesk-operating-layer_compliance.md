# SignalDesk Operating Layer - Compliance

**Status:** Implemented
**Created:** June 24, 2026
**Last Updated:** July 16, 2026

## Rules

- Daily missions may recommend only approved action classes.
- Missions cannot send, publish, spend, or mutate MenuList truth.
- Offer/CTA records must store blocked claims.
- Reply playbooks must map unsubscribe, stop, complaint, wrong-contact, and DNC-like replies to suppression or human review.
- Source-quality snapshots must measure risk and outcomes, not only lead volume.
- Research Agent Table rows must preserve source refs and use `pass`, `fail`, or `unsure` as review priority only; they are not contact permission.
- Experiment cards must include stop rules before execution.
- New experiment cards must define comparison windows, a primary metric, known confounders, and the next evidence readback before execution.
- Every experiment review must record a fresh 2-1000 character result summary before repeat, narrow, hold, stop, or complete; `pending` cannot be submitted as a review decision.
- Readback plans may support founder decisions only. They cannot automatically promote, roll back, send, publish, spend, or convert correlation into proof.
- Provider send remains blocked until sender, physical address, unsubscribe, bounce, complaint, suppression sync, and caps are implemented and approved.

## Banned Defaults

- No cold WhatsApp default.
- No cold Instagram or Messenger DM default.
- No "guaranteed sales" or ranking claims.
- No invented MenuList proof.
- No public SignalDesk page.
- No auto-publish.
- No paid campaign automation.

## Human Review

Founder or growth reviewer must approve:

- first market pod;
- source class;
- sender identity;
- first use of outbound channel;
- provider spend;
- partner spend;
- unsupported claim resolution;
- any scale-up decision.
- every experiment decision after reviewing the stated metric and confounders and recording the fresh result summary.
