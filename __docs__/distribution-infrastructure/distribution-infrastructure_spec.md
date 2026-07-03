# Distribution Infrastructure — Product Specification

**Version:** 1.0 (Draft)  
**Status:** 🟡 PROPOSAL — Requires founder approval before implementation  
**Created:** March 1, 2026  
**Source:** ChatGPT Strategic Session (Thread 4) → Cascade validation + MenuList alignment

---

## Purpose

This document specifies a **deterministic distribution execution system** for MenuList's go-to-market operations. This is NOT a strategic repositioning — MenuList's infrastructure positioning (Constitution Docs 15, 17) remains unchanged. This is **tactical execution infrastructure** to systematically create physical dependency and behavioral anchoring at scale.

---

## Core Principle

> **"Distribution infrastructure enables MenuList to become default through systematic behavioral anchoring, not marketing noise."**

This system must:
- Maintain upstream authority positioning (Doc 15, Rule 1)
- Create physical dependency through QR enforcement (Doc 15, Rule 4)
- Operate silently and deterministically (Doc 01, Law 2)
- Enable automation without spam (Doc 01, Law 8)

---

## System Architecture

### Three-Layer Model

```
┌─────────────────────────────────────────┐
│  ENTITY LAYER (Truth)                   │
│  - menus (canonical source)             │
│  - stores (ownership)                   │
│  - prospects (contacts)                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  WORKFLOW LAYER (Actions)               │
│  - actions collection                   │
│  - deterministic state machine          │
│  - cron-based scheduling                │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  EXECUTION LAYER (Automation)           │
│  - ASSISTED mode (manual approval)      │
│  - AUTO mode (system executes)          │
└─────────────────────────────────────────┘
```

---

## 1. Entity Layer — Canonical Data Model

### 1.1 Menus Collection (Existing)

**Extends existing schema with distribution fields:**

```typescript
interface Menu {
  // Existing fields...
  menuId: string;
  slug: string;
  zoneId: string;
  isClaimed: boolean;
  
  // NEW: Distribution tracking
  distributionStatus: 'NOT_SENT' | 'SENT' | 'CLAIMED' | 'ACTIVE' | 'INACTIVE';
  distributionPaused: boolean;
  followupCount: number;
  nextFollowupDate: Timestamp | null;
  lastContactedAt: Timestamp | null;
}
```

**Distribution status flow:**
```
NOT_SENT → SENT → CLAIMED → ACTIVE
                      ↓
                  INACTIVE (if never claimed after followups)
```

### 1.2 Stores Collection (Existing)

**Extends existing schema with QR tracking:**

```typescript
interface Store {
  // Existing fields...
  storeId: string;
  menuId: string;
  
  // NEW: QR deployment tracking
  qrGenerated: boolean;
  qrGeneratedAt: Timestamp | null;
  qrSentAt: Timestamp | null;
  qrDeployed: boolean;
  qrConfirmedAt: Timestamp | null;
}
```

### 1.3 Prospects Collection (NEW)

**Purpose:** Contact information for unclaimed menus

```typescript
interface Prospect {
  prospectId: string;
  menuId: string;
  phone: string;
  zoneId: string;
  businessName: string;
  source: 'MANUAL' | 'BATCH' | 'INBOUND';
  createdAt: Timestamp;
}
```

**Lifecycle:** Prospect exists until menu claimed, then deleted (data moves to store).

---

## 2. Workflow Layer — Action Engine

### 2.1 Actions Collection (NEW)

**Purpose:** Deterministic task scheduler for all distribution operations

```typescript
interface Action {
  actionId: string;              // Deterministic: {menuId}_{type}_{sequence}
  menuId: string;
  type: ActionType;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  scheduledFor: Timestamp;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  completedBy: 'SYSTEM' | 'MANUAL' | null;
  metadata?: Record<string, any>;
}

type ActionType = 
  | 'SEND_DEMO'
  | 'FOLLOWUP_1'
  | 'FOLLOWUP_2'
  | 'FOLLOWUP_3'
  | 'ACTIVATE_STORE'
  | 'SEND_QR_KIT'
  | 'NUDGE_QR_DEPLOY'
  | 'MARK_INACTIVE';
```

