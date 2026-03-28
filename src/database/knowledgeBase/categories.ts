import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, getDoc, setDoc, updateDoc } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { KnowledgeBaseArticleMeta, KnowledgeBaseArticleType, KnowledgeBaseCategoriesType, KnowledgeBaseSection } from "@type/knowledgeBase";
import { updateList } from "@util/utils";

const COLLECTION = DB_COLLECTIONS.KB_CATEGORIES;

const getCollectionRef = async () => {
    return collection(canonicaFirebaseClient, `${COLLECTION}`)
}

const getDocRef = async () => {
    return doc(canonicaFirebaseClient, `${COLLECTION}`, "categories")
}

export const getCategories = async () => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id };
            }
            return null;
        },
        "getCategories"
    );
}

export const deleteCategory = async (data: any) => {
    return await apiCallComposer(
        async () => {
            await setDoc(await getDocRef(), data);
            return data;
        },
        data,
        "deleteCategory"
    );
}

export const addCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await requestBodyComposer(category);
            const fieldPath = `categories.${composedCategory.id}`;
            await updateDoc(docRef, { [fieldPath]: composedCategory });
            return composedCategory;
        },
        category,
        "addCategory"
    );
}

export const updateCategory = async (category: any) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const composedCategory = await requestBodyComposer(category);
            const fieldPath = `categories.${composedCategory.id}`;
            await updateDoc(docRef, { [fieldPath]: composedCategory });
            return composedCategory;
        },
        category,
        "updateCategory"
    );
}

const _updateSectionArticles = async (
    categoriesData: KnowledgeBaseCategoriesType,
    categoryId: string,
    sectionIndex: number,
    articles: KnowledgeBaseArticleMeta[],
    docRef: any
) => {
    const category = categoriesData.categories[categoryId];
    const updatedSections = [...category.sections];
    updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        articles: articles,
    };

    const fieldPath = `categories.${categoryId}.sections`;
    await updateDoc(docRef, { [fieldPath]: updatedSections as any });

    const updatedData = { ...categoriesData };
    updatedData.categories[categoryId].sections = updatedSections;
    return updatedData;
};

export const updateArticleInParent = async (categoriesData: KnowledgeBaseCategoriesType, categoryId: string, article: KnowledgeBaseArticleType, sectionId?: string | null) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const category = categoriesData.categories[categoryId];

            if (category) {
                if (sectionId) {
                    const sectionIndex = category.sections.findIndex((s: KnowledgeBaseSection) => s.id === sectionId);
                    if (sectionIndex !== -1) {
                        const section = category.sections[sectionIndex];
                        let articles = section.articles ? [...section.articles] : [];
                        const articleMeta: KnowledgeBaseArticleMeta = {
                            id: article.id,
                            active: article.active,
                            title: article.title,
                            index: article.index,
                            url: article.url,
                        };

                        articles = updateList(articles, articleMeta, "last", "id");
                        return await _updateSectionArticles(categoriesData, categoryId, sectionIndex, articles, docRef);
                    }
                } else {
                    // Handle articles directly under a category
                    let articles = category.articles ? [...category.articles] : [];
                    const articleMeta: KnowledgeBaseArticleMeta = {
                        id: article.id,
                        active: article.active,
                        title: article.title,
                        index: article.index,
                        url: article.url,
                    };

                    articles = updateList(articles, articleMeta, "last", "id");
                    const fieldPath = `categories.${categoryId}.articles`;
                    await updateDoc(docRef, { [fieldPath]: articles } as any);

                    const updatedData = { ...categoriesData };
                    updatedData.categories[categoryId].articles = articles;
                    return updatedData;
                }
            }
            return null;
        },
        { categoryId, sectionId, article },
        "updateArticleInParent"
    );
};

export const deleteArticleFromParent = async (
    categoriesData: KnowledgeBaseCategoriesType,
    categoryId: string,
    articleId: string,
    sectionId?: string | null
) => {
    return await apiCallComposer(
        async () => {
            const docRef = await getDocRef();
            const category = categoriesData.categories[categoryId];

            if (category) {
                if (sectionId) {
                    const sectionIndex = category.sections.findIndex((s: KnowledgeBaseSection) => s.id === sectionId);
                    if (sectionIndex !== -1) {
                        const section = category.sections[sectionIndex];
                        const articles = section.articles ? section.articles.filter((a: KnowledgeBaseArticleMeta) => a.id !== articleId) : [];
                        return await _updateSectionArticles(categoriesData, categoryId, sectionIndex, articles, docRef);
                    }
                } else {
                    const articles = category.articles ? category.articles.filter((a: KnowledgeBaseArticleMeta) => a.id !== articleId) : [];
                    const fieldPath = `categories.${categoryId}.articles`;
                    await updateDoc(docRef, { [fieldPath]: articles } as any);

                    const updatedData = { ...categoriesData };
                    updatedData.categories[categoryId].articles = articles;
                    return updatedData;
                }
            }
            return null;
        },
        { categoryId, sectionId, articleId },
        "deleteArticleFromParent"
    );
};