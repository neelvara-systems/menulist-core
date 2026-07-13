import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { ANSWERLATTICE_AI_ACTIONS, extractGeminiResultText, extractGeminiUsageMetadata, recordGeminiCallOperation } from '../answerlattice/aiOperationAccounting';
import {
    ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
    ANSWERLATTICE_EMBEDDING_VECTOR_FIELD,
    ANSWERLATTICE_TEXT_MODEL,
} from '../constants/ai';
import { firestoreAdmin, storageAdmin } from '../firebaseAdmin';
import { answerlatticeGenAIClient } from '../genAiClient';
import { ANSWERLATTICE_LEGACY_EMBEDDING_CONFIG } from '../sharedData/answerlatticeEmbedding';
import {
    ARTICLE_RECONCILIATION_STATUS,
    ARTICLE_STATUS,
    INGESTION_JOB_COLLECTION,
    INGESTION_JOB_STATUS,
    IngestionJob,
    IngestionJobCategoriesMap,
    IngestionJobArticleToReview,
    IngestionJobSourceFile,
    KB_ARTICLES_COLLECTION,
    KnowledgeBaseArticleSource,
    ProcessedArticleToSave,
    ProcessedKBMap,
} from '../types';
import { generateEmbeddingMigrationVectors } from '../utils/aiUtils';
import { tiptapToText } from '../utils/tiptapUtils';
import { getAnswerlatticeEmbeddingInput } from './embeddingSourceBoundary';

const PRODUCT_ID = 'AL';
const MAX_SOURCE_FILES = 8;
const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_GENERATED_CATEGORIES = 20;
const MAX_GENERATED_SECTIONS = 60;
const MAX_GENERATED_ARTICLES = 40;
const MAX_GENERATED_RESPONSE_BYTES = 1024 * 1024;
const MAX_REVIEW_NAVIGATION_BYTES = 300 * 1024;
const MAX_EXISTING_ARTICLE_SUMMARIES = 100;
const GENERATION_LEASE_MS = 15 * 60 * 1000;
const GENERATION_FAILED_MESSAGE = 'Knowledge generation failed';
const ALLOWED_SOURCE_MIME_TYPES = new Set([
    'application/json',
    'application/msword',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/xml',
    'text/csv',
    'text/html',
    'text/markdown',
    'text/plain',
    'text/xml',
]);

type Scope = { tId: number; sId: number };
type ValidatedSourceFile = IngestionJobSourceFile & {
    byteSize: number;
    mimeType: string;
    storagePath: string;
};
type GeneratedArticleRef = {
    article: Record<string, unknown>;
    categoryId: string;
    categoryTitle: string;
    sectionId: string;
    sectionTitle: string;
};
type ExistingArticleSummary = {
    id: string;
    title: string;
    categoryTitle: string;
    sectionTitle: string;
    status: string;
    active: boolean;
    score?: number;
};

function cleanText(value: unknown, maxLength: number): string {
    return String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const id = value.trim();
    if (id !== value || !id || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) return null;
    return id;
}

function normalizeScopeId(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 && String(id) === raw ? id : null;
}

