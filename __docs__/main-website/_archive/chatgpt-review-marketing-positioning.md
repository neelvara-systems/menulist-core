# ChatGPT Review — Marketing Positioning & Conversion Architecture

**Date:** March 20, 2026  
**Reviewer:** Cascade  
**Source:** Multi-turn ChatGPT conversation about MenuList marketing strategy  
**Accuracy:** ~40% (most suggestions already exist in codebase/docs)

---

## Context

User shared a ChatGPT conversation covering:
1. Marketing positioning reframe ("accusation-based" marketing)
2. Landing page wireframe spec
3. Ad script templates
4. Distribution lock-in strategy
5. Post-publish funnel stitching

---

## Claim-by-Claim Validation

| # | ChatGPT Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | "Sell outcome, not mechanism" | ✅ ALREADY DONE | v2 hero: "Upload your menu. Your business is online." Content doc — outcome-first throughout |
| 2 | "Your menu is wrong in public. Fix it once." | ⚠️ PARTIAL | Problem section: "Business menus on the internet are broken." + "Businesses update menus. The internet doesn't." — sharper but exists |
| 3 | Accusation-based marketing | ✅ ALREADY DONE | Problem section tiles: outdated Google, wrong QR, old PDF, inconsistent pricing |
| 4 | "One link. Always correct." | ⚠️ PARTIAL | Our version: "One menu. Everywhere customers look." |
| 5 | Nokia chaos→clarity narrative | ✅ ALREADY DONE | Problem→Solution→Workflow section flow |
| 6 | Never say "AI-powered", "All-in-one" | ✅ ALREADY DONE | Language Governance doc 02 forbids all. v2 spec bans them |
| 7 | "Restaurant" everywhere | ❌ VIOLATES RULES | Pattern 10 Rule 2: "Business not restaurant." 60+ business types |
| 8 | Reality Check Flow (interactive checklist) | 🆕 VALID NEW | "Check your Google menu right now" inline checklist. Interesting UX |
| 9 | Chaos Visualization (real screenshots) | ⚠️ PARTIAL | Problem section has 6 abstract tiles. ChatGPT suggests actual screenshots |
| 10 | PONR Trigger Section | 🆕 VALID NEW | "This becomes your official menu link" commitment language |
| 11 | Distribution Lock-In checklist | ⚠️ PARTIAL | Use MenuList page + Menu Presence Monitor exist. Non-skippable post-publish checklist doesn't |
| 12 | GBP as highest leverage node | ✅ ALREADY KNOWN | GBP Sync built. OBP exists |
| 13 | WhatsApp dominance | ✅ ALREADY EXISTS | Messaging onboarding fully documented + implemented |
| 14 | QR Replacement | ✅ ALREADY EXISTS | Launch Kit generates QR sticker, table tent, counter card |
| 15 | Smart Nudge System (24h/3d/7d) | 🆕 VALID NEW | Post-publish distribution-completion nudges don't exist yet |
| 16 | Anti-Churn tracking | ⚠️ PARTIAL | Menu Presence Monitor tracks surfaces but not as churn metric |
| 17 | "% who replace 2+ surfaces" as activation metric | 🆕 VALID NEW | Good metric definition. Not currently tracked |
| 18 | Strip landing page to 6 sections | ❌ REJECT | Pattern 10 Rule 6: NEVER remove feature sections. 18+ competitive advantages ChatGPT is unaware of |
| 19 | Remove features from page | ❌ REJECT | ChatGPT has zero knowledge of Decision Blocks, MCE, Special Menus, Launch Kit, Digital Screens, schema.org, 9 languages, AI images/descriptions |
| 20 | Sticky CTA on scroll | 🆕 VALID NEW | Simple UX improvement |
| 21 | Dynamic CTA text change | ⚠️ OVER-ENGINEERING | Consistent CTA is better for our ICP |
| 22 | Ad script templates | 🆕 VALID NEW | 3 concrete ad formats |
| 23 | WhatsApp onboarding copy | ⚠️ PARTIAL | Already in messaging-onboarding docs |
| 24 | Micro copy replacements | ⚠️ PARTIAL | Some valid ("official menu link"), some violate Language Governance |
| 25 | Funnel stitching | ✅ ALREADY DOCUMENTED | Marketing playbook has this |
| 26 | "Distribution control layer" framing | ❌ DISAGREE | Identity = "Canonical Public Business Truth" not distribution tool |

---

## Summary

| Category | Count |
|---|---|
| ✅ Already done/exists | 10 |
| ⚠️ Partial (exists differently) | 8 |
| 🆕 Genuinely new + valid | 5 |
| ❌ Wrong/Reject | 3 |

### Items Adopted

1. **Ad script templates** → Added to marketing playbook
2. **PONR commitment language** → Added to FinalCta locale strings
3. **Sticky CTA on scroll** → Implemented in website
4. **Distribution nudge concept** → Added to marketing playbook
5. **Activation metric** → Added to marketing playbook

### Items Rejected

1. "Restaurant" everywhere — violates Pattern 10 Rule 2
2. Strip features from landing page — violates Pattern 10 Rule 6
3. "Distribution control layer" identity — contradicts established product identity
