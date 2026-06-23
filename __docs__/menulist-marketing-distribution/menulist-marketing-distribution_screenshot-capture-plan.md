# MenuList Marketing Distribution - Screenshot Capture Plan

**Status:** Active capture plan  
**Created:** June 22, 2026  
**Owner:** Codex prepares, founder approves final public assets  
**Related actions:** MLD-A010  
**Inputs:** `menulist-marketing-distribution_demo-universe.md`, `menulist-marketing-distribution_demo-source-lists.md`

---

## Purpose

This plan defines how to turn the demo universe into safe launch screenshots and visual proof without publishing unapproved customer data or thin category pages.

It is a capture plan only. It does not create runtime demo tenants, write Firestore data, upload Storage files, change public routes, run production builds, or deploy.

---

## Current Constraint

No founder-approved MenuList demo tenant exists yet for the six core broad-SMB demos.

Until one exists:

- source-before visuals can be static mockups based on `menulist-marketing-distribution_demo-source-lists.md`;
- product screenshots must either use existing safe routes/states or wait for a demo tenant;
- public website pages must not show service-list customer proof as if it were a real customer;
- placeholder-backed salon/spa, service-list, and local-service industry pages may exist when the assets are visibly labelled as sample/demo placeholders;
- final Product Hunt, paid traffic, partner, and broad outreach assets still require approved routed screenshots or permissioned customer assets.

---

## Capture Principles

1. Prefer real MenuList routed UI over static mockups for product proof.
2. Use static mockups only for source-before states, annotations, or planned gallery frames.
3. Capture mobile public output first because SMB customers usually view lists on phones.
4. Keep every frame tied to one proof sentence.
5. Redact or avoid internal IDs, local URLs, emails, billing state, auth tokens, debug labels, Firestore IDs, and test-only banners.
6. Add `Sample business. Demo data only.` where the viewer could mistake a demo business for a real customer.

---

## Recommended Capture Folder

Use this docs-only working area until assets are explicitly approved for `public/`:

```text
__docs__/menulist-marketing-distribution/asset-production/demo-universe/
```

Suggested structure:

```text
asset-production/demo-universe/
├── raw/
├── annotated/
├── export/
├── source-before/
└── README.md
```

Do not move images into `public/images/website/` until founder approval.

---

## Viewports

| Use | Viewport | Notes |
| --- | --- | --- |
| Mobile public proof | 390 x 844 | Primary customer view |
| Narrow mobile stress | 320 x 700 | Text wrapping and button safety |
| Desktop website proof | 1440 x 1000 | Landing/gallery context |
| Product Hunt gallery | 1270 x 760 | Product Hunt recommended gallery frame |
| Vertical video | 1080 x 1920 | Reels/Shorts/Instagram |
| Square thumbnail | 240 x 240 | Product Hunt thumbnail source |

---

## Capture Matrix

| ID | Demo | Surface | Route / source | Status | Use |
| --- | --- | --- | --- | --- | --- |
| CAP-001 | All | `/create-menu` broad source copy | `http://localhost:<port>/create-menu` | Ready | Product Hunt gallery, walkthrough |
| CAP-002 | All | Homepage broad-SMB proof | `http://localhost:<port>/` | Ready | Website proof, launch walkthrough |
| CAP-003 | Local Table Cafe | Source-before old menu | Static mockup from demo source lists | Ready to create | Product Hunt before/after |
| CAP-004 | Local Table Cafe | Public customer menu | Demo tenant public route needed | Blocked | Product Hunt, website proof |
| CAP-005 | Local Table Cafe | QR/table-card proof | Demo tenant or generated asset needed | Blocked | Product Hunt, vertical clip |
| CAP-006 | Glow & Blade Studio | Source-before rate card | Static mockup from demo source lists | Ready to create | Service-list proof |
| CAP-007 | Glow & Blade Studio | Public service-list page | Demo tenant public route needed; placeholder visible at `/industries/salons-spas` | Placeholder only | Salon/spa SEO proof |
| CAP-008 | Glow & Blade Studio | Official Business Page | Demo tenant OBP route needed | Blocked | Website proof, gallery |
| CAP-009 | Spark Auto Detailing | Package/rate-card before state | Static mockup from demo source lists | Ready to create | Local-service proof |
| CAP-010 | Spark Auto Detailing | Public package page | Demo tenant public route needed; placeholder visible at `/industries/local-service-businesses` | Placeholder only | Gallery, outreach |
| CAP-011 | PawKind Grooming | Size-based service list | Demo tenant public route needed | Blocked | Service-list variety proof |
| CAP-012 | Lens & Vows Studio | Package-list public page | Demo tenant public route needed | Blocked | High-consideration services proof |
| CAP-013 | BloomBox Florals | Catalog-lite public page | Demo tenant public route needed | Blocked | Retail/catalog proof |
| CAP-014 | Urban Glow Group | Multi-location consistency | Demo HQ/outlet tenant needed | Blocked | Premium/multi-location proof |
| CAP-015 | All | LLM/claim boundary proof | `http://localhost:<port>/llms.txt` and `/llms-full.txt` | Ready | Internal verification only |

