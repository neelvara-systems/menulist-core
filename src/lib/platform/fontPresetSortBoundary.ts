import type { FontPresetsType } from '@type/assets';

export type SortableFontPreset = FontPresetsType & {
    uid: string;
};

export const createSortableFontPresetList = (
    fonts: readonly FontPresetsType[],
    createUid: () => string,
): SortableFontPreset[] => fonts.map((font) => ({
    ...font,
    uid: createUid(),
}));

export const reorderSortableFontPresetList = (
    fonts: readonly SortableFontPreset[],
    activeId: string,
    overId: string,
): SortableFontPreset[] => {
    const activeIndex = fonts.findIndex(({ uid }) => uid === activeId);
    const overIndex = fonts.findIndex(({ uid }) => uid === overId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
        return [...fonts];
    }

    const reordered = [...fonts];
    const [activeFont] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, activeFont);
    return reordered.map((font, index) => ({
        ...font,
        index,
    }));
};

export const removeSortableFontPresetUids = (
    fonts: readonly SortableFontPreset[],
): FontPresetsType[] => fonts.map(({ uid: _uid, ...font }) => ({ ...font }));
