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

## Adding New Verification Scripts

Follow this pattern:
1. Create a descriptive script name
2. Include clear documentation
3. Use consistent error reporting
4. Provide actionable next steps
