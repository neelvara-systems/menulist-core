# Public Truth Tools - Product Specification

**Status:** Active family; first V0 tools and V1 owner check implemented
**Last Updated:** July 4, 2026
**Audience:** CEO, PM, product owner

---

## 1. Executive Summary

Public Truth Tools is a MenuList feature family for small SMB-facing diagnostics that check whether public business facts are clear, current, and machine-readable.

The strategic decision:

```txt
Build this as a reusable MenuList tool/add-on layer, not as a standalone product.
```

The family can grow over time, but each tool must preserve the same product loop:

```txt
Owner or prospect gives source -> MenuList checks facts -> report shows gaps -> MenuList becomes the fix path
```

This keeps the tools useful for acquisition without turning MenuList into a generic SEO, AI visibility, reputation, or engagement platform.

### 1.1 Sequencing Ladder

Every Public Truth Tool must be assigned to a lane before implementation.

| Lane | Product shape | User | Output | Product boundary |
| --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Prospect, owner, agency | Basic report from owner-provided URL/reference/text/visible facts | Free, lightweight, no fake external scan, no default storage |
| V1 | Logged-in MenuList owner check | Existing MenuList owner | Better gaps from actual MenuList store/project truth | Included inside Business Health, Public Discovery, OBP readiness, QR/share readiness |
| V2 | Paid add-on behavior | Multi-location owner, partner, agency | Recurring checks, saved history, monthly report, multi-location scan, partner/agency report | Paid only when recurrence, history, reporting, or multi-location value exists |

The current Public Truth Check implementation includes V0 public self-report and V1 logged-in owner check. Business Facts Copy Pack V0, QR Link Health Check V0, Menu Readability Check V0, Customer Question Coverage Check V0/V1, Booking Inquiry Readiness Check V0/V1, Price Availability Gap Check V0/V1, Menu PDF Cleanup Check V0/V1, Google Profile Basics Checklist V0/V1, One Customer Link Preview V0, Social Bio Link Consistency Check V0, WhatsApp Action Link Check V0, Hours Check V0, and Photo Gap Check V0 are also implemented as public browser-local tools. V2 remains a documented future lane, not shipped runtime behavior.

---

## 2. Why This Exists

SMB public facts drift across many surfaces:

- menu or service list
- prices
- hours
- location
- phone/WhatsApp links
- Google profile links
- Instagram links
- QR codes
- old PDFs
- website pages

MenuList already owns the strongest answer: one owner-approved source. Public Truth Tools make that problem visible in smaller, easier entry points.

The tools are useful because they make an owner think:

```txt
This is why I need one current customer link.
```

They must not make the owner think:

```txt
I need a new dashboard to manage AI visibility.
```

### 2.1 External Research Validation

The July 2026 validation pass supports the same product direction:

