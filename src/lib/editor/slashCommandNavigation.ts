export type SlashCommandDirection = -1 | 1;

export function getNextSlashCommandIndex(
    currentIndex: number,
    itemCount: number,
    direction: SlashCommandDirection,
): number | null {
    if (!Number.isInteger(itemCount) || itemCount <= 0) return null;

    const normalizedCurrent = Number.isInteger(currentIndex)
        ? ((currentIndex % itemCount) + itemCount) % itemCount
        : 0;
    return (normalizedCurrent + direction + itemCount) % itemCount;
}
