# Shared Data Files — Backend Mirror (Exact Copy)

## Rule: Copy-Paste As-Is from Frontend

These files are **exact copies** of `src/data/shared/` (frontend primary source).

### How to Update

1. Edit the file in `src/data/shared/` (frontend — PRIMARY SOURCE)
2. Copy-paste the **entire file** here (same filename)
3. Do NOT edit files here directly — always edit frontend first, then copy

### Country Data

`countryData.ts` is copied from `src/components/atoms/phoneNumberInput/countryData.ts`.

### File Mapping

| Backend (this folder) | Frontend (primary source) |
|---|---|
| `businessTypes.ts` | `src/data/shared/businessTypes.ts` |
| `businessAttributeInference.ts` | `src/data/shared/businessAttributeInference.ts` |
| `defaultRoles.ts` | `src/data/shared/defaultRoles.ts` |
| `countryData.ts` | `src/components/atoms/phoneNumberInput/countryData.ts` |

### Verification

After copying, run: `cd functions && npx tsc --noEmit`
All files must compile without errors on both sides.
