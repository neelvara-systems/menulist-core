# SignalDesk Demand Signals - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026

## Objective

Capture compact, privacy-bounded signals that show business demand for MenuList, then route those signals into target prioritization and outcome attribution.

## Goals

1. Record warm growth signals from MenuList-controlled surfaces.
2. Summarize signal strength by target, market pod, source, and surface.
3. Improve prioritization without turning customer behavior into personal tracking.
4. Feed route and outcome attribution where a valid route token exists.
5. Surface partner/referral opportunities for operator review.

## Non-Goals

- No customer-level identity graph.
- No tracking anonymous customers across unrelated businesses.
- No public analytics product.
- No automatic prospect creation from customer scan alone.
- No MenuList owner-facing setting in the first build.

## Signal Types

| Signal | Meaning |
| --- | --- |
| `qr_scan_cluster` | QR/menu scan activity suggests a location/category has visible demand. |
| `menu_link_share` | A MenuList link was shared or copied from an allowed surface. |
| `claim_or_setup_click` | A business-facing claim/setup call to action was clicked. |
| `customer_request_menu` | Customer asked for an updated or digital list where allowed. |
| `owner_claim_attempt` | Business owner attempted to claim or start setup. |
| `partner_referral` | Partner or operator records referral intent. |
| `viral_route_touch` | Route token or share path created a measurable follow-on action. |

## Eligibility Rules

| Rule | Requirement |
| --- | --- |
| DEM-001 | Anonymous customer signals must stay aggregate and compact. |
| DEM-002 | A prospect can be created only from business-facing or operator-verified signal. |
| DEM-003 | Each signal must record allowed purpose and source surface. |
| DEM-004 | Demand summaries must be derived from events. |
| DEM-005 | Signals must not bypass suppression rules. |
| DEM-006 | Route-token signals must connect to outcome bridge when available. |

## Acceptance Criteria

- QR/menu scan clusters can influence market-pod prioritization without identifying customers.
- Owner claim attempt can create or update a target for review.
- Partner referral creates a review item, not an automatic outreach send.
- Suppressed targets remain blocked even if demand signals appear.
- Dashboards read summaries, not raw public-surface event streams.
