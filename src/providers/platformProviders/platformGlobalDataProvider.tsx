'use client'

import { FontPresetsType } from '@type/assets';
import { ChangelogPage } from '@type/changelog';
import { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { SupportTicketType } from '@type/supportTicket';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { registerPosSyncDeliveryConfig, unregisterPosSyncDeliveryConfig } from '@lib/posSync/eventBuilder';
import type { StaffUserSummary } from '@lib/staffManagement/types';
import type { EffectiveRolePermissions } from '@type/platform/roles';
import {
    createEmptyImageSubjectProfileCache,
    type ImageSubjectProfileCacheState,
} from '@type/imageSubjectProfile';
import { Timestamp } from 'firebase/firestore';
import { createContext, type Dispatch, type ReactNode, type SetStateAction, useEffect } from 'react';

export type PlatformGlobalDataProviderType = {

    tenantDetails: TenantDataType | null;
    setTenantDetails: Dispatch<SetStateAction<TenantDataType | null>>;

    storeDetails: StoreDataType | null;
    setStoreDetails: Dispatch<SetStateAction<StoreDataType | null>>;

    userPermissions: EffectiveRolePermissions | null;
    setUserPermissions: Dispatch<SetStateAction<EffectiveRolePermissions | null>>;

    usersList: StaffUserSummary[] | null;
    setUsersList: Dispatch<SetStateAction<StaffUserSummary[] | null>>;

    fontsList: FontPresetsType[] | null;
    setFontsList: Dispatch<SetStateAction<FontPresetsType[] | null>>;

    assetsList: { images: import('@type/assets').AssetsCategoryType[] };
    setAssetsList: Dispatch<SetStateAction<{ images: import('@type/assets').AssetsCategoryType[] }>>;

    activeSubscription: FirestoreSubscriptionDoc | null;
    setActiveSubscription: Dispatch<SetStateAction<FirestoreSubscriptionDoc | null>>;
    activeSubscriptionLoading: boolean;
    setActiveSubscriptionLoading: Dispatch<SetStateAction<boolean>>;

    cachedImageSubjectProfiles: ImageSubjectProfileCacheState;
    setCachedImageSubjectProfiles: Dispatch<SetStateAction<ImageSubjectProfileCacheState>>;

    // Multi-Outlet Session Context (Feature #4C — T20/T21)
    isMasterUser: boolean;
    activeStoreContext: number | null;  // Which store user is viewing (null = own store)
    setActiveStoreContext: (storeId: number | null) => void;

    cachedKBCategories: { cachedOn: Timestamp | null, kBCategories: KnowledgeBaseCategoriesType | null, scopeKey: string | null };
    setCachedKBCategories: Dispatch<SetStateAction<PlatformGlobalDataProviderType['cachedKBCategories']>>;

    cachedChangelog: { cachedOn: Timestamp | null, changelog: ChangelogPage | null, scopeKey: string | null };
    setCachedChangelog: Dispatch<SetStateAction<PlatformGlobalDataProviderType['cachedChangelog']>>;

    cachedTickets: { cachedOn: Timestamp | null, tickets: SupportTicketType[], scopeKey: string | null };
    setCachedTickets: Dispatch<SetStateAction<PlatformGlobalDataProviderType['cachedTickets']>>;

    cachedArticles: { cachedOn: Timestamp | null, articles: AnswerlatticeReadableArticle[], scopeKey: string | null };
    setCachedArticles: Dispatch<SetStateAction<PlatformGlobalDataProviderType['cachedArticles']>>;

    platformStoreSummaryOptions: PlatformStoreSummaryOption[];
    setPlatformStoreSummaryOptions: Dispatch<SetStateAction<PlatformStoreSummaryOption[]>>;
    platformStoreSummaryLoadedAt: number | null;
    setPlatformStoreSummaryLoadedAt: Dispatch<SetStateAction<number | null>>;
    platformStoreSummaryLoading: boolean;
    setPlatformStoreSummaryLoading: Dispatch<SetStateAction<boolean>>;
}

const InititalState: PlatformGlobalDataProviderType = {

    tenantDetails: null,
    setTenantDetails: () => { },

    storeDetails: null,
    setStoreDetails: () => { },

    userPermissions: null,
    setUserPermissions: () => { },

    usersList: null,
    setUsersList: () => { },

    fontsList: null,
    setFontsList: () => { },

    assetsList: { images: [] },
    setAssetsList: () => { },

    activeSubscription: null,
    setActiveSubscription: () => { },
    activeSubscriptionLoading: false,
    setActiveSubscriptionLoading: () => { },

    cachedImageSubjectProfiles: createEmptyImageSubjectProfileCache(),
    setCachedImageSubjectProfiles: () => { },

    isMasterUser: false,
    activeStoreContext: null,
    setActiveStoreContext: () => { },

    cachedKBCategories: { cachedOn: null, kBCategories: null, scopeKey: null },
    setCachedKBCategories: () => { },

    cachedChangelog: { cachedOn: null, changelog: null, scopeKey: null },
    setCachedChangelog: () => { },

    cachedTickets: { cachedOn: null, tickets: [], scopeKey: null },
    setCachedTickets: () => { },

    cachedArticles: { cachedOn: null, articles: [], scopeKey: null },
    setCachedArticles: () => { },

    platformStoreSummaryOptions: [],
    setPlatformStoreSummaryOptions: () => { },
    platformStoreSummaryLoadedAt: null,
    setPlatformStoreSummaryLoadedAt: () => { },
    platformStoreSummaryLoading: false,
    setPlatformStoreSummaryLoading: () => { },
}

export const PlatformGlobalDataContext = createContext<PlatformGlobalDataProviderType>(InititalState)

function PlatformGlobalDataProvider({ children, contextData }: { children: ReactNode, contextData: PlatformGlobalDataProviderType }) {
    useEffect(() => {
        const storeId = contextData.storeDetails?.storeId;
        const tenantId = contextData.storeDetails?.tenantId;
        registerPosSyncDeliveryConfig(storeId, tenantId, contextData.storeDetails?.posSync);
        return () => unregisterPosSyncDeliveryConfig(storeId, tenantId);
    }, [
        contextData.storeDetails?.posSync?.enabled,
        contextData.storeDetails?.posSync?.webhookUrl,
        contextData.storeDetails?.storeId,
        contextData.storeDetails?.tenantId,
    ])

    return (
        <PlatformGlobalDataContext.Provider value={contextData} >
            {children}
        </PlatformGlobalDataContext.Provider>
    )
}

export default PlatformGlobalDataProvider
