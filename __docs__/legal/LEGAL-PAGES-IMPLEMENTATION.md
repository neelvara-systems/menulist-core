# Legal Pages Implementation Guide

**Project:** MenuListAi  
**Created:** December 20, 2025  
**Status:** Planning + active legal page alignment notes
**Priority:** P0 - Critical for Compliance

---

## Executive Summary

This document outlines the legal pages required for MenuListAi SaaS platform compliance. Analysis is based on GDPR requirements, industry standards, and a review of what's currently implemented vs what's missing.

---

## Current State Analysis

### ✅ Existing Pages (Complete)

| Page                 | Route               | Component                        | Lines | Status      |
| -------------------- | ------------------- | -------------------------------- | ----- | ----------- |
| **Terms of Service** | `/terms-of-service` | `terms/terms.tsx`                | 307   | ✅ Complete |
| **Privacy Policy**   | `/privacy-policy`   | `privacy/privacy.tsx`            | 266   | ✅ Complete |
| **Refund Policy**    | `/refund-policy`    | `refund/index.tsx`               | 239   | ✅ Complete |
| **Trust & Security** | `/trust-security`   | `security/TrustSecurityPage.tsx` | 327   | ✅ Complete |

**Location:** `src/components/templates/website/platformSite/landingPage/`

### Current Coverage

| Topic                               | Covered In       | Status |
| ----------------------------------- | ---------------- | ------ |
| Service description                 | Terms of Service | ✅     |
| User accounts & responsibilities    | Terms of Service | ✅     |
| Acceptable use (allowed/prohibited) | Terms of Service | ✅     |
| Content ownership & IP              | Terms of Service | ✅     |
| AI content disclaimer               | Terms of Service | ✅     |
| Subscriptions & payments            | Terms of Service | ✅     |
| Termination & suspension            | Terms of Service | ✅     |
| Disclaimers & liability             | Terms of Service | ✅     |
| Governing law (India)               | Terms of Service | ✅     |
| Data collection                     | Privacy Policy   | ✅     |
| How we use data                     | Privacy Policy   | ✅     |
| Data sharing                        | Privacy Policy   | ✅     |
| Data security                       | Privacy Policy   | ✅     |
| Staff account data disclosure       | Privacy Policy   | ✅     |
| Owner-managed staff access duties   | Terms of Service | ✅     |
| Role-based staff access controls    | Trust & Security | ✅     |
| Privacy rights (GDPR)               | Privacy Policy   | ✅     |
| No-refund policy                    | Refund Policy    | ✅     |
| Subscription cancellation           | Refund Policy    | ✅     |
| Security philosophy                 | Trust & Security | ✅     |
| Security measures                   | Trust & Security | ✅     |
| Compliance commitment               | Trust & Security | ✅     |

---

## Gap Analysis

### ❌ Missing Pages/Features

| Item                                | Priority | Regulatory Requirement   | Notes                                 |
| ----------------------------------- | -------- | ------------------------ | ------------------------------------- |
| **Cookie Policy**                   | P0       | GDPR, ePrivacy Directive | Required for EU users                 |
| **Cookie Consent Banner**           | P0       | GDPR, ePrivacy Directive | Must link to Cookie Policy            |
| **Credits/Usage Terms**             | P0       | Business-critical        | How credits work, expiration, overage |
| **Data Processing Agreement (DPA)** | P1       | GDPR Article 28          | Required for B2B enterprise           |
| **SLA (Service Level Agreement)**   | P2       | Enterprise expectation   | Optional but professional             |

### ⚠️ Sections That Could Be Enhanced

| Current Location | Enhancement                                 | Priority |
| ---------------- | ------------------------------------------- | -------- |
| Terms of Service | Add explicit credits/usage terms section    | P0       |
| Privacy Policy   | Add cookie details or link to Cookie Policy | P1       |
| Footer           | Add links to all legal pages                | P1       |

### May 19, 2026 Staff Access Alignment

Staff management and roles/permissions are now reflected in the public legal/security pages:

- Privacy Policy covers staff account identifiers, email/phone, Staff ID alias, role/store assignment, account status, reset/session metadata, authorized team access, and no stored plain-text passcodes.
- Terms of Service covers owner responsibility for staff accounts, safe Staff ID/passcode sharing, accurate role/store assignment, and ending staff access when access should stop.
- Trust & Security covers role-scoped access, Firebase/Google Auth handling, no stored plain-text passwords/passcodes, and owner reset/sign-out controls.
- These updates are disclosure/alignment changes only. They do not claim GDPR certification, SOC 2 certification, HR/payroll/attendance coverage, or a DPA/SLA.

