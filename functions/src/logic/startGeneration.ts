import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { constructKbGenerationPrompt } from "../prompt";
import { ARTICLE_RECONCILIATION_STATUS, ARTICLE_STATUS, INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob, IngestionJobArticleToReview, KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType, ProcessedArticleToSave, ProcessedKBArticle, ProcessedKBCategory, ProcessedKBMap, ProcessedKBSection } from "../types";
import { mergeArticleIdAfterProcessing } from '../utils';
import { findSimilarArticles, genrateEmbedding, getKBFromSource } from "../utils/aiUtils";

const START_GENERATION_FAILED_CODE = 'ANSWERLATTICE_START_GENERATION_FAILED';
const START_GENERATION_FAILED_MESSAGE = 'Knowledge generation failed';

function boundedDiagnosticValue(value: unknown): string | number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getStartGenerationErrorContext(error: unknown): Record<string, string | number | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

function getStartGenerationJobContext(job: IngestionJob, jobId: string): Record<string, string | number | boolean> {
    return {
        jobIdLength: jobId.length,
        sourceFileCount: Array.isArray(job.sourceFiles) ? job.sourceFiles.length : 0,
        hasTenantScope: job.tId != null,
        hasStoreScope: job.sId != null,
    };
}

function getProcessedArticleContext(article: ProcessedKBArticle, jobId: string): Record<string, string | number | boolean> {
    return {
        jobIdLength: jobId.length,
        articleIdLength: article.id?.length || 0,
        titleLength: article.title?.length || 0,
        sourceCount: Array.isArray(article.sources) ? article.sources.length : 0,
        generatedFaqCount: Array.isArray(article.generatedFaqs) ? article.generatedFaqs.length : 0,
    };
}