### 2.2 State Machine Rules

**Rule 1 — Creation Trigger:**
When menu created → auto-create `SEND_DEMO` action (scheduledFor = now)

**Rule 2 — Followup Sequence:**
When `SEND_DEMO` completed:
- Set `menu.distributionStatus = 'SENT'`
- Set `menu.followupCount = 0`
- Set `menu.nextFollowupDate = now + 2 days`

Cron generates followups:
- Day 2: `FOLLOWUP_1`
- Day 5: `FOLLOWUP_2` (if not claimed)
- Day 10: `FOLLOWUP_3` (if not claimed)

**Rule 3 — Claim Interrupt:**
When `menu.isClaimed = true`:
- Cancel all PENDING actions
- Create `ACTIVATE_STORE` action
- Set `menu.distributionStatus = 'CLAIMED'`

**Rule 4 — Activation Flow:**
When `ACTIVATE_STORE` completed:
- Generate QR code assets
- Create `SEND_QR_KIT` action
- Set `store.qrGenerated = true`

**Rule 5 — QR Enforcement:**
If `store.qrDeployed = false` after 5 days:
- Create `NUDGE_QR_DEPLOY` action

When `store.qrDeployed = true`:
- Cancel any pending QR nudges
- Set `menu.distributionStatus = 'ACTIVE'`

**Rule 6 — Inactive Marking:**
If all followups completed and not claimed:
- Create `MARK_INACTIVE` action
- Set `menu.distributionStatus = 'INACTIVE'`

### 2.3 Idempotency Guards

**Before creating any action:**

```typescript
// Check 1: Menu exists
if (!menu) throw new Error('Menu not found');

// Check 2: Not claimed (unless activation action)
if (menu.isClaimed && type !== 'ACTIVATE_STORE') return;

// Check 3: Not paused
if (menu.distributionPaused) return;

// Check 4: No duplicate pending action
const existing = await getAction({
  menuId,
  type,
  status: 'PENDING'
});
if (existing) return; // Already exists, skip

// Check 5: Deterministic actionId
const actionId = `${menuId}_${type}_${sequence}`;
```

### 2.4 Cron Scheduler

**Frequency:** Hourly (not daily — ensures no delay)

**Responsibilities:**
1. Generate followup actions for menus where `nextFollowupDate <= now`
2. Generate QR nudges for stores where `qrDeployed = false` and 5+ days since activation
3. Generate inactive markers for menus where all followups completed

**What cron does NOT do:**
- Complete actions (only creates them)
- Modify claim state
- Send messages directly

---

## 3. Execution Layer — Automation Modes

### 3.1 System Configuration

```typescript
interface SystemConfig {
  automationMode: 'ASSISTED' | 'AUTO';
  autoFollowups: boolean;
  autoQRNudges: boolean;
  autoInactiveMarking: boolean;
}
```

### 3.2 ASSISTED Mode (Default)

**Behavior:**
- All actions require manual approval
- Dashboard shows pending actions
- User clicks "Approve" → WhatsApp deep link opens
- User marks action complete after sending

**Use case:** Initial rollout, quality control, low volume (<200 menus)

### 3.3 AUTO Mode (Future)

**Behavior:**
- System auto-executes followups, QR nudges, inactive marking
- `SEND_DEMO` remains manual (first contact always human-approved)
- `ACTIVATE_STORE` remains manual (high-touch moment)

**Trigger criteria:**
- 200+ live menus
- Claim rate stable (>12%)
- No pipeline bugs for 14+ days

---

## 4. Batch Acceleration Layer

