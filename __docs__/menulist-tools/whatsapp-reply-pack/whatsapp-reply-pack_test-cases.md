# WhatsApp Reply Pack - Test Cases

**Status:** Implemented V0 acceptance matrix  
**Last Updated:** July 4, 2026

---

| ID | Scenario | Expected result |
| --- | --- | --- |
| WRP-001 | Owner enters business name, phone number with country code, current customer link, offer summary, hours, and action path | Report returns ready or mostly present rows and generates reply blocks |
| WRP-002 | Owner omits WhatsApp number | WhatsApp number row is missing and no preview link is generated |
| WRP-003 | Owner enters a phone-like value without country code | Phone row is unclear and explains local format only |
| WRP-004 | Owner enters current customer link text with invalid URL shape | Link row is unclear and says public HTTPS URL format was checked locally only |
| WRP-005 | Owner copies a reply block | Browser copies the block with its evidence text |
| WRP-006 | Owner copies or downloads the report | Browser-local copy/download works without report storage |
| WRP-007 | Owner copies a public report link | Hash-fragment shareable report URL is generated without server report storage |
| WRP-008 | Owner submits follow-up without consent or valid email | Submission is blocked locally |
| WRP-009 | Accepted follow-up succeeds | Existing `/api/public/contact` route acknowledges the request |
| WRP-010 | Message is not sent | No WhatsApp API call, no WhatsApp link open, and no click-to-send behavior exists |
| WRP-011 | Tool claims it verified WhatsApp, opened links, sent messages, generated AI replies, stored reports, updated platforms, checked rankings, or called AI/search providers | Verification fails |

Forbidden claim phrase: sent a WhatsApp message, verified the number, opened WhatsApp, fetched links, stored reports, checked rankings, or called AI/search providers.
