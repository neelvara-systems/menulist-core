# MenuList Live Support Coverage Index For Answerlattice

**Verified:** 2026-07-20 against the 26-source package, current MenuList feature inventory, cross-system audits, and Answerlattice intake/support contracts.

## Purpose

This index defines the minimum MenuList support coverage required before live SMB owners use Answerlattice. It is a coverage and routing map, not evidence that every source-complete feature is deployed or entitled for the current account.

## Availability Labels

| Label | Meaning for Answerlattice |
| --- | --- |
| `current` | Current owner/public behavior is implemented in source. Account, permission, provider, and release state still apply. |
| `conditional` | Explain the workflow only after checking plan, role, feature flag, location policy, provider, or current account state. |
| `disabled` | Do not guide the owner as if it is available. Explain the current boundary or route to support. |
| `internal` | Operator/platform capability; never present it as an ordinary owner feature. |
| `separate_product` | Exclude from MenuList answers except for an explicit product-boundary explanation. |
| `not_shipped` | Strategy, scaffold, or future option with no current owner runtime. |

## Required Coverage Areas

| Area | Package sources | Availability | Required answer behavior |
| --- | --- | --- | --- |
| Product identity and product boundaries | `01`, `06`, `09`, `20`, `23` | current | Explain MenuList as owner-approved customer-facing business truth, not a marketplace, POS, generic website builder, or autonomous publisher. |
| Account access, onboarding, logout, and data lifecycle | `02`, `11`, `19`, `20`, `26` | current/conditional | Guide supported sign-in and access recovery; keep upload sign-in-first; escalate merge, ownership, privacy, deletion, and last-owner cases. |
| Menu creation, extraction, link import, identity checks, and review | `02`, `12`, `19`, `26` | current/conditional | Keep source permission, owner review, wrong-menu/outlet warnings, bounded retry, and no auto-publish explicit. |
| Project editing, pricing, bulk changes, save, publish, and cache | `04`, `12`, `13`, `19`, `26` | current | Require acknowledgement; preserve text/range/option prices; explain save/publish/cache checks without exposing internals. |
| AI Menu Manager | `12`, `20`, `23`, `26` | conditional | Explain selected-menu answers and registered proposal cards; approval and stale-version checks remain mandatory; do not call it autonomous. |
| Descriptions, translations, image generation/editing, and AI Transactions | `12`, `16`, `19`, `20`, `23`, `26` | conditional | Explain credit estimate, reservation, valid-output settlement, terminal-failure restoration, owner review, and private prompt/provider boundaries. |
| Public menu, item detail, stable URLs, QR, and sharing | `03`, `13`, `19`, `22`, `26` | current | Guide active-menu, store, URL, scan, save, refresh, and escalation checks. |
| Official Business Page and public profile | `03`, `13`, `14`, `22`, `23` | current/conditional | Explain current business identity/actions and owner-managed fields; do not invent third-party verification. |
| Store profile, public attributes, hours, timezone, and temporary status | `14`, `19`, `22`, `26` | current | Check saved weekly hours and business timezone; use Temporary Status/today's hours for one-off changes; do not claim holiday calendars. |
| Owner/public localization, date/time, number, currency, and RTL | `03`, `05`, `14`, `19`, `20`, `23`, `26` | current | Distinguish owner UI language, store/public chrome language, and owner-entered content language; never guess translated high-risk facts. |
| Menu Kit, print/PDF/card assets, communications, and QR placement | `03`, `13`, `15`, `22`, `23`, `26` | current/conditional | Explain browser-local/download outputs and scan testing; old downloaded files cannot update themselves. |
| Digital Screens and Customer App | `03`, `15`, `19`, `22`, `23` | current/conditional | Check active content, correct link, browser/network, and current account state; public/installable surfaces load current truth online. |
| MobileShell and owner PWA lifecycle | `05`, `11`, `19`, `20`, `23`, `26` | current | Keep owner actions inside MobileShell; connectivity is advisory; explicit refresh accepts updates; no complete private offline dashboard promise. |
| Today, setup progress, Business Health, analytics, and owner read models | `18`, `20`, `23`, `26` | current/conditional | Today is primary; Business Health is read-only; analytics are bounded business signals, not personal/billing records. |
| Guest Feedback and Help Center | `18`, `19`, `20`, `23` | current/conditional | Guide authenticated owner handling; preserve attachment/private-content boundaries; route unsupported answers to support. |
| Staff, roles, permissions, staff reference, and sessions | `05`, `11`, `17`, `19`, `20`, `26` | current | Never bypass permissions or expose credentials; Owner role is operational and does not transfer business authority. |
| Locations, master/outlet inheritance, local overrides, and capacity | `05`, `16`, `17`, `23`, `26` | conditional | Explain HQ/outlet policy and billing scope; do not merge locations or promise capacity without current account truth. |
| Exact external location identity | `09`, `14`, `17`, `23`, `26` | conditional/internal | URI-only is not a stable Place ID; confirmed bindings are exact-location, attributable, internal, reversible, and non-propagating. |
| Billing, Razorpay, subscription lifecycle, and enhancement packs | `09`, `16`, `19`, `20`, `24` | conditional/high-risk | Read current account/policy truth; paid-cycle cancelled/paused access ends at valid cycle end; escalate disputes and exact tax/invoice questions. |
| Public discovery, agent readability, public API, and external sync | `03`, `05`, `09`, `14`, `22`, `23`, `25`, `26` | conditional | Explain official source/structured discovery and enabled pull/signed snapshot paths; no ranking, citation, universal sync, or posting promise. |
| Presence checklist and Public Truth Tools | `18`, `22`, `23`, `26` | current/conditional | Treat checks/reports as diagnostics and owner confirmations, not external-provider verification or ranking evidence. |
| Accessibility, failure recovery, and observability | `05`, `19`, `20`, `23`, `26` | current | Use truthful retry/refresh/help actions; do not say diagnostics were sent unless acknowledged or clear caches as ordinary recovery. |
| Ownership transfer, dormant lifecycle, and privacy requests | `11`, `17`, `19`, `20`, `24`, `26` | conditional/high-risk | Role changes do not transfer ownership; staleness is advisory; complete account/data actions require verified support. |
| Reviews/Reputation, AI Reply Assist, GBP posting, owner referral | `09`, `18`, `23`, `25`, `26` | disabled/conditional | Do not promise direct posting or reward availability. Explain only current gated/read-only or support boundary. |
| Legal, privacy, trust, pricing, refunds, and contact | `09`, `16`, `20`, `24` | high-risk | Use current dated policy truth, avoid legal interpretation, and escalate account-specific or disputed cases. |
| Internal platform, reseller, schedulers, cost, and monitoring | `09`, `20`, `23`, `25` | internal | Exclude internal implementation and operational status from ordinary owner answers. |
| Answerlattice, CampaignCue, GrowthOS, KitStamp, MyCodex, Canonica, SignalDesk, and other sibling products | `01`, `09`, `20`, `23`, `25` | separate_product | Do not blend sister-product features, pricing, routes, data, or claims into MenuList support. |

