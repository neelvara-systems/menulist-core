import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { firestoreAdmin } from "../firebaseAdmin";
import { constructKbGenerationPrompt } from "../prompt";
import { ARTICLE_RECONCILIATION_STATUS, ARTICLE_STATUS, INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob, IngestionJobArticleToReview, KB_ARTICLES_COLLECTION, KnowledgeBaseArticleType, ProcessedArticleToSave, ProcessedKBArticle, ProcessedKBCategory, ProcessedKBMap, ProcessedKBSection } from "../types";
import { mergeArticleIdAfterProcessing } from '../utils';
import { findSimilarArticles, genrateEmbedding, getKBFromSource } from "../utils/aiUtils";

export const startGenerationLogic = async (jobId: string, job: IngestionJob) => {
    const logger = functions.logger;
    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);

    logger.info(`[startGenerationLogic] inside startGeneration function. with job id ${jobId} and job data ${job}`);

    try {
        logger.info(`[startGenerationLogic] Starting generation. Updating status to 'processing'.`);
        await jobRef.update({ status: INGESTION_JOB_STATUS.PROCESSING, modifiedOn: Timestamp.now() });

        const sourceFiles = job.sourceFiles;
        const prompt = constructKbGenerationPrompt();
        logger.info(`[startGenerationLogic:constructKbGenerationPrompt] Constructed prompt parts. with job id ${jobId}`);

        const generatedData: ProcessedKBMap = await getKBFromSource(prompt, sourceFiles);
        logger.info(`[startGenerationLogic:getKBFromSource] Generated data. with job id ${jobId} is ${generatedData}`);

        const UpdatedJobAfter = { categories: generatedData, modifiedOn: Timestamp.now() }
        await jobRef.update(UpdatedJobAfter);

        let categoryMap = generatedData || {};
        const articlesToCreate: ProcessedArticleToSave[] = [];
        const articlesToReview: IngestionJobArticleToReview[] = [];

        logger.info(`[startGenerationLogic] AI call successful. Parsing and processing articles in memory with categoryMap:.`, categoryMap);

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
            // Inherit tId/sId from parent job for multi-tenant isolation (CANONICA_RULES Rule 6)
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
                createdOn: Timestamp.now() as any,
                modifiedOn: Timestamp.now() as any,
                status: ARTICLE_STATUS.NEEDS_REVIEW as any,
                jobId: jobId,
                sources: article.sources,
                ...(jobTId ? { tId: jobTId } : {}),
                ...(jobSId ? { sId: jobSId } : {}),
            };

            logger.info(`[startGenerationLogic:processArticle] Processed article:`, article);

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

        logger.info(`[startGenerationLogic] In-memory processing complete. Committing ${articlesToCreate.length} articles to Firestore.`, articlesToCreate);
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

        logger.info(`[startGenerationLogic] Process completed successfully. Job is now a Work Order.Payload is ${UpdatedJob}`);

    } catch (error: any) {
        const errorMessage = error.message || "An unknown error occurred.";
        logger.error(`[startGenerationLogic] Generation failed:`, error);
        await jobRef.update({ status: INGESTION_JOB_STATUS.FAILED, errorMessage, modifiedOn: Timestamp.now() });
    }

};