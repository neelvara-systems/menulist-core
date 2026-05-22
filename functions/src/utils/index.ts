import * as functions from 'firebase-functions';
import { KnowledgeBaseGeneratedFaq, ProcessedArticleToSave, ProcessedKBArticle, ProcessedKBCategory, ProcessedKBMap, ProcessedKBSection } from '../types';

function normalizeContent(article: ProcessedKBArticle) {
    const rawContent = article.content;

    // Case 1: Already a proper doc
    if (rawContent?.type === "doc" && Array.isArray(rawContent.content)) {
        return rawContent;
    }

    // Case 2: AI only returned the `content` array
    if (Array.isArray(rawContent?.content)) {
        return { type: "doc", content: rawContent.content };
    }

    // Case 3: AI returned directly an array
    if (Array.isArray(rawContent)) {
        return { type: "doc", content: rawContent };
    }

    // Fallback: empty doc
    return { type: "doc", content: [] };
}

const normalizeText = (value: unknown, maxLength: number): string => {
    if (typeof value !== "string") return "";
    return value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
};

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

export function normalizeProcessedKBData(responseText: any): ProcessedKBMap {

    if (!responseText) throw new Error("AI response was empty or in an unexpected format.");

    const generatedData = JSON.parse(responseText);

    if (!generatedData || typeof generatedData !== "object") {
        throw new Error("AI returned empty or invalid KB data");
    }

    const kb: ProcessedKBMap = {};

    for (const [tempCategoryId, cat] of Object.entries<any>(generatedData)) {
        // ---- Category ----
        if (!cat?.title) {
            functions.logger.warn(`Skipping category ${tempCategoryId} (missing title)`);
            continue;
        }

        const category: ProcessedKBCategory = {
            id: cat.id || tempCategoryId,
            title: String(cat.title).trim(),
            description: cat.description || "",
            sections: [],
            articles: [],
        };

        // ---- Sections ----
        if (Array.isArray(cat.sections)) {
            for (const section of cat.sections) {
                if (!section?.title) {
                    functions.logger.warn(`Skipping section in category ${category.id} (missing title)`);
                    continue;
                }
                const sec: ProcessedKBSection = {
                    id: section.id || crypto.randomUUID(),
                    title: String(section.title).trim(),
                    description: section.description || "",
                    articles: [],
                };

                // ---- Section Articles ----
                if (Array.isArray(section.articles)) {
                    for (const art of section.articles) {
                        if (!art?.title || !art?.content) {
                            functions.logger.warn(`Skipping article in section ${sec.id} (missing title/content)`);
                            continue;
                        }
                        sec.articles.push({
                            id: art.id || crypto.randomUUID(),
                            title: String(art.title).trim(),
                            content: normalizeContent(art),
                            sources: [],  // Sources are added later during embedding
                            generatedFaqs: normalizeGeneratedFaqs(art.faqs || art.generatedFaqs),
                        });
                    }
                }
                category.sections!.push(sec);
            }
        }

        // ---- Articles directly under category ----
        if (Array.isArray(cat.articles)) {
            for (const art of cat.articles) {
                if (!art?.title || !art?.content) {
                    functions.logger.warn(`Skipping article in category ${category.id} (missing title/content)`);
                    continue;
                }
                category.articles!.push({
                    id: art.id || crypto.randomUUID(),
                    title: String(art.title).trim(),
                    content: normalizeContent(art),
                    sources: [],  // Sources are added later during embedding
                    generatedFaqs: normalizeGeneratedFaqs(art.faqs || art.generatedFaqs),
                });
            }
        }

        kb[category.id] = category;
    }

    return kb;
}

// type VectorInstance = InstanceType<typeof Vector>;
export function normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return vector; // edge case: zero vector
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