### 4.1 Batch Jobs Collection (NEW)

```typescript
interface BatchJob {
  batchId: string;
  totalItems: number;
  processed: number;
  success: number;
  failed: number;
  status: 'RUNNING' | 'COMPLETE' | 'FAILED';
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  errors: Array<{
    restaurantName: string;
    error: string;
  }>;
}
```

### 4.2 Confidence Scoring

**Purpose:** Auto-approve high-quality extractions, flag low-quality for review

```typescript
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

interface MenuConfidence {
  level: ConfidenceLevel;
  score: number; // 0-100
  reasons: string[];
}

// Scoring logic
function calculateConfidence(menu: Menu): MenuConfidence {
  let score = 100;
  const reasons: string[] = [];
  
  // Deduct for missing data
  if (!menu.categories || menu.categories.length === 0) {
    score -= 30;
    reasons.push('No categories extracted');
  }
  
  if (menu.items.some(item => !item.price)) {
    score -= 20;
    reasons.push('Missing prices');
  }
  
  if (menu.items.length < 5) {
    score -= 15;
    reasons.push('Very few items');
  }
  
  // Determine level
  const level = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
  
  return { level, score, reasons };
}
```

**Review queue rules:**
- `HIGH` → Auto-approve, move to send queue
- `MEDIUM` → Quick review (fix obvious issues)
- `LOW` → Full review or regenerate

### 4.3 Scaling Ladder

**Stage 1 — Stabilize 10/day (Week 1-2):**
- Prove system runs cleanly
- No confusion, no backlog
- Daily time <75 minutes

**Stage 2 — Ramp to 20/day (Week 3-6):**
- Gradual increase: 12 → 15 → 20
- Maintain quality gates
- Daily time <90 minutes

**Stage 3 — Hold at 20/day (Month 2-6):**
- Do NOT increase to 40/day (rejected — see ChatGPT review)
- Focus on zone density, not raw volume
- Optimize claim rate, not send volume

**Volume targets (LOCKED):**
- Maximum sustainable: 20/day
- Target claim rate: 15-20%
- Target live menus: 300-400 in 6 months (not 1,000)

---

## 5. QR Enforcement Pipeline

### 5.1 QR Generation (Automatic)

**Trigger:** `ACTIVATE_STORE` action completed

**Generated assets:**
1. QR code PNG (300x300, 600x600)
2. Print-ready PDF (A4, table tent format)
3. Short URL (`menulist.ai/m/{slug}`)

**Storage:**
```
stores/{storeId}/qr/
  - qr-code-300.png
  - qr-code-600.png
  - qr-print-a4.pdf
```

### 5.2 QR Send Action

**Type:** `SEND_QR_KIT`

**Message template:**
```
Your official menu is now live at menulist.ai/m/{slug}

Use this QR for tables & counter:
{qr_download_link}

Customers always see latest menu. No reprinting needed.
```

**Tone:** Calm, factual, infrastructure (not marketing)

### 5.3 QR Deployment Nudge

**Type:** `NUDGE_QR_DEPLOY`

**Trigger:** 5 days after `SEND_QR_KIT` if `qrDeployed = false`

**Message template:**
```
Quick reminder — placing your menu QR helps customers always see latest items.

Download again: {qr_download_link}
```

**Frequency:** Once only (no repeated nudges)

### 5.4 Deployment Confirmation

**Manual:** User marks `qrDeployed = true` when owner confirms

**Effect:**
- Cancel any pending QR nudges
- Set `menu.distributionStatus = 'ACTIVE'`
- Store fully activated

---

## 6. Dashboard — Internal Actions View

### 6.1 Route

`/internal/actions-today`

**Access:** Founder only (no RBAC needed initially)

### 6.2 Sections

**1. Send Now (Priority 1)**
- All `SEND_DEMO` actions with `scheduledFor <= now`
- Sorted by zone (group by geography)
- Click → WhatsApp deep link opens
- Mark complete → action status updated

