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

import {
    ensureFirebaseAuthForSession,
    getFirebaseAuthSessionScopeKey,
} from '@lib/auth/firebaseAuthSync';
import { getFirebaseAuthSessionLogContext, logFirebaseBootstrapFailure } from '@lib/firebase/firebaseDiagnostics';
import { firebaseAuth } from '@lib/firebase/firebaseClient';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function useFirebaseAuthSync() {
    const { data: session, status } = useSession();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncedScopeKey, setSyncedScopeKey] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const latestSyncRef = useRef(0);
    const scopeKey = useMemo(
        () => status === 'authenticated' ? getFirebaseAuthSessionScopeKey(session) : null,
        [session, status],
    );
    const isSynced = Boolean(scopeKey && syncedScopeKey === scopeKey);

    useEffect(() => {
        const syncId = latestSyncRef.current + 1;
        latestSyncRef.current = syncId;

        if (status !== 'authenticated' || !scopeKey) {
            setSyncedScopeKey(null);
            setIsSyncing(false);
            setError(null);
            return;
        }

        if (syncedScopeKey === scopeKey) return;
        setIsSyncing(true);
        setError(null);

        ensureFirebaseAuthForSession(session)
            .then((result) => {
                if (latestSyncRef.current !== syncId) return;
                if (!result.ready) {
                    throw new Error('Firebase Auth sync did not establish a scoped identity');
                }
                setSyncedScopeKey(scopeKey);
            })
            .catch((err: unknown) => {
                if (latestSyncRef.current !== syncId) return;
                logFirebaseBootstrapFailure('firebase_auth_hook_sync_failed', err, {
                    ...getFirebaseAuthSessionLogContext(session),
                    firebaseUserPresent: Boolean(firebaseAuth.currentUser),
                });
                setSyncedScopeKey(null);
                setError(new Error('Firebase Auth sync failed'));
            })
            .finally(() => {
                if (latestSyncRef.current === syncId) setIsSyncing(false);
            });

        return () => {
            if (latestSyncRef.current === syncId) latestSyncRef.current += 1;
        };
    }, [scopeKey, session, status, syncedScopeKey]);

    return {
        isSyncing,
        isSynced,
        error,
        firebaseUser: firebaseAuth.currentUser
    };
}
