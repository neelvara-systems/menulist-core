# QR Link Health Check - Test Cases

**Status:** Implemented - V0 public route
**Last Updated:** July 4, 2026
**Audience:** QA and developers

---

## 1. Route And Feature Gates

| Case | Expected |
| --- | --- |
| Visit `/tools/qr-link-health-check` with Public Truth Tools enabled | Page renders |
| Disable `ENABLE_PUBLIC_TRUTH_TOOLS` | Route returns not found |
| Disable `ENABLE_PUBLIC_TRUTH_QR_LINK_HEALTH_CHECK` | Route returns not found |
| Route metadata | Title, description, canonical, and structured data use `/tools/qr-link-health-check` |

---

## 2. Browser-Local Report

| Input | Expected status |
| --- | --- |
| No URL | `missing_basics` |
| `not-a-url` | `missing_basics` |
| `ftp://example.com/menu` | `missing_basics` |
| `http://localhost/menu` or `http://192.168.1.10/menu` | `missing_basics` |
| `https://example.com/menu` with no current/action/context selections | `unclear` |
| `https://menulist.ai/client/demo` with current/action/context selected | `ready` |
| Valid URL with replacement needed selected | `manual_review_needed` |

---

## 3. Evidence Text

Each row must show explicit evidence text:

- QR target row says the URL was owner-entered or missing.
- URL format row says the public HTTPS URL was parsed locally and not fetched, or that local/private/insecure targets are not accepted.
- MenuList row says host-based inference only.
- Current/action/context rows say they are owner-selected.
- Target page inspection says the target page was not opened.

---

## 4. Storage And Network Boundaries

| Boundary | Expected |
| --- | --- |
| Report generation | No `fetch` call |
| QR image upload | No file input |
| Firestore write | None in report path |
| Storage upload | None |
| AI/search | None |
| Contact handoff | Existing `/api/public/contact` only after consent and security check |

---

## 5. Report Actions

| Action | Expected |
| --- | --- |
| Copy report | Copies plain text report to clipboard/fallback |
| Download report | Downloads browser-local `.txt` file |
| Create customer link CTA | Goes to `/create-menu` |
| Follow-up without consent | Shows validation error |
| Follow-up without security check | Shows validation error |

---

## 6. Public Discovery Files

Verifier must confirm:

- `src/lib/seo/discoveryPolicy.ts` includes `/tools/qr-link-health-check`
- `public/sitemap.xml` includes `https://menulist.ai/tools/qr-link-health-check`
- `public/llms.txt` includes the route
- `public/llms-full.txt` includes the route
- `en-US` and `hi-IN` locale keys exist

---

## 7. Forbidden Claims

The route, component, report builder, docs, sitemap, and LLM files must not include:

- guaranteed ranking
- guaranteed citation
- guaranteed AI visibility
- scanned your QR
- checked your website
- tracked QR scans