---

## First Capture Batch

Do this before any service-list SEO route is added:

| Batch | Capture | Output |
| --- | --- | --- |
| Batch 1 | `/`, `/create-menu`, `/pricing`, `/features` | Proves website/runtime copy is broad and claim-safe |
| Batch 2 | Static source-before visuals for Local Table Cafe, Glow & Blade Studio, Spark Auto Detailing | Provides before/after inputs without real customer data |
| Batch 3 | Demo tenant public views for Local Table Cafe and Glow & Blade Studio | Proves food + service-list output |
| Batch 4 | Demo tenant public view for Spark Auto Detailing | Proves package/rate-card output |
| Batch 5 | Urban Glow Group multi-location view | Proves higher-value consistency story |

---

## Frame Copy

Use short captions. Do not over-explain.

| Frame | Caption |
| --- | --- |
| Source-before cafe | Old PDFs and screenshots keep circulating |
| Cafe public output | One current menu link for QR and WhatsApp |
| Source-before salon | Instagram highlights and WhatsApp rate cards drift |
| Salon public output | One current service list customers can check |
| Source-before detailing | Package prices keep changing in chat |
| Detailing public output | One package list before customers ask for rates |
| Multi-category grid | Menus, service lists, packages, catalogs, and rates |
| Multi-location proof | Central list, branch-level differences |

---

## Redaction Checklist

Before any screenshot leaves `__docs__`, check:

- No real customer names unless permissioned.
- No real phone/email unless permissioned.
- No owner dashboard account email.
- No Firebase IDs, local IDs, debug IDs, or raw draft tokens.
- No local-only URL as the primary public URL in final assets.
- No private billing, subscription, Razorpay, balance, or staff data.
- No fake reviews, ratings, revenue, ranking, traffic, or customer counts.
- No claim that Google, Instagram, WhatsApp, AI systems, or search engines automatically update from MenuList.

---

## File Naming

Use stable, descriptive names:

```text
menulist-demo-local-table-source-before-mobile-v01.png
menulist-demo-local-table-public-menu-mobile-v01.png
menulist-demo-glow-blade-source-before-mobile-v01.png
menulist-demo-glow-blade-public-service-list-mobile-v01.png
menulist-demo-spark-detailing-rate-card-before-v01.png
menulist-demo-spark-detailing-public-packages-mobile-v01.png
menulist-demo-multi-category-proof-grid-1270x760-v01.png
menulist-demo-urban-glow-multi-location-v01.png
```

---

## Approval Gate

Before assets move into public website, Product Hunt, social, or outreach use:

| Gate | Required |
| --- | --- |
| Founder approves demo names | Yes |
| Founder approves visual style | Yes |
| `Sample business` label present where needed | Yes |
| Claim boundary reviewed | Yes |
| Mobile readability checked | Yes |
| Source data stored in docs | Yes |
| Raw/private captures stay out of public folders | Yes |

---

## Next Step

After this capture plan, the next docs work is:

1. Product Hunt gallery copy and frame order.
2. Short video scripts using the six core demos.
3. Runtime/demo-tenant setup decision if founder wants routed product screenshots instead of static/source mockups.
