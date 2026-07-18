# Owner Notifications And Messaging Onboarding Verification

**Strict-order flow:** 6 of 14
**Date:** July 16, 2026
**Status:** Local source complete after the gates listed below; provider, deployment, authenticated browser/device, and production-host evidence remain pending

## Product Boundary

These are two connected but separate flows:

- Owner Notifications sends important lifecycle messages to an already-known owner/account contact. It is not an owner activity feed, an order feed, marketing automation, or a support inbox.
- Messaging Onboarding is a temporary WhatsApp acquisition and menu-publish tunnel. It owns webhook intake, media collection, extraction, preview, approval, publish, claim handoff, and provider replies. It closes after publish and does not write into the owner-notification event/delivery ledger.
- Detailed delivery and recovery state stays on authenticated platform-only monitors. No owner notification center, notification settings screen, or MobileShell delivery-log screen is currently shipped.

## End-To-End Flow Matrix

| Flow | Source path | Admission and consistency boundary | Owner/end-user result |
| --- | --- | --- | --- |
| Lifecycle trigger | Billing/subscription, credits, publish verification, and staleness sources call the registered MenuList lifecycle event | Product trigger registry, runtime gates, normalized tenant/store/reference IDs, deterministic event ID | One important lifecycle notice is eligible; unknown or disabled triggers skip safely |
| Event creation | App core or Functions processor creates `ownerNotificationEvents/{eventId}` | Transactional create-if-absent; full event JSON must be at most 128KB | Retries do not create another logical event |
| Recipient resolution | Canonical store/tenant/account truth plus explicit manual-override policy | Tenant/store scope match; bounded contact normalization; revoked WhatsApp consent overrides stale legacy booleans | Email goes only to the resolved owner contact; WhatsApp requires current consent |
| Formatting | Product-scoped fixed templates | Escaped metadata, allowlisted links, fixed failure copy, locale/currency/time formatting | Owner sees plain account-critical copy without raw provider/runtime data |
| Provider delivery | SMTP or WhatsApp Graph API | Daily recipient/store limits; SMTP and Graph timeouts; WhatsApp redirect refusal; bounded provider IDs/responses | Successful email/WhatsApp delivery is recorded; provider failure does not become a false success |
| Delivery/recovery | Deterministic delivery row and event status | At most two claimable attempts; platform-only bounded monitor and manual recovery | Owners do not see technical logs or a fabricated notification badge/feed |
| Messaging webhook | Meta GET verification or HMAC-authenticated POST | Runtime/provider gate, raw-body signature verification, normalized bounded message batch, durable dedupe before ACK | Provider retries converge on the same inbound work |
| Messaging intake | `messagingOnboardingInboundMessages` drained by the existing maintenance scheduler | Per-user/session rate limits, active-session transaction, hard expiry, bounded upload/rejection counters | Owner receives deterministic upload guidance without duplicate session mutations |
| Media lookup/download | WhatsApp Graph metadata lookup and media fetch | HTTPS/network-target validation, redirect refusal, 15-second API and 30-second media aborts, byte/signature/hash checks | Invalid, redirected, oversized, or stalled media fails safely; credentials are not forwarded through redirects |
| Extraction | Asset Intelligence then shared menu-extraction job/worker | File/page/job/project size caps, durable job identity, stale-run rejection, hard expiry | Valid menu data reaches one preview; invalid/incomplete input gets bounded retry guidance |
| Preview/fix/approve | Token-bound `/msg-preview/{sessionId}` read and mutation routes | Bounded response/body parsing, session/token/state checks, transaction claims, stale-device concurrency handling | Owner can inspect, correct, approve, copy, or share from mobile/desktop browser |
| Publish and claim | Active Next.js publish executor creates tenant, store, project, public output, and claim handoff | Idempotent published result, atomic publish identity, public cache refresh boundary, one claim path | Owner receives the live menu link and can claim the same account/public URL |
| Terminal lifecycle | Confirmation delivery, tunnel close, reminders, hard expiry, cleanup and platform monitor | Token-bound outbound leases, capped claims, durable orphan cleanup, bounded retention/read models | Post-publish messages cannot turn WhatsApp into an ongoing dashboard or support channel |

## Corrections Made In This Pass

- Removed the desktop header's hard-coded “New Order Placed” rows and unread badge. They were sample UI, not real owner-notification data.
- Added the same shared current-consent boundary to app and Functions recipient resolution, including explicit revoke/deny precedence.
- Rejected owner-notification event documents above 128KB before Firestore creation or provider work.
- Added bounded SMTP/Graph timeouts, manual redirect handling for authenticated WhatsApp calls, and bounded control-free provider message IDs.
- Stabilized publish-verification failure identity to one store/day so repeated verification does not send a new critical message on every retry.
- Updated owner-notification and messaging-onboarding docs/tests to describe the current external-delivery and provider-disabled boundaries.
- Reduced the messaging health control check from every two-minute intake run to the first four minutes of each UTC hour. The existing transaction lease still provides final authority, while the enabled idle path drops from about 720 control reads/day to at most 48.
- Pending preview, publish-confirmation, and fix delivery helpers now return sent/error counts. Scheduler activity and health metrics can no longer report a quiet success when one of those provider queries or sends failed.

## Long-Term And Scale Decision

No new scheduler, collection, notification inbox, owner setting, or delivery queue was added. The current append-only event plus deterministic delivery-row model is adequate for the present scale, and messaging intake already uses the consolidated maintenance scheduler. Provider calls are bounded, growing monitor queries stay capped/manual, event payload growth fails closed, hourly health keeps its transactional lease without paying a control read on every idle poll, and outbound retry results now reach scheduler health.

A hard runtime termination after an external provider accepts a message but before Firestore acknowledgement remains an unavoidable ambiguous-delivery case. Automatically reclaiming that row could duplicate an important message. The current safe policy is bounded provider calls, observable platform recovery, and manual handoff rather than an unproven exactly-once layer. Revisit only if production evidence shows material stuck-delivery volume.

## Verification Gates

- `npm run verify:owner-notifications-boundary`
- `npm run test:owner-notification-delivery-boundaries`
- `npm run test:notification-delivery-claim:emulator`
- `npm run verify:messaging-onboarding-monitor-boundary`
- `npm run verify:platform-notifications-boundary`
- `npm run verify:menu-extraction-pipeline`
- `npx tsc --noEmit --incremental false`
- `npm --prefix functions run build`
- `npm --prefix functions run lint`
- scoped root ESLint, documentation link check, and `git diff --check`

## External And Owner-Pending Evidence

- Isolate and approve the intended app and Functions release from the shared worktree.
- Configure an owned Meta WhatsApp Business number, real secrets, verify token, webhook registration, and target-specific feature enablement.
- Run real SMTP and WhatsApp success/failure/timeout/template smoke on QA.
- Run authenticated platform monitor and owner lifecycle smoke, plus messaging upload, preview, fix, approve, publish, copy/share, and account-claim smoke on desktop and mobile devices.
- Verify the public menu/cache result and production host after the approved release.

Local source completion does not certify any of these external outcomes.