function normalizeMapId(value: unknown, fallback: string): string {
    const normalized = cleanText(value, 100)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function isAllowedSourceMimeType(mimeType: string): boolean {
    return ALLOWED_SOURCE_MIME_TYPES.has(mimeType)
        || mimeType.startsWith('image/')
        || mimeType.startsWith('audio/')
        || mimeType.startsWith('video/');
}

function validateSourcePath(storagePath: unknown, scope: Scope): string | null {
    if (typeof storagePath !== 'string') return null;
    const normalized = storagePath.trim();
    if (
        !normalized
        || normalized.startsWith('/')
        || normalized.includes('..')
        || normalized.includes('\\')
        || !normalized.startsWith(`ingestion_source_files/${scope.tId}/${scope.sId}/`)
    ) return null;
    const parts = normalized.split('/');
    return parts.length === 4 && Boolean(parts[3]) ? normalized : null;
}

function sourceTypeFromMime(mimeType: string): KnowledgeBaseArticleSource['type'] {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
}

async function validateSourceFiles(sourceFiles: unknown, scope: Scope): Promise<ValidatedSourceFile[]> {
    if (!Array.isArray(sourceFiles) || sourceFiles.length === 0 || sourceFiles.length > MAX_SOURCE_FILES) {
        throw new Error(`Knowledge generation accepts 1-${MAX_SOURCE_FILES} source files.`);
    }
    const bucket = storageAdmin.bucket();
    const validated: ValidatedSourceFile[] = [];
    let totalBytes = 0;
    for (const raw of sourceFiles) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Knowledge source file is invalid.');
        const source = raw as Record<string, unknown>;
        const storagePath = validateSourcePath(source.storagePath, scope);
        const fileName = cleanText(source.fileName, 180);
        if (!storagePath || !fileName) throw new Error('Knowledge source file is invalid.');
        const [metadata] = await bucket.file(storagePath).getMetadata();
        const byteSize = Number(metadata.size);
        const mimeType = cleanText(metadata.contentType || source.type, 120).toLowerCase();
        if (
            !Number.isSafeInteger(byteSize)
            || byteSize <= 0
            || byteSize > MAX_SOURCE_FILE_BYTES
            || !isAllowedSourceMimeType(mimeType)
        ) {
            throw new Error('Knowledge source file size or type is not supported.');
        }
        totalBytes += byteSize;
        if (totalBytes > MAX_SOURCE_TOTAL_BYTES) throw new Error('Knowledge source files exceed the total upload limit.');
        validated.push({
            ...(source as unknown as IngestionJobSourceFile),
            storagePath,
            fileName,
            mimeType,
            byteSize,
            type: mimeType,
        });
    }
    return validated;
}

function buildGenerationPrompt(sourceFiles: ValidatedSourceFile[]): string {
    const sourceManifest = sourceFiles.map((file, index) => (
        `${index + 1}. name=${file.fileName}; source=${file.gsUri || `gs://source/${file.storagePath}`}; mime=${file.mimeType}`
    )).join('\n');
    return `Create a source-grounded SaaS support knowledge base from the attached files.

Return one JSON object only. Root keys are categories. Each category has id, title, description, and either articles or sections. Each section has id, title, description, articles. Each article has id, title, content as Tiptap JSON {"type":"doc","content":[]}, optional faqs, and sources. Never invent product behavior. Omit unsupported claims. Maximum ${MAX_GENERATED_CATEGORIES} categories and ${MAX_GENERATED_ARTICLES} articles total. FAQ answers must be directly supported by source content.

Available source manifest:
${sourceManifest}`;
}

function normalizeTiptapContent(value: unknown): Record<string, unknown> {
    const input = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const rootContent = Array.isArray(input.content) ? input.content : [];
    let nodeCount = 0;
    const normalizeNode = (node: unknown, depth: number): Record<string, unknown> | null => {
        if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 8 || nodeCount >= 240) return null;
        const record = node as Record<string, unknown>;
        const type = cleanText(record.type, 40);
        const allowed = new Set(['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'text', 'hardBreak', 'blockquote', 'codeBlock']);
        if (!allowed.has(type)) return null;
        nodeCount += 1;
        if (type === 'text') {
            const text = cleanText(record.text, 4_000);
            return text ? { type: 'text', text } : null;
        }
        const children = Array.isArray(record.content)
            ? record.content.map(child => normalizeNode(child, depth + 1)).filter(Boolean).slice(0, 80)
            : [];
        const normalized: Record<string, unknown> = { type };
        if (children.length) normalized.content = children;
        if (type === 'heading') {
            const level = Number((record.attrs as Record<string, unknown> | undefined)?.level);
            normalized.attrs = { level: Number.isSafeInteger(level) && level >= 1 && level <= 3 ? level : 2 };
        }
        return normalized;
    };
    const content = rootContent.map(node => normalizeNode(node, 1)).filter(Boolean).slice(0, 120);
    const result = { type: 'doc', content };
    if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 40_000 || !cleanText(tiptapToText(result), 40_000)) {
        throw new Error('Generated article content is invalid.');
    }
    return result;
}

