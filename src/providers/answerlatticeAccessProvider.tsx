'use client';

import type { AnswerlatticeAccessContext } from '@lib/answerlattice/accessControl';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AnswerlatticeAccessState = {
    access: AnswerlatticeAccessContext | null;
    error: string | null;
    errorCode: string | null;
    loading: boolean;
    refresh: () => Promise<void>;
};

const AnswerlatticeAccessContextRef = createContext<AnswerlatticeAccessState>({
    access: null,
    error: null,
    errorCode: null,
    loading: true,
    refresh: async () => undefined,
});

export function AnswerlatticeAccessProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();
    const [access, setAccess] = useState<AnswerlatticeAccessContext | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAccess = useCallback(async () => {
        if (status === 'loading') {
            setLoading(true);
            return;
        }

        if (status !== 'authenticated') {
            setAccess(null);
            setError(null);
            setErrorCode(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/access', { method: 'GET' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const nextError = new Error(data.error || 'Could not load Answerlattice access') as Error & { code?: string };
                nextError.code = data.code || undefined;
                throw nextError;
            }
            setAccess(data.access || null);
            setError(null);
            setErrorCode(null);
        } catch (loadError: any) {
            setAccess(null);
            setError(loadError?.message || 'Could not load Answerlattice access');
            setErrorCode(loadError?.code || null);
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        loadAccess();
    }, [loadAccess, pathname]);

    const value = useMemo<AnswerlatticeAccessState>(() => ({
        access,
        error,
        errorCode,
        loading,
        refresh: loadAccess,
    }), [access, error, errorCode, loadAccess, loading]);

    return (
        <AnswerlatticeAccessContextRef.Provider value={value}>
            {children}
        </AnswerlatticeAccessContextRef.Provider>
    );
}

export function useAnswerlatticeAccess() {
    return useContext(AnswerlatticeAccessContextRef);
}
