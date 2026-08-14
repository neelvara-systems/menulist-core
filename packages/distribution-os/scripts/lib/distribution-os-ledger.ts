import fs from 'node:fs';
import path from 'node:path';

import {
    DISTRIBUTION_OS_PRODUCT_IDS,
    DISTRIBUTION_OS_STATUSES,
    type DistributionOsAuditResult,
    type DistributionOsEntry,
    type DistributionOsLedgerDefinition,
    type DistributionOsProductId,
    type DistributionOsStatus,
} from '../../schemas/distribution-os-schema';
import {
    DISTRIBUTION_OS_BIBLE_PATH,
    DISTRIBUTION_OS_LEDGERS,
    DISTRIBUTION_OS_PRODUCT_PROFILES,
} from '../../products/distribution-profiles';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

function readRepoFile(relativePath: string): string {
    return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

function normalizeInline(value: string): string {
    return value.replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function metadataValue(body: string, field: string): string | null {
    const lines = body.split('\n');
    const start = lines.findIndex((line) => line.startsWith(`- **${field}:**`));
    if (start === -1) return null;

    const values = [lines[start].slice(`- **${field}:**`.length).trim()];
    for (let index = start + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (line.startsWith('- **') || line.startsWith('#### ') || line.startsWith('**')) break;
        if (line.trim() === '') break;
        values.push(line.trim());
    }
    return normalizeInline(values.join(' '));
}

function parseStatus(raw: string | null): DistributionOsStatus | null {
    if (!raw) return null;
    return DISTRIBUTION_OS_STATUSES.find((status) => raw.includes(status)) ?? null;
}

function splitEntrySections(content: string, ledger: DistributionOsLedgerDefinition): Array<{
    id: string;
    title: string;
    body: string;
    line: number;
}> {
    const heading = new RegExp(`^### (${ledger.entryPrefix}-\\d{3}) - (.+)$`, 'gm');
    const matches: RegExpExecArray[] = [];
    let match = heading.exec(content);
    while (match) {
        matches.push(match);
        match = heading.exec(content);
    }
    return matches.map((match, index) => {
        const start = match.index ?? 0;
        const end = matches[index + 1]?.index ?? content.length;
        return {
            id: match[1],
            title: match[2].trim(),
            body: content.slice(start, end).trim(),
            line: content.slice(0, start).split('\n').length,
        };
    });
}

export function readDistributionOsLedger(ledger: DistributionOsLedgerDefinition): DistributionOsEntry[] {
    const content = readRepoFile(ledger.path);
    return splitEntrySections(content, ledger).map((section) => {
        const status = parseStatus(metadataValue(section.body, 'Status'));
        if (!status) {
            throw new Error(`${section.id} has no recognized status`);
        }

        const topics = (metadataValue(section.body, 'Topics') ?? '')
            .split(',')
            .map((topic) => normalizeInline(topic).toLowerCase())
            .filter(Boolean);

        return {
            id: section.id,
            ledgerId: ledger.id,
            title: section.title,
            status,
            shared: metadataValue(section.body, 'Shared') ?? '',
            source: metadataValue(section.body, 'Source') ?? '',
            sourceType: metadataValue(section.body, 'Source type') ?? '',
            topics,
            useWhen: metadataValue(section.body, 'Use when'),
            revalidate: metadataValue(section.body, 'Revalidate') ?? '',
            body: section.body,
            path: ledger.path,
            line: section.line,
        };
    });
}

export function readAllDistributionOsEntries(): DistributionOsEntry[] {
    return DISTRIBUTION_OS_LEDGERS.flatMap(readDistributionOsLedger);
}

export function runDistributionOsAudit(productFilter?: string): DistributionOsAuditResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];
    const product = productFilter as DistributionOsProductId | undefined;

    if (product && !DISTRIBUTION_OS_PRODUCT_IDS.includes(product)) {
        errors.push(`Unknown product: ${product}`);
    }

    const profileIds = DISTRIBUTION_OS_PRODUCT_PROFILES.map((profile) => profile.id);
    if (new Set(profileIds).size !== profileIds.length) errors.push('Product profile IDs must be unique.');
    if (profileIds.length !== DISTRIBUTION_OS_PRODUCT_IDS.length) errors.push('Every DistributionOS product must have one profile.');

    const ledgerIds = DISTRIBUTION_OS_LEDGERS.map((ledger) => ledger.id);
    if (new Set(ledgerIds).size !== ledgerIds.length) errors.push('Ledger IDs must be unique.');

    const allEntries: DistributionOsEntry[] = [];
    for (const ledger of DISTRIBUTION_OS_LEDGERS) {
        const absolutePath = path.join(REPO_ROOT, ledger.path);
        if (!fs.existsSync(absolutePath)) {
            errors.push(`Ledger path does not exist: ${ledger.path}`);
            continue;
        }

        let entries: DistributionOsEntry[] = [];
        try {
            entries = readDistributionOsLedger(ledger);
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            continue;
        }
        allEntries.push(...entries);

        if (entries.length === 0) errors.push(`${ledger.id} has no numbered entries.`);
        entries.forEach((entry, index) => {
            const expectedId = `${ledger.entryPrefix}-${String(index + 1).padStart(3, '0')}`;
            if (entry.id !== expectedId) errors.push(`${ledger.id} expected ${expectedId}, found ${entry.id}.`);
            for (const field of ledger.requiredMetadata) {
                if (!metadataValue(entry.body, field)) errors.push(`${entry.id} is missing metadata: ${field}.`);
            }
            for (const section of ledger.requiredSections) {
                if (!entry.body.includes(section)) errors.push(`${entry.id} is missing section: ${section}.`);
            }
            if (
                ledger.id === 'portfolio-distribution-insights'
                && !entry.body.includes('#### Portfolio Verdict')
                && !entry.body.includes('#### Product-by-Product Decision')
            ) {
                errors.push(`${entry.id} must include a portfolio or product-by-product verdict section.`);
            }
            if (entry.topics.length === 0) errors.push(`${entry.id} must have at least one retrieval topic.`);
        });
        passed.push(`${ledger.title}: ${entries.length} sequential entries validated.`);
    }

    const entryIds = allEntries.map((entry) => entry.id);
    if (new Set(entryIds).size !== entryIds.length) errors.push('Insight IDs must be unique across ledgers.');

    for (const profile of DISTRIBUTION_OS_PRODUCT_PROFILES) {
        for (const ledgerId of profile.ledgerIds) {
            if (!ledgerIds.includes(ledgerId)) errors.push(`${profile.id} references unknown ledger ${ledgerId}.`);
        }
        for (const truthPath of profile.truthPaths) {
            if (!fs.existsSync(path.join(REPO_ROOT, truthPath))) errors.push(`${profile.id} truth path does not exist: ${truthPath}`);
        }
    }

    const features = readRepoFile('src/config/features.ts');
    if (!features.includes('ENABLE_DISTRIBUTION_OPERATING_SYSTEM: true')) {
        errors.push('ENABLE_DISTRIBUTION_OPERATING_SYSTEM must be enabled.');
    }

    const packageJson = JSON.parse(readRepoFile('package.json')) as { scripts?: Record<string, string> };
    for (const script of ['distribution-os:audit', 'distribution-os:plan', 'verify:distribution-os']) {
        if (!packageJson.scripts?.[script]) errors.push(`package.json is missing ${script}.`);
    }

    const requiredPaths = [
        '.agents/skills/distribution-os/SKILL.md',
        '.agents/skills/distribution-os/agents/openai.yaml',
        '.agents/skills/distribution-os/references/product-routing.md',
        '__docs__/distribution-operating-system/README.md',
        DISTRIBUTION_OS_BIBLE_PATH,
    ];
    for (const requiredPath of requiredPaths) {
        if (!fs.existsSync(path.join(REPO_ROOT, requiredPath))) errors.push(`Required DistributionOS path is missing: ${requiredPath}`);
    }

    if (fs.existsSync(path.join(REPO_ROOT, DISTRIBUTION_OS_BIBLE_PATH))) {
        const bible = readRepoFile(DISTRIBUTION_OS_BIBLE_PATH);
        for (const marker of ['## The Core Doctrine', '## Curating External Knowledge', '## System Ownership']) {
            if (!bible.includes(marker)) errors.push(`DistributionOS Bible is missing section: ${marker}`);
        }
    }

    if (allEntries.some((entry) => entry.status === 'RESEARCH_REQUIRED')) {
        warnings.push('RESEARCH_REQUIRED entries exist; they are retrieval leads, not adopted truth.');
    }
    passed.push(`${DISTRIBUTION_OS_PRODUCT_PROFILES.length} product-routing profiles validated.`);
    passed.push('Living Bible, supporting evidence, read-only package, skill, docs, feature flag, and npm command contracts are present.');

    return {
        passed,
        warnings,
        errors,
        ledgerCount: DISTRIBUTION_OS_LEDGERS.length,
        entryCount: allEntries.length,
        productCount: DISTRIBUTION_OS_PRODUCT_PROFILES.length,
    };
}

export interface DistributionOsQuery {
    product?: DistributionOsProductId;
    topic?: string;
    status?: DistributionOsStatus;
    entry?: string;
}

export function queryDistributionOs(query: DistributionOsQuery): {
    entries: DistributionOsEntry[];
    profile: typeof DISTRIBUTION_OS_PRODUCT_PROFILES[number] | null;
} {
    const profile = query.product
        ? DISTRIBUTION_OS_PRODUCT_PROFILES.find((candidate) => candidate.id === query.product) ?? null
        : null;
    const allowedLedgers = profile ? new Set(profile.ledgerIds) : null;
    const normalizedTopic = query.topic?.trim().toLowerCase();
    const normalizedEntry = query.entry?.trim().toUpperCase();

    const entries = readAllDistributionOsEntries().filter((entry) => {
        if (allowedLedgers && !allowedLedgers.has(entry.ledgerId)) return false;
        if (query.status && entry.status !== query.status) return false;
        if (normalizedEntry && entry.id !== normalizedEntry) return false;
        if (normalizedTopic) {
            const haystack = [entry.title, ...entry.topics, entry.body].join(' ').toLowerCase();
            if (!haystack.includes(normalizedTopic)) return false;
        }
        return true;
    });

    return { entries, profile };
}
