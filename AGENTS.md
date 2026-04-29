# AGENTS.md — Persistent Brain + Execution System

**Version:** 2.0  
**Status:** 🔒 CRITICAL — SYSTEM AUTHORITY  
**Last Updated:** April 2026

---

# 0. CORE DIRECTIVE (HIGHEST PRIORITY)

This is not a feature product.  
This is **infrastructure**.

All actions must optimize for:

- Authority (source of truth)
- Inevitability (default adoption)
- Simplicity (zero cognitive load)
- Cost discipline (Firebase-aware)
- System permanence (not speed)

If any task violates this → **REJECT or REDESIGN**

---

# 1. PRODUCT IDENTITY (LOCKED)

## MenuList

- Canonical **customer-facing business truth layer**
- Owns:
  - Menu (structured)
  - Hours
  - Public identity
  - OBP (Official Business Page)
  - Presence layer (QR, PWA)
- Does NOT own:
  - POS
  - Inventory
  - CRM
  - Payroll
  - Internal tools

Strict boundary: **customer-facing layer only**

---

## System Separation (NON-NEGOTIABLE)

- MenuList → Truth Layer
- SurfaceOS → Distribution Control
- GrowthOS → Execution Engine
- VisualMeta → Content Preparation

No overlap. No shared logic.

---

# 2. ARCHITECTURE TRUTHS (IMMUTABLE)

## Entity Model

Tenant → Store → Project

## Public Routing

- `/` → OBP (root identity)
- `/{outletSlug}` → Outlet OBP
- `/{projectSlug}` or `/{outletSlug}/{projectSlug}` → Menu

Rules:

- OBP is always root (never redirect to menu)
- Slugs = lookup only
- IDs = identity (immutable)
- Max 3 reads per request
- No fanout queries

---

## QR System

- Permanent (never break)
- Types:
  - Business QR
  - Store QR
  - Project QR

---

# 3. PRODUCT PHILOSOPHY FILTERS

Apply BEFORE any implementation:

## 3.1 Authority Filter

Does this strengthen MenuList as the **source of truth**?
If no → reject

## 3.2 Simplicity Filter

Does this reduce user thinking?
If no → reject

## 3.3 Surface Discipline

Reject if it introduces:

- dashboards
- analytics noise
- configuration complexity

## 3.4 Silent Infrastructure Bias

Prefer:

- automatic systems
- background intelligence
- no user interaction

Avoid:

- toggles
- settings
- multi-step flows

---

# 4. HARD REJECTION RULES

DO NOT BUILD:

- Analytics dashboards (unless infrastructure-critical)
- Marketing tools inside MenuList
- CMS-style editors
- Multi-step onboarding flows
- Feature-heavy UI panels
- “All-in-one SaaS” patterns

If detected → STOP immediately

---

# 5. TECHNOLOGY & STACK (FROZEN)

- Next.js 14.2.5 (no upgrades)
- TypeScript (strict)
- Firebase (Firestore, Functions, Auth)
- Redux Toolkit + Persist
- NextAuth.js

---

# 6. DATA & FIREBASE RULES

## Principles

- Every read/write has cost
- Optimize reads > writes
- Prefer flat structures
- No unnecessary collections

## Rules

- Batch writes
- Avoid chained queries
- Cache when safe
- No redundant fetches

---

# 7. MENU SYSTEM (CRITICAL INFRASTRUCTURE)

Menu is **structured data**, not content.

Rules:

- No free-form structure
- No duplication unless explicit override
- Every change traceable (MOL)
- Consistent schema enforced

Never:

- Treat menu as CMS
- Allow schema drift

---

# 8. MCE (MENU CORRECTNESS ENGINE)

- Deterministic validation only
- Runs pre-publish
- Must be:
  - O(1) or bounded
  - zero/near-zero cost

No:

- AI validation
- extra collections

---

# 9. OBP (OFFICIAL BUSINESS PAGE)

- Single-page identity layer
- Minimal editable fields
- No customization system

Purpose:

- canonical public link
- distribution anchor (GBP, QR)

---

# 10. DEVELOPMENT RULES

## Before Coding

Ask:

- Should this exist?
- Does it increase authority?
- Is this the simplest version?

## During Coding

- Prefer deletion over addition
- Avoid abstraction unless necessary
- Reduce moving parts

## Output

- Production-ready code only
- No verbose explanations
- No generic comments

---

# 11. MOBILE SYSTEM (MANDATORY)

- Every feature must support mobile
- Use:
  - antd-mobile
  - Tailwind CSS
- Touch-first UX
- Optimistic updates required

---

# 12. SECURITY RULES

- Zod validation at boundaries
- DOMPurify for user input
- Strict auth context (NextAuth)
- Minimize data exposure

Never compromise for speed

---

# 13. PERFORMANCE RULES

- Maximize read efficiency
- Optimize bundle size
- Lazy load aggressively
- Prevent memory leaks
- Mobile performance first

---

# 14. COST DISCIPLINE

- Firebase cost = core constraint
- Reads are most expensive
- Batch operations always preferred
- Avoid real-time unless critical

Every feature must justify cost

---

# 15. DOCUMENTATION SYSTEM

Mandatory 7-doc structure:

- spec
- implementation
- marketing
- website
- helpdoc
- firebase
- README

Rules:

- No vague claims
- Must map to actual code
- No “AI-powered” language

---

# 16. CRITICAL GOTCHAS

- Use ONLY `react-icons/lu`
- No dependency upgrades
- Feature flags required
- Type check must pass:
  - `npx tsc --noEmit`

---

# 17. DECISION HIERARCHY

1. Constitution (highest)
2. Architecture rules
3. Security rules
4. Feature docs
5. Existing code

Always follow in order

---

# 18. COMMUNICATION MODE

Use:

- Direct, factual statements
- No fluff
- No marketing tone

Preferred phrases:

- "No action needed."
- "This is set."
- "Handled automatically."
- "Menu state is stable."

---

# 19. FOUNDER CONSTRAINT

- Solo execution only
- No team assumptions
- No operational complexity
- No maintenance-heavy systems

---

# 20. FINAL RULE

Do not optimize for:

- speed
- feature count

Optimize for:

- inevitability
- authority
- permanence
