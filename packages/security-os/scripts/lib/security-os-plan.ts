import fs from 'fs';
import path from 'path';
import {
    SECURITY_OS_PRODUCT_IDS,
    SecurityOsEvidenceMapSchema,
    type SecurityOsEvidenceBundle,
    type SecurityOsEvidenceEntry,
    type SecurityOsEvidenceMap,
} from '../../schemas/security-os-schema';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const EVIDENCE_PATH = path.join(
    REPO_ROOT,
    'packages/security-os/evidence/verifier-evidence.json',
);

export interface SecurityOsBundlePlan {
    bundle: SecurityOsEvidenceBundle;
    evidence: SecurityOsEvidenceEntry[];
}

function loadEvidenceMap(): SecurityOsEvidenceMap {
    const raw = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8')) as unknown;
    const result = SecurityOsEvidenceMapSchema.safeParse(raw);
    if (!result.success) throw new Error('SecurityOS evidence map shape is invalid.');
    return result.data as SecurityOsEvidenceMap;
}

function assertKnownProduct(product: string): void {
    if (product !== 'repository' && !SECURITY_OS_PRODUCT_IDS.includes(
        product as typeof SECURITY_OS_PRODUCT_IDS[number],
    )) {
        throw new Error(`Unknown SecurityOS product filter: ${product}`);
    }
}

export function listSecurityOsBundles(product?: string): SecurityOsEvidenceBundle[] {
    const evidenceMap = loadEvidenceMap();
    if (!product) return evidenceMap.bundles;
    assertKnownProduct(product);
    return evidenceMap.bundles.filter((bundle) => bundle.products.includes(
        product as SecurityOsEvidenceBundle['products'][number],
    ));
}

export function getSecurityOsBundlePlan(
    bundleId: string,
    product?: string,
): SecurityOsBundlePlan {
    const evidenceMap = loadEvidenceMap();
    if (product) assertKnownProduct(product);
    const bundle = evidenceMap.bundles.find((candidate) => candidate.id === bundleId);
    if (!bundle) throw new Error(`Unknown SecurityOS evidence bundle: ${bundleId}`);
    if (
        product
        && !bundle.products.includes(product as SecurityOsEvidenceBundle['products'][number])
    ) {
        throw new Error(`Evidence bundle ${bundleId} is outside product filter ${product}.`);
    }

    const evidenceById = new Map(evidenceMap.evidence.map((entry) => [entry.id, entry]));
    const evidence = bundle.evidenceIds.map((evidenceId) => {
        const entry = evidenceById.get(evidenceId);
        if (!entry) throw new Error(`Bundle ${bundleId} references missing evidence ${evidenceId}.`);
        return entry;
    });

    return { bundle, evidence };
}
