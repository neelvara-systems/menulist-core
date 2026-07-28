# Shared Data Files — Backend Mirror (Exact Copy)

## Rule: Copy-Paste As-Is from Frontend

These files are **exact copies** of `src/data/shared/` (frontend primary source).

Sibling imports inside this folder are allowed only when the frontend primary
source imports the matching sibling file from `src/data/shared/`. Do not import
app-only, frontend-only, Firebase, React, Next.js, DAL, or UI modules here.

### How to Update

1. Edit the file in `src/data/shared/` (frontend — PRIMARY SOURCE)
2. Copy-paste the **entire file** here (same filename)
3. Do NOT edit files here directly — always edit frontend first, then copy

### Country Data

`countryData.ts` is copied from `src/components/atoms/phoneNumberInput/countryData.ts`.

### File Mapping

| Backend (this folder) | Frontend (primary source) |
|---|---|
| `aiCreditScalarContract.ts` | `src/data/shared/aiCreditScalarContract.ts` |
| `answerlatticeEmbedding.ts` | `src/data/shared/answerlatticeEmbedding.ts` |
| `businessAttributeDefaults.ts` | `src/data/shared/businessAttributeDefaults.ts` |
| `businessAttributeInference.ts` | `src/data/shared/businessAttributeInference.ts` |
| `businessTypes.ts` | `src/data/shared/businessTypes.ts` |
| `categoryIconSuggestions.ts` | `src/data/shared/categoryIconSuggestions.ts` |
| `decisionBlockConfig.ts` | `src/data/shared/decisionBlockConfig.ts` |
| `defaultRoles.ts` | `src/data/shared/defaultRoles.ts` |
| `extractedBusinessProfile.ts` | `src/data/shared/extractedBusinessProfile.ts` |
| `founderMonitorPersistedBoundary.ts` | `src/data/shared/founderMonitorPersistedBoundary.ts` |
| `geminiRuntime.ts` | `src/data/shared/geminiRuntime.ts` |
| `menuDriftContribution.ts` | `src/data/shared/menuDriftContribution.ts` |
| `menuExtractionIntegrity.ts` | `src/data/shared/menuExtractionIntegrity.ts` |
| `menuExtractionJob.ts` | `src/data/shared/menuExtractionJob.ts` |
| `menuExtractionProjectSize.ts` | `src/data/shared/menuExtractionProjectSize.ts` |
| `menuIntakeIdentity.ts` | `src/data/shared/menuIntakeIdentity.ts` |
| `messagingReplacementUploads.ts` | `src/data/shared/messagingReplacementUploads.ts` |
| `ownerBusinessHealthQuestionSuggestions.ts` | `src/data/shared/ownerBusinessHealthQuestionSuggestions.ts` |
| `ownerControlUsageContract.ts` | `src/data/shared/ownerControlUsageContract.ts` |
| `ownerNotificationDeliveryBoundary.ts` | `src/data/shared/ownerNotificationDeliveryBoundary.ts` |
| `ownerNotificationRegistry.ts` | `src/data/shared/ownerNotificationRegistry.ts` |
| `platformCounterBoundary.ts` | `src/data/shared/platformCounterBoundary.ts` |
| `platformNotificationRegistry.ts` | `src/data/shared/platformNotificationRegistry.ts` |
| `publicMenuDraftData.ts` | `src/data/shared/publicMenuDraftData.ts` |
| `specialMenuSchedule.ts` | `src/data/shared/specialMenuSchedule.ts` |
| `storeSummaryBoundary.ts` | `src/data/shared/storeSummaryBoundary.ts` |
| `countryData.ts` | `src/components/atoms/phoneNumberInput/countryData.ts` |

### Verification

After copying, run the mirror verifier for the affected feature and then:

```bash
npm --prefix functions run build
npx tsc --noEmit --incremental false
```

All files must remain byte-identical to their listed primary source and compile
without errors on both sides.
