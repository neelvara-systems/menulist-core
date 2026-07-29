export type ActiveSortable = {
    active?: boolean;
};

export const sortByActive = <T extends ActiveSortable>(
    data: readonly T[] | null | undefined,
): T[] => {
    if (!data) return [];
    const sortedData = [...data].sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return 0;
    });
    return sortedData;
};
