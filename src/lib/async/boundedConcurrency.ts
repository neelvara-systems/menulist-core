export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const limit = Number.isFinite(concurrency)
        ? Math.max(1, Math.floor(concurrency))
        : 1;
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    async function runNext() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
    }

    const runners = Array.from(
        { length: Math.min(limit, items.length) },
        () => runNext(),
    );

    await Promise.all(runners);
    return results;
}
