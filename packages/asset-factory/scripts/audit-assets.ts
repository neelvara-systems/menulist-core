#!/usr/bin/env ts-node

import { buildAuditReport, printAuditReport } from './lib/asset-audit';
import type { AssetBrand } from '../schemas/asset-schema';

const brandIndex = process.argv.indexOf('--brand');
const brand = brandIndex >= 0 ? process.argv[brandIndex + 1] : undefined;
if (brand && brand !== 'menulist' && brand !== 'answerlattice') {
  throw new Error(`Unsupported asset brand filter: ${brand}`);
}
const report = buildAuditReport({ brand: brand as AssetBrand | undefined });
if (brand) console.log(`Asset brand filter: ${brand}`);
printAuditReport(report);

if (report.errorCount > 0) {
  process.exit(1);
}
