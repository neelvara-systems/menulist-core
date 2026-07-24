# Platform Pull API — Mobile Support

**Status:** ✅ ASSESSED  
**Date:** February 22, 2026
**Last Source Gate Update:** July 23, 2026

---

## Source Gate

Mobile admission is source-gated by `npm run verify:platform-pull-api-boundary`.

No dedicated mobile key-management UI is required. API-key generation/regeneration/revoke is a low-frequency integration setup task in the desktop Business Settings Integrations tab, while mobile keeps integration navigation focused on operational surfaces such as POS Sync and Google Business Profile status.

The July 22 Business Truth Contract and compatibility-fixture update changes no
owner workflow or response field, so the existing mobile admission result is
unchanged.

The July 23 exact-scope repair remains desktop-only because mobile does not
expose key management. Desktop requests now carry the selected tenant/store,
the route requires both to match the authenticated session, responses echo the
admitted scope, and the tab rejects settlement after a store switch.

## 4-Gate Admission Test

| Gate | Question | Result |
|------|----------|--------|
| Frequency | Do owners manage API keys frequently from phone? | ❌ NO — one-time setup |
| Speed | Is mobile speed critical for this feature? | ❌ NO — setup task |
| Touch | Does this benefit from touch interface? | ❌ NO — copy-paste key |
| Value | Does mobile access add operational value? | ⚠️ PARTIAL — sharing key via WhatsApp |

**Result: 1/4 gates pass → Mobile UI NOT required.**

API key generation is a one-time setup task done from desktop. The generated key is copied and shared with POS vendor via email/WhatsApp — this works fine from desktop.

---

**Last Updated:** July 22, 2026
