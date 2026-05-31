import { FieldValue, Timestamp, type DocumentData, type UpdateData } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import * as functions from 'firebase-functions';
import { HttpsError } from "firebase-functions/v2/https";
import { ANSWERLATTICE_CACHE_SOURCES, getAnswerlatticeCacheVersionBumpData, getAnswerlatticeCacheVersionDocId } from "../answerlattice/cacheVersionManifest";
import { markCompiledContextSourceChanged } from "../answerlattice/compiledContextVersions";
import { firestoreAdmin } from "../firebaseAdmin";
import { ARTICLE_RECONCILIATION_STATUS, ARTICLE_STATUS, ANSWERLATTICE_CACHE_VERSIONS_COLLECTION, ANSWERLATTICE_FAQS_COLLECTION, EmbedArticleType, INGESTION_JOB_COLLECTION, INGESTION_JOB_STATUS, IngestionJob, IngestionJobArticleToReview, IngestionJobCategoriesMap, KB_ARTICLES_COLLECTION, KB_CATEGORIES_COLLECTION, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from "../types";

const getKnowledgeBaseCategoriesDocId = (tId?: unknown, sId?: unknown) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (Number.isFinite(tenantId) && Number.isFinite(storeId) && tenantId > 0 && storeId > 0) {
        return `categories_${tenantId}_${storeId}`;
    }
    return 'categories';
};

const normalizeFaqText = (value: unknown, maxLength: number): string => {
    if (typeof value !== "string") return "";
    return value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
};

const normalizeFaqList = (value: unknown, maxItems: number, maxLength: number): string[] => {
    const raw = typeof value === "string"
        ? value.split(/[\n,]/)
        : Array.isArray(value) ? value : [];

    return Array.from(new Set(
        raw
            .map(item => normalizeFaqText(item, maxLength).toLowerCase().replace(/[^a-z0-9_\-\s/]/g, "").replace(/\s+/g, "_"))
            .filter(Boolean)
    )).slice(0, maxItems);
};

const normalizeFaqIdList = (value: unknown, maxItems: number, maxLength: number): string[] => {
    const raw = typeof value === "string"
        ? value.split(/[\n,]/)
        : Array.isArray(value) ? value : [];

    return Array.from(new Set(
        raw
            .map(item => normalizeFaqText(item, maxLength).replace(/[^a-zA-Z0-9_\-:.]/g, ""))
            .filter(Boolean)
    )).slice(0, maxItems);
};

const buildGeneratedFaqDocId = (articleId: string, index: number) =>
    `${articleId}_faq_${index + 1}`.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 180);

const normalizeGeneratedFaqs = (value: unknown) => {
    const raw = Array.isArray(value) ? value : [];
    return raw
        .map((item, index) => {
            if (!item || typeof item !== "object") return null;
            const record = item as Record<string, unknown>;
            const question = normalizeFaqText(record.question, 240);
            const answer = normalizeFaqText(record.answer, 2000);
            if (!question || !answer) return null;
            return {
                id: normalizeFaqText(record.id, 180),
                question,
                answer,
                tags: normalizeFaqList(record.tags, 20, 64),
                contextKeys: normalizeFaqList(record.contextKeys, 20, 80),
                entityIds: normalizeFaqIdList(record.entityIds, 25, 160),
                sortOrder: Number.isFinite(Number(record.sortOrder)) ? Number(record.sortOrder) : index,
            };
        })
        .filter(Boolean)
        .slice(0, 5);
};

type PublishedFaqDraft = {
    id: string;
    data: Record<string, unknown>;
};

