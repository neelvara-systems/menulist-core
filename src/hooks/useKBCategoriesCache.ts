import { fetchAnswerlatticePublicCategories } from '@lib/answerlattice/publicContentClient';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext, useMemo } from 'react';

const categoriesFetchInFlight = new Map<string, Promise<KnowledgeBaseCategoriesType | null>>();

const normalizeCategoriesPayload = (value: any): KnowledgeBaseCategoriesType | null => {
    if (value?.categories && typeof value.categories === 'object') {
        return value as KnowledgeBaseCategoriesType;
    }

    return null;
};

export const useKBCategoriesCache = () => {
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const scopeKey = useAnswerlatticeCacheScope();

    const cachedCategories = useMemo(
        () => cachedKBCategories?.scopeKey === scopeKey
            ? normalizeCategoriesPayload(cachedKBCategories.kBCategories)
            : null,
        [cachedKBCategories, scopeKey]
    );

    const setCategoriesCache = useCallback((data: KnowledgeBaseCategoriesType | null) => {
        if (!data || !scopeKey) return;
        setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: data, scopeKey });
    }, [scopeKey, setCachedKBCategories]);

    const getCategoriesCached = useCallback(async (options?: { forceRefresh?: boolean }) => {
        if (!scopeKey) return null;
        if (!options?.forceRefresh && cachedCategories) {
            return cachedCategories;
        }

        if (!categoriesFetchInFlight.has(scopeKey)) {
            const request = fetchAnswerlatticePublicCategories()
                .then((result) => normalizeCategoriesPayload(result))
                .finally(() => {
                    categoriesFetchInFlight.delete(scopeKey);
                });
            categoriesFetchInFlight.set(scopeKey, request);
        }

        const result = await categoriesFetchInFlight.get(scopeKey)!;
        setCategoriesCache(result);
        return result;
    }, [cachedCategories, scopeKey, setCategoriesCache]);

    return {
        categoriesData: cachedCategories,
        categoriesMap: cachedCategories?.categories || {},
        getCategoriesCached,
        setCategoriesCache,
    };
};
