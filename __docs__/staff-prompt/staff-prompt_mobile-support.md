# Staff Prompt — Mobile Support

**Last Updated:** June 11, 2026
**Decision:** ✅ OWNER-MOBILE PARITY — Read-only Today summary card in MobileShell

---

## Feature Admission Test

Applicable. The active Staff Prompt surface is not a separate staff chat or training portal. It is a read-only line in the owner Today surface when `platformSummary/campaigns_{sId}.staffPrompt.eligible` is true.

---

## How It Works

Desktop Today and mobile Today/Hours both read the shared Today summary through `useTodayCampaigns()`. If `staffPrompt.eligible` is true, the UI shows:

- "Staff prompt for today"
- "Say this when customers ask:"
- the prompt text
- "Applies today"

There are no owner settings, staff-facing routes, prompt generation controls, or mobile-only writes.

## Mobile Relevance

Mobile owners can see the same read-only staff line inside `MobileShell`. The card appears only when the summary field is eligible. Weekly pack copy now receives the line only when `staffPrompt.eligible` is true.
