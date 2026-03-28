# Deep Audit: Every Feature & Screen → Mobile Decision

**Created:** February 14, 2026  
**Status:** 🔒 LOCKED — Based on full codebase + documentation audit  
**Author:** Lead Architect (Cascade)  
**Method:** Read every `__docs__/` feature folder README/spec + every desktop route/template component + every navigation item

---

## Audit Scope

- **35+ feature folders** in `__docs__/` reviewed
- **21 desktop routes** in `src/app/(main)/` reviewed
- **14 template components** in `src/components/templates/main-app/` reviewed
- **All sidebar navigation items** in `src/constants/navigations.ts` reviewed

---

## Part 1: Every Desktop Route → Mobile Decision

| # | Route | Desktop Screen | What It Actually Does | Mobile? | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | `/dashboard` | **OwnerDashboard** | Analytics views (Overview, Daily, Weekly, Monthly) with project selector. "Answers not data" philosophy. Charts, metrics, views count. | **PARTIAL** | Quick status card on mobile (1-liner: "Menu live, X views today"). NOT full analytics. |
| 2 | `/today` | **TodayScreen** | Social Content Campaigns — daily action cards. Primary card = "Share this dish on WhatsApp". Also: staff prompt section, sticker downloads, tent card downloads, physical surfaces. | **YES — MISSED!** | The WhatsApp share action is INHERENTLY mobile-first. Owner opens phone → sees "Share this on WhatsApp" → taps → done. This was missing from my original spec. |
| 3 | `/projects` | **ProjectsPage** | Full menu editor (1597 lines). Upload files, AI extraction, data editor, translate, AI image gen, AI descriptions, B2C visual builder, B2B JSON view, preview, share, comparison engine. | **PARTIAL** | Mobile: item list + search + price edit + availability toggle + add item. Desktop-only: upload, extraction, translate, images, B2C builder, B2B, comparison. |
| 4 | `/users` | **UsersListPage** | User management — search users, add/edit users, role assignment, user details modal. | **NO** | Configuration. Low frequency. Desktop only. |
| 5 | `/qr-code` | **QrCodePage** | **PLACEHOLDER** — literally `<div>QrCodePage</div>`. Not yet built. | **YES** | My Share & QR mobile screen actually has MORE functionality than the desktop version. Mobile-first opportunity. |
| 6 | `/feedback` | **FeedbackInbox** | Guest feedback list with filters (all/needs_attention/resolved), status update (new/resolved), QR download for feedback collection. Already uses Tailwind responsive classes. | **YES** | High-frequency operational. Owner checks feedback daily. Perfect for mobile. Already partially responsive. |
| 7 | `/business-settings` | **BusinessSettings** | 12 tabs: BasicInfo, ContactPerson, LocationInfo, SocialMedia, WorkingHours, TimeSlotPresets, LocaleSettings, Analytics, FeedbackSettings, Integrations, SEO, PosSync. | **PARTIAL** | Mobile: Working Hours (daily operational), BasicInfo (phone, name, address), ContactPerson. Desktop-only: TimeSlotPresets, LocaleSettings, Analytics, FeedbackSettings, Integrations, SEO, PosSync. |
| 8 | `/transactions` | **TransactionPage** | AI Operations log — token usage, model costs, processing time, credits consumed. Date range filter, project filter. | **NO** | Internal cost tracking. Desktop only. Zero operational value on mobile. |
| 9 | `/locations` | **LocationsPage** | Chain Control Panel — outlets table, add outlet button, billing summary, outlet policy editor. Visible only for master users with `canManageOutlets` permission. | **NO** | Configuration. Rare usage. Desktop only. |
| 10 | `/billing` | **BillingPage** | Active subscription card, pricing plans modal, credits pack modal (AI Enhancement Packs), billing history, Razorpay payment handler, upgrade flow. | **PARTIAL** | Mobile: view current plan + payment status + AI capacity remaining. Desktop-only: upgrade flow, credits purchase, plan comparison. |
| 11 | `/help-center` | **HelpCenter** | Hero search bar, tabbed content (Help, Tickets, Changelog), landing page with guides. | **PARTIAL** | Mobile: Contact Support (WhatsApp link). Desktop-only: full help center browsing, ticket management. |
| 12 | `/platform/chat-management` | **ChatManagement** | Conversations list — view/manage customer chat sessions. | **NO** | Platform admin tool. Desktop only. |
| 13 | `/platform/chat-insights` | **ChatInsights** | Chat analytics — daily metrics, response rates. | **NO** | Analytics. Desktop only. |
| 14 | `/platform/chat-weekly-digest` | **WeeklyDigest** | AI-generated weekly summary of chat trends. | **NO** | Analytics. Desktop only. |
| 15 | `/platform/chat-roi-calculator` | **ROICalculator** | Monthly business value calculator for chat feature. | **NO** | Analytics. Desktop only. |
| 16 | `/platform/chat-backfill` | **ChatBackfill** | Admin tool to backfill chat analytics data. | **NO** | Internal admin. Desktop only. |
| 17 | `/platform` | **PlatformHome** | Internal platform admin dashboard — tenants, stores management. | **NO** | Internal admin. Desktop only. |
| 18 | `/platform/support-tickets` | **SupportTickets** | Internal support ticket management. | **NO** | Internal admin. Desktop only. |
| 19 | `/platform/knowledge-base` | **KnowledgeBase** | Internal knowledge base management. | **NO** | Internal admin. Desktop only. |
| 20 | `/platform/kb-generation` | **KBGeneration** | Internal KB generation tool. | **NO** | Internal admin. Desktop only. |
| 21 | `/platform/changelog` | **Changelog** | Platform changelog display. | **NO** | Read-only. Desktop only. |

