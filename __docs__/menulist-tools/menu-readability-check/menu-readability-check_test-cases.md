# Menu Readability Check - Test Cases

**Status:** Implemented - V0 public route
**Last Updated:** July 4, 2026
**Audience:** QA and developers

---

## 1. Route And Feature Gates

| Case | Expected |
| --- | --- |
| Visit `/tools/menu-readability-check` with Public Truth Tools enabled | Page renders |
| Disable `ENABLE_PUBLIC_TRUTH_TOOLS` | Route returns not found |
| Disable `ENABLE_PUBLIC_TRUTH_MENU_READABILITY_CHECK` | Route returns not found |
| Route metadata | Title, description, canonical, and structured data use `/tools/menu-readability-check` |

---

## 2. Browser-Local Report

| Input | Expected status |
| --- | --- |
| No pasted source text | `missing_basics` |
| URL path contains order/book/call words but pasted source and owner selection contain no action | Customer action remains missing |
| Very short text | `missing_basics` |
| Usable text with items but no prices/action | `unclear` |
| Usable text with categories, items, prices, descriptions, action, and valid link | `ready` |
| Prices marked not needed and action visible | Can be `ready` when other required clarity rows pass |

---

## 3. Evidence Text

Each row must show explicit evidence text:

- Source material row says pasted text was checked.
- Categories row says owner selection or pasted text structure was checked.
- Items/services row says pasted text lines were checked.
- Prices row says owner selection or price hints were checked.
- Description row says owner selection or pasted text detail was checked.
- Customer action row says owner selection or action hints were checked.
- Public link row says URL format was checked and not fetched.

---

## 4. Storage And Network Boundaries

| Boundary | Expected |
| --- | --- |
| Report generation | No `fetch` call |
| File upload | No file input |
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

- `src/lib/seo/discoveryPolicy.ts` includes `/tools/menu-readability-check`
- `public/sitemap.xml` includes `https://menulist.ai/tools/menu-readability-check`
- `public/llms.txt` includes the route
- `public/llms-full.txt` includes the route
- `en-US` and `hi-IN` locale keys exist

---

## 7. Forbidden Claims

The route, component, report builder, docs, sitemap, and LLM files must not include:

- guaranteed ranking
- guaranteed citation
- guaranteed AI visibility
- scanned your website
- read your PDF
- rewrote your menu
