# KitStamp - Naming Lock

**Status:** Permanent product naming decision
**Decision date:** May 31, 2026
**Decision owner:** Founder direction after domain, MCA, and product-fit review

---

## 1. Permanent Name

The product name is now:

```txt
KitStamp
```

The previous planning name `VisualMeta` is retired. Do not use it for active docs, routes, code, Firebase targets, website copy, product strategy, or implementation planning.

## 2. Naming Architecture

| Layer | Locked value |
| --- | --- |
| Public product brand | KitStamp |
| Product slug | `kitstamp` |
| Product code | `KS` |
| Primary public domain | `kitstamp.com` |
| Defensive/secondary domain | `kitstamp.app` |
| Local dev prefix | `/__kitstamp` |
| Public site route group | `src/app/sites/kitstamp/` |
| App/API namespace | `src/app/kitstamp/`, `src/app/api/kitstamp/` |
| Firebase target prefix | `kitstamp` |
| Functions package | `functions-kitstamp/` |
| Core artifact | Final Content Kit |
| User-facing artifact phrase | Approved Kit |

## 3. Legal Entity Candidate

The preferred India company-name filing order is:

```txt
1. KitStamp Technologies Private Limited
2. KitStamp Software Private Limited
3. KitStamp Labs Private Limited
4. KitStamp Systems Private Limited
5. KitStamp Solutions Private Limited
```

Use `KitStamp Technologies Private Limited` first because it clearly communicates software/technology activity and reduces confusion with physical stamp or stationery businesses.

Do not file only `KitStamp Private Limited` unless a CA/CS confirms it is stronger for the MCA submission.

## 4. MCA And Trademark Status

Current status:

- Public web-indexed search did not surface an obvious exact Indian company/LLP conflict for `KitStamp`, `KitStamp Technologies`, `KitStamp Software`, `KitStamp Labs`, or `Kit Stamp`.
- This is not formal MCA clearance.
- Official MCA V3 name search and SPICe+ Part A name reservation remain required.
- IP India trademark search remains required before public launch.

Formal checks required before incorporation or public brand launch:

```txt
1. MCA V3 Check Company/LLP Name for KITSTAMP and KIT STAMP.
2. SPICe+ Part A name reservation for the selected legal name.
3. IP India trademark search for KITSTAMP in Class 9 and Class 42.
4. Counsel/CA/CS review for Class 35 if service positioning requires it.
5. Registrar purchase confirmation for kitstamp.com and defensive domains.
6. Social handle and GitHub organization availability check.
```

## 5. Product Language

Use this public structure:

```txt
KitStamp prepares source-backed Approved Kits for product, menu, catalog, and listing teams.
```

Use this product definition:

```txt
KitStamp is a content readiness workspace that turns source images, text, translations, and review notes into human-approved Final Content Kits.
```

## 6. Rejected Naming Paths

Do not revive these names unless the naming lock is explicitly reopened:

| Name | Decision |
| --- | --- |
| VisualMeta | Retired; `.com` unavailable, existing external usage, and "Meta" creates unnecessary confusion. |
| ApprovedKit | Keep as artifact language only; too descriptive/generic as the main brand. |
| SourceStamp | Rejected; `.com` is registered and the phrase appears in developer/build-tool contexts. |
| Handoffly | Rejected; `.com` is registered and handoff is a crowded category. |
| KitMarkHQ | Fallback only; weaker than KitStamp. |

## 7. Implementation Rule

All new KitStamp implementation docs and code must use:

```txt
KitStamp
kitstamp
KS
```

No active implementation file may introduce `VisualMeta`, `visualmeta`, `visual-meta`, `VM`, or `visual_meta` for this product.

