#!/usr/bin/env node

/**
 * Automated Verification Script for Admin Recycle Bin Feature
 * Run: node verify-recycle-bin.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFYING ADMIN RECYCLE BIN IMPLEMENTATION\n');

const checks = [];

// Helper function to check file content
function checkFileContains(filePath, searchStrings, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = searchStrings.map(str => {
      const isRegex = str instanceof RegExp;
      const found = isRegex ? str.test(content) : content.includes(str);
      return { str: isRegex ? str.toString() : str, found };
    });
    
    const allFound = results.every(r => r.found);
    checks.push({
      file: path.basename(filePath),
      description,
      status: allFound ? '✅' : '❌',
      details: results
    });
    return allFound;
  } catch (error) {
    checks.push({
      file: path.basename(filePath),
      description,
      status: '❌',
      error: error.message
    });
    return false;
  }
}

// 1. Check database queries
console.log('1️⃣  Checking database queries...');
checkFileContains(
  './src/database/tickets/index.ts',
  [
    'where("deleted", "==", false)',
    'includeDeleted',
    'export const restoreTicket',
  ],
  'Database queries filter deleted tickets'
);

// 2. Check type definition
console.log('2️⃣  Checking type definitions...');
checkFileContains(
  './src/types/supportTicket.ts',
  ['deleted?: boolean'],
  'SupportTicketType has deleted field'
);

// 3. Check admin UI components
console.log('3️⃣  Checking admin UI components...');
checkFileContains(
  './src/components/templates/platform/supportTickets/index.tsx',
  [
    'deletedTickets',
    'fetchDeletedTickets',
    /value:\s*['"]trash['"]/,
    'isTrashView={true}'
  ],
  'Admin UI has trash view'
);

// 4. Check table columns
console.log('4️⃣  Checking table columns...');
checkFileContains(
  './src/components/templates/platform/supportTickets/TicketTableColumns.tsx',
  [
    'onRestore',
    'handleRestore',
    'isTrashView',
    'LuRotateCcw'
  ],
  'Table columns support restore action'
);

// 5. Check PlatformTicketsView
console.log('5️⃣  Checking PlatformTicketsView...');
checkFileContains(
  './src/components/templates/platform/supportTickets/PlatformTicketsView.tsx',
  [
    'isTrashView',
    'handleRestore',
    'Restoring ticket'
  ],
  'PlatformTicketsView handles trash mode'
);

// 6. Check TicketFiltersBar
console.log('6️⃣  Checking TicketFiltersBar...');
checkFileContains(
  './src/components/templates/platform/supportTickets/TicketFiltersBar.tsx',
  [
    'isTrashView',
    'onNewTicket?',
    '!isTrashView && onNewTicket'
  ],
  'TicketFiltersBar hides create button in trash'
);

// Print results
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

let passCount = 0;
let failCount = 0;

checks.forEach((check, index) => {
  console.log(`${index + 1}. ${check.description}`);
  console.log(`   File: ${check.file}`);
  console.log(`   Status: ${check.status}`);
  
  if (check.error) {
    console.log(`   Error: ${check.error}`);
    failCount++;
  } else if (check.details) {
    const failed = check.details.filter(d => !d.found);
    if (failed.length > 0) {
      console.log(`   Missing: ${failed.map(f => f.str).join(', ')}`);
      failCount++;
    } else {
      passCount++;
    }
  }
  console.log('');
});

console.log('='.repeat(60));
console.log(`SUMMARY: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60) + '\n');

if (failCount === 0) {
  console.log('✅ ALL CHECKS PASSED - Ready for manual testing!\n');
  console.log('Next steps:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Open: http://localhost:3000');
  console.log('3. Navigate to Support Tickets (Admin Panel)');
  console.log('4. Follow test plan in: TICKET_RECYCLE_BIN_TEST_PLAN.md\n');
  process.exit(0);
} else {
  console.log('❌ SOME CHECKS FAILED - Review implementation\n');
  process.exit(1);
}
