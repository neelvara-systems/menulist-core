'use client';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { getStoreById } from '@database/stores';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getTenantById } from '@database/tenants';
import { clearUserContext, setUserContext } from '@lib/monitoring/logger';
import { applyOutletPolicy } from '@lib/permissions/applyOutletPolicy';
import { ChangelogPage } from '@type/changelog';
import { KbCategoriesMap, KnowledgeBaseArticleType } from '@type/knowledgeBase';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { SupportTicketType } from '@type/supportTicket';
import { objectNullCheck, removeObjRef } from '@util/utils';
import { Timestamp } from 'firebase/firestore';
import { Session } from 'next-auth';
import { SessionProvider as Provider } from 'next-auth/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import ServerSidePageLoader from '../app/loading';
import PlatformGlobalDataProvider from './platformProviders/platformGlobalDataProvider';

type Props = {
    children: React.ReactNode;
    session: Session | null;
}

export default function SessionProvider({ children, session }: Props) {

    // Define the initial state for tenant details
    const [tenantDetails, setTenantDetails] = useState<TenantDataType>(null)

    // Define the initial state for store details
    const [storeDetails, setStoreDetails] = useState<StoreDataType>(null)

    const [userPermissions, setUserPermissions] = useState<any>(null)

    const [usersList, setUsersList] = useState<any>(null)

    const [fontsList, setFontsList] = useState<any>(null)

    const [assetsList, setAssetsList] = useState<any>({ images: [] })

    const [activeSubscription, setActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null)

    // Multi-Outlet Session Context (Feature #4C — T20/T21)
    // Persisted to localStorage so store context survives page refresh
    const [activeStoreContext, setActiveStoreContextRaw] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const stored = localStorage.getItem('activeStoreContext');
            return stored ? Number(stored) : null;
        } catch { return null; }
    });
    const setActiveStoreContext = (storeId: number | null) => {
        setActiveStoreContextRaw(storeId);
        try {
            if (storeId !== null) {
                localStorage.setItem('activeStoreContext', String(storeId));
            } else {
                localStorage.removeItem('activeStoreContext');
            }
        } catch { /* localStorage unavailable */ }
    };

    const [cachedKBCategories, setCachedKBCategories] = useState<{ cachedOn: Timestamp, kBCategories: KbCategoriesMap }>({ cachedOn: null, kBCategories: null })//this are knowledge base categories which used in changelog 

    const [cachedChangelog, setCachedChangelog] = useState<{ cachedOn: Timestamp, changelog: ChangelogPage }>({ cachedOn: null, changelog: null })

    const [cachedTickets, setCachedTickets] = useState<{ cachedOn: Timestamp, tickets: SupportTicketType[] }>({ cachedOn: null, tickets: [] })

    const [cachedArticles, setCachedArticles] = useState<{ cachedOn: Timestamp | null, articles: KnowledgeBaseArticleType[] }>({ cachedOn: null, articles: [] })

    // Reference to store previous session key for comparison
    const prevSessionKeyRef = useRef<string>();

    // Listen for AI balance updates from API responses (saves Firebase reads)
    // When any AI service gets a response with remainingBalance, it fires this event
    useEffect(() => {
        const handleBalanceUpdate = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail) {
                setActiveSubscription((prev: FirestoreSubscriptionDoc | null) =>
                    prev ? { ...prev, monthlyCredits: detail.monthlyCredits, topUpCredits: detail.topUpCredits } : prev
                );
            }
        };
        window.addEventListener('ai-balance-update', handleBalanceUpdate);
        return () => window.removeEventListener('ai-balance-update', handleBalanceUpdate);
    }, []);

    // Use the useEffect hook to fetch store details when the session changes
    useEffect(() => {
        // console.log("session inside SessionProvider", session);

        // Create a key from relevant session data for comparison
        const currentSessionKey = JSON.stringify({
            user: session?.user,
            expires: session?.expires
        });

        // Skip if session data hasn't meaningfully changed
        if (currentSessionKey === prevSessionKeyRef.current) {
            // console.log("Session update skipped - no meaningful changes");
            return;
        }
        prevSessionKeyRef.current = currentSessionKey;

        console.log("session", session)
        // Check if the session exists and store details have not been fetched yet
        if (session && (session.user?.platformRole == ECOMSAI_PLATFORM_USER_ROLE ? true : Boolean(session.user?.storeId)) && !Boolean(storeDetails?.storeId)) {

            // Fetch tenant details by tenant ID
            getTenantById(session.user.tenantId).then((fetchedTenant: TenantDataType) => {
                // Fetch store details by store ID
                // console.log("fetchedTenant fetched inside SessionProvider", fetchedTenant)
                getStoreById(session.user.storeId).then(async (fetchedStore: StoreDataType) => {
                    // Update the tenant details state with the fetched fetchedTenant
                    const storeIndex = fetchedTenant.storesList.findIndex((s) => s.storeId == session.user.storeId);
                    fetchedTenant.storesList[storeIndex].storeDetails = removeObjRef(fetchedStore)
                    setTenantDetails(fetchedTenant);

                    // Update the store details state with the fetched fetchedStore
                    // console.log("storeDetails fetched inside SessionProvider", fetchedStore)
                    setStoreDetails(fetchedStore);

                    // const users = await getUsersByStoreId(session.user.storeId);
                    // setUsersList(removeObjRef(users))

                    // Fetch subscription data
                    const subscriptionData: any = await getActiveSubscriptionForStore(Number(session.user.tenantId), Number(session.user.storeId))
                    setActiveSubscription(subscriptionData)

                    // Set user context for Sentry with subscription info (client identification)
                    setUserContext({
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.name,
                        tId: session.user.tenantId,
                        sId: session.user.storeId,
                        tenantName: fetchedTenant.name,
                        storeName: fetchedStore.name,
                        role: session.user.stores?.find((store: any) => store.storeId === session.user.storeId)?.role || 'user',
                        subscriptionPlan: subscriptionData?.planId || 'free',
                        subscriptionStatus: subscriptionData?.status || 'none',
                    });
                })
            })

        } else if (!session) {
            // Clear Sentry context on logout
            clearUserContext();
        }
    }, [session]) // Re-run the effect when the session changes

    useEffect(() => {
        if (objectNullCheck(storeDetails)) {
            if (!storeDetails?.roles) return;

            // Get user's single role for current store
            const userRoleId = session?.user?.stores?.find(
                (store: any) => store.storeId === session.user.storeId
            )?.role;

            // Find matching role definition from store
            const userRole = storeDetails.roles?.find((r: any) => r.id === userRoleId);

            if (userRole?.permissions) {
                // For outlet stores: apply master's outletPolicy to restrict permissions
                // Master store's outletPolicy is the chain-wide gate for what outlets can do
                const isMaster = Boolean(storeDetails.isMaster);
                if (!isMaster && tenantDetails?.storesList?.length) {
                    const masterStore = tenantDetails.storesList.find((s: any) => s.isMaster);
                    const outletPolicy = masterStore?.storeDetails?.outletPolicy;
                    setUserPermissions(applyOutletPolicy(userRole.permissions, outletPolicy, false));
                } else {
                    // Master store or single store - direct permissions
                    setUserPermissions(userRole.permissions);
                }
            }
        }
    }, [storeDetails, tenantDetails])

    // useEffect(() => {
    //     startLogCapture();
    // }, []);

    return (
        <Provider
            session={session}
            refetchInterval={0}              // ✅ Disable auto-polling (was causing 15+ calls)
            refetchOnWindowFocus={false}     // ✅ Disable refetch on window focus
        >
            <PlatformGlobalDataProvider contextData={{
                tenantDetails,
                setTenantDetails,
                storeDetails,
                setStoreDetails,
                userPermissions,
                setUserPermissions,
                usersList,
                setUsersList,
                fontsList,
                setFontsList,
                assetsList,
                setAssetsList,
                activeSubscription,
                setActiveSubscription,
                isMasterUser: Boolean(storeDetails?.isMaster && tenantDetails?.storesList?.length > 1),
                activeStoreContext,
                setActiveStoreContext,
                cachedKBCategories,
                setCachedKBCategories,
                cachedChangelog,
                setCachedChangelog,
                cachedTickets,
                setCachedTickets,
                cachedArticles,
                setCachedArticles
            }}>
                {(session && !storeDetails) ? (
                    <ServerSidePageLoader page="Loading Store Data" />
                ) : (
                    <Suspense fallback={<ServerSidePageLoader page="Main Layout" />}>
                        {children}
                    </Suspense>
                )}
            </PlatformGlobalDataProvider>
        </Provider>
    )
}