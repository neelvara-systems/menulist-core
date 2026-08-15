# NotificationOS — Firebase Cost And Data Plan

> **Status:** Implemented cost contract; provider activation pending
> **Last Updated:** August 15, 2026

## Primary Cost Decision

Reuse the current collections and resolve business context once per processing attempt. Email-only, WhatsApp-only and combined delivery must have the same product-scope read count.

## Collections

| Collection                      | Decision                | Purpose                                                                             |
| ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `ownerNotificationEvents`       | Keep/evolve             | One deterministic product event and aggregate state                                 |
| `ownerNotificationDeliveries`   | Keep/evolve             | One deterministic event/channel/destination outcome                                 |
| `ownerNotificationRateLimits`   | Keep/evolve             | Bounded channel/recipient/day guard                                                 |
| EmailOS collections             | Keep separate           | Provider delivery, webhook receipt and email suppression                            |
| WhatsAppOS provider collections | Add only where required | Provider receipt/delivery reconciliation and consent evidence                       |
| `notificationContexts`          | Prohibited              | Would duplicate product data, add writes and create stale consent/contact snapshots |

## Single-Fetch Invariant

For one processing attempt:

1. Fetch canonical store/workspace scope once.
2. Derive recipients, verification, consent, preferences, locale, timezone and currency in memory.
3. Build one semantic message model in memory.
4. Reuse it for every channel.

MenuList may temporarily use one additional legacy nested-store read only when the canonical store is absent. Answerlattice uses at most one workspace read. A combined send must not repeat either read.

## Planned NotificationOS Operations

Let `N` be planned channels (`1` for email-only/WhatsApp-only, `2` for combined) and `R` be non-critical rate-limit documents requiring a read/write.

| Step                    |                            Reads |        Writes | Notes                                              |
| ----------------------- | -------------------------------: | ------------: | -------------------------------------------------- |
| Event claim             |                                1 |             1 | Existing deterministic event transaction           |
| Product scope/context   |                 0-2 ML or 0-1 AL |             0 | Same count for every channel mode                  |
| Plan channels           |                                0 |             0 | Pure in-memory policy                              |
| Claim full plan         |                          `N + R` | Up to `N + R` | Deterministic channel-local safety transactions     |
| Provider calls          |                                0 |             0 | No NotificationOS Firestore work                   |
| Finalize plan and event |                              `N` |       `N + 1` | Re-read each child to prove claim ownership        |

Channel provider OS costs are additional but must not re-fetch product scope.

## Mode Comparison

Assuming one canonical MenuList store read, a non-critical event, and no duplicate:

| Mode             | Scope reads |         Child claims |            Provider calls |    Child final writes |
| ---------------- | ----------: | -------------------: | ------------------------: | --------------------: |
| Email only       |           1 |                    1 |            1 EmailOS call |                     1 |
| WhatsApp only    |           1 |                    1 |         1 WhatsAppOS call |                     1 |
| Email + WhatsApp |           1 | 2 deterministic claims | 2 independent calls | 2 proven final writes |

The combined mode increases only the unavoidable channel-specific claim, provider and result work. It does not double the store/workspace/contact read.

## Retry Cost

- Same attempt: never re-fetch context per channel.
- Later safe retry: re-fetch scope once to respect new consent, suppression and contact truth.
- Terminal duplicate: deterministic event/delivery reads only; zero provider calls.
- Ambiguous provider outcome: no automatic replay; reconciliation uses provider webhook/receipt state.

## Storage And Retention

- Preserve existing 30-day event/delivery and 2-day rate-limit targets unless the active owner-notification policy changes.
- Do not store full HTML, WhatsApp body, raw webhook, access token, address or phone.
- Store recipient hashes and masked support displays only.
- Store child provider references, not duplicate provider state histories.
- Use webhooks, not polling or realtime listeners.

## Cost Acceptance Gates

- Combined-delivery emulator test proves exactly one canonical scope read.
- No channel adapter imports Firestore product DALs.
- No new scheduler; use the existing MenuList maintenance scheduler for TTL compatibility only.
- No unbounded query or listener.
- Operations dashboard stays bounded and derives counts from one recent window.
- Cost tables are updated if implementation changes any count above.
- Trigger classification must reuse data already fetched by the owning transaction/webhook. A second subscription read solely for email or WhatsApp is prohibited.
- Low-credit notification uses the transaction-returned balance and subscription snapshot; incremental Firebase cost is only the normal NotificationOS claim/finalization work.
- Future weekly digests must consume one existing compact summary document per scope. Raw per-feedback, per-menu, or per-location fan-out queries are prohibited.

## Existing Evidence

- Collections are already centralized (`src/data/shared/ownerNotificationRegistry.ts:34-38`).
- Current app processing resolves scope before its channel loop (`src/lib/owner-notifications/index.ts:571-618`).
- Current Functions processing fetches store information before its channel loop (`functions/src/ownerNotifications/processor.ts:811-827`).
- Per-channel claims/finalization intentionally preserve the existing at-most-once ownership proof. The cost invariant is the single product-scope read, which is reused across both channels.
