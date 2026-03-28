# Multi-Chain Permissions — Product Specification

**Feature:** #4B — Multi-Chain Permissions  
**Status:** 📋 SPEC LOCK  
**Date:** January 26, 2026  
**ICP:** Premium SMB Groups (2–10 stores)

---

## Executive Summary

Two-level access control:

1. **Store-Level:** What features each outlet can access
2. **Staff-Level:** What each user can do in their store

**Promise:** HQ controls guardrails. Outlets work within them. No micromanagement.

---

## The 3 Permission Categories

| Category           | Why Gate             | Examples                         |
| ------------------ | -------------------- | -------------------------------- |
| **💰 Expensive**   | AI costs money       | Extraction, Images, Descriptions |
| **🎨 Brand-Risky** | Breaks consistency   | Theme, Layout, Logo              |
| **🏗️ Structural**  | Changes architecture | Local Categories                 |

---

## Store-Level Permissions (7 Flags)

| Permission                 | Category | Default | Description       |
| -------------------------- | -------- | ------- | ----------------- |
| `canUseMenuExtraction`     | 💰       | `false` | Run AI extraction |
| `canGenerateDescriptions`  | 💰       | `true`  | AI descriptions   |
| `canGenerateImages`        | 💰       | `false` | AI images         |
| `canOverrideTheme`         | 🎨       | `false` | Colors/fonts      |
| `canOverrideBrandIdentity` | 🎨       | `false` | Logo/brand images |
| `canOverrideLayout`        | 🎨       | `false` | UI layout         |
| `canAddLocalCategories`    | 🏗️       | `false` | New categories    |

### Always Allowed (NOT Gated)

Per FR-5: Price, availability, active, order, local items, best sellers, prep time, language visibility.

**Language Note:** "Language visibility" means outlets can enable/disable languages from master's `activeLanguages` list. Outlets CANNOT create new languages — see `multi-language-translation_spec.md` → "Multi-Chain Language Governance".

---

## Staff-Level Roles (2 Roles)

### HQ_ADMIN

- **Scope:** All stores
- **Can:** Edit master, link/unlink, configure permissions, manage staff, all actions

### STORE_MANAGER

- **Scope:** Assigned store only
- **Can:** Override prices, add local items, use AI tools (if store permits)
- **Cannot:** Edit master, link/unlink, configure permissions, manage staff

---

## Access Check Rule

```
ALLOWED = store.permissions[action] AND role.capabilities[action]
```

Both must pass. Either failing = silently blocked.

---

## Enforcement Points

| Layer               | What Happens              |
| ------------------- | ------------------------- |
| **UI**              | Features hidden/disabled  |
| **API**             | Actions rejected silently |
| **Firestore Rules** | Writes blocked            |

---

## Doctrine Alignment

| Doctrine Rule            | How We Comply                              |
| ------------------------ | ------------------------------------------ |
| Law 6: No Cognitive Load | Only 2 roles, 7 permissions                |
| No Approval Workflows    | Silent enforcement, no `canPublishChanges` |
| Silence Is a Feature     | No "permission denied" explanations        |

---

## Out of Scope

- Custom roles (cognitive load)
- Per-staff overrides (over-engineering)
- Approval workflows (spec forbids)
- CONTENT_EDITOR role (defer P1)
- Granular override permissions (FR-5 allows all)

---

**DOCUMENT STATUS:** 📋 SPEC LOCK  
**NEXT:** Implementation per \_impl.md
