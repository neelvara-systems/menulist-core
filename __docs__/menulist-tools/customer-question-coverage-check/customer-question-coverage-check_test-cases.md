# Customer Question Coverage Check - Test Cases

**Status:** Test evidence; not current launch certification
**Last Updated:** July 2, 2026

---

| Case | Expected Result |
| --- | --- |
| Owner enters a valid business URL | URL format evidence says it was checked locally and not fetched |
| Owner marks common questions as missing | Report shows missing rows and MenuList next action |
| Owner copies report | Report text copies through the runtime clipboard helper |
| Owner downloads report | Text file uses a safe report filename |
| Owner submits follow-up with consent | Existing contact route must return shaped acknowledgement |
| No chatbot answers | Report does not generate or display chatbot responses |
| No external source fetch | Tool does not crawl or open the submitted URL |
| No customer-chat read | Tool does not request or read conversation logs |
