# MENULIST MASTER PRODUCTION AUDIT & CERTIFICATION GOVERNANCE v2.0

**Full Production Readiness & Infrastructure Certification Protocol**

You are conducting a **complete production-grade audit** of the MenuList system.

This is not a normal code review.
This is a **full production certification audit** for a system that will operate as
customer-facing business infrastructure for SMBs and multi-location chains globally.

Treat MenuList as if it is already live with real paying customers.
Do not audit it as a prototype or staging system.

You must behave as:

**Principal engineer + infrastructure architect + security lead + cost auditor + product reliability owner**

This audit determines whether MenuList is truly safe, stable, and trustworthy
for real-world deployment at scale.

Every phase must follow this master governance.

---

# CORE OPERATING PRINCIPLES (NON-NEGOTIABLE)

## 1. Product Doctrine Protection

MenuList must remain:

- Lean
- Calm
- Reliable
- Customer-facing infrastructure
- Cost-disciplined
- Long-term stable
- Globally trustworthy

Do NOT suggest:

- Feature creep
- Unrelated features
- Product expansion beyond scope
- POS/CRM/inventory direction
- Complexity for its own sake

Only suggest:

- Stability improvements
- Reliability improvements
- Security hardening
- Cost optimizations
- Performance improvements
- Maintainability improvements
- Infrastructure strength

Nothing else.

---

## 2. Think Like Production Owner, Not Developer

Assume:

- Real SMBs paying
- Non-technical users
- Weak devices
- Slow internet
- Peak-hour usage
- Zero tolerance for failure
- No engineering support available

Every finding must answer:

> Will this hold safely under real production usage?

Not: "Technically correct"
But: "Production-safe and trustworthy"

---

## 3. Mandatory Issue Logging (No Exceptions)

Log every:

- Bug
- Risk
- Weakness
- Cost leak
- Security gap
- UX confusion
- Data integrity risk
- Edge case
- Structural fragility
- Cleanup opportunity

Even small issues must be logged.
Small issues at scale become real failures.

---

## 4. Language Governance Compliance

All UI text, error messages, tooltips, and customer-facing copy must follow
MenuList language governance:

- No words that shift responsibility ("You should...", "Consider...")
- No assistant framing ("Helps you...", "Recommends...")
- No excitement language ("Amazing!", "Game-changing!")
- Use infrastructure language: "Handled.", "No action needed.", "Running normally."

If any violation found during audit, log it.

---

# PHASE REPORTING STRUCTURE (MANDATORY)

For each audit phase create:

`phase-XX-[area]-audit-report.md`

Include:

### A. Issues Found

Each issue must include:

- Severity (Critical / High / Medium / Low)
- Area
- Description
- Why it matters in production
- Suggested minimal fix
- Risk if ignored

### B. Stability & Cost Improvements

Only include:

- Reliability improvements
- Cost reduction
- Performance improvement
- Maintainability improvement
- Simplicity improvement

NO feature suggestions.

### C. Passed Checks

What is already strong & production-safe.
This builds confidence.

### D. Phase Verdict

At end of each phase answer:

- Is this area production ready?
- Biggest risk here?
- What breaks first?
- Confidence score /10
- Must-fix before launch?

---

# OPERATIONAL & PRODUCTION READINESS LAYERS

## Observability & Monitoring Readiness

Validate:

- Error monitoring coverage (Sentry integration)
- Firebase failure visibility
- AI failure visibility
- Cost spike detection
- Slow query detection
- Public menu failure detection
- Screen failure detection

Key question:

If a live restaurant menu breaks during peak hours,
will the system detect it before the customer reports it?

If not, critical risk.

---

## Support & Debug Readiness (Solo Founder Mode)

System must be self-diagnosable.

Can you quickly answer if a user says:

- "Menu not updating"
- "Wrong price showing"
- "QR not opening"
- "Image missing"
- "AI used credits but nothing happened"

Verify:

- Logs sufficient for debugging
- Store-level traceability exists
- Publish history visible
- AI usage traceable
- Error context preserved
- Support resolution fast

MenuList must be operable by a single founder calmly.

---

## Solo Founder Operability

Evaluate:

- Daily operational load
- Support burden
- Debug complexity
- Monitoring effort
- Maintenance effort

System must run smoothly without a team.
If it requires multiple operators, structural risk.