function normalizeFaqs(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const question = cleanText(record.question, 240);
        const answer = cleanText(record.answer, 2_000);
        if (!question || !answer) return null;
        const list = (nested: unknown, max: number, length: number) => Array.from(new Set(
            (Array.isArray(nested) ? nested : []).map(entry => cleanText(entry, length)).filter(Boolean),
        )).slice(0, max);
        return {
            question,
            answer,
            tags: list(record.tags, 20, 64),
            contextKeys: list(record.contextKeys, 20, 80),
            entityIds: list(record.entityIds, 25, 160),
            sortOrder: Number.isSafeInteger(Number(record.sortOrder)) ? Number(record.sortOrder) : index,
        };
    }).filter(Boolean).slice(0, 5);
}

function normalizeGeneratedKnowledge(rawText: string, sourceFiles: ValidatedSourceFile[]): {
    categories: ProcessedKBMap;
    articleRefs: GeneratedArticleRef[];
} {
    if (Buffer.byteLength(rawText, 'utf8') > MAX_GENERATED_RESPONSE_BYTES) {
        throw new Error('Generated knowledge response is too large.');
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawText);
    } catch {
        throw new Error('Generated knowledge response is invalid.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Generated knowledge response is invalid.');
    const entries = Object.entries(parsed as Record<string, unknown>).slice(0, MAX_GENERATED_CATEGORIES);
    const categories: Record<string, any> = {};
    const articleRefs: GeneratedArticleRef[] = [];
    let sectionCount = 0;
    const normalizedSources: KnowledgeBaseArticleSource[] = sourceFiles.map(file => ({
        type: sourceTypeFromMime(file.mimeType),
        url: file.gsUri || `gs://source/${file.storagePath}`,
        name: file.fileName,
    }));

    const normalizeArticle = (value: unknown, categoryId: string, categoryTitle: string, sectionId: string, sectionTitle: string) => {
        if (articleRefs.length >= MAX_GENERATED_ARTICLES || !value || typeof value !== 'object' || Array.isArray(value)) return null;
        const record = value as Record<string, unknown>;
        const title = cleanText(record.title, 240);
        if (!title) return null;
        const article: Record<string, unknown> = {
            id: normalizeMapId(record.id, `article-${articleRefs.length + 1}`),
            title,
            content: normalizeTiptapContent(record.content),
            sources: normalizedSources,
            generatedFaqs: normalizeFaqs(record.faqs ?? record.generatedFaqs),
            entityIds: [],
        };
        articleRefs.push({ article, categoryId, categoryTitle, sectionId, sectionTitle });
        return article;
    };

    entries.forEach(([key, value], categoryIndex) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const record = value as Record<string, unknown>;
        const title = cleanText(record.title, 160);
        if (!title) return;
        const categoryId = normalizeMapId(record.id ?? key, `category-${categoryIndex + 1}`);
        const direct = Array.isArray(record.articles) ? record.articles : [];
        const rawSections = Array.isArray(record.sections) ? record.sections : [];
        const category: Record<string, unknown> = {
            id: categoryId,
            title,
            description: cleanText(record.description, 500),
            articles: [],
            sections: [],
        };
        if (direct.length > 0 && rawSections.length === 0) {
            category.articles = direct.map(item => normalizeArticle(item, categoryId, title, '', '')).filter(Boolean);
        } else {
            category.sections = rawSections.slice(0, Math.max(0, MAX_GENERATED_SECTIONS - sectionCount)).map((sectionValue, sectionIndex) => {
                if (!sectionValue || typeof sectionValue !== 'object' || Array.isArray(sectionValue)) return null;
                const sectionRecord = sectionValue as Record<string, unknown>;
                const sectionTitle = cleanText(sectionRecord.title, 160);
                if (!sectionTitle) return null;
                sectionCount += 1;
                const sectionId = normalizeMapId(sectionRecord.id, `section-${categoryIndex + 1}-${sectionIndex + 1}`);
                const articles = Array.isArray(sectionRecord.articles) ? sectionRecord.articles : [];
                return {
                    id: sectionId,
                    title: sectionTitle,
                    description: cleanText(sectionRecord.description, 500),
                    articles: articles.map(item => normalizeArticle(item, categoryId, title, sectionId, sectionTitle)).filter(Boolean),
                };
            }).filter(Boolean);
        }
        categories[categoryId] = category;
    });
    if (articleRefs.length === 0) throw new Error('Generated knowledge did not contain usable articles.');
    return { categories: categories as ProcessedKBMap, articleRefs };
}

