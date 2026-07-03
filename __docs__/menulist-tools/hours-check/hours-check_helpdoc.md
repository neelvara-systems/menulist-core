# Hours Check - Help Documentation

**Status:** Public help draft
**Last Updated:** July 1, 2026

---

## Quick Summary

Hours Check shows whether the hours customers see are clear enough to publish on one current customer link.

It checks only the information you enter. It does not inspect Google, maps, websites, or holiday calendars.

---

## Getting Started

### What to prepare

- Business name
- City or locality
- Regular hours
- Closed days or open-daily note
- Special or holiday hours note, if any
- Current customer link, if one exists
- Contact fallback such as call, WhatsApp, booking, or contact form

---

## How To Run The Check

1. Open `/tools/hours-check`.
2. Enter the business name and city.
3. Enter regular hours.
4. Add closed days or open-daily wording.
5. Pick the late-night handling option.
6. Pick the special-hours status.
7. Add a special-hours note if customers need one.
8. Add the current customer link if it exists.
9. Mark whether a contact fallback is visible.
10. Select **Run check**.

---

## How To Read The Report

The report uses four result labels:

- **Present** - the entered facts include this item
- **Missing** - the fact is not present
- **Unclear** - the fact exists but customers may not understand it
- **Not checked** - V0 does not inspect that source

Each row includes evidence text. The evidence text says what was actually checked.

---

## Troubleshooting

### The report says regular hours are missing

Add normal day and time details, such as:

```txt
Monday to Saturday: 10:00 AM to 8:00 PM
Sunday: Closed
```

### The report says holiday hours are missing

Choose whether special hours are listed, not applicable, or missing. If a festival or temporary schedule applies, write it clearly.

### The report says current customer link is missing

Add the current MenuList customer link or create one from the report action.

### The report says external verification is not checked

That is expected. V0 does not inspect Google, maps, websites, or holiday calendars.

---

## Related Features

- [Public Truth Tools](../public-truth-tools/README.md)
- [Public Truth Check](../public-truth-check/README.md)
- [QR Link Health Check](../qr-link-health-check/README.md)

---

## Need More Help?

Use the optional follow-up form on the report. It sends the local report to MenuList only after consent and the security check.
