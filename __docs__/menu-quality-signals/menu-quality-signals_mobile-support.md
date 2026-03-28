# Menu Quality Signals — Mobile Support Assessment

> **Version:** 1.0
> **Last Updated:** March 15, 2026

---

## Mobile Relevance Decision: **PARTIAL**

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily or multiple times per day? | Weekly at most | ✗ Fail |
| **Speed** | Completes in <5 seconds? | View signals = instant, but acting on them (generate descriptions/images) is desktop-class work | ⚠ Borderline |
| **Touch** | Works with thumb-only? | Viewing signals = yes. Generating content = needs editor | ⚠ Borderline |
| **Value** | Needed away from desk? | Viewing is useful anywhere. Acting requires editor access. | ⚠ Borderline |

**Result:** PARTIAL — Show the signals panel on mobile (read-only awareness). Action buttons navigate to desktop editor features. The signal computation itself is lightweight and works on mobile.

## Mobile Implementation

- **Screen:** Read-only panel in MobileMenuScreen or mobile dashboard
- **Component:** `src/components/mobile/components/MenuQualitySignals.tsx`
- **UI Library:** antd-mobile `Card` + `List`
- **Actions:** View only on mobile. "Generate" buttons open a message: "Open MenuList on desktop to generate descriptions/images."

## Localization

Inherits from desktop — same `next-intl`, RTL support.

## Auth

Same NextAuth session, same RBAC.

---

**Created:** March 15, 2026
