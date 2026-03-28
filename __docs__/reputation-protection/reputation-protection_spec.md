# Reputation Protection — Spec

**Status:** Draft  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** CEO, PM, Clients (non-technical)  
**Pillar:** 3 of 6 — Customer-Facing Infrastructure

---

## Executive Summary

**What:** A reputation stability layer that ingests Google reviews, classifies risk, and helps owners reply calmly — all from within MenuList.

**Why:** 88% of consumers read reviews before selecting a business. 4+ negative reviews deter 70% of potential customers. Owners either panic, ignore, or reply emotionally to reviews. MenuList provides calm, professional protection.

**For whom:** Every MenuList business with a Google Business Profile.

**Impact:** When owners handle reputation from MenuList, it becomes their control center for public perception. Emotional dependency + functional dependency = deep lock-in.

---

## Goals & Success Metrics

| Goal | Success Metric |
|------|---------------|
| Owner never discovers bad reviews late | Review surfaced within 24h of posting |
| Owner replies calmly and professionally | AI-assisted replies maintain consistent tone |
| Reputation issues detected early | Negative spike alert before rating drops |
| Owner manages reviews from MenuList | 80%+ of replies happen inside MenuList |

---

## Scope

### In-Scope

- Google Reviews ingestion (nightly sync when API approved)
- Review classification (benign → silence, negative → surface)
- Unified review inbox (reviews needing attention only)
- AI reply suggestions (Gemini-powered, owner approves before posting)
- Reply posting via GBP API (owner-initiated)
- Reputation status signal (Stable / Needs Attention)
- Negative spike detection (calm alert)
- Multi-outlet review aggregation (for chains)
- Mobile review reply flow

### Out-of-Scope (Permanent)

- Multi-platform aggregation (Google only initially)
- Sentiment dashboards or analytics
- Rating trend charts
- Review marketing / "get more reviews" tools
- Auto-posted replies (no human review)
- Review gating (FTC violation)
- Social media posting tools
- Customer communication tools

---

## User Stories

### Story 1: New Review Surfaces

> As an **owner**, when a negative review appears on Google, MenuList shows me a calm notification: "A recent review may need attention." I tap it, see the review, and MenuList suggests a polite reply. I approve it with one tap.

### Story 2: Reputation Stable

> As an **owner**, I see "Reputation: Stable" in my dashboard. I don't need to do anything. No noise. Just reassurance.

### Story 3: AI Reply Assist

> As an **owner**, a customer left a detailed complaint. I don't know how to respond without sounding defensive. MenuList suggests: "Thank you for your feedback. We take this seriously and would like to make it right. Please reach out to us directly." I approve and it posts.

### Story 4: Chain Owner Reviews

> As a **chain owner** with 5 outlets, I see all reviews across locations in one inbox. I maintain consistent brand tone using MenuList's reply suggestions.

---

## Review Classification Logic

| Classification | Criteria | Owner Action |
|---------------|----------|-------------|
| **Benign** | 4-5 stars, positive text | SILENCE — owner sees nothing |
| **Informational** | 3 stars, neutral text | SILENCE — no action needed |
| **Needs Attention** | 1-2 stars, negative text | Surface in inbox with reply suggestion |
| **High Risk** | 1 star, specific complaints, potential viral | Surface with "Careful handling" flag |
| **Volatile** | Sudden multiple negatives | Calm alert: "Reputation needs attention" |

## AI Reply Assist Design

### How It Works
1. New review classified as "needs attention" or "high risk"
2. Gemini generates 1 suggested reply based on:
   - Review content
   - Business type
   - Reply tone guidelines (calm, professional, short)
3. Owner sees review + suggested reply
4. Owner options: **Use reply** / **Edit reply** / **Write myself**
5. Owner taps confirm → reply posts to Google via GBP API

### Reply Tone Guidelines (Locked)
- Always polite and professional
- Never defensive or argumentative
- Acknowledge the concern
- Offer to resolve privately
- Keep under 3 sentences
- Maintain brand consistency across outlets

### What AI NEVER Does
- ❌ Auto-post without owner review
- ❌ Generate defensive or argumentative replies
- ❌ Make promises the business can't keep
- ❌ Disclose internal business details
- ❌ Respond with marketing language

---

## Market Validation

| Statistic | Value | Source |
|-----------|-------|--------|
| Read reviews before selecting business | 88% | SocialPilot, BrightLocal 2025 |
| Trust reviews like personal recommendations | 88% | Podium 2025 |
| Only trust reviews from last 30 days | 73% | Sixth City Marketing 2025 |
| 4+ negative reviews deter customers | ~70% | LocaliQ 2025 |
| Reviews lift conversions | 15-20% | SocialPilot, WiserNotify |
| Positive profiles → revenue growth | Up to 8% | SocialPilot 2025 |
| Spend more with excellent reviews | 31% more | Podium 2025 |
| Patronize businesses that reply to ALL reviews | 89% | Reputation.com |

---

## Activation Timeline

| Phase | Trigger | Action |
|-------|---------|--------|
| **Now** | — | Docs complete, architecture designed |
| **GBP Approved** | Google grants API access | Enable review ingestion |
| **Testing** | Internal stores | Validate classification + reply assist |
| **Activation** | Confidence threshold met | Enable for all stores with GBP connected |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| GBP API never approved | Guest Feedback System acts as private firewall |
| AI suggests inappropriate reply | Owner MUST review before posting |
| Owners ignore review notifications | Calm persistence — not alarm, not silence |
| Review volume overwhelms owner | Only surface actionable reviews (needs attention + high risk) |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** February 19, 2026
