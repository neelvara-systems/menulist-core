# Campaign Operating Loop - Test Cases

## Deterministic Decision Cases

1. Quiet restaurant, available stock, current lunch input: lunch recipe receives a pulse boost.
2. Closed business: promotional recipe is blocked.
3. Full capacity: slot/demand recipe is blocked.
4. Low stock: product campaign needs review.
5. Discounts disabled and active input says `20% off`: blocked.
6. Maximum discount 10 and input says `20% off`: blocked.
7. Minimum price 499 INR and input says `Rs 399`: blocked.
8. Do-not-promote contains `hair spa` and current input matches it: blocked.
9. Expired pulse: required refresh before pack creation.
10. Workspace timezone, not server timezone, determines weekday/weekend scoring.
11. Expired source input: excluded from active evidence and shown as expired.

## Recipe Cases

1. Review recipe without verified review destination: required input.
2. Review recipe with destination but no completed-interaction note: remains blocked on the missing note.
3. Review recipe with destination and a non-identifying completed-interaction note: creates manual WhatsApp/staff/counter handoff.
4. Manipulated or incentivized review language: blocked by Trust Center.
5. Return-customer recipe without audience description: required input.
6. Return-customer input contains no customer identifiers and sends manually.
7. Audience input containing an email, phone number, or paste/import-contact instruction: rejected before Firestore write.
8. Presence destination using a non-HTTP protocol: rejected before Firestore write.

## Freshness Cases

1. Same sorted fact set in different query order: same source hash.
2. Current source hash matches: download/export/mark-used/schedule accepted.
3. Current source hash differs: action rejected with 409.
4. Pack expiry passed: action rejected with 409.
5. Current source snapshot missing: action rejected with 409.
6. Legacy pack without freshness receipt: visible unknown review state; no false current claim.
7. Recipe expiry is longer than current pulse/source validity: stored pack expiry uses the earliest valid boundary.

## Result And Learning Cases

1. `not_used` does not change campaign status to used and stores no use time.
2. Positive signal increments useful count.
3. `not_useful` increments not-useful count.
4. Metrics are bounded non-negative integers.
5. Result receipt records owner-reported confidence and experiment variable.
6. Positive measured response produces a timing test; missing CTA produces a CTA test; missing confirmed visual produces a photo test.
7. Record-outcome request without a result signal is rejected before Firestore reads/writes.
8. `not_used` discards submitted use metrics in both the campaign receipt and compact event metadata.

## Staff Task Cases

1. Manual schedule request without a valid date-time is rejected before Firestore reads/writes.
2. Manual schedule with a valid date-time stores the bounded task type and optional assignee on the existing schedule document.
3. No staff contact profile, direct message, or delivery provider record is created.

## Firebase Cost Cases

1. Overview remains eight reads and zero realtime listeners.
2. Decision render adds zero reads and writes.
3. Business save reuses the existing three-document batch.
4. Only public-use actions for freshness-enabled packs add the current source-snapshot read.
5. No new collection, Storage object, Function, scheduler, or provider call exists.

## Campaign Rhythm And Reuse Cases

1. Requested approval outranks all other rhythm actions.
2. Scheduled task whose date passed is shown as due even when its stored status is still `scheduled`.
3. A due task outranks an older missing result receipt.
4. Used pack without a result outranks a reuse suggestion.
5. Earliest future manual task becomes the next scheduled rhythm item.
6. Positive owner result nominates at most one reusable pack.
7. Archived, trust-blocked, or only-not-useful campaign is not nominated.
8. Safe reuse sends `reuseCampaignId`, preserves the source recipe, and creates a new source hash/trust/freshness/approval/result lifecycle.
9. Missing reuse source fails before writes.
10. Reuse adds zero incremental reads beyond the existing campaign-create read set.
11. Stale, expired, or unknown-freshness generated pack is never labeled `pack_ready`.

## Approval Cases

1. Repeated request while already requested is a no-op.
2. Request, approve, and reject reuse one deterministic approval document ID.
3. Concurrent approve/reject attempts recheck requested state in one transaction; only the first decision succeeds.
4. Used, archived, and already-approved packs cannot start another approval request.
5. Agency workspace blocks download/export/mark-used/schedule while approval is not approved.
6. Requested and rejected campaigns block public-use actions in every workspace.
7. Owner/admin/reviewer/local-manager can approve or reject.
8. Marketer and agency-member cannot resolve approval.
9. Reject without a reason fails schema validation.
10. Approval never clears a trust/freshness/commercial blocker.
11. Re-request after rejection keeps the original approval-document creation time.
12. Rapid repeated request/approve/reject clicks are disabled while the first action is running.

## Readiness Cases

1. Five checks contribute 20 points each.
2. Any blocked check makes overall status blocked regardless of score.
3. Missing required fact returns needs input.
4. Pending approval returns blocked.
5. Score and UI copy use `Pack readiness`, never engagement, reach, or predicted-performance language.
6. Approved non-agency pack says it is approved rather than incorrectly saying no approval gate exists.

## Result And Export Wiring Cases

1. Campaign Rhythm opens the exact used campaign that is missing a result, not whichever campaign is newest.
2. Pack-row and editor result actions retain that selected campaign in the Results form.
3. Result write remains disabled until the owner selects a bounded result signal.
4. Editor ZIP download starts only after the protected server export action succeeds.
5. Rapid repeated schedule, download, export, mark-used, and result actions are disabled while the first request is running.
6. Switching the result target clears the previous campaign's note, metrics, use time, and tested variable.
7. Tested variable remains absent unless the owner explicitly chooses one.
