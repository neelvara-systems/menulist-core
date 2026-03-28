**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 10 — PERFORMANCE, SPEED & PERCEPTION AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase determines whether MenuList **feels elite or slow**.

Speed is not just technical.
Speed = trust.
Speed = premium perception.
Speed = retention.

Even if system works perfectly —
if it feels slow → product feels weak.

You must audit like:
**A paying SMB owner with zero patience.**

---

# PRIMARY OBJECTIVE

Measure and evaluate:

- Real speed
- Perceived speed
- UI responsiveness
- Load performance
- Firebase latency impact
- AI latency perception
- Mobile performance
- Screen rendering speed

Goal:
MenuList must feel **instant, calm, and premium**.

Not heavy.
Not laggy.
Not confusing.

---

# PART 1 — DASHBOARD & EDITOR LOAD SPEED

Measure:

- Login → dashboard load time
- Dashboard → menu editor load
- Menu editor first render
- Large menu editor load (200+ items)
- Modal open speed
- Category switch speed
- Item edit modal speed

Check:

- Slow first paint?
- Data load blocking UI?
- Blank loading states?
- Skeletons missing?
- Lag on scroll?
- Lag on edit?

Owner must feel:
**Instant control**

---

# PART 2 — MENU SAVE & UPDATE SPEED

Test:

- Save item
- Save category
- Bulk changes
- Availability toggle
- Image selection
- Description generation save
- Translation save
- Publish menu

Check:

- Save delay?
- Double-click confusion?
- No feedback?
- Slow confirmation?
- UI freeze during save?

Owner must always know:
**Action completed successfully**

---

# PART 3 — AI RESPONSE LATENCY PERCEPTION

Test:

- Description generation time
- Bulk generation time
- Image generation time
- Translation generation time
- Regeneration time

Check:

- Loader clarity?
- Feels fast enough?
- Feels stuck?
- User anxiety?
- Multiple clicks due to delay?
- Can latency be perceived as failure?

Even if AI takes time,
system must feel controlled.

---

# PART 4 — PUBLIC MENU SPEED

Measure:

- First open speed
- Repeat open speed
- Image loading speed
- Category switch speed
- Multi-language switch speed
- Scroll performance
- Large menu performance

Test:

- Fast network
- Slow network
- Mid network

Public menu must feel:
**Instant and reliable**

---

# PART 5 — DIGITAL SCREEN PERFORMANCE

Test:

- Screen load speed
- Menu board render speed
- Highlights render speed
- Auto-refresh delay
- Large menu behavior
- Image heavy menu behavior
- Continuous running stability

Check:

- Lag?
- Frame drop?
- Late refresh?
- Memory buildup?
- Freeze risk?

Screens must run all day smoothly.

---

# PART 6 — FIREBASE LATENCY IMPACT

Observe:

- Reads delaying UI?
- Writes blocking UI?
- Listener delays?
- Data sync delays?
- Publish delay due to Firebase?

Check:
Can caching reduce perceived delay?

---

# PART 7 — MOBILE PERFORMANCE AUDIT

Simulate:

- Mid-range Android
- Low RAM device
- Mobile browser only
- Mobile editing
- Mobile public menu

Check:

- UI lag?
- Scroll lag?
- Tap delay?
- Input delay?
- Layout shift?
- Image load blocking?

Many SMBs operate fully on phone.

---

# PART 8 — PERCEIVED SPEED VS REAL SPEED

Evaluate perception:

Even if action takes 2–5 sec:
Does system:

- Feel fast?
- Show progress?
- Show feedback?
- Feel frozen?
- Cause uncertainty?

Speed perception > raw milliseconds.

---

# PART 8B — CORE WEB VITALS BENCHMARKS

Measure against Google's Core Web Vitals thresholds:

### Public Menu Pages (Customer-Facing)

- LCP < 2.5s (Good) / < 4.0s (Needs Improvement) / > 4.0s (Poor)
- INP < 200ms (Good) / < 500ms (Needs Improvement) / > 500ms (Poor)
- CLS < 0.1 (Good) / < 0.25 (Needs Improvement) / > 0.25 (Poor)

### Dashboard Pages (Owner-Facing)

- LCP < 3.0s (acceptable for authenticated pages)
- INP < 300ms
- CLS < 0.1

### SEO Meta Readiness (Public Pages Only)

- OG tags present (title, description, image)
- Structured data for menus (Schema.org Restaurant/Menu)
- Proper canonical URLs
- Mobile viewport meta tag
- Robots.txt and sitemap

Public menu pages are discoverable via Google Business and social sharing.
Missing meta = missed distribution opportunity.

---

# PART 9 — MICRO-LAG & FRICTION DETECTION

Look for:

- 300–800ms micro delays
- Modal open lag
- Button response delay
- Scroll stutter
- Animation stutter
- Input lag
- Loader confusion

These destroy premium feel silently.

---

# PART 10 — DELIVERABLES

Create:

## `phase-10-performance-speed-report.md`

Include:

### 1. DASHBOARD & EDITOR SPEED

Fast or sluggish?

### 2. SAVE & ACTION LATENCY

Confident or confusing?

### 3. AI LATENCY PERCEPTION

Acceptable or stressful?

### 4. PUBLIC MENU SPEED

Instant or risky?

### 5. SCREEN PERFORMANCE

Stable all-day or risky?

### 6. MOBILE PERFORMANCE

Smooth or frustrating?

### 7. FIREBASE LATENCY IMPACT

Visible to user?

### 8. MICRO-LAG FINDINGS

Hidden friction points.

### 9. MUST-FIX BEFORE LAUNCH

Performance blockers.

### 10. PHASE VERDICT

Answer brutally:

If premium SMB pays for this:

- Will it feel fast?
- Will it feel elite?
- Any “slow SaaS” perception risk?
- Confidence score /10?

---

# EXECUTION MODE

Speed = perception of quality.

Even perfect product feels cheap if slow.

MenuList must feel:
Calm
Instant
Professional
Premium

Find anything that breaks that illusion.

Return Phase 10 report only.
