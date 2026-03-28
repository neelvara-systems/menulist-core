**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 6 — CUSTOMER-FACING EXPERIENCE & REAL-WORLD RELIABILITY AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase evaluates what **actual customers and end-users experience**.

Not developer view.
Not ideal conditions.

Real:

- Restaurants
- Cafes
- Salons
- Weak internet
- Cheap Android phones
- QR scans
- Busy hours

If customer-facing layer feels unreliable → product dies regardless of backend quality.

You must audit like:
**A real paying SMB customer + their end customers.**

---

# PRIMARY OBJECTIVE

Validate that all customer-facing surfaces are:

- Fast
- Reliable
- Clear
- Always accessible
- Mobile-safe
- Low-network safe
- Error-safe
- Confusion-free

Customer must feel:
**This just works.**

---

# PART 1 — PUBLIC MENU ACCESSIBILITY TEST

Test public menu access via:

- QR open
- Direct link open
- WhatsApp shared link
- Google Business link scenario
- Repeat open

Check:

- Load speed (first load)
- Load speed (repeat load)
- Any blank screen risk
- Any partial load risk
- Any console errors
- Menu always loads?
- Any stuck state?
- Timeout behavior?

Goal:
Public menu must **never fail**.

---

# PART 2 — LOW NETWORK & BAD DEVICE TEST

Simulate:

- 3G/slow network
- Old Android device
- Weak WiFi
- Intermittent connection

Check:

- Menu load time
- Image load behavior
- Text loads before images?
- Screen freeze?
- Retry behavior?
- Loader clarity?
- Broken UI?

If menu fails on cheap phone → SMB loses trust.

---

# PART 3 — MENU CONTENT DISPLAY RELIABILITY

Test:

- Large menu (200+ items)
- Multiple categories
- Images present
- No images
- Multi-language
- Long descriptions
- Special characters
- Emojis removed properly

Check:

- Scroll performance
- Layout breaks?
- Overflow issues?
- Image distortion?
- Category collapse?
- Missing items?
- Language switch reliability?

Menu must always render clean.

---

# PART 4 — HOURS & STATUS DISPLAY

Verify:

- Open/closed badge accuracy
- Timezone correctness
- Midnight crossing logic
- Screen display consistency
- Public menu consistency
- Wrong status risk?

Test:
Edge times (opening/closing minute).

Wrong status = customer anger.

---

# PART 5 — DIGITAL SCREEN DISPLAY RELIABILITY

Audit screen mode:

- Menu board mode
- Highlights mode
- Auto-refresh logic
- Data sync timing
- Large menu behavior
- Network drop behavior
- Screen stuck risk
- Layout readability
- Font size clarity
- Image loading

Simulate:
Screen running full day in restaurant.

Must never:

- Freeze
- Go blank
- Show stale menu

---

# PART 6 — MULTI-LANGUAGE CUSTOMER VIEW

Test:

- Switch languages
- Menu loads correctly?
- Missing translations?
- Mixed languages?
- Layout breaks?
- Long text overflow?
- Default language fallback?

If language breaks → trust drops.

---

# PART 7 — IMAGE DELIVERY & PERFORMANCE

Audit:

- Image load speed
- Lazy loading?
- Broken image fallback?
- Large image handling?
- CDN usage?
- Multiple images impact?
- Slow network image behavior?

Images must not block menu readability.

---

# PART 8 — ZERO-FAIL PRINCIPLE TEST

Customer-facing system must never show:

- Blank screen
- Crash
- Raw error
- Console error affecting UI
- Broken layout
- Missing data without fallback

Test:
What user sees if:

- Firebase slow
- AI data missing
- Partial data
- Image missing

Must always show:
**Safe fallback UI**

---

# PART 8B — ACCESSIBILITY (a11y) AUDIT

Public menus are accessed by ALL customers including those with disabilities.

Test:

- Screen reader navigation on public menu
- Color contrast ratios (WCAG AA: 4.5:1 text, 3:1 large text)
- Keyboard-only navigation
- Focus indicators visible
- Alt text on all menu images
- Semantic HTML structure (headings, lists, landmarks)
- Touch target sizes (minimum 44x44px)
- Text scaling behavior (up to 200%)

If a visually impaired customer scans QR, can they navigate the menu?
If not, this is both a UX failure and potential legal risk.

---

# PART 8C — CORE WEB VITALS & LIGHTHOUSE

Run Lighthouse audit on public menu pages.

Measure:

- LCP (Largest Contentful Paint) — target < 2.5s
- FID/INP (First Input Delay / Interaction to Next Paint) — target < 200ms
- CLS (Cumulative Layout Shift) — target < 0.1
- Performance score — target > 80
- Accessibility score — target > 90
- Best practices score — target > 90
- SEO score — target > 90

Test on both:

- Fast network (4G+)
- Slow network (3G simulation)
- Mobile device emulation

Public menu pages represent your product to end-customers.
Poor Lighthouse scores = poor first impression.

---

# PART 9 — SHAREABILITY & REAL USE SCENARIOS

Simulate real SMB usage:

Customer scans QR at table
Customer opens from WhatsApp
Customer opens repeatedly
Customer opens during peak time
10 customers open together

Check:

- Speed
- Stability
- Any rate-limit block?
- Any caching failure?
- Any load inconsistency?

---

# PART 10 — DELIVERABLES

Create:

## `phase-06-customer-experience-audit-report.md`

Include:

### 1. PUBLIC MENU RELIABILITY

Always loads or not?

### 2. LOW-NETWORK PERFORMANCE

Real-world readiness.

### 3. MENU DISPLAY ISSUES

Layout/render risks.

### 4. SCREEN DISPLAY RISKS

Stability & readability.

### 5. MULTI-LANGUAGE RISKS

Break/confusion points.

### 6. IMAGE DELIVERY RISKS

Speed & failure handling.

### 7. ZERO-FAIL VIOLATIONS

Any blank/error scenarios.

### 8. REAL-WORLD SCENARIO TESTS

Peak usage simulation results.

### 9. MUST-FIX BEFORE LAUNCH

Customer-facing blockers.

### 10. PHASE VERDICT

Answer brutally:

If 100 customers scan QR in restaurant:

- Will menu always load?
- Any embarrassment risk?
- Biggest reliability fear?
- Confidence score /10?

---

# EXECUTION MODE

Think like:
Restaurant owner paying monthly.

If menu fails once in front of customers:
Trust gone.

This layer must feel:
**Calm, fast, inevitable.**

Return Phase 6 report only.
