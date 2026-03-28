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

import { firebaseAuth } from '@lib/firebase/firebaseClient';
import { signInWithCustomToken } from 'firebase/auth';
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

        // Check if Firebase Auth is already synced
        const currentUser = firebaseAuth.currentUser;
        
        if (currentUser) {
            // Already synced
            setIsSynced(true);
            return;
        }

        // NextAuth is authenticated but Firebase Auth is not
        // Sync them by getting a custom token
        syncFirebaseAuth();

    }, [status, session, isSynced, isSyncing]);

    const syncFirebaseAuth = async () => {
        setIsSyncing(true);
        setError(null);

        try {
            console.log('[Firebase Auth Sync] Starting sync...');

            // Get custom token from server
            const response = await fetch('/api/auth/set-claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // No UID - server will create token from NextAuth session
            });

            if (!response.ok) {
                throw new Error(`Failed to get custom token: ${response.status}`);
            }

            const data = await response.json();

            if (!data.customToken) {
                throw new Error('No custom token received from server');
            }

            // Sign in to Firebase Auth with custom token
            await signInWithCustomToken(firebaseAuth, data.customToken);

            console.log('[Firebase Auth Sync] ✅ Sync complete');
            console.log('[Firebase Auth Sync] User:', firebaseAuth.currentUser?.email);
            
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
