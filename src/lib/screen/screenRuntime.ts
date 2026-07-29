export function shouldUseDigitalScreenOfflineCache(input: {
    cachedContentVersion: unknown;
    cachedEntryCount: unknown;
    initialContentVersion: number;
    online: boolean;
}): boolean {
    return input.online === false
        && Number(input.cachedContentVersion) === input.initialContentVersion
        && Number.isSafeInteger(Number(input.cachedEntryCount))
        && Number(input.cachedEntryCount) > 0;
}

export function getMenuBoardLayout(viewportWidth: number, viewportHeight: number) {
    const safeWidth = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : 1920;
    const safeHeight = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 1080;
    const columnCount = safeWidth <= 1100 || safeHeight > safeWidth
        ? 1
        : safeWidth >= 1600
            ? 3
            : 2;
    const itemsPerColumn = safeHeight <= 800
        ? 8
        : safeHeight <= 1000
            ? 10
            : 12;
    return { columnCount, itemsPerColumn };
}