---

## Part 2: Every Feature Folder → Mobile Decision

### Core Product Features

| # | Feature | Folder | What It Does | Owner-Facing UI? | Mobile? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Client Menu (QR)** | `client-menu/` | Customer-facing QR menu — multi-tenant routing, SEO, decision blocks, autosell, analytics | Customer-facing, not owner dashboard | **N/A** | This is the public menu customers see. NOT part of owner mobile dashboard. |
| 2 | **Continuous Menu Intelligence** | `continuous-menu-intelligence/` | Nightly scheduler (2:30 AM UTC) — confidence scores, suppression windows, calibration | No owner UI (by doctrine) | **N/A** | Backend-only. "Silence is a feature." No mobile surface needed. |
| 3 | **Decision Intelligence** | `decision-intelligence/` | Customer-facing recommendation blocks + owner settings modal | Settings modal in editor | **NO** | Configuration only. Owner rarely touches decision block settings. Desktop only. |
| 4 | **Digital Screens** | `digital-screens/` | TV/tablet display — menu board + highlights modes, campaign slideshow | Screen management in dashboard | **NO** | Configuration of screen display. Complex settings. Desktop only. |
| 5 | **Hours & Holiday Accuracy** | `hours-holiday-accuracy/` | Hours status display ("Open now"/"Closed"), StoreStatusBadge component, working hours engine | Badge on menu/screens + hours editing | **YES** | Core operational. Open/closed control = daily mobile action. Already in my spec. |
| 6 | **Reviews & Reputation** | `reviews-reputation/` | Review monitoring + classification (BLOCKED — GBP dependency) | Not built yet | **FUTURE** | When built: mobile warning notices could be useful. Simple "heads up" card. |
| 7 | **GBP Sync** | `gbp-sync/` | Google Business Profile sync (feature-flagged OFF) | Settings tab | **NO** | Configuration. Not yet active. Desktop only. |
| 8 | **Multi-Outlet Consistency** | `multi-outlet-consistency/` | Master/outlet linking, project replication, override fields, propagation | Editor + Chain Control Panel | **NO** | Configuration. Complex. Desktop only. |
| 9 | **Physical Surfaces** | `physical-surfaces/` | Print-ready PDF menus from menu data | Download PDFs from editor | **NO** | Desktop workflow (generate + download PDFs). |
| 10 | **Staff Prompt** | `staff-prompt/` | AI staff training prompts from menu data | Section in Today screen | **NO** | Rare usage. Desktop workflow. |
| 11 | **Social Content** | `social-content/` | AI social media content — daily WhatsApp campaigns, action cards | Today screen — daily cards | **YES — MISSED!** | WhatsApp share campaigns are inherently mobile. "Share this on WhatsApp" = phone action. |
| 12 | **Pricing Integrity** | `pricing-integrity-system/` | Price consistency across all surfaces (QR, PDF, screens, staff) | Background system | **N/A** | No owner-facing UI. Background enforcement. |
| 13 | **Stores Management** | `stores-management/` | Platform admin store CRUD + multi-chain support | Platform admin pages | **NO** | Internal admin tool. Desktop only. |
| 14 | **Roles & Permissions** | `roles-permissions/` | RBAC — Owner/Manager/Staff roles, permission toggles | Users page + role modals | **NO** | Configuration. Desktop only. |
| 15 | **Multi-Chain Permissions** | `multi-chain-permissions/` | Chain-level outlet policy restrictions | Outlet Policy Editor in Locations | **NO** | Configuration. Desktop only. |
| 16 | **POS Webhook Sync** | `pos-webhook-sync/` | POS webhook sync (feature-flagged OFF) | Settings tab | **NO** | Not active. Configuration. Desktop only. |

