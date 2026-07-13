import * as functions from 'firebase-functions';
import { KnowledgeBaseGeneratedFaq, ProcessedArticleToSave, ProcessedKBArticle, ProcessedKBCategory, ProcessedKBMap, ProcessedKBSection } from '../types';
import { tiptapToText } from './tiptapUtils';

const MAX_GENERATED_RESPONSE_BYTES = 1024 * 1024;
const MAX_GENERATED_CATEGORIES = 20;
const MAX_GENERATED_SECTIONS = 60;
const MAX_GENERATED_ARTICLES = 40;
const MAX_GENERATED_CONTENT_BYTES = 40 * 1024;
const RESERVED_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_TIPTAP_NODE_TYPES = new Set([
    'paragraph',
    'heading',
    'bulletList',
    'orderedList',
    'listItem',
    'text',
    'hardBreak',
    'blockquote',
    'codeBlock',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeText = (value: unknown, maxLength: number): string => {
    if (typeof value !== "string") return "";
    return value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
};

const normalizeMapId = (value: unknown, fallback: string): string => {
    const normalized = normalizeText(value, 100)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized && !RESERVED_OBJECT_KEYS.has(normalized) ? normalized : fallback;
};

const allocateUniqueId = (candidate: unknown, fallback: string, usedIds: Set<string>): string => {
    const base = normalizeMapId(candidate, fallback);
    let next = base;
    let suffix = 2;
    while (usedIds.has(next)) {
        next = `${base}-${suffix}`.slice(0, 100);
        suffix += 1;
    }
    usedIds.add(next);
    return next;
};

function normalizeContent(value: unknown): Record<string, unknown> {
    const rawContent = isRecord(value) && Array.isArray(value.content)
        ? value.content
        : Array.isArray(value) ? value : null;
    if (!rawContent) throw new Error('Generated article content is invalid.');

    let nodeCount = 0;
    const normalizeNode = (node: unknown, depth: number): Record<string, unknown> | null => {
        if (!isRecord(node) || depth > 8 || nodeCount >= 240) return null;
        const type = normalizeText(node.type, 40);
        if (!ALLOWED_TIPTAP_NODE_TYPES.has(type)) return null;
        nodeCount += 1;
        if (type === 'text') {
            const text = normalizeText(node.text, 4_000);
            return text ? { type, text } : null;
        }
        const children = Array.isArray(node.content)
            ? node.content.map(child => normalizeNode(child, depth + 1)).filter(Boolean).slice(0, 80)
            : [];
        const normalized: Record<string, unknown> = { type };
        if (children.length) normalized.content = children;
        if (type === 'heading') {
            const attrs = isRecord(node.attrs) ? node.attrs : {};
            const level = Number(attrs.level);
            normalized.attrs = {
                level: Number.isSafeInteger(level) && level >= 1 && level <= 3 ? level : 2,
            };
        }
        return normalized;
    };

    const content = rawContent
        .map(node => normalizeNode(node, 1))
        .filter((node): node is Record<string, unknown> => Boolean(node))
        .slice(0, 120);
    const result = { type: 'doc', content };
    if (
        !content.length
        || !normalizeText(tiptapToText(result), MAX_GENERATED_CONTENT_BYTES)
        || Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_GENERATED_CONTENT_BYTES
    ) {
        throw new Error('Generated article content is invalid.');
    }
    return result;
}

const normalizeStringList = (value: unknown, maxItems: number, maxLength: number): string[] => {
    const raw = typeof value === "string"
        ? value.split(/[\n,]/)
        : Array.isArray(value) ? value : [];

    return Array.from(new Set(
        raw
            .map(item => normalizeText(item, maxLength).toLowerCase().replace(/[^a-z0-9_\-\s/]/g, "").replace(/\s+/g, "_"))
            .filter(Boolean)
    )).slice(0, maxItems);
};

const normalizeIdList = (value: unknown, maxItems: number, maxLength: number): string[] => {
    const raw = typeof value === "string"
        ? value.split(/[\n,]/)
        : Array.isArray(value) ? value : [];

    return Array.from(new Set(
        raw
            .map(item => normalizeText(item, maxLength).replace(/[^a-zA-Z0-9_\-:.]/g, ""))
            .filter(Boolean)
    )).slice(0, maxItems);
};

const normalizeGeneratedFaqs = (value: unknown): KnowledgeBaseGeneratedFaq[] => {
    const raw = Array.isArray(value) ? value : [];

    return raw
        .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const record = item as Record<string, unknown>;
            const question = normalizeText(record.question, 240);
            const answer = normalizeText(record.answer, 2000);
            if (!question || !answer) return null;

            return {
                question,
                answer,
                tags: normalizeStringList(record.tags, 20, 64),
                contextKeys: normalizeStringList(record.contextKeys, 20, 80),
                entityIds: normalizeIdList(record.entityIds, 25, 160),
                sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : index,
            };
        })
        .filter(Boolean)
        .slice(0, 5) as KnowledgeBaseGeneratedFaq[];
};

