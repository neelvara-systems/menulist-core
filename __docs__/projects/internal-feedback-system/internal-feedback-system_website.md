# Internal Feedback System — Website Surface

**Status:** IMPLEMENTED  
**Last Updated:** June 10, 2026  
**Audience:** Website, product marketing, docs, launch QA

---

## 1. Public Placement

The Internal Feedback System is represented on the public website as:

- Dedicated feature page: `/features/customer-feedback-loop`
- Features page Operations card: `Customer feedback loop`
- Desktop Features dropdown link: `Customer feedback loop`
- Mobile hamburger feature list link under `Operate`: `Customer feedback loop`
- Discovery inventory: `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`

It is included in the Operate navigation group because public feedback is a real post-publish owner workflow: customer issue report, owner review, and approved-source correction.

---

## 2. Public Label

Use:

- `Customer feedback loop`
- `Private guest feedback`
- `Customer-reported issues`
- `Feedback QR`
- `Owner inbox`

Avoid:

- `Reviews`
- `Review management`
- `Reputation management`
- `Sentiment dashboard`
- `Review gating`
- `Automated replies`

The public story is correction and owner control, not reputation automation.

---

## 3. Website Claim Contract

Safe public claims:

- Customers can send feedback from public menu, Official Business Page, QR, or direct link surfaces.
- Customers can report wrong prices, missing items, outdated details, service concerns, or other issues.
- Owners review feedback privately.
- Owners can mark feedback status and use it to correct the approved source.
- Business Health may surface quiet attention signals when feedback needs review.
- The feedback path is controlled by store/menu settings and owner-side access.

Do not claim:

- MenuList guarantees better public reviews.
- MenuList filters customers before public review sites.
- MenuList publishes testimonials automatically.
- MenuList performs public sentiment analysis.
- MenuList replies to reviews automatically.
- MenuList updates public platforms automatically from feedback.
- Feedback changes the public menu without owner review.

---

## 4. Feature Relationship

Customer feedback belongs near these public stories:

- **Business Health:** quiet attention signal when guest feedback needs review.
- **Official Business Page:** customer-facing business surface where feedback can be offered.
- **QR Menu and Links:** feedback can be reached through QR/direct-link placement.
- **Menu Quality Validation:** customer-reported issues can reveal wrong prices, missing items, or outdated details after publishing.

It should not be merged fully into Business Health because Business Health is the summary/status surface. The dedicated page explains the full customer-to-owner correction loop.

---

## 5. Runtime Scope

This website pass does not change:

- `guestFeedback` data model
- public feedback submission endpoint
- owner inbox behavior
- mobile owner feedback screen
- Firestore rules or indexes
- Cloud Function retention behavior
- rate limits
- pricing, payment, auth, or customer menu runtime

The website only reflects the already-shipped feature in public copy, route metadata, discovery files, and docs.
