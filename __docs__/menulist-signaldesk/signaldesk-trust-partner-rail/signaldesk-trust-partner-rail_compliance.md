# SignalDesk Trust Partner Rail - Compliance Policy

**Status:** Runtime implemented for internal testing; disclosure and claim gates remain mandatory before real partner execution
**Created:** June 24, 2026

## Core Rule

Trust Partner Rail may help MenuList buy or earn trust, but it must not hide incentives, invent claims, or create misleading partner content.

## Source Guidance

| Source | Rule adopted |
| --- | --- |
| FTC Endorsement Guides | Material connections between advertiser and endorser must be disclosed when they could affect credibility. |
| FTC Disclosures 101 for Social Media Influencers | Relationship disclosures should be hard to miss and use plain language. |

Official sources:

- https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers
- https://www.ftc.gov/news-events/news/press-releases/2023/06/federal-trade-commission-announces-updated-advertising-guides-combat-deceptive-reviews-endorsements

## Mandatory Deal Checklist

Before approving a paid or incentivized partner post:

1. Partner identity is known.
2. Audience fit is documented.
3. Flat fee or incentive is recorded.
4. Disclosure requirement is written in the brief.
5. Banned claims are listed.
6. CTA is approved.
7. Budget cap is approved.
8. Post date and deliverables are recorded.
9. Outcome tracking link or code is ready.
10. Founder/admin approved the deal.

## Required Disclosure State

Each deal and deliverable must store:

| Field | Purpose |
| --- | --- |
| `materialConnectionType` | Paid, free service, discount, affiliate, referral, or unpaid. |
| `disclosureRequired` | Boolean. |
| `disclosureInstruction` | Plain instruction for the partner. |
| `disclosureObserved` | Unknown, present, missing, or not applicable. |
| `reviewedBy` | Reviewer ID. |
| `reviewedAt` | Review timestamp. |

## Banned Claims

Partners must not claim:

- guaranteed sales;
- guaranteed ranking;
- official Google, WhatsApp, Instagram, Meta, POS, or payment-platform partnership;
- MenuList automatically updates third-party profiles;
- MenuList already built a business page for the target;
- scraped or private data source claims;
- customer loss claims without approved evidence;
- any statement not present in the approved brief.

## Approved Message Shape

Partner briefs may say:

- MenuList helps restaurants turn a current menu or service list into a usable customer link;
- MenuList can help owners share one current link across QR, WhatsApp, Google/Profile, and repeat customers;
- owners should review before publishing;
- the approved CTA for the test.

## Payment And Contract Boundary

SignalDesk may track:

- agreed flat fee;
- deliverables;
- due dates;
- payment status note;
- contract link if stored in an approved system.

SignalDesk must not execute payment, sign contracts, or auto-approve legal terms.

## Stop Rules

Pause the partner, niche, or campaign if:

- disclosure is missing on paid/incentivized content;
- content includes a banned claim;
- audience complains about deception or spam;
- partner asks to hide the relationship;
- comments show confusion about what MenuList does;
- cost per activated business exceeds cap;
- founder/admin cannot verify attribution.