export function normalizeProcessedKBData(responseText: unknown): ProcessedKBMap {
    if (typeof responseText !== 'string' || !responseText.trim()) {
        throw new Error('AI response was empty or in an unexpected format.');
    }
    if (Buffer.byteLength(responseText, 'utf8') > MAX_GENERATED_RESPONSE_BYTES) {
        throw new Error('Generated knowledge response is too large.');
    }

    let generatedData: unknown;
    try {
        generatedData = JSON.parse(responseText);
    } catch {
        throw new Error('Generated knowledge response is invalid.');
    }
    if (!isRecord(generatedData)) throw new Error('Generated knowledge response is invalid.');

    const categoryEntries = Object.entries(generatedData);
    if (!categoryEntries.length || categoryEntries.length > MAX_GENERATED_CATEGORIES) {
        throw new Error('Generated knowledge category count is invalid.');
    }

    const kb: ProcessedKBMap = {};
    const usedCategoryIds = new Set<string>();
    const usedArticleIds = new Set<string>();
    let sectionCount = 0;
    let articleCount = 0;

    const normalizeArticle = (
        value: unknown,
        fallbackId: string,
    ): ProcessedKBArticle => {
        if (!isRecord(value) || articleCount >= MAX_GENERATED_ARTICLES) {
            throw new Error('Generated knowledge article count or shape is invalid.');
        }
        const title = normalizeText(value.title, 240);
        if (!title) throw new Error('Generated article title is invalid.');
        articleCount += 1;
        return {
            id: allocateUniqueId(value.id, fallbackId, usedArticleIds),
            title,
            content: normalizeContent(value.content),
            sources: [],
            generatedFaqs: normalizeGeneratedFaqs(value.faqs ?? value.generatedFaqs),
        };
    };

    categoryEntries.forEach(([rawCategoryId, rawCategory], categoryIndex) => {
        if (!isRecord(rawCategory)) throw new Error('Generated category shape is invalid.');
        const title = normalizeText(rawCategory.title, 160);
        if (!title) throw new Error('Generated category title is invalid.');
        const categoryId = allocateUniqueId(
            rawCategory.id ?? rawCategoryId,
            `category-${categoryIndex + 1}`,
            usedCategoryIds,
        );
        const directArticles = Array.isArray(rawCategory.articles) ? rawCategory.articles : [];
        const rawSections = Array.isArray(rawCategory.sections) ? rawCategory.sections : [];
        if (directArticles.length > 0 && rawSections.length > 0) {
            throw new Error('Generated category cannot mix direct articles and sections.');
        }

        const category: ProcessedKBCategory = {
            id: categoryId,
            title,
            description: normalizeText(rawCategory.description, 500),
            sections: [],
            articles: [],
        };

        if (rawSections.length > 0) {
            const usedSectionIds = new Set<string>();
            for (let sectionIndex = 0; sectionIndex < rawSections.length; sectionIndex += 1) {
                if (sectionCount >= MAX_GENERATED_SECTIONS) {
                    throw new Error('Generated knowledge section count is invalid.');
                }
                const rawSection = rawSections[sectionIndex];
                if (!isRecord(rawSection)) throw new Error('Generated section shape is invalid.');
                const sectionTitle = normalizeText(rawSection.title, 160);
                if (!sectionTitle || !Array.isArray(rawSection.articles)) {
                    throw new Error('Generated section is invalid.');
                }
                sectionCount += 1;
                const sectionId = allocateUniqueId(
                    rawSection.id,
                    `section-${categoryIndex + 1}-${sectionIndex + 1}`,
                    usedSectionIds,
                );
                const section: ProcessedKBSection = {
                    id: sectionId,
                    title: sectionTitle,
                    description: normalizeText(rawSection.description, 500),
                    articles: rawSection.articles.map((article, articleIndex) => normalizeArticle(
                        article,
                        `article-${categoryIndex + 1}-${sectionIndex + 1}-${articleIndex + 1}`,
                    )),
                };
                category.sections!.push(section);
            }
        } else {
            category.articles = directArticles.map((article, articleIndex) => normalizeArticle(
                article,
                `article-${categoryIndex + 1}-${articleIndex + 1}`,
            ));
        }
        kb[categoryId] = category;
    });

    if (articleCount === 0) throw new Error('Generated knowledge did not contain usable articles.');
    return kb;
}

// type VectorInstance = InstanceType<typeof Vector>;
export function normalizeVector(vector: number[]): number[] {
    if (!Array.isArray(vector) || vector.length === 0 || vector.length > 3072) {
        throw new Error('Embedding vector shape is invalid.');
    }
    if (!vector.every(value => typeof value === 'number' && Number.isFinite(value))) {
        throw new Error('Embedding vector contains invalid values.');
    }
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (!Number.isFinite(norm) || norm <= 0) throw new Error('Embedding vector norm is invalid.');
    return vector.map(val => val / norm);
}

export function mergeArticleIdAfterProcessing(categoryMap: ProcessedKBMap, article: ProcessedArticleToSave): ProcessedKBMap {
    const logger = functions.logger;
    const category = categoryMap[article.categoryId];

    if (!category) {
        logger.error(`No category found for article ${article.id} (categoryId=${article.categoryId})`);
        return categoryMap;
    }

    if (article.sectionId) {
        const section = category.sections?.find((s) => s.id === article.sectionId);
        if (!section) {
            logger.error(`No section ${article.sectionId} found in category ${article.categoryId}`);
            return categoryMap;
        }

        if (!section.articles) {
            logger.error(`Section ${section.id} has no articles array`);
            return categoryMap;
        }

        const idx = section.articles.findIndex((a) => a.id === article.processedId);
        if (idx === -1) {
            logger.warn(`Could not find article titled "${article.title}" in section ${section.id}`);
            return categoryMap;
        }

        section.articles[idx].id = article.id;
    } else {
        if (!category.articles) {
            logger.error(`Category ${category.id} has no articles array`);
            return categoryMap;
        }

        const idx = category.articles.findIndex((a) => a.id === article.processedId);
        if (idx === -1) {
            logger.warn(`Could not find article titled "${article.title}" in category ${category.id}`);
            return categoryMap;
        }

        category.articles[idx].id = article.id;
    }

    return categoryMap;
}