## Required Review Before Production Use

Before enabling Answerlattice for live MenuList owners:

- import and review all 26 source files;
- validate every source/payload/manifest entry with the package verifier;
- approve canonical answers for all routine owner workflows;
- run all 75 owner-style test questions;
- approve exact product surfaces and widget contexts;
- verify current plans, flags, provider availability, deployment state, and account entitlements;
- review billing/refund/legal/privacy/security/ownership/integration wording;
- verify public menu/OBP stale-data and wrong-location escalation;
- verify AI credit settlement/restoration and owner Transactions wording;
- verify locale/timezone/RTL behavior on desktop, MobileShell, public menu, OBP, and feedback;
- review every screenshot and public citation separately from source ingestion.

## Missing Or Account-Specific Data

This package intentionally excludes production tenant IDs, store IDs, project IDs, owner/staff identifiers, support messages, invoices, raw analytics rows, raw AI prompts/responses, provider secrets, logs, and private screenshots.

Answerlattice may use account-specific state only through an approved authenticated runtime path with exact MenuList scope. Package ingestion must not manufacture that state.

## Launch Rule

If a live owner asks a question that is not covered by approved canonical truth, or the answer depends on current account/provider/deployment state that Answerlattice cannot verify, it must not guess. Give the smallest safe next step, route to authenticated support, and record the missing answer as a governed knowledge gap.
