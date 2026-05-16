export const CANONICA_CACHE_SOURCES = {
    KB: 'kb',
    CANONICAL: 'canonical',
} as const;

export type CanonicaCacheSource = typeof CANONICA_CACHE_SOURCES[keyof typeof CANONICA_CACHE_SOURCES];

export type CanonicaCacheSourceVersions = Partial<Record<CanonicaCacheSource, number>>;

export const getCanonicaCacheVersionDocId = (
    source: CanonicaCacheSource,
    tId: number,
    sId: number,
) => `${source}_${Number(tId)}_${Number(sId)}`;

export const normalizeCacheVersion = (value: unknown): number | undefined => {
    const version = Number(value);
    return Number.isFinite(version) && version > 0 ? version : undefined;
};
