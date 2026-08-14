export const DISTRIBUTION_OS_PRODUCT_IDS = [
    'menulist',
    'answerlattice',
    'campaigncue',
    'signaldesk',
    'growthos',
    'mycodex',
    'surfaceos',
    'kitstamp',
    'neelvara',
    'canonica',
] as const;

export type DistributionOsProductId = typeof DISTRIBUTION_OS_PRODUCT_IDS[number];

export const DISTRIBUTION_OS_STATUSES = [
    'APPLY_NOW',
    'ALREADY_COVERED',
    'DEFERRED_REFERENCE',
    'RESEARCH_REQUIRED',
    'REJECTED',
] as const;

export type DistributionOsStatus = typeof DISTRIBUTION_OS_STATUSES[number];

export type DistributionOsLedgerId = 'menulist-external-insights' | 'portfolio-distribution-insights';

export interface DistributionOsBoundary {
    internalOnly: true;
    readOnlyCommands: true;
    publicRuntime: false;
    firebaseOperations: false;
    providerConnections: false;
    automaticResearch: false;
    automaticPublishing: false;
    automaticOutreach: false;
    automaticSpend: false;
}

export interface DistributionOsLedgerDefinition {
    id: DistributionOsLedgerId;
    title: string;
    path: string;
    entryPrefix: 'ML-MKT-EXT' | 'PP-DIST-EXT';
    productScope: DistributionOsProductId[];
    requiredMetadata: Array<'Status' | 'Shared' | 'Source' | 'Source type' | 'Topics' | 'Use when' | 'Revalidate'>;
    requiredSections: string[];
}

export interface DistributionOsProductProfile {
    id: DistributionOsProductId;
    displayName: string;
    className: string;
    ledgerIds: DistributionOsLedgerId[];
    truthPaths: string[];
    executionOwner: string;
    exclusions: string[];
}

export interface DistributionOsEntry {
    id: string;
    ledgerId: DistributionOsLedgerId;
    title: string;
    status: DistributionOsStatus;
    shared: string;
    source: string;
    sourceType: string;
    topics: string[];
    useWhen: string | null;
    revalidate: string;
    body: string;
    path: string;
    line: number;
}

export interface DistributionOsAuditResult {
    passed: string[];
    warnings: string[];
    errors: string[];
    ledgerCount: number;
    entryCount: number;
    productCount: number;
}

export const DISTRIBUTION_OS_BOUNDARY: DistributionOsBoundary = {
    internalOnly: true,
    readOnlyCommands: true,
    publicRuntime: false,
    firebaseOperations: false,
    providerConnections: false,
    automaticResearch: false,
    automaticPublishing: false,
    automaticOutreach: false,
    automaticSpend: false,
};
