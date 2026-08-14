# Customer App — Mobile Support Assessment

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Mobile Support Assessment  
**Status:** Runtime/mobile source evidence; not current mobile launch certification
**Last Updated:** August 14, 2026
**Audience:** Engineering, Product

> **Launch Boundary:** This mobile-support note records source evidence and mobile admission. Current mobile release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:customer-app-pwa`, real browser/device Customer App QA, target deploy evidence, and production-host smoke.

---

## Mobile Relevance Decision

**VERDICT: MOBILE SUPPORTED — Install prompt plus bounded owner settings**

The Customer App feature has two distinct components with different mobile requirements:

| Component                                 | Mobile Relevance | Decision                             |
| ----------------------------------------- | ---------------- | ------------------------------------ |
| Install prompt UI on customer-facing menu | YES              | Mobile implementation required       |
| Owner settings (Surface configuration)    | YES              | Mobile settings screen implemented   |
| Icon upload/override                      | PARTIAL          | Mobile icon picker/override supported with bounded diagnostics |

---

## Feature Admission Test Results

### Component 1: Install Prompt on Customer Menu

| Gate          | Test                          | Result  | Reason                            |
| ------------- | ----------------------------- | ------- | --------------------------------- |
| **Frequency** | Daily/multiple times per day? | ✅ PASS | Customers visit menu repeatedly   |
| **Speed**     | Short, thumb-friendly flow?   | ✅ PASS | One primary action to dismiss or start install |
| **Touch**     | Works with thumb-only?        | ✅ PASS | Bottom sheet, large tap targets   |
| **Value**     | Needed while away from desk?  | ✅ PASS | Customers install on their phones |

**Result: ALL GATES PASS → Mobile implementation required**

### Component 2: Owner Settings Configuration

| Gate          | Test                          | Result     | Reason                       |
| ------------- | ----------------------------- | ---------- | ---------------------------- |
| **Frequency** | Daily/multiple times per day? | ⚠️ PARTIAL | Rare setup, but useful during launch/onboarding |
| **Speed**     | Short, thumb-friendly flow?   | ✅ PASS    | Toggle switches and short-name edits avoid deep navigation |
| **Touch**     | Works with thumb-only?        | ✅ PASS    | Mobile screen uses large controls and image picker |
| **Value**     | Needed while away from desk?  | ✅ PASS    | Owner can finish customer-app setup from phone |

**Result: MOBILE SUPPORTED → `MobileCustomerAppScreen` implements settings with bounded save diagnostics**

`MobileCustomerAppScreen` remounts by exact tenant/store identity. Settings, localized short-name drafts, pending icon data and install-guide state cannot survive a store switch. Completed settings/business-copy/icon operations compare their captured tenant/store before any context merge or owner feedback, preventing an old-store save from becoming the current store's browser truth.

Each owner-settings toggle exposes its visible label as the accessible name. The Show install prompt switch also forwards its disabled state to the underlying mobile control whenever Enable Customer App is off.

---

## Mobile Implementation Scope

### In Scope (Mobile)

| Screen/Component                 | Priority | Notes                                                                                          |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Install prompt banner/sheet      | P0       | Bottom sheet on customer menu, fires `CUSTOMER_APP_PROMPT_SHOWN` on render                     |
| Platform detection (iOS/Android) | P0       | Show correct instructions                                                                      |
| Dismiss action                   | P0       | Large tap target (44px min), fires `CUSTOMER_APP_PROMPT_DISMISSED`                             |
| Install action                   | P0       | Large tap target; fires `CUSTOMER_APP_INSTALL_STARTED` on tap, then native prompt/instructions |
| `appinstalled` listener          | P0       | In root layout; fires `CUSTOMER_APP_INSTALLED` once per device (deduped via localStorage)      |
| Standalone-mode detector         | P0       | Fires `CUSTOMER_APP_OPENED` when app is launched from home screen                              |
| Shortcut source detector         | P1       | Reads `?entry_source=shortcut-*` query param; fires shortcut-specific event                    |
| Success feedback                 | P1       | "Added to home screen" confirmation                                                            |
| Owner settings screen            | P1       | `MobileCustomerAppScreen`; install toggle, promotion toggle, localized short name, icon override |
| Bounded diagnostics              | P1       | Native prompt, desktop/mobile settings, and desktop/mobile install-link copy failures use `src/lib/pwa/pwaDiagnostics.ts`; install-link copied feedback waits for Clipboard API success or acknowledged textarea fallback success |

### Out of Scope (Desktop Only)

| Screen/Component              | Reason                         |
| ----------------------------- | ------------------------------ |
| App preview in settings       | Desktop visual fidelity needed |

---

## Mobile Screens Specification

### Screen 1: Install Prompt Banner

**Trigger:** 3rd visit to menu, not dismissed, promotion enabled

**Layout (Mobile):**

```
┌─────────────────────────────────────┐
│                                     │
│   [Menu content above]              │
│                                     │
├─────────────────────────────────────┤
│  💡 Save Joe's Pizza to your phone  │
│     for faster access               │
│                                     │
│  [Maybe Later]    [Add to Phone]   │
│  (44px height)    (44px height)     │
└─────────────────────────────────────┘
```

**Behavior:**

- Slides up from bottom
- 44px minimum touch targets
- Dismissal persists 30 days (localStorage)
- "Add to Phone" triggers:
  - Android: `beforeinstallprompt.prompt()`
  - iOS: Instructions modal

### Screen 2: iOS Install Instructions

**Trigger:** iOS user taps "Add to Phone"

**Layout (Mobile):**

```
┌─────────────────────────────────────┐
│  Add to Home Screen        ✕        │
├─────────────────────────────────────┤
│                                     │
│  [Screenshot: Safari share button]  │
│                                     │
│  1. Tap the Share button            │
│     (rectangle with arrow)           │
│                                     │
│  2. Scroll down                     │
│                                     │
│  3. Tap "Add to Home Screen"        │
│                                     │
│  4. Tap "Add"                       │
│                                     │
│  [Close]                            │
└─────────────────────────────────────┘
```

**Behavior:**

- Modal overlay
- Step-by-step with screenshots
- Close button top-right (44px)
- Close button at bottom for thumb reach

### Screen 3: Android Install Prompt (Native)

**Trigger:** Android Chrome user taps "Add to Phone"

**Behavior:**

- System native install dialog appears
- We don't control the UI
- Handle promise resolution for success/failure
- Track `appinstalled` event

---

## Data Source Hooks

### DAL Functions (Existing)

| Function              | Purpose                    | Hook Location |
| --------------------- | -------------------------- | ------------- |
| `getStoreBySubdomain` | Resolve store for manifest | Server-side   |
| `getStoreById`        | Fetch store branding       | API route     |

### No New Hooks Required

The mobile install prompt uses:

- Client-side visit counter (sessionStorage)
- Client-side dismissal tracker (localStorage)
- Existing store data from page load

No server-side hooks needed for the prompt UI itself.

---

## Localization

**Inherits from existing customer menu:**

| Aspect           | Source        | Implementation           |
| ---------------- | ------------- | ------------------------ |
| next-intl        | Customer menu | Same locale as menu      |
| RTL support      | Customer menu | Inherited                |
| Timezone         | Customer menu | Not relevant for install |
| Date/time format | Customer menu | Not relevant for install |

**New translation keys needed:**

```typescript
// en.json
{
  "customerApp": {
    "prompt": {
      "title": "Save {{storeName}} to your phone",
      "subtitle": "For faster access to the menu",
      "dismiss": "Maybe Later",
      "install": "Add to Home Screen"
    },
    "instructions": {
      "iosTitle": "Add to Home Screen",
      "iosStep1": "Tap the Share button",
      "iosStep2": "Scroll down and tap \"Add to Home Screen\"",
      "iosStep3": "Tap \"Add\"",
      "close": "Close"
    },
    "success": {
      "title": "Added successfully",
      "message": "You can now open {{storeName}} from your home screen"
    }
  }
}
```

---

## Auth & Permissions

**Not applicable for customer-facing install prompt.**

The install prompt appears on the public customer menu, which requires no authentication.

Owner settings (desktop-only) use existing NextAuth session with owner role check.

---

## Settings Inheritance

The install prompt inherits theme settings from the customer menu:

| Setting      | Source              | Usage               |
| ------------ | ------------------- | ------------------- |
| Theme mode   | `clientThemeConfig` | Match menu theme    |
| Accent color | Store branding      | Prompt accent color |
| RTL          | `clientThemeConfig` | Text direction      |

---

## Icons

**Use `react-icons/lu` (Lucide) only:**

| Icon  | Usage            | Lucide Name    |
| ----- | ---------------- | -------------- |
| Close | Dismiss          | `LuX`          |
| Phone | Install          | `LuSmartphone` |
| Share | iOS instructions | `LuShare`      |
| Home  | Home screen      | `LuHome`       |
| Check | Success          | `LuCheck`      |

**Never mix icon libraries** — per architecture rules.

---

## ICP Compliance

**Non-technical SMB owner considerations:**

| Requirement         | Implementation                       |
| ------------------- | ------------------------------------ |
| Zero jargon         | Use "Add to Phone" not "Install PWA" |
| Large touch targets | 44px minimum all buttons             |
| Instant feedback    | Visual response on tap               |
| Clear instructions  | iOS steps with screenshots           |
| No configuration    | Works automatically                  |
| Calm tone           | "Maybe Later" not dismiss icon       |

---

## Cross-Platform Behavior Matrix

| Platform                       | Install Method               | UI Pattern               | Notes                |
| ------------------------------ | ---------------------------- | ------------------------ | -------------------- |
| Chrome Android                 | Native `beforeinstallprompt` | System dialog            | Our UI just triggers |
| Samsung Internet               | Native prompt                | System dialog            | Same as Chrome       |
| Safari iOS                     | Manual (Share → Add)         | Our instructions modal   | Step-by-step guide   |
| Chrome iOS                     | Manual (Share → Add)         | Our instructions modal   | Same as Safari       |
| Firefox Mobile                 | Limited support              | Hide prompt              | No PWA support       |
| In-app browsers (WhatsApp, FB) | Redirect to browser          | "Open in browser" button | Then show prompt     |

---

## Testing Requirements (Mobile)

| Test                        | Device          | Expected                           |
| --------------------------- | --------------- | ---------------------------------- |
| Prompt appears on 3rd visit | iPhone 14       | Bottom sheet slides up             |
| Prompt appears on 3rd visit | Pixel 7         | Bottom sheet slides up             |
| Dismissal works             | iPhone          | Prompt closes, 30-day suppression  |
| iOS instructions show       | iPhone          | Modal with 4 steps                 |
| Android native prompt       | Pixel           | System install dialog              |
| Icon appears after install  | iPhone          | On home screen with store branding |
| Icon appears after install  | Pixel           | On home screen with store branding |
| App opens standalone        | iPhone          | No browser chrome                  |
| App opens standalone        | Pixel           | No browser chrome                  |
| RTL layout                  | iPhone (Arabic) | Text right-aligned                 |
| Touch target size           | All             | 44px minimum verified              |

---

## Accessibility (Mobile)

| Requirement          | Implementation                  |
| -------------------- | ------------------------------- |
| Screen reader labels | All buttons labeled             |
| Focus management     | Trap focus in modal             |
| Color contrast       | WCAG AA on all text             |
| Reduce motion        | Disable animations if preferred |
| Dynamic type         | Support system font sizing      |

---

## Related Documents

| Document                                                       | Purpose                     |
| -------------------------------------------------------------- | --------------------------- |
| `customer-app_spec.md`                                         | Product requirements        |
| `customer-app_impl.md`                                         | Technical implementation    |
| `customer-app_marketing.md`                                    | Sales/marketing strategy    |
| `customer-app_website.md`                                      | Public website content      |
| `customer-app_helpdoc.md`                                      | Customer help documentation |
| `customer-app_firebase.md`                                     | Firebase cost tracking      |
| `__docs__/mobile-operational-support/02-mobile-ui-doctrine.md` | Mobile UI rules             |

---

_Document Status: Source-gated runtime evidence; real-device QA still required_
_Last Updated: July 4, 2026_
