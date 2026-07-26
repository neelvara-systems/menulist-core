import {
    isResellerClientsResponse,
    type ResellerClientRecord,
} from "@lib/reseller/resellerClientRecord";
import {
    isResellerSelfProfile,
    type ResellerSelfProfile,
} from "@lib/reseller/resellerSelfProfile";
import {
    isResellerMonthlySummary,
    type ResellerMonthlySummary,
} from "@lib/reseller/resellerMonthlySummary";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import useSWR from "swr";
import { logHookFailure } from "./hookDiagnostics";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — SWR Hooks
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
// ═══════════════════════════════════════════════════════════════

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

type ResellerClientsResult = {
    invalidRowCount: number;
    isPartial: boolean;
    transactions: ResellerClientRecord[];
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

const fetchMonthlySummary = async (): Promise<ResellerMonthlySummary> => {
    const response = await fetch('/api/reseller/monthly-summary', RESELLER_DASHBOARD_REQUEST_POLICY);
    const data = await readResellerDashboardResponseJson<unknown>(
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
    if (!isResellerMonthlySummary(data)) {
        logInvalidResellerDashboardResponse(
            response,
            'monthly_summary',
            'reseller_dashboard_monthly_summary_response_invalid',
        );
        throw new Error('Failed to load reseller monthly summary');
    }
    return data;
};

const fetchResellerProfile = async (): Promise<ResellerSelfProfile> => {
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
    if (!isResellerSelfProfile(data?.profile)) {
        logInvalidResellerDashboardResponse(
            response,
            'profile',
            'reseller_dashboard_profile_response_invalid',
        );
        throw new Error('Failed to load reseller profile');
    }
    return data.profile;
};

const fetchResellerClients = async (): Promise<ResellerClientsResult> => {
    const response = await fetch('/api/reseller/clients', RESELLER_DASHBOARD_REQUEST_POLICY);
    const data = await readResellerDashboardResponseJson<unknown>(
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
    if (!isResellerClientsResponse(data)) {
        logInvalidResellerDashboardResponse(
            response,
            'clients',
            'reseller_dashboard_clients_response_invalid',
        );
        throw new Error('Failed to load reseller clients');
    }
    return {
        invalidRowCount: data.invalidRowCount,
        isPartial: data.isPartial,
        transactions: data.transactions,
    };
};

/**
 * Fetch reseller profile + transactions for the authenticated reseller.
 * Uses SWR for caching and deduplication.
 */
export function useResellerDashboard(resellerId: string, isPlatform: boolean = false, resellerEmail?: string | null) {
    const { data: profile, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<ResellerSelfProfile | null>(
        resellerId && !isPlatform ? `reseller-profile-${resellerId}-${resellerEmail || ''}` : null,
        fetchResellerProfile,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const { data: clientsResult, error: transactionsError, isLoading: transactionsLoading, mutate: mutateTransactions } = useSWR<ResellerClientsResult>(
        resellerId ? `reseller-transactions-${resellerId}-${isPlatform}` : null,
        fetchResellerClients,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const { data: monthlySummary, error: monthlySummaryError, isLoading: monthlySummaryLoading, mutate: mutateMonthlySummary } = useSWR<ResellerMonthlySummary>(
        resellerId ? `reseller-monthly-summary-${resellerId}-${isPlatform}` : null,
        fetchMonthlySummary,
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const transactions = clientsResult?.transactions;
    const clients = transactions
        ? Array.from(
            transactions.reduce((byStore, transaction) => {
                const existing = byStore.get(transaction.storeId);
                const currentCreatedOn = transaction.createdOn
                    ? Date.parse(transaction.createdOn)
                    : 0;
                const existingCreatedOn = existing
                    ? (existing.createdOn ? Date.parse(existing.createdOn) : 0)
                    : -1;
                if (!existing || currentCreatedOn >= existingCreatedOn) {
                    byStore.set(transaction.storeId, transaction);
                }
                return byStore;
            }, new Map<number, ResellerClientRecord>()).values()
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
            const daysUntilExpiry = Math.ceil((Date.parse(t.validUntil) - Date.now()) / (1000 * 60 * 60 * 24));
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
        isClientListPartial: clientsResult?.isPartial === true,
        invalidClientRowCount: clientsResult?.invalidRowCount || 0,
        mutateProfile,
        mutateTransactions,
        refresh: () => {
            mutateProfile();
            mutateTransactions();
            mutateMonthlySummary();
        },
    };
}
