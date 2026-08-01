export const DEFAULT_DIGITAL_SCREEN_ACCENT_COLOR = "#f4b740";

const normalizeScreenCacheInteger = (value: unknown): number | null => {
    if (typeof value === "number") {
        return Number.isSafeInteger(value) && value >= 0 ? value : null;
    }
    if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value)) {
        return null;
    }
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && String(numeric) === value ? numeric : null;
};

export function shouldUseDigitalScreenOfflineCache(input: {
    cachedContentVersion: unknown;
    cachedEntryCount: unknown;
    initialContentVersion: number;
    online: boolean;
}): boolean {
    const cachedContentVersion = normalizeScreenCacheInteger(input.cachedContentVersion);
    const cachedEntryCount = normalizeScreenCacheInteger(input.cachedEntryCount);
    return input.online === false
        && Number.isSafeInteger(input.initialContentVersion)
        && input.initialContentVersion >= 0
        && cachedContentVersion === input.initialContentVersion
        && cachedEntryCount !== null
        && cachedEntryCount > 0;
}

export function getMenuBoardLayout(viewportWidth: number, viewportHeight: number) {
    const safeWidth = Number.isFinite(viewportWidth) ? Math.max(1, viewportWidth) : 1920;
    const safeHeight = Number.isFinite(viewportHeight) ? Math.max(1, viewportHeight) : 1080;
    const columnCount = safeWidth <= 1100 || safeHeight > safeWidth
        ? 1
        : safeWidth >= 1600
            ? 3
            : 2;
    const itemsPerColumn = columnCount === 1
        ? safeHeight <= 800
            ? 7
            : safeHeight <= 1100
                ? 12
                : 14
        : safeHeight <= 800
            ? 11
            : safeHeight <= 1000
                ? 10
                : 12;
    return { columnCount, itemsPerColumn };
}

export function getLeastUsedFittingScreenColumn(
    usedSlots: number[],
    requiredSlots: number,
    capacity: number,
): number {
    return usedSlots
        .map((slots, index) => ({ index, slots }))
        .filter(({ slots }) => slots + requiredSlots <= capacity)
        .sort((left, right) => left.slots - right.slots || left.index - right.index)[0]?.index ?? -1;
}

export function getFittingScreenColumnAssignments(
    requiredSlots: number[],
    capacity: number,
    columnCount: number,
): number[] | null {
    const safeCapacity = Math.max(1, Math.floor(capacity));
    const safeColumnCount = Math.max(1, Math.floor(columnCount));
    const slots = requiredSlots.map((value) => (
        Number.isFinite(value)
            ? Math.max(1, Math.floor(value))
            : safeCapacity + 1
    ));

    if (
        slots.some((value) => value > safeCapacity)
        || slots.reduce((total, value) => total + value, 0) > safeCapacity * safeColumnCount
    ) {
        return null;
    }

    const orderedSlots = slots
        .map((value, index) => ({ index, value }))
        .sort((left, right) => right.value - left.value || left.index - right.index);
    const usedSlots = Array.from({ length: safeColumnCount }, () => 0);
    const assignments = Array.from({ length: slots.length }, () => -1);
    const failedStates = new Set<string>();

    const assignNext = (position: number): boolean => {
        if (position >= orderedSlots.length) return true;

        const stateKey = `${position}:${[...usedSlots].sort((a, b) => a - b).join(",")}`;
        if (failedStates.has(stateKey)) return false;

        const slot = orderedSlots[position];
        const candidateColumns = usedSlots
            .map((used, index) => ({ index, used }))
            .sort((left, right) => left.used - right.used || left.index - right.index);
        const attemptedLoads = new Set<number>();

        for (const column of candidateColumns) {
            if (
                attemptedLoads.has(column.used)
                || column.used + slot.value > safeCapacity
            ) {
                continue;
            }
            attemptedLoads.add(column.used);
            usedSlots[column.index] += slot.value;
            assignments[slot.index] = column.index;

            if (assignNext(position + 1)) return true;

            assignments[slot.index] = -1;
            usedSlots[column.index] -= slot.value;
        }

        failedStates.add(stateKey);
        return false;
    };

    return assignNext(0) ? assignments : null;
}

export function getSmallestFittingScreenColumnCount(
    requiredSlots: number[],
    capacity: number,
    maximumColumns: number,
    minimumColumns = 1,
): number {
    const safeMaximum = Math.max(1, Math.floor(maximumColumns));
    const safeMinimum = Math.min(
        safeMaximum,
        Math.max(1, Math.floor(minimumColumns)),
    );
    const safeCapacity = Math.max(1, Math.floor(capacity));

    for (let columnCount = safeMinimum; columnCount <= safeMaximum; columnCount += 1) {
        if (
            getFittingScreenColumnAssignments(
                requiredSlots,
                safeCapacity,
                columnCount,
            ) !== null
        ) {
            return columnCount;
        }
    }

    return safeMaximum;
}
