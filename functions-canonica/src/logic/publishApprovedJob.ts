import { Timestamp } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import * as functions from 'firebase-functions';
import { HttpsError } from "firebase-functions/v2/https";
import { firestoreAdmin } from "../firebaseAdmin";
import { ARTICLE_RECONCILIATION_STATUS, ARTICLE_STATUS, EmbedArticleType, INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob, IngestionJobArticleToReview, IngestionJobCategoriesMap, KB_ARTICLES_COLLECTION, KB_CATEGORIES_COLLECTION, KnowledgeBaseCategoriesType } from "../types";

const getKnowledgeBaseCategoriesDocId = (tId?: unknown, sId?: unknown) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (Number.isFinite(tenantId) && Number.isFinite(storeId)) {
        return `categories_${tenantId}_${storeId}`;
    }
    return 'categories';
};

export const publishApprovedJobLogic = async (jobId: string, finalCategories: IngestionJobCategoriesMap) => {

    const logger = functions.logger;
    logger.info(`[publishApprovedJobLogic] Orchestrator starting publish process. with job id ${jobId} and job data ${finalCategories}`);

    const articlesToReEmbed: EmbedArticleType[] = Object.values(finalCategories).reduce<EmbedArticleType[]>((acc, category) => {
        // Handle category-level articles
        if (category?.articles?.length) {
            acc.push(
                ...category.articles
                    .filter((article) => article?.reEmbedding && article.id)
                    .map((article) => ({
                        id: article.id!,
                        categoryTitle: category.title ?? "Untitled Category",
                    }))
            );
        }

        // Handle section-level articles
        if (category?.sections?.length) {
            category.sections.forEach((section) => {
                if (section?.articles?.length) {
                    acc.push(
                        ...section.articles
                            .filter((article) => article?.reEmbedding && article.id)
                            .map((article) => ({
                                id: article.id!,
                                categoryTitle: category.title ?? "Untitled Category",
                                sectionTitle: section.title ?? undefined,
                            }))
                    );
                }
            });
        }

        return acc;
    }, []);

    logger.info(`[publishApprovedJobLogic] Found ${articlesToReEmbed.length} articles to re-embed.`);

    // const articlesToReEmbed: EmbedArticleType[] = [];
    // Object.values(finalCategories).forEach((category: IngestionJobCategory) => {
    //   if (category?.sections?.length) {
    //     category.sections.forEach((section: IngestionJobSection) => {
    //       section.articles?.forEach((article: IngestionJobArticle) => {
    //         if (article?.reEmbedding && article.id) {
    //           articlesToReEmbed.push({
    //             id: article.id,
    //             categoryTitle: category.title ?? "Untitled Category",
    //             sectionTitle: section.title ?? "",
    //           });
    //         }
    //       });
    //     });
    //   }

    //   if (category?.articles?.length) {
    //     category.articles.forEach((article: IngestionJobArticle) => {
    //       if (article?.reEmbedding && article.id) {
    //         articlesToReEmbed.push({
    //           id: article.id,
    //           categoryTitle: category.title ?? "Untitled Category",
    //           sectionTitle: "",
    //         });
    //       }
    //     });
    //   }
    // });

    const jobRef = firestoreAdmin.collection(INGESTION_JOB_COLLECTION).doc(jobId);

    try {
        await firestoreAdmin.runTransaction(async (transaction) => {
            // 2. Pre-flight Check (Idempotency)
            const jobDoc = await transaction.get(jobRef);
            if (!jobDoc.exists) throw new Error(`Job ${jobId} not found.`);
            const job = jobDoc.data() as IngestionJob;

            logger.info(`[publishApprovedJobLogic] Pre-flight check. with job id ${jobId} and job data ${job}`);
            if (job.status !== INGESTION_JOB_STATUS.NEEDS_REVIEW) {
                logger.warn(`[publishApprovedJobLogic] Publish aborted. Job status is '${job.status}'.`);
                return;
            }

            const categoriesDocId = getKnowledgeBaseCategoriesDocId(job.tId, job.sId);
            const categoriesDocRef = firestoreAdmin.collection(KB_CATEGORIES_COLLECTION).doc(categoriesDocId);

            // 3. Update Master Navigation Document
            const categoriesMetaDoc = await transaction.get(categoriesDocRef);
            const currentCategoriesData: KnowledgeBaseCategoriesType = categoriesMetaDoc.exists ? categoriesMetaDoc.data() as KnowledgeBaseCategoriesType : { categories: {} };
            logger.info(`[publishApprovedJobLogic] Pre-flight check. with job id ${jobId} and job data ${job}`);

            // Merge the final, human-approved navigation blueprint from the client
            for (const catId in finalCategories) {
                const category = JSON.parse(JSON.stringify(finalCategories[catId]));
                category.active = true;

                // Remove content from direct articles in the category
                if (category.articles) {
                    category.articles.forEach((article: any) => {
                        article.active = true;
                        delete article.content;
                    });
                }

                // Remove content from articles within sections
                if (category.sections) {
                    category.sections.forEach((section: any) => {
                        section.active = true;
                        if (section.articles) {
                            section.articles.forEach((article: any) => {
                                article.active = true;
                                delete article.content;
                            });
                        }
                    });
                }

                currentCategoriesData.categories[catId] = category;
            }

            //*** started process of deleting articles after reconcillation of action == replace

            const articlesToReconcile: IngestionJobArticleToReview[] = job.articlesToReview?.filter(article => article.status === ARTICLE_RECONCILIATION_STATUS.REPLACE) || [];

            articlesToReconcile.forEach(newArticle => {

                //1. delete articles which are to be deleted
                const articlesToDelete: any[] = newArticle.similarArticles?.map(article => article.id).filter(Boolean) || [];
                if (articlesToDelete.length > 0) {
                    for (const articleId of articlesToDelete) {
                        const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
                        transaction.delete(articleRef);
                    }
                }

                const articleToReplace = newArticle.similarArticles[0];
                const newArticleMeta = { id: articleToReplace.id, title: articleToReplace.title, active: true, index: 0, url: "" };
                if (!articleToReplace) return;
                // 2. Replace the article in the categories map and remove other similar articles
                // 3. Remove all other similar articles from the entire map 
                for (const categoryId in currentCategoriesData.categories) {
                    const category = currentCategoriesData.categories[categoryId];
                    if (category.articles) {
                        const articleIndex = category.articles.findIndex(art => art.id === articleToReplace.id);
                        if (articleIndex > -1) {
                            category.articles[articleIndex] = newArticleMeta;
                        }
                        category.articles = category.articles.filter(article => !articlesToDelete.includes(article.id));
                    }
                    if (category.sections) {
                        category.sections.forEach(section => {
                            if (section.articles) {
                                const articleIndex = section.articles.findIndex(art => art.id === articleToReplace.id);
                                if (articleIndex > -1) {
                                    section.articles[articleIndex] = newArticleMeta;
                                }
                                section.articles = section.articles.filter(article => !articlesToDelete.includes(article.id));
                            }
                        });
                    }
                }
            })
            //*** ended process of deleting articles after reconcillation of action == replace


            transaction.set(categoriesDocRef, currentCategoriesData);
            logger.info(`[publishApprovedJobLogic] Merged navigation blueprint into kb_categories/${categoriesDocId}.`);

            // 4. Update articles that DO NOT need re-embedding
            const allArticleIds = job.articleIds || [];

            const articlesToPublishNow = articlesToReEmbed.length > 0 ? allArticleIds.filter(id => !articlesToReEmbed.find(article => article.id === id)) : allArticleIds;

            for (const articleId of articlesToPublishNow) {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
                transaction.update(articleRef, { status: ARTICLE_STATUS.PUBLISHED, active: true, lastReviewedOn: Timestamp.now() });
            }

            // 5. Update articles that DO need re-embedding
            // for (const articleId of articlesToReEmbed) {
            //   const articleRef = db.collection(KB_ARTICLES_COLLECTION).doc(articleId);
            //   transaction.update(articleRef, { status: 'embedding' });
            // }

            // 6. Finalize Job Status for this phase
            transaction.update(jobRef, {
                status: INGESTION_JOB_STATUS.PUBLISHING,
                modifiedOn: Timestamp.now(),
                articlesToEmbedCount: articlesToReEmbed.length,
                categories: finalCategories,
                articlesEmbeddedCount: 0,
            });
        });

        // 7. Enqueue the slow work AFTER the transaction is successful
        if (articlesToReEmbed.length > 0) {
            const queue = getFunctions().taskQueue("embedArticleWorker");
            for (const article of articlesToReEmbed) {
                await queue.enqueue({ articleData: article, jobId });
            }
            logger.info(`[publishApprovedJobLogic] Enqueued ${articlesToReEmbed.length} articles for re-embedding.`);
        }

        logger.info(`[publishApprovedJobLogic] Orchestration successful. Job is now publishing.`);
        return { success: true, message: 'Publishing process initiated.' };

    } catch (error: any) {
        logger.error(`[publishApprovedJobLogic] Critical error during publish orchestration:`, error);
        await jobRef.update({
            status: INGESTION_JOB_STATUS.FAILED,
            errorMessage: `Publishing failed: ${error.message}`
        });
        throw new HttpsError('internal', `Failed to publish job ${jobId}.`, error.message);
    }
};
