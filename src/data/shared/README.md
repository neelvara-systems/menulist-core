# Shared Data Files — Frontend Primary Source

## Rule: Copy-Paste As-Is

These files are the **single source of truth** for data shared between the Next.js frontend and Firebase Cloud Functions backend.

### How It Works

1. **Frontend** (`src/data/shared/`) — PRIMARY SOURCE. All edits happen here.
2. **Backend** (`functions/src/sharedData/`) — EXACT MIRROR. Copy-paste entire files.

### When Updating

1. Edit the file in `src/data/shared/`
2. Copy-paste the **entire file** to `functions/src/sharedData/` (same filename)
3. Do NOT cherry-pick changes — always replace the whole file

### Why Copy-Paste?

- Cloud Functions cannot import from `src/` (different build context)
- Keeping files identical avoids data drift, mismatched constants, and subtle bugs
- Full file copy is simpler and safer than cross-checking individual values

### Shared-Only Dependency Rule

Every file in this folder **MUST** stay portable across frontend and Functions:
- Sibling imports inside `src/data/shared/` are allowed when they prevent duplicated source-of-truth data.
- No imports from app-specific project files (no `@constant/`, `@type/`, React, Next.js, DAL, Firebase, or UI modules).
- Only standard TypeScript — no React, Next.js, or framework-specific code
- Shared types should be defined in the same file or imported from a sibling shared-data file that is also mirrored to Functions.

### Files

| File | Contents | Used By |
|------|----------|---------|
| `businessTypes.ts` | BUSINESS_TYPES, BUSINESS_CATEGORIES, category-level schema/catalog/offering defaults, type-level overrides, business-category helpers, FILTER_ALLOWLIST | Publish pipeline, approve route, AI prompts, public schema |
| `businessAttributeInference.ts` | Business attribute suggestion allowlist and category-to-kind helper | Extraction, publish pipeline, health signals |
| `categoryIconSuggestions.ts` | Category icon suggestions by canonical business category | Menu category editor and repair flows |
| `defaultRoles.ts` | Role permissions, DEFAULT_ROLE_METADATA, createDefaultRoles | Store creation (onboarding, publish) |
| `extractedBusinessProfile.ts` | Extracted profile suggestion contract and normalization helpers | Menu extraction and messaging onboarding |
| `ownerBusinessHealthQuestionSuggestions.ts` | Business Health starter/follow-up question catalog and ranking helper | Owner Business Assistant app APIs and Cloud Functions health builder |

### Country Data

Country data lives at `src/components/atoms/phoneNumberInput/countryData.ts` (already self-contained).
It is copied to `functions/src/sharedData/countryData.ts` following the same copy-paste rule.
