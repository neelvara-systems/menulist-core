import { ARTICLE_STATUS, type KnowledgeBaseArticleType, type KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import type { ChangelogEntry, ChangelogPage } from '@type/changelog';

export type AnswerlatticePublicArticle = {
    id: string;
    active: true;
    categoryId: string;
    sectionId: string;
    categoryTitle: string;
    sectionTitle: string;
    title: string;
    index: number;
    url: string;
    content: unknown;
    tags: string[];
    modifiedOn: string;
    likes: number;
    dislikes: number;
};
export type AnswerlatticeReadableArticle = KnowledgeBaseArticleType | AnswerlatticePublicArticle;

export type AnswerlatticePublicChangelogEntry = {
    id: string;
    title: string;
    description: unknown;
    tags: string[];
    releasedOn: string;
    version: string | null;
    likes: number;
    dislikes: number;
    files: Array<{ name: string; url: string; size: number | null; type: string | null; uid: string | null }>;
    kbSources: Array<{ categoryId: string; sectionId: string | null; articleId: string | null }>;
    youtubeLinks: string[];
};

export type AnswerlatticePublicChangelogPage = {
    id: string;
    pageNumber: number;
    nextPageId: string | null;
    entries: AnswerlatticePublicChangelogEntry[];
    entryIds: string[];
};
export type AnswerlatticeReadableChangelogEntry = ChangelogEntry | AnswerlatticePublicChangelogEntry;
export type AnswerlatticeReadableChangelogPage = ChangelogPage | AnswerlatticePublicChangelogPage;

const ARTICLE_KEYS = ['id', 'active', 'categoryId', 'sectionId', 'categoryTitle', 'sectionTitle', 'title', 'index', 'url', 'content', 'tags', 'modifiedOn', 'likes', 'dislikes'];
const CHANGELOG_ENTRY_KEYS = ['id', 'title', 'description', 'tags', 'releasedOn', 'version', 'likes', 'dislikes', 'files', 'kbSources', 'youtubeLinks'];
const CHANGELOG_PAGE_KEYS = ['id', 'pageNumber', 'nextPageId', 'entries', 'entryIds'];
const MAX_CONTENT_JSON_BYTES = 512 * 1024;
const MAX_CHANGELOG_ENTRIES = 100;

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: string[]) => (
    keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
    && Object.keys(value).every(key => keys.includes(key))
);
const boundedString = (value: unknown, max: number, allowEmpty = false): string | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return (allowEmpty || normalized.length > 0) && normalized.length <= max ? normalized : null;
};
const boundedInt = (value: unknown, min: number, max: number): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : null
);
const boundedCounter = (value: unknown): number | null => boundedInt(value, 0, 1_000_000_000);
const boundedStrings = (value: unknown, maxItems: number, maxLength: number): string[] | null => {
    if (!Array.isArray(value) || value.length > maxItems) return null;
    const items = value.map(item => boundedString(item, maxLength));
    return items.every((item): item is string => item !== null) ? Array.from(new Set(items)) : null;
};
const boundedJson = (value: unknown): unknown | null => {
    if (!value || (typeof value !== 'object')) return null;
    try {
        return JSON.stringify(value).length <= MAX_CONTENT_JSON_BYTES ? value : null;
    } catch {
        return null;
    }
};
const toIsoDate = (value: unknown): string | null => {
    try {
        if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            if (typeof record.toDate === 'function') {
                const date = (record.toDate as () => Date)();
                return Number.isFinite(date.getTime()) ? date.toISOString() : null;
            }
            const seconds = typeof record.seconds === 'number' ? record.seconds : record._seconds;
            if (typeof seconds === 'number' && Number.isSafeInteger(seconds)) {
                const nanoseconds = typeof record.nanoseconds === 'number' ? record.nanoseconds : record._nanoseconds;
                const date = new Date((seconds * 1000) + (typeof nanoseconds === 'number' ? Math.floor(nanoseconds / 1_000_000) : 0));
                return Number.isFinite(date.getTime()) ? date.toISOString() : null;
            }
        }
        if (typeof value !== 'string') return null;
        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticePublicArticle = (value: unknown): AnswerlatticePublicArticle | null => {
    if (!isRecord(value) || !hasExactKeys(value, ARTICLE_KEYS) || value.active !== true) return null;
    const id = boundedString(value.id, 180);
    const categoryId = boundedString(value.categoryId, 180);
    const sectionId = boundedString(value.sectionId, 180, true);
    const categoryTitle = boundedString(value.categoryTitle, 240);
    const sectionTitle = boundedString(value.sectionTitle, 240, true);
    const title = boundedString(value.title, 300);
    const index = boundedInt(value.index, 0, 100_000);
    const url = boundedString(value.url, 300);
    const content = boundedJson(value.content);
    const tags = boundedStrings(value.tags, 30, 80);
    const modifiedOn = toIsoDate(value.modifiedOn);
    const likes = boundedCounter(value.likes);
    const dislikes = boundedCounter(value.dislikes);
    if (!id || !categoryId || sectionId === null || !categoryTitle || sectionTitle === null || !title || index === null || !url || !content || !tags || !modifiedOn || likes === null || dislikes === null) return null;
    return { id, active: true, categoryId, sectionId, categoryTitle, sectionTitle, title, index, url, content, tags, modifiedOn, likes, dislikes };
};

export const projectAnswerlatticePublicArticle = (value: unknown, id: string, scope: { tId: number; sId: number }) => {
    if (!isRecord(value) || value.tId !== scope.tId || value.sId !== scope.sId || value.active === false || value.status !== ARTICLE_STATUS.PUBLISHED) return null;
    return normalizeAnswerlatticePublicArticle({
        id,
        active: true,
        categoryId: value.categoryId,
        sectionId: value.sectionId ?? '',
        categoryTitle: value.categoryTitle,
        sectionTitle: value.sectionTitle ?? '',
        title: value.title,
        index: value.index,
        url: value.url ?? id,
        content: value.content,
        tags: value.tags ?? [],
        modifiedOn: value.modifiedOn,
        likes: value.likes ?? 0,
        dislikes: value.dislikes ?? 0,
    });
};

const normalizeArticleMeta = (value: unknown) => {
    if (!isRecord(value)) return null;
    const id = boundedString(value.id, 180);
    const title = boundedString(value.title, 300);
    const url = boundedString(value.url, 300);
    const index = boundedInt(value.index, 0, 100_000);
    if (!id || !title || !url || index === null || value.active === false) return null;
    return { id, active: true, title, index, url };
};

export const normalizeAnswerlatticePublicCategories = (value: unknown): KnowledgeBaseCategoriesType | null => {
    if (!isRecord(value) || !isRecord(value.categories) || Object.keys(value).some(key => key !== 'categories')) return null;
    const categories: KnowledgeBaseCategoriesType['categories'] = Object.create(null);
    const rawCategories = Object.entries(value.categories);
    if (rawCategories.length > 100) return null;
    for (const [mapId, rawCategory] of rawCategories) {
        if (!isRecord(rawCategory)) return null;
        const id = boundedString(rawCategory.id, 180);
        const title = boundedString(rawCategory.title, 240);
        const description = boundedString(rawCategory.description ?? '', 2_000, true);
        const icon = boundedString(rawCategory.icon ?? '', 120, true);
        const url = boundedString(rawCategory.url, 300);
        const index = boundedInt(rawCategory.index, 0, 100_000);
        if (!id || id !== mapId || !title || description === null || icon === null || !url || index === null || rawCategory.active === false) return null;
        const articles = (Array.isArray(rawCategory.articles) ? rawCategory.articles : []).map(normalizeArticleMeta);
        const rawSections = Array.isArray(rawCategory.sections) ? rawCategory.sections : [];
        if (articles.some(item => !item) || articles.length > 500 || rawSections.length > 100) return null;
        const sections = rawSections.map(rawSection => {
            if (!isRecord(rawSection) || rawSection.active === false) return null;
            const sectionId = boundedString(rawSection.id, 180);
            const sectionTitle = boundedString(rawSection.title, 240);
            const sectionDescription = boundedString(rawSection.description ?? '', 2_000, true);
            const sectionUrl = boundedString(rawSection.url, 300);
            const sectionIndex = boundedInt(rawSection.index, 0, 100_000);
            const sectionArticles = (Array.isArray(rawSection.articles) ? rawSection.articles : []).map(normalizeArticleMeta);
            if (!sectionId || !sectionTitle || sectionDescription === null || !sectionUrl || sectionIndex === null || sectionArticles.some(item => !item) || sectionArticles.length > 500) return null;
            return { id: sectionId, title: sectionTitle, description: sectionDescription, active: true, url: sectionUrl, index: sectionIndex, articles: sectionArticles.filter((item): item is NonNullable<typeof item> => item !== null) };
        });
        if (sections.some(section => !section)) return null;
        categories[id] = { id, title, description, icon, url, active: true, index, articles: articles.filter((item): item is NonNullable<typeof item> => item !== null), sections: sections.filter((item): item is NonNullable<typeof item> => item !== null) };
    }
    return { categories };
};

const normalizePublicFile = (value: unknown) => {
    if (!isRecord(value)) return null;
    const name = boundedString(value.name ?? 'Attachment', 240);
    const url = boundedString(value.url, 2_000);
    const size = value.size == null ? null : boundedInt(value.size, 0, 100_000_000);
    const type = value.type == null ? null : boundedString(value.type, 120);
    const uid = value.uid == null ? null : boundedString(value.uid, 180);
    return name && url && (value.size == null || size !== null) && (value.type == null || type) && (value.uid == null || uid) ? { name, url, size, type, uid } : null;
};
const normalizeKbSource = (value: unknown) => {
    if (!isRecord(value)) return null;
    const categoryId = boundedString(value.categoryId, 180);
    const sectionId = value.sectionId == null ? null : boundedString(value.sectionId, 180);
    const articleId = value.articleId == null ? null : boundedString(value.articleId, 180);
    return categoryId && (value.sectionId == null || sectionId) && (value.articleId == null || articleId) ? { categoryId, sectionId, articleId } : null;
};

export const normalizeAnswerlatticePublicChangelogEntry = (value: unknown): AnswerlatticePublicChangelogEntry | null => {
    if (!isRecord(value) || !hasExactKeys(value, CHANGELOG_ENTRY_KEYS)) return null;
    const id = boundedString(value.id, 180);
    const title = boundedString(value.title, 300);
    const description = boundedJson(value.description);
    const tags = boundedStrings(value.tags, 20, 80);
    const releasedOn = toIsoDate(value.releasedOn);
    const version = value.version == null ? null : boundedString(value.version, 80);
    const likes = boundedCounter(value.likes);
    const dislikes = boundedCounter(value.dislikes);
    const files = Array.isArray(value.files) && value.files.length <= 20 ? value.files.map(normalizePublicFile) : [];
    const kbSources = Array.isArray(value.kbSources) && value.kbSources.length <= 50 ? value.kbSources.map(normalizeKbSource) : [];
    const youtubeLinks = boundedStrings(value.youtubeLinks, 20, 2_000);
    if (!id || !title || !description || !tags || !releasedOn || (value.version != null && !version) || likes === null || dislikes === null || files.some(item => !item) || kbSources.some(item => !item) || !youtubeLinks) return null;
    return { id, title, description, tags, releasedOn, version, likes, dislikes, files: files.filter((item): item is NonNullable<typeof item> => item !== null), kbSources: kbSources.filter((item): item is NonNullable<typeof item> => item !== null), youtubeLinks };
};

export const projectAnswerlatticePublicChangelogEntry = (value: unknown, id: string) => {
    if (!isRecord(value) || value.published === false) return null;
    return normalizeAnswerlatticePublicChangelogEntry({ id, title: value.title, description: value.description, tags: value.tags ?? [], releasedOn: value.releasedOn, version: value.version ?? null, likes: value.likes ?? 0, dislikes: value.dislikes ?? 0, files: value.files ?? [], kbSources: value.kbSources ?? [], youtubeLinks: value.youtubeLinks ?? [] });
};

export const normalizeAnswerlatticePublicChangelogPage = (value: unknown): AnswerlatticePublicChangelogPage | null => {
    if (!isRecord(value) || !hasExactKeys(value, CHANGELOG_PAGE_KEYS) || !Array.isArray(value.entries) || value.entries.length > MAX_CHANGELOG_ENTRIES) return null;
    const id = boundedString(value.id, 180);
    const pageNumber = boundedInt(value.pageNumber, 1, 1_000_000);
    const nextPageId = value.nextPageId == null ? null : boundedString(value.nextPageId, 180);
    const entries = value.entries.map(normalizeAnswerlatticePublicChangelogEntry);
    if (!id || pageNumber === null || (value.nextPageId != null && !nextPageId) || entries.some(entry => !entry)) return null;
    const validEntries = entries.filter((entry): entry is AnswerlatticePublicChangelogEntry => entry !== null);
    const entryIds = validEntries.map(entry => entry.id);
    if (!Array.isArray(value.entryIds) || JSON.stringify(value.entryIds) !== JSON.stringify(entryIds)) return null;
    return { id, pageNumber, nextPageId, entries: validEntries, entryIds };
};

export const projectAnswerlatticePublicChangelogPage = (value: unknown, id: string): AnswerlatticePublicChangelogPage | null => {
    if (!isRecord(value) || !Array.isArray(value.entries)) return null;
    const entries = value.entries.map((entry, index) => projectAnswerlatticePublicChangelogEntry(entry, isRecord(entry) && typeof entry.id === 'string' ? entry.id : `${id}-${index}`)).filter((entry): entry is AnswerlatticePublicChangelogEntry => entry !== null);
    return normalizeAnswerlatticePublicChangelogPage({ id, pageNumber: value.pageNumber, nextPageId: value.nextPageId ?? null, entries, entryIds: entries.map(entry => entry.id) });
};