**2. Followups Today (Priority 2)**
- All `FOLLOWUP_1/2/3` actions scheduled for today
- Show followup count (1st, 2nd, or 3rd)
- Same flow as Send Now

**3. Activation Required (Priority 3)**
- All `ACTIVATE_STORE` actions
- Show business name, claim date
- Complete → triggers QR generation

**4. QR Sends (Priority 4)**
- All `SEND_QR_KIT` actions
- Show QR download link
- Complete → schedules nudge

**5. Inactive Marking (Priority 5)**
- All `MARK_INACTIVE` actions
- Confirm before marking

**UI Principles:**
- No analytics, no charts, no metrics
- Only actionable items
- Clear "what to do next"
- Complete in <60 seconds

---

## 7. Alignment with MenuList Constitution

### 7.1 Doc 15 (Category Dominance Doctrine)

✅ **Rule 1 — Upstream Positioning:**
Menus remain canonical source. Actions are distribution operations, not data sync.

✅ **Rule 4 — Chain-First Authority:**
QR enforcement creates physical dependency (tables, counters, packaging).

✅ **Rule 6 — 5-Year Inevitability Map:**
This system enables Phase 0 (Behavioral Anchoring) and Phase 1 (Structural Lock-In).

### 7.2 Doc 17 (Infrastructure Compounding Doctrine)

⚠️ **Potential conflict:**
> "When bandwidth is available, MenuList must deepen infrastructure quality, not add features."

**Resolution:**
Distribution infrastructure is NOT a feature. It's **operational infrastructure** that enables MenuList to achieve upstream positioning at scale. Without systematic distribution, MenuList cannot reach critical mass for behavioral anchoring.

**Justification:**
- QR enforcement = physical dependency creation (infrastructure deepening)
- Batch scaling = operational efficiency (not feature expansion)
- Action engine = deterministic execution (not marketing automation)

### 7.3 Doc 01 (Core Doctrine)

✅ **Law 2 — Silence Is a Feature:**
Followups are deterministic, not spam. System stops after 3 attempts.

✅ **Law 8 — Trust > Engagement:**
No engagement metrics. Success = owner forgets MenuList exists (because it just works).

---

## 8. What This System Does NOT Do

❌ **Marketing automation** — No campaigns, no A/B testing, no growth hacks

❌ **Perceived ubiquity tricks** — No fake social proof, no "everyone uses this"

❌ **Aggressive volume targets** — 20/day max, not 40/day (quality > speed)

❌ **Spam followups** — 3 attempts max, then stop (not 10+ like SaaS)

❌ **Analytics dashboards** — No engagement metrics, no funnel optimization

---

## 9. Success Metrics (Aligned with Doc 06)

**Allowed metrics (from Constitution Doc 06):**

1. **System Health:**
   - Action completion rate (should be ~100%)
   - Cron execution success rate
   - Duplicate action detection (should be 0)

2. **Decision Execution:**
   - Claim rate (% of sent menus that get claimed)
   - QR deployment rate (% of activated stores with QR deployed)
   - Time-to-activation (claim → QR deployed)

3. **Authority Maturation:**
   - First-update behavior (future — when user base exists)
   - Physical dependency count (QR codes deployed)

**Forbidden metrics:**
- Daily active users
- Engagement rate
- Time spent in dashboard
- Feature adoption rate

---

## 10. Implementation Phases

### Phase 1 — Core Action Engine (Week 1-2)

**Build:**
- `actions` collection + schema
- `prospects` collection + schema
- Menu distribution fields
- Store QR fields
- `completeAction()` callable
- Claim trigger → cancel pipeline

**Test:**
- Dry run with 10 test menus
- Simulate full lifecycle
- Verify idempotency

### Phase 2 — Cron Scheduler (Week 2-3)

**Build:**
- Hourly cron function
- Followup generation logic
- QR nudge generation
- Inactive marking