---

## Development Checklist

### Phase 1: P0 - Critical (Must Have for Compliance)

#### 1.1 Cookie Policy Page

- [ ] Create route: `/cookie-policy`
- [ ] Create component: `cookie/CookiePolicyPage.tsx`
- [ ] Content sections:
  - [ ] What are cookies
  - [ ] Types of cookies we use (Essential, Analytics, Functional)
  - [ ] Third-party cookies (Google Analytics, Clarity, etc.)
  - [ ] How to manage/delete cookies
  - [ ] Cookie list table (name, purpose, duration, type)
  - [ ] Contact information
- [ ] Add to `LandingPage` component routing
- [ ] Add to footer navigation

#### 1.2 Cookie Consent Banner

- [ ] Create component: `CookieConsentBanner.tsx`
- [ ] Features:
  - [ ] First-visit detection (localStorage)
  - [ ] Accept all / Customize options
  - [ ] Link to Cookie Policy
  - [ ] Persist preference
  - [ ] Re-open option in footer
- [ ] Integrate with analytics loading (Clarity, etc.)
- [ ] Position: Fixed bottom of screen

#### 1.3 Credits/Usage Terms

- [ ] Add section to Terms of Service OR create standalone page
- [ ] Content:
  - [ ] Credit system explanation
  - [ ] Credit purchase terms
  - [ ] Credit expiration policy
  - [ ] Overage handling (if any)
  - [ ] Unused credits policy
  - [ ] Refund policy for credits (none)

### Phase 2: P1 - High Priority (B2B/Enterprise Compliance)

#### 2.1 Data Processing Agreement (DPA)

- [ ] Create route: `/dpa` or downloadable PDF
- [ ] Content (GDPR Article 28 requirements):
  - [ ] Definitions
  - [ ] Scope and purpose
  - [ ] Data processing details
  - [ ] Subprocessors list
  - [ ] Security measures
  - [ ] Data subject rights
  - [ ] Data breach notification
  - [ ] Audit rights
  - [ ] Data return/deletion
  - [ ] Liability
- [ ] Add to footer (enterprise section)

#### 2.2 Footer Enhancement

- [ ] Add all legal links to footer:
  - [ ] Terms of Service
  - [ ] Privacy Policy
  - [ ] Cookie Policy
  - [ ] Refund Policy
  - [ ] Trust & Security
  - [ ] DPA (enterprise)
- [ ] Organize into Legal section

### Phase 3: P2 - Medium Priority (Enterprise Features)

#### 3.1 SLA Page (Optional)

- [ ] Create route: `/sla`
- [ ] Content:
  - [ ] Uptime commitment (99.9%)
  - [ ] Scheduled maintenance windows
  - [ ] Response time commitments
  - [ ] Exclusions
  - [ ] Credits for downtime
  - [ ] Reporting and monitoring

---

## Technical Implementation Notes

### File Structure

```
src/components/templates/website/platformSite/landingPage/
├── cookie/
│   └── CookiePolicyPage.tsx       # NEW
├── privacy/
│   └── privacy.tsx                # EXISTS
├── refund/
│   └── index.tsx                  # EXISTS
├── security/
│   └── TrustSecurityPage.tsx      # EXISTS
├── terms/
│   └── terms.tsx                  # EXISTS
├── dpa/
│   └── DPAPage.tsx                # NEW (Phase 2)
└── sla/
    └── SLAPage.tsx                # NEW (Phase 3)

src/components/atoms/
└── CookieConsentBanner.tsx        # NEW

src/app/(website)/
├── cookie-policy/
│   └── page.tsx                   # NEW
├── dpa/
│   └── page.tsx                   # NEW (Phase 2)
└── sla/
    └── page.tsx                   # NEW (Phase 3)
```

### Routing Updates Required

**File:** `src/components/templates/website/platformSite/landingPage/index.tsx`

Add imports and routing for:

- `CookiePolicyPage` (fromPage === "cookie")
- `DPAPage` (fromPage === "dpa")
- `SLAPage` (fromPage === "sla")

### Cookie Consent Implementation

```typescript
// Simplified flow
1. Check localStorage for 'cookie-consent' key
2. If not set → Show banner
3. User clicks Accept → Set localStorage, load analytics
4. User clicks Customize → Show preferences modal
5. Store preferences → Load only accepted categories
```

### Third-Party Services to Document

| Service           | Purpose        | Cookie Type |
| ----------------- | -------------- | ----------- |
| Microsoft Clarity | Analytics      | Analytics   |
| Google Analytics  | Analytics      | Analytics   |
| Firebase Auth     | Authentication | Essential   |
| Razorpay          | Payments       | Essential   |
| Sentry            | Error tracking | Essential   |

