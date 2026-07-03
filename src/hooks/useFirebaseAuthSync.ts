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
import { getFirebaseAuthSessionLogContext, logFirebaseBootstrapFailure } from '@lib/firebase/firebaseDiagnostics';
import { firebaseAuth } from '@lib/firebase/firebaseClient';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

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
            await ensureFirebaseAuthForSession(session);
            setIsSynced(true);
        } catch (err) {
            logFirebaseBootstrapFailure('firebase_auth_hook_sync_failed', err, {
                ...getFirebaseAuthSessionLogContext(session),
                firebaseUserPresent: Boolean(firebaseAuth.currentUser),
            });
            setError(new Error('Firebase Auth sync failed'));
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
