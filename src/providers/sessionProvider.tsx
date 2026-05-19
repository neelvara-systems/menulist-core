'use client';
import {
    DEPLOYMENT_IDENTITY_STORAGE_KEY,
    emitDeploymentIdentityUpdated,
} from '@constant/deploymentDebug';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import RolesPermissionInitialData from '@data/rolesPermissionsInitialData';
import { getStoreById } from '@database/stores';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getTenantById } from '@database/tenants';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { clearUserContext, setUserContext } from '@lib/monitoring/logger';
import {
    readActiveStoreContextId,
    writeActiveStoreContextId,
} from '@lib/multiOutlet/activeStoreContext';
import { applyOutletPolicy } from '@lib/permissions/applyOutletPolicy';
import { getPermissionsForRole } from '@lib/permissions/hasPermission';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { ChangelogPage } from '@type/changelog';
import { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { SupportTicketType } from '@type/supportTicket';
import { objectNullCheck, removeObjRef } from '@util/utils';
import { Timestamp } from 'firebase/firestore';
import { Session } from 'next-auth';
import { SessionProvider as Provider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ServerSidePageLoader from '../app/loading';
import PlatformGlobalDataProvider from './platformProviders/platformGlobalDataProvider';

type Props = {
    children: React.ReactNode;
    session: Session | null;
}

const maskDebugEmail = (email: unknown) => {
    if (typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
};

export default function SessionProvider({ children, session }: Props) {
    const pathname = usePathname();

    // Define the initial state for tenant details
    const [tenantDetails, setTenantDetails] = useState<TenantDataType>(null)

    // Define the initial state for store details
    const [storeDetails, setStoreDetails] = useState<StoreDataType>(null)

    // Login store remains the authority store. storeDetails can change when an
    // HQ user views an outlet, but permissions must still come from this store.
    const [loginStoreDetails, setLoginStoreDetails] = useState<StoreDataType>(null)

    const [userPermissions, setUserPermissions] = useState<any>(null)

    const [usersList, setUsersList] = useState<any>(null)

    const [fontsList, setFontsList] = useState<any>(null)

    const [assetsList, setAssetsList] = useState<any>({ images: [] })

    const [activeSubscription, setActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null)
    const [activeSubscriptionLoading, setActiveSubscriptionLoading] = useState(Boolean(session?.user?.storeId))

    // Multi-Outlet Session Context (Feature #4C — T20/T21)
    // Persisted to localStorage so store context survives page refresh
    const [activeStoreContext, setActiveStoreContextRaw] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        return readActiveStoreContextId();
    });
    const setActiveStoreContext = useCallback((storeId: number | null) => {
        setActiveStoreContextRaw(storeId);
        writeActiveStoreContextId(storeId, {
            baseStoreId: session?.user?.storeId ?? null,
            tenantId: session?.user?.tenantId ?? null,
        });
    }, [session?.user?.storeId, session?.user?.tenantId]);

    const [cachedKBCategories, setCachedKBCategories] = useState<{ cachedOn: Timestamp, kBCategories: KnowledgeBaseCategoriesType }>({ cachedOn: null, kBCategories: null })//this are knowledge base categories which used in changelog

    const [cachedChangelog, setCachedChangelog] = useState<{ cachedOn: Timestamp, changelog: ChangelogPage }>({ cachedOn: null, changelog: null })

    const [cachedTickets, setCachedTickets] = useState<{ cachedOn: Timestamp, tickets: SupportTicketType[] }>({ cachedOn: null, tickets: [] })

    const [cachedArticles, setCachedArticles] = useState<{ cachedOn: Timestamp | null, articles: KnowledgeBaseArticleType[] }>({ cachedOn: null, articles: [] })

    const [platformStoreSummaryOptions, setPlatformStoreSummaryOptions] = useState<PlatformStoreSummaryOption[]>([])
    const [platformStoreSummaryLoadedAt, setPlatformStoreSummaryLoadedAt] = useState<number | null>(null)
    const [platformStoreSummaryLoading, setPlatformStoreSummaryLoading] = useState(false)
    const [firebaseAuthReady, setFirebaseAuthReady] = useState(!session?.user?.storeId)
    const [firebaseAuthSyncError, setFirebaseAuthSyncError] = useState<Error | null>(null)
    const activeSubscriptionStoreIdRef = useRef<number | null>(null);
    const activeSubscriptionRequestStoreIdRef = useRef<number | null>(null);
    const normalizedPathname = pathname === '/' ? pathname : pathname.replace(/\/+$/, '');
    const isPlatformSession = session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const isResellerSession = session?.user?.platformRole === RESELLER_USER_ROLE;
    const isStoreIndependentRoute =
        normalizedPathname === '/help-center'
        || normalizedPathname === '/platform'
        || normalizedPathname.startsWith('/platform/')
        || normalizedPathname === '/ops'
        || normalizedPathname.startsWith('/ops/')
        || normalizedPathname === '/canonica'
        || normalizedPathname.startsWith('/canonica/')
        || normalizedPathname === '/reseller'
        || normalizedPathname.startsWith('/reseller/');
    const canRenderBeforeStoreData = Boolean(session) && (
        (isPlatformSession && isStoreIndependentRoute)
        || (isResellerSession && (normalizedPathname === '/reseller' || normalizedPathname.startsWith('/reseller/')))
    );

    // Reference to store previous session key for comparison
    const prevSessionKeyRef = useRef<string>();

    const fetchActiveSubscriptionForStore = useCallback(async (
        tenantId: number,
        storeId: number,
        storesList?: any[],
    ) => {
        activeSubscriptionRequestStoreIdRef.current = storeId;
        setActiveSubscriptionLoading(true);

        try {
            const subscriptionData: any = await getActiveSubscriptionForStore(
                tenantId,
                storeId,
                storesList,
            );

            if (activeSubscriptionRequestStoreIdRef.current === storeId) {
                activeSubscriptionStoreIdRef.current = storeId;
                setActiveSubscription(subscriptionData);
            }

            return subscriptionData;
        } finally {
            if (activeSubscriptionRequestStoreIdRef.current === storeId) {
                activeSubscriptionRequestStoreIdRef.current = null;
                setActiveSubscriptionLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        const requiresFirebaseAuth = Boolean(session?.user?.tenantId && session?.user?.storeId);

        if (!session) {
            setFirebaseAuthReady(false);
            setFirebaseAuthSyncError(null);
            return;
        }

        if (!requiresFirebaseAuth) {
            setFirebaseAuthReady(true);
            setFirebaseAuthSyncError(null);
            return;
        }

        setFirebaseAuthReady(false);
        setFirebaseAuthSyncError(null);

        ensureFirebaseAuthForSession(session)
            .then(() => {
                if (!cancelled) setFirebaseAuthReady(true);
            })
            .catch((error) => {
                const normalizedError = error instanceof Error ? error : new Error('Firebase Auth sync failed');
                console.error('[MenuList] Firebase Auth sync failed before store bootstrap', normalizedError);
                if (!cancelled) {
                    setFirebaseAuthSyncError(normalizedError);
                    setActiveSubscriptionLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        session?.user?.email,
        session?.user?.id,
        session?.user?.storeId,
        session?.user?.tenantId,
    ]);

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
        if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
            const debugSession = {
                userId: session?.user?.id,
                email: maskDebugEmail(session?.user?.email),
                platformRole: (session as any)?.platformRole || session?.user?.platformRole,
                role: (session as any)?.role || session?.user?.role,
                tenantId: session?.user?.tenantId,
                storeId: session?.user?.storeId,
                active: session?.user?.active,
                isVerified: session?.user?.isVerified,
            };
            (window as any).__MENULIST_SESSION_DEBUG__ = debugSession;
            console.info('[MenuList session debug]', debugSession);
        }

        if (session?.user?.tenantId && session?.user?.storeId && !firebaseAuthReady) {
            return;
        }

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

        // Check if the session exists and store details have not been fetched yet
        if (session && (session.user?.platformRole == ECOMSAI_PLATFORM_USER_ROLE ? true : Boolean(session.user?.storeId)) && !Boolean(storeDetails?.storeId)) {
            setActiveSubscriptionLoading(Boolean(session.user?.storeId));

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
                    setLoginStoreDetails(fetchedStore);
                    setStoreDetails(fetchedStore);

                    // const users = await getUsersByStoreId(session.user.storeId);
                    // setUsersList(removeObjRef(users))

                    // Fetch subscription data
                    const subscriptionData = await fetchActiveSubscriptionForStore(
                        Number(session.user.tenantId),
                        Number(session.user.storeId),
                        fetchedTenant.storesList,
                    )

                    // Set user context for Sentry with subscription info (client identification)
                    setUserContext({
                        id: session.user.id,
                        email: (session.user as any).displayEmail || (session.user as any).phone || (session.user as any).phoneUsername || session.user.email,
                        name: session.user.name,
                        tId: session.user.tenantId,
                        sId: session.user.storeId,
                        tenantName: fetchedTenant.name,
                        storeName: fetchedStore.name,
                        role: session.user.stores?.find((store: any) => store.storeId === session.user.storeId)?.role || 'user',
                        subscriptionPlan: subscriptionData?.planId || 'free',
                        subscriptionStatus: subscriptionData?.status || 'none',
                    });
                }).catch((e) => {
                    setActiveSubscriptionLoading(false)
                    console.log(e)
                })
            }).catch((e) => {
                setActiveSubscriptionLoading(false)
                console.log(e)
            })

        } else if (!session) {
            // Clear Sentry context on logout
            activeSubscriptionStoreIdRef.current = null;
            activeSubscriptionRequestStoreIdRef.current = null;
            setActiveSubscription(null);
            setActiveSubscriptionLoading(false);
            clearUserContext();
        }
    }, [fetchActiveSubscriptionForStore, session, firebaseAuthReady]) // Re-run the effect when the session changes

    useEffect(() => {
        if (!session || !loginStoreDetails || !tenantDetails?.storesList?.length) return;

        const loginStoreId = Number(session.user?.storeId);
        const canUseStoreContext = Boolean(loginStoreDetails.isMaster);
        const targetStoreId = canUseStoreContext && activeStoreContext && activeStoreContext !== loginStoreId
            ? activeStoreContext
            : null;

        if (activeStoreContext && !targetStoreId) {
            setActiveStoreContext(null);
            if (storeDetails?.storeId !== loginStoreDetails.storeId) {
                setStoreDetails(loginStoreDetails);
            }
            return;
        }

        if (!targetStoreId) {
            if (storeDetails?.storeId !== loginStoreDetails.storeId) {
                setStoreDetails(loginStoreDetails);
            }
            if (
                activeSubscriptionStoreIdRef.current === loginStoreId
                || activeSubscriptionRequestStoreIdRef.current === loginStoreId
            ) {
                return;
            }

            void fetchActiveSubscriptionForStore(
                Number(session.user.tenantId),
                loginStoreId,
                tenantDetails.storesList,
            );
            return;
        }

        const targetSummary = tenantDetails.storesList.find((store: any) => store.storeId === targetStoreId);
        if (!targetSummary) {
            setActiveStoreContext(null);
            return;
        }

        let cancelled = false;
        const loadTargetStore = async () => {
            setActiveSubscriptionLoading(true);
            const targetStore = targetSummary.storeDetails || await getStoreById(targetStoreId);
            if (cancelled) return;

            if (!targetSummary.storeDetails) {
                setTenantDetails((current: TenantDataType) => {
                    if (!current?.storesList?.length) return current;
                    return {
                        ...current,
                        storesList: current.storesList.map((store: any) => (
                            store.storeId === targetStoreId
                                ? { ...store, storeDetails: removeObjRef(targetStore) }
                                : store
                        )),
                    };
                });
            }

            setStoreDetails(targetStore);
            const subscriptionData = await fetchActiveSubscriptionForStore(
                Number(session.user.tenantId),
                targetStoreId,
                tenantDetails.storesList,
            );
            if (!cancelled) {
                activeSubscriptionStoreIdRef.current = targetStoreId;
                setActiveSubscription(subscriptionData);
            }
        };

        void loadTargetStore().catch(() => {
            if (!cancelled) {
                setActiveSubscriptionLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [
        activeStoreContext,
        loginStoreDetails,
        session,
        setActiveStoreContext,
        fetchActiveSubscriptionForStore,
        storeDetails?.storeId,
        tenantDetails,
    ]);

    useEffect(() => {
        const authorityStoreDetails = loginStoreDetails || storeDetails;
        if (objectNullCheck(authorityStoreDetails)) {
            if (!authorityStoreDetails?.roles) return;

            if (session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE) {
                setUserPermissions(RolesPermissionInitialData);
                return;
            }

            // Get user's single role for their login store. HQ users keep HQ
            // authority while viewing an outlet context.
            const userRoleId = session?.user?.stores?.find(
                (store: any) => store.storeId === session.user.storeId
            )?.role;

            // Find matching role definition from store
            const userRole = authorityStoreDetails.roles?.find((r: any) => r.id === userRoleId);

            if (userRole?.permissions) {
                const rolePermissions = getPermissionsForRole(userRoleId, authorityStoreDetails.roles || []);
                // For outlet stores: apply master's outletPolicy to restrict permissions
                // Master store's outletPolicy is the chain-wide gate for what outlets can do
                const isMaster = Boolean(authorityStoreDetails.isMaster);
                if (!isMaster && tenantDetails?.storesList?.length) {
                    const masterStore = tenantDetails.storesList.find((s: any) => s.isMaster);
                    const outletPolicy = masterStore?.storeDetails?.outletPolicy;
                    setUserPermissions(applyOutletPolicy(rolePermissions, outletPolicy, false));
                } else {
                    // Master store or single store - direct permissions
                    setUserPermissions(rolePermissions);
                }
            }
        }
    }, [loginStoreDetails, session?.user?.storeId, session?.user?.stores, storeDetails, tenantDetails])

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const tenantId = tenantDetails?.tenantId ?? session?.user?.tenantId ?? null;
        const tenantName = tenantDetails?.name || '';
        const storeId = storeDetails?.storeId ?? session?.user?.storeId ?? null;
        const storeName = storeDetails?.name || '';

        if (!tenantId && !storeId && !tenantName && !storeName) return;

        window.sessionStorage.setItem(
            DEPLOYMENT_IDENTITY_STORAGE_KEY,
            JSON.stringify({ tenantId, tenantName, storeId, storeName }),
        );
        emitDeploymentIdentityUpdated();
    }, [
        session?.user?.storeId,
        session?.user?.tenantId,
        storeDetails?.name,
        storeDetails?.storeId,
        tenantDetails?.name,
        tenantDetails?.tenantId,
    ]);

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
                activeSubscriptionLoading,
                setActiveSubscriptionLoading,
                isMasterUser: Boolean((loginStoreDetails || storeDetails)?.isMaster),
                activeStoreContext,
                setActiveStoreContext,
                cachedKBCategories,
                setCachedKBCategories,
                cachedChangelog,
                setCachedChangelog,
                cachedTickets,
                setCachedTickets,
                cachedArticles,
                setCachedArticles,
                platformStoreSummaryOptions,
                setPlatformStoreSummaryOptions,
                platformStoreSummaryLoadedAt,
                setPlatformStoreSummaryLoadedAt,
                platformStoreSummaryLoading,
                setPlatformStoreSummaryLoading
            }}>
                {(session && session.user?.storeId && !firebaseAuthReady && !canRenderBeforeStoreData) ? (
                    <ServerSidePageLoader page={firebaseAuthSyncError ? "Unable to load store access" : "Connecting Account"} />
                ) : (session && !storeDetails && !canRenderBeforeStoreData) ? (
                    <ServerSidePageLoader page="Loading Store Data" />
                ) : children}
            </PlatformGlobalDataProvider>
        </Provider>
    )
}