| Source | Finding | MenuList implication |
| --- | --- | --- |
| [CFIB, Small Business Digital Presence, December 17, 2025](https://www.cfib-fcei.ca/en/research-economic-analysis/sme-digital-presence) | Nine in ten surveyed small businesses use at least one digital channel; websites, Facebook, Google Business Profile/Maps, and Instagram are the main maintained channels; 66% cite lack of time as the biggest obstacle when using or adopting digital tools. | Public tools should be short, low-effort checks that route to one current customer source. |
| [BrightLocal Local Consumer Review Survey 2026](https://www.brightlocal.com/research/local-consumer-review-survey/) | After positive reviews, 66% of consumers do further research and 54% visit the business website. | MenuList should own the action point customers reach after reviews, profiles, or social discovery. |
| [Google Business Profile Help](https://support.google.com/business/answer/3039617?hl=en) | Google asks owners to keep address, hours, contact, website, social links, photos, descriptions, menu/services, orders, and reservations accurate where available. | Tool checks should focus on the same factual basics, without claiming to inspect or update Google unless an adapter exists. |
| [Google Business Profile local business links](https://support.google.com/business/answer/6218037?hl=en) | Business Profile links can help customers check menus/services and take actions such as booking appointments, making reservations, placing food orders, and placing shopping orders. | Booking/action readiness is a useful check, but MenuList should verify action-path clarity rather than claiming provider inspection. |
| [WhatsApp Business State of Business Messaging 2026](https://whatsappbusiness.com/resources/resource-library/state-of-business-messaging/) | Across 22 markets, 73.3% of consumers prefer messaging a business and 72.4% are more likely to purchase from a brand that offers messaging. | WhatsApp action readiness is a strong MenuList tool candidate, especially for mobile-first SMBs. |
| [Economic Times summary of PayNearby MSME Digital Index 2025](https://economictimes.indiatimes.com/small-biz/sme-sector/73-msmes-report-business-growth-via-digital-adoption-led-by-upi-and-smartphones-survey/articleshow/122124007.cms) | Over 73% of small businesses surveyed across semi-urban and rural India reported increased income or improved efficiency from digital tools; smartphones and UPI are dominant patterns. | Public tools should stay mobile-first and practical, not dashboard-heavy. |
| [MDPI Sustainability 2025 QR menu study](https://www.mdpi.com/2071-1050/17/5/2323) | QR menu service innovation can affect service/e-service quality and customer satisfaction, while technology experience and perceived risk still matter. | QR tools should check clarity, current destination, and customer action, not sell QR as the product. |
| [Google Search Central structured data guide](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) | Structured data helps Google understand page content; Google also says structured data should describe visible page content. | Structured source checks can exist, but must not become ranking or citation promises. |

---

## 3. Product Form

### 3.1 Public Form

Public Truth Tools may appear on the MenuList website as free tools, calculators, or reports.

Allowed public use:

- lead generation
- education
- owner self-check
- agency/freelancer handoff
- proof that MenuList has a practical point of view

Not allowed:

- fake instant audits
- guaranteed ranking or citation claims
- automated external posting
- scraping private/login-only sources
- using third-party data as canonical truth

### 3.2 Owner App Form

Inside the owner app, Public Truth Tools should be surfaced as:

- Business Health checks
- Public Discovery checks
- Official Business Page readiness
- QR/share health
- multi-location consistency checks

They should not become a noisy standalone dashboard unless repeated usage proves a focused owner workflow.

### 3.3 Paid Add-on Form

Tools may become paid add-on value only when they become recurring:

- scheduled re-checks
- report history
- multi-location reports
- agency/client report exports
- owner-approved public source repairs
- partner handoff packs

One-time checks belong to acquisition or included owner value. Recurring monitoring can belong to a paid tier.

---

## 4. Internal Plugin/Module Model

Public Truth Tools should be internally modeled like plugins/modules, even if public copy calls them tools.

Each module needs:

| Field | Meaning |
| --- | --- |
| `id` | Stable kebab-case ID, for example `public-truth-check` |
| `label` | Owner/public label |
| `surface` | Public website, owner app, internal ops, or paid add-on |
| `inputContract` | What the user/system may provide |
| `sourcePolicy` | Which sources can be read and stored |
| `checkContract` | Deterministic checks the module performs |
| `reportContract` | Owner-facing output shape |
| `fixPath` | Where MenuList routes the correction |
| `costClass` | Static, low-cost, AI-cost, provider-cost |
| `riskClass` | Low, medium, high |
| `entitlement` | Free, included, paid, internal |
| `launchState` | Planned, enabled, hidden, disabled |

No tool should bypass this registry. This prevents a growing list from becoming scattered website pages and disconnected owner app widgets.

---

## 5. Candidate Portfolio And Build Order

Do not build a broad toolbox. Build a small acquisition layer around public business truth.

Default conversion loop:

```txt
Free check -> gap report -> create/import MenuList customer link -> owner app readiness -> paid recurring/multi-location/agency reporting only when needed
```

### 5.1 P0 Free Conversion Tools

These are the next public tools to spec, in order.

| Rank | Tool | V0 owner job | V1 owner check | V2 paid/add-on path |
| --- | --- | --- | --- | --- |
| 1 | Public Truth Check | Can customers understand this business from the current public source? | Business Health/Public Discovery/OBP readiness card | Recurring public truth report, multi-location report, agency export |
| 2 | QR Link Health Check | Does this QR code open the right current customer link? | Warn when MenuList QR/share link is stale, unpublished, or weak | Recurring QR/location-table scan, monthly QR health report, branch-level QR audit |
| 3 | Menu / Service Readability Check | Can a customer quickly understand what is sold, prices, and how to act? | Check MenuList project/menu/service truth for missing prices, vague categories, missing descriptions, and weak actions | Monthly clarity report, agency setup checklist, multi-location content consistency |
| 4 | Customer Question Coverage Check | Can the current source answer common customer questions? | Business Health module checks MenuList facts behind core answers | Recurring unanswered-question report, multi-location answer coverage, agency export |
| 5 | Booking Inquiry Readiness Check | Can customers clearly order, book, reserve, call, message, request a quote, or visit? | Business Health module checks MenuList action settings, contact, hours, location, and customer link | Recurring action-readiness report, multi-location action-link governance, agency export |
| 6 | Price & Availability Gap Check | Are prices, variants, unavailable items, and quote paths clear? | Business Health module checks MenuList item prices, variant prices, and availability flags | Monthly price/availability clarity report, multi-location consistency, agency export |
| 7 | Menu PDF Cleanup Check | Should an old PDF be replaced with one current customer link? | Business Health module checks MenuList source and customer-link readiness for PDF replacement | Monthly PDF cleanup report, multi-location PDF/source consistency, agency export |
| 8 | Google Profile Basics Checklist | Are owner-maintained Google Business Profile basics ready for customers? | Existing Google profile handoff module checks MenuList customer-link readiness and owner-confirmed handoff state | Monthly profile-link readiness report, multi-location handoff export, agency setup report |
| 9 | WhatsApp Action Link Check | Can customers tap once to ask, book, order, or call? | Check MenuList public page action links, WhatsApp number, call button, booking/order CTA | WhatsApp-ready customer-link pack, staff handoff templates, multi-location action-link governance |
| 10 | Hours & Holiday Hours Check | Are regular and special hours clear? | Business Health card for hours, temporary status, holiday gaps, and stale hour state | Holiday readiness report, multi-location hours consistency |
| 11 | Photo / Visual Identity Gap Check | Does the public page have enough visual proof? | OBP readiness for logo, cover, storefront, item/service photos, and gallery | Quarterly visual refresh checklist, agency/client export, multi-location photo coverage report |
| 12 | One Customer Link Preview | What will customers see when they open my business link? | Existing public page and Business Health readiness surfaces cover current customer-link basics | Recurring customer-link readiness report, multi-location preview export, agency setup report |
| 13 | Social Bio Link Consistency Check | Do my social bios and profile links point to the current customer link? | Existing Share, Public Discovery, and Business Health readiness surfaces cover current-link basics | Recurring profile-link consistency report, multi-location placement export, agency setup report |

### 5.2 P1 Follow-On Tools

| Tool | V0 owner job | Boundary |
| --- | --- | --- |
| Service List Clarity Check | Can customers understand services, packages, and rates? | Expands beyond restaurants without changing doctrine |
| Action Link Consistency Check | Are the same action links used across owner-maintained surfaces? | Self-check or MenuList-owned surfaces only unless adapter approved |
| Review Request Readiness Check | Do I have a clean way to ask happy customers for a review? | No review manipulation, no fake review generation |
| Structured Source Readiness Check | Can machines understand my MenuList public facts? | MenuList-owned source only; no ranking promise |

### 5.3 P2 Paid Add-On Candidates

| Add-on | Paid user | Paid value | Boundary |
| --- | --- | --- | --- |
| Public Truth Monitor | Serious owner, multi-location owner | Scheduled checks, latest status, history, monthly summary | Paid because recurrence and history create value |
| Multi-location Consistency Pack | Chains, franchises, multi-outlet SMBs | Detect naming, hours, pricing, menu, contact, photo, and action-link drift | Owner-authenticated only |
| Agency Setup Report Pack | Designers, local SEO freelancers, onboarding partners | Exportable client checklist before and after setup | No fake audit; source and checks must be explicit |
| Managed Public Source Repair | Non-technical SMB owner | Team helps convert PDF/WhatsApp/Instagram/menu chaos into one customer source | Human/manual service or approved setup flow |
| Holiday / Seasonal Readiness Monitor | Restaurants, clinics, salons, shops | Checks before public hours, special menus, or seasonal availability go stale | Use owner-approved MenuList truth only |
| Partner / Reseller Multi-client Console | Agencies/resellers | Track many clients' setup readiness and current source status | Paid because agency reporting/history is the value |
| AI/Search Readability Sampling | Internal, agency, paid advanced tier | Sample whether a MenuList-owned source is clear enough for customer/agent understanding | No ranking/citation guarantees; no public model calls without budget cap |

### 5.4 Portfolio Clusters

| Cluster | Tools |
| --- | --- |
| Public Truth | Public Truth Check, Customer Question Coverage Check, One Customer Link Preview, Structured Source Readiness |
| Menu / Service Clarity | Menu Readability Check, Service List Clarity Check, Price & Availability Gap Check, Menu PDF Cleanup Check |
| Customer Action Readiness | QR Link Health Check, Booking Inquiry Readiness Check, WhatsApp Action Link Check, Hours & Holiday Hours Check, Social Bio Link Consistency Check |
| Trust / Scale | Photo / Visual Identity Gap Check, Review Request Readiness Check, Multi-location Consistency Check, Public Truth Monitor, Agency Setup Report Pack |

---

## 6. Relationship To Existing Products

| Product area | Relationship |
| --- | --- |
| MenuList Core | Public Truth Tools reveal and repair gaps in MenuList's core truth layer |
| Business Health | Owner-facing checks can surface as Business Health states |
| Public Discovery | Website/discovery checks can feed public-source readiness |
| Growth Kits | Growth Kits can use passing truth checks before producing copy/share/print outputs |
| Growth Engine | Internal acquisition can use tool results, but must not publish candidate truth |
| Answerlattice | Separate product; do not reuse support-answer MCP positioning |
| CampaignCue | Separate campaign product; do not turn Public Truth Tools into ad/campaign tooling |

---

## 7. In Scope

- MenuList-owned public tool pages
- owner-authenticated checks based on MenuList store/project data
- report exports for agencies or partners after approval
- lead capture connected to MenuList onboarding
- deterministic checks before any AI/model call
- public source clarity and machine-readability checks
- add-on packaging rules
- module registry documentation

---

## 8. Out Of Scope

- broad AI visibility monitoring as the first product
- AI visibility score
- Google ranking tracker
- SEO audit crawler
- competitor spy tool
- Instagram engagement or order tool
- ad budget calculator
- generic revenue calculator
- social hashtag generator
- Reddit, Quora, Facebook, or community engagement ordering
- posting through external accounts
- review manipulation
- review generator
- fake review detector for public users
- directory listing management as a first launch
- external platform mutation
- guaranteed Google/Search/AI outcomes
- direct public-agent writes to MenuList truth
- MCP as the primary owner surface
- a standalone brand/domain

---

## 9. Owner-Side Rules

Owner-facing output must be short and calm.

Allowed:

- "Public source is ready."
- "Hours are missing."
- "Menu link is not set."
- "Photo is missing."
- "No action needed."

Avoid:

- "Your AI visibility is poor."
- "You are losing traffic."
- "Your competitors are ahead."
- "You should optimize."
- "Ranking opportunity."

The tool exists to reduce owner anxiety, not create a new monitoring chore.

---

## 10. Success Metrics

Public acquisition:

- submitted checks
- qualified business sources received
- conversion to create-menu / WhatsApp / get-started
- owner reply rate for manual reports

Owner app:

- number of checks run from existing MenuList stores
- number of gaps resolved through existing owner flows
- reduction in weak OBP/public menu states
- multi-location report usage for eligible stores

Paid add-on:

- recurring report usage
- report exports used by agencies/partners
- upgrades tied to recurring monitoring

Do not use rankings, citations, or external answer placement as success promises.

### 10.1 Quiet Lead Qualification Signals

These signals may guide follow-up, but should not create unnecessary storage or owner-facing scores.

| Signal | Lead quality |
| --- | --- |
| Owner pasted menu/service text | High |
| Owner submitted a PDF/menu source inside an approved setup flow | High |
| Missing public customer link | High |
| WhatsApp/contact provided with consent | High |
| Multiple locations mentioned | Very high / paid add-on candidate |
| Agency/freelancer language | Partner candidate |
| Curiosity click without source/contact | Low |
| External URL only, no consent | Education-only |

V0 tools should keep this lightweight. Store contact or setup context only after explicit consent and through an approved bounded contact/setup flow.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Tool family becomes generic SEO software | Keep each check tied to MenuList public truth |
| Owners feel watched or judged | Use calm status language and only surface actionable facts |
| External source fetching creates legal/security risk | Use explicit source policy, SSRF guards, robots respect, bounded fetches, and no private source access |
| AI answer audit becomes costly | Keep model calls internal, sampled, capped, and not owner-credit billed |
| Add-on creates settings bloat | Add checks to existing surfaces before creating new dashboards |
| Plugin model becomes over-engineered | Use a registry only when at least two tools share contracts |

---

## 12. Doctrine Preservation Decision

This conversation reinforces existing doctrine rather than requiring a new constitution doc.

Existing doctrine already covers:

- MenuList as public business truth infrastructure
- product separation from GrowthOS, Growth Engine, KitStamp, Answerlattice, and CampaignCue
- language governance and no ranking/citation promises
- docs-first feature development
- Firebase cost discipline

Decision: no new constitution file is needed in this pass. The durable decision is preserved in this doc set.
