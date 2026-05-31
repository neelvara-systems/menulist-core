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
    const version = Number(value);
    return Number.isFinite(version) && version > 0 ? version : undefined;
};
