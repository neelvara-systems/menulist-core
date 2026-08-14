import {
    DISTRIBUTION_OS_PRODUCT_IDS,
    DISTRIBUTION_OS_STATUSES,
    type DistributionOsProductId,
    type DistributionOsStatus,
} from '../schemas/distribution-os-schema';
import { DISTRIBUTION_OS_BIBLE_PATH } from '../products/distribution-profiles';
import { queryDistributionOs, type DistributionOsQuery } from './lib/distribution-os-ledger';

function valueAfter(args: string[], flag: string): string | undefined {
    const index = args.indexOf(flag);
    if (index === -1) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value.`);
    return args[index + 1];
}

function parseQuery(args: string[]): DistributionOsQuery {
    const knownFlags = new Set(['--product', '--topic', '--status', '--entry']);
    for (let index = 0; index < args.length; index += 2) {
        if (!knownFlags.has(args[index])) throw new Error(`Unknown option: ${args[index]}`);
    }

    const product = valueAfter(args, '--product')?.toLowerCase();
    if (product && !DISTRIBUTION_OS_PRODUCT_IDS.includes(product as DistributionOsProductId)) {
        throw new Error(`Unknown product: ${product}`);
    }

    const rawStatus = valueAfter(args, '--status')?.toUpperCase().replace(/-/g, '_');
    if (rawStatus && !DISTRIBUTION_OS_STATUSES.includes(rawStatus as DistributionOsStatus)) {
        throw new Error(`Unknown status: ${rawStatus}`);
    }

    return {
        product: product as DistributionOsProductId | undefined,
        topic: valueAfter(args, '--topic'),
        status: rawStatus as DistributionOsStatus | undefined,
        entry: valueAfter(args, '--entry'),
    };
}

try {
    const query = parseQuery(process.argv.slice(2));
    const result = queryDistributionOs(query);

    console.log('DistributionOS read-only retrieval plan');
    console.log(`Primary doctrine: ${DISTRIBUTION_OS_BIBLE_PATH}`);
    if (result.profile) {
        console.log(`Product: ${result.profile.displayName} (${result.profile.className})`);
        console.log(`Execution owner: ${result.profile.executionOwner}`);
        console.log('Current-truth paths:');
        for (const truthPath of result.profile.truthPaths) console.log(`- ${truthPath}`);
        console.log('Exclusions:');
        for (const exclusion of result.profile.exclusions) console.log(`- ${exclusion}`);
    }

    console.log(`Supporting evidence matches: ${result.entries.length}`);
    for (const entry of result.entries) {
        console.log(`\n${entry.id} | ${entry.status} | ${entry.title}`);
        console.log(`- Source type: ${entry.sourceType}`);
        console.log(`- Topics: ${entry.topics.join(', ')}`);
        console.log(`- Use when: ${entry.useWhen ?? 'See product verdict and current decision.'}`);
        console.log(`- Revalidate: ${entry.revalidate}`);
        console.log(`- Location: ${entry.path}:${entry.line}`);
    }

    console.log('\nRead the Bible first. These matches are supporting evidence, not an article queue or the primary doctrine. Revalidate unstable claims before adoption and use SignalDesk or the named product workflow for approved execution.');
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
