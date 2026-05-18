/**
 * useFirebaseAuthSync
 * 
 * Automatically syncs Firebase Auth with NextAuth session after OAuth login.
 * 
 * Problem: NextAuth and Firebase Auth are separate systems.
 * - NextAuth handles OAuth (Google) and creates JWT sessions
 * - Firebase Auth doesn't automatically know about NextAuth logins
 * - Result: firebaseAuth.currentUser is null even when logged in via NextAuth
 * 
 * Solution: This hook detects when NextAuth is authenticated but Firebase Auth isn't,
 * and syncs them by getting a custom token from the server.
 */

import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { firebaseAuth } from '@lib/firebase/firebaseClient';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

const maskDebugEmail = (email: unknown) => {
    if (typeof email !== 'string') return email;
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    return `${local.slice(0, 2)}***@${domain}`;
};

export function useFirebaseAuthSync() {
    const { data: session, status } = useSession();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        // Don't run if NextAuth is still loading
        if (status === 'loading') return;

        // Don't run if user is not authenticated in NextAuth
        if (status === 'unauthenticated') {
            setIsSynced(false);
            return;
        }

        // Don't run if already synced or currently syncing
        if (isSynced || isSyncing) return;

        // NextAuth is authenticated. Ensure Firebase Auth also has matching
        // tenant/store claims before any Firestore DAL read runs.
        syncFirebaseAuth();

    }, [status, session, isSynced, isSyncing]);

    const syncFirebaseAuth = async () => {
        setIsSyncing(true);
        setError(null);

        try {
            console.log('[Firebase Auth Sync] Starting sync...');

            await ensureFirebaseAuthForSession(session);

            console.log('[Firebase Auth Sync] ✅ Sync complete');
            console.log('[Firebase Auth Sync] User:', maskDebugEmail(firebaseAuth.currentUser?.email));
            
            setIsSynced(true);
        } catch (err) {
            console.error('[Firebase Auth Sync] ❌ Sync failed:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsSyncing(false);
        }
    };

    return {
        isSyncing,
        isSynced,
        error,
        firebaseUser: firebaseAuth.currentUser
    };
}
