'use client';

import { getBoundedAuthStringContext, logAuthDiagnostic } from "@lib/auth/authDiagnostics";
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
        const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                logAuthDiagnostic('auth_state_changed', {
                    ...getBoundedAuthStringContext('userId', user.uid),
                    ...getBoundedAuthStringContext('email', user.email),
                    emailVerified: user.emailVerified,
                }, { developmentOnly: true });
                const idTokenResult = await user.getIdTokenResult();
                const idToken = await user.getIdToken();

                setAuthState({
                    user,
                    isAdmin: true,
                    loading: false,
                    token: idToken,
                });
            } else {
                logAuthDiagnostic('auth_signed_out', {}, { developmentOnly: true });
                setAuthState({ user: null, isAdmin: false, loading: false, token: null });
            }
        });

        return () => unsubscribe();
    }, []);

    return authState;
}