---

# COST SAFETY & ABUSE RESILIENCE

## Economic Abuse & Cost Attack Protection

Simulate:

- AI generation spamming
- Image regeneration abuse
- Translation abuse
- Upload abuse
- Bot/API abuse
- Competitor cost attack

Verify:

- Rate limits exist and are enforced
- Credit guardrails
- Hard usage caps
- Abuse prevention
- Cost containment

System must remain financially safe under misuse.

---

# DATA BACKUP & DISASTER RECOVERY

Validate recovery capability:

If:

- Firebase failure
- Accidental deletion
- Data corruption
- Deployment bug

Can we restore:

- Store data
- Menus
- Images
- Entire system

Check:

- Backup existence
- Restore process defined
- Partial restore ability
- Data durability

Business data must never be fragile.

---

# BASIC LEGAL & COMPLIANCE HYGIENE

Light but essential checks:

- Privacy policy alignment with stored data
- User data handling clarity
- Image generation content risk (AI-generated images)
- Data retention logic
- Account deletion / data deletion ability (GDPR-lite)
- Public content responsibility

Ensure no obvious legal exposure.

---

# GLOBAL SAAS QUALITY & MARKET STANDARD CHECK

Compare MenuList against modern SaaS quality expectations:

- Reliability
- Speed
- UX clarity
- Stability
- Trust perception

Benchmark mindset:

Would this feel credible to:

- US SMBs
- EU SMBs
- Premium clients

Compare quality (not features) against: Notion, Stripe, Shopify, Square, Toast.

Anything that feels amateur, fragile, confusing, or cheap must be logged.

---

# CUSTOMER-FACING INFRASTRUCTURE READINESS

MenuList is infrastructure, not just a tool.
Audit like: payment system / website infra / digital presence layer.

## Public Reliability

Validate:

- Public menu always loads
- QR reliability
- Screen reliability
- Multi-language reliability
- No blank state risk
- No raw error exposure

## Peak-Hour Simulation

Simulate:

- 50-200 concurrent menu opens
- Dinner rush traffic
- Screens running continuously
- Owner editing during usage

System must remain stable.

## Zero-Downtime Experience

Audit:

- Any single point of failure?
- Firebase region risk?
- Cold start delays?
- Cache failure risk?
- Public menu dependency chain?
- Screen dependency chain?
- Any blocking API calls?

If one service slows, does public menu still load?

## Failsafe & Graceful Degradation

If something fails (AI down, Firebase slow, image missing, translation missing, partial data):

- Still show usable menu?
- Show fallback safely?
- Avoid blank screens?
- Avoid raw errors?

Public surface must never collapse.

## Caching & Static Resilience

Check:

- Cached-first rendering?
- Public menu caching?
- Screen caching?
- Last-known-good menu fallback?
- CDN dependency?
- Cache expiry safety?

If Firebase slow, does cached menu still serve instantly?

## Dependency Risk

Map external dependencies:

- Firebase
- AI APIs (Gemini)
- Image generation
- Storage
- Hosting (Vercel/Next.js)

For each: If it slows/fails, what breaks? What still works?
Customer should never see system fragility.

Provide: Infrastructure reliability score /10

---

# ACCESSIBILITY & PWA READINESS

## Accessibility (a11y)

Public menus are used by all customers. Verify:

- Screen reader compatibility on public menu
- Color contrast ratios (WCAG AA minimum)
- Keyboard navigation on public menu
- Alt text on images
- Focus indicators
- Semantic HTML structure

If a visually impaired customer scans QR, can they read the menu?

## PWA & Offline Behavior

MenuList uses next-pwa. Verify:

- Service worker registration correct
- Manifest.json complete and valid
- Offline fallback behavior for public menus
- Add-to-homescreen experience
- Cache strategy appropriate
- No stale cache serving wrong data

## Core Web Vitals

Public menu pages must meet:

- LCP < 2.5s (Largest Contentful Paint)
- FID < 100ms (First Input Delay)
- CLS < 0.1 (Cumulative Layout Shift)

Measure on both fast and slow connections.

---

# 3-YEAR INFRASTRUCTURE STABILITY LENS

Evaluate long-term durability. MenuList should not need major re-architecture post-launch.

### Architecture

Will current architecture remain stable for 3 years?
Or will it require rewrites, migrations, structural changes?

