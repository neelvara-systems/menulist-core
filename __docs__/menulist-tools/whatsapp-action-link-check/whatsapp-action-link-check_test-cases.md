# WhatsApp Action Link Check - Test Cases

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 16, 2026
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
| Untouched message intent | Initial form before owner selection | Message intent is missing; the default does not prove an owner choice |
| Phone without clear country-code format | Local-looking number only | Unclear |
| Valid wa.me link and complete supporting facts | Link, message, customer link, hours, fallback | Ready |
| Valid phone but no message | Number only | Unclear |
| Valid phone but no customer link | Number and message only | Unclear |
| Invalid WhatsApp link | `https://example.com/whatsapp` | Missing basics or unclear depending on number |
| Malformed WhatsApp link | Parser cannot construct a URL | Link is treated as invalid and capped `whatsapp_action_link_url_parse_failed` diagnostics do not log raw link, phone, message, customer link, report row, or exception text |
| Phone contains letters around enough digits | `+91hello9876543210` | Number is not treated as valid and no preview is generated |
| Invalid phone entered without an existing WhatsApp link | Alphanumeric or malformed phone only | Number and click-to-chat evidence cite phone shape, digits, and country code; they do not claim a WhatsApp link was checked |
| Custom WhatsApp scheme uses unknown host/action | `whatsapp://evil?phone=...` | Neither number nor click-to-chat format is present |
| WhatsApp web host uses non-`/send` path or `wa.me` has extra/nondigit path | Entered link | Link is not treated as a recognized valid click-to-chat destination |
| Suggested order says pickup today but has no opening/reply timing | Valid number and ordinary message | Hours expectation remains unclear |

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