**Test:**
- Shorten intervals (minutes instead of days)
- Verify no duplicates
- Test claim interrupt

### Phase 3 — Dashboard (Week 3-4)

**Build:**
- `/internal/actions-today` route
- 5 sections (Send, Followups, Activation, QR, Inactive)
- WhatsApp deep link integration
- Mark complete flow

**Test:**
- Process 20 actions in <60 seconds
- Verify clarity (no confusion)

### Phase 4 — Batch Scaling (Week 4-5)

**Build:**
- `batch_jobs` collection
- Batch generation endpoint
- Confidence scoring
- Review queue

**Test:**
- Batch generate 20 menus
- Review MEDIUM confidence items
- Verify quality gates

### Phase 5 — QR Enforcement (Week 5-6)

**Build:**
- QR generation at activation
- `SEND_QR_KIT` action
- `NUDGE_QR_DEPLOY` action
- Deployment confirmation

**Test:**
- Generate QR assets
- Verify download links
- Test nudge timing

### Phase 6 — Production Rollout (Week 6+)

**Start:**
- 10/day for 7 days (stabilize)
- 15/day for 7 days (ramp)
- 20/day sustained (hold)

**Monitor:**
- Action completion rate
- Claim rate
- QR deployment rate
- Daily execution time

---

## 11. Open Questions (Require Founder Decision)

### Q1: Should distribution infrastructure be built now?

**Tradeoff:**
- **PRO:** Enables systematic go-to-market, creates physical dependency at scale
- **CON:** Diverts bandwidth from infrastructure deepening (Doc 17)

**Founder decision required.**

### Q2: What is acceptable claim rate?

**Options:**
- A. 10-15% (conservative, quality-focused)
- B. 15-20% (balanced)
- C. 20%+ (aggressive, may indicate spam)

**Recommendation:** B (15-20%)

### Q3: Should AUTO mode ever be enabled?

**Tradeoff:**
- **PRO:** Scales beyond manual capacity
- **CON:** Risks spam perception if system misbehaves

**Recommendation:** Enable only after 200+ menus, 14+ days stable, claim rate >15%

### Q4: Should volume ever exceed 20/day?

**ChatGPT suggested:** 40/day

**Cascade recommendation:** No. 20/day max to maintain quality and avoid spam perception.

**Founder decision required.**

---

## 12. Rejection Log

**Concepts from ChatGPT Thread 4 that were rejected:**

1. **"Perceived Ubiquity Engine"** — Violates Doc 01, Law 2 (Silence Is a Feature)
2. **40/day volume target** — Too aggressive, risks quality degradation
3. **"Psychological dominance layer"** — Language feels manipulative, not infrastructure
4. **Aggressive expansion framing** — MenuList is infrastructure, not growth-hacked SaaS

**Reframed as:**
- Behavioral anchoring (Doc 15, Phase 0)
- Physical dependency creation (Doc 15, Rule 4)
- Deterministic execution infrastructure

---

## 13. Related Documentation

**Existing docs:**
- `__docs__/constitution/15-category-dominance-doctrine.md` — Strategic positioning
- `__docs__/constitution/17-infrastructure-compounding-doctrine.md` — Bandwidth allocation
- `__docs__/constitution/01-core-doctrine.md` — 10 Laws
- `__docs__/constitution/06-internal-tracking.md` — Allowed metrics

**New docs (if implementation approved):**
- Future implementation doc under `__docs__/distribution-infrastructure/` — Technical implementation
- Future Firebase/cost doc under `__docs__/distribution-infrastructure/` — Firestore schema, indexes, security rules

---

**Document Signature:** Product Specification (Draft)  
**Status:** Awaiting founder approval  
**Created:** March 1, 2026  
**Source:** ChatGPT Thread 4 → Cascade validation + MenuList constitutional alignment  
**Next Step:** Founder decision on implementation priority
