'use client';
import {
    DEPLOYMENT_IDENTITY_STORAGE_KEY,
    emitDeploymentIdentityUpdated,
    normalizeDeploymentDebugIdentity,
} from '@constant/deploymentDebug';
import { MENULIST_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import RolesPermissionInitialData from '@data/rolesPermissionsInitialData';
import { getStoreById, readStoreById } from '@database/stores';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { readTenantById } from '@database/tenants';
import { getMenuListSubscriptionEntitlementScope } from '@lib/billing/menuListSubscriptionEntitlementBoundary';
import {
    ensureFirebaseAuthForSession,
    getFirebaseAuthSessionScopeKey,
} from '@lib/auth/firebaseAuthSync';
import { refreshClientSessionCacheFromApi } from '@lib/auth/getActiveSession';
import { doesClientSessionMatchTrustedServerSession } from '@lib/auth/loginSessionBoundary';
import {
    createFirebaseBootstrapError,
    getBoundedFirebaseStringContext,
    getFirebaseAuthSessionLogContext,
    logFirebaseBootstrapFailure,
} from '@lib/firebase/firebaseDiagnostics';
import {
    getAnswerlatticeScopedSession,
    isAnswerlatticeRuntimeRoute,
    resolveAnswerlatticeSessionScope,
} from '@lib/answerlattice/sessionScope';
import { startLogCapture } from '@lib/localLogs/localLogsTracker';
import { clearUserContext, setUserContext } from '@lib/monitoring/logger';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    readActiveStoreContextIdForSession,
    writeActiveStoreContextId,
} from '@lib/multiOutlet/activeStoreContext';
import { isMasterLocationContext } from '@lib/multiOutlet/locationAccess';
import { canUserAccessStore } from '@lib/multiOutlet/storeSwitchAccess';
import {
    getActiveTenantStoreSummaryId,
    isActiveStoreRecordInTenantScope,
} from '@lib/multiOutlet/sessionStoreContextBoundary';
import {
    getSessionProviderScopeKey,
    getSubscriptionLoadScopeKey,
    hasSessionProviderScopeChanged,
} from '@lib/multiOutlet/sessionProviderScopeBoundary';
import { applyOutletPolicy } from '@lib/permissions/applyOutletPolicy';
import { getPermissionsForRole } from '@lib/permissions/hasPermission';
import type { PlatformStoreSummaryOption } from '@lib/platform/storeSummaryOptions';
import { ChangelogPage } from '@type/changelog';
import { KnowledgeBaseArticleType, KnowledgeBaseCategoriesType } from '@type/knowledgeBase';
import type { AnswerlatticeReadableArticle } from '@lib/answerlattice/publicContentBoundary';
import type { AssetsCategoryType, FontPresetsType } from '@type/assets';
import type { EffectiveRolePermissions } from '@type/platform/roles';
import { StoreDataType } from '@type/platform/store';
import { TenantDataType } from '@type/platform/tenant';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { SupportTicketType } from '@type/supportTicket';
import type { StaffUserSummary } from '@lib/staffManagement/types';
import { objectNullCheck, removeObjRef } from '@util/utils';
import { normalizeAiBalanceUpdate } from '@services/ai/balanceSync';
import { Timestamp } from 'firebase/firestore';
import { Session } from 'next-auth';
import type LoginUserType from '@type/loginUser';
import { SessionProvider as Provider, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import BrandedPageLoader from '@atoms/brandedPageLoader';
import StoreAccessRecovery from '@/components/auth/StoreAccessRecovery';
import PlatformGlobalDataProvider from './platformProviders/platformGlobalDataProvider';

type Props = {
    children: React.ReactNode;
    session: Session | null;
    productContext?: 'answerlattice';
}

const FIREBASE_AUTH_BOOTSTRAP_SETTLE_MS = 250;

const waitForFirebaseAuthPropagation = () => new Promise((resolve) => {
    window.setTimeout(resolve, FIREBASE_AUTH_BOOTSTRAP_SETTLE_MS);
});

const maskDebugEmail = (email: unknown) => {
    if (typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
};

export default function SessionProvider({ children, session, productContext }: Props) {
    const pathname = usePathname();

    // Define the initial state for tenant details
    const [tenantDetails, setTenantDetails] = useState<TenantDataType | null>(null)

    // Define the initial state for store details
    const [storeDetails, setStoreDetails] = useState<StoreDataType | null>(null)

    // Login store remains the authority store. storeDetails can change when an
    // HQ user views an outlet, but permissions must still come from this store.
    const [loginStoreDetails, setLoginStoreDetails] = useState<StoreDataType | null>(null)

    const [userPermissions, setUserPermissions] = useState<EffectiveRolePermissions | null>(null)

    const [usersList, setUsersList] = useState<StaffUserSummary[] | null>(null)

    const [fontsList, setFontsList] = useState<FontPresetsType[] | null>(null)

    const [assetsList, setAssetsList] = useState<{ images: AssetsCategoryType[] }>({ images: [] })

    const [activeSubscription, setActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null)
    const [activeSubscriptionLoading, setActiveSubscriptionLoading] = useState(Boolean(session?.user?.storeId))
    const [activeSubscriptionSyncError, setActiveSubscriptionSyncError] = useState<Error | null>(null)
    const [activeSubscriptionRetryNonce, setActiveSubscriptionRetryNonce] = useState(0)

    // Multi-Outlet Session Context (Feature #4C — T20/T21)
    // Persisted to localStorage so store context survives page refresh
    const [activeStoreContext, setActiveStoreContextRaw] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        return readActiveStoreContextIdForSession(session as unknown as LoginUserType | null);
    });
    const setActiveStoreContext = useCallback((storeId: number | null) => {
        setActiveStoreContextRaw(storeId);
        writeActiveStoreContextId(storeId, {
            baseStoreId: session?.user?.storeId ?? null,
            tenantId: session?.user?.tenantId ?? null,
        });
    }, [session?.user?.storeId, session?.user?.tenantId]);

    const [cachedKBCategories, setCachedKBCategories] = useState<{ cachedOn: Timestamp | null, kBCategories: KnowledgeBaseCategoriesType | null, scopeKey: string | null }>({ cachedOn: null, kBCategories: null, scopeKey: null })//this are knowledge base categories which used in changelog

    const [cachedChangelog, setCachedChangelog] = useState<{ cachedOn: Timestamp | null, changelog: ChangelogPage | null, scopeKey: string | null }>({ cachedOn: null, changelog: null, scopeKey: null })

    const [cachedTickets, setCachedTickets] = useState<{ cachedOn: Timestamp | null, tickets: SupportTicketType[], scopeKey: string | null }>({ cachedOn: null, tickets: [], scopeKey: null })

    const [cachedArticles, setCachedArticles] = useState<{ cachedOn: Timestamp | null, articles: AnswerlatticeReadableArticle[], scopeKey: string | null }>({ cachedOn: null, articles: [], scopeKey: null })

    const [platformStoreSummaryOptions, setPlatformStoreSummaryOptions] = useState<PlatformStoreSummaryOption[]>([])
    const [platformStoreSummaryLoadedAt, setPlatformStoreSummaryLoadedAt] = useState<number | null>(null)
    const [platformStoreSummaryLoading, setPlatformStoreSummaryLoading] = useState(false)
    const [clientProviderSession, setClientProviderSession] = useState<LoginUserType | null | undefined>(
        session ? undefined : null,
    )
    const [clientSessionSyncError, setClientSessionSyncError] = useState<Error | null>(null)
    const [firebaseAuthReadyScopeKey, setFirebaseAuthReadyScopeKey] = useState<string | null>(null)
    const [firebaseAuthSyncError, setFirebaseAuthSyncError] = useState<Error | null>(null)
    const [firebaseAuthRetryNonce, setFirebaseAuthRetryNonce] = useState(0)
    const activeSubscriptionScopeKeyRef = useRef<string | null>(null);
    const activeSubscriptionRequestScopeKeyRef = useRef<string | null>(null);
    const normalizedPathname = pathname === '/' ? pathname : (pathname || '').replace(/\/+$/, '');
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const isAnswerlatticeRoute = productContext === 'answerlattice'
        || isAnswerlatticeRuntimeRoute(normalizedPathname, currentHostname);
    const authenticatedSession = clientProviderSession ?? session;
    const answerlatticeScope = isAnswerlatticeRoute ? resolveAnswerlatticeSessionScope(authenticatedSession) : null;
    const effectiveSession = isAnswerlatticeRoute
        ? getAnswerlatticeScopedSession(authenticatedSession as LoginUserType | null)
        : authenticatedSession;
    const requiresFirebaseAuth = Boolean(
        effectiveSession?.user?.tenantId && effectiveSession?.user?.storeId,
    );
    const firebaseAuthRequiredScopeKey = requiresFirebaseAuth
        ? getFirebaseAuthSessionScopeKey(effectiveSession)
        : null;
    const firebaseAuthReady = !requiresFirebaseAuth || Boolean(
        firebaseAuthRequiredScopeKey
        && firebaseAuthReadyScopeKey === firebaseAuthRequiredScopeKey,
    );
    const isPlatformSession = session?.user?.platformRole === MENULIST_PLATFORM_USER_ROLE;
    const isResellerSession = session?.user?.platformRole === RESELLER_USER_ROLE;
    const isStoreIndependentRoute =
        normalizedPathname === '/help-center'
        || normalizedPathname === '/platform'
        || normalizedPathname.startsWith('/platform/')
        || normalizedPathname === '/ops'
        || normalizedPathname.startsWith('/ops/')
        || isAnswerlatticeRoute
        || normalizedPathname === '/reseller'
        || normalizedPathname.startsWith('/reseller/');
    const canRenderBeforeStoreData = Boolean(session) && (
        (isAnswerlatticeRoute && Boolean(answerlatticeScope))
        || (isPlatformSession && isAnswerlatticeRoute)
        || (isPlatformSession && isStoreIndependentRoute)
        || (isResellerSession && (normalizedPathname === '/reseller' || normalizedPathname.startsWith('/reseller/')))
    );
    const canRenderBeforeFirebaseAuth = canRenderBeforeStoreData;

    // Reference to store previous session key for comparison
    const prevSessionKeyRef = useRef<string | undefined>(undefined);
    const providerSessionScopeKeyRef = useRef<string | null | undefined>(undefined);

    const resetScopedProviderState = useCallback(() => {
        setTenantDetails(null);
        setStoreDetails(null);
        setLoginStoreDetails(null);
        setUserPermissions(null);
        setUsersList(null);
        setFontsList(null);
        setAssetsList({ images: [] });
        setActiveStoreContextRaw(null);
        writeActiveStoreContextId(null);
        setCachedKBCategories({ cachedOn: null, kBCategories: null, scopeKey: null });
        setCachedChangelog({ cachedOn: null, changelog: null, scopeKey: null });
        setCachedTickets({ cachedOn: null, tickets: [], scopeKey: null });
        setCachedArticles({ cachedOn: null, articles: [], scopeKey: null });
        setPlatformStoreSummaryOptions([]);
        setPlatformStoreSummaryLoadedAt(null);
        setPlatformStoreSummaryLoading(false);
        activeSubscriptionScopeKeyRef.current = null;
        activeSubscriptionRequestScopeKeyRef.current = null;
        setActiveSubscription(null);
        setActiveSubscriptionSyncError(null);
        setActiveSubscriptionLoading(false);
        clearUserContext();
    }, []);

    const fetchActiveSubscriptionForStore = useCallback(async (
        tenantId: number,
        storeId: number,
        storesList?: any[],
    ) => {
        const requestScopeKey = getSubscriptionLoadScopeKey(tenantId, storeId);
        if (!requestScopeKey) {
            activeSubscriptionScopeKeyRef.current = null;
            activeSubscriptionRequestScopeKeyRef.current = null;
            setActiveSubscription(null);
            setActiveSubscriptionLoading(false);
            return null;
        }

        activeSubscriptionRequestScopeKeyRef.current = requestScopeKey;
        if (activeSubscriptionScopeKeyRef.current !== requestScopeKey) {
            setActiveSubscription(null);
        }
        setActiveSubscriptionSyncError(null);
        setActiveSubscriptionLoading(true);

        try {
            const subscriptionData: any = await getActiveSubscriptionForStore(
                tenantId,
                storeId,
                storesList,
            );

            if (activeSubscriptionRequestScopeKeyRef.current === requestScopeKey) {
                activeSubscriptionScopeKeyRef.current = requestScopeKey;
                setActiveSubscription(subscriptionData);
            }

            return subscriptionData;
        } catch (error) {
            if (activeSubscriptionRequestScopeKeyRef.current === requestScopeKey) {
                activeSubscriptionScopeKeyRef.current = null;
                setActiveSubscriptionSyncError(
                    error instanceof Error ? error : new Error('Subscription access could not be loaded'),
                );
            }
            throw error;
        } finally {
            if (activeSubscriptionRequestScopeKeyRef.current === requestScopeKey) {
                activeSubscriptionRequestScopeKeyRef.current = null;
                setActiveSubscriptionLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        if (!session) {
            setClientProviderSession(null);
            setClientSessionSyncError(null);
            return;
        }

        setClientProviderSession(undefined);
        setClientSessionSyncError(null);

        refreshClientSessionCacheFromApi()
            .then((refreshedSession) => {
                if (!doesClientSessionMatchTrustedServerSession(session, refreshedSession)) {
                    throw createFirebaseBootstrapError(
                        'Client session does not match the authenticated server session',
                        'session_provider_client_session_mismatch',
                    );
                }
                if (!cancelled) {
                    setClientProviderSession(refreshedSession);
                }
            })
            .catch((error) => {
                const normalizedError = new Error('Client session validation failed');
                logFirebaseBootstrapFailure('session_provider_client_session_refresh_failed', error, {
                    ...getFirebaseAuthSessionLogContext(session),
                });
                if (!cancelled) {
                    setClientProviderSession(null);
                    setClientSessionSyncError(normalizedError);
                    setActiveSubscriptionLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        session?.authIssuedAt,
        session?.pId,
        session?.role,
        session?.sId,
        session?.tId,
        session?.uId,
        session?.user?.id,
    ]);

    useEffect(() => {
        let cancelled = false;

        if (!session) {
            setFirebaseAuthReadyScopeKey(null);
            setFirebaseAuthSyncError(null);
            return;
        }

        if (!requiresFirebaseAuth) {
            setFirebaseAuthReadyScopeKey(null);
            setFirebaseAuthSyncError(null);
            return;
        }

        setFirebaseAuthSyncError(null);

        ensureFirebaseAuthForSession(effectiveSession)
            .then(() => {
                if (!cancelled && firebaseAuthRequiredScopeKey) {
                    setFirebaseAuthReadyScopeKey(firebaseAuthRequiredScopeKey);
                }
            })
            .catch((error) => {
                const normalizedError = new Error('Firebase Auth sync failed');
                logFirebaseBootstrapFailure('firebase_auth_session_provider_sync_failed', error, {
                    ...getFirebaseAuthSessionLogContext(effectiveSession),
                    pathPresent: Boolean(pathname),
                    pathLength: pathname?.length || 0,
                });
                if (!cancelled) {
                    setFirebaseAuthReadyScopeKey(null);
                    setFirebaseAuthSyncError(normalizedError);
                    setActiveSubscriptionLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        activeStoreContext,
        session?.user?.email,
        session?.user?.id,
        session?.user?.storeId,
        session?.user?.tenantId,
        effectiveSession?.user?.storeId,
        effectiveSession?.user?.tenantId,
        firebaseAuthRequiredScopeKey,
        firebaseAuthRetryNonce,
        requiresFirebaseAuth,
    ]);

    // Listen for AI balance updates from API responses (saves Firebase reads)
    // When any AI service gets a response with remainingBalance, it fires this event
    useEffect(() => {
        const handleBalanceUpdate = (e: Event) => {
            const detail = normalizeAiBalanceUpdate((e as CustomEvent<unknown>).detail);
            if (!detail) return;
            setActiveSubscription((prev: FirestoreSubscriptionDoc | null) => {
                const scope = getMenuListSubscriptionEntitlementScope(prev);
                if (!prev || !scope || scope.storeId !== detail.billingStoreId) return prev;
                return {
                    ...prev,
                    monthlyCredits: detail.monthlyCredits,
                    promotionalCredits: detail.promotionalCredits,
                    topUpCredits: detail.topUpCredits,
                };
            });
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
        }

        const currentProviderScopeKey = getSessionProviderScopeKey(effectiveSession);
        if (hasSessionProviderScopeChanged(providerSessionScopeKeyRef.current, currentProviderScopeKey)) {
            providerSessionScopeKeyRef.current = currentProviderScopeKey;
            prevSessionKeyRef.current = undefined;
            resetScopedProviderState();
            // Keep owner route gates waiting while the new signed-in scope is
            // bootstrapped. Exposing a transient `loading=false` here lets
            // Dashboard/Projects misclassify a paid owner as unpaid and route
            // them back to Billing before the subscription read can settle.
            setActiveSubscriptionLoading(Boolean(
                effectiveSession?.user?.storeId && !isAnswerlatticeRoute,
            ));
            return;
        }
        providerSessionScopeKeyRef.current = currentProviderScopeKey;

        if (isAnswerlatticeRoute) {
            setActiveSubscriptionLoading(false);
            return;
        }

        if (session && !clientProviderSession) {
            return;
        }

        if (effectiveSession?.user?.tenantId && effectiveSession?.user?.storeId && !firebaseAuthReady) {
            return;
        }

        // Create a key from relevant session data for comparison
        const currentSessionKey = JSON.stringify({
            user: effectiveSession?.user,
            expires: clientProviderSession?.expires
        });

        // Skip if session data hasn't meaningfully changed
        if (currentSessionKey === prevSessionKeyRef.current) {
            return;
        }
        prevSessionKeyRef.current = currentSessionKey;

        let cancelled = false;

        // Check if the session exists and store details have not been fetched yet
        if (session && (session.user?.platformRole == MENULIST_PLATFORM_USER_ROLE ? true : Boolean(session.user?.storeId)) && !Boolean(storeDetails?.storeId)) {
            setActiveSubscriptionLoading(Boolean(session.user?.storeId));

            const bootstrapStoreContext = async () => {
                try {
                    const canRefreshFirebaseAuth = Boolean(effectiveSession?.user?.tenantId && effectiveSession?.user?.storeId);
                    const refreshFirebaseAuthForBootstrap = async () => {
                        if (!canRefreshFirebaseAuth) return;
                        await ensureFirebaseAuthForSession(effectiveSession);
                        await waitForFirebaseAuthPropagation();
                    };
                    const readTenantForBootstrap = async () => {
                        try {
                            return await readTenantById(Number(session.user.tenantId)) as TenantDataType | null;
                        } catch (error) {
                            await refreshFirebaseAuthForBootstrap();
                            if (cancelled) return null;
                            try {
                                return await readTenantById(Number(session.user.tenantId)) as TenantDataType | null;
                            } catch {
                                throw createFirebaseBootstrapError(
                                    'Tenant bootstrap read failed',
                                    'session_provider_tenant_read_failed',
                                );
                            }
                        }
                    };
                    const readStoreForBootstrap = async () => {
                        try {
                            return await readStoreById(Number(session.user.storeId)) as StoreDataType | null;
                        } catch (error) {
                            await refreshFirebaseAuthForBootstrap();
                            if (cancelled) return null;
                            try {
                                return await readStoreById(Number(session.user.storeId)) as StoreDataType | null;
                            } catch {
                                throw createFirebaseBootstrapError(
                                    'Store bootstrap read failed',
                                    'session_provider_store_read_failed',
                                );
                            }
                        }
                    };

                    await refreshFirebaseAuthForBootstrap();

                    if (cancelled) return;

                    const fetchedTenant = await readTenantForBootstrap();
                    const fetchedStore = await readStoreForBootstrap();
                    if (cancelled) return;

                    if (!fetchedStore) {
                        throw createFirebaseBootstrapError(
                            'Store bootstrap returned no data',
                            'session_provider_store_missing',
                        );
                    }

                    if (!doesClientSessionMatchTrustedServerSession(session, clientProviderSession ?? null)) {
                        throw createFirebaseBootstrapError(
                            'Store bootstrap received a mismatched authenticated session',
                            'session_provider_client_session_mismatch',
                        );
                    }

                    // Update the tenant details state with the fetched tenant
                    const fetchedStoresList = Array.isArray(fetchedTenant?.storesList) ? fetchedTenant.storesList : [];
                    const storeIndex = fetchedStoresList.findIndex((s) => s.storeId == session.user.storeId);
                    if (fetchedTenant && storeIndex >= 0) {
                        fetchedStoresList[storeIndex].storeDetails = removeObjRef(fetchedStore)
                        setTenantDetails({
                            ...fetchedTenant,
                            storesList: fetchedStoresList,
                        });
                    } else if (fetchedTenant) {
                        setTenantDetails(fetchedTenant);
                    }

                    // Update the store details state with the fetched fetchedStore
                    setLoginStoreDetails(fetchedStore);
                    setStoreDetails(fetchedStore);

                    // Fetch subscription data
                    let subscriptionData: FirestoreSubscriptionDoc | null;
                    try {
                        subscriptionData = await fetchActiveSubscriptionForStore(
                            Number(session.user.tenantId),
                            Number(session.user.storeId),
                            fetchedStoresList,
                        );
                    } catch {
                        throw createFirebaseBootstrapError(
                            'Store subscription bootstrap failed',
                            'session_provider_subscription_read_failed',
                        );
                    }

                    // Set user context for Sentry with subscription info (client identification)
                    try {
                        setUserContext({
                            id: session.user.id,
                            email: (session.user as any).displayEmail || (session.user as any).phone || (session.user as any).phoneUsername || session.user.email,
                            name: session.user.name,
                            tId: session.user.tenantId ?? undefined,
                            sId: session.user.storeId ?? undefined,
                            tenantName: fetchedTenant?.name,
                            storeName: fetchedStore.name,
                            role: session.user.stores?.find((store: any) => Number(store.storeId) === Number(session.user.storeId))?.role || 'user',
                            subscriptionPlan: subscriptionData?.planId || 'free',
                            subscriptionStatus: subscriptionData?.status || 'none',
                        });
                    } catch (error) {
                        logRuntimeFailure('session_provider_monitoring_context_failed', error, {
                            fallbackPolicy: 'store_bootstrap_continues_without_monitoring_context',
                        });
                    }
                } catch (e) {
                    if (cancelled) return;
                    setActiveSubscriptionLoading(false)
                    logFirebaseBootstrapFailure('session_provider_store_bootstrap_failed', e, {
                        ...getFirebaseAuthSessionLogContext(session),
                    });
                }
            };

            bootstrapStoreContext();

        } else if (!session) {
            // Remove in-memory authenticated state as soon as NextAuth ends.
            resetScopedProviderState();
        }

        return () => {
            cancelled = true;
        };
    }, [
        effectiveSession?.user?.storeId,
        effectiveSession?.user?.tenantId,
        clientProviderSession,
        fetchActiveSubscriptionForStore,
        firebaseAuthReady,
        isAnswerlatticeRoute,
        resetScopedProviderState,
        session,
        activeSubscriptionRetryNonce,
    ]) // Re-run the effect when the session changes

    useEffect(() => {
        if (!session || !loginStoreDetails || !tenantDetails?.storesList?.length) return;

        const loginStoreId = Number(session.user?.storeId);
        const loginTenantId = Number(session.user?.tenantId);
        const loginSubscriptionScopeKey = getSubscriptionLoadScopeKey(loginTenantId, loginStoreId);
        const requestedStoreContextId = Number(activeStoreContext || 0);
        const requestedStoreSummary: any = tenantDetails.storesList.find(
            (store: any) => getActiveTenantStoreSummaryId(store) === requestedStoreContextId,
        );
        const requestedStoreIsActive = Boolean(
            requestedStoreSummary
            && requestedStoreSummary.active !== false
            && requestedStoreSummary.storeDetails?.active !== false
        );
        const loginStoreCanActAsMaster = isMasterLocationContext({
            storeDetails: loginStoreDetails,
            tenantDetails,
        });
        const canUseStoreContext = Boolean(
            requestedStoreContextId
            && requestedStoreContextId !== loginStoreId
            && requestedStoreIsActive
            && (
                loginStoreCanActAsMaster
                || canUserAccessStore({ sessionUser: session.user as any, storeId: requestedStoreContextId })
            )
        );
        const targetStoreId = canUseStoreContext ? requestedStoreContextId : null;

        if (activeStoreContext && !targetStoreId) {
            setActiveStoreContext(null);
            if (storeDetails?.storeId !== loginStoreDetails.storeId) {
                setUserPermissions(null);
                setStoreDetails(loginStoreDetails);
            }
            return;
        }

        if (!targetStoreId) {
            if (storeDetails?.storeId !== loginStoreDetails.storeId) {
                setUserPermissions(null);
                setStoreDetails(loginStoreDetails);
            }
            if (
                activeSubscriptionScopeKeyRef.current === loginSubscriptionScopeKey
                || activeSubscriptionRequestScopeKeyRef.current === loginSubscriptionScopeKey
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

        const targetSummary = tenantDetails.storesList.find(
            (store: any) => getActiveTenantStoreSummaryId(store) === targetStoreId,
        );
        if (!targetSummary) {
            setActiveStoreContext(null);
            return;
        }

        let cancelled = false;
        const loadTargetStore = async () => {
            setActiveSubscriptionLoading(true);
            const embeddedTargetStore = isActiveStoreRecordInTenantScope(targetSummary.storeDetails, {
                storeId: targetStoreId,
                tenantId: loginTenantId,
            })
                ? targetSummary.storeDetails
                : null;
            const targetStore = embeddedTargetStore || await getStoreById(targetStoreId);
            if (cancelled) return;
            if (!targetStore || !isActiveStoreRecordInTenantScope(targetStore, {
                storeId: targetStoreId,
                tenantId: loginTenantId,
            })) {
                throw new Error('Active store context is outside the signed tenant scope.');
            }

            if (!embeddedTargetStore) {
                setTenantDetails((current) => {
                    if (!current?.storesList?.length) return current;
                    return {
                        ...current,
                        storesList: current.storesList.map((store: any) => (
                            getActiveTenantStoreSummaryId(store) === targetStoreId
                                ? { ...store, storeDetails: removeObjRef(targetStore) }
                                : store
                        )),
                    };
                });
            }

            setUserPermissions(null);
            setStoreDetails(targetStore);
            const subscriptionData = await fetchActiveSubscriptionForStore(
                Number(session.user.tenantId),
                targetStoreId,
                tenantDetails.storesList,
            );
            if (!cancelled) {
                setActiveSubscription(subscriptionData);
            }
        };

        void loadTargetStore().catch((error) => {
            if (!cancelled) {
                logFirebaseBootstrapFailure('session_provider_active_store_context_load_failed', error, {
                    ...getFirebaseAuthSessionLogContext(session),
                    ...getBoundedFirebaseStringContext('targetStoreId', targetStoreId),
                    ...getBoundedFirebaseStringContext('previousStoreId', storeDetails?.storeId),
                    hasTargetSummary: Boolean(targetSummary),
                    targetSummaryHasDetails: Boolean(targetSummary?.storeDetails),
                });
                activeSubscriptionScopeKeyRef.current = null;
                activeSubscriptionRequestScopeKeyRef.current = null;
                setActiveSubscription(null);
                setActiveStoreContext(null);
                setUserPermissions(null);
                setStoreDetails(loginStoreDetails);
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
        activeSubscriptionRetryNonce,
    ]);

    useEffect(() => {
        if (!session || !loginStoreDetails || !tenantDetails?.storesList?.length) return;

        const loginStoreCanActAsMaster = isMasterLocationContext({
            storeDetails: loginStoreDetails,
            tenantDetails,
        });
        if (loginStoreCanActAsMaster) return;

        const masterSummary = tenantDetails.storesList.find((store: any) => store?.isMaster === true);
        const masterStoreId = getActiveTenantStoreSummaryId(masterSummary);
        if (!masterStoreId || masterSummary?.storeDetails) return;

        let cancelled = false;
        void getStoreById(masterStoreId)
            .then((masterStore) => {
                if (
                    cancelled
                    || !masterStore
                    || !isActiveStoreRecordInTenantScope(masterStore, {
                        storeId: masterStoreId,
                        tenantId: session.user?.tenantId,
                    })
                ) {
                    return;
                }

                setTenantDetails((current) => {
                    if (!current?.storesList?.length) return current;
                    return {
                        ...current,
                        storesList: current.storesList.map((store: any) => (
                            getActiveTenantStoreSummaryId(store) === masterStoreId
                                ? { ...store, isMaster: true, storeDetails: removeObjRef(masterStore) }
                                : store
                        )),
                    };
                });
            })
            .catch((error) => {
                logFirebaseBootstrapFailure('session_provider_master_outlet_policy_load_failed', error, {
                    ...getFirebaseAuthSessionLogContext(session),
                    ...getBoundedFirebaseStringContext('masterStoreId', masterStoreId),
                });
            });

        return () => {
            cancelled = true;
        };
    }, [
        loginStoreDetails,
        session,
        tenantDetails,
    ]);

    useEffect(() => {
        const loginStoreCanActAsMaster = isMasterLocationContext({
            storeDetails: loginStoreDetails,
            tenantDetails,
        });
        const authorityStoreDetails = loginStoreCanActAsMaster
            ? (loginStoreDetails || storeDetails)
            : (storeDetails || loginStoreDetails);
        if (!objectNullCheck(authorityStoreDetails) || !Array.isArray(authorityStoreDetails?.roles)) {
            setUserPermissions(null);
            return;
        }

        if (session?.user?.platformRole === MENULIST_PLATFORM_USER_ROLE) {
            setUserPermissions(RolesPermissionInitialData);
            return;
        }

        // HQ users keep HQ authority while viewing an outlet context. Other
        // mapped users use the role assigned to the store they are viewing.
        const permissionStoreId = Number(
            loginStoreCanActAsMaster
                ? session?.user?.storeId
                : authorityStoreDetails?.storeId || session?.user?.storeId
        );
        const loginStoreId = Number(session?.user?.storeId);
        const loginStoreRoleId = session?.user?.stores?.find(
            (store: any) => Number(store.storeId) === loginStoreId
        )?.role || ((session?.user as any)?.role || (session as any)?.role);
        const canSwitchFromLoginStore = Boolean(
            loginStoreDetails?.roles?.length
            && getPermissionsForRole(loginStoreRoleId, loginStoreDetails.roles || [])?.canSwitchStores
        );
        const userRoleId = session?.user?.stores?.find(
            (store: any) => Number(store.storeId) === permissionStoreId
        )?.role || (
            permissionStoreId === Number(session?.user?.storeId)
                ? ((session?.user as any)?.role || (session as any)?.role)
                : undefined
        );

        const rolePermissions = getPermissionsForRole(userRoleId, authorityStoreDetails.roles);

        // For outlet stores: apply master's outletPolicy to restrict permissions
        // Master store's outletPolicy is the chain-wide gate for what outlets can do
        const isMaster = loginStoreCanActAsMaster || isMasterLocationContext({
            storeDetails: authorityStoreDetails,
            tenantDetails,
        });
        if (!isMaster && tenantDetails?.storesList?.length) {
            const masterStore = tenantDetails.storesList.find((s: any) => s.isMaster);
            const outletPolicy = masterStore?.storeDetails?.outletPolicy;
            const effectivePermissions = applyOutletPolicy(rolePermissions, outletPolicy, false);
            setUserPermissions({
                ...effectivePermissions,
                canSwitchStores: loginStoreCanActAsMaster
                    ? effectivePermissions.canSwitchStores
                    : canSwitchFromLoginStore,
            });
        } else {
            // Master store or single store - direct permissions
            setUserPermissions({
                ...rolePermissions,
                canSwitchStores: loginStoreCanActAsMaster
                    ? rolePermissions.canSwitchStores
                    : canSwitchFromLoginStore,
            });
        }
    }, [loginStoreDetails, session, storeDetails, tenantDetails])

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const tenantId = tenantDetails?.tenantId ?? session?.user?.tenantId ?? null;
        const tenantName = tenantDetails?.name || '';
        const storeId = storeDetails?.storeId ?? session?.user?.storeId ?? null;
        const storeName = storeDetails?.name || '';

        try {
            if (!tenantId && !storeId && !tenantName && !storeName) {
                window.sessionStorage.removeItem(DEPLOYMENT_IDENTITY_STORAGE_KEY);
                emitDeploymentIdentityUpdated();
                return;
            }

            const identity = normalizeDeploymentDebugIdentity({
                tenantId,
                tenantName,
                storeId,
                storeName,
            });
            if (!identity) {
                window.sessionStorage.removeItem(DEPLOYMENT_IDENTITY_STORAGE_KEY);
                emitDeploymentIdentityUpdated();
                return;
            }

            window.sessionStorage.setItem(
                DEPLOYMENT_IDENTITY_STORAGE_KEY,
                JSON.stringify(identity),
            );
            emitDeploymentIdentityUpdated();
        } catch (error) {
            logRuntimeFailure('session_provider_deployment_identity_storage_failed', error, {
                fallbackPolicy: 'deployment_badge_identity_unavailable',
            }, { developmentOnly: true });
        }
    }, [
        session?.user?.storeId,
        session?.user?.tenantId,
        storeDetails?.name,
        storeDetails?.storeId,
        tenantDetails?.name,
        tenantDetails?.tenantId,
    ]);

    useEffect(() => {
        if (!session?.user?.id) return;
        startLogCapture();
    }, [session?.user?.id]);

    const loginStoreIsMaster = isMasterLocationContext({
        storeDetails: loginStoreDetails || storeDetails,
        tenantDetails,
    });
    const loginStoreId = Number(session?.user?.storeId);
    const activeStoreContextId = Number(activeStoreContext);
    const hasActiveStoreContext = Number.isFinite(activeStoreContextId)
        && activeStoreContextId > 0
        && activeStoreContextId !== loginStoreId;
    const activeStoreContextMatchesTenant = Boolean(
        hasActiveStoreContext
        && tenantDetails?.storesList?.some((store: any) => (
            getActiveTenantStoreSummaryId(store) === activeStoreContextId
        )),
    ) && (
        loginStoreIsMaster
        || canUserAccessStore({ sessionUser: session?.user as any, storeId: activeStoreContextId })
    );
    const hasStoreContextBootstrapData = Boolean(loginStoreDetails && tenantDetails?.storesList?.length);
    const expectedStoreIdForRender = activeStoreContextMatchesTenant
        ? activeStoreContextId
        : loginStoreId;
    const activeStoreContextIsResolving = Boolean(
        hasActiveStoreContext
        && !activeStoreContextMatchesTenant
        && !hasStoreContextBootstrapData,
    );
    const isStoreContextReadyForRender = canRenderBeforeStoreData
        || !session?.user?.storeId
        || (
            !activeStoreContextIsResolving
            && Number.isFinite(expectedStoreIdForRender)
            && expectedStoreIdForRender > 0
            && Number(storeDetails?.storeId) === expectedStoreIdForRender
        );
    const renderedProviderScopeKey = getSessionProviderScopeKey(effectiveSession);
    const providerStateMatchesCurrentSession = providerSessionScopeKeyRef.current === undefined
        || providerSessionScopeKeyRef.current === renderedProviderScopeKey;
    const expectedSubscriptionScopeKeyForRender = getSubscriptionLoadScopeKey(
        effectiveSession?.user?.tenantId,
        expectedStoreIdForRender,
    );
    const activeSubscriptionScopeReadyForRender = !expectedSubscriptionScopeKeyForRender
        || activeSubscriptionScopeKeyRef.current === expectedSubscriptionScopeKeyForRender;
    const isResolvingOwnerSubscription = Boolean(
        expectedSubscriptionScopeKeyForRender
        && (
            !providerStateMatchesCurrentSession
            || !activeSubscriptionScopeReadyForRender
            || activeSubscriptionLoading
        )
    );

    if (session && !clientProviderSession && !clientSessionSyncError) {
        return <BrandedPageLoader page="Validating Account" brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'} />;
    }

    if (session && clientSessionSyncError) {
        return <BrandedPageLoader page="Unable to validate account" brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'} />;
    }

    return (
        <Provider
            session={clientProviderSession as Session | null}
            refetchInterval={0}              // ✅ Disable auto-polling (was causing 15+ calls)
            refetchOnWindowFocus={false}     // ✅ Disable refetch on window focus
        >
            <PlatformGlobalDataProvider contextData={{
                tenantDetails: providerStateMatchesCurrentSession ? tenantDetails : null,
                setTenantDetails,
                storeDetails: providerStateMatchesCurrentSession ? storeDetails : null,
                setStoreDetails,
                userPermissions: providerStateMatchesCurrentSession ? userPermissions : null,
                setUserPermissions,
                usersList: providerStateMatchesCurrentSession ? usersList : null,
                setUsersList,
                fontsList: providerStateMatchesCurrentSession ? fontsList : null,
                setFontsList,
                assetsList: providerStateMatchesCurrentSession ? assetsList : { images: [] },
                setAssetsList,
                activeSubscription: providerStateMatchesCurrentSession ? activeSubscription : null,
                setActiveSubscription,
                activeSubscriptionLoading: isResolvingOwnerSubscription,
                setActiveSubscriptionLoading,
                isMasterUser: loginStoreIsMaster,
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
                platformStoreSummaryOptions: providerStateMatchesCurrentSession ? platformStoreSummaryOptions : [],
                setPlatformStoreSummaryOptions,
                platformStoreSummaryLoadedAt: providerStateMatchesCurrentSession ? platformStoreSummaryLoadedAt : null,
                setPlatformStoreSummaryLoadedAt,
                platformStoreSummaryLoading: providerStateMatchesCurrentSession ? platformStoreSummaryLoading : false,
                setPlatformStoreSummaryLoading
            }}>
                {(effectiveSession && effectiveSession.user?.storeId && !firebaseAuthReady && !canRenderBeforeFirebaseAuth) ? (
                    firebaseAuthSyncError ? (
                        <StoreAccessRecovery
                            brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'}
                            onRetry={() => {
                                setFirebaseAuthSyncError(null);
                                setFirebaseAuthRetryNonce((current) => current + 1);
                            }}
                            onSignOut={() => void signOut({ callbackUrl: '/signin' })}
                        />
                    ) : (
                        <BrandedPageLoader
                            page="Connecting Account"
                            brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'}
                        />
                    )
                ) : (session && !isStoreContextReadyForRender) ? (
                    <BrandedPageLoader page="Loading Store Data" brand={isAnswerlatticeRoute ? 'answerlattice' : 'menulist'} />
                ) : (activeSubscriptionSyncError && expectedSubscriptionScopeKeyForRender) ? (
                    <StoreAccessRecovery
                        brand="menulist"
                        onRetry={() => {
                            activeSubscriptionScopeKeyRef.current = null;
                            activeSubscriptionRequestScopeKeyRef.current = null;
                            setActiveSubscriptionSyncError(null);
                            setActiveSubscriptionLoading(true);
                            setActiveSubscriptionRetryNonce((current) => current + 1);
                        }}
                        onSignOut={() => void signOut({ callbackUrl: '/signin' })}
                    />
                ) : (isResolvingOwnerSubscription && !canRenderBeforeStoreData) ? (
                    <BrandedPageLoader page="Checking Plan Access" brand="menulist" />
                ) : children}
            </PlatformGlobalDataProvider>
        </Provider>
    )
}
