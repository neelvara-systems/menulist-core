import {
    runStorePublicTruthPostCommitEffects,
    type StorePublicTruthPostCommitDependencies,
    type StorePublicTruthPostCommitResult,
} from '@lib/cache/storePublicTruthPostCommit';

export type TenantNamePostCommitResult = StorePublicTruthPostCommitResult;

export async function runTenantNamePostCommitEffects(params: {
    chunkSize: number;
    deps: StorePublicTruthPostCommitDependencies;
    storeIds: string[];
    tenantId: string;
}): Promise<TenantNamePostCommitResult> {
    return runStorePublicTruthPostCommitEffects(params);
}