function buildReviewNavigation(categories: ProcessedKBMap): IngestionJobCategoriesMap {
    const navigation: IngestionJobCategoriesMap = {};
    const toArticleMeta = (
        article: Record<string, unknown>,
        index: number,
        categoryId: string,
        sectionId: string,
    ) => {
        const id = normalizeDocumentId(article.id);
        const title = cleanText(article.title, 240);
        if (!id || !title) throw new Error('Generated article navigation is invalid.');
        return {
            id,
            title,
            active: true,
            index,
            url: `/${categoryId}/${sectionId ? `${sectionId}/` : ''}${id}`,
        };
    };

    Object.entries(categories).forEach(([categoryKey, category], categoryIndex) => {
        const categoryId = normalizeDocumentId(category.id)
            || normalizeMapId(categoryKey, `category-${categoryIndex + 1}`);
        const directArticles = (category.articles || []).map((article, articleIndex) => (
            toArticleMeta(article as unknown as Record<string, unknown>, articleIndex, categoryId, '')
        ));
        const sections = (category.sections || []).map((section, sectionIndex) => {
            const sectionId = normalizeDocumentId(section.id)
                || normalizeMapId(section.id, `section-${categoryIndex + 1}-${sectionIndex + 1}`);
            return {
                id: sectionId,
                title: cleanText(section.title, 160),
                description: cleanText(section.description, 500),
                active: true,
                index: sectionIndex,
                url: `/${categoryId}/${sectionId}`,
                articles: (section.articles || []).map((article, articleIndex) => (
                    toArticleMeta(article as unknown as Record<string, unknown>, articleIndex, categoryId, sectionId)
                )),
            };
        });
        navigation[categoryId] = {
            id: categoryId,
            title: cleanText(category.title, 160),
            description: cleanText(category.description, 500),
            active: true,
            index: categoryIndex,
            url: `/${categoryId}`,
            ...(sections.length > 0 ? { sections } : { articles: directArticles }),
        };
    });

    if (Buffer.byteLength(JSON.stringify(navigation), 'utf8') > MAX_REVIEW_NAVIGATION_BYTES) {
        throw new Error('Generated knowledge navigation is too large to review safely.');
    }
    return navigation;
}

async function uploadSourceToGemini(file: ValidatedSourceFile): Promise<{ name: string; uri: string; mimeType: string }> {
    const tempPath = path.join(os.tmpdir(), `answerlattice-kb-${randomUUID()}`);
    try {
        await storageAdmin.bucket().file(file.storagePath).download({ destination: tempPath });
        const uploaded = await answerlatticeGenAIClient.files.upload({
            file: tempPath,
            config: { mimeType: file.mimeType, displayName: file.fileName },
        });
        if (!uploaded.name || !uploaded.uri || !uploaded.mimeType) throw new Error('Knowledge source upload failed.');
        return { name: uploaded.name, uri: uploaded.uri, mimeType: uploaded.mimeType };
    } finally {
        await fs.unlink(tempPath).catch(() => undefined);
    }
}

