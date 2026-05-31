#!/usr/bin/env ts-node

import { buildAuditReport, printAuditReport } from './lib/asset-audit';

const report = buildAuditReport();
printAuditReport(report);

if (report.errorCount > 0) {
  process.exit(1);
}

