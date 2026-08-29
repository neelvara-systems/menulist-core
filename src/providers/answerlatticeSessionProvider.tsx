'use client';

import BrandedPageLoader from '@atoms/brandedPageLoader';
import { refreshClientSessionCacheFromApi } from '@lib/auth/getActiveSession';
import { doesClientSessionMatchTrustedServerSession } from '@lib/auth/loginSessionBoundary';
import {
    createFirebaseBootstrapError,
    getFirebaseAuthSessionLogContext,
    logFirebaseBootstrapFailure,
} from '@lib/firebase/firebaseDiagnostics';
import { startLogCapture } from '@lib/localLogs/localLogsTracker';
import type LoginUserType from '@type/loginUser';
import type { Session } from 'next-auth';
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useEffect, useState } from 'react';

type AnswerlatticeSessionProviderProps = {
    children: React.ReactNode;
    session: Session;
};

/**
 * Answerlattice only needs the validated NextAuth identity here. Firebase Auth,
 * workspace access, and route permissions are prepared by the product-local
 * dashboard/access providers. Keeping MenuList store and subscription bootstrap
 * out of this boundary prevents unrelated data modules from entering every
 * Answerlattice management route.
 */
export default function AnswerlatticeSessionProvider({
    children,
    session,
}: AnswerlatticeSessionProviderProps) {
    const [clientSession, setClientSession] = useState<LoginUserType | null | undefined>(undefined);
    const [sessionValidationFailed, setSessionValidationFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        setClientSession(undefined);
        setSessionValidationFailed(false);

        refreshClientSessionCacheFromApi()
            .then((refreshedSession) => {
                if (!doesClientSessionMatchTrustedServerSession(session, refreshedSession)) {
                    throw createFirebaseBootstrapError(
                        'Client session does not match the authenticated server session',
                        'answerlattice_session_provider_client_session_mismatch',
                    );
                }
                if (!cancelled) setClientSession(refreshedSession);
            })
            .catch((error) => {
                logFirebaseBootstrapFailure(
                    'answerlattice_session_provider_client_session_refresh_failed',
                    error,
                    getFirebaseAuthSessionLogContext(session),
                );
                if (!cancelled) {
                    setClientSession(null);
                    setSessionValidationFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        session.authIssuedAt,
        session.pId,
        session.role,
        session.sId,
        session.tId,
        session.uId,
        session.user?.id,
    ]);

    useEffect(() => {
        if (!session.user?.id) return;
        startLogCapture();
    }, [session.user?.id]);

    if (clientSession === undefined && !sessionValidationFailed) {
        return <BrandedPageLoader brand="answerlattice" page="Validating Account" />;
    }

    if (sessionValidationFailed || !clientSession) {
        return <BrandedPageLoader brand="answerlattice" page="Unable to validate account" />;
    }

    return (
        <NextAuthSessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
            session={clientSession}
        >
            {children}
        </NextAuthSessionProvider>
    );
}
