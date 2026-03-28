# 📄 DOCUMENT 3: ARCHITECTURE BLUEPRINT

**File Name:** 03-ARCHITECTURE-BLUEPRINT.md  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED — 3-Year Architecture Freeze (2026–2028)  
**Audience:** Engineering, CTO, Security, Infra, Investors

---

## 1. ARCHITECTURE PRINCIPLES (NON-NEGOTIABLE)

MenuListAi architecture is governed by **authority-first system design**, not transparency or configurability.

### Core Principles

| Principle                         | Description                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Frontend-First Architecture**   | Intelligence is precomputed; frontend only renders decisions; no runtime AI or scoring                       |
| **Silence Is a Feature**          | No data = no UI; suppression is intentional, not failure                                                     |
| **Single Source of Truth (SSOT)** | `platformSummary/campaigns_{sId}` is the canonical runtime document; all features read from the same summary |
| **3-Year Freeze Rule**            | No architectural changes allowed until 2028; only capability flags may toggle behavior                       |

### Confidence Escalation Ladder

```
Campaigns (0.6)
    ↓
Decision Blocks (0.65)
    ↓
Digital Screens (0.7)
    ↓
Physical Surfaces (0.7–0.8)
    ↓
Staff Prompt (0.8)
```

---

## 2. TECHNOLOGY STACK (EXACT)

### Frontend

| Layer      | Technology                   |
| ---------- | ---------------------------- |
| Framework  | Next.js (App Router)         |
| Language   | TypeScript                   |
| UI Library | Ant Design                   |
| Styling    | CSS Modules                  |
| State      | SWR (stale-while-revalidate) |
| Icons      | Lucide + React Icons         |
| Rendering  | SSR + Client Components      |
| PWA        | Enabled                      |

### Backend

| Layer     | Technology                   |
| --------- | ---------------------------- |
| Platform  | Firebase                     |
| Auth      | Firebase Auth                |
| DB        | Firestore                    |
| Functions | Firebase Cloud Functions     |
| AI        | Gemini 2.x + Imagen          |
| Scheduler | Firebase Scheduled Functions |

### Infrastructure

| Area           | Choice                 |
| -------------- | ---------------------- |
| Hosting        | Vercel                 |
| Regions        | Multi-region Firestore |
| CDN            | Vercel Edge            |
| Error Tracking | Sentry                 |
| Logging        | Firebase Logs          |

---

## 3. HIGH-LEVEL SYSTEM ARCHITECTURE

```
┌──────────────┐
│  Customers   │
│  (QR Menu)   │
└─────┬────────┘
      │ events
      ▼
┌────────────────────────┐
│  Analytics Collector   │
│  (Passive, No UI)      │
└─────┬──────────────────┘
      │ nightly
      ▼
┌────────────────────────┐
│  Continuous Menu       │
│  Intelligence (CMI)    │
└─────┬──────────────────┘
      │ summary write
      ▼
┌──────────────────────────────┐
│     platformSummary          │
│     campaigns_{sId}          │ ← SINGLE SOURCE OF TRUTH
└─────┬───────────┬────────────┘
      │           │
      │           ├─ Decision Blocks
      │           ├─ Digital Screens
      │           ├─ Physical Surfaces
      │           ├─ Staff Prompt
      │           └─ Social Content (Today)
      ▼
┌────────────────────────┐
│   Owner Dashboard      │
│   (Today Surface)      │
└────────────────────────┘
```

---

## 4. FRONTEND ARCHITECTURE

### App Structure

```
src/
├── app/
│   ├── (main)/
│   │   ├── today/
│   │   ├── projects/
│   │   └── dashboard/
│
├── components/
│   └── templates/
│       └── main-app/
│           └── today/
│
├── lib/
│   ├── campaigns/
│   ├── staff-prompt/
│   ├── physical-surfaces/
│   └── screens/
│
├── database/
│   ├── campaigns/
│   └── analytics/
│
├── types/
│   └── campaigns.ts
│
└── config/
    └── features.ts
```

### State Management

- **SWR only** — No Redux / Zustand
- **Deduping interval:** 30s
- **All reads hit summary document**

```typescript
useSWR(`/api/today/${storeId}`, fetcher, { dedupingInterval: 30000 });
```

### Rendering Strategy

| Surface        | Strategy        |
| -------------- | --------------- |
| Today Tab      | Client render   |
| QR Menu        | SSR             |
| Digital Screen | Cached client   |
| Posters        | Client-side PDF |
| Staff Prompt   | Client render   |

