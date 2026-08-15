import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    SecurityOsEvidenceMapSchema,
    SecurityOsManifestSchema,
} from '../../packages/security-os/schemas/security-os-schema';
import type { SecurityOsEvidenceEntry } from '../../packages/security-os/schemas/security-os-schema';
import {
    isContainedSecurityOsRepoPath,
    isSecurityOsIsoDate,
    runSecurityOsAudit,
} from '../../packages/security-os/scripts/lib/security-os-audit';
import {
    getSecurityOsBundlePlan,
    listSecurityOsBundles,
} from '../../packages/security-os/scripts/lib/security-os-plan';

assert.equal(isSecurityOsIsoDate('2026-07-29'), true);
assert.equal(isSecurityOsIsoDate('2026-02-29'), false);
assert.equal(isSecurityOsIsoDate('2026-02-31'), false);
assert.equal(isSecurityOsIsoDate('2026-13-01'), false);
assert.equal(isContainedSecurityOsRepoPath('src/middleware.ts'), true);
assert.equal(isContainedSecurityOsRepoPath('../outside-repository.txt'), false);
assert.equal(isContainedSecurityOsRepoPath('/tmp/outside-repository.txt'), false);
assert.equal(isContainedSecurityOsRepoPath(''), false);

const manifest = JSON.parse(
    fs.readFileSync('packages/security-os/manifest/security-surfaces.json', 'utf8'),
) as unknown;
const evidence = JSON.parse(
    fs.readFileSync('packages/security-os/evidence/verifier-evidence.json', 'utf8'),
) as unknown;
assert.equal(SecurityOsManifestSchema.safeParse(manifest).success, true);
const evidenceResult = SecurityOsEvidenceMapSchema.safeParse(evidence);
assert.equal(evidenceResult.success, true);
if (!evidenceResult.success) throw new Error('Expected current SecurityOS evidence to be valid.');
assert.equal(
    evidenceResult.data.evidence.find((entry) => entry.id === 'menulist.storage-paths')?.executionMode,
    'firebase-emulator',
);
assert.equal(
    evidenceResult.data.evidence.find((entry) => entry.id === 'answerlattice.security-audit')?.networkPolicy,
    'package-registry-read-only',
);
const githubIntakeEvidence = evidenceResult.data.evidence
    .find((entry) => entry.id === 'answerlattice.github-change-intake-boundary');
assert.equal(githubIntakeEvidence?.executionMode, 'local-read-only');
assert.equal(githubIntakeEvidence?.networkPolicy, 'none');
assert.equal(githubIntakeEvidence?.writesProductionData, false);
for (const evidenceId of [
    'menulist.gemini-spend-window-rules',
    'answerlattice.gemini-spend-window-rules',
    'signaldesk.gemini-spend-window-rules',
]) {
    const spendWindowEvidence: SecurityOsEvidenceEntry | undefined = evidenceResult.data.evidence
        .find((candidate) => candidate.id === evidenceId);
    assert.equal(spendWindowEvidence?.executionMode, 'firebase-emulator');
    assert.equal(spendWindowEvidence?.networkPolicy, 'local-emulator-only');
    assert.equal(spendWindowEvidence?.writesProductionData, false);
}
assert.equal(evidenceResult.data.bundles.length, 7);
assert.equal(
    evidenceResult.data.bundles.every((bundle) => bundle.selectionMode === 'manual-selective'),
    true,
);
assert.equal(listSecurityOsBundles('menulist').length, 2);
assert.throws(
    () => listSecurityOsBundles('unknown-product'),
    /Unknown SecurityOS product filter/,
);
const trustBoundaryPlan = getSecurityOsBundlePlan('menulist.data-and-trust-boundaries');
const answerlatticeIngressPlan = getSecurityOsBundlePlan('answerlattice.authority-and-ingress');
assert.equal(trustBoundaryPlan.bundle.selectionMode, 'manual-selective');
assert.equal(
    answerlatticeIngressPlan.evidence.some((entry) => entry.id === 'answerlattice.github-change-intake-boundary'),
    true,
);
assert.throws(
    () => getSecurityOsBundlePlan('answerlattice.authority-and-ingress', 'menulist'),
    /outside product filter/,
);
assert.equal(
    trustBoundaryPlan.evidence.some((entry) => entry.id === 'menulist.server-network-target-boundary'),
    true,
);
assert.equal(
    trustBoundaryPlan.evidence.every((entry) => entry.writesProductionData === false),
    true,
);

const invalidEvidence = {
    ...(evidence as Record<string, unknown>),
    unexpected: true,
};
assert.equal(SecurityOsEvidenceMapSchema.safeParse(invalidEvidence).success, false);

const result = runSecurityOsAudit();
assert.deepEqual(result.errors, []);
assert.equal(result.evidenceCount, 46);
assert.equal(result.bundleCount, 7);
assert.equal(result.surfaceCount, 22);

console.log('SecurityOS registry boundary tests passed.');
