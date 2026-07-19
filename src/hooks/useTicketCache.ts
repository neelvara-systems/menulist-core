import { getStoresTickets, getSupportTickets } from '@database/tickets';
import { type AnswerlatticeCacheAudience, useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { logHookFailure } from '@hook/hookDiagnostics';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { SupportTicketType } from '@type/supportTicket';
import { updateList } from '@util/utils';
import { Timestamp } from 'firebase/firestore';
import { useCallback, useContext } from 'react';

/**
 * Ticket caching hook for list-based ticket management
 * Uses session-level cache from PlatformGlobalDataContext
 * 
 * Pattern: Cache entire ticket list → Update on changes → Share across components
 * 
 * Note: Unlike articles (which cache individual items), tickets cache the entire list
 * because ticket lists already contain full ticket data (no need to fetch individual items)
 * 
 * @example
 * ```typescript
 * const { getAllItems, updateItem, cachedItems } = useTicketCache();
 * 
 * // Fetch all tickets
 * const tickets = await getAllItems();
 * 
 * // Update a ticket in cache
 * updateItem(updatedTicket);
 * 
 * // Access cached tickets directly
 * const tickets = cachedItems;
 * ```
 */
export const useTicketCache = (options?: { audience?: AnswerlatticeCacheAudience }) => {
    const { cachedTickets, setCachedTickets } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const scopeKey = useAnswerlatticeCacheScope(options?.audience);
    const scopedTickets = cachedTickets.scopeKey === scopeKey ? cachedTickets.tickets : [];

    /**
     * Clear entire cache
     * Useful for logout or manual refresh
     */
    const clearCache = useCallback(() => {
        setCachedTickets({ cachedOn: null, tickets: [], scopeKey: null });
    }, [setCachedTickets]);

    /**
     * Get all tickets - for list views
     * Pattern: Check cache freshness → Return if fresh → Fetch if stale/missing
     * 
     * @param options - Configuration options
     * @returns Array of tickets
     * 
     * @example
     * ```typescript
     * const tickets = await getAllItems();
     * const tickets = await getAllItems({ forceRefresh: true });
     * const tickets = await getAllItems({ maxAge: 5 * 60 * 1000 }); // 5 minutes
     * ```
     */
    const getAllItems = useCallback(async (
        options?: {
            forceRefresh?: boolean;
            maxAge?: number; // Max cache age in milliseconds (default: 5 minutes)
            includeDeleted?: boolean; // For platform admin view
            onCacheHit?: () => void;
            onCacheMiss?: () => void;
        }
    ): Promise<SupportTicketType[]> => {
        if (!scopeKey) return [];
        const maxAge = options?.maxAge ?? 5 * 60 * 1000; // 5 minutes default

        // ============================================
        // STEP 1: Check if force refresh
        // ============================================
        if (options?.forceRefresh) {
            options.onCacheMiss?.();

            try {
                const tickets = options.includeDeleted
                    ? await getSupportTickets(true)
                    : await getStoresTickets();

                setCachedTickets({
                    cachedOn: Timestamp.now(),
                    tickets,
                    scopeKey,
                });

                return tickets;
            } catch (error) {
                logHookFailure('answerlattice_ticket_cache_fetch_failed', error, {
                    forceRefresh: true,
                    includeDeleted: Boolean(options.includeDeleted),
                    maxAge,
                    cachedTicketCount: scopedTickets.length,
                });
                // Preserve last-known ticket truth instead of presenting a
                // failed refresh as a confirmed empty inbox.
                return scopedTickets;
            }
        }

        // ============================================
        // STEP 2: Check cache freshness
        // ============================================
        const cacheAge = cachedTickets?.cachedOn
            ? Date.now() - cachedTickets.cachedOn.toMillis()
            : Infinity;

        const isCacheFresh = cacheAge < maxAge;

        if (isCacheFresh && scopedTickets.length > 0) {
            options?.onCacheHit?.();
            return scopedTickets;
        }

        // ============================================
        // STEP 3: Cache miss or stale - fetch fresh
        // ============================================
        options?.onCacheMiss?.();

        try {
            const tickets = options.includeDeleted
                ? await getSupportTickets(true)
                : await getStoresTickets();

            setCachedTickets({
                cachedOn: Timestamp.now(),
                tickets,
                scopeKey,
            });

            return tickets;
        } catch (error) {
            logHookFailure('answerlattice_ticket_cache_fetch_failed', error, {
                forceRefresh: false,
                includeDeleted: Boolean(options?.includeDeleted),
                maxAge,
                cacheAge: Number.isFinite(cacheAge) ? Math.round(cacheAge) : -1,
                cachedTicketCount: scopedTickets.length,
            });
            // Return cached tickets even if stale (fallback)
            return scopedTickets;
        }
    }, [cachedTickets?.cachedOn, scopeKey, scopedTickets, setCachedTickets]);

    /**
     * Set all tickets directly (for realtime updates)
     * Use this when receiving realtime subscription updates
     * 
     * @param tickets - Array of tickets to set
     * 
     * @example
     * ```typescript
     * const unsubscribe = await subscribeStoreTickets(
     *     (tickets) => setAllItems(tickets)
     * );
     * ```
     */
    const setAllItems = useCallback((tickets: SupportTicketType[]) => {
        if (!scopeKey) return;
        setCachedTickets({
            cachedOn: Timestamp.now(),
            tickets,
            scopeKey,
        });
    }, [scopeKey, setCachedTickets]);

    /**
     * Update a single ticket in the cache using updateList utility
     * Use this when a ticket is created/updated
     * 
     * @param ticket - Updated ticket
     * @param position - Where to add ('first' | 'last')
     * @param matchKey - Key to match on (default: 'displayId')
     * 
     * @example
     * ```typescript
     * updateItem(updatedTicket); // Updates or adds to end
     * updateItem(newTicket, 'first'); // Adds to beginning
     * ```
     */
    const updateItem = useCallback((
        ticket: SupportTicketType,
        position: 'first' | 'last' = 'first',
        matchKey: keyof SupportTicketType = 'displayId'
    ) => {
        if (!scopeKey) return;
        setCachedTickets(prev => ({
            cachedOn: Timestamp.now(),
            tickets: updateList(prev.scopeKey === scopeKey ? prev.tickets : [], ticket, position, matchKey),
            scopeKey,
        }));
    }, [scopeKey, setCachedTickets]);

    return {
        // Primary methods (used in production)
        getAllItems,       // Get all tickets - Used in 3 components
        setAllItems,       // Set tickets from realtime - Used in 3 components  
        updateItem,        // Update single ticket - Used in 3 components
        cachedItems: scopedTickets, // Direct cache access - Used in 2 components
        clearCache,        // Clear cache on logout/refresh
    };
};