### AI & Content Features

| # | Feature | Folder | What It Does | Mobile? | Verdict |
| --- | --- | --- | --- | --- | --- |
| 17 | **AI Enhancement Packs** | `ai-enhancement-packs/` | AI credits/packs for paid AI operations, capacity tracking, top-up purchase | **PARTIAL** | Mobile billing screen should show remaining AI capacity. Purchase = desktop. |
| 18 | **Menu Command Center** | `menu-command-center/` | Bulk menu operations — pricing, availability, category moves | **NO** | Complex bulk operations. Desktop only. |
| 19 | **Menu Correctness Engine** | `menu-correctness-engine/` | Menu validation on every save (feature-flagged OFF) | **N/A** | Background validation. No owner UI needed on mobile. |

### Projects Sub-Features

| # | Feature | Folder | What It Does | Mobile? | Verdict |
| --- | --- | --- | --- | --- | --- |
| 20 | **Upload & File Processing** | `projects/upload-file-processing/` | Upload PDF/image, convert PDF to images, file validation | **NO** | Complex multi-step. Desktop only. |
| 21 | **AI Data Extraction** | `projects/ai-data-extraction/` | OCR via Gemini, extract items/categories from images | **NO** | Slow AI process. Desktop only. |
| 22 | **Data Editor** | `projects/data-editor/` | Full menu item editor — categories, items, variants, descriptions, images | **PARTIAL** | Mobile: quick name/price/availability edit. Desktop: full editing. |
| 23 | **AI Image Generation** | `projects/ai-image-generation/` | Generate menu images via Gemini/DALL-E | **NO** | Slow, expensive, rare. Desktop only. |
| 24 | **Description Generation** | `projects/description-generation/` | AI descriptions for all menu items | **NO** | Bulk AI operation. Desktop only. |
| 25 | **Multi-Language Translation** | `projects/multi-language-translation/` | Translate menu to multiple languages | **NO** | Complex, rare. Desktop only. |
| 26 | **B2C View** | `projects/b2c-view/` | Visual menu builder for customer-facing menu | **NO** | Complex visual builder. Desktop only. |
| 27 | **B2B View** | `projects/b2b-view/` | JSON API view for POS/integration | **NO** | Developer tool. Desktop only. |
| 28 | **Project Management** | `projects/project-management/` | Create, delete, duplicate, rename projects | **NO** | Configuration. Desktop only. |
| 29 | **Image Editing** | `projects/image-editing/` | Crop, edit, upload menu item images | **NO** | Visual editing. Desktop only. |
| 30 | **Internal Feedback System** | `projects/internal-feedback-system/` | Internal quality feedback for AI extraction | **N/A** | Internal system. No owner UI. |

