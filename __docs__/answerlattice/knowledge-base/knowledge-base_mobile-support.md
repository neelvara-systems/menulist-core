# Knowledge Base — Mobile Support Assessment

> **Version:** 1.0.1
> **Last Updated:** 2026-07-13
> **Audience:** Mobile team, Product

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | Occasionally — owners browse KB when they need help | ⚠️ Partial |
| **Speed** | Completes in <5 seconds? | Category load: instant (cached). Article read: instant | ✅ |
| **Touch** | Works with thumb-only? | Category cards, article list, scrolling — thumb-friendly | ✅ |
| **Value** | Needed away from desk? | Sometimes — owner might want to read a help article while on the floor | ⚠️ Partial |

**Result: 2 FULL PASS + 2 PARTIAL → Mobile UI is RECOMMENDED but not mandatory**

The AI QnA Chatbot (which uses KB articles) is the primary mobile use case. Direct KB browsing is secondary — most mobile users will search via AI chat rather than browse categories manually.

---

## 2. Current Mobile Implementation

- No dedicated mobile KB screen exists
- Desktop `KnowledgeBaseExplorer` is responsive (sidebar/on-this-page hidden below `lg` breakpoint)
- Content area works reasonably well on mobile already (single column layout)

---

## 3. Mobile Screens Needed (If Built)

| Screen | Priority | Complexity | Description |
|--------|:--------:|:----------:|-------------|
| **Category List** | P1 | Low | Simple card grid (already responsive) |
| **Section List** | P1 | Low | List within category |
| **Article View** | P1 | Medium | Full article rendering with TipTap content (needs mobile-optimized rendering) |

---

## 4. Mobile Architecture Rules

- **DAL:** Same `src/database/knowledgeBase/` functions
- **Cache:** Same `PlatformGlobalDataContext.cachedKBCategories`
- **Types:** Same `src/types/knowledgeBase.ts`
- **UI:** antd-mobile components
- **Icons:** react-icons/lu (Lucide) only

---

## 5. Platform Admin on Mobile

**Updated 2026-05-19:** KB management is now exposed to `PLATFORM` users from MenuList Mobile More -> Answerlattice -> Knowledge Base.

This does not create a separate mobile-only KB editor. The mobile shell mounts the same platform Knowledge Base template through `MobilePlatformInternalScreen` so the route remains a real product screen with category, section, article, search, and CRUD workflows.

Mobile support expectation:

- usable for emergency review and small edits;
- no horizontal page overflow;
- split panes stack vertically inside the mobile wrapper;
- modals and drawers fit the viewport;
- large content authoring remains better on desktop through the desktop-tools shortcut.

The Embedding 2 migration adds no separate mobile flow or navigation. The shared responsive article modal now derives “Search ready” from the active `embeddingV2` field, so desktop and mobile administration cannot report readiness from a legacy-only vector.
