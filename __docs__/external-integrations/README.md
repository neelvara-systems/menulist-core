# MenuList External Integrations — Code-Truth Inventory

> **Scope:** MenuList product only
> **Status:** Maintained integration ledger
> **Last reviewed:** August 25, 2026
> **Authority:** Runtime code, feature flags, environment validators, Firebase Functions exports, and focused verifiers

## Classification

- **Active in source:** runtime path is enabled, but provider credentials/deployment may still control availability.
- **Configuration-dependent:** code loads/sends only when a validated environment or owner-supplied ID exists.
- **Manual handoff:** MenuList prepares/copies/exports; it does not connect or publish.
- **Disabled:** source fails closed or the feature flag is off.
- **Covered elsewhere:** this inventory tracks ownership; the named feature audit remains the detailed contract.

An enabled source flag is not proof that credentials, provider dashboards, webhooks, DNS, consent, or production smoke are complete.

## Active provider-backed MenuList flows

| Integration | Source posture | Admission and authority | Owner/customer surface | Detailed source |
| --- | --- | --- | --- | --- |
| Google OAuth sign-in | Configuration-dependent | `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; NextAuth callback and account/session rules | Login/onboarding | `src/lib/auth/index.ts`, auth/onboarding docs; strict item 3 |
| Google Gemini / GenAI | Active by individual AI feature and entitlement | Server provider gateways, AI capacity/accounting, rate limits, SAFE_MODE where applicable | Extraction, description, translation, image and bounded AI helpers | AI docs and prior AI transaction audits |
| Razorpay | Active in source | Protected checkout routes, signed webhook, provider IDs, idempotency/coordination ledgers, reconciliation | Billing/subscription/top-up | `src/app/api/razorpay/`, `__docs__/razorpay/`; strict items 2–3 |
| WhatsApp messaging onboarding | Active in source; provider-dependent | `ENABLE_MESSAGING_ONBOARDING`, provider allow-list, verified Meta webhook, Function secrets | Messaging acquisition/onboarding | `functions/src/messagingOnboarding/`, `__docs__/messaging-onboarding/`; strict item 6 |
| WhatsApp phone OTP | Active in source; provider-dependent | `ENABLE_PHONE_OTP_AUTH`, server challenges/tokens/rate limits, approved Meta template/credentials | Login/create-menu | `src/lib/auth/phoneOtp.ts`, `__docs__/phone-otp-auth/`; strict item 3 |
| SMTP owner notifications | Active email channel; provider-dependent | owner notification registry, preferences, idempotency/rate limits, SMTP secrets | Account/operational notices | `functions/src/ownerNotifications/`, `__docs__/owner-notifications/`; strict item 6 |
| WhatsApp owner notifications | Active in source; provider-dependent | `ENABLE_OWNER_NOTIFICATION_WHATSAPP: true`, MenuList product-channel gate, owner preferences, approved Meta templates/credentials, idempotency and rate limits | Account, billing, and operational notices | `src/lib/owner-notifications/`, `functions/src/ownerNotifications/`, `__docs__/owner-notifications/`; strict item 6 |
| Platform alert WhatsApp | Internal active flag; provider-dependent | platform alert registry, recipient/template/session config, Meta credentials | Platform operations only | `functions/src/monitoring/platformNotificationDelivery.ts` |
| Sentry | Configuration-dependent | source flags plus valid DSN; sanitization and environment posture | Internal monitoring only | `src/lib/monitoring/`, `functions/src/lib/sentry.ts`; strict item 9 |
| Vercel custom domains | Active provider boundary | protected domain API, Vercel credentials, deterministic claim, DNS verification | Owner Search & Discovery | custom-domain docs; strict item 13 |
| POS outbound webhook | Active in source | protected APIs, public-target admission, server-owned store secret, HMAC, version ordering | Desktop/Mobile External Menu Sync | `__docs__/pos-webhook-sync/`; strict item 14 |

## Active external-consumer and owner-configured script flows

| Integration | Posture | Boundary | Detailed source |
| --- | --- | --- | --- |
| Platform Pull API | Active | External consumer supplies a store-generated scoped API key; read-only business/menu endpoints, rate limits, lifecycle/tenant checks | `__docs__/platform-pull-api/`; strict item 4 |
| Store Google Analytics / Meta Pixel IDs | Owner-configured | Loads on the public menu only when the owner adds an ID and tracking consent/settings admit it; third-party scripts are disclosed | analytics settings and client-menu analytics docs; strict item 11 |
| Main website Google Analytics | Configuration-dependent and consent-gated | Valid `NEXT_PUBLIC_GA_MEASUREMENT_ID` plus website analytics consent | `src/components/website/GoogleAnalytics.tsx`, `WebsiteAnalyticsConsent.tsx`; strict item 11 |
| Main website Plausible | Configuration-dependent and consent-gated | MenuList-specific domain/script env plus website analytics consent | `src/components/website/PlausibleAnalytics.tsx`; strict item 11 |
| Microsoft Clarity | Configuration-dependent and consent-gated where configured | Website analytics consent and relevant configuration | main website privacy/analytics docs; strict item 11 |

These scripts are analytics integrations, not business-truth publishing channels. They must not receive MenuList internal source parameters or load before the applicable consent/configuration gate.

## Manual handoffs, not connected integrations

| Capability | Runtime truth |
| --- | --- |
| Google Profile Basics Checklist | Active deterministic/public tool. It prepares a checklist; it does not connect to or write Google Business Profile. |
| Google listing link confirmation | Owner confirms a manual update. It is not API verification or synchronization. |
| GrowthOS/social content | Export/copy-first. `GROWTHOS_DIRECT_POSTING` is disabled. |
| Social content direct posting | `SOCIAL_CONTENT_DIRECT_POSTING` is disabled. WhatsApp/Google/Instagram output is manual unless another explicitly enabled provider flow owns delivery. |
| POS provider instructions | Opens an owner-device email draft; no SMTP send occurs. |
| WhatsApp public tools | Build/check links, reply packs, and assets. They do not use the WhatsApp Business API unless a separate messaging/OTP provider flow is invoked. |

## Disabled or fail-closed MenuList integrations

| Integration | Code truth |
| --- | --- |
| Google Business Profile sync | `ENABLE_GBP_SYNC: false`. Token DAL throws `GBP_TOKEN_STORE_DISABLED`; no OAuth/sync job is active. The manual Google Profile tool is the supported surface. |
| GrowthOS direct posting | Disabled. No provider account connection or publish transport. |
| General social direct posting | Disabled. No universal posting scheduler/provider send. |
| QR WhatsApp experiments | Disabled feature; ordinary WhatsApp links/tools are separate deterministic surfaces. |

## Product exclusions

The following integration code is not a MenuList owner/customer integration and must retain its own product boundary:

- Answerlattice workflow notifications, widget/API credentials, support integrations;
- CampaignCue channel/provider posture;
- SignalDesk source providers, outreach providers, and provider webhooks;
- MyCodex, which remains static and has no provider/database/billing integrations.

Their flags/routes/constants must not be used as proof that MenuList has the same integration.

## Common external-boundary requirements

Every active MenuList provider flow must have the applicable controls:

- secrets remain server-side or protected by a deliberate authorized reveal route;
- feature/config readiness fails closed;
- strict bounded inputs and outputs;
- auth plus canonical tenant/store lifecycle and permission checks;
- webhook signature verification or outbound request signing;
- SSRF and redirect controls for owner-configured URLs;
- fail-closed rate limits before expensive/provider work;
- idempotency for payments, inbound webhooks, and durable notifications;
- timeout and bounded retry policy stated truthfully;
- safe owner copy without provider payload/error leakage;
- monitoring with redaction;
- cost and retention bounds;
- desktop/mobile parity when owner-facing;
- public/cache effects verified when business truth changes;
- provider dashboard, credentials, consent, legal naming, and live smoke kept release-pending until proven.

## Cross-check ownership

| Strict audit item | Integration responsibility |
| --- | --- |
| 2–3 | Razorpay/subscription, provider IDs, webhooks, reconciliation, owner billing |
| 4 | Platform Pull API credentials and consumer reads |
| 6 | Messaging onboarding, phone OTP/owner notices, SMTP/WhatsApp provider readiness |
| 9 | Monitoring/Sentry/provider failure visibility |
| 11 | Public/store analytics scripts and consent |
| 13 | Vercel domains/DNS |
| 14 | Integration inventory, disabled/manual claim boundary, POS outbound webhook |

Item 14 does not duplicate those implementations; it verifies that no integration is misclassified or publicly overclaimed.

## Release-owner pending evidence

- current production/staging secret presence and provider dashboard configuration;
- webhook registrations and signature secrets;
- Meta template approvals and phone-number status;
- SMTP sender/domain deliverability;
- Razorpay live-mode dashboard/webhook proof;
- Google OAuth consent-screen/domain proof;
- analytics IDs and consent smoke;
- Vercel domain/DNS proof;
- POS controlled receiver plus application proof;
- coordinated Vercel/app and Firebase-rules deployment for server-owned POS secrets.

These remain pending because source code cannot prove third-party control planes.

## Verification

Run:

```bash
npm run verify:menulist-external-integrations
npm run verify:pos-sync-boundary
npm run test:pos-sync-boundaries
npm run test:pos-sync-secret:rules
```

Then run the focused gates owned by each referenced strict item. No local verifier should make a provider-side success claim.
