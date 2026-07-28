'use client';

import { getBoundedAuthStringContext, logAuthDiagnostic, logAuthFailure } from "@lib/auth/authDiagnostics";
import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { User } from "firebase/auth";
import { useEffect, useState } from "react";

interface AuthState {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    token: string | null;
}

export function useAuth(): AuthState {
    const [authState, setAuthState] = useState<AuthState>({ user: null, isAdmin: false, loading: true, token: null });

    useEffect(() => {
        let generation = 0;
        let active = true;
        const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
            const callbackGeneration = ++generation;
            if (user) {
                logAuthDiagnostic('auth_state_changed', {
                    ...getBoundedAuthStringContext('userId', user.uid),
                    ...getBoundedAuthStringContext('email', user.email),
                    emailVerified: user.emailVerified,
                }, { developmentOnly: true });
                try {
                    const idTokenResult = await user.getIdTokenResult();
                    const idToken = await user.getIdToken();
                    if (!active || callbackGeneration !== generation) return;
                    setAuthState({
                        user,
                        isAdmin: idTokenResult.claims.admin === true,
                        loading: false,
                        token: idToken,
                    });
                } catch (error) {
                    logAuthFailure('auth_token_load_failed', error, {
                        ...getBoundedAuthStringContext('userId', user.uid),
                    });
                    if (!active || callbackGeneration !== generation) return;
                    setAuthState({ user: null, isAdmin: false, loading: false, token: null });
                }
            } else {
                logAuthDiagnostic('auth_signed_out', {}, { developmentOnly: true });
                if (active && callbackGeneration === generation) {
                    setAuthState({ user: null, isAdmin: false, loading: false, token: null });
                }
            }
        });

        return () => {
            active = false;
            generation++;
            unsubscribe();
        };
    }, []);

    return authState;
}
