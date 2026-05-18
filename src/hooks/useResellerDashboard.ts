import { ResellerProfile, ResellerTransaction } from "@type/reseller";
import useSWR from "swr";

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

const fetchMonthlySummary = async (): Promise<ResellerMonthlySummary> => {
    const response = await fetch('/api/reseller/monthly-summary');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to load reseller monthly summary');
    return data;
};

const fetchResellerProfile = async (): Promise<ResellerProfile> => {
    const response = await fetch('/api/reseller/profile');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to load reseller profile');
    return data.profile;
};

const fetchResellerClients = async (): Promise<ResellerTransaction[]> => {
    const response = await fetch('/api/reseller/clients');
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to load reseller clients');
    return Array.isArray(data.transactions) ? data.transactions : [];
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
