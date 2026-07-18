export type StorePublicTruthPostCommitResult = {
    effectsPending: boolean;
    failedEffectCount: number;
    firstError: unknown;
};

export type StorePublicTruthPostCommitDependencies = {
    invalidateAssistant: (storeId: string, tenantId: string) => Promise<unknown>;
    revalidate: (tag: string) => void | Promise<unknown>;
    touchScreen: (storeId: string) => Promise<unknown>;
};

export async function runStorePublicTruthPostCommitEffects(params: {
    chunkSize: number;
    deps: StorePublicTruthPostCommitDependencies;
    includeScreenDataTag?: boolean;
    storeIds: string[];
    tenantId: string;
}): Promise<StorePublicTruthPostCommitResult> {
    let failedEffectCount = 0;
    let firstError: unknown = null;
    const recordResults = (results: PromiseSettledResult<unknown>[]) => {
        results.forEach((result) => {
            if (result.status !== 'rejected') return;
            failedEffectCount += 1;
            if (firstError === null) firstError = result.reason;
        });
    };
    const runEffect = (effect: () => void | Promise<unknown>) => Promise.resolve().then(effect);
    const chunkSize = Number.isFinite(params.chunkSize)
        ? Math.max(1, Math.floor(params.chunkSize))
        : 1;

    for (let offset = 0; offset < params.storeIds.length; offset += chunkSize) {
        const storeIds = params.storeIds.slice(offset, offset + chunkSize);
        recordResults(await Promise.allSettled(storeIds.flatMap((storeId) => [
            runEffect(() => params.deps.revalidate(`menu-store-${storeId}`)),
            runEffect(() => params.deps.revalidate(`store-${storeId}`)),
            runEffect(() => params.deps.touchScreen(storeId)),
            runEffect(() => params.deps.invalidateAssistant(storeId, params.tenantId)),
        ])));
    }

    const globalEffects = [runEffect(() => params.deps.revalidate('client-stores'))];
    if (params.includeScreenDataTag !== false) {
        globalEffects.push(runEffect(() => params.deps.revalidate('screen-data')));
    }
    recordResults(await Promise.allSettled(globalEffects));

    return {
        effectsPending: failedEffectCount > 0,
        failedEffectCount,
        firstError,
    };
}