### Platform & Infrastructure

| # | Feature | Folder | Mobile? | Verdict |
| --- | --- | --- | --- | --- |
| 31 | **Authentication** | `auth/` | **Already Handled** | Same NextAuth session. No mobile-specific work. |
| 32 | **Auth Onboarding** | `auth-onboarding/` | **Already Handled** | Signup flow. Works on any device already. |
| 33 | **Security** | `security/` | **N/A** | Infrastructure. No owner UI. |
| 34 | **System Strengthening** | `system-strengthening/` | **N/A** | Infrastructure. No owner UI. |
| 35 | **Editor UX Improvements** | `editor-ux-improvements/` | **NO** | Desktop editor UX. Not applicable to mobile. |

### Standalone Features

| # | Feature | File | Mobile? | Verdict |
| --- | --- | --- | --- | --- |
| 36 | **Network Status Monitoring** | `features/network-status-monitoring.md` | **YES** | Already exists. Should work on mobile. Shown as toast. |
| 37 | **Profile Modal** | `features/profile-modal-redesign.md` | **YES** | Accessible from More screen on mobile. |
| 38 | **Trust & Security Page** | `features/trust-security-page.md` | **NO** | Public website page, not dashboard. |

---

## Part 3: Critical Findings — What Was Missing

### 🔴 CRITICAL MISS: Today/Social Content Campaigns

**What I missed:** The `/today` route renders the `TodayScreen` which shows daily social content campaigns. The PRIMARY action is "Share this dish on WhatsApp" — this is a **phone-native action**.

**The Today screen has:**
- **PrimaryCard** — A single daily campaign with "Share on WhatsApp" button
- **OperationalSection** — Additional smaller campaign cards
- **StaffPromptSection** — Staff training content (desktop-only)
- **StickerSection** — Downloadable stickers (desktop-only)
- **TentCardSection** — Tent card PDFs (desktop-only)

**What belongs on mobile:**
- The **PrimaryCard** (daily WhatsApp share action) is PERFECT for mobile
- The **OperationalSection** campaigns that target WhatsApp/social are mobile-friendly
- Everything else (stickers, tent cards, staff prompts, physical surfaces) = desktop only

**Impact:** This should be added to the mobile experience. It's a daily action that owners will do from their phone — see today's campaign suggestion → tap share → WhatsApp opens with content → done.

### 🟡 PARTIAL MISS: Dashboard Quick Status

**What I underrepresented:** The OwnerDashboard shows "Answers, not data" — simple confirmations like "Your menu is live", views count, weekly trend. A 1-card version of this at the top of the mobile Menu screen would add confidence without complexity.

**Impact:** Optional enhancement. Add a small status banner/card at top of Menu screen: "Menu live • 47 views today" (single line, not a full dashboard).

### 🟡 PARTIAL MISS: AI Capacity in Billing

**What I underrepresented:** The AI Enhancement Packs feature tracks remaining AI capacity. The mobile billing screen should show this: "23 image generations remaining" or "AI capacity: 80% used".

**Impact:** Minor addition to mobile billing screen.

### 🟢 CONFIRMED: Support Contact in More

**Already partially covered:** My More screen includes "Contact Support" which opens WhatsApp. This is correct — the full Help Center with search/articles/tickets is desktop-only, but a quick support link is mobile-appropriate.

---

## Part 4: Updated Mobile Screens List (Final)

