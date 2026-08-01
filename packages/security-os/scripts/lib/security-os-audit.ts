import fs from 'fs';
import path from 'path';
import {
    SECURITY_OS_COVERAGE_STATUSES,
    SecurityOsEvidenceMapSchema,
    SecurityOsManifestSchema,
    SECURITY_OS_PRODUCT_IDS,
    SECURITY_OS_VERIFICATION_STATUSES,
    type SecurityOsEvidenceMap,
    type SecurityOsManifest,
} from '../../schemas/security-os-schema';
import { securityOsProductProfiles } from '../../products/security-profiles';

export const SECURITY_OS_REPO_ROOT = path.resolve(__dirname, '../../../..');
const SECURITY_OS_REAL_REPO_ROOT = fs.realpathSync(SECURITY_OS_REPO_ROOT);

const MANIFEST_PATH = 'packages/security-os/manifest/security-surfaces.json';
const EVIDENCE_PATH = 'packages/security-os/evidence/verifier-evidence.json';

export interface SecurityOsAuditResult {
    errors: string[];
    warnings: string[];
    passed: string[];
    productCount: number;
    surfaceCount: number;
    evidenceCount: number;
    bundleCount: number;
}

export function isContainedSecurityOsRepoPath(repoPath: string): boolean {
    if (!repoPath || path.isAbsolute(repoPath)) return false;
    const resolvedPath = path.resolve(SECURITY_OS_REPO_ROOT, repoPath);
    if (!resolvedPath.startsWith(`${SECURITY_OS_REPO_ROOT}${path.sep}`)) return false;
    if (!fs.existsSync(resolvedPath)) return true;
    try {
        const realPath = fs.realpathSync(resolvedPath);
        return realPath.startsWith(`${SECURITY_OS_REAL_REPO_ROOT}${path.sep}`);
    } catch {
        return false;
    }
}

function fromRepoPath(repoPath: string): string {
    if (!isContainedSecurityOsRepoPath(repoPath)) {
        throw new Error('security_os_repo_path_outside_root');
    }
    return path.resolve(SECURITY_OS_REPO_ROOT, repoPath);
}

function exists(repoPath: string): boolean {
    if (!isContainedSecurityOsRepoPath(repoPath)) return false;
    return fs.existsSync(fromRepoPath(repoPath));
}

function loadJson(repoPath: string): unknown {
    return JSON.parse(fs.readFileSync(fromRepoPath(repoPath), 'utf8')) as unknown;
}

export function isSecurityOsIsoDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function hasUniqueValues(values: string[]): boolean {
    return new Set(values).size === values.length;
}

