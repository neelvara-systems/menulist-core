# Compliance Pages — Mobile Support Assessment

**Version:** 1.2
**Date:** July 2, 2026
**Local Source Gate:** `npm run verify:compliance-pages-boundary`

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Used daily/multiple times per day? | No — rarely visited, compliance only | ❌ |
| **Speed** | Completes in <5 seconds? | Yes for reviewing current status; editing remains rare | ✅ |
| **Touch** | Works with thumb-only? | Yes for review cards and short override/reset actions | ✅ |
| **Value** | Needed away from desk? | Review can be useful inside Official Page setup; long legal drafting remains desk-based | ⚠️ |

**Verdict:** ✅ Limited mobile support exists for review/reset/override status inside the Official Page setup flow. Full legal drafting remains a desktop-preferred activity.

---

## Mobile Relevance

### Public Page (customer-facing)
The compliance pages themselves are SSR HTML and render correctly on mobile browsers.

### Owner Dashboard (editing)
`src/components/mobile/components/MobileCompliancePagesEditor.tsx` is embedded from `MobileOfficialPageScreen` for Privacy Policy, Terms & Conditions, and Refund & Cancellation Policy review/edit/reset cards. It uses the existing guarded `/api/compliance` route and does not introduce a mobile-only data path.

Failure boundary:

- Compliance load/save/reset requests use the shared authenticated browser request policy, which keeps requests uncached, same-origin, and manual-redirect before bounded response parsing.
- Load failures log `mobile_compliance_pages_load_failed`; rejected load responses use `mobile_compliance_pages_load_rejected` with status only.
- Load response parse failures log `mobile_compliance_pages_load_response_parse_failed`; empty or invalid load response shapes log `mobile_compliance_pages_load_response_invalid`.
- Public preview open failures log `mobile_compliance_page_open_failed`; preview opens use `noopener,noreferrer` and diagnostic context records page URL presence/length only.
- Save failures log `mobile_compliance_page_save_failed`; rejected save responses use `mobile_compliance_page_save_rejected` with status only.
- Reset failures log `mobile_compliance_page_reset_failed`; rejected reset responses use `mobile_compliance_page_reset_rejected` with status only.
- Save/reset response parse failures log `mobile_compliance_page_response_parse_failed` with bounded compliance type/action/status metadata only.
- Successful save/reset HTTP responses must include `success: true`, the requested compliance page type, and the expected API action (`override` for save, `reset` for reset). Missing or mismatched acknowledgement fields log `mobile_compliance_page_response_invalid` with `mobile_compliance_page_save_response_invalid` or `mobile_compliance_page_reset_response_invalid`.
- Owner-facing failure copy stays fixed; raw public compliance URLs, API response text, and raw exception messages must not be shown.

---

## Decision

Keep limited mobile support. The SSR public pages remain responsive, and the owner mobile UI is limited to the existing Official Page compliance cards backed by `/api/compliance`. Do not add a separate compliance mobile screen or mobile-specific DAL.

`npm run verify:compliance-pages-boundary` checks that the mobile editor stays on the shared `/api/compliance` path, uses the authenticated browser request policy, caps response parsing, requires save/reset acknowledgement fields, uses safe preview handoff flags, and logs only bounded diagnostics.
