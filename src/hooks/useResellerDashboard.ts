import { getResellerProfile, getResellerTransactions, getAllResellerTransactions } from "@database/reseller";
import { ResellerProfile, ResellerTransaction } from "@type/reseller";
import useSWR from "swr";

// ═══════════════════════════════════════════════════════════════
// Reseller Dashboard — SWR Hooks
// @see __docs__/reseller-dashboard/reseller-dashboard_impl.md
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch reseller profile + transactions for the authenticated reseller.
 * Uses SWR for caching and deduplication.
 */
export function useResellerDashboard(resellerId: string, isPlatform: boolean = false) {
    const { data: profile, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR<ResellerProfile | null>(
        resellerId ? `reseller-profile-${resellerId}` : null,
        () => getResellerProfile(resellerId),
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const { data: transactions, error: transactionsError, isLoading: transactionsLoading, mutate: mutateTransactions } = useSWR<ResellerTransaction[]>(
        resellerId ? `reseller-transactions-${resellerId}-${isPlatform}` : null,
        () => isPlatform ? getAllResellerTransactions(200) : getResellerTransactions(resellerId, 100),
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    );

    const isLoading = profileLoading || transactionsLoading;
    const error = profileError || transactionsError;

    // Derived stats
    const stats = transactions ? {
        total: transactions.length,
        active: transactions.filter(t => t.status === 'active').length,
        pending: transactions.filter(t => t.status === 'pending_payment').length,
        expired: transactions.filter(t => t.status === 'expired').length,
        expiringSoon: transactions.filter(t => {
            if (t.status !== 'active' || !t.validUntil) return false;
            const expiry = (t.validUntil as any).toDate ? (t.validUntil as any).toDate() : new Date(t.validUntil as any);
            const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length,
    } : null;

    return {
        profile,
        transactions: transactions || [],
        stats,
        isLoading,
        error,
        mutateProfile,
        mutateTransactions,
        refresh: () => {
            mutateProfile();
            mutateTransactions();
        },
    };
}
