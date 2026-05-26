'use client';

import type { CanonicaAccessContext } from '@lib/canonica/accessControl';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type CanonicaAccessState = {
    access: CanonicaAccessContext | null;
    error: string | null;
    loading: boolean;
    refresh: () => Promise<void>;
};

const CanonicaAccessContextRef = createContext<CanonicaAccessState>({
    access: null,
    error: null,
    loading: true,
    refresh: async () => undefined,
});

export function CanonicaAccessProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();
    const [access, setAccess] = useState<CanonicaAccessContext | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadAccess = useCallback(async () => {
        if (status === 'loading') {
            setLoading(true);
            return;
        }

        if (status !== 'authenticated') {
            setAccess(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/canonica/access', { method: 'GET' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not load Canonica access');
            setAccess(data.access || null);
            setError(null);
        } catch (loadError: any) {
            setAccess(null);
            setError(loadError?.message || 'Could not load Canonica access');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        loadAccess();
    }, [loadAccess, pathname]);

    const value = useMemo<CanonicaAccessState>(() => ({
        access,
        error,
        loading,
        refresh: loadAccess,
    }), [access, error, loadAccess, loading]);

    return (
        <CanonicaAccessContextRef.Provider value={value}>
            {children}
        </CanonicaAccessContextRef.Provider>
    );
}

export function useCanonicaAccess() {
    return useContext(CanonicaAccessContextRef);
}

