# Verification Scripts

This directory contains automated verification scripts for MenuList features.

## Scripts

### verify-recycle-bin.js
Automated verification script for the Admin Recycle Bin feature in the support ticket system.

**Purpose:**
- Validates that soft-delete functionality is properly implemented
- Checks database queries, type definitions, UI components, and table columns
- Ensures trash view and restore actions work correctly

**Usage:**
```bash
cd scripts/verification
node verify-recycle-bin.js
```

**What it checks:**
1. Database queries filter deleted tickets
2. SupportTicketType has deleted field
3. Admin UI has trash view functionality
4. Table columns support restore actions
5. PlatformTicketsView handles trash mode
6. TicketFiltersBar hides create button in trash

**Output:**
- Pass/fail status for each check
- Summary of all verification results
- Next steps for manual testing

### verify-menu-export.js
Automated verification script for menu data export normalization and workbook generation.

**Purpose:**
- Validates duplicate ID handling and deterministic ordering
- Checks multilingual workbook row expansion
- Ensures missing flags/defaults are normalized safely
- Verifies attribute rows are exported for variant-based pricing

**Usage:**
```bash
npm run verify:menu-export
```

### verify-menu-extraction-pipeline.js
Automated contract verification for the centralized menu extraction pipeline.

**Purpose:**
- Confirms the app and Cloud Functions extraction job contract files are mirrored
- Checks owner job creation remains server-only and source lineage stays server-owned
- Verifies public create-menu uses durable jobs instead of inline extraction
- Checks link import, messaging onboarding, and the worker use the shared routing/limit contract

**Usage:**
```bash
npm run verify:menu-extraction-pipeline
```

### verify-menu-extraction-pipeline-dry-run.ts
Offline flow simulation for the centralized menu extraction pipeline.

**Purpose:**
- Builds sample owner upload, owner retry, public image, public link, authenticated link-import, and messaging onboarding jobs using the shared routing builders
- Checks destination labels, source lineage, skip-project-save behavior, Storage path shape, MIME compatibility, and cancellation rule restrictions
- Verifies messaging onboarding keeps HEIC/HEIF compatibility while dashboard/public uploads remain narrower

**Usage:**
```bash
npm run verify:menu-extraction-pipeline:dry-run
```

### verify-ai-accounting-hardening.js
Automated verification for AI operation logging, credit consumption, and cost registry guardrails.

**Purpose:**
- Confirms billable AI routes use the shared server-side accounting finalizer
- Ensures legacy client writes to `menulistAiOperations` are disabled
- Checks Firestore rules keep AI operation writes server/Admin-only
- Verifies every declared AI action has explicit unit-cost and real-cost entries
- Verifies owner transaction screens do not expose token/provider-cost internals and platform debug remains gated
- Verifies extraction monitor cost formatting uses paise-aware INR formatting

**Usage:**
```bash
npm run verify:ai-accounting
```

## Adding New Verification Scripts

Follow this pattern:
1. Create a descriptive script name
2. Include clear documentation
3. Use consistent error reporting
4. Provide actionable next steps
