# Tools Hub - Product Spec

**Last Updated:** July 9, 2026

## Job

An SMB owner, agency, or partner needs one page that answers:

> Which MenuList free check should I run for this public business truth problem?

Tools Hub should make the growing MenuList Tools portfolio navigable without creating a broad toolbox.

## Product Positioning

The hub is an acquisition and education layer for MenuList public business truth.

It should say:

- check a public fact/setup gap
- understand what was checked
- use MenuList as the fix path
- create or clean up one current customer link

It should not say:

- SEO audit
- AI visibility score
- ranking checker
- citation tracker
- reputation management
- engagement placement
- external platform repair

## Core Rule

The hub is an index, not a report runner.

It does not create a report, calculate score, ask for owner facts, submit leads, inspect links, or persist state. Every actual diagnostic remains inside the individual tool route and its own contract.

## Tool Groups

| Group | Owner job | Routes |
| --- | --- | --- |
| Public Truth | Check the basic public facts and customer-link readiness | `/tools/public-truth-check`, `/tools/business-facts-copy-pack`, `/tools/customer-question-coverage-check`, `/tools/customer-faq-reply-pack`, `/tools/customer-link-preview`, `/tools/social-bio-link-check`, `/tools/google-profile-basics-checklist` |
| Menu / Service Clarity | Check whether the public source is understandable | `/tools/menu-readability-check`, `/tools/price-availability-gap-check`, `/tools/menu-pdf-cleanup-check` |
| Customer Action Readiness | Check whether customers can act cleanly | `/tools/qr-link-health-check`, `/tools/booking-inquiry-readiness-check`, `/tools/whatsapp-action-link-check`, `/tools/whatsapp-reply-pack`, `/tools/hours-check` |
| Print & Share Assets | Create lightweight assets from one current customer link | `/tools/qr-poster-maker`, `/tools/whatsapp-menu-status-maker`, `/tools/holiday-hours-poster-maker`, `/tools/customer-link-card-maker`, `/tools/feedback-qr-card-maker` |
| Trust / Setup | Check basic trust/setup gaps | `/tools/photo-gap-check` |

## Owner Outcome

The owner should leave the hub with one of these actions:

- run a specific free public check
- start with Public Truth Check
- create one current customer link
- review Business Health after becoming a MenuList owner

## Acceptance

- `/tools` renders when `ENABLE_PUBLIC_TRUTH_TOOLS` and `ENABLE_PUBLIC_TRUTH_TOOLS_HUB` are true.
- `/tools` returns 404 when either flag is false.
- All 21 current public tool routes are visible.
- Copy is calm, factual, and non-technical.
- The page states no scan/crawl/ranking/citation promise.
- Route is present in discovery policy, sitemap, `llms.txt`, and `llms-full.txt`.