export const startGenerationLogic = async (jobId: string, job: IngestionJob) => {
    const logger = functions.logger;
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);

    logger.info('[startGenerationLogic] Starting generation function', getStartGenerationJobContext(job, jobId));

    try {
        logger.info(`[startGenerationLogic] Starting generation. Updating status to 'processing'.`);
        await jobRef.update({ status: INGESTION_JOB_STATUS.PROCESSING, modifiedOn: Timestamp.now() });

        const sourceFiles = job.sourceFiles;
        const prompt = constructKbGenerationPrompt();
        logger.info('[startGenerationLogic:constructKbGenerationPrompt] Constructed prompt parts', getStartGenerationJobContext(job, jobId));

        const generatedData: ProcessedKBMap = await getKBFromSource(prompt, sourceFiles, { tId: job.tId, sId: job.sId });
        logger.info('[startGenerationLogic:getKBFromSource] Generated data received', {
            ...getStartGenerationJobContext(job, jobId),
            categoryCount: Object.keys(generatedData || {}).length,
        });

        const UpdatedJobAfter = { categories: generatedData, modifiedOn: Timestamp.now() }
        await jobRef.update(UpdatedJobAfter);

        let categoryMap = generatedData || {};
        const articlesToCreate: ProcessedArticleToSave[] = [];
        const articlesToReview: IngestionJobArticleToReview[] = [];

        logger.info('[startGenerationLogic] AI call successful. Parsing and processing articles in memory.', {
            ...getStartGenerationJobContext(job, jobId),
            categoryCount: Object.keys(categoryMap || {}).length,
        });

        const processArticle = async (article: ProcessedKBArticle, category: ProcessedKBCategory, section?: ProcessedKBSection | null, categoryId?: string, sectionId?: string | null) => {
            const embeddingVector = await genrateEmbedding({
                id: article.id,
                categoryTitle: category.title,
                sectionTitle: section?.title || "",
                title: article.title,
                content: article.content
            });

            // const sources = extractProvenance(article.content);
            const newArticleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc();
            // Inherit tId/sId from parent job for multi-tenant isolation (ANSWERLATTICE_RULES Rule 6)
            const jobTId = typeof job.tId === 'string' ? parseInt(job.tId) : job.tId;
            const jobSId = typeof job.sId === 'string' ? parseInt(job.sId) : job.sId;

            const newArticle: KnowledgeBaseArticleType = {
                id: newArticleRef.id,
                active: true,
                categoryId: categoryId || category.title.toLowerCase().replace(/\s+/g, '-'),
                sectionId: section ? (sectionId || section.title.toLowerCase().replace(/\s+/g, '-')) : '',
                categoryTitle: category.title,
                sectionTitle: section ? section.title : '',
                title: article.title,
                index: 0,
                url: `/${category.title.toLowerCase().replace(/\s+/g, '-')}/${article.title.toLowerCase().replace(/\s+/g, '-')}`,
                content: article.content,
                embedding: FieldValue.vector(embeddingVector),
                tags: [],
                generatedFaqs: Array.isArray(article.generatedFaqs) ? article.generatedFaqs : [],
                createdOn: Timestamp.now() as any,
                modifiedOn: Timestamp.now() as any,
                status: ARTICLE_STATUS.NEEDS_REVIEW as any,
                jobId: jobId,
                sources: article.sources,
                ...(jobTId ? { tId: jobTId } : {}),
                ...(jobSId ? { sId: jobSId } : {}),
            };

            logger.info('[startGenerationLogic:processArticle] Processed article.', getProcessedArticleContext(article, jobId));

            const similarArticles = await findSimilarArticles(embeddingVector);

            if (similarArticles.length > 0) {
                articlesToReview.push({
                    id: newArticle.id,
                    title: newArticle.title,
                    status: ARTICLE_RECONCILIATION_STATUS.UNRESOLVED,
                    similarArticles: similarArticles,
                });
            }
            // Quality scoring: deterministic score based on content length, structure, sources
            const contentStr = typeof article.content === 'string' ? article.content : JSON.stringify(article.content || '');
            const contentLength = contentStr.length;
            const hasTitle = article.title && article.title.length > 5;
            const hasSources = article.sources && article.sources.length > 0;
            const lengthScore = Math.min(contentLength / 3000, 1.0) * 0.4; // 40% weight: longer = better, capped at 3000 chars
            const structureScore = (hasTitle ? 0.3 : 0) + (section ? 0.1 : 0); // 30-40% weight: has title + is in a section
            const sourceScore = hasSources ? 0.2 : 0; // 20% weight: has source provenance
            article.qualityScore = Math.round((lengthScore + structureScore + sourceScore) * 100) / 100;

            articlesToCreate.push({ ...newArticle, processedId: article.id });
        };

        const processArticlePromises: Promise<void>[] = [];

        for (const [categoryId, category] of Object.entries(categoryMap)) {
            (category.articles ?? []).forEach(async (article) => {
                processArticlePromises.push(processArticle(article, category, null, categoryId, null));
            });
            (category.sections ?? []).forEach((section) => {
                (section.articles ?? []).forEach(async (article) => {
                    processArticlePromises.push(processArticle(article, category, section, categoryId, section.id));
                });
            });
        }

        await Promise.all(processArticlePromises);

        logger.info('[startGenerationLogic] In-memory processing complete. Committing articles to Firestore.', {
            ...getStartGenerationJobContext(job, jobId),
            articleCount: articlesToCreate.length,
        });
        const batch = firestoreAdmin.batch();
        const articleIds: string[] = [];

        for (const article of articlesToCreate) {
            const docRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(article.id);
            batch.set(docRef, article);
            articleIds.push(article.id);
            categoryMap = mergeArticleIdAfterProcessing(categoryMap, article)
        }

        await batch.commit();

        logger.info(`[startGenerationLogic] Process completed successfully. Job is now a Work Order.`);

        //update job data after articles are created
        const UpdatedJob = {
            status: INGESTION_JOB_STATUS.NEEDS_REVIEW,
            articleIds: articleIds,
            categories: categoryMap,
            articlesToReview: articlesToReview,
            modifiedOn: Timestamp.now(),
        }
        await jobRef.update(UpdatedJob);

        logger.info('[startGenerationLogic] Process completed successfully. Job is now a Work Order.', {
            ...getStartGenerationJobContext(job, jobId),
            articleCount: articleIds.length,
            reviewItemCount: articlesToReview.length,
            categoryCount: Object.keys(categoryMap || {}).length,
        });

    } catch (error: any) {
        logger.error('[startGenerationLogic] Generation failed', {
            failureCode: START_GENERATION_FAILED_CODE,
            ...getStartGenerationJobContext(job, jobId),
            ...getStartGenerationErrorContext(error),
        });
        const errorMessage = START_GENERATION_FAILED_MESSAGE;
        await jobRef.update({ status: INGESTION_JOB_STATUS.FAILED, errorMessage, modifiedOn: Timestamp.now() });
    }

};
