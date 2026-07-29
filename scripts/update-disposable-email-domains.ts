import { rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SOURCE_URL =
    'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.json';
const TARGET_PATH = resolve(
    process.cwd(),
    'src/lib/validation/disposable-domains-full.json',
);
const DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const MINIMUM_DOMAIN_COUNT = 10_000;
const MAXIMUM_DOWNLOAD_BYTES = 5 * 1024 * 1024;

export function validateDisposableDomainArtifact(value: unknown): string[] {
    if (!Array.isArray(value) || value.length < MINIMUM_DOMAIN_COUNT) {
        throw new Error(
            `Disposable-domain artifact must contain at least ${MINIMUM_DOMAIN_COUNT} entries.`,
        );
    }

    const domains: string[] = [];
    let previousDomain = '';
    for (const valueAtIndex of value) {
        if (typeof valueAtIndex !== 'string') {
            throw new Error('Disposable-domain artifact contains a non-string entry.');
        }

        const domain = valueAtIndex.trim().toLowerCase();
        if (
            domain !== valueAtIndex
            || domain.length > 253
            || !domain.includes('.')
            || domain.includes('..')
            || !DOMAIN_PATTERN.test(domain)
        ) {
            throw new Error(`Disposable-domain artifact contains an invalid entry: ${domain || '<empty>'}.`);
        }
        if (domain <= previousDomain) {
            throw new Error('Disposable-domain artifact must be sorted with no duplicate entries.');
        }

        domains.push(domain);
        previousDomain = domain;
    }

    return domains;
}

async function updateDisposableEmailDomains(): Promise<void> {
    const response = await fetch(SOURCE_URL, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
        throw new Error(`Disposable-domain download failed with HTTP ${response.status}.`);
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAXIMUM_DOWNLOAD_BYTES) {
        throw new Error('Disposable-domain download exceeds the maximum allowed size.');
    }

    const source = await response.text();
    if (Buffer.byteLength(source, 'utf8') > MAXIMUM_DOWNLOAD_BYTES) {
        throw new Error('Disposable-domain download exceeds the maximum allowed size.');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(source);
    } catch {
        throw new Error('Disposable-domain download is not valid JSON.');
    }
    const domains = validateDisposableDomainArtifact(parsed);

    const temporaryPath = `${TARGET_PATH}.tmp-${process.pid}-${Date.now()}`;
    try {
        await writeFile(temporaryPath, `${JSON.stringify(domains)}\n`, {
            encoding: 'utf8',
            flag: 'wx',
        });
        await rename(temporaryPath, TARGET_PATH);
    } catch (error) {
        await unlink(temporaryPath).catch(() => undefined);
        throw error;
    }

    process.stdout.write(`Updated ${TARGET_PATH} with ${domains.length} validated domains.\n`);
}

if (resolve(process.argv[1] ?? '') === resolve(__filename)) {
    void updateDisposableEmailDomains().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown update failure.';
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
    });
}
