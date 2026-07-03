import { ResellerProfile, ResellerTransaction } from "@type/reseller";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import useSWR from "swr";
import { logHookFailure } from "./hookDiagnostics";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — SWR Hooks
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
// ═══════════════════════════════════════════════════════════════

export type ResellerMonthlySummary = {
    month: string;
    resellers: Array<{
        resellerId: string;
        resellerName: string;
        resellerEmail: string;
        clientCount: number;
        transactionCount: number;
        offlineCollectedPaise: number;
        onlineActivePaise: number;
        onlinePendingPaise: number;
        recognizedRevenuePaise: number;
        totalExpectedPaise: number;
    }>;
    totals: {
        clientCount: number;
        transactionCount: number;
        offlineCollectedPaise: number;
        onlineActivePaise: number;
        onlinePendingPaise: number;
        recognizedRevenuePaise: number;
        totalExpectedPaise: number;
    };
};

const RESELLER_DASHBOARD_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const RESELLER_DASHBOARD_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type ResellerDashboardResponsePhase = 'monthly_summary' | 'profile' | 'clients';

type ResellerProfileResponse = {
    profile?: unknown;
};

type ResellerClientsResponse = {
    transactions?: unknown;
};

const createResellerDashboardResponseError = (
    code: string,
    status?: number,
): Error & { code: string; status?: number } => Object.assign(new Error(code), {
    code,
    status,
});

const getResellerDashboardResponseLogContext = (
    phase: ResellerDashboardResponsePhase,
    response: Response,
) => ({
    maxBytes: RESELLER_DASHBOARD_RESPONSE_JSON_MAX_BYTES,
    phase,
    responseOk: response.ok,
    responseStatus: response.status,
});

