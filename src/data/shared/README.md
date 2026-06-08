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

### Self-Contained Rule

Every file in this folder **MUST** be self-contained:
- No imports from other project files (no `@constant/`, `@data/`, `@type/` etc.)
- Only standard TypeScript — no React, Next.js, or framework-specific code
- All types must be defined inline within the file

### Files

| File | Contents | Used By |
|------|----------|---------|
| `businessTypes.ts` | BUSINESS_TYPES, BUSINESS_CATEGORIES, category-level schema/catalog/offering defaults, type-level overrides, business-category helpers, FILTER_ALLOWLIST | Publish pipeline, approve route, AI prompts, public schema |
| `defaultRoles.ts` | Role permissions, DEFAULT_ROLE_METADATA, createDefaultRoles | Store creation (onboarding, publish) |
| `ownerBusinessHealthQuestionSuggestions.ts` | Business Health starter/follow-up question catalog and ranking helper | Owner Business Assistant app APIs and Cloud Functions health builder |

### Country Data

Country data lives at `src/components/atoms/phoneNumberInput/countryData.ts` (already self-contained).
It is copied to `functions/src/sharedData/countryData.ts` following the same copy-paste rule.
