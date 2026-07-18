export const ANSWERLATTICE_CACHE_SOURCES = {
    KB: 'kb',
    CANONICAL: 'canonical',
} as const;

export type AnswerlatticeCacheSource = typeof ANSWERLATTICE_CACHE_SOURCES[keyof typeof ANSWERLATTICE_CACHE_SOURCES];

export type AnswerlatticeCacheSourceVersions = Partial<Record<AnswerlatticeCacheSource, number>>;

export const getAnswerlatticeCacheVersionDocId = (
    source: AnswerlatticeCacheSource,
    tId: number,
    sId: number,
) => `${source}_${Number(tId)}_${Number(sId)}`;

export const normalizeCacheVersion = (value: unknown): number | undefined => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : undefined;
    }
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return undefined;
    const version = Number(value);
    return Number.isSafeInteger(version) ? version : undefined;
};
