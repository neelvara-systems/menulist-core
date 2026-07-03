# Google Profile Basics Checklist - Specification

**Status:** Implemented V0 public tool; V1 maps to existing owner Google handoff module
**Last Updated:** July 2, 2026
**Audience:** CEO, PM, product owner

## Owner Job

> Are the Google Business Profile facts I maintain ready for customers, and do they point to one current customer source?

This is a self-report checklist. It makes a common SMB setup gap visible without pretending MenuList inspected Google.

## Research Basis

Google Business Profile help says owners can edit details such as address, hours, contact information, and photos. Google's local business links guidance says profiles can include links for menus, service lists, booking, reservations, and ordering. Google's category guidance says category-specific features include restaurant menu/order/reservation links and health/beauty service/booking features.

Reference sources:

- https://support.google.com/business/answer/3039617
- https://support.google.com/business/answer/6218037
- https://support.google.com/business/answer/7249669
- https://support.google.com/business/answer/10842217

## V0 Input

- business name
- city or area
- website/current customer link
- profile access claimed or verified
- name matches real-world business
- primary category set
- address or service area clear
- hours current
- phone/message action present
- menu/service/catalog/rate-card link present
- order/booking/reservation/enquiry action present where relevant
- photos present

## V0 Report

Every row includes `evidenceText`.

Rows:

- profile access
- business identity
- category
- address or service area
- hours
- contact and website link
- menu or service link
- customer action links
- photos
- Google profile inspection boundary

## V1 Owner Check

The logged-in owner surface reuses the existing `google_profile_handoff` module in `ownerPublicTruthReadiness.ts`.

It checks:

- whether a live MenuList official/customer link exists
- whether the owner-confirmed Google link handoff flag is set

It does not scan Google.

## V2 Paid Add-On Path

Paid value can exist only when recurrence/history/reporting creates value:

- monthly profile-link readiness report
- multi-location Google handoff report
- agency setup export
- owner-approved managed setup handoff

## Explicit Non-Goals

V0 does not open Google, fetch Google Search, fetch Google Maps, inspect a Business Profile, verify profile ownership, update Google, check rankings, inspect reviews, call AI providers, scan search results, or update external platforms.

Do not position this as SEO, ranking management, review management, or listings management.
