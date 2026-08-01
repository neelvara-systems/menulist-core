import { runSecurityOsAudit } from './lib/security-os-audit';

function getProductFilter(args: string[]): string | undefined {
    const productIndex = args.indexOf('--product');
    if (productIndex === -1) return undefined;
    return args[productIndex + 1] || '__missing_product__';
}

const selectedProduct = getProductFilter(process.argv.slice(2));
const result = runSecurityOsAudit(selectedProduct);

console.log('SecurityOS registry audit');
if (selectedProduct) console.log(`Product view: ${selectedProduct}`);
console.log(`Products: ${result.productCount}`);
console.log(`Surfaces: ${result.surfaceCount}`);
console.log(`Evidence entries: ${result.evidenceCount}`);
console.log(`Evidence bundles: ${result.bundleCount}`);

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
    console.log('No mapped security verifier was executed by this command; every surface remains not-run until its evidence command is run and reviewed.');
}
