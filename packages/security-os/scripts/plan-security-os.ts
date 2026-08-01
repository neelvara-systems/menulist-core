import { getSecurityOsBundlePlan, listSecurityOsBundles } from './lib/security-os-plan';

function getArgument(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);
    if (index === -1) return undefined;
    return args[index + 1] || `__missing_${name.replace(/^--/, '')}__`;
}

const args = process.argv.slice(2);
const bundleId = getArgument(args, '--bundle');
const product = getArgument(args, '--product');

try {
    if (!bundleId) {
        const bundles = listSecurityOsBundles(product);
        console.log('SecurityOS evidence bundles');
        if (product) console.log(`Product view: ${product}`);
        for (const bundle of bundles) {
            console.log(`- ${bundle.id}: ${bundle.title} (${bundle.evidenceIds.length} evidence entries)`);
        }
        console.log('\nUse --bundle <bundle-id> to print a read-only evidence plan.');
    } else {
        const plan = getSecurityOsBundlePlan(bundleId, product);
        console.log(`SecurityOS evidence plan: ${plan.bundle.title}`);
        console.log(`Bundle: ${plan.bundle.id}`);
        console.log(`Products: ${plan.bundle.products.join(', ')}`);
        console.log(`Selection: ${plan.bundle.selectionMode}`);
        console.log(`Purpose: ${plan.bundle.description}`);
        console.log('\nEvidence');
        for (const entry of plan.evidence) {
            console.log(`- ${entry.id}`);
            console.log(`  command: ${entry.command || 'policy-only'}`);
            console.log(`  execution: ${entry.executionMode}`);
            console.log(`  network: ${entry.networkPolicy}`);
        }
        console.log('\nPlan only: no evidence command was executed.');
    }
} catch (error) {
    console.error(error instanceof Error ? error.message : 'SecurityOS evidence planning failed.');
    process.exitCode = 1;
}
