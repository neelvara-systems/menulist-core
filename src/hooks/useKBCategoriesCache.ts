import { fetchAnswerlatticePublicCategories } from '@lib/answerlattice/publicContentClient';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext, useMemo } from 'react';

let categoriesFetchInFlight: Promise<KnowledgeBaseCategoriesType | null> | null = null;

const normalizeCategoriesPayload = (value: any): KnowledgeBaseCategoriesType | null => {
    if (value?.categories && typeof value.categories === 'object') {
        return value as KnowledgeBaseCategoriesType;
    }

    return null;
};

export const useKBCategoriesCache = () => {
    const { cachedKBCategories, setCachedKBCategories } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    const cachedCategories = useMemo(
        () => normalizeCategoriesPayload(cachedKBCategories?.kBCategories),
        [cachedKBCategories?.kBCategories]
    );

    const setCategoriesCache = useCallback((data: KnowledgeBaseCategoriesType | null) => {
        if (!data) return;
        setCachedKBCategories({ cachedOn: Timestamp.now(), kBCategories: data });
    }, [setCachedKBCategories]);

    const getCategoriesCached = useCallback(async (options?: { forceRefresh?: boolean }) => {
        if (!options?.forceRefresh && cachedCategories) {
            return cachedCategories;
        }

        if (!categoriesFetchInFlight) {
            categoriesFetchInFlight = fetchAnswerlatticePublicCategories()
                .then((result) => normalizeCategoriesPayload(result))
                .finally(() => {
                    categoriesFetchInFlight = null;
                });
        }

        const result = await categoriesFetchInFlight;
        setCategoriesCache(result);
        return result;
    }, [cachedCategories, setCategoriesCache]);

    return {
        categoriesData: cachedCategories,
        categoriesMap: cachedCategories?.categories || {},
        getCategoriesCached,
        setCategoriesCache,
    };
};