export function runSecurityOsAudit(selectedProduct?: string): SecurityOsAuditResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const passed: string[] = [];

    let manifestRaw: unknown;
    let evidenceMapRaw: unknown;
    let packageJsonRaw: unknown;
    try {
        manifestRaw = loadJson(MANIFEST_PATH);
        evidenceMapRaw = loadJson(EVIDENCE_PATH);
        packageJsonRaw = loadJson('package.json');
    } catch {
        return {
            errors: ['SecurityOS registry JSON could not be read or parsed.'],
            warnings,
            passed,
            productCount: 0,
            surfaceCount: 0,
            evidenceCount: 0,
            bundleCount: 0,
        };
    }
    const manifestResult = SecurityOsManifestSchema.safeParse(manifestRaw);
    const evidenceMapResult = SecurityOsEvidenceMapSchema.safeParse(evidenceMapRaw);
    if (!manifestResult.success || !evidenceMapResult.success) {
        return {
            errors: [
                ...(!manifestResult.success ? ['SecurityOS surface manifest shape is invalid.'] : []),
                ...(!evidenceMapResult.success ? ['SecurityOS evidence map shape is invalid.'] : []),
            ],
            warnings,
            passed,
            productCount: 0,
            surfaceCount: 0,
            evidenceCount: 0,
            bundleCount: 0,
        };
    }
    // Zod 3 under this repository's compiler mode infers object properties as
    // optional. These bridges occur only after the complete strict schemas
    // have succeeded, so the required runtime interfaces are established.
    const manifest = manifestResult.data as SecurityOsManifest;
    const evidenceMap = evidenceMapResult.data as SecurityOsEvidenceMap;
    const packageJson = (
        packageJsonRaw
        && typeof packageJsonRaw === 'object'
        && !Array.isArray(packageJsonRaw)
    ) ? packageJsonRaw as { scripts?: Record<string, string> } : {};
    const knownProducts = new Set<string>(SECURITY_OS_PRODUCT_IDS);
    const profileIds = securityOsProductProfiles.map((profile) => profile.id);
    const evidenceIds = evidenceMap.evidence.map((entry) => entry.id);
    const bundleIds = evidenceMap.bundles.map((bundle) => bundle.id);
    const surfaceIds = manifest.surfaces.map((surface) => surface.id);

    if (selectedProduct && selectedProduct !== 'repository' && !knownProducts.has(selectedProduct)) {
        errors.push(`Unknown product filter: ${selectedProduct}`);
    }

    const expectedBoundary = {
        internalOnly: true,
        publicRuntime: false,
        publicMarketing: false,
        firebaseOperations: false,
        externalCodeUpload: false,
        automaticFixes: false,
        automaticDeploys: false,
    };
    for (const [key, expected] of Object.entries(expectedBoundary)) {
        const actual = manifest.boundary[key as keyof typeof manifest.boundary];
        if (actual !== expected) {
            errors.push(`Boundary ${key} must be ${String(expected)}; received ${String(actual)}.`);
        }
    }

    if (!isSecurityOsIsoDate(manifest.updatedAt) || !isSecurityOsIsoDate(evidenceMap.updatedAt)) {
        errors.push('Manifest and evidence updatedAt values must use YYYY-MM-DD.');
    }
    if (!hasUniqueValues(profileIds)) errors.push('Product profile IDs must be unique.');
    if (!hasUniqueValues(evidenceIds)) errors.push('Evidence IDs must be unique.');
    if (!hasUniqueValues(bundleIds)) errors.push('Evidence bundle IDs must be unique.');
    if (!hasUniqueValues(surfaceIds)) errors.push('Surface IDs must be unique.');
    if (
        profileIds.length !== SECURITY_OS_PRODUCT_IDS.length
        || SECURITY_OS_PRODUCT_IDS.some((productId) => !profileIds.includes(productId))
    ) {
        errors.push('Product profiles must exactly cover the current SecurityOS product registry.');
    }

    for (const profile of securityOsProductProfiles) {
        for (const sourcePath of profile.sourcePaths) {
            if (!exists(sourcePath)) errors.push(`Product ${profile.id} source path does not exist: ${sourcePath}`);
        }
    }

    const evidenceById = new Map(evidenceMap.evidence.map((entry) => [entry.id, entry]));
    const bundleById = new Map(evidenceMap.bundles.map((bundle) => [bundle.id, bundle]));
    const getScriptClosure = (scriptName: string, seen = new Set<string>()): string[] => {
        if (seen.has(scriptName)) return [];
        seen.add(scriptName);
        const script = packageJson.scripts?.[scriptName];
        if (!script) return [];
        const nestedScripts = Array.from(script.matchAll(/\bnpm run ([a-zA-Z0-9:_-]+)/g))
            .map((match) => match[1]);
        return [
            script,
            ...nestedScripts.flatMap((nestedScript) => getScriptClosure(nestedScript, seen)),
        ];
    };
    for (const evidence of evidenceMap.evidence) {
        if (!exists(evidence.path)) errors.push(`Evidence path does not exist for ${evidence.id}: ${evidence.path}`);
        if (evidence.writesProductionData !== false) {
            errors.push(`Evidence ${evidence.id} must declare writesProductionData=false.`);
        }
        if (evidence.command) {
            const match = evidence.command.match(/^npm run ([a-zA-Z0-9:_-]+)$/);
            if (!match) {
                errors.push(`Evidence ${evidence.id} must use a single registered npm command.`);
            } else if (!packageJson.scripts?.[match[1]]) {
                errors.push(`Evidence ${evidence.id} references missing npm script ${match[1]}.`);
            } else {
                const commandClosure = getScriptClosure(match[1]).join('\n');
                if (commandClosure.includes('firebase emulators:')) {
                    if (evidence.executionMode !== 'firebase-emulator') {
                        errors.push(`Evidence ${evidence.id} launches Firebase emulators and must use executionMode=firebase-emulator.`);
                    }
                    if (evidence.networkPolicy !== 'local-emulator-only') {
                        errors.push(`Evidence ${evidence.id} launches Firebase emulators and must use networkPolicy=local-emulator-only.`);
                    }
                }
            }
        }
        const evidenceSource = exists(evidence.path)
            ? fs.readFileSync(fromRepoPath(evidence.path), 'utf8')
            : '';
        const invokesPackageAudit = evidenceSource.includes("const args = ['audit'")
            && evidenceSource.includes("spawnSync('npm'");
        if (invokesPackageAudit && evidence.networkPolicy !== 'package-registry-read-only') {
            errors.push(`Evidence ${evidence.id} invokes npm audit and must declare package-registry-read-only network access.`);
        }
        for (const product of evidence.products) {
            if (product !== 'repository' && !knownProducts.has(product)) {
                errors.push(`Evidence ${evidence.id} references unknown product ${product}.`);
            }
        }
    }

    for (const bundle of evidenceMap.bundles) {
        if (!hasUniqueValues(bundle.evidenceIds)) {
            errors.push(`Evidence bundle ${bundle.id} must not repeat evidence IDs.`);
        }
        for (const product of bundle.products) {
            if (product !== 'repository' && !knownProducts.has(product)) {
                errors.push(`Evidence bundle ${bundle.id} references unknown product ${product}.`);
            }
        }
        for (const evidenceId of bundle.evidenceIds) {
            const evidence = evidenceById.get(evidenceId);
            if (!evidence) {
                errors.push(`Evidence bundle ${bundle.id} references unknown evidence ${evidenceId}.`);
                continue;
            }
            const hasProductAgreement = bundle.products.some((product) => (
                evidence.products.includes(product)
                || evidence.products.includes('repository')
            ));
            if (!hasProductAgreement) {
                errors.push(`Evidence ${evidenceId} does not agree with bundle ${bundle.id} product scope.`);
            }
        }
    }

    for (const surface of manifest.surfaces) {
        const shouldReportSurface = !selectedProduct
            || surface.product === selectedProduct
            || (selectedProduct !== 'repository' && surface.product === 'repository');
        if (surface.product !== 'repository' && !knownProducts.has(surface.product)) {
            errors.push(`Surface ${surface.id} references unknown product ${surface.product}.`);
        }
        if (!SECURITY_OS_COVERAGE_STATUSES.includes(surface.coverageStatus)) {
            errors.push(`Surface ${surface.id} has invalid coverage status ${surface.coverageStatus}.`);
        }
        if (!SECURITY_OS_VERIFICATION_STATUSES.includes(surface.verificationStatus)) {
            errors.push(`Surface ${surface.id} has invalid verification status ${surface.verificationStatus}.`);
        }
        if (shouldReportSurface && surface.verificationStatus !== 'not-run') {
            warnings.push(`${surface.id}: persisted verification status is ${surface.verificationStatus}; confirm its evidence is current.`);
        }
        for (const sourcePath of surface.sourcePaths) {
            if (!exists(sourcePath)) errors.push(`Surface ${surface.id} source path does not exist: ${sourcePath}`);
        }
        for (const evidenceId of surface.evidenceIds) {
            const evidence = evidenceById.get(evidenceId);
            if (!evidence) {
                errors.push(`Surface ${surface.id} references unknown evidence ${evidenceId}.`);
                continue;
            }
            if (
                surface.product !== 'repository'
                && !evidence.products.includes(surface.product)
                && !evidence.products.includes('repository')
            ) {
                errors.push(`Evidence ${evidenceId} does not declare product ${surface.product}.`);
            }
        }
        for (const bundleId of surface.bundleIds) {
            const bundle = bundleById.get(bundleId);
            if (!bundle) {
                errors.push(`Surface ${surface.id} references unknown evidence bundle ${bundleId}.`);
                continue;
            }
            if (
                surface.product !== 'repository'
                && !bundle.products.includes(surface.product)
                && !bundle.products.includes('repository')
            ) {
                errors.push(`Evidence bundle ${bundleId} does not declare product ${surface.product}.`);
            }
        }
        if (
            ['mapped', 'partial'].includes(surface.coverageStatus)
            && surface.evidenceIds.length === 0
            && surface.bundleIds.length === 0
        ) {
            errors.push(`Surface ${surface.id} needs evidence or a bundle for coverage status ${surface.coverageStatus}.`);
        }
        if (shouldReportSurface && ['partial', 'registered', 'unknown'].includes(surface.coverageStatus)) {
            warnings.push(`${surface.id}: coverage is ${surface.coverageStatus}.`);
        }
    }

    const featureFlags = fs.readFileSync(fromRepoPath('src/config/features.ts'), 'utf8');
    if (!featureFlags.includes('ENABLE_SECURITY_OPERATING_SYSTEM: true')) {
        errors.push('ENABLE_SECURITY_OPERATING_SYSTEM must explicitly enable the internal package.');
    }

    const packageSourceFiles = [
        'packages/security-os/schemas/security-os-schema.ts',
        'packages/security-os/products/security-profiles.ts',
        'packages/security-os/scripts/audit-security-os.ts',
        'packages/security-os/scripts/lib/security-os-audit.ts',
        'packages/security-os/scripts/plan-security-os.ts',
        'packages/security-os/scripts/lib/security-os-plan.ts',
    ];
    const forbiddenRuntimeTokens = [
        ['@openai', '/codex-security'].join(''),
        ['OPENAI', '_API_KEY'].join(''),
        ['CODEX', '_API_KEY'].join(''),
        ['fetch', '('].join(''),
        ['axi', 'os'].join(''),
        ['firebase', '-admin'].join(''),
        ['firebase', '/app'].join(''),
        ['child', '_process'].join(''),
    ];
    for (const sourcePath of packageSourceFiles) {
        const content = fs.readFileSync(fromRepoPath(sourcePath), 'utf8');
        for (const token of forbiddenRuntimeTokens) {
            if (content.includes(token)) errors.push(`${sourcePath} contains prohibited Phase-one token ${token}.`);
        }
    }

    if (errors.length === 0) {
        passed.push('Internal-only boundary is intact.');
        passed.push('Product, surface, and evidence IDs are valid and unique.');
        passed.push('All registered evidence bundles, source, policy, verifier, and npm-script references exist.');
        passed.push('The SecurityOS registry runtime contains no external scanner, credential, network, Firebase SDK, or command-execution integration; registered evidence retains its declared execution and network policy.');
    }

    return {
        errors,
        warnings,
        passed,
        productCount: securityOsProductProfiles.length,
        surfaceCount: selectedProduct
            ? manifest.surfaces.filter((surface) => (
                surface.product === selectedProduct
                || (selectedProduct !== 'repository' && surface.product === 'repository')
            )).length
            : manifest.surfaces.length,
        evidenceCount: evidenceMap.evidence.length,
        bundleCount: evidenceMap.bundles.length,
    };
}
