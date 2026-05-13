'use client'

import { FontPresetsType } from '@type/assets';
import { ChangelogPage } from '@type/changelog';
import { KbCategoriesMap, KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { UserDataType } from '@type/platform/user';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { SupportTicketType } from '@type/supportTicket';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { Timestamp } from 'firebase/firestore';
import { createContext, useEffect, useState } from 'react';

export type PlatformGlobalDataProviderType = {

    tenantDetails: TenantDataType;
    setTenantDetails: any;

    storeDetails: StoreDataType;
    setStoreDetails: any;

    userPermissions: any;
    setUserPermissions: any;

    usersList: UserDataType[];
    setUsersList: any;

    fontsList: FontPresetsType[];
    setFontsList: any;

    assetsList: { images: any[] };
    setAssetsList: any;

    activeSubscription: FirestoreSubscriptionDoc | null;
    setActiveSubscription: any;
    activeSubscriptionLoading: boolean;
    setActiveSubscriptionLoading: any;

    // Multi-Outlet Session Context (Feature #4C — T20/T21)
    isMasterUser: boolean;
    activeStoreContext: number | null;  // Which store user is viewing (null = own store)
    setActiveStoreContext: (storeId: number | null) => void;

    cachedKBCategories: { cachedOn: Timestamp, kBCategories: KbCategoriesMap };
    setCachedKBCategories: any;

    cachedChangelog: { cachedOn: Timestamp, changelog: ChangelogPage };
    setCachedChangelog: any;

    cachedTickets: { cachedOn: Timestamp, tickets: SupportTicketType[] };
    setCachedTickets: any;

    cachedArticles: { cachedOn: Timestamp | null, articles: KnowledgeBaseArticleType[] };
    setCachedArticles: any;

    platformStoreSummaryOptions: PlatformStoreSummaryOption[];
    setPlatformStoreSummaryOptions: any;
    platformStoreSummaryLoadedAt: number | null;
    setPlatformStoreSummaryLoadedAt: any;
    platformStoreSummaryLoading: boolean;
    setPlatformStoreSummaryLoading: any;
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

    isMasterUser: false,
    activeStoreContext: null,
    setActiveStoreContext: () => { },

    cachedKBCategories: { cachedOn: null, kBCategories: null },
    setCachedKBCategories: () => { },

    cachedChangelog: { cachedOn: null, changelog: null },
    setCachedChangelog: () => { },

    cachedTickets: { cachedOn: null, tickets: [] },
    setCachedTickets: () => { },

    cachedArticles: { cachedOn: null, articles: [] },
    setCachedArticles: () => { },

    platformStoreSummaryOptions: [],
    setPlatformStoreSummaryOptions: () => { },
    platformStoreSummaryLoadedAt: null,
    setPlatformStoreSummaryLoadedAt: () => { },
    platformStoreSummaryLoading: false,
    setPlatformStoreSummaryLoading: () => { },
}

export const PlatformGlobalDataContext = createContext<PlatformGlobalDataProviderType>(InititalState)

function PlatformGlobalDataProvider({ children, contextData }: { children: any, contextData: PlatformGlobalDataProviderType }) {
    const [contextState, setContextState] = useState(contextData)

    useEffect(() => {
        setContextState(contextData)
    }, [contextData])

    return (
        <PlatformGlobalDataContext.Provider value={contextState} >
            {children}
        </PlatformGlobalDataContext.Provider>
    )
}

export default PlatformGlobalDataProvider
