# WhatsApp Action Link Check - Test Cases

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** QA and engineering

---

## Route And Flag

| Case | Expected |
| --- | --- |
| `/tools/whatsapp-action-link-check` with flags enabled | Page renders |
| `ENABLE_PUBLIC_TRUTH_TOOLS` disabled | Route returns not found |
| `ENABLE_PUBLIC_TRUTH_WHATSAPP_ACTION_LINK_CHECK` disabled | Route returns not found |

---

## Report Cases

| Case | Input | Expected status |
| --- | --- | --- |
| Empty form | No number or link | Missing basics |
| Phone without clear country-code format | Local-looking number only | Unclear |
| Valid wa.me link and complete supporting facts | Link, message, customer link, hours, fallback | Ready |
| Valid phone but no message | Number only | Unclear |
| Valid phone but no customer link | Number and message only | Unclear |
| Invalid WhatsApp link | `https://example.com/whatsapp` | Missing basics or unclear depending on number |

---

## Boundary Cases

| Case | Expected |
| --- | --- |
| No file input | No upload control exists |
| WhatsApp link entered | Link is not opened |
| WhatsApp number entered | Number is not verified |
| Suggested message entered | Message is not sent |
| Current customer link entered | URL format only, link is not fetched |
| Copy report | Browser clipboard action only |
| Download report | Browser text file only |
| Follow-up submitted without consent | Inline error |
| Follow-up submitted with consent | Existing `/api/public/contact` route only |

---

## Forbidden Claims

The route, component, docs, `llms.txt`, and `llms-full.txt` must not claim:

- WhatsApp account verified
- WhatsApp message sent
- website scanned
- Google inspected
- AI/search checked
- ranking improved
- orders guaranteed

---

## Responsive Checks

| Viewport | Expected |
| --- | --- |
| Desktop | Hero/form split, no horizontal overflow |
| 390px mobile | Single-column, form usable, report readable, no horizontal overflow |
