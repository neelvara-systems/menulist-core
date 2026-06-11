# Multi-Location Center - Spec

## Summary

Multi-Location Center lets a business create one campaign idea and localize it by branch, city, service availability, opening hours, price, inventory, approval state, and channel connection.

## Goals

- Support multi-location restaurants, salons, and local-service groups.
- Prevent one location's facts from leaking into another location's campaign.
- Allow central campaign planning with local approval and overrides.
- Compare results by location without broad raw scans.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Location facts | Campaign outputs use the selected location's facts, address, hours, prices, services, and channel connections. |
| Group campaigns | A central campaign can create localized drafts for multiple locations. |
| Overrides | Local managers can request or apply allowed changes. |
| Approval state | Approval is tracked per location and output version. |
| Publish status | Channel readiness and publish/manual status is per location. |
| Location analytics | Results can be viewed by location and rolled up by group. |

## Non-Goals

- It does not merge locations into one public identity.
- It does not assume every branch offers the same items/services.
- It does not publish all locations from one approval unless configured.

## Risks

- Wrong location facts can create customer-facing errors.
- Bulk publishing can increase provider quota and Firebase cost.
- Location-level permissions need strict enforcement.