async function readResellerDashboardResponseJson<T>(
    response: Response,
    phase: ResellerDashboardResponsePhase,
): Promise<T | null> {
    try {
        return await readJsonResponseWithLimit<T>(
            response,
            RESELLER_DASHBOARD_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logHookFailure(
            'reseller_dashboard_response_parse_failed',
            error,
            getResellerDashboardResponseLogContext(phase, response),
        );
        return null;
    }
}

function logInvalidResellerDashboardResponse(
    response: Response,
    phase: ResellerDashboardResponsePhase,
    code: string,
) {
    logHookFailure(
        'reseller_dashboard_response_invalid',
        createResellerDashboardResponseError(code, response.status),
        getResellerDashboardResponseLogContext(phase, response),
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const fetchMonthlySummary = async (): Promise<ResellerMonthlySummary> => {
    const response = await fetch('/api/reseller/monthly-summary', RESELLER_DASHBOARD_REQUEST_POLICY);
    const data = await readResellerDashboardResponseJson<ResellerMonthlySummary>(
        response,
        'monthly_summary',
    );
    if (!response.ok) {
        logHookFailure(
            'reseller_dashboard_monthly_summary_load_failed',
            createResellerDashboardResponseError('reseller_dashboard_monthly_summary_load_rejected', response.status),
        );
        throw new Error('Failed to load reseller monthly summary');
    }
    if (!isRecord(data) || !Array.isArray(data.resellers) || !isRecord(data.totals)) {
        logInvalidResellerDashboardResponse(
            response,
            'monthly_summary',
            'reseller_dashboard_monthly_summary_response_invalid',
        );
        throw new Error('Failed to load reseller monthly summary');
    }
    return data;
};

const fetchResellerProfile = async (): Promise<ResellerProfile> => {
    const response = await fetch('/api/reseller/profile', RESELLER_DASHBOARD_REQUEST_POLICY);
    const data = await readResellerDashboardResponseJson<ResellerProfileResponse>(
        response,
        'profile',
    );
    if (!response.ok) {
        logHookFailure(
            'reseller_dashboard_profile_load_failed',
            createResellerDashboardResponseError('reseller_dashboard_profile_load_rejected', response.status),
        );
        throw new Error('Failed to load reseller profile');
    }
    if (!isRecord(data?.profile)) {
        logInvalidResellerDashboardResponse(
            response,
            'profile',
            'reseller_dashboard_profile_response_invalid',
        );
        throw new Error('Failed to load reseller profile');
    }
    return data.profile as unknown as ResellerProfile;
};

const fetchResellerClients = async (): Promise<ResellerTransaction[]> => {
    const response = await fetch('/api/reseller/clients', RESELLER_DASHBOARD_REQUEST_POLICY);
    const data = await readResellerDashboardResponseJson<ResellerClientsResponse>(
        response,
        'clients',
    );
    if (!response.ok) {
        logHookFailure(
            'reseller_dashboard_clients_load_failed',
            createResellerDashboardResponseError('reseller_dashboard_clients_load_rejected', response.status),
        );
        throw new Error('Failed to load reseller clients');
    }
    if (!Array.isArray(data?.transactions)) {
        logInvalidResellerDashboardResponse(
            response,
            'clients',
            'reseller_dashboard_clients_response_invalid',
        );
        throw new Error('Failed to load reseller clients');
    }
    return data.transactions as ResellerTransaction[];
};

/**
 * Fetch reseller profile + transactions for the authenticated reseller.
 * Uses SWR for caching and deduplication.
 */
export function useResellerDashboard(resellerId: string, isPlatform: boolean = false, resellerEmail?: string | null) {
    const { data: profile, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<ResellerProfile | null>(
        resellerId && !isPlatform ? `reseller-profile-${resellerId}-${resellerEmail || ''}` : null,
        fetchResellerProfile,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const { data: transactions, error: transactionsError, isLoading: transactionsLoading, mutate: mutateTransactions } = useSWR<ResellerTransaction[]>(
        resellerId ? `reseller-transactions-${resellerId}-${isPlatform}` : null,
        fetchResellerClients,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const { data: monthlySummary, error: monthlySummaryError, isLoading: monthlySummaryLoading, mutate: mutateMonthlySummary } = useSWR<ResellerMonthlySummary>(
        resellerId ? `reseller-monthly-summary-${resellerId}-${isPlatform}` : null,
        fetchMonthlySummary,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const clients = transactions
        ? Array.from(
            transactions.reduce((byStore, transaction) => {
                const existing = byStore.get(transaction.storeId);
                const currentCreatedOn = (transaction.createdOn as any)?.toMillis?.()
                    || (transaction.createdOn as any)?.toDate?.()?.getTime?.()
                    || new Date(transaction.createdOn as any).getTime()
                    || 0;
                const existingCreatedOn = existing
                    ? ((existing.createdOn as any)?.toMillis?.()
                        || (existing.createdOn as any)?.toDate?.()?.getTime?.()
                        || new Date(existing.createdOn as any).getTime()
                        || 0)
                    : -1;
                if (!existing || currentCreatedOn >= existingCreatedOn) {
                    byStore.set(transaction.storeId, transaction);
                }
                return byStore;
            }, new Map<number, ResellerTransaction>()).values()
        )
        : [];

    const isLoading = profileLoading || transactionsLoading || monthlySummaryLoading;
    const error = profileError || transactionsError || monthlySummaryError;

    // Derived stats
    const stats = transactions ? {
        total: clients.length,
        active: clients.filter(t => t.status === 'active').length,
        pending: clients.filter(t => t.status === 'pending_payment').length,
        expired: clients.filter(t => t.status === 'expired').length,
        expiringSoon: clients.filter(t => {
            if (t.status !== 'active' || !t.validUntil) return false;
            const expiry = (t.validUntil as any).toDate ? (t.validUntil as any).toDate() : new Date(t.validUntil as any);
            const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length,
    } : null;

    return {
        profile,
        monthlySummary,
        transactions: clients,
        stats,
        isLoading,
        error,
        mutateProfile,
        mutateTransactions,
        refresh: () => {
            mutateProfile();
            mutateTransactions();
            mutateMonthlySummary();
        },
    };
}