const buildPublishedFaqDraftsForArticle = (
    article: KnowledgeBaseArticleType | null,
    articleId: string,
    job: IngestionJob,
    tenantId: number,
    storeId: number,
): PublishedFaqDraft[] => {
    const generatedFaqs = normalizeGeneratedFaqs(article?.generatedFaqs);
    return generatedFaqs.map((faq: any, index) => {
        const id = faq.id || buildGeneratedFaqDocId(articleId, index);
        return {
            id,
            data: {
                id,
                pId: 'AL',
                tId: tenantId,
                sId: storeId,
                uId: job.uId,
                question: faq.question,
                answer: faq.answer,
                status: "published",
                source: "import",
                active: true,
                articleId,
                articleTitle: article?.title || "",
                tags: faq.tags,
                contextKeys: faq.contextKeys,
                entityIds: faq.entityIds?.length ? faq.entityIds : (article as any)?.entityIds || [],
                sortOrder: faq.sortOrder ?? index,
                jobId: job.id,
                generatedFromArticleId: articleId,
                publishedOn: Timestamp.now(),
                lastReviewedOn: Timestamp.now(),
                reviewRequestedOn: null,
                modifiedOn: Timestamp.now(),
            },
        };
    });
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
    let publishedTenantId: number | null = null;
    let publishedStoreId: number | null = null;

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

            const tenantId = Number(job.tId);
            const storeId = Number(job.sId);
            publishedTenantId = tenantId;
            publishedStoreId = storeId;

            const categoriesDocId = getKnowledgeBaseCategoriesDocId(job.tId, job.sId);
            const categoriesDocRef = firestoreAdmin.collection(KB_CATEGORIES_COLLECTION).doc(categoriesDocId);
            const allArticleIds = job.articleIds || [];
            const articleDocs = new Map<string, KnowledgeBaseArticleType | null>();

            // 3. Update Master Navigation Document
            const categoriesMetaDoc = await transaction.get(categoriesDocRef);
            const currentCategoriesData: KnowledgeBaseCategoriesType = categoriesMetaDoc.exists ? categoriesMetaDoc.data() as KnowledgeBaseCategoriesType : { categories: {} };
            logger.info(`[publishApprovedJobLogic] Pre-flight check. with job id ${jobId} and job data ${job}`);

            for (const articleId of allArticleIds) {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
                const articleDoc = await transaction.get(articleRef);
                articleDocs.set(articleId, articleDoc.exists ? articleDoc.data() as KnowledgeBaseArticleType : null);
            }

            // Merge the final, human-approved navigation blueprint from the client
            for (const catId in finalCategories) {
                const category = JSON.parse(JSON.stringify(finalCategories[catId]));
                category.active = true;

                // Remove content from direct articles in the category
                if (category.articles) {
                    category.articles.forEach((article: any) => {
                        article.active = true;
                        delete article.content;
                        delete article.generatedFaqs;
                        delete article.faqIds;
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
                                delete article.generatedFaqs;
                                delete article.faqIds;
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
            const articlesToPublishNow = articlesToReEmbed.length > 0 ? allArticleIds.filter(id => !articlesToReEmbed.find(article => article.id === id)) : allArticleIds;
            const cacheVersionRef = firestoreAdmin
                .collection(ANSWERLATTICE_CACHE_VERSIONS_COLLECTION)
                .doc(getAnswerlatticeCacheVersionDocId(ANSWERLATTICE_CACHE_SOURCES.KB, tenantId, storeId));
            transaction.set(cacheVersionRef, getAnswerlatticeCacheVersionBumpData(ANSWERLATTICE_CACHE_SOURCES.KB, tenantId, storeId, {
                reason: "publish_approved_job",
                sourceId: jobId,
                sourceType: "kb_generation_job",
            }), { merge: true });

            for (const articleId of allArticleIds) {
                const articleRef = firestoreAdmin.collection(KB_ARTICLES_COLLECTION).doc(articleId);
                const faqDrafts = buildPublishedFaqDraftsForArticle(articleDocs.get(articleId) || null, articleId, job, tenantId, storeId);
                const faqIds = faqDrafts.map(faq => faq.id);
                const updatePayload: UpdateData<DocumentData> = {
                    active: true,
                    lastReviewedOn: Timestamp.now(),
                    generatedFaqs: FieldValue.delete(),
                };
                if (articlesToPublishNow.includes(articleId)) {
                    updatePayload.status = ARTICLE_STATUS.PUBLISHED;
                }
                if (faqIds.length > 0) {
                    updatePayload.faqIds = faqIds;
                }
                transaction.update(articleRef, updatePayload);

                for (const faqDraft of faqDrafts) {
                    const faqRef = firestoreAdmin.collection(ANSWERLATTICE_FAQS_COLLECTION).doc(faqDraft.id);
                    transaction.set(faqRef, faqDraft.data, { merge: true });
                }
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

        if (publishedTenantId && publishedStoreId) {
            await Promise.all([
                markCompiledContextSourceChanged(firestoreAdmin, 'kb', publishedTenantId, publishedStoreId, {
                    reason: 'publish_approved_job',
                    sourceId: jobId,
                    sourceType: 'kb_generation_job',
                }),
                markCompiledContextSourceChanged(firestoreAdmin, 'docsNav', publishedTenantId, publishedStoreId, {
                    reason: 'publish_approved_job',
                    sourceId: jobId,
                    sourceType: 'kb_generation_job',
                }),
            ]);
        }

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