async function generateKnowledgeFromSources(sourceFiles: ValidatedSourceFile[], scope: Scope) {
    const uploaded: Array<{ name: string; uri: string; mimeType: string }> = [];
    try {
        for (let index = 0; index < sourceFiles.length; index += 2) {
            const results = await Promise.allSettled(sourceFiles.slice(index, index + 2).map(uploadSourceToGemini));
            for (const result of results) {
                if (result.status === 'fulfilled') uploaded.push(result.value);
            }
            const failed = results.find(result => result.status === 'rejected');
            if (failed?.status === 'rejected') throw failed.reason;
        }
        const prompt = buildGenerationPrompt(sourceFiles);
        const startedAt = Date.now();
        const result = await answerlatticeGenAIClient.models.generateContent({
            model: ANSWERLATTICE_TEXT_MODEL,
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    ...uploaded.map(file => ({ fileData: { fileUri: file.uri, mimeType: file.mimeType } })),
                ],
            }],
            config: {
                responseMimeType: 'application/json',
                maxOutputTokens: 32_768,
            },
        });
        const text = extractGeminiResultText(result);
        if (!text) throw new Error('Knowledge generation returned no content.');
        const usage = extractGeminiUsageMetadata(result, prompt, text);
        await recordGeminiCallOperation({
            action: ANSWERLATTICE_AI_ACTIONS.KB_GENERATION,
            clientResponse: {
                sourceFileCount: sourceFiles.length,
                responseLength: text.length,
            },
            model: ANSWERLATTICE_TEXT_MODEL,
            processingTime: Date.now() - startedAt,
            source: 'answerlattice_kb_generation',
            ...scope,
            usageMetadata: usage,
        });
        return text;
    } finally {
        await Promise.allSettled(uploaded.map(file => answerlatticeGenAIClient.files.delete({ name: file.name })));
    }
}

function titleTokens(value: string): Set<string> {
    return new Set(cleanText(value, 240).toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length >= 3));
}

function titleSimilarity(a: string, b: string): number {
    const left = titleTokens(a);
    const right = titleTokens(b);
    if (!left.size || !right.size) return 0;
    const intersection = Array.from(left).filter(token => right.has(token)).length;
    const union = new Set([...left, ...right]).size;
    return union ? intersection / union : 0;
}

async function loadExistingArticleSummaries(scope: Scope): Promise<ExistingArticleSummary[]> {
    const snapshot = await firestoreAdmin.collection(KB_ARTICLES_COLLECTION)
        .where('pId', '==', PRODUCT_ID)
        .where('tId', '==', scope.tId)
        .where('sId', '==', scope.sId)
        .where('status', '==', ARTICLE_STATUS.PUBLISHED)
        .limit(MAX_EXISTING_ARTICLE_SUMMARIES)
        .select('id', 'title', 'categoryTitle', 'sectionTitle', 'status', 'active', 'pId', 'tId', 'sId')
        .get();
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            title: cleanText(data.title, 240),
            categoryTitle: cleanText(data.categoryTitle, 160),
            sectionTitle: cleanText(data.sectionTitle, 160),
            status: ARTICLE_STATUS.PUBLISHED,
            active: data.active !== false,
        };
    }).filter(item => Boolean(item.title));
}

function findTitleSimilarArticles(title: string, existing: ExistingArticleSummary[]): ExistingArticleSummary[] {
    return existing.map(article => ({ ...article, score: titleSimilarity(title, article.title) }))
        .filter(article => Number(article.score) >= 0.72)
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 3);
}