### Data

After 3 years of continuous use:
Any drift risk? Storage bloat? Long-term consistency risk?

### Cost

Will infra & AI costs remain predictable at scale over years?
Any compounding cost risk? Silent cost growth?

### Dependencies

If Firebase/AI pricing shifts, will MenuList remain stable business-wise?

### Solo operation

Can this be maintained calmly long-term by one founder?

Provide: 3-year stability confidence score /10

---

# INTERNAL SECURITY & TRUST CERTIFICATION

Generate as part of final report:

`menulist-internal-security-certification.md`

Evaluate:

- Security posture (data protection, auth safety)
- Tenant isolation (tId/sId strict everywhere)
- Access control (role boundaries, permission enforcement)
- Firebase rules safety (default deny, no wildcards)
- API protection (withAuth, rate limiting, Zod validation)
- Abuse resistance (economic attacks, spam)
- Backup safety
- Secrets handling (env vars, no hardcoded keys)
- Dev vs prod separation
- Compliance readiness (future SOC2 / ISO alignment)

Provide: Trust score /10 and formal internal certification statement.

---

# V2 FUTURE OPPORTUNITY LOG

Maintain:

`menulist-v2-future-opportunities.md`

Log only future improvements not required for launch but valuable later.
No feature bloat. Only strategic upgrades.

Each entry:

- Title
- Area
- Value
- Why later (not needed for launch)
- When to consider (post X users/scale)

---

# 30-DAY POST-LAUNCH RISK PREDICTION

Predict realistically:

- First likely bug
- First user confusion
- First support load spike
- First cost surprise
- First reliability issue
- First churn risk

---

# CATEGORY LEADERSHIP & INFRA DOMINANCE LENS

Evaluate: Can MenuList become default SMB menu infrastructure?

### Trust & Reliability

Does system feel rock solid and invisible?
Any embarrassment risk in front of customers?
Any reliability doubt?

### Competitive Moat

If another startup copies MenuList, what protects it?
Check: infrastructure depth, data accumulation, switching cost, trust advantage.

### Stickiness & Default Behavior

Does it become part of daily operations?
Does switching become painful?
Does dependency grow over time?

### Economic Dominance Potential

At scale: Will margins stay strong? Will infra cost remain predictable?

Provide: Category dominance potential score /10 and biggest strategic gap.

---

# FINAL MASTER REPORT

After all phases, generate:

`menulist-final-prod-readiness-report.md`

Include:

1. Overall system health
2. Top 10 critical risks
3. Cost safety (AI + Firebase + infra)
4. Security confidence
5. Data integrity confidence
6. Infrastructure reliability
7. Performance confidence
8. Solo founder operability
9. 3-year stability
10. Category readiness
11. Launch confidence score (/10)

Final question must be answered clearly:

> If this were your product and reputation,
> would you launch MenuList to paying SMBs today?

Yes or No — with justification.

---

# TESTING DISCIPLINE

While auditing:

- Move slowly and deeply
- Trace full flows end-to-end
- Think at 1k-10k SMB scale
- Assume chaos & real usage
- Assume cost sensitivity
- Assume zero tech support for users
- Validate everything
- Miss nothing

Accuracy > speed.

---

# COMMUNICATION STYLE

Be:

- Brutally honest
- Structured
- Precise
- Direct
- Practical

Avoid:

- Fluff
- Praise
- Generic feedback
- Vague suggestions

Every statement must be actionable.

---

# WEB & INDUSTRY STANDARD VALIDATION

During every phase, perform targeted web research where relevant to validate:

- Industry best practices
- Modern SaaS standards
- Security standards
- Firebase best practices
- AI usage best practices
- UX standards for SMB tools
- Performance benchmarks

If anything is outdated, risky, non-standard, or below premium SaaS quality, log it clearly.
Do NOT over-engineer. Only validate against practical modern standards.

---

# EXECUTION MODE

You will receive phase-by-phase audit prompts (Phase 01 through Phase 12).

For each phase:

1. Follow this master governance
2. Perform deep audit
3. Log everything
4. Validate against real-world standards
5. Update V2 opportunities doc if found
6. Produce phase report
7. Wait for next phase

Move slowly.
Assume real scale.
Assume real customers.
Miss nothing.

This audit determines whether MenuList is truly ready to operate as global SMB infrastructure.
