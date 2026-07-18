export type StorageDeleteResult = Readonly<{
    success: boolean;
}>;

export type StorageCleanupSummary = Readonly<{
    attempted: number;
    failed: number;
    succeeded: number;
}>;

export const summarizeStorageCleanupResults = (
    results: readonly PromiseSettledResult<StorageDeleteResult>[],
): StorageCleanupSummary => {
    const succeeded = results.reduce((count, result) => (
        result.status === 'fulfilled' && result.value.success === true
            ? count + 1
            : count
    ), 0);

    return {
        attempted: results.length,
        failed: results.length - succeeded,
        succeeded,
    };
};