export async function startGenerationLogic(jobIdInput: string, runIdInput?: string) {
    const jobId = normalizeDocumentId(jobIdInput);
    if (!jobId) throw new Error('Knowledge generation job identity is invalid.');
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);
    const runId = cleanText(runIdInput, 180) || `generation_${randomUUID()}`;
    const startedAt = Timestamp.now();
    const leaseExpiresAt = Timestamp.fromMillis(startedAt.toMillis() + GENERATION_LEASE_MS);
    let scope: Scope | null = null;
    let sourceFiles: ValidatedSourceFile[] = [];

    try {
        const claimedJob = await firestoreAdmin.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(jobRef);
            if (!snapshot.exists) throw new Error('Knowledge generation job is not available.');
            const data = snapshot.data() || {};
            const tId = normalizeScopeId(data.tId ?? data.tenantId);
            const sId = normalizeScopeId(data.sId ?? data.storeId);
            if (
                (data.pId ?? data.productId) !== PRODUCT_ID
                || !tId
                || !sId
                || data.status !== INGESTION_JOB_STATUS.PENDING
            ) {
                return null;
            }
            transaction.set(jobRef, {
                status: INGESTION_JOB_STATUS.PROCESSING,
                errorMessage: null,
                failureStage: null,
                generationRun: {
                    id: runId,
                    status: 'processing',
                    startedAt,
                    leaseExpiresAt,
                    completedAt: null,
                },
                modifiedOn: startedAt,
            }, { merge: true });
            return { data, scope: { tId, sId } };
        });
        if (!claimedJob) return { skipped: true };
        scope = claimedJob.scope;
        sourceFiles = await validateSourceFiles(claimedJob.data.sourceFiles, scope);
        const generatedText = await generateKnowledgeFromSources(sourceFiles, scope);
        const generated = normalizeGeneratedKnowledge(generatedText, sourceFiles);
        const existingArticles = await loadExistingArticleSummaries(scope);
        const articlesToCreate: ProcessedArticleToSave[] = [];
        const articlesToReview: IngestionJobArticleToReview[] = [];

        for (let index = 0; index < generated.articleRefs.length; index += 3) {
            const batch = generated.articleRefs.slice(index, index + 3);
            const processed = await Promise.all(batch.map(async (ref) => {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc();
                const content = ref.article.content;
                const title = cleanText(ref.article.title, 240);
                const vectors = await generateEmbeddingMigrationVectors({
                    id: articleRef.id,
                    categoryTitle: ref.categoryTitle,
                    sectionTitle: ref.sectionTitle,
                    title,
                    content,
                    ...scope!,
                    source: 'answerlattice_kb_generation',
                }, { includeLegacy: true });
                const similarArticles = findTitleSimilarArticles(title, existingArticles);
                const embeddingInput = getAnswerlatticeEmbeddingInput({
                    categoryTitle: ref.categoryTitle,
                    sectionTitle: ref.sectionTitle,
                    title,
                    content,
                });
                if (!embeddingInput) throw new Error('Article content is too short to embed.');
                const bodyLength = cleanText(tiptapToText(content), 40_000).length;
                const qualityScore = Math.round(Math.min(1, (
                    Math.min(bodyLength / 3_000, 1) * 0.5
                    + (title.length > 5 ? 0.2 : 0)
                    + (sourceFiles.length > 0 ? 0.2 : 0)
                    + (ref.sectionId ? 0.1 : 0)
                )) * 100) / 100;
                const now = Timestamp.now();
                const article: ProcessedArticleToSave = {
                    id: articleRef.id,
                    processedId: cleanText(ref.article.id, 100),
                    pId: PRODUCT_ID,
                    ...scope!,
                    active: false,
                    categoryId: ref.categoryId,
                    sectionId: ref.sectionId,
                    categoryTitle: ref.categoryTitle,
                    sectionTitle: ref.sectionTitle,
                    title,
                    index: 0,
                    url: `/${ref.categoryId}/${ref.sectionId ? `${ref.sectionId}/` : ''}${articleRef.id}`,
                    content,
                    [ANSWERLATTICE_EMBEDDING_VECTOR_FIELD]: FieldValue.vector(vectors.active),
                    ...(vectors.legacy ? {
                        embedding: FieldValue.vector(vectors.legacy),
                        embeddingV1CacheVersion: ANSWERLATTICE_LEGACY_EMBEDDING_CONFIG.cacheVersion,
                        embeddingV1SourceHash: embeddingInput.sourceHash,
                    } : {}),
                    embeddingStatus: 'embedded',
                    embeddingCacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
                    embeddingSourceHash: embeddingInput.sourceHash,
                    embeddingV2CacheVersion: ANSWERLATTICE_EMBEDDING_CACHE_VERSION,
                    embeddingV2SourceHash: embeddingInput.sourceHash,
                    embeddingVersion: 'v2',
                    tags: [],
                    generatedFaqs: Array.isArray(ref.article.generatedFaqs) ? ref.article.generatedFaqs as any : [],
                    createdOn: now,
                    modifiedOn: now,
                    status: ARTICLE_STATUS.NEEDS_REVIEW,
                    jobId,
                    sources: Array.isArray(ref.article.sources) ? ref.article.sources as KnowledgeBaseArticleSource[] : [],
                    ...(similarArticles.length ? {
                        reconciliation: {
                            status: ARTICLE_RECONCILIATION_STATUS.UNRESOLVED,
                            similarArticleIds: similarArticles.map(item => item.id),
                            similarArticles,
                        },
                    } : {}),
                    qualityScore,
                } as ProcessedArticleToSave;
                ref.article.id = articleRef.id;
                if (similarArticles.length) {
                    articlesToReview.push({
                        id: articleRef.id,
                        title,
                        status: ARTICLE_RECONCILIATION_STATUS.UNRESOLVED,
                        similarArticles,
                    });
                }
                return article;
            }));
            articlesToCreate.push(...processed);
        }

        const reviewNavigation = buildReviewNavigation(generated.categories);
        const completedAt = Timestamp.now();
        await firestoreAdmin.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(jobRef);
            if (!snapshot.exists) throw new Error('Knowledge generation job is not available.');
            const current = snapshot.data() || {};
            if (
                current.status !== INGESTION_JOB_STATUS.PROCESSING
                || current.generationRun?.id !== runId
                || current.generationRun?.status !== 'processing'
            ) {
                throw new Error('Knowledge generation job changed before completion.');
            }
            for (const article of articlesToCreate) {
                transaction.create(firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(article.id), article);
            }
            transaction.set(jobRef, {
                status: INGESTION_JOB_STATUS.NEEDS_REVIEW,
                articleIds: articlesToCreate.map(article => article.id),
                categories: reviewNavigation,
                articlesToReview,
                errorMessage: null,
                failureStage: null,
                generationRun: {
                    id: runId,
                    status: 'completed',
                    startedAt,
                    leaseExpiresAt,
                    completedAt,
                },
                modifiedOn: completedAt,
            }, { merge: true });
        });
        logger.info('[Answerlattice KB] Knowledge generation completed', {
            jobIdLength: jobId.length,
            sourceFileCount: sourceFiles.length,
            articleCount: articlesToCreate.length,
            reviewCount: articlesToReview.length,
        });
        return { skipped: false, articleCount: articlesToCreate.length };
    } catch (error) {
        const failedAt = Timestamp.now();
        await firestoreAdmin.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(jobRef);
            if (!snapshot.exists) return;
            const current = snapshot.data() || {};
            if (current.status === INGESTION_JOB_STATUS.CANCELLED) return;
            if (current.generationRun?.id && current.generationRun.id !== runId) return;
            transaction.set(jobRef, {
                status: INGESTION_JOB_STATUS.FAILED,
                errorMessage: GENERATION_FAILED_MESSAGE,
                failureStage: 'generation',
                generationRun: {
                    ...(current.generationRun || { id: runId, startedAt, leaseExpiresAt }),
                    status: 'failed',
                    completedAt: failedAt,
                },
                modifiedOn: failedAt,
            }, { merge: true });
        }).catch((stateError) => {
            logger.error('[Answerlattice KB] Failed to persist generation failure state', {
                failureCode: 'answerlattice_kb_generation_failure_state_write_failed',
                jobIdLength: jobId.length,
                sourceErrorName: stateError instanceof Error ? stateError.name : typeof stateError,
            });
        });
        logger.error('[Answerlattice KB] Knowledge generation failed', {
            failureCode: 'answerlattice_kb_generation_failed',
            jobIdLength: jobId.length,
            sourceFileCount: sourceFiles.length,
            hasScope: Boolean(scope),
            sourceErrorName: error instanceof Error ? error.name : typeof error,
        });
        return { skipped: false, failed: true };
    }
}
