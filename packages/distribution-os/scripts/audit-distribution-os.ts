import { runDistributionOsAudit } from './lib/distribution-os-ledger';

function getProductFilter(args: string[]): string | undefined {
    const index = args.indexOf('--product');
    if (index === -1) return undefined;
    return args[index + 1] || '__missing_product__';
}

const selectedProduct = getProductFilter(process.argv.slice(2));
const result = runDistributionOsAudit(selectedProduct);

console.log('DistributionOS registry audit');
if (selectedProduct) console.log(`Product view: ${selectedProduct}`);
console.log(`Products: ${result.productCount}`);
console.log(`Ledgers: ${result.ledgerCount}`);
console.log(`Entries: ${result.entryCount}`);

if (result.passed.length > 0) {
    console.log('\nPassed');
    for (const message of result.passed) console.log(`- ${message}`);
}

if (result.warnings.length > 0) {
    console.log('\nWarnings');
    for (const warning of result.warnings) console.log(`- ${warning}`);
}

if (result.errors.length > 0) {
    console.error('\nErrors');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
} else {
    console.log('\nRegistry integrity passed.');
    console.log('No research, publishing, outreach, provider, spend, or product execution was performed.');
}