---

## Content Templates

### Cookie Policy Structure

```markdown
1. Introduction

   - What this policy covers
   - Last updated date

2. What Are Cookies?

   - Definition
   - How they work

3. Types of Cookies We Use

   - Essential (required for site to work)
   - Analytics (help us improve)
   - Functional (remember preferences)

4. Third-Party Cookies

   - List of providers
   - Their privacy policies (links)

5. Cookie List
   | Name | Provider | Purpose | Duration | Type |
   |------|----------|---------|----------|------|

6. Managing Cookies

   - Browser settings
   - Our cookie preferences tool
   - Impact of disabling

7. Changes to This Policy

   - How we notify

8. Contact
   - Email for questions
```

### Credits/Usage Terms Structure

```markdown
1. Credit System Overview

   - What credits are
   - How they work

2. Purchasing Credits

   - Payment processing
   - When credits are applied

3. Credit Usage

   - What consumes credits
   - Credit costs per action

4. Credit Expiration

   - Expiration rules (if any)
   - Unused credits

5. Overages

   - What happens at zero credits
   - Service limitations

6. Refunds
   - No refunds on credits
   - Reference to Refund Policy
```

---

## Regulatory Reference

### GDPR Requirements Covered

| Requirement                 | Status | Location          |
| --------------------------- | ------ | ----------------- |
| Lawful basis for processing | ✅     | Privacy Policy    |
| Data subject rights         | ✅     | Privacy Policy    |
| Data retention              | ⚠️     | Needs enhancement |
| Cookie consent              | ❌     | MISSING           |
| Data breach notification    | ✅     | Trust & Security  |
| Staff access transparency   | ✅     | Privacy Policy, Terms of Service, Trust & Security |
| DPA for processors          | ❌     | MISSING           |

### ePrivacy Directive (Cookie Law)

| Requirement                                 | Status     |
| ------------------------------------------- | ---------- |
| Inform users about cookies                  | ❌ MISSING |
| Obtain consent before non-essential cookies | ❌ MISSING |
| Allow users to refuse cookies               | ❌ MISSING |
| Store consent proof                         | ❌ MISSING |

---

## Estimated Effort

| Item                  | Estimated Hours | Complexity |
| --------------------- | --------------- | ---------- |
| Cookie Policy Page    | 2-3 hrs         | Low        |
| Cookie Consent Banner | 3-4 hrs         | Medium     |
| Credits/Usage Terms   | 1-2 hrs         | Low        |
| DPA Page              | 3-4 hrs         | Medium     |
| Footer Updates        | 1 hr            | Low        |
| SLA Page              | 2 hrs           | Low        |
| **Total Phase 1**     | **6-9 hrs**     |            |
| **Total All Phases**  | **12-16 hrs**   |            |

---

## Dependencies

### Before Starting

- [ ] Confirm cookie list from all third-party services
- [ ] Confirm credit expiration policy (business decision)
- [ ] Confirm overage handling (business decision)
- [ ] Legal review of content (recommended)

### External

- No external dependencies for development
- Legal review recommended before publishing

---

## Success Criteria

### Phase 1 Complete When:

- [ ] Cookie Policy page accessible at `/cookie-policy`
- [ ] Cookie consent banner shows on first visit
- [ ] Cookie preferences saved in localStorage
- [ ] Analytics only loads after consent
- [ ] Credits terms documented in Terms of Service
- [ ] All pages linked in footer

### Phase 2 Complete When:

- [ ] DPA downloadable or viewable at `/dpa`
- [ ] Enterprise customers can reference DPA in contracts

### Phase 3 Complete When:

- [ ] SLA page accessible at `/sla`
- [ ] SLA terms clear for enterprise tier

---

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [ePrivacy Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32002L0058)
- [ICO Cookie Guidance](https://ico.org.uk/for-organisations/guide-to-pecr/cookies-and-similar-technologies/)
- Current MenuListAi Pages:
  - `/terms-of-service`
  - `/privacy-policy`
  - `/refund-policy`
  - `/trust-security`

---

## Next Steps

1. **Review this document** - Confirm priorities and scope
2. **Business decisions needed**:
   - Credit expiration policy
   - Overage handling
   - SLA commitment levels
3. **Start Phase 1 development**:
   - Cookie Policy page
   - Cookie Consent Banner
   - Credits terms section
4. **Legal review** (recommended before launch)

---

_Document Version: 1.0_  
_Last Updated: December 20, 2025_
