# MyCodex Founder Console Specification

## Goal

Give the single platform owner one calm place to inspect and operate MenuList and Answerlattice from a phone or laptop without merging the products or duplicating their data.

## User

Only a signed-in user whose current persisted account has the exact global `PLATFORM` role. The intended human identity is `admin@neelvara.com`; authorization is role-based rather than hardcoded to an email.

## Information architecture

| Area | Purpose |
| --- | --- |
| Today | Immediate operational attention and the shortest path to the daily monitors |
| Products | MenuList and Answerlattice administration grouped by owning product |
| Systems | Schedulers, extraction, notifications, costs, and provider-facing operational health |
| Documents | Existing private MyCodex reader, queue, favorites, and search |
| Settings | Theme, session, installed-app behavior, and sign out |

## Product rules

1. MyCodex is the private experience shell only.
2. MenuList data stays in MenuList services and Firebase.
3. Answerlattice data stays in Answerlattice services and Firebase.
4. No browser receives Admin credentials or performs cross-product Admin reads.
5. Every protected page and API rechecks platform authority at a server or governed current-access boundary.
6. Product failure remains isolated: one unavailable product must not falsely mark the other healthy or unusable.
7. Statuses distinguish healthy, attention, unavailable, unknown, and stale.
8. Development diagnostics do not appear in normal production navigation.

## Route inventory

The console catalog covers every current platform capability:

- Shared operations: Founder Monitor, Ops Control Room, Scheduler Monitor, Extraction Monitor, Cost Posture, and Business Health Monitor.
- MenuList: tenants, stores, users, pricing plans, entity blocks, asset templates, messaging onboarding, owner notifications, platform notifications, report leads, and website enquiries.
- Answerlattice: early access, intake, support tickets, feedback, knowledge base, KB generation, changelog, chat management, chat insights, chat backfill, weekly digest, ROI calculator, and widget management.
- Development-only: Sentry testing, visible only outside production.

The old `/platform/*` and `/ops/*` URLs remain compatibility routes during local certification. MyCodex does not duplicate their APIs or business logic.

## Responsive behavior

- Phone: bottom navigation, single-column cards, 44px controls, safe-area spacing, and mobile-specific high-frequency monitors.
- Tablet: compact navigation rail or drawer with responsive content.
- Laptop: persistent navigation rail, wider work area, keyboard focus, and full operational components.
- Wide desktop: bounded content width for the home surface; data-heavy operational tools may use the available width.

## Appearance contract

- One persisted light/dark preference governs the Founder Console, embedded MenuList and Answerlattice operational tools, and the private document reader.
- Laptop navigation and the phone header expose an immediate theme toggle; the reader keeps its toggle in Reader settings.
- A mode change survives navigation between Documents and Operations and is applied before paint on the next MyCodex load.
- Ant Design content and the MyCodex shell may not display opposite themes on the same screen.

## Offline behavior

- The generic MyCodex recovery shell may remain available; private documents and operational responses are never cached by the service worker.
- Operational screens show an explicit offline state.
- Refresh, retry, approve, reject, publish, send, toggle, backfill, delete, block, unblock, and scheduler actions are unavailable offline.
- No action is queued for later replay.

## Non-goals

- No public admin portal.
- No MyCodex Firebase project.
- No product-data replication.
- No cross-product search over customer records.
- No CampaignCue surface.
- No new helpdesk, analytics, or governance doctrine for Answerlattice.