---

## 5. BACKEND ARCHITECTURE

### API Design Philosophy

- **Thin APIs** — No business logic in routes
- **All logic in `/lib`**

### API Categories

| API Type        | Purpose            |
| --------------- | ------------------ |
| Read APIs       | Fetch summaries    |
| Action APIs     | Skip / complete    |
| Generation APIs | AI content (gated) |

### Example API Contract

```
GET /api/today
→ Reads platformSummary/campaigns_{sId}
→ Returns TodayCampaignSummary only
```

**No joins. No fan-out queries.**

---

## 6. DATABASE DESIGN

### Collections (FINAL)

| Collection       | Purpose               |
| ---------------- | --------------------- |
| platformSummary  | Runtime SSOT          |
| campaigns        | Full campaign history |
| campaignExports  | Export audit          |
| analyticsEvents  | Raw signals           |
| menus            | Menu data             |
| menuIntelligence | CMI state             |
| decisionBlocks   | Precomputed blocks    |

### Summary Document Pattern (CRITICAL)

```
platformSummary/
└── campaigns_{sId}
    ├── today.primary
    ├── today.operational[]
    ├── staffPrompt
    ├── screen
    └── stats
```

**Benefits:**

- 1 read per screen
- Predictable cost
- No joins
- Atomic updates

---

## 7. AUTHENTICATION & AUTHORIZATION

### Auth Flow

1. Owner logs in (Firebase Auth)
2. `withAuth()` wrapper applied
3. Tenant context injected
4. Firestore rules enforce `{tId}/{sId}`

### Public Access

| Surface        | Auth           |
| -------------- | -------------- |
| QR Menu        | ❌             |
| Digital Screen | ❌ (tokenized) |
| Posters        | ❌             |
| Dashboard      | ✅             |

---

## 8. SECURITY ARCHITECTURE

### Controls Implemented

| Area          | Protection     |
| ------------- | -------------- |
| Auth          | Firebase Auth  |
| Validation    | Zod schemas    |
| Rate Limiting | Function-level |
| XSS           | SSR + escaping |
| Injection     | Firestore SDK  |
| OWASP Top 10  | Implemented    |

### Data Exposure Rules

- ❌ No confidence scores exposed
- ❌ No formulas exposed
- ❌ No analytics shown on decision surfaces

---

## 9. SCALABILITY DESIGN

### Multi-Tenancy

```
campaigns/{tId}/{sId}/{campaignId}
platformSummary/campaigns_{sId}
```

- Hard tenant isolation
- No cross-store reads
- No global queries

### Load Handling

| Scenario       | Strategy           |
| -------------- | ------------------ |
| 10k stores     | Summary doc        |
| Peak scans     | Client aggregation |
| Screen traffic | Cached assets      |

---

## 10. COST ANALYSIS (MONTHLY ESTIMATE)

| Component        | Cost                    |
| ---------------- | ----------------------- |
| Firestore Reads  | Low (<$5k @ 10k stores) |
| Firestore Writes | Predictable             |
| Gemini AI        | On-demand only          |
| Storage          | Negligible              |
| Hosting          | Vercel standard         |

---

## 11. ARCHITECTURE ROADMAP (LOCKED)

### Allowed (Config Only)

- Switch heuristic → learned
- Enable direct posting
- Enable outcome framing modes

### Forbidden (Until 2028)

- New collections
- New surfaces
- Realtime analytics
- Owner configuration UIs

---

## 12. TEXT-BASED INFRASTRUCTURE DIAGRAM

```
[ Client ]
     │
     ▼
[ Next.js (Vercel) ]
     │
     ├─ Auth (Firebase)
     ├─ APIs (Thin)
     │    └─ lib/*
     │
     ▼
[ Firestore ]
     ├─ platformSummary (SSOT)
     ├─ campaigns
     └─ analyticsEvents

[ Cloud Scheduler ]
     └─ Nightly CMI Loop
```

---

## 13. ARCHITECTURE STATUS

| Category          | Status |
| ----------------- | ------ |
| Scalability       | ✅     |
| Security          | ✅     |
| Cost              | ✅     |
| Freeze Compliance | ✅     |
| Audit Score       | 98/100 |

---

## Cross-References

- Features → [DOC2-FEATURE-CATALOG]
- Implementation → [DOC4-IMPLEMENTATION-BLUEPRINT]
- Verification → [DOC5-PRODUCTION-VERIFICATION]

---

_Document Status: ✅ COMPLETE_