### Changes from Original Spec

| Change Type | Screen | Details |
| --- | --- | --- |
| **🔴 ADDED** | Today Actions | Daily campaign cards — WhatsApp share, social content actions |
| **🟡 ENHANCED** | Menu Screen | Add optional status banner ("Menu live • X views today") |
| **🟡 ENHANCED** | Billing Screen | Show AI capacity remaining |
| **🟡 ENHANCED** | More Screen | Add "Contact Support" (WhatsApp link) — already included |

### Final Screen List (11 Screens)

| # | Screen | Tab | Frequency | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Menu Screen | Menu | Multiple/day | P0 | ✅ In original spec |
| 2 | Item Quick Edit Sheet | Menu (overlay) | Multiple/day | P0 | ✅ In original spec |
| 3 | Add Item Sheet | Menu (overlay) | Weekly | P1 | ✅ In original spec |
| 4 | Hours & Status Screen | Hours | Daily | P0 | ✅ In original spec |
| 5 | **Today Actions Screen** | Hours (sub-section) | **Daily** | **P1 — NEW** | **🔴 ADDED** |
| 6 | Feedback Inbox | Feedback | Daily | P1 | ✅ In original spec |
| 7 | Feedback Detail | Feedback (drill-in) | Daily | P1 | ✅ In original spec |
| 8 | Share & QR Screen | More | Daily | P1 | ✅ In original spec |
| 9 | Public Info Screen | More | Monthly | P2 | ✅ In original spec |
| 10 | Billing Screen (enhanced) | More | Monthly | P2 | ✅ Enhanced |
| 11 | More Screen | More | As needed | P2 | ✅ Enhanced |

### Today Actions — Integration Decision

**Option A:** Separate tab (5th tab) — **REJECTED** (violates 4-tab law)

**Option B:** Sub-section within Hours tab — **RECOMMENDED**

The Hours tab becomes "Hours & Today" or just stays "Hours" with a "Today's Action" card below the hours controls:

```
┌─────────────────────────────┐
│  Hours & Status             │
├─────────────────────────────┤
│  TODAY STATUS               │
│  🟢 OPEN • Closes 10 PM    │
│  [Close for Today]          │
├─────────────────────────────┤
│  TODAY'S ACTION             │  ← NEW
│  ┌─────────────────────────┐│
│  │ 📱 Share on WhatsApp    ││
│  │ "Paneer Tikka is the    ││
│  │  perfect lunch choice"  ││
│  │                         ││
│  │ [Share] [Skip for today]││
│  └─────────────────────────┘│
├─────────────────────────────┤
│  Weekly Hours               │
│  Mon 9:00 AM - 10:00 PM    │
│  ...                        │
└─────────────────────────────┘
```

**Why this works:**
- Today's campaign is a DAILY action — same frequency as checking hours
- Combining them on one tab avoids a 5th tab
- The campaign card is small (1 card) — doesn't overwhelm the hours screen
- The "Share on WhatsApp" action is the most mobile-native feature in the entire app
- If no campaign today → card simply doesn't show (silence = feature)

### Data Source for Today Actions

```typescript
// Existing hooks — NO new DAL needed
import { useTodayCampaigns } from '@template/main-app/today/hooks/useTodayCampaigns';
import { useCampaignActions } from '@template/main-app/today/hooks/useCampaignActions';

// These hooks already provide:
// - todayCampaigns.primary (the main daily action)
// - todayCampaigns.operational (secondary actions)
// - completeCampaign() (mark as shared)
// - skipCampaign() (skip for today)
```

---

## Part 5: Features Definitively Rejected for Mobile

This is the COMPLETE rejection list based on deep audit of every feature:

