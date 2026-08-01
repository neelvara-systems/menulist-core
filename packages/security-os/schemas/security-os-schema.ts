import { z } from 'zod';

export const SECURITY_OS_PRODUCT_IDS = [
    'menulist',
    'answerlattice',
    'campaigncue',
    'signaldesk',
    'mycodex',
    'neelvara',
] as const;

export type SecurityOsProductId = typeof SECURITY_OS_PRODUCT_IDS[number];

export type SecurityOsProductStage = 'phase-one' | 'registered-only';

export interface SecurityOsProductProfile {
    id: SecurityOsProductId;
    displayName: string;
    stage: SecurityOsProductStage;
    sourcePaths: string[];
    exclusions: string[];
}

export const SECURITY_OS_COVERAGE_STATUSES = [
    'mapped',
    'partial',
    'registered',
    'unknown',
    'not-applicable',
] as const;

export type SecurityOsCoverageStatus = typeof SECURITY_OS_COVERAGE_STATUSES[number];

export const SECURITY_OS_VERIFICATION_STATUSES = [
    'not-run',
    'passed',
    'failed',
    'blocked',
] as const;

export type SecurityOsVerificationStatus = typeof SECURITY_OS_VERIFICATION_STATUSES[number];

export type SecurityOsRisk = 'critical' | 'high' | 'medium' | 'low';

export interface SecurityOsSurface {
    id: string;
    product: SecurityOsProductId | 'repository';
    title: string;
    risk: SecurityOsRisk;
    coverageStatus: SecurityOsCoverageStatus;
    verificationStatus: SecurityOsVerificationStatus;
    sourcePaths: string[];
    evidenceIds: string[];
    bundleIds: string[];
    notes: string;
}

export interface SecurityOsManifest {
    version: number;
    updatedAt: string;
    boundary: {
        internalOnly: true;
        publicRuntime: false;
        publicMarketing: false;
        firebaseOperations: false;
        externalCodeUpload: false;
        automaticFixes: false;
        automaticDeploys: false;
    };
    surfaces: SecurityOsSurface[];
}

export type SecurityOsEvidenceKind = 'verifier' | 'emulator-test' | 'policy';
export type SecurityOsExecutionMode = 'local-read-only' | 'firebase-emulator' | 'policy-only';
export type SecurityOsBundleSelectionMode = 'manual-selective';

export interface SecurityOsEvidenceEntry {
    id: string;
    kind: SecurityOsEvidenceKind;
    products: Array<SecurityOsProductId | 'repository'>;
    path: string;
    command: string | null;
    executionMode: SecurityOsExecutionMode;
    networkPolicy: 'none' | 'local-emulator-only' | 'package-registry-read-only';
    writesProductionData: false;
    description: string;
}

export interface SecurityOsEvidenceBundle {
    id: string;
    title: string;
    products: Array<SecurityOsProductId | 'repository'>;
    evidenceIds: string[];
    selectionMode: SecurityOsBundleSelectionMode;
    description: string;
}

export interface SecurityOsEvidenceMap {
    version: number;
    updatedAt: string;
    evidence: SecurityOsEvidenceEntry[];
    bundles: SecurityOsEvidenceBundle[];
}

const securityOsProductSchema = z.enum(SECURITY_OS_PRODUCT_IDS);
const securityOsCoverageStatusSchema = z.enum(SECURITY_OS_COVERAGE_STATUSES);
const securityOsVerificationStatusSchema = z.enum(SECURITY_OS_VERIFICATION_STATUSES);

export const SecurityOsManifestSchema = z.object({
    version: z.number().int().positive(),
    updatedAt: z.string(),
    boundary: z.object({
        internalOnly: z.literal(true),
        publicRuntime: z.literal(false),
        publicMarketing: z.literal(false),
        firebaseOperations: z.literal(false),
        externalCodeUpload: z.literal(false),
        automaticFixes: z.literal(false),
        automaticDeploys: z.literal(false),
    }).strict(),
    surfaces: z.array(z.object({
        id: z.string().min(1),
        product: z.union([securityOsProductSchema, z.literal('repository')]),
        title: z.string().min(1),
        risk: z.enum(['critical', 'high', 'medium', 'low']),
        coverageStatus: securityOsCoverageStatusSchema,
        verificationStatus: securityOsVerificationStatusSchema,
        sourcePaths: z.array(z.string().min(1)),
        evidenceIds: z.array(z.string().min(1)),
        bundleIds: z.array(z.string().min(1)),
        notes: z.string(),
    }).strict()),
}).strict();

export const SecurityOsEvidenceMapSchema = z.object({
    version: z.number().int().positive(),
    updatedAt: z.string(),
    evidence: z.array(z.object({
        id: z.string().min(1),
        kind: z.enum(['verifier', 'emulator-test', 'policy']),
        products: z.array(z.union([securityOsProductSchema, z.literal('repository')])).min(1),
        path: z.string().min(1),
        command: z.string().min(1).nullable(),
        executionMode: z.enum(['local-read-only', 'firebase-emulator', 'policy-only']),
        networkPolicy: z.enum(['none', 'local-emulator-only', 'package-registry-read-only']),
        writesProductionData: z.literal(false),
        description: z.string().min(1),
    }).strict()),
    bundles: z.array(z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        products: z.array(z.union([securityOsProductSchema, z.literal('repository')])).min(1),
        evidenceIds: z.array(z.string().min(1)).min(1),
        selectionMode: z.literal('manual-selective'),
        description: z.string().min(1),
    }).strict()),
}).strict();
