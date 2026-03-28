'use client';

import { firebaseAuth } from "@lib/firebase/firebaseClient";
import { logger } from "@lib/monitoring/logger";
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
                logger.debug('User authentication state changed', { 
                    userId: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified
                });
                const idTokenResult = await user.getIdTokenResult();
                const idToken = await user.getIdToken();

                setAuthState({
                    user,
                    isAdmin: true,
                    loading: false,
                    token: idToken,
                });
            } else {
                logger.debug('User signed out');
                setAuthState({ user: null, isAdmin: false, loading: false, token: null });
            }
        });

        return () => unsubscribe();
    }, []);

    return authState;
}