| # | Feature | Rejection Reason | Gate Failed |
| --- | --- | --- | --- |
| 1 | AI Image Generation | Slow (30s+), expensive, rare | Speed Gate |
| 2 | AI Description Generation | Bulk operation, rare | Complexity Gate |
| 3 | Multi-Language Translation | Complex settings, rare | Complexity Gate |
| 4 | Menu Upload & Processing | Multi-step, file handling | Complexity Gate |
| 5 | AI Data Extraction | Slow, complex review flow | Speed Gate |
| 6 | B2C Visual Builder | Complex drag-and-drop | Touch Gate |
| 7 | B2B JSON View | Developer tool | Value Gate |
| 8 | Image Editing | Visual canvas editing | Touch Gate |
| 9 | Menu Command Center | Bulk operations modal | Complexity Gate |
| 10 | Decision Block Settings | Configuration, rare | Frequency Gate |
| 11 | Digital Screen Management | Configuration settings | Frequency Gate |
| 12 | POS Webhook Settings | Configuration, not active | Frequency Gate |
| 13 | User/Role Management | Configuration, admin | Frequency Gate |
| 14 | Outlet Creation & Management | Configuration, rare | Frequency Gate |
| 15 | Outlet Policy Editor | Configuration, admin | Frequency Gate |
| 16 | Analytics Dashboard (full) | Read-heavy, charts | Value Gate |
| 17 | Transaction/AI Operations Log | Internal tracking | Value Gate |
| 18 | Help Center (full) | Browse articles, tickets | Complexity Gate |
| 19 | SEO Settings | Configuration, rare | Frequency Gate |
| 20 | Locale/Timezone Settings | Configuration, one-time | Frequency Gate |
| 21 | Analytics Tracking Settings | Configuration, one-time | Frequency Gate |
| 22 | Feedback Collection Settings | Configuration, rare | Frequency Gate |
| 23 | Integration Settings | Configuration, rare | Frequency Gate |
| 24 | Social Media Links | Configuration, rare | Frequency Gate |
| 25 | Time Slot Presets | Configuration, rare | Frequency Gate |
| 26 | Staff Prompt Content | Desktop viewing/printing | Complexity Gate |
| 27 | Sticker/Tent Card Downloads | Desktop download workflow | Value Gate |
| 28 | Physical Surface PDFs | Desktop download workflow | Value Gate |
| 29 | Platform Admin Pages | Internal admin only | Value Gate |
| 30 | Chat Management | Platform admin only | Value Gate |
| 31 | KB Generation | Platform admin only | Value Gate |
| 32 | GBP Sync Settings | Not active, configuration | Frequency Gate |
| 33 | Menu Correctness Engine | Background, flagged OFF | N/A |
| 34 | Pricing Integrity System | Background, no UI | N/A |
| 35 | Continuous Menu Intelligence | Background, no UI | N/A |

**35 features/sub-features rejected. 0 questionable decisions.**

Every rejection maps to a specific gate from the Mobile UI Doctrine (Law 10 / Feature Admission Test).

---

## Part 6: Confidence Assessment

| Aspect | Confidence | Reason |
| --- | --- | --- |
| Desktop routes covered | **100%** | Read every route in `src/app/(main)/` |
| Feature folders covered | **100%** | Read every README/spec in `__docs__/` |
| Template components analyzed | **100%** | Read every index.tsx in `templates/main-app/` |
| Navigation items covered | **100%** | Read full `navigations.ts` |
| Mobile screen list complete | **99%** | 1 addition (Today Actions) found. No other gaps. |
| Rejection list justified | **100%** | Every rejection has specific gate reference |

### What Could Still Be Missing

1. **Future features** not yet documented — can't audit what doesn't exist
2. **Reviews & Reputation** — blocked on GBP. When built, may need mobile surface (warning notices)
3. **Chat widget responses** — if owner needs to reply to chat from phone (currently platform-admin only)

These are FUTURE considerations, not current gaps.

---

**Document Signature:** Deep Audit Cross-Reference  
**Version:** 1.0  
**Last Updated:** February 14, 2026
